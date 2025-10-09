# 🚀 Plano de Rollout - Fluxo Programático de Credenciamento

**Versão**: 1.0  
**Data de Criação**: 2025-01-09  
**Responsável**: Equipe de Engenharia  
**Status**: Pronto para Execução

---

## 📋 Sumário Executivo

Este documento descreve o plano completo de rollout do novo **Fluxo Programático de Credenciamento**, que substitui o workflow engine atual por edge functions orquestradas para maior performance e observabilidade.

**Estratégia**: Rollout gradual com feature toggle (`use_programmatic_flow`)

**Timeline Estimado**: 7-10 dias úteis

---

## 🎯 Objetivos do Rollout

### Primários
- ✅ Implantar fluxo programático sem interrupção do serviço
- ✅ Validar comportamento em ambiente controlado (canary)
- ✅ Monitorar métricas críticas antes de rollout completo

### Secundários
- ✅ Coletar feedback de usuários piloto
- ✅ Validar melhorias de performance (latência < 2s)
- ✅ Garantir 100% de cobertura E2E

---

## 📊 KPIs e Métricas de Sucesso

### Métricas Críticas (Go/No-Go)

| Métrica | Valor Atual | Meta | Threshold Rollback |
|---------|-------------|------|-------------------|
| Taxa de Sucesso de Inscrições | 95% | ≥ 95% | < 90% |
| Latência Média (Inscrição → Credenciado) | ~5min | < 3min | > 10min |
| Taxa de Geocodificação | 85% | ≥ 90% | < 80% |
| Erro Rate (Edge Functions) | < 1% | < 1% | > 5% |
| Tempo de Geração de Contrato | ~30s | < 20s | > 60s |

### Métricas de Observação

- Uso de CPU/Memória das edge functions
- Taxa de retry de geocoding
- Inscrições em estado ambíguo (stuck)
- Tempo médio de análise por analista

---

## 🗓️ Cronograma de Rollout

### Fase 1: Staging (Dias 1-2)

**Objetivo**: Validar todas as funcionalidades em ambiente controlado

**Atividades**:
1. ✅ Deploy de migrations e edge functions em staging
2. ✅ Executar suite de testes E2E completa
3. ✅ Criar edital de teste e processar 10 inscrições fictícias
4. ✅ Validar logs e métricas de observabilidade

**Responsável**: Time de Desenvolvimento  
**Aprovador**: Tech Lead

**Critérios de Sucesso**:
- [ ] 100% de testes E2E passando
- [ ] Zero erros críticos em logs
- [ ] Latência média < 2s por step

---

### Fase 2: Canary (Dias 3-5)

**Objetivo**: Validar em produção com volume reduzido

**Atividades**:
1. ✅ Deploy em produção (feature toggle desabilitado)
2. ✅ Criar snapshot de estado pré-rollout
3. ✅ Habilitar para **3 editais piloto** (low-volume)
4. ✅ Monitorar métricas 24-48h

**Responsável**: SRE + Product Owner  
**Aprovador**: CTO

**Editais Canary** (critérios):
- Volume esperado: < 50 inscrições
- Especialidades variadas
- Estados diferentes (SP, RJ, MG)

**Critérios de Sucesso**:
- [ ] Taxa de sucesso ≥ 95%
- [ ] Zero incidentes críticos
- [ ] Feedback positivo de analistas
- [ ] Latência média < 3min

**Checkpoint de Decisão**:
- **GO**: Proceder para rollout gradual
- **NO-GO**: Investigar issues e manter feature toggle desabilitado

---

### Fase 3: Rollout Gradual (Dias 6-8)

**Objetivo**: Expandir para 30% → 70% → 100% dos editais

**Atividades**:

#### 3.1 - 30% (Dia 6)
- Habilitar para ~10 editais adicionais
- Monitorar 12h
- Validar métricas

#### 3.2 - 70% (Dia 7)
- Habilitar para maioria dos editais ativos
- Monitorar 24h
- Coletar feedback de analistas

#### 3.3 - 100% (Dia 8)
- Habilitar para todos os editais
- Comunicar a todos os usuários
- Monitoramento intensivo por 48h

**Responsável**: SRE + Product Owner  
**Aprovador**: CTO + Stakeholders

**Critérios de Sucesso**:
- [ ] KPIs dentro da meta em todas as fases
- [ ] Zero rollbacks necessários
- [ ] Feedback majoritariamente positivo

