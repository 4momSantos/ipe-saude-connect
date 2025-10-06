/**
 * Testes E2E do Orquestrador Cognitivo
 * Sprint 4: Validação completa dos 5 cenários principais
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Cenário 1: Workflow Simples (4 nós lineares)
 * start → email → database → end
 */
Deno.test("E2E: Workflow Simples Linear", async () => {
  const nodes = [
    { id: 'start', type: 'start', data: { label: 'Início' }, position: { x: 0, y: 0 } },
    { id: 'email', type: 'email', data: { 
      label: 'Email',
      emailConfig: {
        to: 'test@example.com',
        subject: 'Teste',
        body: 'Olá {context.name}'
      }
    }, position: { x: 200, y: 0 } },
    { id: 'db', type: 'database', data: { 
      label: 'Database',
      databaseConfig: {
        operation: 'insert',
        table: 'test_logs',
        data: { message: 'Teste E2E' }
      }
    }, position: { x: 400, y: 0 } },
    { id: 'end', type: 'end', data: { label: 'Fim' }, position: { x: 600, y: 0 } },
  ];

  const edges = [
    { id: 'e1', source: 'start', target: 'email' },
    { id: 'e2', source: 'email', target: 'db' },
    { id: 'e3', source: 'db', target: 'end' },
  ];

  // Criar workflow
  const { data: workflow } = await supabase
    .from('workflows')
    .insert({ name: 'E2E Simples', nodes, edges })
    .select()
    .single();

  assertExists(workflow);

  // Executar
  const { data: result } = await supabase.functions.invoke('execute-workflow-v2', {
    body: {
      workflowId: workflow.id,
      inputData: { name: 'Teste' }
    }
  });

  assertExists(result.executionId);

  // Aguardar conclusão (max 30s)
  await waitForCompletion(result.executionId, 30000);

  // Validar estado final
  const { data: execution } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('id', result.executionId)
    .single();

  assertEquals(execution.status, 'completed');

  // Validar que todos nós foram executados
  const { data: steps } = await supabase
    .from('workflow_step_executions')
    .select('*')
    .eq('execution_id', result.executionId);

  assertEquals(steps?.length, 4);
  assertEquals(steps?.filter(s => s.status === 'completed').length, 4);

  // Cleanup
  await supabase.from('workflows').delete().eq('id', workflow.id);
});

/**
 * Cenário 2: Workflow Condicional (bifurcação)
 */
Deno.test("E2E: Workflow Condicional com Bifurcação", async () => {
  const nodes = [
    { id: 'start', type: 'start', data: { label: 'Início' }, position: { x: 0, y: 0 } },
    { id: 'condition', type: 'condition', data: { label: 'Decisão CPF' }, position: { x: 200, y: 0 } },
    { id: 'approved', type: 'email', data: { 
      label: 'Aprovado',
      emailConfig: { to: 'user@example.com', subject: 'Aprovado', body: 'Aprovado!' }
    }, position: { x: 400, y: -100 } },
    { id: 'rejected', type: 'email', data: { 
      label: 'Rejeitado',
      emailConfig: { to: 'user@example.com', subject: 'Rejeitado', body: 'Rejeitado' }
    }, position: { x: 400, y: 100 } },
    { id: 'end', type: 'end', data: { label: 'Fim' }, position: { x: 600, y: 0 } },
  ];

  const edges = [
    { id: 'e1', source: 'start', target: 'condition' },
    { id: 'e2', source: 'condition', target: 'approved', condition: '{context.cpf_valid} === true', priority: 1 },
    { id: 'e3', source: 'condition', target: 'rejected', condition: '{context.cpf_valid} === false', priority: 0 },
    { id: 'e4', source: 'approved', target: 'end' },
    { id: 'e5', source: 'rejected', target: 'end' },
  ];

  const { data: workflow } = await supabase
    .from('workflows')
    .insert({ name: 'E2E Condicional', nodes, edges })
    .select()
    .single();

  // Testar branch TRUE
  const { data: result1 } = await supabase.functions.invoke('execute-workflow-v2', {
    body: {
      workflowId: workflow.id,
      inputData: { cpf_valid: true }
    }
  });

  await waitForCompletion(result1.executionId, 30000);

  const { data: steps1 } = await supabase
    .from('workflow_step_executions')
    .select('node_id, status')
    .eq('execution_id', result1.executionId);

  const executedNodes1 = steps1?.filter(s => s.status === 'completed').map(s => s.node_id) || [];
  
  // Deve incluir: start, condition, approved, end (NÃO rejected)
  assertEquals(executedNodes1.includes('approved'), true);
  assertEquals(executedNodes1.includes('rejected'), false);

  // Cleanup
  await supabase.from('workflows').delete().eq('id', workflow.id);
});

