# 🏗️ Arquitetura do Sistema de Workflows - IPE Saúde Connect

## 📋 Visão Geral

Sistema completo de credenciamento médico com workflows automatizados, desenvolvido em React + Supabase. Permite criação visual de fluxos de trabalho, execução automática, aprovações, assinaturas digitais e integração com OCR.

---

## 🗂️ Estrutura de Dados

### Tabelas Principais

#### 1. `workflows`
Armazena definição visual dos workflows (nodes + edges).
```sql
- id: uuid (PK)
- name: text
- description: text
- nodes: jsonb (array de nós React Flow)
- edges: jsonb (array de conexões)
- version: integer
- is_active: boolean
- created_by: uuid (FK → profiles)
```

#### 2. `workflow_executions`
Rastreia cada execução de workflow.
```sql
- id: uuid (PK)
- workflow_id: uuid (FK → workflows)
- status: text ('running' | 'completed' | 'failed' | 'pending')
- current_node_id: text (último nó executado)
- started_by: uuid (FK → profiles)
- started_at: timestamp
- completed_at: timestamp
- error_message: text
```

#### 3. `workflow_step_executions`
Histórico detalhado de cada nó executado.
```sql
- id: uuid (PK)
- execution_id: uuid (FK → workflow_executions)
- node_id: text (ID do nó no JSON)
- node_type: text ('start' | 'email' | 'approval' | etc)
- status: text ('pending' | 'running' | 'completed' | 'failed')
- input_data: jsonb
- output_data: jsonb
- started_at: timestamp
- completed_at: timestamp
- error_message: text
```

#### 4. `workflow_queue`
Fila de workflows pendentes (auto-start após inscrição).
```sql
- id: uuid (PK)
- inscricao_id: uuid (FK → inscricoes_edital, UNIQUE)
- workflow_id: uuid (FK → workflows)
- workflow_version: integer
- input_data: jsonb
- status: text ('pending' | 'processing' | 'completed' | 'failed')
- attempts: integer (contador de retries)
- max_attempts: integer (padrão: 3)
- processing_started_at: timestamp
- processed_at: timestamp
- error_message: text
```

#### 5. `inscricoes_edital`
Inscrições de candidatos vinculadas a workflows.
```sql
- id: uuid (PK)
- candidato_id: uuid (FK → profiles)
- edital_id: uuid (FK → editais)
- workflow_execution_id: uuid (FK → workflow_executions)
- status: text ('pendente_workflow' | 'em_analise' | 'aprovado' | 'inabilitado')
- dados_inscricao: jsonb
- is_rascunho: boolean
```

#### 6. `workflow_approvals`
Registros de aprovações manuais.
```sql
- id: uuid (PK)
- step_execution_id: uuid (FK → workflow_step_executions)
- approver_id: uuid (FK → profiles)
- decision: text ('approved' | 'rejected' | 'pending')
- comments: text
```

#### 7. `signature_requests`
Solicitações de assinatura via Assinafy.
```sql
- id: uuid (PK)
- workflow_execution_id: uuid (FK → workflow_executions)
- step_execution_id: uuid (FK → workflow_step_executions)
- external_id: text (ID do Assinafy)
- provider: text ('manual' | 'assinafy')
- signers: jsonb (array de signatários)
- status: text ('pending' | 'completed' | 'failed')
- document_url: text
- metadata: jsonb
```

---

## 🔄 Fluxo Completo de Execução

### FASE 1-5: SQL & Triggers (Base de Dados)

#### Trigger: `queue_workflow_execution`
Enfileira workflow automaticamente quando inscrição é finalizada.

```sql
CREATE TRIGGER queue_workflow_execution
AFTER INSERT OR UPDATE ON inscricoes_edital
FOR EACH ROW
WHEN (NEW.is_rascunho = false AND OLD.is_rascunho IS DISTINCT FROM false)
EXECUTE FUNCTION queue_workflow_execution();
```

**Função `queue_workflow_execution()`:**
1. Busca `workflow_id` do edital vinculado
2. Insere registro em `workflow_queue` com status `'pending'`
3. Define `status` da inscrição como `'pendente_workflow'`
4. Usa `ON CONFLICT (inscricao_id)` para evitar duplicatas

#### Trigger: `sync_workflow_status_to_inscricao`
Sincroniza status do workflow com a inscrição.