---

### Fase 4: Estabilização (Dias 9-10)

**Objetivo**: Monitorar e otimizar

**Atividades**:
1. ✅ Análise de métricas consolidadas
2. ✅ Refinamento de alertas
3. ✅ Documentação de lessons learned
4. ✅ Treinamento final de equipe

**Responsável**: SRE + Tech Lead  

---

## 🔧 Comandos e Scripts

### 1. Deploy em Staging

```bash
# 1.1 - Aplicar migrations
psql $STAGING_DB_URL -f supabase/migrations/20250109_feature_toggle.sql

# 1.2 - Deploy edge functions
npx supabase functions deploy --project-ref staging-ref

# 1.3 - Verificar deploy
npx supabase functions list --project-ref staging-ref

# 1.4 - Executar testes E2E
npm run test:e2e -- --grep "Fluxo Completo"
```

**Output Esperado**: 
```
✅ Migration aplicada com sucesso
✅ 15 edge functions deployed
✅ 12/12 testes E2E passando
```

---

### 2. Deploy em Produção (Feature Toggle OFF)

```bash
# 2.1 - Criar snapshot pré-rollout
psql $PROD_DB_URL -c "SELECT public.create_rollout_snapshot('pre_rollout', 'production', 'Snapshot antes do rollout do fluxo programático');"

# 2.2 - Aplicar migrations
psql $PROD_DB_URL -f supabase/migrations/20250109_feature_toggle.sql

# 2.3 - Verificar campo criado
psql $PROD_DB_URL -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'editais' AND column_name = 'use_programmatic_flow';"

# Output esperado:
# column_name             | data_type | column_default
# ----------------------- | --------- | --------------
# use_programmatic_flow   | boolean   | false

# 2.4 - Deploy edge functions
npx supabase functions deploy --project-ref prod-ref
```

---

### 3. Habilitar Canary (3 Editais Piloto)

```sql
-- 3.1 - Listar editais candidatos (baixo volume, status aberto)
SELECT 
  id, 
  numero_edital, 
  titulo, 
  COUNT(ie.id) as total_inscricoes
FROM editais e
LEFT JOIN inscricoes_edital ie ON ie.edital_id = e.id
WHERE e.status = 'aberto'
  AND e.use_programmatic_flow = false
GROUP BY e.id
HAVING COUNT(ie.id) < 50
ORDER BY COUNT(ie.id) ASC
LIMIT 10;

-- 3.2 - Habilitar fluxo programático para edital piloto
-- Substituir <EDITAL_ID> pelo ID real
SELECT public.enable_programmatic_flow(
  '<EDITAL_ID_1>'::uuid,
  'Canary deployment - Edital piloto 1'
);

SELECT public.enable_programmatic_flow(
  '<EDITAL_ID_2>'::uuid,
  'Canary deployment - Edital piloto 2'
);

SELECT public.enable_programmatic_flow(
  '<EDITAL_ID_3>'::uuid,
  'Canary deployment - Edital piloto 3'
);

-- 3.3 - Verificar ativação
SELECT * FROM public.view_rollout_status
WHERE use_programmatic_flow = true;
```

---

### 4. Monitoramento Canary (24-48h)

```sql
-- 4.1 - Dashboard de métricas
SELECT 
  numero_edital,
  inscricoes_aguardando,
  inscricoes_em_analise,
  inscricoes_aprovadas,
  inscricoes_reprovadas,
  contratos_assinados,
  credenciados_ativos,
  ultima_alteracao_toggle
FROM public.view_rollout_status
WHERE use_programmatic_flow = true
ORDER BY ultima_alteracao_toggle DESC;

-- 4.2 - Taxa de sucesso
SELECT 
  e.numero_edital,
  COUNT(ie.id) as total_inscricoes,
  COUNT(CASE WHEN ie.status = 'aprovado' THEN 1 END) as aprovadas,
  COUNT(CASE WHEN ie.status = 'inabilitado' THEN 1 END) as reprovadas,
  ROUND(
    100.0 * COUNT(CASE WHEN ie.status = 'aprovado' THEN 1 END) / NULLIF(COUNT(ie.id), 0),
    2
  ) as taxa_aprovacao_pct
FROM editais e
JOIN inscricoes_edital ie ON ie.edital_id = e.id
WHERE e.use_programmatic_flow = true
GROUP BY e.numero_edital;

-- 4.3 - Latência média (inscrição → credenciado)
SELECT 
  e.numero_edital,
  AVG(EXTRACT(EPOCH FROM (cr.created_at - ie.created_at))) / 60 as latencia_media_minutos
FROM editais e
JOIN inscricoes_edital ie ON ie.edital_id = e.id
JOIN credenciados cr ON cr.inscricao_id = ie.id
WHERE e.use_programmatic_flow = true
  AND cr.created_at > NOW() - INTERVAL '48 hours'
GROUP BY e.numero_edital;

-- 4.4 - Taxa de geocodificação
SELECT 
  e.numero_edital,
  COUNT(cr.id) as total_credenciados,
  COUNT(CASE WHEN cr.latitude IS NOT NULL THEN 1 END) as geocodificados,
  ROUND(
    100.0 * COUNT(CASE WHEN cr.latitude IS NOT NULL THEN 1 END) / NULLIF(COUNT(cr.id), 0),
    2
  ) as taxa_geocodificacao_pct
FROM editais e
JOIN inscricoes_edital ie ON ie.edital_id = e.id
JOIN credenciados cr ON cr.inscricao_id = ie.id
WHERE e.use_programmatic_flow = true
GROUP BY e.numero_edital;
```

