# Orquestrador Cognitivo de Workflow

Sistema de orquestração baseado em grafos para execução de workflows complexos com suporte a paralelismo, condicionais e estratégias de junção.

## Arquitetura

O orquestrador é composto por 6 componentes principais:

### 1. Graph Builder (Fase 1)
Constrói grafo de dependências em memória a partir de nós e arestas.

**Características:**
- Ordenação topológica automática
- Detecção de ciclos
- Identificação de grupos paralelos
- Cálculo de caminho crítico
- Validação de dependências

**Uso:**
```typescript
const graphBuilder = new GraphBuilder();
const graph = graphBuilder.build(nodes, edges);

console.log('Caminho crítico:', graph.criticalPath);
console.log('Grupos paralelos:', graph.parallelGroups);
```

### 2. Context Manager (Fase 2)
Gerencia contexto global e local dos nós com suporte a variáveis.

**Características:**
- Contexto global compartilhado
- Contexto local por nó (namespacing)
- Resolução de variáveis `{context.path}` e `{node.id.field}`
- Snapshots para rollback
- Histórico de mudanças

**Uso:**
```typescript
const context = new ContextManager({ userId: '123' });

// Global
context.setGlobal('status', 'approved');

// Local
context.setNodeContext('form1', 'email', 'user@example.com');

// Resolução
const text = context.resolve('Olá {context.userName}!');

// Snapshot
context.createSnapshot('form1');
```

### 3. Execution Scheduler (Fase 3)
Escalonador de execução com controle de paralelismo.

**Características:**
- Filas de estado (ready, running, waiting, paused, completed, failed)
- Controle de paralelismo (maxParallelNodes)
- Verificação de dependências prontas
- Cálculo de progresso

**Uso:**
```typescript
const config = { maxParallelNodes: 3 };
const scheduler = new ExecutionScheduler(config);

scheduler.initialize(graph);
const nextNodes = scheduler.getNextNodes(graph);

for (const nodeId of nextNodes) {
  scheduler.startNode(nodeId);
  // ... executar nó
  scheduler.completeNode(nodeId);
}
```

### 4. State Tracker (Fase 4)
Rastreamento detalhado de estado dos nós.

**Características:**
- Estados expandidos (pending, ready, running, paused, completed, failed, skipped, blocked)
- Histórico de transições
- Progresso por nó (0-100%)
- Persistência automática no banco
- Cálculo de duração

**Uso:**
```typescript
const stateTracker = new StateTracker(supabaseClient);

stateTracker.initializeNode('node1', 'form');
stateTracker.transition('node1', 'running');
stateTracker.updateProgress('node1', 50);
stateTracker.transition('node1', 'completed');

const state = stateTracker.getState('node1');
console.log('Transições:', state.transitions);
```

### 5. Conditional Navigator (Fase 5)
Navegação condicional e estratégias de junção.

**Características:**
- Avaliação de expressões condicionais
- Suporte a múltiplas saídas por nó
- Priorização de condições
- Estratégias de junção (wait_all, wait_any, first_complete)
- Timeout configurável

**Uso:**
```typescript
// Navegação condicional
const navigator = new ConditionalNavigator(contextManager);
const nextNodes = navigator.evaluateConditionals(edges, 'approval');

// Join strategies
const joinHandler = new JoinStrategyHandler(stateTracker);
const isReady = joinHandler.isJoinReady(joinNode, completedNodes);
```

### 6. Workflow Orchestrator (Integração)
Orquestrador principal que integra todos os componentes.

**Uso:**
```typescript
const config = {
  maxParallelNodes: 3,
  enableConditionals: true,
  enableJoinStrategies: true,
  debug: true
};

const orchestrator = new WorkflowOrchestrator(supabaseClient, config);

await orchestrator.initialize(nodes, edges, inputData);
const success = await orchestrator.execute(executionId);

console.log('Progresso:', orchestrator.getProgress());
console.log('Estados:', orchestrator.getStates());
```

## Tipos de Nós Suportados

### Nós Básicos
- `start`: Nó de entrada
- `end`: Nó de saída
- `form`: Formulário com campos
- `approval`: Aprovação manual
- `email`: Envio de email
- `webhook`: Chamada HTTP
- `database`: Operação no banco
- `signature`: Assinatura digital
- `ocr`: Processamento OCR

### Nós Especiais
- **Condition**: Bifurcação condicional com múltiplas saídas
- **Join**: Ponto de junção com estratégias (wait_all, wait_any, first_complete)

## Configuração de Nós

### Nó Condicional
```typescript
{
  id: 'decision1',
  type: 'condition',
  data: {
    label: 'Decisão de Aprovação'
  }
}

// Arestas condicionais
{
  id: 'e1',
  source: 'decision1',
  target: 'approved',
  condition: '{context.score} > 80',
  priority: 1
}
{
  id: 'e2',
  source: 'decision1',
  target: 'rejected',
  condition: '{context.score} <= 80',
  priority: 0
}
```

### Nó de Junção
```typescript
{
  id: 'join1',
  type: 'join',
  data: {
    label: 'Aguardar Aprovações',
    joinConfig: {
      strategy: 'wait_all', // wait_all | wait_any | first_complete
      timeout: 300000, // 5 minutos
      onTimeout: 'fail' // fail | continue
    }
  }
}
```

## API de Estado (workflow-state)

Consulta estado do workflow em tempo real:

```bash
POST /workflow-state
{
  "executionId": "uuid",
  "includeTransitions": true,
  "includeContext": true
}
```

