import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useDensidadeCredenciados, DensidadeZona } from '@/hooks/useDensidadeCredenciados';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, TrendingDown, TrendingUp, AlertCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import 'mapbox-gl/dist/mapbox-gl.css';

const INITIAL_VIEW_STATE = {
  latitude: -8.0476,
  longitude: -34.8770,
  zoom: 11
};

export function MapaDensidadeCredenciados() {
  const [selectedZona, setSelectedZona] = useState<DensidadeZona | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);

  const { token, isLoading: tokenLoading, error: tokenError } = useMapboxToken();
  const { data: densidade, isLoading: densidadeLoading, error: densidadeError } = useDensidadeCredenciados();

  const isLoading = tokenLoading || densidadeLoading;
  const error = tokenError || densidadeError;

  // Converter para GeoJSON para Mapbox
  const geojsonData = densidade ? {
    type: 'FeatureCollection' as const,
    features: densidade.zonas.map(z => ({
      type: 'Feature' as const,
      id: z.zona_id,
      properties: {
        zona_id: z.zona_id,
        nome: z.zona,
        cidade: z.cidade,
        estado: z.estado,
        populacao: z.populacao,
        area_km2: z.area_km2,
        credenciados: z.credenciados,
        densidade: z.densidade,
        cor: z.cor
      },
      geometry: z.geometry
    }))
  } : null;

  // Inicializar mapa
  useEffect(() => {
    if (!token || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: INITIAL_VIEW_STATE.zoom
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    popup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 15
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Adicionar camadas de zonas
  useEffect(() => {
    if (!map.current || !geojsonData || !map.current.isStyleLoaded()) return;

    const mapInstance = map.current;

    // Remover camadas anteriores se existirem
    if (mapInstance.getLayer('zonas-fill')) mapInstance.removeLayer('zonas-fill');
    if (mapInstance.getLayer('zonas-outline')) mapInstance.removeLayer('zonas-outline');
    if (mapInstance.getSource('zonas')) mapInstance.removeSource('zonas');

    // Adicionar source
    mapInstance.addSource('zonas', {
      type: 'geojson',
      data: geojsonData as any
    });

    // Camada de preenchimento (choropleth)
    mapInstance.addLayer({
      id: 'zonas-fill',
      type: 'fill',
      source: 'zonas',
      paint: {
        'fill-color': ['get', 'cor'],
        'fill-opacity': 0.6
      }
    });

    // Camada de borda
    mapInstance.addLayer({
      id: 'zonas-outline',
      type: 'line',
      source: 'zonas',
      paint: {
        'line-color': '#000000',
        'line-width': 2
      }
    });

    // Ajustar bounds para mostrar todas as zonas
    if (geojsonData.features.length > 0) {
      let minLng = Infinity, maxLng = -Infinity;
      let minLat = Infinity, maxLat = -Infinity;

      geojsonData.features.forEach(feature => {
        const coords = feature.geometry.coordinates[0];
        coords.forEach(([lng, lat]: [number, number]) => {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });
      });

      mapInstance.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 50, maxZoom: 13, duration: 1000 }
      );
    }

    // Click handler
    mapInstance.on('click', 'zonas-fill', (e) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const props = feature.properties;

      if (!props) return;

      const zona: DensidadeZona = {
        zona_id: props.zona_id,
        zona: props.nome,
        cidade: props.cidade,
        estado: props.estado,
        populacao: props.populacao,
        area_km2: props.area_km2,
        credenciados: props.credenciados,
        densidade: props.densidade,
        cor: props.cor,
        geometry: feature.geometry
      };

      setSelectedZona(zona);

      const popupHTML = `
        <div class="p-3 min-w-[250px]">
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${zona.cor}" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Zona ${zona.zona}
          </h3>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">População:</span>
              <span class="font-semibold">${zona.populacao.toLocaleString()}</span>
            </div>
            
            <div class="flex justify-between">
              <span class="text-gray-600">Área:</span>
              <span class="font-semibold">${zona.area_km2} km²</span>
            </div>
            
            <div class="flex justify-between">
              <span class="text-gray-600">Credenciados:</span>
              <span class="font-semibold">${zona.credenciados}</span>
            </div>
            
            <div class="pt-2 border-t">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Densidade:</span>
                <span class="font-bold px-2 py-1 rounded text-white" style="background-color: ${zona.cor}">
                  ${zona.densidade} por 10k hab.
                </span>
              </div>
            </div>
          </div>
        </div>
      `;

      popup.current?.setLngLat(e.lngLat).setHTML(popupHTML).addTo(mapInstance);
    });

    // Cursor pointer ao hover
    mapInstance.on('mouseenter', 'zonas-fill', () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    });

    mapInstance.on('mouseleave', 'zonas-fill', () => {
      mapInstance.getCanvas().style.cursor = '';
    });

  }, [geojsonData, map.current?.isStyleLoaded()]);

  // Zonas com densidade crítica
  const zonasCriticas = densidade?.zonas.filter(z => z.densidade < 0.5) || [];
  const zonasExcelentes = densidade?.zonas.filter(z => z.densidade >= 3) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando mapa de densidade...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados de densidade: {error instanceof Error ? error.message : 'Erro desconhecido'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Token do Mapbox não disponível. Aguarde...
        </AlertDescription>
      </Alert>
    );
  }

  if (!densidade || densidade.zonas.length === 0) {
    return (
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          Nenhuma zona geográfica cadastrada para {densidade?.cidade || 'esta cidade'}.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Credenciados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {densidade.total_credenciados}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              População Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {densidade.total_populacao.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Densidade Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {densidade.densidade_geral}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              por 10.000 habitantes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zonas Mapeadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {densidade.zonas.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Densidade */}
      {zonasCriticas.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{zonasCriticas.length} zona{zonasCriticas.length > 1 ? 's' : ''}</strong> com densidade crítica (&lt; 0.5): {' '}
            <span className="font-semibold">
              {zonasCriticas.map(z => z.zona).join(', ')}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {zonasExcelentes.length > 0 && (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>{zonasExcelentes.length} zona{zonasExcelentes.length > 1 ? 's' : ''}</strong> com excelente cobertura (≥ 3.0): {' '}
            <span className="font-semibold">
              {zonasExcelentes.map(z => z.zona).join(', ')}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legenda de Densidade</CardTitle>
          <CardDescription>
            Credenciados por 10.000 habitantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#10b981' }} />
              <span>Excelente (≥ 3.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#84cc16' }} />
              <span>Boa (2.0 - 3.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#eab308' }} />
              <span>Razoável (1.0 - 2.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#f97316' }} />
              <span>Baixa (0.5 - 1.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ef4444' }} />
              <span>Crítica (&lt; 0.5)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mapa Choropleth */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Densidade - {densidade.cidade}/{densidade.estado}</CardTitle>
          <CardDescription>
            Clique nas zonas para ver detalhes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={mapContainer} className="w-full h-[600px] rounded-lg overflow-hidden border-t" />
        </CardContent>
      </Card>

      {/* Tabela de Resumo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Zona</CardTitle>
          <CardDescription>
            Ordenado por densidade (maior para menor)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Zona</th>
                  <th className="text-right p-3 font-semibold">População</th>
                  <th className="text-right p-3 font-semibold">Credenciados</th>
                  <th className="text-right p-3 font-semibold">Densidade</th>
                  <th className="text-right p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {densidade.zonas
                  .sort((a, b) => b.densidade - a.densidade)
                  .map((zona) => (
                    <tr 
                      key={zona.zona_id} 
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedZona(zona);
                        if (map.current) {
                          // Centralizar no centro aproximado da zona
                          const coords = zona.geometry.coordinates[0];
                          const centerLng = coords.reduce((sum: number, c: number[]) => sum + c[0], 0) / coords.length;
                          const centerLat = coords.reduce((sum: number, c: number[]) => sum + c[1], 0) / coords.length;
                          map.current.flyTo({ center: [centerLng, centerLat], zoom: 12 });
                        }
                      }}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: zona.cor }}
                          />
                          <span className="font-medium">{zona.zona}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {zona.populacao.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {zona.credenciados}
                      </td>
                      <td className="p-3 text-right">
                        <Badge 
                          variant="outline"
                          className="font-bold"
                          style={{ 
                            borderColor: zona.cor,
                            color: zona.cor 
                          }}
                        >
                          {zona.densidade}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {zona.densidade >= 3 ? (
                          <TrendingUp className="w-4 h-4 text-green-600 inline" />
                        ) : zona.densidade < 0.5 ? (
                          <TrendingDown className="w-4 h-4 text-red-600 inline" />
                        ) : (
                          <Users className="w-4 h-4 text-yellow-600 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