---

### 5. Rollout Gradual (30% → 70% → 100%)

```sql
-- 5.1 - Habilitar próximos 30% (substituir IDs)
DO $$
DECLARE
  edital_id UUID;
BEGIN
  FOR edital_id IN 
    SELECT id FROM editais 
    WHERE status = 'aberto' 
      AND use_programmatic_flow = false
    LIMIT 10
  LOOP
    PERFORM public.enable_programmatic_flow(
      edital_id,
      'Rollout gradual - 30%'
    );
  END LOOP;
END $$;

-- 5.2 - Verificar total habilitado
SELECT 
  COUNT(*) FILTER (WHERE use_programmatic_flow = true) as habilitados,
  COUNT(*) as total_editais,
  ROUND(100.0 * COUNT(*) FILTER (WHERE use_programmatic_flow = true) / COUNT(*), 2) as percentual
FROM editais
WHERE status = 'aberto';

-- 5.3 - Repetir para 70% e 100%
```

---

## 🔴 Procedimento de Rollback

### Quando Fazer Rollback?

**Gatilhos Automáticos** (monitoramento):
- Taxa de erro > 5% por 15 minutos
- Taxa de sucesso < 90% por 30 minutos
- Latência média > 10 minutos
- > 20 inscrições em estado stuck

**Gatilhos Manuais**:
- Incidente crítico reportado
- Feedback negativo massivo de usuários
- Bug crítico descoberto

---

### Passos de Rollback

#### 1. Rollback Imediato (Emergência)

```sql
-- DESABILITAR TODOS OS EDITAIS IMEDIATAMENTE
UPDATE public.editais
SET use_programmatic_flow = false
WHERE use_programmatic_flow = true;

-- REGISTRAR ROLLBACK NA AUDITORIA
INSERT INTO public.rollout_audit (
  edital_id, action, previous_value, new_value, reason
)
SELECT 
  id, 'emergency_rollback', true, false, 
  'Rollback emergencial devido a incidente crítico'
FROM public.editais
WHERE use_programmatic_flow = false;
```

**Responsável**: Qualquer membro do time SRE  
**Aprovador**: Não requer aprovação em emergência (comunicar CTO imediatamente após)

---

#### 2. Rollback Controlado (Gradual)

```sql
-- DESABILITAR EDITAL ESPECÍFICO
SELECT public.disable_programmatic_flow(
  '<EDITAL_ID>'::uuid,
  'Rollback devido a [motivo específico]'
);

-- VERIFICAR AUDITORIA
SELECT * FROM public.rollout_audit
WHERE action = 'disable'
ORDER BY created_at DESC
LIMIT 10;
```

---

#### 3. Reprocessamento de Inscrições Stuck

**Cenário**: Inscrições que ficaram em estado ambíguo durante rollback

