import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCidades } from '@/hooks/useCidades';
import { useDensidadeCredenciados } from '@/hooks/useDensidadeCredenciados';
import { supabase } from '@/integrations/supabase/client';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export function MapaDensidadeMultiCidade() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedCidadeId, setSelectedCidadeId] = useState<string>('');
  const [selectedZona, setSelectedZona] = useState<any>(null);

  // Buscar lista de cidades
  const { data: cidades, isLoading: loadingCidades } = useCidades();

  // Selecionar primeira cidade por padrão
  useEffect(() => {
    if (cidades && cidades.length > 0 && !selectedCidadeId) {
      setSelectedCidadeId(cidades[0].id);
    }
  }, [cidades, selectedCidadeId]);

  // Buscar densidade da cidade selecionada
  const { data: densidadeData, isLoading: loadingDensidade } = useDensidadeCredenciados(selectedCidadeId);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-34.8770, -8.0476],
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  // Atualizar mapa quando dados mudarem
  useEffect(() => {
    if (!map.current || !densidadeData) return;

    const mapInstance = map.current;

    // Atualizar viewport para cidade
    if (densidadeData.cidade) {
      mapInstance.flyTo({
        center: [densidadeData.cidade.longitude, densidadeData.cidade.latitude],
        zoom: densidadeData.cidade.zoom,
        duration: 1500,
      });
    }

    // Aguardar carregamento do estilo
    const updateLayers = () => {
      // Remover camadas e fontes existentes
      if (mapInstance.getLayer('zonas-fill')) mapInstance.removeLayer('zonas-fill');
      if (mapInstance.getLayer('zonas-outline')) mapInstance.removeLayer('zonas-outline');
      if (mapInstance.getSource('zonas')) mapInstance.removeSource('zonas');

      if (!densidadeData.densidades || densidadeData.densidades.length === 0) return;

      // Converter para GeoJSON
      const geojsonData = {
        type: 'FeatureCollection' as const,
        features: densidadeData.densidades.map(d => ({
          type: 'Feature' as const,
          properties: {
            zona_id: d.zona_id,
            nome: d.zona,
            populacao: d.populacao,
            credenciados: d.credenciados,
            densidade: d.densidade,
            cor: d.cor,
          },
          geometry: d.geometry,
        })),
      };

      // Adicionar fonte e camadas
      mapInstance.addSource('zonas', {
        type: 'geojson',
        data: geojsonData,
      });

      mapInstance.addLayer({
        id: 'zonas-fill',
        type: 'fill',
        source: 'zonas',
        paint: {
          'fill-color': ['get', 'cor'],
          'fill-opacity': 0.7,
        },
      });

      mapInstance.addLayer({
        id: 'zonas-outline',
        type: 'line',
        source: 'zonas',
        paint: {
          'line-color': '#000000',
          'line-width': 2,
        },
      });

      // Eventos de clique
      mapInstance.on('click', 'zonas-fill', (e) => {
        if (e.features && e.features.length > 0) {
          setSelectedZona(e.features[0].properties);
        }
      });

      mapInstance.on('mouseenter', 'zonas-fill', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });

      mapInstance.on('mouseleave', 'zonas-fill', () => {
        mapInstance.getCanvas().style.cursor = '';
      });
    };

    if (mapInstance.isStyleLoaded()) {
      updateLayers();
    } else {
      mapInstance.once('style.load', updateLayers);
    }
  }, [densidadeData]);

  if (loadingCidades) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com seletor de cidade */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <MapPin className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Mapa de Densidade de Credenciados</h2>
              <p className="text-sm text-muted-foreground">Selecione uma cidade para visualizar</p>
            </div>
          </div>

          {/* Seletor de Cidade */}
          <Select value={selectedCidadeId} onValueChange={setSelectedCidadeId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione uma cidade" />
            </SelectTrigger>
            <SelectContent>
              {cidades?.map(cidade => (
                <SelectItem key={cidade.id} value={cidade.id}>
                  📍 {cidade.nome} - {cidade.uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Estatísticas Gerais da Cidade */}
      {densidadeData?.cidade && (
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">População Total</p>
              <p className="text-2xl font-bold">
                {densidadeData.cidade.populacao.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credenciados Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {densidadeData.cidade.credenciados}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Densidade Geral</p>
              <p className="text-2xl font-bold text-primary">
                {densidadeData.cidade.densidade_geral}
              </p>
              <p className="text-xs text-muted-foreground">por 10k habitantes</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Zonas Mapeadas</p>
              <p className="text-2xl font-bold">
                {densidadeData.densidades?.length || 0}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Legenda */}
      <Card className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Legenda - Densidade de Credenciados</h3>
          <p className="text-sm text-muted-foreground">Credenciados por 10.000 habitantes</p>
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ef4444' }} />
              <span>Crítica (&lt; 0.5)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#f97316' }} />
              <span>Baixa (0.5-1)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#eab308' }} />
              <span>Média (1-2)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#84cc16' }} />
              <span>Boa (2-3)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: '#10b981' }} />
              <span>Excelente (&gt; 3)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Mapa */}
      <div className="rounded-lg overflow-hidden border shadow-lg" style={{ height: '600px' }}>
        {loadingDensidade && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* Popup customizado */}
        {selectedZona && (
          <div className="absolute top-4 left-4 z-20">
            <Card className="p-4 min-w-[250px] shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{selectedZona.nome}</h3>
                <button 
                  onClick={() => setSelectedZona(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">População:</span>
                  <span className="font-semibold">
                    {selectedZona.populacao.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credenciados:</span>
                  <span className="font-semibold text-green-600">
                    {selectedZona.credenciados}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground">Densidade:</span>
                  <Badge 
                    style={{ 
                      backgroundColor: selectedZona.cor + '33',
                      color: selectedZona.cor,
                      border: `1px solid ${selectedZona.cor}`
                    }}
                    className="text-lg font-bold"
                  >
                    {selectedZona.densidade}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  credenciados por 10k hab.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Tabela de Ranking por Zona */}
      {densidadeData?.densidades && densidadeData.densidades.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">
            Ranking de Zonas - {densidadeData.cidade.nome}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Zona</th>
                  <th className="text-right p-3">População</th>
                  <th className="text-right p-3">Credenciados</th>
                  <th className="text-right p-3">Densidade</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {densidadeData.densidades
                  .sort((a, b) => b.densidade - a.densidade)
                  .map((d, i) => (
                    <tr 
                      key={d.zona_id} 
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedZona(d)}
                    >
                      <td className="p-3 font-bold text-muted-foreground">{i + 1}º</td>
                      <td className="p-3 font-medium">{d.zona}</td>
                      <td className="p-3 text-right">
                        {d.populacao.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-green-600 font-semibold">
                        {d.credenciados}
                      </td>
                      <td className="p-3 text-right">
                        <span 
                          className="font-bold px-3 py-1 rounded"
                          style={{ 
                            backgroundColor: d.cor + '33',
                            color: d.cor 
                          }}
                        >
                          {d.densidade}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {d.densidade >= 2 ? '✅ Boa' : 
                         d.densidade >= 1 ? '⚠️ Regular' : 
                         '❌ Crítica'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Comparativo entre Cidades */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Comparativo entre Cidades</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cidades?.map(cidade => (
            <Card 
              key={cidade.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedCidadeId === cidade.id 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedCidadeId(cidade.id)}
            >
              <h4 className="font-bold text-lg mb-2">
                {cidade.nome} - {cidade.uf}
              </h4>
              <p className="text-sm text-muted-foreground">
                {cidade.populacao_total.toLocaleString()} habitantes
              </p>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
