import { useState, useEffect, useRef } from 'react';
import Map, { Source, Layer, Popup, NavigationControl, FullscreenControl } from 'react-map-gl';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useDensidadeCredenciados, DensidadeZona } from '@/hooks/useDensidadeCredenciados';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, TrendingDown, TrendingUp, AlertCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FillLayer, LineLayer } from 'react-map-gl';

const INITIAL_VIEW_STATE = {
  latitude: -8.0476,
  longitude: -34.8770,
  zoom: 11
};

export function MapaDensidadeCredenciados() {
  const [selectedZona, setSelectedZona] = useState<DensidadeZona | null>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const mapRef = useRef<any>(null);

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

  // Estilo da camada de polígonos (choropleth)
  const fillLayer: FillLayer = {
    id: 'zonas-fill',
    type: 'fill',
    paint: {
      'fill-color': ['get', 'cor'],
      'fill-opacity': 0.6
    }
  };

  // Estilo da borda dos polígonos
  const lineLayer: LineLayer = {
    id: 'zonas-outline',
    type: 'line',
    paint: {
      'line-color': '#000000',
      'line-width': 2
    }
  };

  // Highlight ao hover
  const highlightLayer: FillLayer = {
    id: 'zonas-highlight',
    type: 'fill',
    paint: {
      'fill-color': ['get', 'cor'],
      'fill-opacity': 0.9
    },
    filter: ['==', 'zona_id', selectedZona?.zona_id || '']
  };

  // Ajustar mapa para mostrar todas as zonas
  useEffect(() => {
    if (geojsonData && mapRef.current && geojsonData.features.length > 0) {
      try {
        const map = mapRef.current.getMap();
        
        // Calcular bounds manualmente
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

        map.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 50, maxZoom: 13, duration: 1000 }
        );
      } catch (e) {
        console.error('Erro ao ajustar bounds:', e);
      }
    }
  }, [geojsonData]);

  // Detectar click no polígono
  const handleMapClick = (event: any) => {
    if (!event.features || event.features.length === 0) {
      setSelectedZona(null);
      return;
    }

    const feature = event.features[0];
    const props = feature.properties;
    
    setSelectedZona({
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
    });
  };

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
          <div className="rounded-lg overflow-hidden border-t">
            <Map
              ref={mapRef}
              {...viewState}
              onMove={(evt) => setViewState(evt.viewState)}
              mapboxAccessToken={token}
              style={{ width: '100%', height: '600px' }}
              mapStyle="mapbox://styles/mapbox/light-v11"
              onClick={handleMapClick}
              interactiveLayerIds={['zonas-fill']}
            >
              <NavigationControl position="top-right" />
              <FullscreenControl position="top-right" />

              {geojsonData && (
                <Source id="zonas" type="geojson" data={geojsonData}>
                  <Layer {...fillLayer} />
                  <Layer {...lineLayer} />
                  {selectedZona && <Layer {...highlightLayer} />}
                </Source>
              )}

              {selectedZona && (
                <Popup
                  latitude={viewState.latitude}
                  longitude={viewState.longitude}
                  onClose={() => setSelectedZona(null)}
                  closeButton={true}
                  closeOnClick={false}
                  offset={15}
                >
                  <div className="p-3 min-w-[250px]">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <MapPin className="w-5 h-5" style={{ color: selectedZona.cor }} />
                      Zona {selectedZona.zona}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">População:</span>
                        <span className="font-semibold">{selectedZona.populacao.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Área:</span>
                        <span className="font-semibold">{selectedZona.area_km2} km²</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credenciados:</span>
                        <span className="font-semibold">{selectedZona.credenciados}</span>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Densidade:</span>
                          <Badge 
                            className="text-white font-bold"
                            style={{ backgroundColor: selectedZona.cor }}
                          >
                            {selectedZona.densidade} por 10k hab.
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              )}
            </Map>
          </div>
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
                  .map((zona, i) => (
                    <tr 
                      key={zona.zona_id} 
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedZona(zona)}
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
