import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createRoot } from "react-dom/client";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { PopupCredenciado } from "./PopupCredenciado";
import { Loader2 } from "lucide-react";

interface MapaCredenciadoSingleProps {
  credenciado: {
    id: string;
    nome: string;
    latitude: number;
    longitude: number;
    endereco?: string;
    cidade?: string;
    estado?: string;
    telefone?: string;
    email?: string;
    credenciado_crms?: Array<{ especialidade: string }>;
    estatisticas: {
      nota_media_publica: number;
      total_avaliacoes_publicas: number;
    };
  };
  height?: string;
  zoom?: number;
}

export function MapaCredenciadoSingle({
  credenciado,
  height = "384px",
  zoom = 15,
}: MapaCredenciadoSingleProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const { token, isLoading: tokenLoading } = useMapboxToken();

  useEffect(() => {
    if (!mapContainer.current || !token || map.current || !credenciado.latitude || !credenciado.longitude) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [credenciado.longitude, credenciado.latitude],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Criar marcador
    const color = getMarkerColor(credenciado.estatisticas.nota_media_publica);
    const el = document.createElement("div");
    el.style.backgroundColor = color;
    el.style.width = "36px";
    el.style.height = "36px";
    el.style.borderRadius = "50%";
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";

    // Criar popup com React
    const popupNode = document.createElement("div");
    const root = createRoot(popupNode);
    root.render(<PopupCredenciado credenciado={credenciado} />);

    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false,
      maxWidth: "320px",
    })
      .setDOMContent(popupNode)
      .on("open", () => {
        // Garantir que o popup esteja aberto ao carregar
      });

    marker.current = new mapboxgl.Marker(el)
      .setLngLat([credenciado.longitude, credenciado.latitude])
      .setPopup(popup)
      .addTo(map.current);

    // Abrir popup automaticamente
    setTimeout(() => {
      marker.current?.togglePopup();
    }, 500);

    return () => {
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [token, credenciado, zoom]);

  if (tokenLoading) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-lg" style={{ height }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  if (!credenciado.latitude || !credenciado.longitude) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-lg" style={{ height }}>
        <p className="text-sm text-muted-foreground">Localização não disponível</p>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full rounded-lg" style={{ height }} />;
}

function getMarkerColor(notaMedia: number): string {
  if (notaMedia >= 4.5) return "#10b981";
  if (notaMedia >= 4.0) return "#3b82f6";
  if (notaMedia >= 3.5) return "#eab308";
  if (notaMedia >= 3.0) return "#f97316";
  return "#ef4444";
}