```sql
CREATE TRIGGER sync_workflow_status_to_inscricao
AFTER UPDATE ON workflow_executions
FOR EACH ROW
EXECUTE FUNCTION sync_workflow_status_to_inscricao();
```

**Função `sync_workflow_status_to_inscricao()`:**
- `workflow_status = 'completed'` → `inscricao.status = 'aprovado'`
- `workflow_status = 'failed'` → `inscricao.status = 'inabilitado'`
- `workflow_status = 'running'` → `inscricao.status = 'em_analise'`

---

### FASE 6-10: Edge Functions (Backend)

#### 1. `process-workflow-queue`
Worker que processa fila de workflows.

**Fluxo:**
1. Chamar RPC `process_workflow_queue()` que retorna até 20 items pendentes
2. Para cada item:
   - Marcar como `'processing'` em `workflow_queue`
   - Invocar `execute-workflow` com `inscricaoId` e `inputData`
   - Se sucesso: marcar `'completed'`
   - Se erro: incrementar `attempts` e marcar `'failed'` se atingir `max_attempts`

**Agendamento:**
```sql
-- Executar a cada minuto via pg_cron
SELECT cron.schedule(
  'process-workflow-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://[project-ref].supabase.co/functions/v1/process-workflow-queue',
    headers:='{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

#### 2. `execute-workflow`
Motor principal de execução de workflows.

**Input:**
```typescript
{
  workflowId: string,
  inputData: object,
  inscricaoId?: string,
  continueFrom?: string  // Para retomar de um nó específico
}
```

**Fluxo Principal:**
1. **Validação:**
   - Verificar autenticação
   - Buscar workflow ativo
   - Validar nó inicial (`start`)

2. **Criar Execução:**
   ```sql
   INSERT INTO workflow_executions (workflow_id, started_by, status)
   VALUES (...) RETURNING id;
   ```

3. **Vincular Inscrição (se aplicável):**
   ```sql
   UPDATE inscricoes_edital
   SET workflow_execution_id = [execution.id]
   WHERE id = [inscricaoId];
   ```

4. **Executar Nós Recursivamente:**
   - Chamar `executeWorkflowSteps(startNode, context, ...)`
   - Contexto persiste entre nós: `{ ...inputData, previousStepOutput: {...} }`

5. **Finalizar:**
   ```sql
   UPDATE workflow_executions
   SET status = 'completed', completed_at = NOW()
   WHERE id = [execution.id];
   ```

**Função `executeWorkflowSteps()` (Recursiva):**

```typescript
async function executeWorkflowSteps(
  currentNode: WorkflowNode,
  context: any,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  executionId: string,
  workflowId: string
) {
  // 1. Criar step_execution
  const stepExecution = await db.insert('workflow_step_executions', {
    execution_id: executionId,
    node_id: currentNode.id,
    node_type: currentNode.data.type,
    status: 'running',
    input_data: context
  });

  // 2. Executar lógica específica do nó
  let outputData = {};
  switch (currentNode.data.type) {
    case 'start':
      console.log('[START] Workflow iniciado');
      break;

    case 'email':
      // Invocar send-templated-email
      await supabase.functions.invoke('send-templated-email', {
        body: {
          to: resolveVariable(currentNode.data.to, context),
          subject: currentNode.data.subject,
          body: currentNode.data.body,
          context: { inscricaoId, candidatoId, ... }
        }
      });
      break;

    case 'signature':
      // Invocar send-signature-request
      const { data: signatureRequest } = await supabase.functions.invoke(
        'send-signature-request',
        { body: { signers, documentUrl, ... } }
      );
      
      // Criar registro em signature_requests
      await db.insert('signature_requests', {
        workflow_execution_id: executionId,
        step_execution_id: stepExecution.id,
        external_id: signatureRequest.id,
        status: 'pending',
        ...
      });
      
      // NÃO avança automaticamente - aguarda webhook
      await db.update('workflow_step_executions', stepExecution.id, {
        status: 'pending',
        output_data: { signature_request_id: signatureRequest.id }
      });
      return; // Para execução aqui
      break;

    case 'approval':
      // Criar registro em workflow_approvals
      await db.insert('workflow_approvals', {
        step_execution_id: stepExecution.id,
        approver_id: currentNode.data.approverId,
        decision: 'pending'
      });
      
      // Notificar aprovador
      await db.insert('app_notifications', {
        user_id: currentNode.data.approverId,
        type: 'info',
        title: 'Aprovação Pendente',
        message: `Workflow aguarda sua aprovação`,
        related_type: 'workflow_step',
        related_id: stepExecution.id
      });
      
      // Marcar como pendente e PARAR execução
      await db.update('workflow_step_executions', stepExecution.id, {
        status: 'pending'
      });
      return; // Aguarda decisão
      break;

    case 'database':
      // Executar update no banco
      const { table, action, data } = currentNode.data;
      if (action === 'update') {
        await db.from(table).update(data).eq('id', context.inscricaoId);
      }
      break;

    case 'condition':
      // Avaliar condição e escolher próximo nó
      const conditionMet = evaluateCondition(
        currentNode.data.condition,
        context
      );
      
      const nextEdge = edges.find(e =>
        e.source === currentNode.id &&
        e.data?.label === (conditionMet ? 'Sim' : 'Não')
      );
      
      if (!nextEdge) throw new Error('Nenhuma ramificação encontrada');
      const nextNode = nodes.find(n => n.id === nextEdge.target);
      
      await db.update('workflow_step_executions', stepExecution.id, {
        status: 'completed',
        output_data: { condition_met: conditionMet }
      });
      
      return executeWorkflowSteps(nextNode, context, ...); // Recursão
      break;

    case 'end':
      console.log('[END] Workflow finalizado');
      await db.update('workflow_executions', executionId, {
        status: 'completed',
        completed_at: new Date()
      });
      return; // Fim do workflow
      break;
  }

  // 3. Marcar step como concluído
  await db.update('workflow_step_executions', stepExecution.id, {
    status: 'completed',
    completed_at: new Date(),
    output_data: outputData
  });

  // 4. Buscar próximo nó
  const nextEdge = edges.find(e => e.source === currentNode.id);
  if (!nextEdge) {
    console.log('[WORKFLOW] Nenhum próximo nó - finalizando');
    return;
  }

  const nextNode = nodes.find(n => n.id === nextEdge.target);
  if (!nextNode) throw new Error('Próximo nó não encontrado');

  // 5. Atualizar current_node_id
  await db.update('workflow_executions', executionId, {
    current_node_id: nextNode.id
  });

  // 6. Continuar execução recursivamente
  const updatedContext = {
    ...context,
    previousStepOutput: outputData
  };
  
  return executeWorkflowSteps(nextNode, updatedContext, nodes, edges, executionId, workflowId);
}
```

#### 3. `continue-workflow`
Retoma execução após pausa (aprovação/assinatura).

**Input:**
```typescript
{
  stepExecutionId: string,
  decision?: 'approved' | 'rejected'
}
```

**Fluxo:**
1. Buscar `step_execution` e respectiva `workflow_execution`
2. Buscar workflow original (nodes + edges)
3. Identificar próximo nó a partir do `step_execution.node_id`
4. Se nó final: finalizar workflow
5. Se não: invocar `execute-workflow` com `continueFrom: nextNode.id`

#### 4. `assinafy-webhook`
Recebe notificações do Assinafy sobre status de assinatura.

**Eventos Processados:**
- `document.pending`: Documento aguardando assinatura
- `document.signed`: Documento assinado por um signatário
- `document.completed`: Todos assinaram - **CONTINUAR WORKFLOW**
- `document.rejected`: Assinatura recusada

**Fluxo (evento `completed`):**
```typescript
// 1. Atualizar signature_request
await db.update('signature_requests', { status: 'completed' });