```sql
-- 3.1 - Identificar inscrições stuck
SELECT 
  ie.id,
  ie.edital_id,
  ie.status,
  ie.created_at,
  ie.updated_at,
  EXTRACT(EPOCH FROM (NOW() - ie.updated_at)) / 60 as minutos_sem_atualizacao
FROM inscricoes_edital ie
JOIN editais e ON e.id = ie.edital_id
WHERE e.use_programmatic_flow = false  -- Editais com rollback
  AND ie.status IN ('aguardando_analise', 'em_analise', 'pendente_workflow')
  AND ie.updated_at < NOW() - INTERVAL '30 minutes'
ORDER BY ie.updated_at ASC;

-- 3.2 - Resetar para aguardando_analise (permite reprocessamento)
UPDATE public.inscricoes_edital
SET 
  status = 'aguardando_analise',
  updated_at = NOW()
WHERE id IN (
  SELECT ie.id
  FROM inscricoes_edital ie
  JOIN editais e ON e.id = ie.edital_id
  WHERE e.use_programmatic_flow = false
    AND ie.status IN ('em_analise', 'pendente_workflow')
    AND ie.updated_at < NOW() - INTERVAL '30 minutes'
);

-- 3.3 - Verificar reprocessamento
SELECT COUNT(*), status
FROM inscricoes_edital
WHERE updated_at > NOW() - INTERVAL '5 minutes'
GROUP BY status;
```

---

#### 4. Restaurar Snapshot (Último Recurso)

⚠️ **USO EXTREMO**: Somente se dados foram corrompidos

```sql
-- 4.1 - Listar snapshots disponíveis
SELECT 
  id,
  snapshot_type,
  environment,
  created_at,
  notes
FROM public.rollout_snapshots
ORDER BY created_at DESC
LIMIT 5;

-- 4.2 - Recuperar dados do snapshot
-- (executar com supervisão de DBA)
SELECT data FROM public.rollout_snapshots
WHERE id = '<SNAPSHOT_ID>'::uuid;

-- 4.3 - Restaurar manualmente usando os dados JSON
-- (processo case-by-case, não automatizado)
```

**Responsável**: DBA Senior  
**Aprovador**: CTO + Legal (devido a impacto em dados)

---

## 📸 Checkpoints e Snapshots

### Snapshots Obrigatórios

| Momento | Tipo | Responsável | Retenção |
|---------|------|-------------|----------|
| Antes de deploy em produção | `pre_rollout` | SRE | 30 dias |
| Após canary (24h) | `canary_checkpoint` | SRE | 30 dias |
| Após 30% rollout | `rollout_30pct` | SRE | 15 dias |
| Após 100% rollout | `post_rollout` | SRE | 90 dias |

### Comando para Criar Snapshot

```sql
SELECT public.create_rollout_snapshot(
  'pre_rollout',  -- tipo
  'production',   -- environment
  'Snapshot antes do deploy do fluxo programático em produção'
);
```

---

## 👥 Matriz de Responsabilidades (RACI)

| Atividade | Responsável (R) | Aprovador (A) | Consultado (C) | Informado (I) |
|-----------|----------------|---------------|----------------|---------------|
| Deploy Staging | Dev Team | Tech Lead | SRE | Product |
| Deploy Produção | SRE | CTO | Dev Team | Todos |
| Habilitar Canary | Product Owner | CTO | SRE, Dev | Stakeholders |
| Rollout Gradual | SRE | Product Owner | Dev Team | Usuários |
| Rollback Emergencial | SRE (qualquer) | CTO (posterior) | - | Todos |
| Rollback Controlado | SRE Lead | Product Owner | Dev Team | Stakeholders |
| Reprocessamento de Dados | SRE + DBA | Tech Lead | - | Product |
| Comunicação Externa | Product Owner | CMO | Marketing | Clientes |

---

## 📢 Plano de Comunicação

### Comunicação Interna

#### Fase Canary
**Para**: Time de Desenvolvimento + SRE  
**Canal**: Slack #releases  
**Frequência**: Updates diários

**Template**:
```
📊 Update Canary - Fluxo Programático (Dia X)

✅ Status: [Em andamento / Sucesso / Issues]
📈 Métricas:
  - Taxa de sucesso: X%
  - Latência média: Xmin
  - Editais ativos: X/3

🐛 Issues: [Lista ou "Nenhum"]
🎯 Próximos passos: [Descrição]
```

#### Rollout Gradual
**Para**: Toda a empresa  
**Canal**: Email + Slack #announcements  
**Frequência**: A cada milestone (30%, 70%, 100%)

---

### Comunicação Externa

#### Para Clientes (Analistas/Gestores)

**Momento**: 48h antes de habilitar fluxo programático para edital deles

