# Troubleshooting de Workflows

Guia completo de problemas comuns e soluções para o Sistema de Workflows (v1 e v2).

---

## 🔍 Diagnóstico Rápido

### 1. Workflow Travado em "running" (>30min)

**Sintomas:**
- `workflow_executions.status = 'running'` por muito tempo
- Dashboard mostra execução ativa mas sem progresso

**Causas Possíveis:**

#### A) Nó pausado sem resolução
```sql
-- Verificar nós pausados
SELECT 
  node_id, 
  status, 
  started_at,
  output_data
FROM workflow_step_executions
WHERE execution_id = 'UUID_EXECUTION'
  AND status = 'paused'
ORDER BY started_at DESC;
```

**Solução:**
- Se for `approval` ou `form`: continuar manualmente via `continue-workflow`
- Se for erro de lógica: cancelar e recriar workflow

#### B) Dependência circular
```sql
-- Verificar grafo de dependências
SELECT nodes, edges 
FROM workflows 
WHERE id = (
  SELECT workflow_id 
  FROM workflow_executions 
  WHERE id = 'UUID_EXECUTION'
);
```

**Solução:**
- Analisar `edges` e remover ciclos
- Usar ferramenta de validação de grafo

#### C) Processo worker travado
```sql
-- Limpar execuções órfãs (>24h sem movimento)
SELECT * FROM cleanup_orphan_workflows();
```

**Solução:**
- Executar função de limpeza
- Verificar logs do `process-workflow-queue`

---

### 2. Workflow Falha Imediatamente

**Sintomas:**
- `status = 'failed'` logo após iniciar
- `error_message` genérico ou vazio

**Causas Possíveis:**

#### A) Nó de início não encontrado
```sql
-- Verificar se existe nó 'start'
SELECT * FROM workflows 
WHERE id = 'UUID_WORKFLOW'
  AND nodes @> '[{"type": "start"}]';
```

**Solução:**
- Adicionar nó do tipo `start` no workflow
- Garantir que `start` é o primeiro nó

#### B) Executor não encontrado
Erro: `Executor não encontrado para tipo de nó: TIPO`

**Solução:**
```typescript
// Verificar em supabase/functions/execute-workflow/executors/index.ts
const executorRegistry: Map<string, NodeExecutor> = new Map([
  ['start', new StartExecutor()],
  ['form', new FormExecutor()],
  // ... adicionar tipo faltando
]);
```

#### C) Configuração inválida do nó
```sql
-- Ver output_data do primeiro step que falhou
SELECT node_id, error_message, output_data
FROM workflow_step_executions
WHERE execution_id = 'UUID_EXECUTION'
  AND status = 'failed'
ORDER BY started_at ASC
LIMIT 1;
```

**Solução:**
- Corrigir configuração do nó (ex: `emailConfig`, `httpConfig`)
- Validar campos obrigatórios

---

### 3. Condicional Sempre Vai Para False

**Sintomas:**
- Edge com `condition` nunca é executada
- Workflow segue sempre o mesmo caminho

**Debug:**
```sql
-- Ver contexto no momento da decisão
SELECT 
  se.node_id,
  se.input_data as contexto_entrada,
  se.output_data as contexto_saida
FROM workflow_step_executions se
WHERE se.execution_id = 'UUID_EXECUTION'
  AND se.node_type = 'condition'
ORDER BY se.started_at DESC
LIMIT 1;
```

**Causas e Soluções:**

#### A) Variável não existe no contexto
```typescript
// Condicional: {context.cpf_valid} === true
// Mas contexto só tem: { cpf: '12345678900' }

// ❌ ERRADO
condition: '{context.cpf_valid} === true'

// ✅ CORRETO
condition: '{context.cpf} !== null && {context.cpf}.length === 11'
```

#### B) Operador incorreto
```typescript
// ❌ ERRADO (usa = ao invés de ===)
condition: '{context.status} = "approved"'

// ✅ CORRETO
condition: '{context.status} === "approved"'
```

#### C) Tipo de dado incompatível
```typescript
// Contexto: { score: "85" } (string, não número)

// ❌ ERRADO
condition: '{context.score} > 70'

// ✅ CORRETO (converter para número)
condition: 'parseInt({context.score}) > 70'
```

**Teste manual de expressões:**
```javascript
// Console do navegador (ou Deno)
const context = { score: 85, status: 'pending' };
const expr = `context.score > 70 && context.status === 'pending'`;

try {
  const result = eval(expr);
  console.log('Resultado:', result); // true
} catch (err) {
  console.error('Erro na expressão:', err);
}
```

