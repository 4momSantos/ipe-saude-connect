import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createRoot } from "react-dom/client";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { PopupCredenciado } from "./PopupCredenciado";
import { Loader2 } from "lucide-react";
import Supercluster from "supercluster";

interface MapaCredenciadosPublicoProps {
  credenciados: any[];
  height?: string;
  onMarkerClick?: (credenciado: any) => void;
}

export function MapaCredenciadosPublico({
  credenciados,
  height = "100%",
  onMarkerClick,
}: MapaCredenciadosPublicoProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const { token, isLoading: tokenLoading } = useMapboxToken();

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-51.2177, -30.0346], // Porto Alegre
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      "top-right"
    );

    return () => {
      markers.current.forEach((marker) => marker.remove());
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Atualizar marcadores com clustering
  useEffect(() => {
    if (!map.current || !credenciados.length) return;

    // Limpar marcadores antigos
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Preparar dados para clustering
    const points = credenciados
      .filter((c) => c.latitude && c.longitude)
      .map((c) => ({
        type: "Feature" as const,
        properties: { credenciado: c },
        geometry: {
          type: "Point" as const,
          coordinates: [c.longitude, c.latitude],
        },
      }));

    if (points.length === 0) return;

    // Configurar clustering
    const cluster = new Supercluster({
      radius: 80,
      maxZoom: 16,
      minZoom: 0,
    });

    cluster.load(points);

    const bounds = new mapboxgl.LngLatBounds();
    const zoom = map.current.getZoom();
    const bbox = map.current.getBounds().toArray().flat() as [number, number, number, number];
    
    const clusters = cluster.getClusters(bbox, Math.floor(zoom));

    clusters.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const isCluster = feature.properties.cluster;

      if (isCluster) {
        // Criar marcador de cluster
        const clusterSize = feature.properties.point_count;
        const el = document.createElement("div");
        el.className = "cluster-marker";
        el.style.width = `${40 + Math.min(clusterSize * 2, 40)}px`;
        el.style.height = `${40 + Math.min(clusterSize * 2, 40)}px`;
        el.style.borderRadius = "50%";
        el.style.backgroundColor = "hsl(var(--primary))";
        el.style.border = "4px solid white";
        el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.fontSize = "14px";
        el.style.color = "white";
        el.style.fontWeight = "bold";
        el.style.cursor = "pointer";
        el.innerHTML = clusterSize.toString();

        el.addEventListener("click", () => {
          const expansionZoom = Math.min(
            cluster.getClusterExpansionZoom(feature.properties.cluster_id),
            20
          );
          map.current?.easeTo({
            center: [lng, lat],
            zoom: expansionZoom,
          });
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current!);

        markers.current.push(marker);
      } else {
        // Criar marcador individual
        const credenciado = feature.properties.credenciado;
        const color = getMarkerColor(credenciado.estatisticas.nota_media_publica);
        const size = Math.max(
          24,
          Math.min(40, 24 + credenciado.estatisticas.total_avaliacoes_publicas * 2)
        );

        const el = document.createElement("div");
        el.className = "marker";
        el.style.backgroundColor = color;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = "50%";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 3px 10px rgba(0,0,0,0.2)";
        el.style.cursor = "pointer";
        el.style.transition = "transform 0.2s";
        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.15)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        // Criar popup com React
        const popupNode = document.createElement("div");
        const root = createRoot(popupNode);
        root.render(<PopupCredenciado credenciado={credenciado} />);

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          maxWidth: "320px",
        }).setDOMContent(popupNode);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);

        if (onMarkerClick) {
          el.addEventListener("click", () => onMarkerClick(credenciado));
        }

        markers.current.push(marker);
      }

      bounds.extend([lng, lat]);
    });

    // Ajustar bounds apenas se houver pontos válidos
    if (points.length === 1) {
      map.current.easeTo({
        center: [points[0].geometry.coordinates[0], points[0].geometry.coordinates[1]],
        zoom: 15,
      });
    } else if (points.length > 1 && !bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }

    // Re-cluster ao mover/zoom
    const updateClusters = () => {
      if (!map.current) return;
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      // Trigger re-render
    };

    map.current.on("moveend", updateClusters);
    map.current.on("zoomend", updateClusters);

  }, [credenciados, onMarkerClick]);

  if (tokenLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      
      {credenciados.length === 0 && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center p-6">
            <p className="text-muted-foreground font-medium mb-2">
              Nenhum profissional encontrado nesta área
            </p>
            <p className="text-sm text-muted-foreground">
              Ajuste os filtros ou navegue pelo mapa
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getMarkerColor(notaMedia: number): string {
  if (notaMedia >= 4.5) return "#10b981"; // green
  if (notaMedia >= 4.0) return "#3b82f6"; // blue
  if (notaMedia >= 3.5) return "#eab308"; // yellow
  if (notaMedia >= 3.0) return "#f97316"; // orange
  return "#ef4444"; // red
}
