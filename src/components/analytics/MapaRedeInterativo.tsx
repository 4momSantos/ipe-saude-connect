import { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { Loader2 } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

interface CredenciadoMapData {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  especialidades: string[];
  lat: number;
  lng: number;
}

const especialidadeColors: Record<string, string> = {
  "Cardiologia": "#3B82F6",
  "Ortopedia": "#10B981",
  "Pediatria": "#F59E0B",
  "Neurologia": "#9333EA",
  "Dermatologia": "#EF4444",
  "default": "#475569",
};

export function MapaRedeInterativo() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { token: mapboxToken, isLoading: isTokenLoading, error: tokenError } = useMapboxToken();
  const [credenciados, setCredenciados] = useState<CredenciadoMapData[]>([]);
  const [filteredCredenciados, setFilteredCredenciados] = useState<CredenciadoMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [especialidadeFilter, setEspecialidadeFilter] = useState<string>("todas");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken;
      console.log('[MAPA_INTERATIVO] Token configurado');
    }
  }, [mapboxToken]);

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    if (mapboxToken && map.current && !loading) {
      initializeMap();
    }
  }, [mapboxToken, loading]);

  useEffect(() => {
    filterCredenciados();
  }, [credenciados, searchTerm, especialidadeFilter, estadoFilter]);

  useEffect(() => {
    if (map.current) {
      updateMarkers();
    }
  }, [filteredCredenciados]);

  async function loadMapData() {
    try {
      setLoading(true);

      const { data: credenciadosData, error: credError } = await supabase
        .from("credenciados")
        .select("id, nome, cidade, estado, latitude, longitude, geocoded_at")
        .eq("status", "Ativo");

      if (credError) throw credError;

      const { data: especialidadesData, error: espError } = await supabase
        .from("credenciado_crms")
        .select("credenciado_id, especialidade");

      if (espError) throw espError;

      const mapData: CredenciadoMapData[] = (credenciadosData || []).map((cred) => {
        const especialidades = especialidadesData
          ?.filter((esp) => esp.credenciado_id === cred.id)
          .map((esp) => esp.especialidade) || [];

        // Usar coordenadas reais se disponíveis, senão fallback
        let lat: number;
        let lng: number;

        if (cred.latitude && cred.longitude) {
          lat = cred.latitude;
          lng = cred.longitude;
        } else {
          const coords = getCoordinatesByState(cred.estado || "DF");
          lat = coords[0] + (Math.random() - 0.5) * 0.5;
          lng = coords[1] + (Math.random() - 0.5) * 0.5;
        }

        return {
          id: cred.id,
          nome: cred.nome,
          cidade: cred.cidade || "N/A",
          estado: cred.estado || "N/A",
          especialidades,
          lat,
          lng,
        };
      });

      setCredenciados(mapData);
      setFilteredCredenciados(mapData);

      // Log de geocoding
      const geocoded = credenciadosData?.filter(c => c.latitude && c.longitude).length || 0;
      console.log(`[MAPA] ${geocoded}/${credenciadosData?.length || 0} credenciados geocodificados`);
    } catch (error) {
      console.error("Erro ao carregar dados do mapa:", error);
      toast.error("Erro ao carregar dados do mapa");
    } finally {
      setLoading(false);
    }
  }

  function initializeMap() {
    if (!mapboxToken || !mapContainer.current || map.current) return;

    console.log('[MAPA_INTERATIVO] Inicializando com token seguro');

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-47.8822, -15.7942],
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    updateMarkers();
  }

  function updateMarkers() {
    if (!map.current) return;

    // Remover marcadores existentes
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Adicionar novos marcadores
    filteredCredenciados.forEach((cred) => {
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.backgroundColor = getMarkerColor(cred.especialidades);
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.borderRadius = "50%";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";
      el.style.transition = "transform 0.2s";

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
      });

      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });

      const popupContent = `
        <div class="p-3 min-w-[200px]">
          <h3 class="font-semibold text-sm mb-1">${cred.nome}</h3>
          <p class="text-xs text-muted-foreground mb-2">${cred.cidade} - ${cred.estado}</p>
          ${
            cred.especialidades.length > 0
              ? `
            <div class="space-y-1">
              <p class="text-xs font-medium">Especialidades:</p>
              <div class="flex flex-wrap gap-1">
                ${cred.especialidades
                  .map(
                    (esp) =>
                      `<span class="inline-flex items-center rounded-md border px-2 py-1 text-xs">${esp}</span>`
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([cred.lng, cred.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }

  function filterCredenciados() {
    let filtered = credenciados;

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.cidade.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (especialidadeFilter !== "todas") {
      filtered = filtered.filter((c) => c.especialidades.includes(especialidadeFilter));
    }

    if (estadoFilter !== "todos") {
      filtered = filtered.filter((c) => c.estado === estadoFilter);
    }

    setFilteredCredenciados(filtered);
  }

  function getCoordinatesByState(estado: string): [number, number] {
    const coordinates: Record<string, [number, number]> = {
      "AC": [-8.77, -70.55], "AL": [-9.71, -35.73], "AP": [1.41, -51.77],
      "AM": [-3.47, -65.10], "BA": [-12.96, -38.51], "CE": [-3.71, -38.54],
      "DF": [-15.79, -47.88], "ES": [-19.19, -40.34], "GO": [-16.64, -49.31],
      "MA": [-2.55, -44.30], "MT": [-12.64, -55.42], "MS": [-20.51, -54.54],
      "MG": [-18.10, -44.38], "PA": [-5.53, -52.29], "PB": [-7.06, -35.55],
      "PR": [-24.89, -51.55], "PE": [-8.28, -35.07], "PI": [-8.28, -43.68],
      "RJ": [-22.84, -43.15], "RN": [-5.22, -36.52], "RS": [-30.01, -51.22],
      "RO": [-11.22, -62.80], "RR": [1.99, -61.33], "SC": [-27.33, -49.44],
      "SP": [-23.55, -46.64], "SE": [-10.90, -37.07], "TO": [-10.25, -48.25],
    };
    return coordinates[estado] || coordinates["DF"];
  }

  function getMarkerColor(especialidades: string[]): string {
    if (especialidades.length === 0) return especialidadeColors.default;
    return especialidadeColors[especialidades[0]] || especialidadeColors.default;
  }

  const especialidades = Array.from(
    new Set(credenciados.flatMap((c) => c.especialidades))
  ).sort();

  const estados = Array.from(new Set(credenciados.map((c) => c.estado))).sort();

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  if (isTokenLoading || loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[700px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isTokenLoading ? 'Carregando configuração...' : 'Carregando mapa interativo...'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tokenError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[700px]">
          <div className="text-center text-destructive">
            <p className="font-semibold mb-2">Erro ao carregar configuração do mapa</p>
            <p className="text-sm">{tokenError}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Mapa Interativo da Rede</CardTitle>
          <CardDescription>
            Visualização geográfica de {filteredCredenciados.length} de {credenciados.length}{" "}
            credenciados ativos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={especialidadeFilter} onValueChange={setEspecialidadeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as especialidades</SelectItem>
              {especialidades.map((esp) => (
                <SelectItem key={esp} value={esp}>
                  {esp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              {estados.map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {estado}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground mr-2">Legenda:</span>
          {Object.entries(especialidadeColors)
            .filter(([key]) => key !== "default")
            .map(([especialidade, color]) => (
              <Badge
                key={especialidade}
                variant="outline"
                className="gap-2"
                style={{ borderColor: color }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                {especialidade}
              </Badge>
            ))}
        </div>

        {/* Mapa */}
        <div ref={mapContainer} className="rounded-lg overflow-hidden border border-border h-[600px]" />

        {/* Estatísticas rápidas */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Credenciados Visíveis</p>
              <p className="text-2xl font-bold text-blue-400">{filteredCredenciados.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Especialidades</p>
              <p className="text-2xl font-bold text-green-400">{especialidades.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Estados Cobertos</p>
              <p className="text-2xl font-bold text-purple-400">{estados.length}</p>
            </CardContent>
          </Card>
        </div>
        </CardContent>
    </Card>
  );
}