**Resposta:**
```json
{
  "executionId": "uuid",
  "workflowId": "uuid",
  "status": "running",
  "currentNode": "approval1",
  "stats": {
    "totalNodes": 10,
    "pending": 2,
    "running": 1,
    "completed": 7,
    "progress": 70
  },
  "nodes": [
    {
      "nodeId": "form1",
      "status": "completed",
      "progress": 100,
      "transitions": [...]
    }
  ]
}
```

## Expressões Condicionais

Suportadas:
- Comparações: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Lógicos: `&&`, `||`, `!`
- Aritméticos: `+`, `-`, `*`, `/`, `%`
- Variáveis: `{context.field}`, `{node.id.field}`

**Exemplos:**
```javascript
"{context.status} === 'approved'"
"{context.score} >= 70 && {context.verificado} === true"
"{node.form1.idade} >= 18"
"({context.prioridade} === 'alta') || ({context.urgente} === true)"
```

## Paralelismo

Controle via `maxParallelNodes`:
- `1`: Execução sequencial (padrão)
- `3`: Até 3 nós em paralelo
- `Infinity`: Paralelismo ilimitado

## Estados dos Nós

| Estado | Descrição |
|--------|-----------|
| pending | Aguardando dependências |
| ready | Pronto para executar |
| running | Em execução |
| paused | Pausado (aguardando input) |
| completed | Concluído com sucesso |
| failed | Falhou |
| skipped | Pulado (condição não atendida) |
| blocked | Bloqueado por dependência falhada |

## Retomada de Workflow

Retomar workflow pausado:
```typescript
await orchestrator.resumeNode(nodeId, {
  formData: { ... },
  decision: 'approved'
});
```

## Debug

Todos os componentes têm método `debug()`:
```typescript
orchestrator.debug();
// Imprime: estados, fila, contexto, transições
```

## Migração Incremental

O orquestrador coexiste com o executor atual via feature flag:
```typescript
const USE_ORCHESTRATOR = Deno.env.get('USE_ORCHESTRATOR') === 'true';

if (USE_ORCHESTRATOR) {
  // Usar orquestrador cognitivo
  const orchestrator = new WorkflowOrchestrator(supabaseClient);
  await orchestrator.initialize(nodes, edges, inputData);
  await orchestrator.execute(executionId);
} else {
  // Usar executor recursivo atual
  await executeWorkflowSteps(...);
}
```

## Testes

Cada componente pode ser testado isoladamente:
```typescript
// Teste do GraphBuilder
const graph = graphBuilder.build(testNodes, testEdges);
assert(graph.nodes.size === testNodes.length);

// Teste do ContextManager
context.setGlobal('x', 10);
assert(context.resolve('{context.x}') === '10');

// Teste do Scheduler
scheduler.initialize(graph);
const next = scheduler.getNextNodes(graph);
assert(next.length <= config.maxParallelNodes);
```

## Performance

- **Graph Build**: O(N + E) onde N = nós, E = arestas
- **Topological Sort**: O(N + E)
- **Cycle Detection**: O(N + E)
- **Context Resolve**: O(1) para acesso direto, O(K) para resolução de K variáveis
- **Scheduler Next**: O(W) onde W = nós em waiting

## Limitações Atuais

1. Expressões condicionais limitadas (sem funções customizadas)
2. Persistência de contexto apenas via snapshots
3. Timeouts globais (não por nó)
4. Sem rollback automático em falhas
5. Paralelismo limitado por memória

## Migração de `execute-workflow` para `execute-workflow-v2`

### Feature Flag Incremental

A migração usa feature flag por edital para ativação gradual:

```sql
-- Habilitar v2 para edital específico
UPDATE editais 
SET use_orchestrator_v2 = true 
WHERE id = 'uuid-do-edital';
```

O worker `process-workflow-queue` detecta automaticamente:
- Se `use_orchestrator_v2 = true` → invoca `execute-workflow-v2`
- Caso contrário → invoca `execute-workflow` (legado)

**Fallback automático:** Se v2 falhar, worker tenta v1 como backup.

### Benefícios do v2

1. **Paralelismo**: Executa até 3 nós simultaneamente (configurável)
2. **Condicionais**: Avalia expressões JavaScript nas arestas
3. **Join Strategies**: Aguarda múltiplos nós (wait_all, wait_any, first_complete)
4. **State Tracking**: Transições detalhadas com histórico
5. **Monitoramento**: Dashboard com grafo visual em tempo real

### Quando Usar v2

✅ **Use v2 se o workflow tem:**
- Nós paralelos (ex: validar CPF + CRM + CNPJ ao mesmo tempo)
- Condicionais (ex: "Se aprovado → email positivo, senão → email negativo")
- Aprovações múltiplas (ex: "aguardar 2 de 3 gestores")
- >10 nós

❌ **Mantenha v1 se:**
- Workflow simples linear (start → form → email → end)
- Sem condicionais ou paralelismo
- Performance não é crítica

### Recursos Adicionais

- **Guia Completo**: `/MIGRATION_GUIDE.md` (raiz do projeto)
- **Troubleshooting**: `/docs/WORKFLOW_TROUBLESHOOTING.md`
- **Testes E2E**: `__tests__/e2e.test.ts` (5 cenários)
- **Dashboard**: `/workflow-monitoring` → Tab "Grafo"

---

## Roadmap

**Concluído (Sprint 1-4):**
- ✅ Orquestrador cognitivo completo
- ✅ Paralelismo, condicionais, join strategies
- ✅ Dashboard com grafo visual
- ✅ Testes E2E (5 cenários)
- ✅ Documentação completa

**Próximas Fases:**
- [ ] Sub-workflows aninhados
- [ ] Loops e iterações (foreach)
- [ ] Eventos externos (webhooks in)
- [ ] Rollback automático em falhas
- [ ] Dashboard com métricas de performance (latência, throughput)
- [ ] Versionamento de workflows (A/B testing)