---

### 4. Nós Paralelos Não Iniciam

**Sintomas:**
- Workflow tem múltiplos caminhos mas executa sequencialmente
- Dashboard de grafo mostra apenas 1 nó ativo por vez

**Causas:**

#### A) `maxParallelNodes` muito baixo
```typescript
// Em execute-workflow-v2/index.ts
const orchestrator = new WorkflowOrchestrator(supabaseClient, {
  maxParallelNodes: 1, // ← Sequencial!
  // ...
});
```

**Solução:**
```typescript
const orchestrator = new WorkflowOrchestrator(supabaseClient, {
  maxParallelNodes: 3, // ← Permite 3 nós simultâneos
  enableConditionals: true,
  enableJoinStrategies: true,
});
```

#### B) Dependências incorretas
```typescript
// ❌ ERRADO: B e C dependem de A, mas B também depende de C
const edges = [
  { source: 'A', target: 'B' },
  { source: 'A', target: 'C' },
  { source: 'C', target: 'B' }, // ← Dependência desnecessária
];

// ✅ CORRETO: B e C só dependem de A
const edges = [
  { source: 'A', target: 'B' },
  { source: 'A', target: 'C' },
];
```

#### C) Feature flag desabilitada
```sql
-- Verificar se edital usa v2 (que suporta paralelismo)
SELECT e.titulo, e.use_orchestrator_v2
FROM editais e
JOIN inscricoes_edital ie ON ie.edital_id = e.id
JOIN workflow_executions we ON we.id = (
  SELECT workflow_execution_id FROM inscricoes_edital WHERE id = ie.id
)
WHERE we.id = 'UUID_EXECUTION';
```

**Solução:**
```sql
-- Habilitar v2 para o edital
UPDATE editais SET use_orchestrator_v2 = true WHERE id = 'UUID_EDITAL';
```

---

### 5. Join Não Aguarda Todos os Nós

**Sintomas:**
- Nó `join` executa antes de todos predecessores completarem
- Workflow pula etapas

**Debug:**
```sql
-- Ver estado dos predecessores do join
SELECT 
  se.node_id,
  se.status,
  se.completed_at
FROM workflow_step_executions se
WHERE se.execution_id = 'UUID_EXECUTION'
  AND se.node_id IN ('node_a', 'node_b', 'node_c') -- predecessores do join
ORDER BY se.started_at;
```

**Causas:**

#### A) Join Strategy incorreta
```typescript
// Nó join
{
  id: 'join1',
  type: 'join',
  data: {
    joinConfig: {
      strategy: 'wait_any', // ← Libera com apenas 1 predecessor
      // ...
    }
  }
}
```

**Solução:**
```typescript
{
  id: 'join1',
  type: 'join',
  data: {
    joinConfig: {
      strategy: 'wait_all', // ← Aguarda TODOS
      timeout: 300000, // 5min
      onTimeout: 'fail'
    }
  }
}
```

#### B) Edge faltando para o join
```typescript
// ❌ ERRADO: Falta edge de C para join
const edges = [
  { source: 'A', target: 'join' },
  { source: 'B', target: 'join' },
  // { source: 'C', target: 'join' }, ← FALTA!
];

// ✅ CORRETO: Todos nós conectam ao join
const edges = [
  { source: 'A', target: 'join' },
  { source: 'B', target: 'join' },
  { source: 'C', target: 'join' },
];
```

---

### 6. OCR Não Extrai Dados Corretamente

**Sintomas:**
- `ocr_resultado` vazio ou incompleto
- Campos não mapeados no contexto

**Debug:**
```sql
-- Ver resultado bruto do OCR
SELECT 
  id.tipo_documento,
  id.ocr_resultado,
  id.ocr_confidence,
  id.arquivo_url
FROM inscricao_documentos id
WHERE id.inscricao_id = 'UUID_INSCRICAO'
  AND id.ocr_processado = true
ORDER BY id.created_at DESC;
```

**Causas:**

#### A) Imagem de baixa qualidade
- Resolução < 300 DPI
- Foto com sombras/reflexos
- Documento cortado

**Solução:**
- Reenviar documento com melhor qualidade
- Usar scanner ao invés de foto

#### B) Field Mappings não configurados
```typescript
// Em OCRExecutor
const ocrConfig = node.data.ocrConfig || {};
const fieldMappings = ocrConfig.fieldMappings || {};

// Se fieldMappings vazio, OCR não mapeia para contexto!
```