/**
 * Cenário 3: Workflow Paralelo (3 nós simultâneos + join)
 */
Deno.test("E2E: Workflow Paralelo com Join", async () => {
  const nodes = [
    { id: 'start', type: 'start', data: { label: 'Início' }, position: { x: 0, y: 0 } },
    { id: 'webhook1', type: 'webhook', data: { 
      label: 'Webhook A',
      httpConfig: { url: 'https://httpbin.org/delay/1', method: 'GET' }
    }, position: { x: 200, y: -100 } },
    { id: 'webhook2', type: 'webhook', data: { 
      label: 'Webhook B',
      httpConfig: { url: 'https://httpbin.org/delay/1', method: 'GET' }
    }, position: { x: 200, y: 0 } },
    { id: 'email', type: 'email', data: { 
      label: 'Email',
      emailConfig: { to: 'test@example.com', subject: 'Paralelo', body: 'Done' }
    }, position: { x: 200, y: 100 } },
    { id: 'join', type: 'join', data: { 
      label: 'Aguardar Todos',
      joinConfig: { strategy: 'wait_all', timeout: 10000 }
    }, position: { x: 400, y: 0 } },
    { id: 'end', type: 'end', data: { label: 'Fim' }, position: { x: 600, y: 0 } },
  ];

  const edges = [
    { id: 'e1', source: 'start', target: 'webhook1' },
    { id: 'e2', source: 'start', target: 'webhook2' },
    { id: 'e3', source: 'start', target: 'email' },
    { id: 'e4', source: 'webhook1', target: 'join' },
    { id: 'e5', source: 'webhook2', target: 'join' },
    { id: 'e6', source: 'email', target: 'join' },
    { id: 'e7', source: 'join', target: 'end' },
  ];

  const { data: workflow } = await supabase
    .from('workflows')
    .insert({ name: 'E2E Paralelo', nodes, edges })
    .select()
    .single();

  const { data: result } = await supabase.functions.invoke('execute-workflow-v2', {
    body: { workflowId: workflow.id, inputData: {} }
  });

  await waitForCompletion(result.executionId, 30000);

  const { data: steps } = await supabase
    .from('workflow_step_executions')
    .select('node_id, started_at, completed_at, status')
    .eq('execution_id', result.executionId)
    .in('node_id', ['webhook1', 'webhook2', 'email']);

  // Verificar que os 3 nós foram executados
  assertEquals(steps?.length, 3);
  
  // Verificar paralelismo: nós devem ter started_at similares
  const startTimes = steps?.map(s => new Date(s.started_at!).getTime()) || [];
  const maxDiff = Math.max(...startTimes) - Math.min(...startTimes);
  
  // Diferença < 2s indica paralelismo
  assertEquals(maxDiff < 2000, true);

  // Cleanup
  await supabase.from('workflows').delete().eq('id', workflow.id);
});

/**
 * Cenário 4: Retry de Workflow Falhado
 */
