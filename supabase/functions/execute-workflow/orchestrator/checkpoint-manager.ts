/**
 * FASE 2: Sistema de Checkpoints Síncronos com Versionamento
 * 
 * Gerencia checkpoints de workflow com persistência síncrona,
 * validação de integridade e versionamento para rollback.
 */

import { NodeStatus } from './state-machine.ts';

export interface Checkpoint {
  id?: string;
  execution_id: string;
  node_id: string;
  version: number;
  state: NodeStatus;
  context: Record<string, any>;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface CheckpointMetrics {
  duration_ms: number;
  size_bytes: number;
  success: boolean;
  error?: string;
}

// Erro customizado para falhas de checkpoint
export class CheckpointError extends Error {
  constructor(
    message: string,
    public executionId: string,
    public nodeId: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CheckpointError';
  }
}

/**
 * Gerenciador de checkpoints com persistência síncrona
 */
export class CheckpointManager {
  private performanceThreshold = 100; // ms

  constructor(
    private executionId: string,
    private supabaseClient: any
  ) {}

  /**
   * Salva checkpoint com persistência SÍNCRONA
   * Garante que o checkpoint foi gravado antes de continuar
   * Performance target: < 100ms
   */
  async saveCheckpoint(
    nodeId: string,
    state: NodeStatus,
    context: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<CheckpointMetrics> {
    const startTime = Date.now();
    
    try {
      // Obter próxima versão
      const version = await this.getNextVersion(nodeId);
      
      // Sanitizar dados sensíveis
      const sanitizedContext = this.sanitizeContext(context);
      
      // Validar tamanho do checkpoint
      const checkpointData = {
        execution_id: this.executionId,
        node_id: nodeId,
        version,
        state,
        context: sanitizedContext,
        metadata: metadata || {}
      };
      
      const sizeBytes = JSON.stringify(checkpointData).length;
      if (sizeBytes > 1024 * 1024) { // 1MB
        console.warn(`[CHECKPOINT] Large checkpoint detected: ${sizeBytes} bytes`);
      }

      // Persistência síncrona com await obrigatório
      const { data, error } = await this.supabaseClient
        .from('workflow_checkpoints')
        .insert(checkpointData)
        .select()
        .single();

      if (error) {
        throw new CheckpointError(
          `Failed to persist checkpoint: ${error.message}`,
          this.executionId,
          nodeId,
          error
        );
      }

      const duration = Date.now() - startTime;
      
      // Alertar se exceder threshold de performance
      if (duration > this.performanceThreshold) {
        console.warn(
          `[CHECKPOINT] Performance threshold exceeded: ${duration}ms > ${this.performanceThreshold}ms ` +
          `(node: ${nodeId}, size: ${sizeBytes} bytes)`
        );
      }

      // Log estruturado
      const metrics: CheckpointMetrics = {
        duration_ms: duration,
        size_bytes: sizeBytes,
        success: true
      };
      
      console.log(`[CHECKPOINT] Saved successfully`, JSON.stringify({
        execution_id: this.executionId,
        node_id: nodeId,
        version,
        state,
        ...metrics
      }));

      return metrics;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`[CHECKPOINT] Failed to save`, JSON.stringify({
        execution_id: this.executionId,
        node_id: nodeId,
        duration_ms: duration,
        error: error instanceof Error ? error.message : String(error)
      }));

      throw error instanceof CheckpointError 
        ? error 
        : new CheckpointError(
            'Unexpected error saving checkpoint',
            this.executionId,
            nodeId,
            error instanceof Error ? error : undefined
          );
    }
  }

  /**
   * Carrega último checkpoint válido de um nó
   * Com validação de integridade
   */
  async loadCheckpoint(nodeId: string): Promise<Checkpoint | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('workflow_checkpoints')
        .select('*')
        .eq('execution_id', this.executionId)
        .eq('node_id', nodeId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new CheckpointError(
          `Failed to load checkpoint: ${error.message}`,
          this.executionId,
          nodeId,
          error
        );
      }

      if (!data) {
        console.log(`[CHECKPOINT] No checkpoint found for node ${nodeId}`);
        return null;
      }

      // Validar integridade do checkpoint
      if (!this.validateCheckpoint(data)) {
        console.error(`[CHECKPOINT] Invalid checkpoint data for node ${nodeId}`);
        return null;
      }

      console.log(`[CHECKPOINT] Loaded checkpoint`, JSON.stringify({
        execution_id: this.executionId,
        node_id: nodeId,
        version: data.version,
        state: data.state
      }));

      return data;

    } catch (error) {
      console.error(`[CHECKPOINT] Failed to load`, JSON.stringify({
        execution_id: this.executionId,
        node_id: nodeId,
        error: error instanceof Error ? error.message : String(error)
      }));

      throw error instanceof CheckpointError 
        ? error 
        : new CheckpointError(
            'Unexpected error loading checkpoint',
            this.executionId,
            nodeId,
            error instanceof Error ? error : undefined
          );
    }
  }

  /**
   * Carrega checkpoint específico por versão
   */
  async loadCheckpointVersion(nodeId: string, version: number): Promise<Checkpoint | null> {
    const { data, error } = await this.supabaseClient
      .from('workflow_checkpoints')
      .select('*')
      .eq('execution_id', this.executionId)
      .eq('node_id', nodeId)
      .eq('version', version)
      .maybeSingle();

    if (error) {
      throw new CheckpointError(
        `Failed to load checkpoint version ${version}: ${error.message}`,
        this.executionId,
        nodeId,
        error
      );
    }

    return data;
  }

  /**
   * Lista todos os checkpoints de uma execução
   */
  async listCheckpoints(): Promise<Checkpoint[]> {
    const { data, error } = await this.supabaseClient
      .from('workflow_checkpoints')
      .select('*')
      .eq('execution_id', this.executionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new CheckpointError(
        `Failed to list checkpoints: ${error.message}`,
        this.executionId,
        'all',
        error
      );
    }

    return data || [];
  }

  /**
   * Obtém próxima versão do checkpoint para um nó
   */
  private async getNextVersion(nodeId: string): Promise<number> {
    const { data, error } = await this.supabaseClient
      .from('workflow_checkpoints')
      .select('version')
      .eq('execution_id', this.executionId)
      .eq('node_id', nodeId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw new Error(`Failed to get next version: ${error.message}`);
    }

    return (data?.version || 0) + 1;
  }

  /**
   * Sanitiza contexto removendo dados sensíveis
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized = { ...context };
    
    // Lista de campos sensíveis para remover
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credential'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Valida integridade do checkpoint
   */
  private validateCheckpoint(checkpoint: any): boolean {
    if (!checkpoint) return false;
    
    const required = ['execution_id', 'node_id', 'version', 'state', 'context'];
    
    for (const field of required) {
      if (!(field in checkpoint)) {
        console.error(`[CHECKPOINT] Missing required field: ${field}`);
        return false;
      }
    }

    // Validar que context é um objeto
    if (typeof checkpoint.context !== 'object') {
      console.error(`[CHECKPOINT] Invalid context type: ${typeof checkpoint.context}`);
      return false;
    }

    return true;
  }
}
