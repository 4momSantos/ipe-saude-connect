# 🎯 Orchestrator V2 - Guia Rápido

## 🚀 Como Ativar

### Opção 1: Via Supabase Dashboard
```
1. Acesse: https://supabase.com/dashboard/project/ncmofeencqpqhtguxmvy
2. Edge Functions > Secrets
3. ADD SECRET:
   - Name: USE_ORCHESTRATOR_V2
   - Value: true
4. Clique em "Add"
```

### Opção 2: Via Supabase CLI
```bash
supabase secrets set USE_ORCHESTRATOR_V2=true
```

## 🔄 Como Desativar (Rollback)

### Via Dashboard
```
1. Edge Functions > Secrets
2. Encontre: USE_ORCHESTRATOR_V2
3. Clique em "Delete"
```

### Via CLI
```bash
supabase secrets unset USE_ORCHESTRATOR_V2
```

## 📊 Como Monitorar

### Verificar qual versão está ativa
```sql
SELECT 
  event_message,
  timestamp
FROM edge_logs
WHERE function_id = (
  SELECT id FROM edge_functions WHERE name = 'execute-workflow'
)
  AND event_message LIKE '%Usando Orchestrator%'
ORDER BY timestamp DESC
LIMIT 5;
```

### Métricas de Performance V2
```sql
-- Taxa de sucesso
SELECT 
  status,
  COUNT(*) as total,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM workflow_executions
WHERE started_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- Performance de checkpoints
SELECT 
  node_type,
  AVG((metadata->>'duration_ms')::numeric) as avg_checkpoint_ms,
  MAX((metadata->>'duration_ms')::numeric) as max_checkpoint_ms
FROM workflow_checkpoints
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY node_type;

-- Taxa de retry bem-sucedido
SELECT 
  retry_count,
  COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
FROM workflow_metrics
WHERE recorded_at > NOW() - INTERVAL '1 hour'
GROUP BY retry_count
ORDER BY retry_count;
```

## 🐛 Troubleshooting

### Problema: Workflow não inicia
```sql
-- Verificar logs de erro
SELECT 
  event_message,
  timestamp
FROM edge_logs
WHERE function_id = (SELECT id FROM edge_functions WHERE name = 'execute-workflow')
  AND (event_message LIKE '%ERROR%' OR event_message LIKE '%ERRO%')
  AND timestamp > NOW() - INTERVAL '10 minutes'
ORDER BY timestamp DESC;
```

### Problema: Checkpoint muito lento
```sql
-- Identificar checkpoints lentos
SELECT 
  execution_id,
  node_id,
  (metadata->>'duration_ms')::numeric as duration_ms,
  created_at
FROM workflow_checkpoints
WHERE (metadata->>'duration_ms')::numeric > 100
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY duration_ms DESC
LIMIT 10;
```

### Problema: Workflow travado
```sql
-- Workflows em execução há muito tempo
SELECT 
  we.id,
  we.workflow_id,
  we.current_node_id,
  we.started_at,
  NOW() - we.started_at as duration,
  (
    SELECT COUNT(*) 
    FROM workflow_step_executions wse 
    WHERE wse.execution_id = we.id
  ) as completed_steps
FROM workflow_executions we
WHERE we.status = 'running'
  AND we.started_at < NOW() - INTERVAL '10 minutes'
ORDER BY duration DESC;
```

## 📈 Comparação V1 vs V2

### Checkpoints
- **V1**: Não possui
- **V2**: ✅ Checkpoints síncronos com versionamento

### State Machine
- **V1**: Estados não validados
- **V2**: ✅ Transições rigorosamente validadas

### Retry
- **V1**: Manual
- **V2**: ✅ Automático com backoff exponencial

### Event Sourcing
- **V1**: Logs básicos
- **V2**: ✅ Todos eventos persistidos em `workflow_events`

### Isolamento
- **V1**: Contexto compartilhado
- **V2**: ✅ Contexto único por `executionId`

### Resume
- **V1**: Pode duplicar steps
- **V2**: ✅ Idempotente (não duplica)

## 🎓 Documentação Completa

Consulte `ORCHESTRATOR_V2_ROLLOUT.md` para:
- Cronograma de rollout detalhado (4 semanas)
- Arquitetura completa do V2
- Critérios de sucesso e rollback
- Queries SQL de monitoramento avançado
- Troubleshooting detalhado

## 📞 Suporte

Em caso de problemas:
1. Verificar logs no dashboard do Supabase
2. Consultar métricas SQL acima
3. Desativar V2 se necessário (rollback seguro)
4. Reportar issue com logs anexados

---

**Versão**: 1.0.0  
**Data**: 2025-01-08  
**Status**: ✅ Pronto para rollout