**Template Email**:
```
Assunto: Melhoria no Processo de Credenciamento

Prezado(a) [Nome],

Estamos realizando uma atualização no sistema de credenciamento que trará:

✅ Redução de 40% no tempo de processamento
✅ Maior transparência com logs detalhados
✅ Melhorias na geocodificação de credenciados

Quando: [Data/Hora]
Impacto: Nenhum! O processo continuará funcionando normalmente.

Qualquer dúvida, estamos à disposição.

Equipe [Nome do Sistema]
```

---

#### Para Candidatos

**Momento**: Somente se houver downtime (improvável)

**Template**:
```
Assunto: Manutenção Programada

Prezado(a) Candidato(a),

Realizaremos uma breve manutenção no sistema:

🗓️ Quando: [Data] às [Hora]
⏱️ Duração estimada: 15 minutos
💡 O que muda: Nada! Melhorias internas apenas.

Agradecemos a compreensão.
```

---

## 🚨 Runbook de Incidentes

### Incidente: Alta Taxa de Falhas

**Sintomas**: Taxa de erro > 5% nas edge functions

**Diagnóstico**:
```bash
# 1. Verificar logs de edge functions
npx supabase functions logs execute-workflow --tail

# 2. Buscar padrões de erro
grep "ERROR" logs.txt | sort | uniq -c | sort -rn

# 3. Verificar métricas no dashboard de observabilidade
```

**Mitigação**:
1. Identificar edge function com problema
2. Se crítico: Rollback imediato
3. Se não-crítico: Desabilitar editais afetados

---

### Incidente: Inscrições Stuck

**Sintomas**: Inscrições em `em_analise` por > 30 minutos

**Diagnóstico**:
```sql
SELECT 
  ie.id,
  ie.status,
  EXTRACT(EPOCH FROM (NOW() - ie.updated_at)) / 60 as minutos_stuck,
  e.numero_edital
FROM inscricoes_edital ie
JOIN editais e ON e.id = ie.edital_id
WHERE ie.status = 'em_analise'
  AND ie.updated_at < NOW() - INTERVAL '30 minutes'
ORDER BY ie.updated_at ASC;
```

**Mitigação**:
1. Verificar se edital tem `use_programmatic_flow = true`
2. Executar reprocessamento (ver seção de Rollback)
3. Se persistir: Rollback do edital específico

---

### Incidente: Geocodificação Lenta

**Sintomas**: Taxa de geocodificação < 80%

**Diagnóstico**:
```sql
SELECT * FROM public.check_geocoding_alerts();
```

**Mitigação**:
1. Verificar configuração de provider (Nominatim/Mapbox)
2. Executar backfill de geocodificação
3. Considerar rate limit do provider

---

## ✅ Checklist Pré-Rollout

### Antes de Staging

- [ ] Código revisado e aprovado (PR merged)
- [ ] Testes E2E 100% passando localmente
- [ ] Migrations testadas em ambiente local
- [ ] Edge functions testadas localmente
- [ ] Documentação atualizada
- [ ] Stakeholders notificados

### Antes de Produção

- [ ] Staging validado com sucesso
- [ ] Snapshot pré-rollout criado
- [ ] Plano de comunicação preparado
- [ ] Time de plantão escalado
- [ ] Dashboard de monitoramento configurado
- [ ] Alertas ativados
- [ ] Runbook de incidentes revisado

### Antes de Canary

- [ ] 3 editais piloto selecionados
- [ ] Analistas responsáveis notificados
- [ ] Métricas baseline coletadas
- [ ] Checkpoint de decisão agendado (48h)

### Antes de Rollout 100%

- [ ] Canary bem-sucedido
- [ ] Feedback positivo coletado
- [ ] Zero incidentes críticos
- [ ] Aprovação formal de stakeholders

---

## 📚 Referências

- [Documentação Técnica - Fluxo Programático](./FLUXO_PROGRAMATICO.md)
- [Guia de Observabilidade](./OBSERVABILIDADE_GEOCODING.md)
- [Guia de Testes E2E](./TESTES_E2E_GUIDE.md)
- [Troubleshooting Workflows](./WORKFLOW_TROUBLESHOOTING.md)

---

## 📝 Histórico de Mudanças

| Data | Versão | Autor | Mudanças |
|------|--------|-------|----------|
| 2025-01-09 | 1.0 | Time Dev | Versão inicial |

---

**Tempo estimado para criação do plano**: 30-45 minutos  
**Tempo estimado para execução do rollout**: 7-10 dias úteis
