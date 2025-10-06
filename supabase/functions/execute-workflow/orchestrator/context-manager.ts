/**
 * Context Manager
 * Fase 2: Gerenciamento de contexto global e local
 */

import { WorkflowContext, ContextSnapshot } from './types.ts';

export class ContextManager {
  private context: WorkflowContext;

  constructor(initialData: Record<string, any> = {}) {
    this.context = {
      global: { ...initialData },
      nodes: {},
      snapshots: []
    };
  }

  /**
   * Obtém o contexto completo
   */
  getContext(): WorkflowContext {
    return this.context;
  }

  /**
   * Obtém contexto global
   */
  getGlobal(): Record<string, any> {
    return this.context.global;
  }

  /**
   * Obtém contexto local de um nó
   */
  getNodeContext(nodeId: string): Record<string, any> {
    return this.context.nodes[nodeId] || {};
  }

  /**
   * Define valor no contexto global
   */
  setGlobal(key: string, value: any): void {
    this.context.global[key] = value;
    console.log(`[CONTEXT] Global[${key}] = ${JSON.stringify(value).slice(0, 100)}`);
  }

  /**
   * Define múltiplos valores no contexto global
   */
  setGlobalBatch(data: Record<string, any>): void {
    Object.assign(this.context.global, data);
    console.log(`[CONTEXT] Global batch update: ${Object.keys(data).join(', ')}`);
  }

  /**
   * Define valor no contexto local de um nó
   */
  setNodeContext(nodeId: string, key: string, value: any): void {
    if (!this.context.nodes[nodeId]) {
      this.context.nodes[nodeId] = {};
    }
    this.context.nodes[nodeId][key] = value;
    console.log(`[CONTEXT] Node[${nodeId}].${key} = ${JSON.stringify(value).slice(0, 100)}`);
  }

  /**
   * Define múltiplos valores no contexto local de um nó
   */
  setNodeContextBatch(nodeId: string, data: Record<string, any>): void {
    if (!this.context.nodes[nodeId]) {
      this.context.nodes[nodeId] = {};
    }
    Object.assign(this.context.nodes[nodeId], data);
    console.log(`[CONTEXT] Node[${nodeId}] batch update: ${Object.keys(data).join(', ')}`);
  }

  /**
   * Mescla output de um nó no contexto global
   */
  mergeNodeOutput(nodeId: string, outputData: Record<string, any>): void {
    // Mesclar no global
    Object.assign(this.context.global, outputData);
    
    // Salvar no local do nó
    if (!this.context.nodes[nodeId]) {
      this.context.nodes[nodeId] = {};
    }
    this.context.nodes[nodeId].output = outputData;
    
    console.log(`[CONTEXT] Node[${nodeId}] output merged: ${Object.keys(outputData).join(', ')}`);
  }

  /**
   * Resolve variáveis no formato {context.path} ou {node.nodeId.path}
   */
  resolve(template: string): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const value = this.resolvePath(path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Resolve um path no contexto (ex: "context.user.name" ou "node.form1.email")
   */
  private resolvePath(path: string): any {
    const parts = path.split('.');
    
    if (parts[0] === 'context') {
      // Contexto global: {context.user.name}
      return this.getValueByPath(this.context.global, parts.slice(1));
    } else if (parts[0] === 'node' && parts.length > 1) {
      // Contexto local: {node.form1.email}
      const nodeId = parts[1];
      const nodeContext = this.context.nodes[nodeId] || {};
      return this.getValueByPath(nodeContext, parts.slice(2));
    }
    
    // Fallback: tentar no global
    return this.getValueByPath(this.context.global, parts);
  }

  /**
   * Obtém valor de um objeto usando um caminho (ex: ["user", "name"])
   */
  private getValueByPath(obj: any, path: string[]): any {
    let current = obj;
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }

  /**
   * Resolve todas as variáveis em um objeto recursivamente
   */
  resolveObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.resolve(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveObject(value);
      }
      return resolved;
    }
    
    return obj;
  }

  /**
   * Cria um snapshot do contexto atual
   */
  createSnapshot(nodeId: string): void {
    const snapshot: ContextSnapshot = {
      timestamp: new Date().toISOString(),
      nodeId,
      global: JSON.parse(JSON.stringify(this.context.global)),
      local: JSON.parse(JSON.stringify(this.context.nodes[nodeId] || {}))
    };
    
    this.context.snapshots.push(snapshot);
    console.log(`[CONTEXT] Snapshot criado para node[${nodeId}]`);
  }

  /**
   * Restaura um snapshot (rollback)
   */
  restoreSnapshot(index: number): boolean {
    if (index < 0 || index >= this.context.snapshots.length) {
      console.warn(`[CONTEXT] Snapshot ${index} não encontrado`);
      return false;
    }

    const snapshot = this.context.snapshots[index];
    this.context.global = JSON.parse(JSON.stringify(snapshot.global));
    
    if (snapshot.nodeId && snapshot.local) {
      this.context.nodes[snapshot.nodeId] = JSON.parse(JSON.stringify(snapshot.local));
    }

    console.log(`[CONTEXT] Snapshot ${index} restaurado (node: ${snapshot.nodeId})`);
    return true;
  }

  /**
   * Limpa snapshots antigos (mantém apenas os N mais recentes)
   */
  cleanSnapshots(keepLast: number = 10): void {
    if (this.context.snapshots.length > keepLast) {
      const removed = this.context.snapshots.length - keepLast;
      this.context.snapshots = this.context.snapshots.slice(-keepLast);
      console.log(`[CONTEXT] ${removed} snapshots removidos, mantendo ${keepLast} mais recentes`);
    }
  }

  /**
   * Exporta contexto para persistência
   */
  export(): WorkflowContext {
    return JSON.parse(JSON.stringify(this.context));
  }

  /**
   * Importa contexto de persistência
   */
  import(savedContext: WorkflowContext): void {
    this.context = JSON.parse(JSON.stringify(savedContext));
    console.log('[CONTEXT] Contexto importado');
  }

  /**
   * Debug: imprime contexto atual
   */
  debug(): void {
    console.log('[CONTEXT] === DEBUG ===');
    console.log('[CONTEXT] Global:', JSON.stringify(this.context.global, null, 2));
    console.log('[CONTEXT] Nodes:', Object.keys(this.context.nodes));
    console.log('[CONTEXT] Snapshots:', this.context.snapshots.length);
  }
}