Deno.test("E2E: Retry após Falha", async () => {
  const nodes = [
    { id: 'start', type: 'start', data: { label: 'Início' }, position: { x: 0, y: 0 } },
    { id: 'webhook', type: 'webhook', data: { 
      label: 'Webhook que Falha',
      httpConfig: { url: 'https://httpbin.org/status/500', method: 'GET' }
    }, position: { x: 200, y: 0 } },
    { id: 'end', type: 'end', data: { label: 'Fim' }, position: { x: 400, y: 0 } },
  ];

  const edges = [
    { id: 'e1', source: 'start', target: 'webhook' },
    { id: 'e2', source: 'webhook', target: 'end' },
  ];

  const { data: workflow } = await supabase
    .from('workflows')
    .insert({ name: 'E2E Retry', nodes, edges })
    .select()
    .single();

  // Primeira execução (deve falhar)
  const { data: result1 } = await supabase.functions.invoke('execute-workflow-v2', {
    body: { workflowId: workflow.id, inputData: {} }
  });

  await waitForCompletion(result1.executionId, 30000, ['failed', 'completed']);

  const { data: exec1 } = await supabase
    .from('workflow_executions')
    .select('status')
    .eq('id', result1.executionId)
    .single();

  assertEquals(exec1?.status, 'failed');

  // Retry (segunda execução)
  const { data: result2 } = await supabase.functions.invoke('execute-workflow-v2', {
    body: { 
      workflowId: workflow.id, 
      inputData: {},
      previousExecutionId: result1.executionId,
      isRetry: true
    }
  });

  assertExists(result2.executionId);

  // Cleanup
  await supabase.from('workflows').delete().eq('id', workflow.id);
});

/**
 * Cenário 5: Continue-Workflow após Approval
 */
Deno.test("E2E: Continue após Pausa (Approval)", async () => {
  const nodes = [
    { id: 'start', type: 'start', data: { label: 'Início' }, position: { x: 0, y: 0 } },
    { id: 'approval', type: 'approval', data: { 
      label: 'Aprovação Manual',
      approvalConfig: { approvers: ['gestor@example.com'] }
    }, position: { x: 200, y: 0 } },
    { id: 'end', type: 'end', data: { label: 'Fim' }, position: { x: 400, y: 0 } },
  ];

  const edges = [
    { id: 'e1', source: 'start', target: 'approval' },
    { id: 'e2', source: 'approval', target: 'end' },
  ];

  const { data: workflow } = await supabase
    .from('workflows')
    .insert({ name: 'E2E Approval', nodes, edges })
    .select()
    .single();

  // Executar (deve pausar em approval)
  const { data: result } = await supabase.functions.invoke('execute-workflow-v2', {
    body: { workflowId: workflow.id, inputData: {} }
  });

  // Aguardar pausa
  await new Promise(resolve => setTimeout(resolve, 3000));

  const { data: stepExec } = await supabase
    .from('workflow_step_executions')
    .select('id, status')
    .eq('execution_id', result.executionId)
    .eq('node_id', 'approval')
    .single();

  assertEquals(stepExec?.status, 'paused');

  if (!stepExec) throw new Error('Step execution não encontrado');

  // Simular aprovação
  await supabase.functions.invoke('continue-workflow', {
    body: {
      stepExecutionId: stepExec.id,
      decision: 'approved',
      resumeData: { approved_by: 'gestor@example.com' }
    }
  });

  // Aguardar conclusão
  await waitForCompletion(result.executionId, 30000);

  const { data: finalExec } = await supabase
    .from('workflow_executions')
    .select('status')
    .eq('id', result.executionId)
    .single();

  assertEquals(finalExec?.status, 'completed');

  // Cleanup
  await supabase.from('workflows').delete().eq('id', workflow.id);
});

/**
 * Helper: Aguardar conclusão do workflow
 */
async function waitForCompletion(
  executionId: string, 
  maxWait: number,
  allowedStatuses: string[] = ['completed', 'failed']
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    const { data } = await supabase
      .from('workflow_executions')
      .select('status')
      .eq('id', executionId)
      .single();

    if (data && allowedStatuses.includes(data.status)) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Timeout aguardando conclusão do workflow ${executionId}`);
}