**Solução:**
```typescript
// Configurar mapeamentos no nó OCR
{
  id: 'ocr1',
  type: 'ocr',
  data: {
    label: 'OCR - CPF',
    ocrConfig: {
      documentType: 'cpf',
      fieldMappings: {
        'cpf': 'context.cpf',
        'nome': 'context.nome_completo',
        'data_nascimento': 'context.data_nasc'
      }
    }
  }
}
```

#### C) Google Vision API key inválida
```sql
-- Verificar secret
SELECT * FROM vault.secrets WHERE name = 'GOOGLE_CLOUD_VISION_API_KEY';
```

**Solução:**
- Atualizar API key via `supabase secrets set`

---

### 7. Email Não Enviado

**Sintomas:**
- Nó `email` completa sem erro mas email não chega
- `output_data` não tem `messageId`

**Debug:**
```sql
-- Ver output do nó email
SELECT 
  node_id,
  status,
  output_data,
  error_message
FROM workflow_step_executions
WHERE execution_id = 'UUID_EXECUTION'
  AND node_type = 'email'
ORDER BY started_at DESC
LIMIT 1;
```

**Causas:**

#### A) Resend API key inválida
```sql
-- Verificar secret
SELECT name FROM vault.secrets WHERE name = 'RESEND_API_KEY';
```

**Solução:**
```bash
# Atualizar via CLI
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
```

#### B) Template não encontrado
```typescript
// emailConfig com templateId inexistente
{
  templateId: 'template_123', // ← Não existe!
}
```

**Solução:**
```sql
-- Listar templates disponíveis
SELECT id, name FROM email_templates;

-- Usar template existente ou criar novo
```

#### C) Variáveis não resolvidas
```typescript
// Template: "Olá {context.nome}, ..."
// Mas contexto não tem 'nome'

// ❌ ERRADO
Resultado: "Olá undefined, ..."
```

**Solução:**
```typescript
// Garantir que variáveis existem no contexto
context.setGlobal('nome', 'João Silva');
```

---

### 8. Webhook Falha com Timeout

**Sintomas:**
- Nó `webhook` falha após 30s
- `error_message: "Request timeout"`

**Causas:**

#### A) API externa lenta
```typescript
// httpConfig com URL que demora >30s
{
  url: 'https://api-externa.com/slow-endpoint',
  method: 'POST',
  timeout: 30000 // ← Padrão
}
```

**Solução:**
```typescript
// Aumentar timeout
{
  url: 'https://api-externa.com/slow-endpoint',
  method: 'POST',
  timeout: 60000 // 60s
}
```

#### B) Headers de autenticação incorretos
```typescript
// ❌ ERRADO
headers: { 'Authorization': 'Bearer token' } // token hardcoded

// ✅ CORRETO (usar secrets)
headers: { 'Authorization': 'Bearer {secrets.API_TOKEN}' }
```

#### C) Payload muito grande
```typescript
// body > 6MB causa timeout
body: { data: [...] } // array gigante
```

**Solução:**
- Paginar requisições
- Comprimir payload
- Usar upload direto para storage

---

### 9. Inscrição Não Entra na Fila de Workflows

**Sintomas:**
- `workflow_queue` não tem registro para a inscrição
- Status fica em `rascunho` indefinidamente

**Debug:**
```sql
-- Verificar fila
SELECT * FROM workflow_queue WHERE inscricao_id = 'UUID_INSCRICAO';

-- Verificar trigger
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'queue_workflow_on_inscricao_submit';
```

**Causas:**

#### A) `is_rascunho` não mudou para `false`
```sql
-- Verificar status
SELECT is_rascunho, status FROM inscricoes_edital WHERE id = 'UUID_INSCRICAO';
```

**Solução:**
```sql
-- Forçar enfileiramento
UPDATE inscricoes_edital SET is_rascunho = false WHERE id = 'UUID_INSCRICAO';
```

#### B) Edital sem workflow vinculado
```sql
-- Verificar edital
SELECT e.id, e.titulo, e.workflow_id 
FROM editais e
JOIN inscricoes_edital ie ON ie.edital_id = e.id
WHERE ie.id = 'UUID_INSCRICAO';
```

**Solução:**
```sql
-- Vincular workflow ao edital
UPDATE editais SET workflow_id = 'UUID_WORKFLOW' WHERE id = 'UUID_EDITAL';
```

---

### 10. Retry Não Funciona

**Sintomas:**
- Workflow falha mas não é re-executado
- `retry_count` não incrementa

