# 🔍 AUDITORIA TÉCNICA - FUNCIONALIDADE DOS NÓS DE WORKFLOW

> **Data:** 2025-10-08  
> **Versão:** 1.0  
> **Objetivo:** Avaliar funcionalidade real dos executores vs necessidades de workflow cognitivo

---

## 📊 RESUMO EXECUTIVO

### Status Geral
```
✅ FUNCIONAL:        7/10 nós (70%)
⚠️ PARCIAL:          1/10 nós (10%)
❌ NÃO IMPLEMENTADO: 2/10 nós (20%)
🔴 BLOQUEADORES:     4 nós críticos faltando
```

### Veredito
```
FUNCIONALIDADE ATUAL: 65/100
MODELO COGNITIVO:     40/100
PRONTO PARA PRODUÇÃO: NÃO ❌

Razão: Faltam nós essenciais (Loop, Function, LLM, Delay)
```

---

## 📋 INVENTÁRIO DE EXECUTORES

### ✅ IMPLEMENTADOS E FUNCIONAIS

#### 1. **START NODE** (`start-executor.ts`)
```typescript
Status: ✅ Implementado (mas estético)
Linhas: 23
Funcionalidade: 2/10
```

**Análise:**
- **O que faz:** Apenas retorna o contexto recebido
- **Lógica real:** `return { outputData: context, shouldContinue: true };`
- **Problema:** Não processa trigger config (database, webhook, schedule)

**Comparação com n8n:**
```typescript
// ❌ ATUAL (apenas marcador)
return { outputData: context };

// ✅ n8n (triggers reais)
{
  trigger: 'webhook',
  url: '/webhook/abc123',
  method: 'POST',
  auth: 'bearer'
}
```

**Avaliação:**
```
FUNCIONALIDADE: 2/10 (apenas passa contexto)
MODELO COGNITIVO: N/A
RECOMENDAÇÃO: Implementar triggers reais ou remover
```

---

#### 2. **FORM NODE** (`form-executor.ts`)
```typescript
Status: ✅ FUNCIONAL
Linhas: 64
Funcionalidade: 8/10
```

**Análise:**
- **O que faz:** 
  - Verifica campos obrigatórios faltando
  - Pausa workflow se campos ausentes
  - Atualiza status para `paused`
- **Lógica real:**
```typescript
const missingRequired = formFields
  .filter((f: any) => f.required && !context?.[f.name])
  .map((f: any) => f.name);

if (forcePause || missingRequired.length > 0) {
  return { outputData: context, shouldPause: true };
}
```

**Checklist:**
- ✅ Validação de campos obrigatórios
- ✅ Pausa workflow (shouldPause: true)
- ✅ Persiste estado no banco
- ✅ Log estruturado
- ❌ Validação de schema de campos (zod/yup)
- ❌ Timeout para resposta

**Avaliação:**
```
FUNCIONALIDADE: 8/10 (muito bom!)
MODELO COGNITIVO: 6/10 (útil para coleta de dados)
SEGURANÇA: ⚠️ Sem validação de schema
```

---

#### 3. **EMAIL NODE** (`email-executor.ts`)
```typescript
Status: ✅ FUNCIONAL
Linhas: 84
Funcionalidade: 7/10
```

**Análise:**
- **O que faz:**
  - Resolve variáveis no formato `{context.path}`
  - Chama edge function `send-templated-email`
  - Retorna resultado no contexto
- **Lógica real:**
```typescript
private resolveVariables(template: string, context: ExecutionContext): string {
  return template.replace(/\{([^}]+)\}/g, (match, path) => {
    const parts = path.split('.');
    let value: any = context;
    for (const part of parts) {
      value = value?.[part];
    }
    return String(value || match);
  });
}
```

**Checklist:**
- ✅ Interpolação de variáveis
- ✅ Chamada a edge function real
- ✅ Tratamento de erro
- ✅ Log estruturado
- ❌ Retry em falha de envio
- ❌ Timeout configurável
- ❌ Templates com Handlebars/Liquid
- ❌ Anexos

