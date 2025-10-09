# Guia de Observabilidade & Monitoramento - Sistema de Geocodificação

## Visão Geral

Este documento descreve a infraestrutura completa de observabilidade para o sistema de geocodificação, incluindo métricas, alertas, logs estruturados e dashboards.

## 1. SQL Views - Métricas e Estatísticas

### 1.1 View: `view_credenciados_geo_stats`

Estatísticas gerais do sistema de geocodificação.

**Campos:**
- `total_credenciados`: Total de credenciados ativos
- `total_geocoded`: Credenciados com coordenadas
- `total_missing_geo`: Credenciados sem coordenadas (com endereço)
- `total_max_attempts_reached`: Credenciados que atingiram limite de tentativas (≥3)
- `avg_hours_to_geocode`: Tempo médio em horas para geocodificar
- `success_rate_percent`: Taxa de sucesso geral (%)
- `created_last_24h`: Credenciados criados nas últimas 24h
- `geocoded_last_24h`: Credenciados geocodificados nas últimas 24h
- `first_geocoded_at`: Data da primeira geocodificação
- `last_geocoded_at`: Data da última geocodificação

**Uso:**
```sql
SELECT * FROM view_credenciados_geo_stats;
```

**KPIs Principais:**
- `success_rate_percent` deve ser ≥ 80%
- `total_missing_geo` deve ser < 50
- `avg_hours_to_geocode` deve ser < 24h

---

### 1.2 View: `view_geocode_failures_last_24h`

Credenciados com falhas nas últimas 24 horas.

**Campos:**
- `id`, `nome`, `endereco`, `cidade`, `estado`, `cep`
- `geocode_attempts`: Número de tentativas
- `last_geocode_attempt`: Última tentativa
- `created_at`: Data de criação
- `hours_since_creation`: Horas desde criação

**Uso:**
```sql
SELECT * FROM view_geocode_failures_last_24h
ORDER BY geocode_attempts DESC
LIMIT 20;
```

**Alertas Baseados:**
- Se `COUNT(*) > 50` → Alerta HIGH
- Se `hours_since_creation > 48` → Alerta MEDIUM

---

### 1.3 View: `view_geocode_cache_stats`

Performance do cache de geocodificação.

**Campos:**
- `total_cache_entries`: Total de entradas no cache
- `reused_entries`: Entradas com hit_count > 1
- `total_hits`: Soma de todos os hits
- `avg_hits_per_entry`: Média de hits por entrada
- `max_hits`: Máximo de hits em uma entrada
- `entries_last_week`: Entradas criadas na última semana
- `used_last_24h`: Entradas usadas nas últimas 24h
- `cache_reuse_rate_percent`: Taxa de reuso (%)

**Uso:**
```sql
SELECT * FROM view_geocode_cache_stats;
```

**KPIs de Cache:**
- `cache_reuse_rate_percent` ótimo ≥ 30%
- `avg_hits_per_entry` ótimo ≥ 1.5

---

### 1.4 View: `view_geocode_distribution`

Distribuição geográfica de geocodificação.

**Campos:**
- `estado`: UF
- `total`: Total de credenciados
- `geocoded`: Credenciados geocodificados
- `missing`: Credenciados sem geocodificação
- `success_rate`: Taxa de sucesso por estado (%)

**Uso:**
```sql
SELECT * FROM view_geocode_distribution
WHERE success_rate < 80
ORDER BY missing DESC;
```

## 2. Função de Alertas: `check_geocoding_alerts()`

Detecta automaticamente condições de alerta.

**Alertas Implementados:**

### Alert 1: MISSING_GEOCODING (HIGH)
- **Condição:** > 50 credenciados sem geocoding por mais de 24h
- **Ação:** Executar backfill de geocodificação
- **Threshold:** 50 credenciados

### Alert 2: MAX_ATTEMPTS_REACHED (MEDIUM)
- **Condição:** > 5 credenciados atingiram limite de tentativas (≥3)
- **Ação:** Verificar qualidade dos endereços e configuração do provider
- **Threshold:** 5 credenciados

### Alert 3: LOW_SUCCESS_RATE (MEDIUM)
- **Condição:** Taxa de sucesso < 80% nas últimas 24h
- **Ação:** Investigar causas de falha e considerar provider alternativo
- **Threshold:** 80%

**Uso:**
```sql
SELECT * FROM check_geocoding_alerts();
```

**Retorno:**
```json
{
  "alert_type": "MISSING_GEOCODING",
  "severity": "HIGH",
  "message": "Há 67 credenciados sem geocodificação há mais de 24 horas",
  "count": 67,
  "details": {
    "threshold": 50,
    "actual": 67,
    "action": "Executar backfill de geocodificação"
  }
}
```

