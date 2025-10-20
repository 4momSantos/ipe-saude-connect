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

export function MapaDensidadeMultiCidade() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedCidadeId, setSelectedCidadeId] = useState<string>('');
  const [selectedZona, setSelectedZona] = useState<any>(null);
  const [hoveredZona, setHoveredZona] = useState<any>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  
  // Buscar token do Mapbox
  useEffect(() => {
    async function fetchToken() {
      const { data } = await supabase.functions.invoke('get-mapbox-token');
      if (data?.token) {
        setMapboxToken(data.token);
      }
    }
    fetchToken();
  }, []);

  // Buscar lista de cidades
  const { data: cidades, isLoading: loadingCidades } = useCidades();

  // Selecionar primeira cidade por padrão
  useEffect(() => {
    if (cidades && cidades.length > 0 && !selectedCidadeId) {
      setSelectedCidadeId(cidades[0].id);
    } else if (!cidades || cidades.length === 0) {
      // Se não houver cidades no banco, usar cidade mockada por padrão
      if (!selectedCidadeId) {
        setSelectedCidadeId('porto-alegre');
      }
    }
  }, [cidades, selectedCidadeId]);

  // Buscar densidade da cidade selecionada
  const { data: densidadeData, isLoading: loadingDensidade } = useDensidadeCredenciados(selectedCidadeId);

  // Dados mockados para múltiplas cidades
  const cidadesMockadas = {
    'porto-alegre': {
      cidade: {
        nome: 'Porto Alegre',
        uf: 'RS',
        populacao: 1492530,
        credenciados: 342,
        densidade_geral: 2.29,
        latitude: -30.0346,
        longitude: -51.2177,
        zoom: 11
      },
      densidades: [
        { zona_id: '1', zona: 'Centro Histórico', populacao: 45230, credenciados: 38, densidade: 8.40, cor: '#10b981', geometry: null },
        { zona_id: '2', zona: 'Moinhos de Vento', populacao: 38540, credenciados: 35, densidade: 9.08, cor: '#10b981', geometry: null },
        { zona_id: '3', zona: 'Bela Vista', populacao: 52180, credenciados: 28, densidade: 5.37, cor: '#10b981', geometry: null },
        { zona_id: '4', zona: 'Petrópolis', populacao: 41290, credenciados: 22, densidade: 5.33, cor: '#10b981', geometry: null },
        { zona_id: '5', zona: 'Zona Norte', populacao: 156420, credenciados: 45, densidade: 2.88, cor: '#84cc16', geometry: null },
        { zona_id: '6', zona: 'Restinga', populacao: 98320, credenciados: 18, densidade: 1.83, cor: '#eab308', geometry: null },
        { zona_id: '7', zona: 'Lomba do Pinheiro', populacao: 142560, credenciados: 24, densidade: 1.68, cor: '#eab308', geometry: null },
        { zona_id: '8', zona: 'Partenon', populacao: 89450, credenciados: 12, densidade: 1.34, cor: '#eab308', geometry: null },
        { zona_id: '9', zona: 'Zona Sul', populacao: 187230, credenciados: 32, densidade: 1.71, cor: '#eab308', geometry: null },
        { zona_id: '10', zona: 'Rubem Berta', populacao: 112540, credenciados: 8, densidade: 0.71, cor: '#f97316', geometry: null },
        { zona_id: '11', zona: 'Sarandi', populacao: 95670, credenciados: 6, densidade: 0.63, cor: '#f97316', geometry: null },
        { zona_id: '12', zona: 'Agronomia', populacao: 78320, credenciados: 4, densidade: 0.51, cor: '#f97316', geometry: null },
        { zona_id: '13', zona: 'Cristal', populacao: 132450, credenciados: 5, densidade: 0.38, cor: '#ef4444', geometry: null },
        { zona_id: '14', zona: 'Vila Nova', populacao: 68920, credenciados: 2, densidade: 0.29, cor: '#ef4444', geometry: null },
      ]
    },
    'sao-paulo': {
      cidade: {
        nome: 'São Paulo',
        uf: 'SP',
        populacao: 12325232,
        credenciados: 812,
        densidade_geral: 0.66,
        latitude: -23.5505,
        longitude: -46.6333,
        zoom: 10
      },
      densidades: [
        { zona_id: '1', zona: 'Jardins', populacao: 287450, credenciados: 142, densidade: 4.94, cor: '#10b981', geometry: null },
        { zona_id: '2', zona: 'Pinheiros', populacao: 312890, credenciados: 128, densidade: 4.09, cor: '#10b981', geometry: null },
        { zona_id: '3', zona: 'Vila Mariana', populacao: 344620, credenciados: 98, densidade: 2.84, cor: '#84cc16', geometry: null },
        { zona_id: '4', zona: 'Mooca', populacao: 425780, credenciados: 87, densidade: 2.04, cor: '#eab308', geometry: null },
        { zona_id: '5', zona: 'Zona Leste', populacao: 1987540, credenciados: 176, densidade: 0.89, cor: '#f97316', geometry: null },
        { zona_id: '6', zona: 'Zona Sul', populacao: 2145670, credenciados: 181, densidade: 0.84, cor: '#f97316', geometry: null },
      ]
    },
    'curitiba': {
      cidade: {
        nome: 'Curitiba',
        uf: 'PR',
        populacao: 1948626,
        credenciados: 421,
        densidade_geral: 2.16,
        latitude: -25.4284,
        longitude: -49.2733,
        zoom: 11
      },
      densidades: [
        { zona_id: '1', zona: 'Centro', populacao: 52340, credenciados: 45, densidade: 8.60, cor: '#10b981', geometry: null },
        { zona_id: '2', zona: 'Batel', populacao: 48920, credenciados: 42, densidade: 8.59, cor: '#10b981', geometry: null },
        { zona_id: '3', zona: 'Água Verde', populacao: 67230, credenciados: 38, densidade: 5.65, cor: '#10b981', geometry: null },
        { zona_id: '4', zona: 'Portão', populacao: 89450, credenciados: 32, densidade: 3.58, cor: '#84cc16', geometry: null },
        { zona_id: '5', zona: 'CIC', populacao: 198760, credenciados: 54, densidade: 2.72, cor: '#84cc16', geometry: null },
        { zona_id: '6', zona: 'Boqueirão', populacao: 154320, credenciados: 28, densidade: 1.81, cor: '#eab308', geometry: null },
        { zona_id: '7', zona: 'Pinheirinho', populacao: 187450, credenciados: 32, densidade: 1.71, cor: '#eab308', geometry: null },
        { zona_id: '8', zona: 'Cajuru', populacao: 234680, credenciados: 38, densidade: 1.62, cor: '#eab308', geometry: null },
        { zona_id: '9', zona: 'Fazendinha', populacao: 145820, credenciados: 18, densidade: 1.23, cor: '#f97316', geometry: null },
        { zona_id: '10', zona: 'Tatuquara', populacao: 198540, credenciados: 22, densidade: 1.11, cor: '#f97316', geometry: null },
      ]
    },
    'florianopolis': {
      cidade: {
        nome: 'Florianópolis',
        uf: 'SC',
        populacao: 508826,
        credenciados: 356,
        densidade_geral: 7.00,
        latitude: -27.5954,
        longitude: -48.5480,
        zoom: 11
      },
      densidades: [
        { zona_id: '1', zona: 'Centro', populacao: 42890, credenciados: 62, densidade: 14.46, cor: '#10b981', geometry: null },
        { zona_id: '2', zona: 'Trindade', populacao: 38920, credenciados: 48, densidade: 12.33, cor: '#10b981', geometry: null },
        { zona_id: '3', zona: 'Agronômica', populacao: 32450, credenciados: 38, densidade: 11.71, cor: '#10b981', geometry: null },
        { zona_id: '4', zona: 'Córrego Grande', populacao: 45780, credenciados: 42, densidade: 9.17, cor: '#10b981', geometry: null },
        { zona_id: '5', zona: 'Lagoa', populacao: 67230, credenciados: 54, densidade: 8.03, cor: '#10b981', geometry: null },
        { zona_id: '6', zona: 'Canasvieiras', populacao: 54320, credenciados: 32, densidade: 5.89, cor: '#10b981', geometry: null },
        { zona_id: '7', zona: 'Ingleses', populacao: 78540, credenciados: 38, densidade: 4.84, cor: '#84cc16', geometry: null },
        { zona_id: '8', zona: 'Campeche', populacao: 89450, credenciados: 28, densidade: 3.13, cor: '#84cc16', geometry: null },
      ]
    },
    'belo-horizonte': {
      cidade: {
        nome: 'Belo Horizonte',
        uf: 'MG',
        populacao: 2521564,
        credenciados: 489,
        densidade_geral: 1.94,
        latitude: -19.9167,
        longitude: -43.9345,
        zoom: 11
      },
      densidades: [
        { zona_id: '1', zona: 'Savassi', populacao: 54230, credenciados: 68, densidade: 12.54, cor: '#10b981', geometry: null },
        { zona_id: '2', zona: 'Centro', populacao: 87450, credenciados: 78, densidade: 8.92, cor: '#10b981', geometry: null },
        { zona_id: '3', zona: 'Pampulha', populacao: 134680, credenciados: 82, densidade: 6.09, cor: '#10b981', geometry: null },
        { zona_id: '4', zona: 'Barreiro', populacao: 287340, credenciados: 98, densidade: 3.41, cor: '#84cc16', geometry: null },
        { zona_id: '5', zona: 'Venda Nova', populacao: 312890, credenciados: 87, densidade: 2.78, cor: '#84cc16', geometry: null },
        { zona_id: '6', zona: 'Zona Norte', populacao: 456780, credenciados: 76, densidade: 1.66, cor: '#eab308', geometry: null },
      ]
    },
    'rio-de-janeiro': {
      cidade: {
        nome: 'Rio de Janeiro',
        uf: 'RJ',
        populacao: 6747815,
        credenciados: 654,
        densidade_geral: 0.97,
        latitude: -22.9068,
        longitude: -43.1729,
        zoom: 10
      },
      densidades: [
        { zona_id: '1', zona: 'Zona Sul', populacao: 456780, credenciados: 187, densidade: 4.09, cor: '#10b981', geometry: null },
        { zona_id: '2', zona: 'Barra da Tijuca', populacao: 312890, credenciados: 124, densidade: 3.96, cor: '#10b981', geometry: null },
        { zona_id: '3', zona: 'Centro', populacao: 287340, credenciados: 98, densidade: 3.41, cor: '#84cc16', geometry: null },
        { zona_id: '4', zona: 'Tijuca', populacao: 398540, credenciados: 112, densidade: 2.81, cor: '#84cc16', geometry: null },
        { zona_id: '5', zona: 'Zona Norte', populacao: 1876540, credenciados: 133, densidade: 0.71, cor: '#f97316', geometry: null },
      ]
    }
  };

  // Usar dados mockados baseado na cidade selecionada ou primeira disponível
  const getCidadeMockada = () => {
    const cidadeKey = selectedCidadeId || 'porto-alegre';
    return cidadesMockadas[cidadeKey as keyof typeof cidadesMockadas] || cidadesMockadas['porto-alegre'];
  };

  const dadosMockados = getCidadeMockada();

  // Usar dados mockados se não houver dados reais
  const dadosExibicao = densidadeData || dadosMockados;

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-34.8770, -8.0476],
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Callbacks de erro e debug
    map.current.on('error', (e) => {
      console.error('[MAPBOX] Erro interno:', e);
    });

    map.current.on('data', (e) => {
      if (e.dataType === 'source' && e.sourceId === 'zonas') {
        console.log('[MAPA] ✓ Dados da fonte carregados');
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Atualizar mapa quando dados mudarem
  useEffect(() => {
    if (!map.current || !dadosExibicao || !mapboxToken) return;

    const mapInstance = map.current;

    // Atualizar viewport para cidade
    if (dadosExibicao.cidade) {
      mapInstance.flyTo({
        center: [dadosExibicao.cidade.longitude, dadosExibicao.cidade.latitude],
        zoom: dadosExibicao.cidade.zoom,
        duration: 1500,
      });
    }

    // Aguardar carregamento do estilo
    const updateLayers = () => {
      // Remover camadas e fontes existentes
      if (mapInstance.getLayer('zonas-fill')) mapInstance.removeLayer('zonas-fill');
      if (mapInstance.getLayer('zonas-outline')) mapInstance.removeLayer('zonas-outline');
      if (mapInstance.getSource('zonas')) mapInstance.removeSource('zonas');

      if (!dadosExibicao.densidades || dadosExibicao.densidades.length === 0) return;

      // Validar e filtrar apenas zonas com geometrias válidas
      const zonasValidas = dadosExibicao.densidades.filter(d => {
        if (!d.geometry) {
          console.warn(`[MAPA] Zona ${d.zona} sem geometria`);
          return false;
        }
        
        const geom = typeof d.geometry === 'string' ? JSON.parse(d.geometry) : d.geometry;
        
        if (!['Polygon', 'MultiPolygon'].includes(geom.type)) {
          console.warn(`[MAPA] Zona ${d.zona} com tipo inválido: ${geom.type}`);
          return false;
        }
        
        if (!geom.coordinates || geom.coordinates.length === 0) {
          console.warn(`[MAPA] Zona ${d.zona} sem coordenadas`);
          return false;
        }
        
        console.log(`[MAPA] ✓ Zona ${d.zona} válida:`, geom);
        return true;
      });

      if (zonasValidas.length === 0) {
        console.error('[MAPA] Nenhuma zona válida para renderizar');
        return;
      }

      // Converter para GeoJSON válido com IDs únicos
      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: zonasValidas.map((d, index) => {
          // Parse geometry se for string
          const geometry = typeof d.geometry === 'string' 
            ? JSON.parse(d.geometry) 
            : d.geometry;
          
          return {
            type: 'Feature',
            id: d.zona_id || `zona-${index}`, // ID único obrigatório
            properties: {
              zona_id: d.zona_id,
              nome: d.zona,
              populacao: d.populacao,
              credenciados: d.credenciados,
              densidade: d.densidade,
              cor: d.cor,
            },
            geometry: geometry,
          };
        }),
      };

      console.log('[MAPA] GeoJSON gerado:', JSON.stringify(geojsonData, null, 2));

      // Adicionar fonte com tratamento de erro
      try {
        mapInstance.addSource('zonas', {
          type: 'geojson',
          data: geojsonData,
        });
        
        console.log('[MAPA] ✓ Fonte adicionada com sucesso');
      } catch (error) {
        console.error('[MAPA] ❌ Erro ao adicionar fonte:', error);
        console.error('[MAPA] GeoJSON problemático:', geojsonData);
        return;
      }

      // Adicionar layer de preenchimento com tratamento de erro
      try {
        mapInstance.addLayer({
          id: 'zonas-fill',
          type: 'fill',
          source: 'zonas',
          paint: {
            'fill-color': ['get', 'cor'],
            'fill-opacity': 0.7,
          },
        });
        
        console.log('[MAPA] ✓ Layer de preenchimento adicionado');
      } catch (error) {
        console.error('[MAPA] ❌ Erro ao adicionar layer de preenchimento:', error);
      }

      // Adicionar layer de contorno com tratamento de erro
      try {
        mapInstance.addLayer({
          id: 'zonas-outline',
          type: 'line',
          source: 'zonas',
          paint: {
            'line-color': '#000000',
            'line-width': 2,
          },
        });
        
        console.log('[MAPA] ✓ Layer de contorno adicionado');
      } catch (error) {
        console.error('[MAPA] ❌ Erro ao adicionar layer de contorno:', error);
      }

      // Eventos de clique e hover
      mapInstance.on('click', 'zonas-fill', (e) => {
        if (e.features && e.features.length > 0) {
          setSelectedZona(e.features[0].properties);
          setHoveredZona(null); // Limpa hover quando clica
        }
      });

      mapInstance.on('mouseenter', 'zonas-fill', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0 && !selectedZona) {
          setHoveredZona(e.features[0].properties);
        }
      });

      mapInstance.on('mouseleave', 'zonas-fill', () => {
        mapInstance.getCanvas().style.cursor = '';
        setHoveredZona(null);
      });
    };

    if (mapInstance.isStyleLoaded()) {
      updateLayers();
    } else {
      mapInstance.once('style.load', updateLayers);
    }
  }, [dadosExibicao]);

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
              {cidades && cidades.length > 0 ? (
                cidades.map(cidade => (
                  <SelectItem key={cidade.id} value={cidade.id}>
                    📍 {cidade.nome} - {cidade.uf}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="porto-alegre">📍 Porto Alegre - RS</SelectItem>
                  <SelectItem value="sao-paulo">📍 São Paulo - SP</SelectItem>
                  <SelectItem value="curitiba">📍 Curitiba - PR</SelectItem>
                  <SelectItem value="florianopolis">📍 Florianópolis - SC</SelectItem>
                  <SelectItem value="belo-horizonte">📍 Belo Horizonte - MG</SelectItem>
                  <SelectItem value="rio-de-janeiro">📍 Rio de Janeiro - RJ</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Estatísticas Gerais da Cidade */}
      {dadosExibicao?.cidade && (
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">População Total</p>
              <p className="text-2xl font-bold">
                {dadosExibicao.cidade.populacao.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credenciados Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {dadosExibicao.cidade.credenciados}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Densidade Geral</p>
              <p className="text-2xl font-bold text-primary">
                {dadosExibicao.cidade.densidade_geral}
              </p>
              <p className="text-xs text-muted-foreground">por 10k habitantes</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Zonas Mapeadas</p>
              <p className="text-2xl font-bold">
                {dadosExibicao.densidades?.length || 0}
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
        {(selectedZona || hoveredZona) && (
          <div className="absolute top-4 left-4 z-20">
            <Card className="p-4 min-w-[250px] shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{(selectedZona || hoveredZona).nome}</h3>
                {selectedZona && (
                  <button 
                    onClick={() => setSelectedZona(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">População:</span>
                  <span className="font-semibold">
                    {(selectedZona || hoveredZona).populacao.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credenciados:</span>
                  <span className="font-semibold text-green-600">
                    {(selectedZona || hoveredZona).credenciados}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground">Densidade:</span>
                  <Badge 
                    style={{ 
                      backgroundColor: (selectedZona || hoveredZona).cor + '33',
                      color: (selectedZona || hoveredZona).cor,
                      border: `1px solid ${(selectedZona || hoveredZona).cor}`
                    }}
                    className="text-lg font-bold"
                  >
                    {(selectedZona || hoveredZona).densidade}
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
      {dadosExibicao?.densidades && dadosExibicao.densidades.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">
            Ranking de Zonas - {dadosExibicao.cidade.nome}
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
                {dadosExibicao.densidades
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