**Avaliação:**
```
FUNCIONALIDADE: 7/10 (bom, falta retry)
MODELO COGNITIVO: 5/10 (útil para notificações)
CONFIABILIDADE: ⚠️ Sem retry = emails podem se perder
```

---

#### 4. **WEBHOOK/HTTP NODE** (`webhook-executor.ts`)
```typescript
Status: ✅ FUNCIONAL
Linhas: 119
Funcionalidade: 7/10
```

**Análise:**
- **O que faz:**
  - Suporta GET, POST, PUT, PATCH, DELETE
  - Resolve variáveis em URL, headers, body
  - Parsing automático de JSON
  - Tratamento de erro HTTP
- **Lógica real:**
```typescript
const response = await fetch(url, {
  method,
  headers,
  body: body ? body : undefined
});

let parsedData: any = responseData;
try {
  parsedData = JSON.parse(responseData);
} catch {
  // Manter como texto se não for JSON
}
```

**Checklist:**
- ✅ Todos métodos HTTP (GET, POST, PUT, DELETE, PATCH)
- ✅ Headers customizáveis
- ✅ Parsing automático JSON
- ✅ Interpolação de variáveis
- ✅ Tratamento de erro HTTP
- ❌ Retry com backoff
- ❌ Timeout configurável (usa default do fetch)
- ❌ Autenticação (Bearer, Basic, OAuth)
- ❌ Validação de SSL
- ❌ Rate limiting

**Avaliação:**
```
FUNCIONALIDADE: 7/10 (bom, falta retry e auth)
MODELO COGNITIVO: 8/10 (essencial para APIs externas)
CONFIABILIDADE: ⚠️ Sem retry = chamadas podem falhar silenciosamente
```

**Comparação com n8n:**
```typescript
// ❌ ATUAL
const response = await fetch(url, { method, headers, body });

// ✅ n8n
const response = await this.helpers.request({
  url,
  method,
  headers,
  body,
  auth: { type: 'bearer', token: '...' },
  timeout: 30000,
  retry: { times: 3, delay: 1000 }
});
```

---

#### 5. **OCR NODE** (`ocr-executor.ts`)
```typescript
Status: ✅ FUNCIONAL
Linhas: 87
Funcionalidade: 8/10
```

**Análise:**
- **O que faz:**
  - Resolve URL do documento do contexto
  - Invoca edge function `process-ocr`
  - Mapeia campos extraídos para contexto
- **Lógica real:**
```typescript
const { data: ocrResult, error: ocrError } = await supabaseClient.functions.invoke(
  'process-ocr',
  { body: { imageUrl: documentUrl, fieldMappings: ocrConfig.fieldMappings || [] } }
);

// Mapear campos extraídos
for (const mapping of fieldMappings) {
  if (ocrResult.extractedData[mapping.sourceField]) {
    mappedData[mapping.targetField] = ocrResult.extractedData[mapping.sourceField];
  }
}
```

**Checklist:**
- ✅ Invoca edge function real
- ✅ Mapeia campos extraídos
- ✅ Resolve variáveis de contexto
- ✅ Tratamento de erro
- ✅ Logging detalhado
- ⚠️ Depende de edge function externa

**Avaliação:**
```
FUNCIONALIDADE: 8/10 (excelente!)
MODELO COGNITIVO: 9/10 (crítico para extração de dados)
CONFIABILIDADE: ✅ Bem implementado
```

---

#### 6. **DATABASE NODE** (`database-executor.ts`)
```typescript
Status: ✅ FUNCIONAL
Linhas: 130
Funcionalidade: 6/10
```

**Análise:**
- **O que faz:**
  - CRUD básico (insert, update, delete)
  - Resolve variáveis em campos
  - Suporte a condições