## 3. Edge Function: `geocoding-monitor`

API de monitoramento com múltiplas ações.

**Endpoints:**

### GET ?action=check_alerts
Verifica alertas ativos.

**Response:**
```json
{
  "alerts": [
    {
      "alert_type": "MISSING_GEOCODING",
      "severity": "HIGH",
      "message": "...",
      "count": 67,
      "details": {...}
    }
  ]
}
```

### GET ?action=stats
Retorna estatísticas gerais.

**Response:**
```json
{
  "stats": {
    "total_credenciados": 1000,
    "total_geocoded": 950,
    "success_rate_percent": 95.0,
    ...
  }
}
```

### GET ?action=cache_stats
Retorna estatísticas do cache.

### GET ?action=failures
Retorna falhas recentes (últimas 24h, máx 50).

### GET ?action=distribution
Retorna distribuição geográfica.

### GET ?action=health
Health check do sistema.

**Response:**
```json
{
  "status": "healthy", // ou "degraded"
  "success_rate": 95.0,
  "missing_geo": 10
}
```

**HTTP Status:**
- `200` - Sistema saudável (success_rate ≥ 80% && missing_geo < 100)
- `503` - Sistema degradado

## 4. Logs Estruturados (JSON)

### Formato Padrão

```json
{
  "timestamp": "2025-10-09T16:30:00.000Z",
  "level": "INFO",
  "function": "geocodificar-credenciado",
  "entity_id": "uuid-credenciado",
  "lat_lon": [-15.7942, -47.8822],
  "provider": "nominatim",
  "message": "Geocodificação bem-sucedida",
  "metadata": {
    "cache_hit": true,
    "latency_ms": 45
  }
}
```

### Níveis de Log

- **INFO**: Operações normais
- **WARN**: Situações anormais mas não críticas
- **ERROR**: Falhas que requerem atenção

### Campos Padrão

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `timestamp` | string (ISO 8601) | Data/hora do evento |
| `level` | enum | INFO, WARN, ERROR |
| `function` | string | Nome da função/operação |
| `entity_id` | string (opcional) | ID do credenciado |
| `lat_lon` | [number, number] | Coordenadas (opcional) |
| `provider` | string (opcional) | Provider de geocoding usado |
| `message` | string | Mensagem legível |
| `metadata` | object (opcional) | Dados adicionais |

### Exemplos de Logs

**Sucesso:**
```json
{
  "timestamp": "2025-10-09T16:30:00.000Z",
  "level": "INFO",
  "function": "geocodificar-credenciado",
  "entity_id": "abc-123",
  "lat_lon": [-15.7942, -47.8822],
  "provider": "nominatim",
  "message": "Credenciado geocodificado com sucesso",
  "metadata": {
    "cache_hit": false,
    "address": "Rua X, 123, Brasília-DF",
    "latency_ms": 1250
  }
}
```

**Falha:**
```json
{
  "timestamp": "2025-10-09T16:31:00.000Z",
  "level": "ERROR",
  "function": "geocodificar-credenciado",
  "entity_id": "def-456",
  "provider": "nominatim",
  "message": "Falha ao geocodificar: endereço inválido",
  "metadata": {
    "attempt": 3,
    "address": "Endereço Incompleto",
    "error": "No results found"
  }
}
```

**Cache Hit:**
```json
{
  "timestamp": "2025-10-09T16:32:00.000Z",
  "level": "INFO",
  "function": "geocodificar-credenciado",
  "entity_id": "ghi-789",
  "lat_lon": [-15.7942, -47.8822],
  "provider": "cache",
  "message": "Coordenadas recuperadas do cache",
  "metadata": {
    "cache_hit": true,
    "cache_entry_age_hours": 12,
    "latency_ms": 5
  }
}
```

## 5. Integração com Ferramentas de Observabilidade

### 5.1 Sentry (Recomendado para Errors)

**Setup:**

