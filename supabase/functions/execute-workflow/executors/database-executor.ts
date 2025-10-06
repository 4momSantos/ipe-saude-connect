/**
 * Executor para nós do tipo DATABASE
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class DatabaseExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log(`[DATABASE_EXECUTOR] Executando operação de banco de dados`);
    
    const dbConfig = node.data.databaseConfig;
    
    if (!dbConfig || !dbConfig.table || !dbConfig.operation) {
      console.warn(`[DATABASE_EXECUTOR] ⚠️ Nó database sem configuração válida`);
      return {
        outputData: { ...context, dbOperation: false },
        shouldContinue: true
      };
    }
    
    console.log(`[DATABASE_EXECUTOR] DB Operation: ${dbConfig.operation} em ${dbConfig.table}`);
    
    try {
      const tableName = dbConfig.table;
      const operation = dbConfig.operation;
      const fields = dbConfig.fields || {};
      
      // Resolver variáveis nos campos usando context
      const resolvedFields = this.resolveFields(fields, context);
      
      console.log(`[DATABASE_EXECUTOR] Campos resolvidos:`, resolvedFields);
      
      // Executar operação no banco
      const dbResult = await this.executeOperation(
        supabaseClient,
        tableName,
        operation,
        resolvedFields,
        dbConfig.conditions
      );
      
      if (dbResult.error) {
        throw dbResult.error;
      }
      
      console.log(`[DATABASE_EXECUTOR] ✅ Operação de banco concluída com sucesso`);
      
      return {
        outputData: { 
          ...context, 
          dbOperation: true, 
          dbResult: dbResult.data,
          dbOperation_success: true
        },
        shouldContinue: true
      };
      
    } catch (dbError: any) {
      console.error(`[DATABASE_EXECUTOR] ❌ Erro na operação de banco:`, dbError);
      throw new Error(`Erro ao executar operação no banco: ${dbError.message}`);
    }
  }
  
  private resolveFields(fields: Record<string, any>, context: ExecutionContext): Record<string, any> {
    const resolvedFields: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
        // Extrair path da variável: {inscricao.id} -> ['inscricao', 'id']
        const varPath = value.slice(1, -1).split('.');
        let resolvedValue = context;
        for (const part of varPath) {
          resolvedValue = resolvedValue?.[part];
        }
        resolvedFields[key] = resolvedValue;
      } else {
        resolvedFields[key] = value;
      }
    }
    
    return resolvedFields;
  }
  
  private async executeOperation(
    supabaseClient: any,
    tableName: string,
    operation: string,
    fields: Record<string, any>,
    conditions?: Record<string, any>
  ) {
    switch (operation) {
      case 'insert':
        return await supabaseClient
          .from(tableName)
          .insert(fields)
          .select();
      
      case 'update':
        let updateQuery = supabaseClient.from(tableName).update(fields);
        
        if (conditions) {
          for (const [condKey, condValue] of Object.entries(conditions)) {
            updateQuery = updateQuery.eq(condKey, condValue);
          }
        }
        
        return await updateQuery.select();
      
      case 'delete':
        let deleteQuery = supabaseClient.from(tableName).delete();
        
        if (conditions) {
          for (const [condKey, condValue] of Object.entries(conditions)) {
            deleteQuery = deleteQuery.eq(condKey, condValue);
          }
        }
        
        return await deleteQuery;
      
      default:
        throw new Error(`Operação de banco não suportada: ${operation}`);
    }
  }
}