- **Lógica real:**
```typescript
private resolveFields(fields: Record<string, any>, context: ExecutionContext) {
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      const varPath = value.slice(1, -1).split('.');
      let resolvedValue = context;
      for (const part of varPath) {
        resolvedValue = resolvedValue?.[part];
      }
      resolvedFields[key] = resolvedValue;
    }
  }
}
```

**Checklist:**
- ✅ CRUD completo (insert, update, delete)
- ✅ Condições básicas (eq)
- ✅ Resolve variáveis
- ❌ SELECT não implementado
- ❌ Filtros complexos (gt, lt, in, like)
- ❌ Joins
- ❌ Paginação
- ❌ Transações
- ⚠️ **CRÍTICO:** Sem proteção contra SQL injection em condições

**Avaliação:**
```
FUNCIONALIDADE: 6/10 (básico, falta SELECT)
MODELO COGNITIVO: 9/10 (essencial para persistência)
SEGURANÇA: 🔴 RISCO MÉDIO - condições não sanitizadas
```

**Vulnerabilidade Identificada:**
```typescript
// ❌ ATUAL (potencial SQL injection)
if (conditions) {
  for (const [condKey, condValue] of Object.entries(conditions)) {
    updateQuery = updateQuery.eq(condKey, condValue);
  }
}

// ⚠️ Se condValue vier de input do usuário sem validação:
// { "id": "1 OR 1=1" } -> SQL injection

// ✅ DEVERIA TER
const sanitizedConditions = this.validateConditions(conditions);
```

---

#### 7. **APPROVAL NODE** (`approval-executor.ts`)
```typescript
Status: ✅ FUNCIONAL
Linhas: 113
Funcionalidade: 8/10
```

**Análise:**
- **O que faz:**
  - Busca analistas (todos ou específicos)
  - Cria registros em `workflow_approvals`
  - Envia notificações via `app_notifications`
  - Pausa workflow
- **Lógica real:**
```typescript
const assignedAnalysts = await this.getAssignedAnalysts(supabaseClient, approvalConfig);
await this.createApprovalRecords(supabaseClient, stepExecutionId, assignedAnalysts);
await this.notifyAnalysts(supabaseClient, stepExecutionId, assignedAnalysts);

return { outputData: context, shouldPause: true };
```

**Checklist:**
- ✅ Atribuição de analistas
- ✅ Registros de aprovação
- ✅ Notificações in-app
- ✅ Pausa workflow
- ❌ Notificação por email
- ❌ Timeout para decisão
- ❌ Escalação se não responder
- ❌ Múltiplos níveis de aprovação

**Avaliação:**
```
FUNCIONALIDADE: 8/10 (excelente para MVP!)
MODELO COGNITIVO: 10/10 (CRÍTICO para human-in-the-loop)
CONFIABILIDADE: ✅ Bem implementado
```

---

#### 8. **SIGNATURE NODE** (`signature-executor.ts`)
```typescript
Status: ✅ FUNCIONAL
Linhas: 95
Funcionalidade: 7/10
```

**Análise:**
- **O que faz:**
  - Cria registro em `signature_requests`
  - Modo DEV: auto-complete em 10s
  - Modo PROD: invoca `send-signature-request`
  - Pausa workflow
- **Lógica real:**
```typescript
const { data: signatureRequest } = await supabaseClient
  .from('signature_requests')
  .insert({
    workflow_execution_id: executionId,
    provider: signatureConfig.provider || 'manual',
    signers: signatureConfig.signers || []
  });

if (DEV_MODE) {
  // Simular callback em 10s
} else {
  await supabaseClient.functions.invoke('send-signature-request');
}
```

**Checklist:**
- ✅ Cria signature request
- ✅ Modo DEV para teste
- ✅ Pausa workflow
- ✅ Integração com edge function
- ❌ Validação de signatários
- ❌ Verificação de status assíncrono
- ❌ Timeout configurável

**Avaliação:**
```
FUNCIONALIDADE: 7/10 (bom!)
MODELO COGNITIVO: 6/10 (útil mas não essencial)
CONFIABILIDADE: ✅ Bem implementado
```

