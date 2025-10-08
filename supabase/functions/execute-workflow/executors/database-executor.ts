/**
 * Executor para nós do tipo DATABASE
 * ✅ HARDENED VERSION com proteção contra SQL injection
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

// Tipos para configuração robusta
interface DatabaseFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'is' | 'isnot';
  value: any;
}

interface DatabaseConfig {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  
  // SELECT
  columns?: string[];
  filters?: DatabaseFilter[];
  orderBy?: { column: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
  
  // INSERT
  values?: Record<string, any> | Record<string, any>[];
  
  // UPDATE
  set?: Record<string, any>;
  where?: DatabaseFilter[];
  
  // DELETE
  // where?: DatabaseFilter[];  (mesmo campo de UPDATE)
  
  // Legacy (backward compatibility)
  fields?: Record<string, any>;
  conditions?: Record<string, any>;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseExecutor implements NodeExecutor {
  // Whitelist de tabelas permitidas (CRÍTICO!)
  private readonly ALLOWED_TABLES = new Set([
    'inscricoes_edital',
    'inscricao_documentos',
    'credenciados',
    'credenciado_crms',
    'horarios_atendimento',
    'workflow_form_data',
    'workflow_messages',
    'audit_logs',
    'app_notifications'
  ]);

  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log(`[DATABASE_EXECUTOR] Executando operação de banco de dados`);
    
    const dbConfig = node.data.databaseConfig as DatabaseConfig;
    
    if (!dbConfig || !dbConfig.table || !dbConfig.operation) {
      console.warn(`[DATABASE_EXECUTOR] ⚠️ Nó database sem configuração válida`);
      return {
        outputData: { ...context, dbOperation: false, error: 'Invalid configuration' },
        shouldContinue: true
      };
    }
    
    try {
      // 🔒 VALIDAÇÃO DE SEGURANÇA
      this.validateTableName(dbConfig.table);
      this.validateOperation(dbConfig.operation);
      
      console.log(`[DATABASE_EXECUTOR] DB Operation: ${dbConfig.operation} em ${dbConfig.table}`);
      
      // Executar operação
      let result;
      
      switch (dbConfig.operation) {
        case 'select':
          result = await this.handleSelect(supabaseClient, dbConfig, context);
          break;
        case 'insert':
          result = await this.handleInsert(supabaseClient, dbConfig, context);
          break;
        case 'update':
          result = await this.handleUpdate(supabaseClient, dbConfig, context);
          break;
        case 'delete':
          result = await this.handleDelete(supabaseClient, dbConfig, context);
          break;
        default:
          throw new ValidationError(`Operação não suportada: ${dbConfig.operation}`);
      }
      
      console.log(`[DATABASE_EXECUTOR] ✅ Operação concluída com sucesso`);
      
      return {
        outputData: { 
          ...context, 
          dbOperation: true,
          dbOperation_success: true,
          ...result
        },
        shouldContinue: true
      };
      
    } catch (error: any) {
      console.error(`[DATABASE_EXECUTOR] ❌ Erro:`, {
        type: error.name,
        message: error.message,
        operation: dbConfig.operation,
        table: dbConfig.table
      });
      
      throw new Error(`Erro ao executar operação no banco: ${error.message}`);
    }
  }
  
  // ========================================
  // SELECT com filtros complexos
  // ========================================
  private async handleSelect(
    supabaseClient: any,
    config: DatabaseConfig,
    context: ExecutionContext
  ) {
    let query = supabaseClient.from(config.table);
    
    // 1. Selecionar colunas
    if (config.columns && config.columns.length > 0) {
      config.columns.forEach(col => this.validateColumnName(col));
      query = query.select(config.columns.join(','));
    } else {
      query = query.select('*');
    }
    
    // 2. Aplicar filtros
    if (config.filters && config.filters.length > 0) {
      query = this.applyFilters(query, config.filters, context);
    }
    
    // 3. Ordenação
    if (config.orderBy && config.orderBy.length > 0) {
      for (const order of config.orderBy) {
        this.validateColumnName(order.column);
        query = query.order(order.column, { ascending: order.direction === 'asc' });
      }
    }
    
    // 4. Paginação
    if (config.limit !== undefined || config.offset !== undefined) {
      const limit = config.limit || 100;
      const offset = config.offset || 0;
      
      if (limit < 0 || limit > 1000) {
        throw new ValidationError('Limit deve estar entre 0 e 1000');
      }
      if (offset < 0) {
        throw new ValidationError('Offset deve ser positivo');
      }
      
      query = query.range(offset, offset + limit - 1);
    }
    
    // 5. Executar
    const { data, error, count } = await query;
    
    if (error) throw new DatabaseError(error.message);
    
    return {
      dbResult: data || [],
      dbRowCount: data?.length || 0,
      dbTotalCount: count
    };
  }
  
  // ========================================
  // INSERT com validação
  // ========================================
  private async handleInsert(
    supabaseClient: any,
    config: DatabaseConfig,
    context: ExecutionContext
  ) {
    // Suportar novo formato (values) e legacy (fields)
    const values = config.values || config.fields;
    
    if (!values) {
      throw new ValidationError('INSERT requer campo "values" ou "fields"');
    }
    
    // Resolver variáveis
    const resolvedValues = this.resolveFields(values, context);
    
    // Normalizar para array
    const valuesArray = Array.isArray(resolvedValues) ? resolvedValues : [resolvedValues];
    
    // Validar cada registro
    for (const row of valuesArray) {
      if (typeof row !== 'object' || row === null) {
        throw new ValidationError('Cada valor deve ser um objeto');
      }
      
      // Validar nomes de coluna
      for (const key of Object.keys(row)) {
        this.validateColumnName(key);
      }
    }
    
    const { data, error } = await supabaseClient
      .from(config.table)
      .insert(valuesArray)
      .select();
    
    if (error) throw new DatabaseError(error.message);
    
    return {
      dbResult: data || [],
      dbRowCount: data?.length || 0,
      dbInsertedIds: data?.map((row: any) => row.id) || []
    };
  }
  
  // ========================================
  // UPDATE com WHERE obrigatório
  // ========================================
  private async handleUpdate(
    supabaseClient: any,
    config: DatabaseConfig,
    context: ExecutionContext
  ) {
    // Suportar novo formato (set) e legacy (fields)
    const set = config.set || config.fields;
    
    if (!set) {
      throw new ValidationError('UPDATE requer campo "set" ou "fields"');
    }
    
    // 🔒 PROTEÇÃO: WHERE obrigatório para UPDATE
    const where = config.where || (config.conditions ? [{ 
      column: Object.keys(config.conditions)[0], 
      operator: 'eq' as const, 
      value: Object.values(config.conditions)[0] 
    }] : []);
    
    if (!where || where.length === 0) {
      throw new ValidationError(
        '🔒 SEGURANÇA: UPDATE requer filtros WHERE para prevenir full-table update'
      );
    }
    
    // Resolver variáveis
    const resolvedSet = this.resolveFields(set, context);
    
    // Validar nomes de coluna
    for (const key of Object.keys(resolvedSet)) {
      this.validateColumnName(key);
    }
    
    // Aplicar filtros WHERE
    let query = supabaseClient.from(config.table).update(resolvedSet);
    query = this.applyFilters(query, where, context);
    
    const { data, error } = await query.select();
    
    if (error) throw new DatabaseError(error.message);
    
    return {
      dbResult: data || [],
      dbAffectedRows: data?.length || 0
    };
  }
  
  // ========================================
  // DELETE com WHERE obrigatório
  // ========================================
  private async handleDelete(
    supabaseClient: any,
    config: DatabaseConfig,
    context: ExecutionContext
  ) {
    // 🔒 PROTEÇÃO: WHERE obrigatório para DELETE
    const where = config.where || (config.conditions ? [{ 
      column: Object.keys(config.conditions)[0], 
      operator: 'eq' as const, 
      value: Object.values(config.conditions)[0] 
    }] : []);
    
    if (!where || where.length === 0) {
      throw new ValidationError(
        '🔒 SEGURANÇA: DELETE requer filtros WHERE para prevenir full-table delete'
      );
    }
    
    // Aplicar filtros WHERE
    let query = supabaseClient.from(config.table).delete();
    query = this.applyFilters(query, where, context);
    
    const { error, count } = await query;
    
    if (error) throw new DatabaseError(error.message);
    
    return {
      dbAffectedRows: count || 0
    };
  }
  
  // ========================================
  // HELPERS
  // ========================================
  
  /**
   * Aplica filtros à query (SELECT, UPDATE, DELETE)
   */
  private applyFilters(query: any, filters: DatabaseFilter[], context: ExecutionContext) {
    for (const filter of filters) {
      this.validateColumnName(filter.column);
      
      // Resolver variável no valor
      const resolvedValue = this.resolveValue(filter.value, context);
      
      switch (filter.operator) {
        case 'eq':
          query = query.eq(filter.column, resolvedValue);
          break;
        case 'neq':
          query = query.neq(filter.column, resolvedValue);
          break;
        case 'gt':
          query = query.gt(filter.column, resolvedValue);
          break;
        case 'gte':
          query = query.gte(filter.column, resolvedValue);
          break;
        case 'lt':
          query = query.lt(filter.column, resolvedValue);
          break;
        case 'lte':
          query = query.lte(filter.column, resolvedValue);
          break;
        case 'in':
          if (!Array.isArray(resolvedValue)) {
            throw new ValidationError('Operador "in" requer array');
          }
          query = query.in(filter.column, resolvedValue);
          break;
        case 'like':
          query = query.like(filter.column, resolvedValue);
          break;
        case 'is':
          query = query.is(filter.column, resolvedValue);
          break;
        case 'isnot':
          query = query.not(filter.column, 'is', resolvedValue);
          break;
        default:
          throw new ValidationError(`Operador inválido: ${filter.operator}`);
      }
    }
    
    return query;
  }
  
  /**
   * Resolve variáveis em um objeto de fields
   */
  private resolveFields(fields: Record<string, any> | any[], context: ExecutionContext): any {
    if (Array.isArray(fields)) {
      return fields.map(item => this.resolveFields(item, context));
    }
    
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      resolved[key] = this.resolveValue(value, context);
    }
    
    return resolved;
  }
  
  /**
   * Resolve um valor individual (string, number, object, etc.)
   */
  private resolveValue(value: any, context: ExecutionContext): any {
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      // Extrair path da variável: {inscricao.id} -> ['inscricao', 'id']
      const varPath = value.slice(1, -1).split('.');
      let resolvedValue: any = context;
      
      for (const part of varPath) {
        resolvedValue = resolvedValue?.[part];
      }
      
      return resolvedValue;
    }
    
    return value;
  }
  
  /**
   * 🔒 Valida nome de tabela (whitelist)
   */
  private validateTableName(table: string): void {
    if (!this.ALLOWED_TABLES.has(table)) {
      throw new ValidationError(
        `🔒 SEGURANÇA: Tabela "${table}" não permitida. Tabelas disponíveis: ${Array.from(this.ALLOWED_TABLES).join(', ')}`
      );
    }
  }
  
  /**
   * 🔒 Valida nome de coluna (regex whitelist)
   */
  private validateColumnName(column: string): void {
    // Permite: letter_name, table.column, count(*)
    const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$|^\*$|^count\(\*\)$/;
    
    if (!validPattern.test(column)) {
      throw new ValidationError(
        `🔒 SEGURANÇA: Nome de coluna inválido: "${column}". Use apenas letras, números e underscore.`
      );
    }
  }
  
  /**
   * Valida operação
   */
  private validateOperation(operation: string): void {
    const validOps = ['select', 'insert', 'update', 'delete'];
    
    if (!validOps.includes(operation)) {
      throw new ValidationError(
        `Operação inválida: "${operation}". Use: ${validOps.join(', ')}`
      );
    }
  }
}
