# 🗺️ Edge Function: enriquecer-endereco-osm

Enriquece dados de endereço de credenciados usando OpenStreetMap Nominatim.

## Uso Rápido

```typescript
// Enriquecer credenciado existente
const { data } = await supabase.functions.invoke('enriquecer-endereco-osm', {
  body: { credenciado_id: 'uuid' }
});

// Reverse geocoding
const { data } = await supabase.functions.invoke('enriquecer-endereco-osm', {
  body: { latitude: -23.5505, longitude: -46.6333 }
});

// Forward geocoding
const { data } = await supabase.functions.invoke('enriquecer-endereco-osm', {
  body: { endereco: 'Avenida Paulista, 1578, São Paulo' }
});
```

## Resposta

```json
{
  "success": true,
  "bairro": "Pinheiros",
  "cidade": "São Paulo",
  "estado": "São Paulo",
  "cep": "05401-000",
  "pais": "Brasil",
  "endereco_completo": "Rua da Consolação, 123, Pinheiros...",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "cached": false,
  "provider": "nominatim"
}
```

## Rate Limit

⚠️ **CRÍTICO**: Respeita limite de 1 requisição/segundo do OSM Nominatim

## Ver Documentação Completa

→ [docs/ENRIQUECIMENTO_OSM_GUIDE.md](../../../docs/ENRIQUECIMENTO_OSM_GUIDE.md)