---

#### 9. **END NODE** (`end-executor.ts`)
```typescript
Status: ✅ FUNCIONAL
Linhas: 34
Funcionalidade: 10/10
```

**Análise:**
- **O que faz:**
  - Atualiza status do workflow para `completed`
  - Registra timestamp de conclusão
  - Trigger automático sincroniza com inscrição
- **Lógica real:**
```typescript
await supabaseClient
  .from("workflow_executions")
  .update({
    status: "completed",
    completed_at: new Date().toISOString(),
  })
  .eq("id", executionId);

return { outputData: context, shouldContinue: false };
```

**Avaliação:**
```
FUNCIONALIDADE: 10/10 (perfeito!)
MODELO COGNITIVO: N/A (finalização)
CONFIABILIDADE: ✅ Simples e robusto
```

---

### ⚠️ IMPLEMENTADOS PARCIALMENTE

#### 10. **CONDITION NODE** (`condition-executor.ts`)
```typescript
Status: ⚠️ FUNCIONAL MAS LIMITADO
Linhas: 101
Funcionalidade: 5/10
```

**Análise:**
- **O que faz:**
  - Resolve variáveis em expressão
  - Avalia expressão com `Function` constructor
  - Validação básica de caracteres
- **Lógica real:**
```typescript
private safeEval(expression: string): boolean {
  const allowedPattern = /^[\s\d+\-*/%()<=>&|!"'.\w]+$/;
  
  if (!allowedPattern.test(expression)) {
    throw new Error('Expressão contém caracteres não permitidos');
  }
  
  const dangerous = ['eval', 'Function', 'constructor', 'prototype', '__proto__'];
  for (const keyword of dangerous) {
    if (expression.includes(keyword)) {
      throw new Error(`Palavra-chave não permitida: ${keyword}`);
    }
  }
  
  const func = new Function(`return (${expression}) ? true : false;`);
  return func();
}
```

**Checklist:**
- ✅ Resolve variáveis
- ✅ Validação básica de caracteres
- ✅ Blacklist de keywords
- ⚠️ Usa `Function` constructor (não é sandbox real)
- ❌ Sem timeout para expressões
- ❌ Sem parser de AST
- ❌ Não suporta operadores complexos (regex, ranges)
- ❌ Não suporta composição de condições

**Problemas de Segurança:**
```typescript
// ⚠️ ATUAL: Function constructor pode ser explorado
new Function(`return (${expression})`);

// Exemplo de exploit:
expression = "true); console.log('hacked'); return (true"
// Resulta em: return (true); console.log('hacked'); return (true)

// ✅ DEVERIA TER: Parser seguro
import { evaluate } from 'json-logic-js';
const condition = {
  "and": [
    { ">": [{ "var": "score" }, 80] },
    { "in": [{ "var": "role" }, ["admin", "moderator"]] }
  ]
};
```

**Avaliação:**
```
FUNCIONALIDADE: 5/10 (básico mas funciona)
MODELO COGNITIVO: 7/10 (importante para decisões)
SEGURANÇA: 🔴 RISCO MÉDIO - Function constructor não é sandbox real
RECOMENDAÇÃO: Substituir por json-logic-js ou similar
```

---

## ❌ NÃO IMPLEMENTADOS (BLOQUEADORES)

### 1. **LOOP NODE** 🔴
```
Status: ❌ NÃO EXISTE
Impacto: BLOQUEADOR CRÍTICO
Prioridade: P0 (Máxima)
```

**Por que é crítico:**
- Workflows reais processam arrays/listas
- Sem loop = não pode processar múltiplos itens
- Exemplo bloqueado: "Para cada documento, classificar e validar"

**Implementação Necessária:**
```typescript
export class LoopExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<NodeExecutionResult> {
    const { items, subWorkflow } = node.data;
    
    // ❌ PROBLEMA: Orquestrador atual não suporta sub-workflow
    // Precisa de refatoração para execução aninhada
    
    const results = [];
    for (const item of items) {
      const loopContext = { ...context, currentItem: item };
      const result = await this.executeSubWorkflow(subWorkflow, loopContext);
      results.push(result);
    }
    
    return { outputData: { loopResults: results } };
  }
}
```

