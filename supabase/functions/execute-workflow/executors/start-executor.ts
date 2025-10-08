/**
 * START NODE EXECUTOR - Ponto de entrada do workflow
 * 
 * RESPONSABILIDADES:
 * - Validar input contra schema (se definido)
 * - Enriquecer contexto com metadata de trigger
 * - Registrar início de execução
 * - Logs estruturados de disparo
 * 
 * TRIGGER TYPES SUPORTADOS:
 * - manual: Disparado via UI/API
 * - webhook: Disparado por POST externo
 * - schedule: Disparado por cron job
 * - database: Disparado por trigger PostgreSQL
 * - event: Disparado por evento (Pub/Sub)
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

interface TriggerConfig {
  type: 'manual' | 'webhook' | 'schedule' | 'database' | 'event';
  inputSchema?: any; // JSON Schema para validação
  table?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE';
  webhookUrl?: string;
  schedule?: string;
  conditions?: Record<string, any>;
}

export class StartExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.data.triggerConfig as TriggerConfig | undefined;
    const triggerType = config?.type || 'manual';
    const triggerSource = (context as any).__trigger_source || 'unknown';
    
    console.log('[START]', {
      level: 'INFO',
      type: 'WORKFLOW_STARTED',
      execution_id: executionId,
      step_execution_id: stepExecutionId,
      trigger_type: triggerType,
      trigger_source: triggerSource,
      has_input_schema: !!config?.inputSchema,
      timestamp: new Date().toISOString()
    });
    
    // 1. VALIDAR INPUT (se há schema definido)
    if (config?.inputSchema) {
      try {
        this.validateInput(context, config.inputSchema);
        console.log('[START] Input validation passed');
      } catch (error: any) {
        console.error('[START]', {
          level: 'ERROR',
          type: 'INPUT_VALIDATION_FAILED',
          execution_id: executionId,
          error: error.message
        });
        throw new Error(`Input validation failed: ${error.message}`);
      }
    }
    
    // 2. ENRIQUECER CONTEXTO com metadata de trigger
    const enrichedContext = {
      ...context,
      __workflow_metadata: {
        executionId,
        startedAt: new Date().toISOString(),
        triggerType,
        triggerSource,
        triggerConfig: config
      }
    };
    
    // 3. LOG ESTRUTURADO de início
    console.log('[START]', {
      level: 'INFO',
      type: 'WORKFLOW_CONTEXT_ENRICHED',
      execution_id: executionId,
      context_keys: Object.keys(enrichedContext),
      metadata: enrichedContext.__workflow_metadata
    });
    
    return {
      outputData: enrichedContext,
      shouldContinue: true
    };
  }
  
  /**
   * Validação simples de input contra schema
   * TODO: Integrar com biblioteca de validação completa (Zod, AJV)
   */
  private validateInput(input: any, schema: any): void {
    // Validação básica de required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in input)) {
          throw new Error(`Required field missing: ${field}`);
        }
      }
    }
    
    // Validação básica de tipos
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties as any)) {
        if (key in input) {
          const value = input[key];
          const expectedType = (propSchema as any).type;
          
          if (expectedType === 'string' && typeof value !== 'string') {
            throw new Error(`Field ${key} must be string, got ${typeof value}`);
          }
          if (expectedType === 'number' && typeof value !== 'number') {
            throw new Error(`Field ${key} must be number, got ${typeof value}`);
          }
          if (expectedType === 'boolean' && typeof value !== 'boolean') {
            throw new Error(`Field ${key} must be boolean, got ${typeof value}`);
          }
          if (expectedType === 'array' && !Array.isArray(value)) {
            throw new Error(`Field ${key} must be array`);
          }
          if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
            throw new Error(`Field ${key} must be object`);
          }
        }
      }
    }
  }
}
