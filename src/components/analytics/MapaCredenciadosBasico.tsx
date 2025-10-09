import { useState, useMemo, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCredenciadosMap, useGeocodingStats } from "@/hooks/useCredenciados";
import { MapFiltersDrawer } from "./MapFiltersDrawer";
import { Map as MapIcon, Phone, Mail, Navigation, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNseDhxZnp6YTBhZWcyanM5Mmw4cDYwdXgifQ.8FhB5YKfZ8yKvXfz8eIW4w";

mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapaCredenciadosProps {
  height?: string;
}

export function MapaCredenciados({ height = "600px" }: MapaCredenciadosProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  const [filters, setFilters] = useState({
    search: "",
    especialidades: [] as string[],
    estados: [] as string[],
    cidades: [] as string[],
  });
  
  const { data: credenciados, isLoading, error } = useCredenciadosMap({});
  const { data: stats } = useGeocodingStats();

  // Filtrar credenciados com base nos filtros
  const filteredCredenciados = useMemo(() => {
    if (!credenciados) return [];

    return credenciados.filter((cred) => {
      // Filtro de busca por nome
      if (filters.search && !cred.nome.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Filtro de especialidades
      if (filters.especialidades.length > 0) {
        const hasEsp = cred.especialidades.some(esp => filters.especialidades.includes(esp));
        if (!hasEsp) return false;
      }

      // Filtro de estados
      if (filters.estados.length > 0 && !filters.estados.includes(cred.estado || "")) {
        return false;
      }

      // Filtro de cidades
      if (filters.cidades.length > 0 && !filters.cidades.includes(cred.cidade || "")) {
        return false;
      }

      return true;
    });
  }, [credenciados, filters]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-51.9253, -14.235], // Brasil
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Atualizar marcadores quando credenciados filtrados mudam
  useEffect(() => {
    if (!map.current || isLoading) return;

    // Remover marcadores antigos
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (!filteredCredenciados || filteredCredenciados.length === 0) return;

    // Calcular bounds para centralizar no conjunto de marcadores
    const bounds = new mapboxgl.LngLatBounds();

    // Adicionar novos marcadores
    filteredCredenciados.forEach((cred) => {
      const popupContent = `
        <div class="p-3 min-w-[250px] space-y-3">
          <div>
            <h3 class="font-semibold text-lg mb-2">${cred.nome}</h3>
            <div class="flex flex-wrap gap-1 mb-3">
              ${cred.especialidades.map(esp => 
                `<span class="inline-flex items-center rounded-md border px-2 py-1 text-xs">${esp}</span>`
              ).join('')}
            </div>
          </div>

          <div class="text-sm space-y-2">
            ${cred.endereco ? `<p class="text-xs text-muted-foreground">${cred.endereco}</p>` : ''}
            ${cred.cidade && cred.estado ? `
              <p class="text-xs font-medium">${cred.cidade} - ${cred.estado}</p>
            ` : ''}
            ${cred.telefone ? `
              <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span class="text-xs">${cred.telefone}</span>
              </div>
            ` : ''}
            ${cred.email ? `
              <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                <span class="text-xs">${cred.email}</span>
              </div>
            ` : ''}
          </div>

          <div class="flex flex-col gap-2 pt-2 border-t">
            <div class="grid grid-cols-2 gap-2">
              <a href="/credenciados/${cred.id}" class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                Ver Perfil
              </a>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${cred.latitude},${cred.longitude}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                Rota
              </a>
            </div>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        maxWidth: '300px'
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker({ color: '#3B82F6' })
        .setLngLat([cred.longitude, cred.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
      bounds.extend([cred.longitude, cred.latitude]);
    });

    // Ajustar mapa para mostrar todos os marcadores
    if (filteredCredenciados.length > 0) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 12,
        duration: 1000
      });
    }
  }, [filteredCredenciados, isLoading]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar credenciados: {error instanceof Error ? error.message : 'Erro desconhecido'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas de Geocoding */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Credenciados</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Geocodificados</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.geocoded}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pendentes</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cobertura</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {stats.percentageGeocoded.toFixed(1)}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filtros e Mapa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="h-5 w-5" />
            Mapa de Credenciados
          </CardTitle>
          <CardDescription>
            Visualize a distribuição geográfica dos credenciados ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
            <MapFiltersDrawer onFiltersChange={setFilters} />
          </div>

          {/* Informações */}
          <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando...</span>
              </div>
            ) : (
              <span>
                <strong>{filteredCredenciados?.length || 0}</strong> credenciados encontrados
                {filters.search && ` para "${filters.search}"`}
              </span>
            )}
          </div>

          {/* Mapa */}
          <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
            <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />

            {/* Overlay para loading */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-[1000]">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Carregando mapa...</p>
                </div>
              </div>
            )}

            {!isLoading && (!filteredCredenciados || filteredCredenciados.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[1000]">
                <div className="text-center p-6">
                  <MapIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">Nenhum credenciado no mapa</p>
                  <p className="text-sm text-muted-foreground">
                    {filters.search || filters.especialidades.length > 0 || filters.estados.length > 0 || filters.cidades.length > 0
                      ? 'Tente ajustar os filtros para ver mais resultados'
                      : 'Aguardando credenciados geocodificados'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