**Comparação com n8n:**
```typescript
// n8n: Loop Over Items node
{
  type: 'loop',
  items: '{{$json.documents}}', // Array do contexto
  mode: 'sequential', // ou 'parallel'
  maxIterations: 1000
}
```

**Impacto no Modelo Cognitivo:**
```
Caso de Uso: "Analisar sentimento de cada review"
- Input: Array de 100 reviews
- Sem Loop: ❌ Não pode processar
- Com Loop: ✅ Para cada review, chamar LLM e agregar resultados
```

---

### 2. **FUNCTION/CODE NODE** 🔴
```
Status: ❌ NÃO EXISTE
Impacto: BLOQUEADOR CRÍTICO
Prioridade: P0 (Máxima)
```

**Por que é crítico:**
- Transformações customizadas são essenciais
- Parsing de dados complexos
- Lógica de negócio específica

**Implementação Necessária (Segura):**
```typescript
import { VM } from '@jitl/quickjs-wasmtime-sync'; // ou isolated-vm

export class FunctionExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<NodeExecutionResult> {
    const { code, language } = node.data;
    
    // ✅ SANDBOX REAL
    const vm = new VM({
      timeout: 5000, // 5s max
      memoryLimit: 10 * 1024 * 1024, // 10MB
    });
    
    // Whitelist de imports permitidos
    const allowedImports = {
      'date-fns': ['format', 'parse'],
      'lodash': ['get', 'set', 'map', 'filter']
    };
    
    // Executar código em sandbox
    const result = vm.evalCode(`
      const context = ${JSON.stringify(context)};
      ${code}
    `);
    
    return { outputData: result };
  }
}
```

**Comparação com n8n:**
```typescript
// n8n: Code node com sandbox
{
  type: 'code',
  mode: 'runOnceForAllItems',
  code: `
    // Código JavaScript seguro
    const transformed = items.map(item => ({
      ...item,
      fullName: item.firstName + ' ' + item.lastName
    }));
    return transformed;
  `
}
```

**Impacto no Modelo Cognitivo:**
```
Caso de Uso: "Parsear resposta JSON e extrair campos específicos"
- Sem Function: ❌ Não pode fazer transformações complexas
- Com Function: ✅ Código customizado para qualquer lógica
```

---

### 3. **LLM/AI NODE** 🔴
```
Status: ❌ NÃO EXISTE
Impacto: BLOQUEADOR CRÍTICO (para workflow "cognitivo")
Prioridade: P0 (Máxima)
```

**Por que é crítico:**
- Sem LLM = não é workflow "cognitivo"
- IA é o diferencial do sistema
- Casos de uso: classificação, extração, análise de sentimento

**Implementação Necessária:**
```typescript
export class LLMExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<NodeExecutionResult> {
    const { model, prompt, temperature, maxTokens, outputSchema } = node.data;
    
    // Interpolar variáveis no prompt
    const fullPrompt = this.interpolatePrompt(prompt, context);
    
    // Chamar API (OpenAI, Anthropic, Gemini)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: fullPrompt }
        ],
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 1000
      })
    });
    
    const data = await response.json();
    const llmResponse = data.choices[0].message.content;
    
    // Parsear JSON se outputSchema definido
    let parsed = llmResponse;
    if (outputSchema) {
      try {
        parsed = JSON.parse(llmResponse);
      } catch (e) {
        console.error('[LLM] Falha ao parsear JSON:', e);
      }
    }
    
    return { outputData: { llmResponse: parsed } };
  }
  
  private interpolatePrompt(template: string, context: ExecutionContext): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      // Resolver variável do contexto
    });
  }
}
```

