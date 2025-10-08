# 🚀 Plano de Rollout - Orchestrator V2

## 📋 Resumo Executivo

Este documento detalha o plano de migração gradual do motor de workflow de **V1 (atual)** para **V2 (enterprise-grade)** através de feature flag, garantindo zero downtime e rollback imediato em caso de problemas.

## 🎯 Objetivos do V2

1. **State Machine Segura**: Transições validadas, sem estados inconsistentes
2. **Checkpoints Confiáveis**: Persistência síncrona com versionamento
3. **Isolamento Total**: Contextos únicos por `executionId`
4. **Event Sourcing**: Rastreabilidade completa de eventos
5. **Retry Inteligente**: Backoff exponencial automático
6. **Resume Idempotente**: Não duplica steps ao retomar

## 🏗️ Arquitetura V2

```
┌─────────────────────────────────────────────────────────────┐
│                    execute-workflow/index.ts                 │
│                    (Feature Flag Controller)                 │
└──────────────────┬──────────────────────┬───────────────────┘
                   │                      │
         ┌─────────▼──────────┐  ┌────────▼──────────┐
         │   Orchestrator V1   │  │  Orchestrator V2  │
         │   (Manter ativo)    │  │   (Nova Engine)   │
         └─────────────────────┘  └──────┬────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────┐
              │                          │                       │
    ┌─────────▼─────────┐  ┌─────────────▼──────────┐  ┌───────▼─────────┐
    │  State Machine    │  │  Checkpoint Manager    │  │ Retry Strategy  │
    │  (Transições)     │  │  (Persistência)        │  │  (Backoff)      │
    └───────────────────┘  └────────────────────────┘  └─────────────────┘
              │                          │                       │
              └──────────────────────────┼───────────────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │  Supabase Tables (3 novas)   │
                          │  • workflow_checkpoints      │
                          │  • workflow_events           │
                          │  • workflow_metrics          │
                          └──────────────────────────────┘
```

## 📅 Cronograma de Rollout (4 Semanas)

### **Semana 1: Testes Internos (0%)**
- **Objetivo**: Validar V2 em ambiente de staging
- **Ações**:
  - Executar suite de testes E2E com V2
  - Validar checkpoints e resume
  - Comparar métricas V1 vs V2
  - Corrigir bugs identificados
- **Rollback**: Imediato se bugs críticos
- **Sucesso**: 100% dos testes E2E passando

### **Semana 2: Rollout 10% (Canary)**
- **Objetivo**: Expor V2 a tráfego real limitado
- **Ações**:
  ```bash
  # No Supabase Dashboard > Edge Functions > Secrets
  USE_ORCHESTRATOR_V2=true  # Ativar feature flag
  ```
  - Monitorar logs estruturados:
    - Taxa de erro V1 vs V2
    - Duração média de checkpoints
    - Número de retries bem-sucedidos
  - Alertas automáticos se:
    - Taxa de erro > 5%
    - Checkpoint > 150ms (média)
    - Workflow travado > 10min
- **Rollback**: Se métricas degradarem > 20%
- **Sucesso**: Métricas V2 ≥ V1

### **Semana 3: Rollout 50% (Aceleração)**
- **Objetivo**: Escalar para metade do tráfego
- **Ações**:
  - Aumentar para 50% via feature flag
  - Análise de performance sob carga:
    - Pico de execuções simultâneas
    - Latência de checkpoints
    - Taxa de conclusão
  - Ajustes de otimização se necessário
- **Rollback**: Se latência P99 > 2x da baseline
- **Sucesso**: Sistema estável por 3 dias

### **Semana 4: Rollout 100% (GA)**
- **Objetivo**: Migração completa para V2
- **Ações**:
  - Ativar V2 para 100% do tráfego
  - Desativar V1 após 7 dias sem incidentes
  - Documentar lessons learned
  - Comunicar equipe sobre nova arquitetura
- **Rollback**: Ainda possível até remoção do código V1
- **Sucesso**: 0 incidentes críticos por 7 dias

## 🔧 Como Ativar/Desativar V2

### **Ativar V2 (Feature Flag)**
```bash
# Via Supabase Dashboard
Project > Edge Functions > Secrets
ADD SECRET: USE_ORCHESTRATOR_V2 = true
```

### **Desativar V2 (Rollback)**
```bash
# Via Supabase Dashboard
DELETE SECRET: USE_ORCHESTRATOR_V2
# Ou
UPDATE SECRET: USE_ORCHESTRATOR_V2 = false
```

### **Verificar Versão Ativa**
```sql
-- Consultar logs recentes
SELECT 
  event_message,
  timestamp
FROM edge_logs
WHERE function_id = 'execute-workflow'
  AND event_message LIKE '%Using orchestrator%'
ORDER BY timestamp DESC
LIMIT 10;
```

