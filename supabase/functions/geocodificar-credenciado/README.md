# Edge Function: geocodificar-credenciado

Geocodifica endereços de credenciados usando Nominatim (OpenStreetMap) ou Mapbox, com sistema de cache inteligente e retry automático.

## 📋 Funcionalidades

- ✅ Cache em banco de dados (tabela `geocode_cache`)
- ✅ Retry automático com backoff exponencial (3 tentativas)
- ✅ Suporte a múltiplos providers (Nominatim, Mapbox)
- ✅ Rate limit handling (responde adequadamente a HTTP 429)
- ✅ Timeout de 30 segundos por requisição
- ✅ Logging estruturado em JSON
- ✅ Validação de entrada robusta

## 🔧 Variáveis de Ambiente

### Obrigatórias

- `SUPABASE_URL` - URL do projeto Supabase (auto-configurado)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-configurado)

### Opcionais

- `GEOCODING_PROVIDER` - Provider de geocoding (default: `nominatim`)
  - Valores aceitos: `nominatim`, `mapbox`
  
- `GEOCODING_USER_AGENT` - User agent para requisições (default: `CredenciamentoApp/1.0`)
  - **Importante**: Nominatim requer user agent identificável conforme [política de uso](https://operations.osmfoundation.org/policies/nominatim/)

- `MAPBOX_API_KEY` - API key do Mapbox (obrigatório se `GEOCODING_PROVIDER=mapbox`)

## 📝 API

### Endpoint

```
POST /functions/v1/geocodificar-credenciado
```

### Request Body

```json
{
  "credenciado_id": "uuid-do-credenciado",
  "endereco": "Rua Exemplo, 123, São Paulo, SP",
  "force_refresh": false
}
```

**Parâmetros:**

- `credenciado_id` (opcional): UUID do credenciado. Se fornecido, busca o endereço automaticamente.
- `endereco` (opcional): Endereço completo para geocodificar. Obrigatório se `credenciado_id` não for fornecido.
- `force_refresh` (opcional, default: `false`): Ignora cache e força nova geocodificação.

### Response

**Sucesso (200):**

```json
{
  "success": true,
  "lat": -23.5505199,
  "lon": -46.6333094,
  "source": "nominatim",
  "cached": false,
  "provider": "nominatim",
  "message": "Geocodificado com sucesso via nominatim"
}
```

**Erro (400/500):**

```json
{
  "success": false,
  "message": "Descrição do erro"
}
```

## 🚦 Rate Limits e Políticas

### Nominatim (OpenStreetMap)

- **Limite**: 1 requisição por segundo por IP
- **Política oficial**: [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- **Requisitos**:
  - User-Agent identificável (configurado via `GEOCODING_USER_AGENT`)
  - Uso justo e responsável
  - Não fazer bulk geocoding sem autorização

**Como esta função respeita a política:**

- ✅ Implementa cache robusto (reutilização de dados)
- ✅ User-Agent configurável e identificável
- ✅ Backoff exponencial em caso de rate limit (429)
- ✅ Timeout máximo de 30s
- ✅ Máximo 3 tentativas de retry

### Mapbox

- **Limite**: Depende do plano contratado
- **Documentação**: [Mapbox Rate Limits](https://docs.mapbox.com/api/search/geocoding/)
- **Requisitos**:
  - API Key válida
  - Respeitar limites do plano

## 🔄 Fluxo de Retry

Em caso de falha (timeout, 429, 5xx), a função tenta automaticamente:

1. **Tentativa 1**: Imediata
2. **Tentativa 2**: Após 1 segundo (2^0 * 1000ms)
3. **Tentativa 3**: Após 2 segundos (2^1 * 1000ms)
4. **Tentativa 4**: Após 4 segundos (2^2 * 1000ms)

Se todas as tentativas falharem, retorna erro 500.

## 📊 Cache

A função utiliza a tabela `geocode_cache` com as seguintes otimizações:

- **Hash SHA-256** do endereço como chave única
- **Hit counter** para rastrear reutilização
- **Last used timestamp** para eventual limpeza
- **Metadata** armazena informações adicionais (display_name, provider)

**Quando o cache é utilizado:**

- Cache hit aumenta `hit_count` e atualiza `last_used_at`
- `force_refresh=true` ignora cache
- Cache é atualizado mesmo em caso de nova geocodificação

## 📈 Logging Estruturado

Todos os logs são emitidos em formato JSON para facilitar análise:

```json
{
  "timestamp": "2025-10-09T15:30:00.000Z",
  "action": "nominatim_response",
  "provider": "nominatim",
  "status": 200,
  "latency_ms": 345,
  "request_id": "uuid-v4"
}
```

**Eventos registrados:**

- `request_received` - Nova requisição recebida
- `validation_error` - Erro de validação de entrada
- `address_hash_calculated` - Hash do endereço calculado
- `cache_hit` / `cache_miss` - Resultado da busca no cache
- `nominatim_request` / `nominatim_response` / `nominatim_error` - Interação com Nominatim
- `mapbox_request` / `mapbox_response` / `mapbox_error` - Interação com Mapbox
- `rate_limit_hit` - HTTP 429 detectado
- `request_completed` - Requisição finalizada com sucesso
- `request_error` - Erro geral na requisição

## 🧪 Testes Locais

### Teste 1: Geocodificar endereço específico

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/geocodificar-credenciado \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "endereco": "Av Paulista, 1578, São Paulo, SP"
  }'
```

**Resultado esperado:**

```json
{
  "success": true,
  "lat": -23.5615,
  "lon": -46.6562,
  "source": "nominatim",
  "cached": false
}
```

### Teste 2: Geocodificar via credenciado_id

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/geocodificar-credenciado \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "credenciado_id": "d6121387-6e2d-4fe7-b7c8-0ff1e395ec95"
  }'
```

### Teste 3: Verificar cache

Repita o Teste 1. Na segunda chamada, `"cached": true` deve ser retornado.

### Teste 4: Forçar refresh

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/geocodificar-credenciado \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "endereco": "Av Paulista, 1578, São Paulo, SP",
    "force_refresh": true
  }'
```

## 🐛 Troubleshooting

### Erro: "Endereço não encontrado"

- Verifique se o endereço está completo e correto
- Inclua cidade e estado para melhorar precisão
- Tente com diferentes formatos (com/sem número, etc.)

### Erro: "Nominatim API error: 429"

- Rate limit atingido. A função já implementa retry automático.
- Se persistir, considere:
  - Usar Mapbox como provider alternativo
  - Aumentar intervalos entre requisições
  - Contatar OSM Foundation para limites maiores

### Erro: "MAPBOX_API_KEY não configurado"

- Defina a variável de ambiente `MAPBOX_API_KEY` no Supabase
- Ou altere `GEOCODING_PROVIDER` para `nominatim`

### Latência alta (>10s)

- Verifique conexão com a internet
- Considere usar Mapbox (geralmente mais rápido)
- Verifique se cache está funcionando corretamente

## 📚 Referências

- [Nominatim API Documentation](https://nominatim.org/release-docs/latest/api/Overview/)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## ⏱️ Estimativas

- **Tempo de desenvolvimento**: 30-45 minutos
- **Tempo de geocodificação (cache miss)**: 500ms - 2s (Nominatim), 200ms - 1s (Mapbox)
- **Tempo de geocodificação (cache hit)**: 50ms - 200ms
- **Timeout máximo**: 30 segundos

## 🔐 Segurança

- Service role key é usado internamente (nunca expor ao frontend)
- API keys de terceiros nunca são retornadas nas responses
- Logging não inclui informações sensíveis
- Cache não armazena dados pessoais além de endereços

## 📄 Licença

Uso interno do sistema de credenciamento.
