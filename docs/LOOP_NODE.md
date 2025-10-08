# 🔁 Loop Node - Documentação

## Visão Geral

O **Loop Node** permite processar arrays de dados iterativamente, executando um sub-workflow para cada item. É essencial para operações em massa, processamento de listas, e automações que precisam repetir ações para múltiplos elementos.

## 🎯 Casos de Uso

### 1. Envio de Emails em Massa
- Buscar lista de usuários do banco
- Enviar email personalizado para cada um
- Registrar envios e falhas

### 2. Processamento de Documentos
- Validar múltiplos documentos de uma inscrição
- Executar OCR em cada arquivo
- Compilar resultados de validação

### 3. Operações em Banco de Dados
- Atualizar múltiplos registros
- Executar cálculos para cada item
- Criar registros relacionados em batch

### 4. Integrações com APIs
- Buscar dados de API externa para cada item
- Enviar webhooks para múltiplos endpoints
- Sincronizar dados com sistemas externos

## ⚙️ Configuração

### Campos Obrigatórios

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Array de Items** | Expressão que resolve para array | `{{http_response.data.users}}` |
| **Nome da Variável** | Variável que representa o item atual | `currentItem` |
| **Modo de Execução** | Sequential ou Parallel | `sequential` |
| **Continuar em Erro** | Se deve continuar quando uma iteração falha | `true` |

### Campos Opcionais

| Campo | Descrição | Default | Recomendação |
|-------|-----------|---------|--------------|
| **Índice** | Nome da variável do índice | `index` | - |
| **Max Concurrency** | Execuções simultâneas (parallel) | `5` | 5-10 |
| **Timeout** | Timeout por iteração (ms) | `30000` | 30000-60000 |
| **Checkpoint Every** | Checkpoint a cada N iterações | `100` | 50-200 |
| **Loop Body** | Nós do sub-workflow | - | Obrigatório para sub-workflows |

## 🔄 Modos de Execução

### Sequential (Padrão)
```
Item 1 → Processa → Item 2 → Processa → Item 3 → Processa
```

**Vantagens:**
- Garante ordem de execução
- Menor uso de recursos
- Mais fácil de debugar

**Quando usar:**
- Operações que dependem de ordem
- Arrays pequenos (<100 items)
- Recursos limitados

### Parallel
```
Item 1 → Processa ┐
Item 2 → Processa ├→ Aguarda todos completarem
Item 3 → Processa ┘
```

**Vantagens:**
- Muito mais rápido
- Aproveita melhor recursos
- Ideal para operações independentes

**Quando usar:**
- Arrays grandes (>100 items)
- Operações independentes
- APIs com rate limit alto

## 💡 Variáveis Disponíveis

Dentro do loop, você tem acesso a:

```javascript
{{currentItem}}      // O item atual sendo processado
{{index}}            // Índice do item (0-based)
{{currentItem.nome}} // Acessar propriedades do item
```

### Exemplo de Uso
```
Email: {{currentItem.email}}
Nome: {{currentItem.nome}}
Iteração: {{index}} de {{items.length}}
```

## 📋 Exemplos Práticos

### Exemplo 1: Enviar Email para Lista de Usuários

**Workflow:**
```
1. [Database] Buscar usuários ativos
   → SELECT * FROM users WHERE active = true

2. [Loop] Para cada usuário
   - Items: {{database_output.rows}}
   - Mode: parallel
   - Max Concurrency: 10
   
3. [Email] Enviar email (dentro do loop)
   - To: {{currentItem.email}}
   - Subject: Olá {{currentItem.nome}}!
   - Body: Bem-vindo ao sistema...
```

### Exemplo 2: Validar Documentos em Batch

**Workflow:**
```
1. [Start] Trigger com dados da inscrição

2. [Loop] Para cada documento
   - Items: {{inscricao.documentos}}
   - Mode: sequential
   - Continue on Error: false
   
3. [HTTP] Validar documento (dentro do loop)
   - URL: https://api.validator.com/check
   - Method: POST
   - Body: {"doc": "{{currentItem.url}}"}
   
4. [Condition] Verificar resultado
   - If: {{http_output.valid}} === false
   - Then: Rejeitar inscrição
```