**Debug:**
```sql
-- Verificar retry_count
SELECT retry_count, max_attempts, status, error_message
FROM workflow_queue
WHERE inscricao_id = 'UUID_INSCRICAO';
```

**Causas:**

#### A) `max_attempts` atingido
```sql
-- retry_count >= max_attempts (padrão 3)
SELECT retry_count, max_attempts FROM workflow_queue WHERE inscricao_id = 'UUID_INSCRICAO';
```

**Solução:**
```sql
-- Resetar tentativas
UPDATE workflow_queue 
SET retry_count = 0, status = 'pending', error_message = NULL
WHERE inscricao_id = 'UUID_INSCRICAO';
```

#### B) Status travado em `processing`
```sql
-- Verificar items travados
SELECT * FROM workflow_queue 
WHERE status = 'processing' 
  AND processing_started_at < NOW() - INTERVAL '30 minutes';
```

**Solução:**
```sql
-- Executar limpeza automática
SELECT * FROM cleanup_orphan_workflows();
```

---

## 🛠️ Ferramentas de Debug

### 1. Consultar Estado do Workflow
```bash
curl -X POST https://ncmofeencqpqhtguxmvy.supabase.co/functions/v1/workflow-state \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"executionId": "UUID_EXECUTION", "includeTransitions": true}'
```

### 2. Ver Logs do Worker
```sql
-- Via Supabase Dashboard > Edge Functions > process-workflow-queue > Logs
-- Ou via CLI:
supabase functions logs process-workflow-queue --tail
```

### 3. Debug do Orquestrador
```typescript
// Em execute-workflow-v2
orchestrator.debug(); // Imprime estados internos
```

### 4. Simular Execução Localmente
```typescript
// Criar workflow de teste em Deno
const testNodes = [
  { id: 'start', type: 'start', data: {} },
  { id: 'test', type: 'email', data: { emailConfig: {...} } },
  { id: 'end', type: 'end', data: {} }
];

const orchestrator = new WorkflowOrchestrator(supabaseClient, {
  maxParallelNodes: 1,
  debug: true
});

await orchestrator.initialize(testNodes, testEdges, { test: 'data' });
await orchestrator.execute('test-exec-id');
```

---

## 📊 Comandos SQL Úteis

### Limpar Workflows Órfãos
```sql
SELECT * FROM cleanup_orphan_workflows();
```

### Reprocessar Inscrições Falhadas
```sql
SELECT * FROM enqueue_orphan_inscricoes();
```

### Ver Execuções Ativas
```sql
SELECT 
  we.id,
  we.status,
  we.started_at,
  w.name as workflow_name,
  ie.candidato_id
FROM workflow_executions we
JOIN workflows w ON w.id = we.workflow_id
LEFT JOIN inscricoes_edital ie ON ie.workflow_execution_id = we.id
WHERE we.status = 'running'
ORDER BY we.started_at DESC;
```

### Ver Nós Pausados
```sql
SELECT 
  wse.execution_id,
  wse.node_id,
  wse.node_type,
  wse.started_at,
  (NOW() - wse.started_at) as tempo_pausado
FROM workflow_step_executions wse
WHERE wse.status = 'paused'
ORDER BY wse.started_at ASC;
```

---

## 🚨 Problemas Críticos

### Deadlock na Fila
**Sintoma:** Worker não processa nenhum item

**Solução imediata:**
```sql
-- 1. Parar cron job
SELECT cron.unschedule('process-workflow-queue-job');

-- 2. Resetar fila
UPDATE workflow_queue SET status = 'pending', processing_started_at = NULL WHERE status = 'processing';

-- 3. Reiniciar cron job
SELECT cron.schedule(
  'process-workflow-queue-job',
  '*/2 * * * *',
  $$SELECT net.http_post(...)$$
);
```

### Banco de Dados Cheio
**Sintoma:** Erro `disk full` nos logs

**Solução:**
```sql
-- Limpar execuções antigas (>30 dias)
DELETE FROM workflow_executions WHERE started_at < NOW() - INTERVAL '30 days';

-- Vacuum
VACUUM FULL workflow_executions;
VACUUM FULL workflow_step_executions;
```

---

## 📞 Suporte

Se o problema persistir, reúna:
1. `execution_id` ou `inscricao_id`
2. Output de `SELECT * FROM workflow_state(...)`
3. Logs relevantes (Edge Functions)
4. JSON do workflow (`workflows.nodes` e `workflows.edges`)

E abra issue no repositório com label `troubleshooting`.