**Comparação com n8n:**
```typescript
// n8n: OpenAI node
{
  type: 'openai',
  operation: 'chat',
  model: 'gpt-4o',
  prompt: 'Classifique o texto: {{$json.text}}',
  temperature: 0.7,
  responseFormat: 'json_object'
}
```

**Impacto no Modelo Cognitivo:**
```
Caso de Uso: "Analisar currículo e extrair habilidades"
- Sem LLM: ❌ Não é workflow cognitivo
- Com LLM: ✅ Extração inteligente de dados não estruturados
```

---

### 4. **DELAY/WAIT NODE** ⚠️
```
Status: ❌ NÃO EXISTE
Impacto: Importante (não bloqueador)
Prioridade: P2 (Média)
```

**Por que é útil:**
- Rate limiting de APIs
- Aguardar processamento externo
- Throttling de requisições

**Problema Técnico:**
- Edge Functions têm timeout de 60s
- Não pode usar `setTimeout` para delays longos

**Implementação Necessária (com pg_cron):**
```typescript
export class DelayExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<NodeExecutionResult> {
    const { duration, unit } = node.data; // ex: 5, 'minutes'
    
    const resumeAt = new Date(Date.now() + this.parseDuration(duration, unit));
    
    // Salvar checkpoint com resumeAt
    await checkpointManager.saveCheckpoint(
      executionId,
      nodeId,
      NodeStatus.PAUSED,
      context,
      { resumeAt: resumeAt.toISOString() }
    );
    
    // Agendar retomada com pg_cron
    await supabaseClient.rpc('schedule_workflow_resume', {
      execution_id: executionId,
      node_id: nodeId,
      resume_at: resumeAt.toISOString()
    });
    
    return { shouldPause: true, pauseReason: 'delayed' };
  }
}
```

**Avaliação:**
```
FUNCIONALIDADE: 0/10 (não implementado)
MODELO COGNITIVO: 5/10 (útil mas não essencial)
PRIORIDADE: P2 (pode esperar)
```

---

## 📊 COMPARAÇÃO COM ENGINES PROFISSIONAIS

### n8n vs Atual

| Funcionalidade | n8n | Atual | Gap |
|----------------|-----|-------|-----|
| HTTP Request | ✅ Retry, auth, timeout | ⚠️ Básico | Retry, auth |
| Conditional | ✅ Parser seguro | ⚠️ Function() | Parser |
| Loop | ✅ Sequential/Parallel | ❌ Não existe | **BLOQUEADOR** |
| Code | ✅ Sandbox seguro | ❌ Não existe | **BLOQUEADOR** |
| LLM | ✅ OpenAI, Anthropic | ❌ Não existe | **BLOQUEADOR** |
| Database | ✅ CRUD + Select | ⚠️ Sem Select | SELECT |
| Email | ✅ Templates, anexos | ⚠️ Básico | Templates |
| Approval | ✅ Multiníveis | ✅ Básico | Níveis |

**Score Total:**
```
n8n:   95/100
Atual: 65/100
Gap:   30 pontos
```

---

## 🎯 MATRIZ DE PRIORIZAÇÃO

### Bloqueadores Críticos (P0)
```
1. LOOP NODE
   Impacto: ████████████ 100%
   Esforço: ████████░░░░  80% (requer refatoração do orquestrador)
   
2. FUNCTION NODE
   Impacto: ███████████░  90%
   Esforço: ██████░░░░░░  60% (sandbox com QuickJS)
   
3. LLM NODE
   Impacto: ████████████ 100% (para workflow cognitivo)
   Esforço: ████░░░░░░░░  40% (apenas integração API)
```

### Melhorias Importantes (P1)
```
4. CONDITION PARSER SEGURO
   Impacto: ███████░░░░░  70%
   Esforço: ██████░░░░░░  60% (json-logic-js)
   
5. HTTP RETRY + AUTH
   Impacto: ████████░░░░  80%
   Esforço: ████░░░░░░░░  40%
   
6. DATABASE SELECT + SEGURANÇA
   Impacto: ████████░░░░  80%
   Esforço: ███░░░░░░░░░  30%
```