// 2. Atualizar step_execution
await db.update('workflow_step_executions', stepExecutionId, {
  status: 'completed',
  output_data: { signature_completed: true }
});

// 3. Continuar workflow automaticamente
await supabase.functions.invoke('continue-workflow', {
  body: {
    stepExecutionId,
    decision: 'approved'
  }
});
```

#### 5. `send-templated-email`
Envia e-mails com resolução de variáveis.

**Input:**
```typescript
{
  to: string,             // Pode conter variáveis: '{candidato.email}'
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
  context?: {
    inscricaoId?: string,
    candidatoId?: string,
    analistaId?: string,
    gestorId?: string,
    editalId?: string
  }
}
```

**Resolução de Variáveis:**
```typescript
function resolveVariables(text: string, context: any, db: any) {
  // Buscar dados relacionados
  const candidato = await db.from('profiles').select('*').eq('id', context.candidatoId).single();
  const inscricao = await db.from('inscricoes_edital').select('*, edital:editais(*)').eq('id', context.inscricaoId).single();
  
  // Substituir no texto
  let resolved = text;
  resolved = resolved.replace(/{candidato\.nome}/g, candidato.nome);
  resolved = resolved.replace(/{candidato\.email}/g, candidato.email);
  resolved = resolved.replace(/{edital\.titulo}/g, inscricao.edital.titulo);
  
  return resolved;
}
```

**Envio via Resend:**
```typescript
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` },
  body: JSON.stringify({
    from: 'Sistema <onboarding@resend.dev>',
    to: [resolvedTo],
    subject: resolvedSubject,
    html: resolvedBody.replace(/\n/g, '<br>')
  })
});
```

