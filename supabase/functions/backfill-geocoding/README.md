# Backfill Geocoding - Edge Function

Edge Function para processar em lote credenciados que ainda não possuem coordenadas geográficas.

## 📋 Funcionalidades

- **Processamento em lote**: Processa até 50 credenciados por execução (configurável)
- **Controle de tentativas**: Limita a 5 tentativas por credenciado
- **Rate limiting**: Respeita limites de API (1.1s entre chamadas)
- **Logging estruturado**: JSON logs para monitoramento
- **Relatório detalhado**: Retorna sucesso/falha por item

## 🔧 Configuração

### Variáveis de Ambiente

Usa as mesmas variáveis da função `geocodificar-credenciado`:
- `SUPABASE_URL` (automático)
- `SUPABASE_SERVICE_ROLE_KEY` (automático)

### Parâmetros de Requisição

```json
{
  "batch_size": 50,        // Opcional: tamanho do lote (default: 50)
  "max_attempts": 5,       // Opcional: máximo de tentativas (default: 5)
  "force_reprocess": false // Opcional: reprocessar mesmo com max_attempts
}
```

## 🚀 Uso Manual

### Via Supabase Dashboard

1. Acesse Functions no dashboard
2. Selecione `backfill-geocoding`
3. Clique em "Invoke"
4. Use payload vazio `{}` ou customize:
   ```json
   {
     "batch_size": 20,
     "max_attempts": 3
   }
   ```

### Via cURL

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/backfill-geocoding' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 30}'
```

## ⏰ Agendamento Automático

### Opção 1: Supabase Cron (Recomendado)

Adicione ao SQL Editor:

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar backfill para rodar todo dia às 02:00 UTC
SELECT cron.schedule(
  'backfill-geocoding-daily',
  '0 2 * * *', -- Todo dia às 02:00
  $$
  SELECT
    net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/backfill-geocoding',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{"batch_size": 50}'::jsonb
    ) as request_id;
  $$
);

-- Verificar jobs agendados
SELECT * FROM cron.job;

-- Remover job (se necessário)
SELECT cron.unschedule('backfill-geocoding-daily');
```

### Opção 2: GitHub Actions

Crie `.github/workflows/geocoding-backfill.yml`:

```yaml
name: Geocoding Backfill

on:
  schedule:
    - cron: '0 2 * * *' # Todo dia às 02:00 UTC
  workflow_dispatch: # Permite execução manual

jobs:
  backfill:
    runs-on: ubuntu-latest
    steps:
      - name: Invoke Backfill Function
        run: |
          curl -X POST \
            '${{ secrets.SUPABASE_URL }}/functions/v1/backfill-geocoding' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"batch_size": 50}'
```

### Opção 3: Serviço Externo (Cron-job.org, EasyCron)

Configure um webhook HTTP POST para:
- URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/backfill-geocoding`
- Headers:
  - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
  - `Content-Type: application/json`
- Body: `{"batch_size": 50}`
- Frequência: Diária às 02:00

## 📊 Resposta da Função

```json
{
  "processed": 50,
  "success": 47,
  "failed": [
    {
      "id": "uuid-here",
      "nome": "Dr. João Silva",
      "reason": "Endereço não encontrado"
    }
  ],
  "skipped": 0,
  "duration_ms": 58500,
  "message": "Processamento concluído"
}
```

## 🛡️ Sistema de Segurança

### Controle de Tentativas

A coluna `geocode_attempts` em `credenciados` rastreia tentativas:
- **0-4 tentativas**: Credenciado será reprocessado
- **5+ tentativas**: Ignorado (a menos que `force_reprocess: true`)
- `last_geocode_attempt`: Timestamp da última tentativa

### Rate Limiting

- **Delay entre chamadas**: 1.1s (respeitando Nominatim)
- **Batch size recomendado**: 50 registros
- **Tempo estimado**: ~1 minuto para 50 registros

## 🔍 Monitoramento

### Consultar Credenciados Pendentes

```sql
SELECT COUNT(*) as pendentes
FROM credenciados
WHERE latitude IS NULL
  AND endereco IS NOT NULL
  AND geocode_attempts < 5;
```

### Credenciados com Falhas Persistentes

```sql
SELECT id, nome, endereco, geocode_attempts, last_geocode_attempt
FROM credenciados
WHERE latitude IS NULL
  AND geocode_attempts >= 5
ORDER BY last_geocode_attempt DESC;
```

### Logs da Edge Function

Acesse o Dashboard > Functions > backfill-geocoding > Logs

Filtre por:
- `action: "backfill_completed"` - Ver resumo de execuções
- `action: "geocode_failed"` - Ver falhas específicas

## ⚠️ Troubleshooting

### "Nenhum credenciado pendente"
- Todos já foram geocodificados ou atingiram max_attempts
- Verifique com a query de pendentes acima

### Rate Limit (HTTP 429)
- Delay entre chamadas já está configurado (1.1s)
- Se persistir, aumente `RATE_LIMIT_DELAY_MS` na função

### Timeout
- Reduza `batch_size` para 20-30 registros
- Aumente timeout da Edge Function (padrão: 60s)

## 📈 Estimativas de Tempo

| Batch Size | Tempo Estimado | Rate Limit Safe |
|------------|----------------|-----------------|
| 10         | ~15 segundos   | ✅ Muito seguro |
| 30         | ~35 segundos   | ✅ Seguro       |
| 50         | ~60 segundos   | ✅ Recomendado  |
| 100        | ~2 minutos     | ⚠️ Edge function timeout risk |

## 🎯 Melhores Práticas

1. **Primeira execução**: Use `batch_size: 30` para testar
2. **Produção**: `batch_size: 50` com cron diário
3. **Reprocessamento**: Use `force_reprocess: true` apenas quando necessário
4. **Monitoramento**: Configure alertas para `geocode_attempts >= 5`

## 🔄 Workflow Completo

```
1. Cron trigger (diário 02:00)
   ↓
2. backfill-geocoding inicia
   ↓
3. Busca até 50 credenciados (latitude NULL, attempts < 5)
   ↓
4. Para cada credenciado:
   - Incrementa geocode_attempts
   - Chama geocodificar-credenciado
   - Aguarda 1.1s (rate limit)
   ↓
5. Retorna relatório (success/failed)
   ↓
6. Logs estruturados para análise
```

## 📞 Suporte

- **Logs estruturados**: Todos os eventos são logados em JSON
- **Relatório detalhado**: Cada execução retorna summary com falhas
- **Idempotência**: Seguro executar múltiplas vezes (controle de attempts)
