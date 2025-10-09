# 📜 Scripts de Manutenção

Scripts auxiliares para operações em lote no sistema de credenciamento.

---

## 🗺️ Enriquecimento de Endereços via OSM

### Script: `enriquecer-credenciados.ts`

Processa credenciados em lote para enriquecer dados de endereço usando OpenStreetMap.

#### Uso

```bash
# Enriquecer 50 credenciados (default)
deno run --allow-net --allow-env scripts/enriquecer-credenciados.ts enrich

# Enriquecer 100 credenciados
deno run --allow-net --allow-env scripts/enriquecer-credenciados.ts enrich 100

# Validar CEPs de 20 credenciados
deno run --allow-net --allow-env scripts/enriquecer-credenciados.ts validate 20
```

#### Variáveis de Ambiente Necessárias

```bash
export VITE_SUPABASE_URL="https://ncmofeencqpqhtguxmvy.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua_service_role_key"
```

#### Output Esperado

```
🔍 Buscando credenciados para enriquecer...

📊 Encontrados 50 credenciados

[1/50] Processando: Dr. João Silva
  ✅ Sucesso: São Paulo, São Paulo
[2/50] Processando: Dra. Maria Santos
  ✅ Sucesso (cache): Rio de Janeiro, Rio de Janeiro
...

📈 Estatísticas finais:
  Total processados: 50
  ✅ Sucesso: 48 (96%)
  💾 Cache hits: 12 (24%)
  ❌ Falhas: 2
```

---

## ⚙️ Configuração de Ambiente

### Opção 1: Arquivo .env

Criar `.env.local`:

```bash
VITE_SUPABASE_URL=https://ncmofeencqpqhtguxmvy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_key_aqui
```

Carregar antes de executar:
```bash
source .env.local
deno run --allow-net --allow-env scripts/enriquecer-credenciados.ts
```

### Opção 2: Inline

```bash
VITE_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." \
  deno run --allow-net --allow-env scripts/enriquecer-credenciados.ts enrich 10
```

---

## 🚀 Automação via Cron

### Executar Diariamente

```bash
# Adicionar ao crontab
0 2 * * * cd /path/to/project && deno run --allow-net --allow-env scripts/enriquecer-credenciados.ts enrich 100 >> /var/log/enrich.log 2>&1
```

### Via Supabase pg_cron

```sql
-- Enriquecer 50 credenciados por hora
SELECT cron.schedule(
  'enrich-credenciados-hourly',
  '0 * * * *', -- A cada hora
  $$
  SELECT net.http_post(
    url := 'https://ncmofeencqpqhtguxmvy.supabase.co/functions/v1/enriquecer-endereco-osm',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
    body := jsonb_build_object(
      'batch', true,
      'limit', 50
    )
  );
  $$
);
```

---

## 📊 Monitoramento

### Ver Progresso de Enriquecimento

```sql
SELECT 
  COUNT(*) as total_credenciados,
  COUNT(*) FILTER (WHERE cep IS NOT NULL AND cep != '') as com_cep,
  COUNT(*) FILTER (WHERE latitude IS NOT NULL) as com_latlon,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cep IS NOT NULL) / COUNT(*), 2) as pct_com_cep
FROM credenciados
WHERE status = 'Ativo';
```

### Ver Cache do OSM

```sql
SELECT 
  COUNT(*) as total_cached,
  COUNT(*) FILTER (WHERE hit_count > 1) as reused,
  SUM(hit_count) as total_hits,
  MAX(hit_count) as max_hits
FROM geocode_cache
WHERE provider = 'nominatim';
```

---

## ⚠️ Limitações e Considerações

### Rate Limiting

- **OSM Nominatim**: 1 requisição/segundo
- Script respeita automaticamente com delay de 1.1s
- Para volumes > 1000: considerar servidor próprio

### Precisão

- **Boa**: Endereços urbanos em capitais
- **Média**: Endereços rurais ou áreas remotas
- **Variável**: Depende da qualidade dos dados OSM na região

### Fallback

Se OSM falhar consistentemente, considere:
1. Usar Mapbox Geocoding API (mais confiável)
2. Instalar servidor Nominatim próprio
3. Híbrido: OSM + Mapbox fallback

---

## 🔗 Ver Também

- [Documentação Completa - Enriquecimento OSM](../docs/ENRIQUECIMENTO_OSM_GUIDE.md)
- [Observabilidade de Geocoding](../docs/OBSERVABILIDADE_GEOCODING.md)
- [Nominatim API Docs](https://nominatim.org/release-docs/latest/api/Overview/)