---

### FASE 11-15: Frontend & UX

#### 1. WorkflowTimeline (Timeline Visual)
Componente React que renderiza linha do tempo do workflow.

**Estados dos Nós:**
- `completed`: Verde com ícone de check
- `running`: Azul com animação de pulse
- `pending`: Cinza aguardando
- `failed`: Vermelho com ícone de erro

**Realtime:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`workflow-${executionId}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'workflow_step_executions' 
    }, () => {
      refetchWorkflowData();
    })
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, [executionId]);
```

#### 2. WorkflowApprovalPanel
Painel de aprovações pendentes para analistas/gestores.

**Query:**
```typescript
const { data: approvalsPending } = await supabase
  .from('workflow_step_executions')
  .select(`
    *,
    workflow_executions (
      id,
      inscricoes_edital (
        id,
        candidato:profiles(nome, email),
        edital:editais(titulo)
      )
    )
  `)
  .eq('node_type', 'approval')
  .eq('status', 'running');
```

**Ação de Aprovar/Rejeitar:**
```typescript
async function handleApproval(stepExecutionId: string, decision: 'approved' | 'rejected') {
  // 1. Registrar decisão
  await supabase.from('workflow_approvals')
    .insert({
      step_execution_id: stepExecutionId,
      approver_id: currentUserId,
      decision,
      comments
    });
  
  // 2. Continuar workflow
  await supabase.functions.invoke('continue-workflow', {
    body: { stepExecutionId, decision }
  });
}
```

#### 3. MessagesTab (Chat Interno)
Sistema de mensagens entre candidato e analista.

**Envio de Mensagem:**
```typescript
const [isSending, setIsSending] = useState(false);

async function sendMessage() {
  setIsSending(true);
  await supabase.from('workflow_messages').insert({
    execution_id: workflowExecutionId,
    inscricao_id: inscricaoId,
    sender_id: currentUserId,
    sender_type: role,
    content: messageText
  });
  setIsSending(false);
}
```

**Feedback Visual:**
```tsx
<Button disabled={isSending}>
  {isSending ? <Loader2 className="animate-spin" /> : <Send />}
  Enviar
</Button>
```

---

### FASE 16-20: Integrações Externas

#### Assinafy API
**Endpoint:** `https://api.assinafy.com.br/v1`

**1. Criar Documento para Assinatura:**
```typescript
POST /documents
Headers: { 'Authorization': 'Bearer [ASSINAFY_API_KEY]' }
Body: {
  name: 'Contrato de Credenciamento',
  signers: [
    { name: 'João Silva', email: 'joao@example.com', auth_mode: 'email' }
  ],
  file: [base64_pdf],
  webhook_url: 'https://[project].supabase.co/functions/v1/assinafy-webhook',
  webhook_secret: '[SECRET]'
}

Response: { id: 'doc_123abc', status: 'pending', ... }
```

**2. Webhook de Notificação:**
```typescript
POST /assinafy-webhook
Headers: { 'X-Assinafy-Signature': '[HMAC-SHA256]' }
Body: {
  event: 'document.completed',
  data: {
    document_id: 'doc_123abc',
    signed_url: 'https://storage.assinafy.com/...',
    signers: [
      { name: 'João Silva', signed_at: '2025-10-05T15:30:00Z' }
    ]
  }
}
```

#### Resend API
**Endpoint:** `https://api.resend.com`

