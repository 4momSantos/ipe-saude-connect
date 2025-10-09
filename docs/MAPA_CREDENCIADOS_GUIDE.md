# Guia de Uso: MapaCredenciados

Sistema completo de visualização geográfica de credenciados usando React Leaflet e OpenStreetMap.

## 📦 Componentes Criados

### 1. Hook `useCredenciados()`

Hook customizado para buscar credenciados geocodificados com filtros e cache inteligente.

#### Uso Básico

```tsx
import { useCredenciados } from "@/hooks/useCredenciados";

function MyComponent() {
  const { data, isLoading, error } = useCredenciados();
  
  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;
  
  return <div>{data?.length} credenciados encontrados</div>;
}
```

#### Uso com Filtros

```tsx
const { data: credenciados } = useCredenciados({
  especialidade: "Cardiologia",
  cidade: "São Paulo",
  estado: "SP"
});
```

#### Parâmetros

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `especialidade` | `string` | Filtrar por especialidade (case-insensitive) |
| `cidade` | `string` | Filtrar por cidade (ILIKE) |
| `estado` | `string` | Filtrar por estado (exato) |
| `enabled` | `boolean` | Controlar execução da query (default: true) |

#### Retorno

```typescript
interface CredenciadoMap {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  status: string;
  especialidades: string[]; // Array de especialidades
}
```

#### Cache e Revalidação

- **Stale Time**: 5 minutos
- **Refetch on Focus**: Sim
- **Query Key**: `['credenciados-map', { filtros }]`

### 2. Hook `useGeocodingStats()`

Retorna estatísticas de cobertura de geocodificação.

```tsx
const { data: stats } = useGeocodingStats();

// stats = {
//   total: 250,
//   geocoded: 200,
//   pending: 50,
//   percentageGeocoded: 80.0
// }
```

### 3. Componente `MapaCredenciados`

Componente completo de mapa com filtros, clusterização e popups interativos.

#### Uso Básico

```tsx
import { MapaCredenciados } from "@/components/analytics/MapaCredenciados";

function MapaPage() {
  return <MapaCredenciados />;
}
```

#### Props

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `enableClustering` | `boolean` | `true` | Habilitar agrupamento de marcadores |
| `height` | `string` | `"600px"` | Altura do container do mapa |

#### Exemplo com Props

```tsx
<MapaCredenciados 
  enableClustering={true} 
  height="800px" 
/>
```

## 🎨 Features do Componente

### 1. Filtros Interativos

- **Especialidade**: Input de texto (busca parcial)
- **Cidade**: Input de texto (ILIKE no banco)
- **Estado**: Select com todos os estados brasileiros
- **Limpar Filtros**: Botão para resetar todos os filtros

### 2. Estatísticas de Cobertura

Cards no topo mostrando:
- Total de credenciados ativos
- Quantidade geocodificada
- Quantidade pendente
- Porcentagem de cobertura

### 3. Mapa Interativo

- **Tiles**: OpenStreetMap
- **Clusterização**: Agrupamento automático de marcadores próximos
- **Zoom**: Scroll do mouse ou controles
- **Pan**: Arrastar para mover
- **Centro Dinâmico**: Calcula automaticamente baseado nos credenciados

### 4. Popups dos Marcadores

Cada marcador exibe:
- Nome do credenciado
- Badges de especialidades
- Endereço completo
- Telefone e email
- Botão "Ver Perfil" (link para `/credenciados/:id`)
- Botão "Rotas" (abre Google Maps com direções)

### 5. Estados de Loading e Empty

- **Loading**: Spinner enquanto carrega dados
- **Empty State**: Mensagem quando não há credenciados
  - Com filtros: sugere ajustar filtros
  - Sem filtros: sugere executar backfill

### 6. Performance

- ✅ Otimizado para **1000+ marcadores**
- ✅ Clusterização inteligente
- ✅ Lazy loading de popups
- ✅ Cache com React Query
- ✅ Revalidação automática

## 🚀 Integração com Página

### Estrutura Atual

```
/relatorios
  └── Tab "Mapa"
      ├── Grid 2 colunas
      │   ├── BatchGeocoding (manual 1 a 1)
      │   └── BackfillGeocoding (lote)
      └── MapaCredenciados (visualização)
```

### Código da Página

```tsx
// src/pages/AnalisesRelatorios.tsx
import { MapaCredenciados } from "@/components/analytics/MapaCredenciados";
import { BatchGeocoding } from "@/components/analytics/BatchGeocoding";
import { BackfillGeocoding } from "@/components/analytics/BackfillGeocoding";

export default function AnalisesRelatorios() {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsContent value="mapa" className="mt-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <BatchGeocoding />
          <BackfillGeocoding />
        </div>
        <MapaCredenciados enableClustering={true} height="700px" />
      </TabsContent>
    </Tabs>
  );
}
```

## 🔧 Customização

### Mudar Provider de Tiles

Edite o `TileLayer` em `MapaCredenciados.tsx`:

```tsx
// OpenStreetMap (atual)
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
/>

// CartoDB Positron (claro)
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
/>

// CartoDB Dark Matter (escuro)
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
/>
```

### Personalizar Ícones dos Marcadores

```tsx
import hospitalIcon from "@/assets/hospital-icon.png";

const CustomIcon = L.icon({
  iconUrl: hospitalIcon,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// No Marker:
<Marker icon={CustomIcon} position={[lat, lng]}>
```