## 📊 Métricas de Monitoramento

### **Dashboard de Observabilidade**

#### **1. Taxa de Sucesso**
```sql
-- V1 vs V2 - Taxa de conclusão
SELECT 
  CASE 
    WHEN metadata->>'orchestrator_version' = 'v2' THEN 'V2'
    ELSE 'V1'
  END as version,
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
FROM workflow_executions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY version;
```

#### **2. Performance de Checkpoints**
```sql
-- Duração média de checkpoints
SELECT 
  AVG((metadata->>'duration_ms')::numeric) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'duration_ms')::numeric) as p95_duration_ms,
  COUNT(*) as total_checkpoints
FROM workflow_checkpoints
WHERE created_at > NOW() - INTERVAL '1 hour';
```

#### **3. Eficácia de Retry**
```sql
-- Taxa de sucesso após retry
SELECT 
  retry_count,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as successes,
  COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
FROM workflow_metrics
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY retry_count
ORDER BY retry_count;
```

## 🚨 Critérios de Rollback Automático

### **Alertas Críticos**
1. **Taxa de erro > 10%** (comparado com baseline V1)
2. **Checkpoint lento** (P95 > 200ms)
3. **Workflows travados** (> 5 execuções paradas > 15min)
4. **Memória alta** (> 80% utilização)

### **Processo de Rollback**
```bash
# 1. Desativar V2 imediatamente
DELETE SECRET USE_ORCHESTRATOR_V2

# 2. Verificar recovery
# Aguardar 2 minutos e verificar métricas

# 3. Análise post-mortem
# Investigar logs e eventos para identificar root cause
```

## ✅ Critérios de Sucesso Final

- [ ] 99.5% de taxa de sucesso nas execuções
- [ ] P95 checkpoint < 100ms
- [ ] 0 workflows travados por > 5 minutos
- [ ] Taxa de retry bem-sucedido > 80%
- [ ] Resume idempotente (0 steps duplicados)
- [ ] Event sourcing completo (100% eventos registrados)
- [ ] Logs estruturados em todas operações

## 📝 Logs Estruturados

### **Formato JSON**
```json
{
  "level": "info",
  "type": "STATE_TRANSITION",
  "execution_id": "uuid",
  "node_id": "node-123",
  "from_state": "running",
  "to_state": "completed",
  "event": "COMPLETE",
  "timestamp": "2025-01-08T10:30:00Z",
  "orchestrator_version": "v2"
}
```

### **Query de Análise**
```sql
-- Top 10 transições mais frequentes
SELECT 
  payload->>'from_state' as from_state,
  payload->>'to_state' as to_state,
  COUNT(*) as count
FROM workflow_events
WHERE event_type = 'STATE_TRANSITION'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY from_state, to_state
ORDER BY count DESC
LIMIT 10;
```

## 🔍 Troubleshooting

### **Problema: Checkpoint falha intermitentemente**
```sql
-- Identificar checkpoints falhados
SELECT 
  execution_id,
  node_id,
  error_message,
  COUNT(*) as failures
FROM workflow_checkpoints
WHERE metadata->>'error' IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY execution_id, node_id, error_message
ORDER BY failures DESC;
```

### **Problema: Workflow não retoma após pausa**
```sql
-- Listar workflows pausados há muito tempo
SELECT 
  we.id,
  we.workflow_id,
  we.current_node_id,
  we.started_at,
  NOW() - we.started_at as duration_paused
FROM workflow_executions we
WHERE we.status = 'running'
  AND EXISTS (
    SELECT 1 FROM workflow_step_executions wse
    WHERE wse.execution_id = we.id
      AND wse.status = 'paused'
  )
  AND we.started_at < NOW() - INTERVAL '30 minutes'
ORDER BY duration_paused DESC;
```

## 📚 Referências

- [Temporal Workflow Patterns](https://docs.temporal.io/workflows)
- [n8n Workflow Engine](https://docs.n8n.io/workflows/)
- [Camunda BPMN Best Practices](https://camunda.com/best-practices/)
- [State Machine Design Patterns](https://refactoring.guru/design-patterns/state)

## 🎓 Treinamento da Equipe

### **Sessões Requeridas**
1. **Arquitetura V2** (2h) - Visão geral dos componentes
2. **Debugging com Logs Estruturados** (1h) - Como usar logs JSON
3. **Operação de Feature Flag** (30min) - Ativar/desativar V2
4. **Análise de Métricas** (1h) - Dashboard e queries SQL

### **Materiais de Referência**
- Este documento (ORCHESTRATOR_V2_ROLLOUT.md)
- Código-fonte comentado em `orchestrator/`
- Queries SQL de monitoramento
- Runbook de rollback

---

**Documento mantido por**: Equipe de Engenharia
**Última atualização**: 2025-01-08
**Próxima revisão**: Semana 2 do rollout