```typescript
POST /emails
Headers: { 'Authorization': 'Bearer [RESEND_API_KEY]' }
Body: {
  from: 'Sistema <onboarding@resend.dev>',
  to: ['candidato@example.com'],
  subject: 'Inscrição Aprovada',
  html: '<p>Parabéns, sua inscrição foi aprovada!</p>'
}

Response: { id: 're_123abc' }
```

#### Google Cloud Vision OCR
**Endpoint:** `https://vision.googleapis.com/v1`

```typescript
POST /images:annotate
Headers: { 'Authorization': 'Bearer [GOOGLE_CLOUD_VISION_API_KEY]' }
Body: {
  requests: [{
    image: { content: [base64_image] },
    features: [{ type: 'TEXT_DETECTION' }]
  }]
}

Response: {
  responses: [{
    fullTextAnnotation: {
      text: 'CPF: 123.456.789-00\nRG: 12.345.678-9'
    }
  }]
}
```

---

### FASE 21-25: Testes & Polish

#### Error Boundary
Captura erros React e exibe interface amigável.

```tsx
<ErrorBoundary>
  <QueryClientProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
</ErrorBoundary>
```

#### Logging Estruturado
Todos os logs seguem padrão:

```typescript
// ✅ BOM
console.log('[WORKFLOW] ✅ Execução criada:', { executionId, workflowId });
console.error('[WORKFLOW] ❌ Erro ao executar nó:', error);

// ❌ RUIM
console.log('Workflow criado');
console.error(error);
```

#### Performance Optimization
1. **Índices de Performance:**
```sql
CREATE INDEX idx_workflow_queue_status_attempts 
ON workflow_queue(status, attempts) 
WHERE status IN ('pending', 'failed');

CREATE INDEX idx_workflow_executions_status 
ON workflow_executions(status, started_at) 
WHERE status = 'running';
```