### Ajustar Configuração de Cluster

```tsx
<MarkerClusterGroup
  chunkedLoading
  maxClusterRadius={80}        // Raio maior = menos clusters
  spiderfyOnMaxZoom={true}
  showCoverageOnHover={true}   // Mostrar área ao hover
  zoomToBoundsOnClick={true}
>
```

### Adicionar Controles ao Mapa

```tsx
import { ZoomControl, ScaleControl } from 'react-leaflet';

<MapContainer zoom={5} zoomControl={false}> {/* desabilitar default */}
  <ZoomControl position="topright" />
  <ScaleControl position="bottomleft" />
</MapContainer>
```

## 🧪 Testes Manuais

### Checklist de Validação

- [ ] **Carregamento Inicial**
  - [ ] Stats cards aparecem com dados corretos
  - [ ] Mapa centraliza automaticamente nos credenciados
  - [ ] Marcadores aparecem nas posições corretas

- [ ] **Filtros**
  - [ ] Filtro de especialidade funciona (case-insensitive)
  - [ ] Filtro de cidade funciona (busca parcial)
  - [ ] Filtro de estado funciona (select dropdown)
  - [ ] Botão "Limpar Filtros" reseta todos os campos
  - [ ] Contador atualiza dinamicamente

- [ ] **Clusterização**
  - [ ] Clusters aparecem quando marcadores estão próximos
  - [ ] Clicar em cluster faz zoom
  - [ ] Spiderfy funciona no zoom máximo

- [ ] **Popups**
  - [ ] Nome e especialidades aparecem
  - [ ] Endereço, telefone, email exibem quando disponíveis
  - [ ] Botão "Ver Perfil" redireciona corretamente
  - [ ] Botão "Rotas" abre Google Maps em nova aba

- [ ] **Estados Empty**
  - [ ] Sem dados + sem filtros: sugere backfill
  - [ ] Sem dados + com filtros: sugere ajustar filtros

- [ ] **Performance**
  - [ ] Suporta 100+ marcadores sem lag
  - [ ] Zoom é suave
  - [ ] Pan é responsivo

## 📚 Exemplos Avançados

### Lazy Loading do Mapa

Para evitar SSR issues em Next.js:

```tsx
import dynamic from 'next/dynamic';

const MapaCredenciados = dynamic(
  () => import('@/components/analytics/MapaCredenciados').then(mod => mod.MapaCredenciados),
  { 
    ssr: false,
    loading: () => <div>Carregando mapa...</div>
  }
);
```

### Filtros Controlados Externos

```tsx
function PageWithFilters() {
  const [especialidade, setEspecialidade] = useState("");
  const [cidade, setCidade] = useState("");
  
  const { data: credenciados } = useCredenciados({
    especialidade,
    cidade
  });

  return (
    <>
      <ExternalFilterPanel 
        onEspecialidadeChange={setEspecialidade}
        onCidadeChange={setCidade}
      />
      <MapaCredenciados />
    </>
  );
}
```

### Integrar com Outras Bibliotecas

```tsx
// Heatmap de densidade
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';

const heatmapPoints = credenciados.map(c => [
  c.latitude,
  c.longitude,
  1 // intensity
]);

<MapContainer>
  <HeatmapLayer points={heatmapPoints} />
</MapContainer>
```

## 🐛 Troubleshooting

### "Map container is already initialized"

**Causa**: Remontagem do componente sem cleanup.

**Solução**: Garantir que o MapContainer está em um componente estável ou use key:

```tsx
<MapContainer key={JSON.stringify(filtros)}>
```

### Marcadores não aparecem

**Causa**: Dados sem latitude/longitude ou ícone não carregado.

**Solução**: 
1. Verificar query no Supabase
2. Conferir import dos ícones Leaflet
3. Rodar backfill se necessário

### Performance ruim com muitos marcadores

**Causa**: Clusterização desabilitada ou configuração inadequada.

**Solução**:
```tsx
<MapaCredenciados enableClustering={true} />

// OU ajustar maxClusterRadius
<MarkerClusterGroup maxClusterRadius={100}>
```

### Popups não abrem

**Causa**: Conflito de z-index com outros componentes.

**Solução**: Adicionar CSS:
```css
.leaflet-popup {
  z-index: 9999 !important;
}
```

## 📊 Métricas de Sucesso

- **Cobertura**: Meta de 80%+ credenciados geocodificados
- **Performance**: < 2s para carregar 500+ marcadores
- **UX**: Filtros respondem em < 500ms
- **Clusterização**: Reduz lag em 90% com 1000+ marcadores

## 🔄 Próximos Passos Sugeridos

1. **Heatmap**: Visualização de densidade
2. **Rotas**: Calcular distância entre credenciados
3. **Áreas de Cobertura**: Círculos ou polígonos por raio
4. **Filtros Avançados**: Range de distância, múltiplas especialidades
5. **Export**: Exportar marcadores visíveis como CSV/GeoJSON
6. **Mobile**: Otimizações touch e gestos

## 📞 Suporte

- **Logs de Debug**: Console mostra query errors
- **React Query DevTools**: Inspecionar cache e queries
- **Leaflet Inspector**: Usar plugin Leaflet.Inspector para debug

