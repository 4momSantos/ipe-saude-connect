import { useState, useMemo, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCredenciadosMap, useGeocodingStats } from "@/hooks/useCredenciados";
import { MapFiltersDrawer } from "./MapFiltersDrawer";
import { Map as MapIcon, Phone, Mail, Navigation, Loader2, AlertCircle, Crosshair, FileText, Award } from "lucide-react";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapaCredenciadosProps {
  height?: string;
}

export function MapaCredenciados({ height = "600px" }: MapaCredenciadosProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
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

  // Calcular centro do mapa baseado nos credenciados filtrados
  const mapCenter = useMemo(() => {
    if (!filteredCredenciados || filteredCredenciados.length === 0) {
      return [-14.235, -51.9253] as [number, number]; // Centro do Brasil
    }

    const avgLat = filteredCredenciados.reduce((sum, c) => sum + c.latitude, 0) / filteredCredenciados.length;
    const avgLng = filteredCredenciados.reduce((sum, c) => sum + c.longitude, 0) / filteredCredenciados.length;
    
    return [avgLat, avgLng] as [number, number];
  }, [filteredCredenciados]);

  // Atualizar centro do mapa quando credenciados mudarem
  useEffect(() => {
    if (mapRef.current) {
      const zoom = filteredCredenciados && filteredCredenciados.length > 0 ? 5 : 4;
      mapRef.current.setView(mapCenter, zoom);
    }
  }, [mapCenter, filteredCredenciados]);

  const centerMapOnLocation = (lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15, { animate: true });
    }
  };

  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

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
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="clustering"
                  checked={clusteringEnabled}
                  onCheckedChange={setClusteringEnabled}
                  aria-label="Ativar/desativar agrupamento de marcadores"
                />
                <Label htmlFor="clustering" className="text-sm cursor-pointer">
                  Agrupamento
                </Label>
              </div>
            </div>
          </div>

          {/* Informações */}
          <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando...</span>
              </div>
            ) : (
              <>
                <span>
                  <strong>{filteredCredenciados?.length || 0}</strong> credenciados encontrados
                  {filters.search && ` para "${filters.search}"`}
                </span>
                {filteredCredenciados && filteredCredenciados.length > 0 && (
                  <Badge variant="secondary">
                    {clusteringEnabled ? 'Agrupamento ativo' : 'Agrupamento desativado'}
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Mapa - Sempre renderizado */}
          <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
            <MapContainer
              center={mapCenter}
              zoom={filteredCredenciados && filteredCredenciados.length > 0 ? 5 : 4}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {filteredCredenciados && filteredCredenciados.length > 0 && clusteringEnabled ? (
                  <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={80}
                    spiderfyOnMaxZoom
                    showCoverageOnHover
                    zoomToBoundsOnClick
                  >
                    {filteredCredenciados.map((credenciado) => (
                      <Marker
                        key={credenciado.id}
                        position={[credenciado.latitude, credenciado.longitude]}
                      >
                        <Popup>
                          <div className="space-y-3 p-1">
                            <div>
                              <h3 className="font-semibold text-lg mb-2">
                                {credenciado.nome}
                              </h3>
                              <div className="flex flex-wrap gap-1 mb-3">
                                {credenciado.especialidades.map((esp, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {esp}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="text-sm space-y-2">
                              {credenciado.endereco && (
                                <p className="text-xs text-muted-foreground">{credenciado.endereco}</p>
                              )}
                              {credenciado.cidade && credenciado.estado && (
                                <p className="text-xs font-medium">
                                  {credenciado.cidade} - {credenciado.estado}
                                </p>
                              )}
                              {credenciado.telefone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs">{credenciado.telefone}</span>
                                </div>
                              )}
                              {credenciado.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs">{credenciado.email}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 pt-2 border-t">
                              <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" variant="outline" asChild>
                                  <Link to={`/credenciados/${credenciado.id}`}>
                                    Ver Perfil
                                  </Link>
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => centerMapOnLocation(credenciado.latitude, credenciado.longitude)}
                                >
                                  <Crosshair className="h-3 w-3 mr-1" />
                                  Centralizar
                                </Button>
                              </div>
                              
                              <Button 
                                size="sm" 
                                variant="default"
                                className="w-full"
                                asChild
                              >
                                <a
                                  href={getGoogleMapsUrl(credenciado.latitude, credenciado.longitude)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Navigation className="h-3 w-3 mr-1" />
                                  Como Chegar
                                </a>
                              </Button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MarkerClusterGroup>
                ) : filteredCredenciados && filteredCredenciados.length > 0 ? (
                  <>
                    {filteredCredenciados.map((credenciado) => (
                      <Marker
                        key={credenciado.id}
                        position={[credenciado.latitude, credenciado.longitude]}
                      >
                        <Popup>
                          <div className="space-y-3 p-1">
                            <div>
                              <h3 className="font-semibold text-lg mb-2">
                                {credenciado.nome}
                              </h3>
                              <div className="flex flex-wrap gap-1 mb-3">
                                {credenciado.especialidades.map((esp, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {esp}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="text-sm space-y-2">
                              {credenciado.endereco && (
                                <p className="text-xs text-muted-foreground">{credenciado.endereco}</p>
                              )}
                              {credenciado.cidade && credenciado.estado && (
                                <p className="text-xs font-medium">
                                  {credenciado.cidade} - {credenciado.estado}
                                </p>
                              )}
                              {credenciado.telefone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs">{credenciado.telefone}</span>
                                </div>
                              )}
                              {credenciado.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs">{credenciado.email}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 pt-2 border-t">
                              <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" variant="outline" asChild>
                                  <Link to={`/credenciados/${credenciado.id}`}>
                                    Ver Perfil
                                  </Link>
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => centerMapOnLocation(credenciado.latitude, credenciado.longitude)}
                                >
                                  <Crosshair className="h-3 w-3 mr-1" />
                                  Centralizar
                                </Button>
                              </div>
                              
                              <Button 
                                size="sm" 
                                variant="default"
                                className="w-full"
                                asChild
                              >
                                <a
                                  href={getGoogleMapsUrl(credenciado.latitude, credenciado.longitude)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Navigation className="h-3 w-3 mr-1" />
                                  Como Chegar
                                </a>
                              </Button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </>
                ) : null}
            </MapContainer>

            {/* Overlay para estado vazio ou loading */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-[1000] pointer-events-none">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Carregando mapa...</p>
                </div>
              </div>
            )}

            {!isLoading && (!filteredCredenciados || filteredCredenciados.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[1000] pointer-events-none">
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

          {/* Legenda */}
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p><strong>Dica:</strong> Use o scroll do mouse para zoom, arraste para mover o mapa</p>
            <p><strong>Performance:</strong> Sistema otimizado para visualização de credenciados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
