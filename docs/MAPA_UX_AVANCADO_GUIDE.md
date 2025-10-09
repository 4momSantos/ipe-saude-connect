# Guia de UX Avançado - Mapa de Credenciados

## Visão Geral

Este guia documenta as melhorias avançadas de UX implementadas no mapa de credenciados, incluindo clustering, filtros avançados, busca e popups expandidos.

## Componentes

### 1. MapFiltersDrawer

**Localização:** `src/components/analytics/MapFiltersDrawer.tsx`

Drawer lateral com filtros avançados para o mapa.

**Features:**
- ✅ Busca por nome (client-side)
- ✅ Multi-select de especialidades
- ✅ Multi-select de estados
- ✅ Multi-select de cidades
- ✅ Badge indicando filtros ativos
- ✅ Botões de limpar individual e geral
- ✅ ScrollArea para listas longas
- ✅ Acessibilidade completa (labels, ARIA)

**Props:**
```typescript
interface MapFiltersDrawerProps {
  onFiltersChange: (filters: {
    search: string;
    especialidades: string[];
    estados: string[];
    cidades: string[];
  }) => void;
  defaultOpen?: boolean;
}
```

**Uso:**
```tsx
<MapFiltersDrawer 
  onFiltersChange={setFilters}
  defaultOpen={false}
/>
```

### 2. MapaCredenciadosSimples (Atualizado)

**Localização:** `src/components/analytics/MapaCredenciadosSimples.tsx`

Componente principal do mapa com todas as features avançadas.

**Novas Features:**

#### Clustering
- Agrupamento dinâmico de marcadores
- Toggle on/off via Switch
- Configurações otimizadas:
  - `maxClusterRadius={80}` - Raio de agrupamento
  - `spiderfyOnMaxZoom` - Expansão em zoom máximo
  - `showCoverageOnHover` - Área de cobertura no hover
  - `zoomToBoundsOnClick` - Zoom ao clicar no cluster

#### Filtros Avançados
- Integração com MapFiltersDrawer
- Filtragem client-side eficiente
- Recálculo automático do centro do mapa
- Contador de resultados filtrados

#### Popups Expandidos
- Design mais espaçoso e organizado
- Informações exibidas:
  - Nome do credenciado
  - Especialidades (badges)
  - Endereço completo
  - Telefone e email (com ícones)
  
- Ações disponíveis:
  - **Ver Perfil**: Link para página do credenciado
  - **Centralizar**: Centra o mapa na localização
  - **Como Chegar**: Abre Google Maps em nova aba

#### Busca com Highlighting
- Busca em tempo real pelo nome
- Indicação visual de termo buscado
- Performance otimizada (client-side index)

## Acessibilidade

### WCAG 2.1 AA Compliance

**Keyboard Navigation:**
- ✅ Tab/Shift+Tab - Navegação entre controles
- ✅ Enter/Space - Ativação de botões e checkboxes
- ✅ Escape - Fechar drawer

**ARIA Labels:**
- ✅ Todos inputs têm labels associadas
- ✅ Checkboxes com aria-label descritivo
- ✅ Botões com aria-label quando necessário
- ✅ Sheet com aria-labelledby

**Contraste:**
- ✅ Todas as cores atendem WCAG AA (4.5:1)
- ✅ Estados de foco visíveis
- ✅ Ícones com tamanho mínimo 16x16px

**Mobile Support:**
- ✅ Touch-friendly (botões min 44x44px)
- ✅ Drawer responsivo (400px sm, 540px md+)
- ✅ Mapa com gestos touch nativos

## Fluxo de Uso

### 1. Carregar Página
```
Usuário acessa /relatorios (tab Mapa)
  ↓
Carrega estatísticas de geocoding
  ↓
Carrega credenciados geocodificados
  ↓
Renderiza mapa com clustering ativo
```

### 2. Aplicar Filtros
```
Usuário clica em "Filtros"
  ↓
Drawer abre com opções
  ↓
Seleciona especialidades/estados/cidades
  ↓
Clica "Aplicar"
  ↓
Mapa atualiza com credenciados filtrados
  ↓
Badge mostra quantidade de filtros ativos
```

### 3. Buscar Credenciado
```
Usuário digita nome no campo de busca
  ↓
Filtragem em tempo real
  ↓
Mapa mostra apenas credenciados que correspondem
  ↓
Contador atualiza: "X credenciados encontrados para 'termo'"
```

### 4. Interagir com Marcador
```
Usuário clica em marcador (ou cluster)
  ↓
Se cluster: expande ou faz zoom
Se marcador: abre popup expandido
  ↓
Popup mostra informações completas
  ↓
Usuário pode:
  - Ver Perfil → Navega para /credenciados/:id
  - Centralizar → Mapa centra na localização
  - Como Chegar → Abre Google Maps
```

## Performance

### Otimizações Implementadas

1. **Client-side Filtering**
   - Filtragem em memória (sem requisições)
   - useMemo para recálculo de centro
   - Debounce implícito no setState

2. **Clustering**
   - Chunk loading para grandes volumes
   - Renderização sob demanda
   - Limite de marcadores visíveis por área

3. **Lazy Loading**
   - Opções de filtro carregadas uma vez
   - Cache de dados do mapa
   - React Query para invalidação inteligente

### Limites Testados
- ✅ 100 credenciados: Performance excelente
- ✅ 500 credenciados: Performance boa com clustering
- ✅ 1000+ credenciados: Clustering recomendado (obrigatório)

## CSS Customizações

### Leaflet Overrides

```css
/* Popup customizado */
.leaflet-popup-content-wrapper {
  border-radius: 0.5rem;
  padding: 0;
}

.leaflet-popup-content {
  margin: 0;
  min-width: 280px;
}

/* Clusters */
.marker-cluster {
  background-color: hsl(var(--primary) / 0.8);
  border: 2px solid hsl(var(--background));
}

.marker-cluster div {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

## Integração com Google Maps

### URL Structure
```typescript
const getGoogleMapsUrl = (lat: number, lng: number) => {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
};
```

**Parâmetros:**
- `api=1` - Usa Google Maps API
- `destination` - Coordenadas de destino
- Abre em nova aba com `target="_blank"`
- `rel="noopener noreferrer"` para segurança

## Troubleshooting

### Problema: Clusters não aparecem
**Solução:** Verificar se `clusteringEnabled` está true e se há mais de 1 marcador visível.

### Problema: Filtros não funcionam
**Solução:** Verificar se `onFiltersChange` está propagando corretamente e se `filteredCredenciados` está sendo usado na renderização.

### Problema: Mapa não centraliza
**Solução:** Verificar se `mapRef.current` está definido e se `setView` está sendo chamado corretamente.

### Problema: Performance ruim com muitos marcadores
**Solução:** 
1. Ativar clustering
2. Verificar se há re-renders desnecessários
3. Usar React DevTools Profiler

## Próximos Passos (Futuro)

### Possíveis Melhorias
- [ ] Heatmap toggle
- [ ] Filtro por raio/distância
- [ ] Export de credenciados filtrados
- [ ] Salvar filtros favoritos
- [ ] Rotas otimizadas (múltiplos destinos)
- [ ] Integração com calendário de disponibilidade
- [ ] Street View integration
- [ ] Offline mode com cache

## Referências

- [react-leaflet](https://react-leaflet.js.org/)
- [react-leaflet-cluster](https://www.npmjs.com/package/react-leaflet-cluster)
- [Leaflet](https://leafletjs.com/)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