### Nice-to-Have (P2)
```
7. DELAY NODE
   Impacto: ████░░░░░░░░  40%
   Esforço: ████████░░░░  80% (requer pg_cron)
   
8. EMAIL TEMPLATES
   Impacto: ████░░░░░░░░  40%
   Esforço: ████░░░░░░░░  40%
```

---

## 🚨 VULNERABILIDADES IDENTIFICADAS

### 1. CONDITION NODE - RCE via Function Constructor
```
Severidade: 🔴 MÉDIA
Exploração: FÁCIL
```

**Vulnerabilidade:**
```typescript
// Código atual
const func = new Function(`return (${expression})`);

// Exploit possível
expression = "true); console.log(Deno.env.get('SECRET_KEY')); return (true"
// Resultado: vazamento de secrets
```

**Remediação:**
```typescript
// Substituir por json-logic-js
import { evaluate } from 'json-logic-js';

const condition = {
  "and": [
    { ">": [{ "var": "score" }, 80] },
    { "===": [{ "var": "status" }, "active"] }
  ]
};

const result = evaluate(condition, context);
```

---

### 2. DATABASE NODE - SQL Injection Potencial
```
Severidade: 🔴 MÉDIA
Exploração: MÉDIA
```

**Vulnerabilidade:**
```typescript
// Código atual
if (conditions) {
  for (const [condKey, condValue] of Object.entries(conditions)) {
    updateQuery = updateQuery.eq(condKey, condValue);
  }
}

// Se condValue vier de input não sanitizado:
conditions = { "id": "1 OR 1=1" }
```

**Remediação:**
```typescript
// Validar condições com zod
const conditionSchema = z.object({
  field: z.string().regex(/^[a-z_]+$/),
  operator: z.enum(['eq', 'neq', 'gt', 'lt']),
  value: z.union([z.string(), z.number(), z.boolean()])
});

const validated = conditionSchema.parse(condition);
```

---

## ✅ PLANO DE AÇÃO RECOMENDADO

### FASE 1: Eliminar Bloqueadores (2-3 semanas)

#### Sprint 1 (1 semana) - LLM Node
```
Dia 1-2: Integração OpenAI API
- Configurar OPENAI_API_KEY
- Implementar chamada básica
- Testes com gpt-4o-mini

Dia 3-4: Interpolação de prompts
- Resolver variáveis {context.path}
- Suporte a system message
- Parsing de JSON response

Dia 5: Testes e documentação
- Casos de uso: classificação, extração, análise
- Métricas de custo
- Documentação de uso
```

#### Sprint 2 (1 semana) - Function Node
```
Dia 1-2: Setup de sandbox
- Integrar QuickJS WASM
- Definir whitelist de imports
- Configurar timeout e memory limit

Dia 3-4: API de execução
- Passar contexto para sandbox
- Capturar resultado
- Tratamento de erro

Dia 5: Testes de segurança
- Tentar bypass do sandbox
- Performance com código pesado
- Documentação de limitações
```

#### Sprint 3 (1 semana) - Loop Node
```
Dia 1-3: Refatoração do orquestrador
- Suporte a execução aninhada
- Gestão de contexto por iteração
- Checkpoint por item do loop

Dia 4-5: Implementação do executor
- Modo sequential
- Agregação de resultados
- Testes com arrays grandes (100+ itens)
```

---

### FASE 2: Melhorias de Segurança (1 semana)

#### Sprint 4 - Segurança
```
Dia 1-2: Substituir CONDITION por json-logic-js
- Remover Function constructor
- Implementar parser seguro
- Migrar expressões existentes

Dia 3-4: Melhorar DATABASE node
- Adicionar SELECT operation
- Validação de condições com zod
- Testes de SQL injection

Dia 5: Auditoria de segurança
- Revisar todos os executors
- Scan de vulnerabilidades
- Documentação de melhores práticas
```

---

