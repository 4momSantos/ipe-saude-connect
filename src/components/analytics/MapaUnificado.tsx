import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useMapaUnificado } from "@/hooks/useMapaUnificado";
import { MapSidebar } from "./MapSidebar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type MapMode = 'credenciados' | 'profissionais' | 'densidade' | 'hibrido';

export interface FiltrosMap {
  busca?: string;
  especialidades?: string[];
  estados?: string[];
  cidades?: string[];
  scoreMinimo?: number;
  cidade?: string;
}

export interface MapaUnificadoProps {
  modo?: MapMode;
  showScores?: boolean;
  filtros?: FiltrosMap;
  height?: string;
  onMarkerClick?: (data: any) => void;
  allowFilters?: boolean;
  allowExport?: boolean;
}

export function MapaUnificado({
  modo = 'credenciados',
  showScores = true,
  filtros: initialFiltros = {},
  height = "600px",
  onMarkerClick,
  allowFilters = true,
  allowExport = true,
}: MapaUnificadoProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [filtros, setFiltros] = useState<FiltrosMap>(initialFiltros);
  const [activeLayers, setActiveLayers] = useState({
    credenciados: modo === 'credenciados' || modo === 'hibrido',
    profissionais: modo === 'profissionais' || modo === 'hibrido',
    densidade: modo === 'densidade',
    zonas: false,
  });

  const { token, isLoading: tokenLoading } = useMapboxToken();
  const { markers: mapMarkers, stats, isLoading } = useMapaUnificado(modo, filtros);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-47.9292, -15.7801], // Brasília
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    return () => {
      markers.current.forEach((marker) => marker.remove());
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Atualizar marcadores
  useEffect(() => {
    if (!map.current || isLoading || !mapMarkers.length) return;

    // Limpar marcadores antigos
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    const bounds = new mapboxgl.LngLatBounds();

    mapMarkers.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const color = getMarkerColor(item.score || 0);
      
      const el = document.createElement("div");
      el.className = "marker";
      el.style.backgroundColor = color;
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.borderRadius = "50%";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = "14px";
      el.style.color = "white";
      el.style.fontWeight = "bold";
      el.innerHTML = item.tipo === 'credenciado' ? '🏥' : '👨‍⚕️';

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-3 min-w-[250px]">
          <h3 class="font-bold text-base mb-2">${item.nome}</h3>
          <div class="space-y-1 text-sm">
            ${item.especialidades?.length ? `
              <p class="text-muted-foreground">
                <strong>Especialidade(s):</strong> ${item.especialidades.join(", ")}
              </p>
            ` : ''}
            ${showScores && item.score ? `
              <p class="flex items-center gap-1">
                <span>⭐</span>
                <strong>Score:</strong> ${item.score}/100
              </p>
            ` : ''}
            ${item.endereco ? `
              <p class="text-muted-foreground">
                <strong>📍</strong> ${item.endereco}${item.cidade ? `, ${item.cidade}` : ''}${item.estado ? ` - ${item.estado}` : ''}
              </p>
            ` : ''}
            ${item.telefone ? `
              <p class="text-muted-foreground">
                <strong>📞</strong> ${item.telefone}
              </p>
            ` : ''}
            ${item.email ? `
              <p class="text-muted-foreground">
                <strong>✉️</strong> ${item.email}
              </p>
            ` : ''}
          </div>
          <div class="mt-3 flex gap-2">
            <button 
              onclick="window.location.href='#/credenciados/${item.id}'"
              class="flex-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90"
            >
              Ver Perfil
            </button>
            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}"
              target="_blank"
              class="flex-1 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary/90 text-center"
            >
              Rotas
            </a>
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([item.longitude, item.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      if (onMarkerClick) {
        el.addEventListener("click", () => onMarkerClick(item));
      }

      markers.current.push(marker);
      bounds.extend([item.longitude, item.latitude]);
    });

    if (mapMarkers.length > 0) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [mapMarkers, isLoading, showScores, onMarkerClick]);

  if (tokenLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[600px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando mapa...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Mapa Unificado da Rede</CardTitle>
        <CardDescription>
          Visualização integrada de {modo === 'credenciados' ? 'credenciados' : modo === 'profissionais' ? 'profissionais' : modo === 'densidade' ? 'densidade' : 'todos os dados'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {allowFilters && (
            <MapSidebar
              filtros={filtros}
              onFiltrosChange={setFiltros}
              stats={stats}
              activeLayers={activeLayers}
              onLayersChange={setActiveLayers}
              allowExport={allowExport}
              markers={mapMarkers}
            />
          )}
          
          <div className="flex-1 relative" style={{ height }}>
            <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
            
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>
            )}

            {!isLoading && mapMarkers.length === 0 && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros para ver mais resultados</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getMarkerColor(score: number): string {
  if (score >= 80) return "#22c55e"; // Verde - Excelente
  if (score >= 60) return "#eab308"; // Amarelo - Bom
  if (score >= 40) return "#f97316"; // Laranja - Regular
  return "#ef4444"; // Vermelho - Baixo
}
