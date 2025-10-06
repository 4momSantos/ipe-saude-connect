/**
 * Executor para nós do tipo EMAIL
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class EmailExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log('[EMAIL_EXECUTOR] Enviando email');
    
    const emailConfig = node.data.emailConfig || {};
    
    // Resolver variáveis no destinatário
    let to = this.resolveVariables(emailConfig.to || '', context);
    let subject = this.resolveVariables(emailConfig.subject || 'Notificação do Sistema', context);
    let body = this.resolveVariables(emailConfig.body || '', context);
    
    if (!to) {
      console.error('[EMAIL_EXECUTOR] ❌ Destinatário não fornecido');
      return {
        outputData: { ...context, emailSent: false, emailError: 'Destinatário não fornecido' },
        shouldContinue: true
      };
    }
    
    console.log(`[EMAIL_EXECUTOR] Enviando para ${to} via send-templated-email`);
    
    try {
      const { data, error } = await supabaseClient.functions.invoke('send-templated-email', {
        body: {
          to,
          subject,
          body
        }
      });
      
      if (error) {
        console.error('[EMAIL_EXECUTOR] ❌ Erro ao enviar email:', error);
        return {
          outputData: { ...context, emailSent: false, emailError: error.message },
          shouldContinue: true
        };
      }
      
      console.log('[EMAIL_EXECUTOR] ✅ Email enviado com sucesso');
      return {
        outputData: { ...context, emailSent: true, emailResponse: data },
        shouldContinue: true
      };
    } catch (err: any) {
      console.error('[EMAIL_EXECUTOR] ❌ Exceção ao enviar email:', err);
      return {
        outputData: { ...context, emailSent: false, emailError: err.message },
        shouldContinue: true
      };
    }
  }
  
  private resolveVariables(template: string, context: ExecutionContext): string {
    if (!template) return template;
    
    // Substituir variáveis no formato {context.path} ou {nodeid.path}
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const parts = path.split('.');
      let value: any = context;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return match; // Manter original se não encontrar
        }
      }
      
      return String(value || match);
    });
  }
}