### FASE 3: Melhorias de Confiabilidade (1 semana)

#### Sprint 5 - Retry e Resilience
```
Dia 1-2: HTTP Retry Strategy
- Implementar exponential backoff
- Retry apenas em erros 5xx e network
- Configurável por nó

Dia 3-4: EMAIL Retry
- Retry em falha de envio
- Dead letter queue
- Alertas para falhas recorrentes

Dia 5: Testes de resiliência
- Simular falhas de rede
- Validar retry automático
- Métricas de taxa de sucesso
```

---

## 📈 MÉTRICAS DE SUCESSO

### Antes da Implementação
```
✅ Funcionalidade:    65/100
⚠️ Segurança:         60/100
❌ Modelo Cognitivo:  40/100
```

### Após FASE 1 (Bloqueadores)
```
✅ Funcionalidade:    85/100 (+20)
⚠️ Segurança:         60/100 (=)
✅ Modelo Cognitivo:  90/100 (+50) 🎯
```

### Após FASE 2 (Segurança)
```
✅ Funcionalidade:    90/100 (+5)
✅ Segurança:         95/100 (+35) 🎯
✅ Modelo Cognitivo:  90/100 (=)
```

### Após FASE 3 (Confiabilidade)
```
✅ Funcionalidade:    95/100 (+5) 🎯
✅ Segurança:         95/100 (=)
✅ Modelo Cognitivo:  90/100 (=)
```

---

## 🎓 LIÇÕES APRENDIDAS

### O Que Está Funcionando Bem
1. ✅ **Arquitetura modular** - Executors isolados facilitam manutenção
2. ✅ **Pause/Resume** - Approval e Signature nodes funcionam bem
3. ✅ **Logging estruturado** - Fácil debugging
4. ✅ **Integração com Supabase** - Edge functions bem utilizadas

### O Que Precisa Melhorar
1. ❌ **Falta de nós essenciais** - Loop, Function, LLM
2. ⚠️ **Segurança** - Function constructor e condições não validadas
3. ⚠️ **Confiabilidade** - Sem retry em HTTP e Email
4. ⚠️ **Observabilidade** - Falta métricas de performance

---

## 📞 PRÓXIMOS PASSOS

### Decisão Imediata Necessária
```
❓ QUESTÃO: Priorizar qual fase primeiro?

OPÇÃO A: FASE 1 (Bloqueadores)
  ✅ Desbloqueia workflows cognitivos
  ✅ Maior impacto no produto
  ⚠️ Mantém vulnerabilidades por 3 semanas

OPÇÃO B: FASE 2 (Segurança)
  ✅ Elimina riscos de segurança
  ⚠️ Workflows cognitivos ainda bloqueados
  ⚠️ Menor impacto no negócio

RECOMENDAÇÃO: FASE 1 → FASE 2 → FASE 3
Razão: Funcionalidade desbloqueia valor, segurança pode ser mitigada com validação de input
```

---

## 📚 ANEXOS

### A. Comparação de Sandboxes para Function Node

| Solução | Segurança | Performance | Facilidade |
|---------|-----------|-------------|------------|
| **QuickJS** | ✅✅✅ | ✅✅✅ | ✅✅ |
| **isolated-vm** | ✅✅✅ | ✅✅ | ✅ |
| **VM2** | ✅✅ | ✅✅✅ | ✅✅✅ |
| **Function()** | ❌ | ✅✅✅ | ✅✅✅ |

**Recomendação:** QuickJS WASM (melhor balanço)

---

### B. Bibliotecas Recomendadas

```typescript
// Condition Node
import { evaluate } from 'json-logic-js';

// Function Node
import { QuickJS } from '@jitl/quickjs-wasmtime-sync';

// LLM Node
import OpenAI from 'openai';

// HTTP Retry
import { retry } from 'ts-retry-promise';
```

---

**Documento gerado em:** 2025-10-08  
**Versão:** 1.0  
**Próxima revisão:** Após implementação da FASE 1