2. **React Query Cache:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: false
    }
  }
});
```

3. **Realtime Subscriptions:**
```typescript
// Cleanup ao desmontar
useEffect(() => {
  const channel = supabase.channel('updates').subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

---

## 🔐 Segurança (RLS Policies)

### workflow_executions
```sql
-- Analistas podem ver todas as execuções
CREATE POLICY "Analistas podem ver execuções"
ON workflow_executions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'analista'));

-- Candidatos veem apenas suas próprias
CREATE POLICY "Candidatos veem suas execuções"
ON workflow_executions FOR SELECT
TO authenticated
USING (started_by = auth.uid());
```

### workflow_approvals
```sql
-- Apenas aprovadores podem criar aprovações
CREATE POLICY "Aprovadores criam aprovações"
ON workflow_approvals FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = approver_id
  AND has_role(auth.uid(), 'analista')
);
```

### inscricoes_edital
```sql
-- Candidatos atualizam apenas suas inscrições rascunho
CREATE POLICY "Candidatos atualizam rascunhos"
ON inscricoes_edital FOR UPDATE
TO authenticated
USING (
  candidato_id = auth.uid()
  AND status = 'rascunho'
);
```

---

## 🚀 Deploy & Monitoramento

### Edge Functions
Todas as edge functions são deployadas automaticamente via Lovable Cloud.

### Cron Job (pg_cron)
```sql
-- Executar process-workflow-queue a cada minuto
SELECT cron.schedule(
  'process-queue',
  '* * * * *',
  $$ 
  SELECT net.http_post(
    url:='https://ncmofeencqpqhtguxmvy.supabase.co/functions/v1/process-workflow-queue',
    headers:='{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
  );
  $$
);
```

### Limpeza Automática (Manutenção)
```sql
-- Executar cleanup_orphan_workflows() diariamente às 3h
SELECT cron.schedule(
  'cleanup-orphans',
  '0 3 * * *',
  'SELECT cleanup_orphan_workflows();'
);
```

**Função `cleanup_orphan_workflows()`:**
1. Remove `workflow_executions` sem `inscricao_id` associada (>24h)
2. Reseta `workflow_queue` travados em `'processing'` (>30min)
3. Retorna quantidade de registros limpos

---

## 📊 Métricas & Observabilidade

### Queries Úteis

**1. Workflows por Status:**
```sql
SELECT status, COUNT(*) 
FROM workflow_executions 
GROUP BY status;
```

**2. Taxa de Sucesso (últimos 7 dias):**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
FROM workflow_executions
WHERE started_at > NOW() - INTERVAL '7 days';
```

**3. Aprovações Pendentes por Analista:**
```sql
SELECT 
  p.nome,
  COUNT(*) as pending_approvals
FROM workflow_approvals wa
JOIN profiles p ON p.id = wa.approver_id
WHERE wa.decision = 'pending'
GROUP BY p.nome;
```

**4. Tempo Médio de Execução:**
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) / 60 as avg_minutes
FROM workflow_executions
WHERE status = 'completed'
  AND started_at > NOW() - INTERVAL '30 days';
```

---

## 🐛 Troubleshooting

### Workflow Não Inicia Automaticamente
**Sintoma:** Inscrição finalizada mas `workflow_execution_id` é `NULL`.

**Diagnóstico:**
```sql
-- Verificar se há item na fila
SELECT * FROM workflow_queue WHERE inscricao_id = '[id]';

-- Verificar trigger
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'queue_workflow_execution';
```

**Solução:**
1. Re-enfileirar manualmente:
```sql
SELECT enqueue_orphan_inscricoes();
```

2. Processar fila:
```sql
SELECT process_workflow_queue();
```

### Workflow Travado em "Running"
**Sintoma:** `workflow_executions.status = 'running'` há muito tempo.

**Diagnóstico:**
```sql
-- Ver último nó executado
SELECT current_node_id, started_at 
FROM workflow_executions 
WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '1 hour';

-- Ver steps do workflow
SELECT node_id, node_type, status, error_message
FROM workflow_step_executions
WHERE execution_id = '[id]'
ORDER BY started_at DESC;
```

**Possíveis Causas:**
1. Nó de aprovação aguardando decisão
2. Assinatura pendente
3. Edge function falhando silenciosamente

**Solução:**
```sql
-- Resetar fila
UPDATE workflow_queue SET status = 'pending', attempts = 0 
WHERE inscricao_id = '[id]';

-- Ou limpar via função
SELECT cleanup_orphan_workflows();
```

### Assinatura Não Continua Workflow
**Sintoma:** Webhook do Assinafy recebido mas workflow não avança.

**Diagnóstico:**
```bash
# Ver logs do webhook
supabase functions logs assinafy-webhook --project-ref ncmofeencqpqhtguxmvy

# Verificar signature_request
SELECT * FROM signature_requests WHERE external_id = '[assinafy_doc_id]';
```

**Correções Comuns:**
1. Verificar `ASSINAFY_WEBHOOK_SECRET` está configurado
2. Confirmar que `continue-workflow` está sendo invocado no webhook
3. Validar que `step_execution_id` está correto

---

## 📝 Notas de Desenvolvimento

### Convenções de Nomenclatura

**Logs:**
- Prefixo: `[NOME_MODULO]`
- Sucesso: `✅`
- Erro: `❌`
- Aviso: `⚠️`
- Info: `ℹ️`

Exemplo:
```typescript
console.log('[WORKFLOW] ✅ Execução criada:', { executionId });
console.error('[WORKFLOW] ❌ Erro ao executar nó:', error);
```

**Status:**
- Use sempre lowercase: `'pending'`, `'running'`, `'completed'`, `'failed'`
- Evite: `'PENDING'`, `'Running'`, `'Complete'`

**IDs:**
- UUIDs no formato: `uuid-v4`
- Sempre usar `gen_random_uuid()` no Postgres
- Sempre usar `RETURNING id` em `INSERT`

---

## 🎯 Roadmap Futuro

1. **Dashboard de Analytics:**
   - Métricas em tempo real (workflows/dia, taxa de sucesso)
   - Gráficos de performance por tipo de workflow
   - Alertas de workflows travados

2. **Workflow Editor Visual Avançado:**
   - Arrastar/soltar nós
   - Validação visual de conexões
   - Preview de execução simulada

3. **Integrações Adicionais:**
   - WhatsApp (Twilio)
   - SMS (Vonage)
   - E-mail transacional avançado (SendGrid)

4. **AI/ML:**
   - OCR melhorado com GPT-4 Vision
   - Análise automática de documentos
   - Sugestões de aprovação baseadas em histórico

---

**Última Atualização:** 2025-10-05  
**Versão do Sistema:** 1.0.0  
**Equipe:** IPE Saúde Connect Development Team