### Exemplo 3: Criar Registros Relacionados

**Workflow:**
```
1. [Database] Buscar especialidades do edital
   
2. [Loop] Para cada especialidade
   - Items: {{database_output.rows}}
   - Mode: sequential
   
3. [Database] Criar vaga (dentro do loop)
   - Operation: INSERT
   - Table: vagas
   - Fields:
     - edital_id: {{edital.id}}
     - especialidade_id: {{currentItem.id}}
     - quantidade: {{currentItem.vagas}}
```

## 🔍 Checkpoint e Resume

O Loop Node salva checkpoints automáticos durante a execução. Isso permite:

### Quando ocorre checkpoint?
- A cada N iterações (configurável via `checkpointEvery`)
- Exemplo: A cada 100 items processados

### Benefícios:
- ✅ Retoma do ponto exato se falhar
- ✅ Não duplica processamento
- ✅ Ideal para arrays muito grandes

### Como funciona?
```
Processando 1000 items com checkpointEvery=100:

0-100    → Checkpoint 1
100-200  → Checkpoint 2
200-300  → Checkpoint 3
[FALHA]  → Sistema salva estado
[RETRY]  → Retoma do item 300
```

## ⚠️ Tratamento de Erros

### Continue on Error = true (Padrão)
```
Item 1 ✓
Item 2 ✗ (erro)
Item 3 ✓  ← Continua executando
Item 4 ✓

Resultado: 3 sucessos, 1 falha
```

### Continue on Error = false
```
Item 1 ✓
Item 2 ✗ (erro)
STOP ← Para imediatamente

Resultado: Loop falhou
```

## 📊 Output do Loop

O Loop Node retorna estatísticas detalhadas:

```typescript
{
  results: [/* outputs de cada iteração */],
  successResults: [
    { index: 0, item: {...}, output: {...} },
    { index: 2, item: {...}, output: {...} }
  ],
  errors: [
    { index: 1, item: {...}, error: "Timeout" }
  ],
  stats: {
    successCount: 2,
    failureCount: 1,
    totalTime: 5432,
    avgTime: 1810,
    minTime: 1234,
    maxTime: 2567,
    p95Time: 2450
  },
  metrics: [/* métricas por iteração */]
}
```

## 🎯 Boas Práticas

### ✅ Fazer
- Use **parallel** para arrays grandes (>100 items)
- Configure **checkpointEvery** adequadamente
- Use **continueOnError: true** para operações não-críticas
- Monitore métricas de performance
- Teste com arrays pequenos primeiro

### ❌ Evitar
- Loops infinitos (sempre validar array)
- Timeout muito baixo (<5000ms)
- maxConcurrency muito alto (>20)
- Operações de banco sem transação
- Processar arrays gigantes (>10000) de uma vez

## 🔧 Troubleshooting

### Loop não executa
**Problema:** Loop não inicia
**Soluções:**
- Verificar se `items` é um array válido
- Confirmar que expressão `{{...}}` resolve corretamente
- Checar logs de execução

### Performance degradada
**Problema:** Loop muito lento
**Soluções:**
- Usar modo `parallel` em vez de `sequential`
- Reduzir `maxConcurrency` (pode estar sobrecarregando)
- Aumentar `checkpointEvery` (menos checkpoints)
- Dividir array em chunks menores

### Memória insuficiente
**Problema:** Erro de memória
**Soluções:**
- Usar modo `sequential`
- Processar em batches menores
- Limitar dados retornados por iteração
- Aumentar intervalo de checkpoints

### Falhas intermitentes
**Problema:** Algumas iterações falham randomicamente
**Soluções:**
- Aumentar `iterationTimeout`
- Habilitar `continueOnError: true`
- Verificar rate limits de APIs externas
- Implementar retry logic nos nós internos

## 📚 Recursos Adicionais

- [Workflow Editor Guide](./WORKFLOW_EDITOR.md)
- [Orchestrator V2 Documentation](../supabase/functions/execute-workflow/orchestrator/README.md)
- [Checkpoint System](../supabase/functions/execute-workflow/orchestrator/checkpoint-manager.ts)

## 🆘 Suporte

Problemas? Abra uma issue ou consulte a equipe de desenvolvimento.