1. Criar projeto no Sentry (https://sentry.io)
2. Adicionar DSN como secret no Supabase:

```bash
# Via Supabase Dashboard
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
```

3. Implementar no edge function:

```typescript
import * as Sentry from "https://deno.land/x/sentry/index.ts";

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
  tracesSampleRate: 0.1, // 10% das transações
});

try {
  // ... código
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      function: 'geocodificar-credenciado',
      provider: 'nominatim',
    },
    extra: {
      entity_id: credenciado.id,
      address: credenciado.endereco,
    },
  });
}
```

### 5.2 Logflare (Logs Estruturados)

**Setup:**

1. Criar conta no Logflare (https://logflare.app)
2. Criar source e obter API key
3. Adicionar como secret:

```bash
LOGFLARE_API_KEY=your_api_key
LOGFLARE_SOURCE_ID=your_source_id
```

4. Enviar logs via HTTP:

```typescript
async function sendToLogflare(logEntry: LogEntry) {
  if (Deno.env.get('LOGFLARE_API_KEY')) {
    await fetch('https://api.logflare.app/logs/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': Deno.env.get('LOGFLARE_API_KEY')!,
      },
      body: JSON.stringify({
        source: Deno.env.get('LOGFLARE_SOURCE_ID'),
        log_entry: logEntry,
      }),
    });
  }
}
```

### 5.3 Grafana Cloud (Dashboards)

**Fonte de Dados:** PostgreSQL (Supabase)

**Connection String:**
```
postgresql://postgres:[password]@[host]:5432/postgres
```

## 6. Dashboard Recomendado

### Layout Grafana/Metabase

#### Row 1: Overview (KPIs)
```
┌─────────────────┬─────────────────┬─────────────────┐
│  Total          │  Taxa Sucesso   │  Pendentes      │
│  1,234          │  95.5%          │  45             │
│  credenciados   │  ✓ Saudável     │  ⚠ Atenção      │
└─────────────────┴─────────────────┴─────────────────┘
```

**Queries:**
```sql
-- Total Credenciados
SELECT total_credenciados FROM view_credenciados_geo_stats;

-- Taxa de Sucesso
SELECT success_rate_percent FROM view_credenciados_geo_stats;

-- Pendentes
SELECT total_missing_geo FROM view_credenciados_geo_stats;
```

#### Row 2: Tendências (Time Series)
```
┌───────────────────────────────────────────────────────┐
│  Geocodificações por Dia (Últimos 30 dias)           │
│  ───────────────────────────────────────             │
│  │                                ╱╲                  │
│  │                           ╱────  ╲─────╲           │
│  │                      ╱────            ╲─           │
│  │  ───────────────────                               │
│  └────────────────────────────────────────────────────│
└───────────────────────────────────────────────────────┘
```

**Query:**
```sql
SELECT 
  DATE(geocoded_at) as dia,
  COUNT(*) as total_geocoded
FROM credenciados
WHERE geocoded_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(geocoded_at)
ORDER BY dia;
```

#### Row 3: Cache & Performance
```
┌──────────────────────┬──────────────────────────────────┐
│  Cache Reuse Rate    │  Tempo Médio Geocoding           │
│  42.5%               │  2.3 hours                       │
│  ██████░░░░ (Good)   │  Target: < 24h ✓                │
└──────────────────────┴──────────────────────────────────┘
```

**Queries:**
```sql
-- Cache Reuse
SELECT cache_reuse_rate_percent FROM view_geocode_cache_stats;

-- Tempo Médio
SELECT avg_hours_to_geocode FROM view_credenciados_geo_stats;
```

#### Row 4: Distribuição Geográfica (Heatmap)
```
┌───────────────────────────────────────────────────────┐
│  Cobertura por Estado                                 │
│  ┌─────┬──────┬──────┬──────┬──────┐                │
│  │ SP  │ RJ   │ MG   │ RS   │ BA   │                │
│  │ 95% │ 92%  │ 88%  │ 85%  │ 78%  │                │
│  │ ██  │ ██   │ █░   │ █░   │ ░░   │                │
│  └─────┴──────┴──────┴──────┴──────┘                │
└───────────────────────────────────────────────────────┘
```

**Query:**
```sql
SELECT estado, success_rate 
FROM view_geocode_distribution
ORDER BY success_rate DESC;
```

#### Row 5: Alertas Ativos
```
┌───────────────────────────────────────────────────────┐
│  Alertas Ativos                                       │
│  ⚠ MEDIUM: Taxa de sucesso baixa (78%)              │
│    Ação: Investigar causas de falha                  │
│                                                       │
│  ✓ Sem alertas HIGH no momento                      │
└───────────────────────────────────────────────────────┘
```

**Query:**
```sql
SELECT * FROM check_geocoding_alerts()
ORDER BY 
  CASE severity 
    WHEN 'HIGH' THEN 1 
    WHEN 'MEDIUM' THEN 2 
    ELSE 3 
  END;
```

## 7. Alertas Automáticos (pg_cron)

### Configuração via SQL

```sql
-- Criar job para verificar alertas a cada hora
SELECT cron.schedule(
  'check-geocoding-alerts-hourly',
  '0 * * * *', -- A cada hora
  $$
  SELECT 
    net.http_post(
      url := 'https://[seu-webhook-slack-ou-email]/alert',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'alerts', (SELECT jsonb_agg(row_to_json(a)) FROM check_geocoding_alerts() a)
      )
    );
  $$
);
```

### Configuração com Webhooks

**Slack Webhook:**
```sql
-- Enviar alertas para Slack
SELECT 
  net.http_post(
    url := 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'text', format('🚨 Alerta de Geocoding: %s', a.message),
      'color', CASE a.severity 
        WHEN 'HIGH' THEN 'danger'
        WHEN 'MEDIUM' THEN 'warning'
        ELSE 'good'
      END
    )
  )
FROM check_geocoding_alerts() a
WHERE a.severity IN ('HIGH', 'MEDIUM');
```

## 8. Runbook - Resposta a Alertas

### Alert: MISSING_GEOCODING (HIGH)

**Sintoma:** > 50 credenciados sem geocodificação por 24h+

**Diagnóstico:**
1. Verificar view: `SELECT * FROM view_geocode_failures_last_24h LIMIT 10;`
2. Checar qualidade dos endereços
3. Verificar rate limit do provider

**Resolução:**
```sql
-- Opção 1: Executar backfill via edge function
-- Chamar geocoding-monitor?action=health

-- Opção 2: Backfill manual via UI
-- Acessar /relatorios → Tab Mapa → "Executar Backfill"
```

### Alert: MAX_ATTEMPTS_REACHED (MEDIUM)

**Sintoma:** > 5 credenciados atingiram limite de tentativas

**Diagnóstico:**
```sql
SELECT id, nome, endereco, cidade, estado, cep
FROM credenciados
WHERE geocode_attempts >= 3 AND latitude IS NULL
LIMIT 10;
```

**Resolução:**
1. Revisar endereços manualmente
2. Corrigir dados incompletos/inválidos
3. Resetar `geocode_attempts` para 0 após correção

```sql
UPDATE credenciados
SET geocode_attempts = 0,
    last_geocode_attempt = NULL
WHERE id IN (...); -- IDs dos credenciados corrigidos
```

### Alert: LOW_SUCCESS_RATE (MEDIUM)

**Sintoma:** Taxa < 80% nas últimas 24h

**Diagnóstico:**
```sql
-- Ver distribuição de falhas
SELECT COUNT(*) as total, geocode_attempts
FROM credenciados
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND latitude IS NULL
GROUP BY geocode_attempts;
```

**Resolução:**
1. Verificar se é problema temporário do provider
2. Considerar provider alternativo (ex: Google Maps Geocoding API)
3. Melhorar validação de endereços no cadastro

## 9. Métricas SLO (Service Level Objectives)

### SLO Recomendados

| Métrica | Alvo | Crítico |
|---------|------|---------|
| Taxa de Sucesso Geral | ≥ 95% | < 80% |
| Tempo Médio Geocoding | < 12h | > 48h |
| Credenciados Pendentes | < 20 | > 100 |
| Cache Hit Rate | ≥ 30% | < 10% |
| Uptime Provider | ≥ 99.5% | < 95% |

### Cálculo de Error Budget

**Exemplo:** 95% success rate target = 5% error budget

```sql
-- Error budget consumido no mês
SELECT 
  ROUND(100 - success_rate_percent, 2) as error_consumed_percent,
  CASE 
    WHEN (100 - success_rate_percent) > 5 THEN 'EXCEEDED'
    WHEN (100 - success_rate_percent) > 3 THEN 'WARNING'
    ELSE 'OK'
  END as budget_status
FROM view_credenciados_geo_stats;
```

## 10. Checklist de Monitoramento

### Diário
- [ ] Verificar alertas ativos
- [ ] Revisar taxa de sucesso (deve ser ≥ 95%)
- [ ] Checar credenciados pendentes (deve ser < 20)

### Semanal
- [ ] Analisar tendência de geocodificações
- [ ] Revisar cache hit rate
- [ ] Investigar falhas recorrentes

### Mensal
- [ ] Revisar SLOs e error budget
- [ ] Otimizar queries lentas
- [ ] Atualizar runbooks se necessário
- [ ] Revisar distribuição geográfica

## 11. Contatos e Escalação

**Tier 1 - Alertas LOW/MEDIUM:**
- Equipe de Desenvolvimento
- Ação: Investigação e correção em até 24h

**Tier 2 - Alertas HIGH:**
- Tech Lead + DevOps
- Ação: Investigação imediata, resolução em até 4h

**Tier 3 - Outage Crítico:**
- CTO + Equipe completa
- Ação: Resposta imediata, comunicação com stakeholders

---

**Última atualização:** 2025-10-09  
**Versão:** 1.0  
**Mantido por:** Equipe de Infraestrutura
