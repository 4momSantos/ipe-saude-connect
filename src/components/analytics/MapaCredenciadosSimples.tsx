import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCredenciadosMap, useGeocodingStats } from "@/hooks/useCredenciados";
import { Map as MapIcon, Phone, Mail, Navigation, Loader2, AlertCircle } from "lucide-react";
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

// Estados brasileiros
const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

interface MapaCredenciadosProps {
  height?: string;
}

export function MapaCredenciados({ height = "600px" }: MapaCredenciadosProps) {
  const [especialidadeFilter, setEspecialidadeFilter] = useState<string>("");
  const [cidadeFilter, setCidadeFilter] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  
  const { data: credenciados, isLoading, error } = useCredenciadosMap({
    especialidade: especialidadeFilter,
    cidade: cidadeFilter,
    estado: estadoFilter === "todos" ? undefined : estadoFilter,
  });

  const { data: stats } = useGeocodingStats();

  // Calcular centro do mapa baseado nos credenciados
  const mapCenter = useMemo(() => {
    if (!credenciados || credenciados.length === 0) {
      return [-14.235, -51.9253] as [number, number]; // Centro do Brasil
    }

    const avgLat = credenciados.reduce((sum, c) => sum + c.latitude, 0) / credenciados.length;
    const avgLng = credenciados.reduce((sum, c) => sum + c.longitude, 0) / credenciados.length;
    
    return [avgLat, avgLng] as [number, number];
  }, [credenciados]);

  const handleClearFilters = () => {
    setEspecialidadeFilter("");
    setCidadeFilter("");
    setEstadoFilter("todos");
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="especialidade">Especialidade</Label>
              <Input
                id="especialidade"
                placeholder="Ex: Cardiologia"
                value={especialidadeFilter}
                onChange={(e) => setEspecialidadeFilter(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                placeholder="Ex: São Paulo"
                value={cidadeFilter}
                onChange={(e) => setCidadeFilter(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger id="estado">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {ESTADOS.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={handleClearFilters}
                className="w-full"
              >
                Limpar Filtros
              </Button>
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
              <span>
                <strong>{credenciados?.length || 0}</strong> credenciados encontrados
              </span>
            )}
          </div>

          {/* Mapa */}
          <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-[1000]">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Carregando mapa...</p>
                </div>
              </div>
            ) : credenciados && credenciados.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[1000]">
                <div className="text-center p-6">
                  <MapIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">Nenhum credenciado encontrado</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {estadoFilter !== "todos" || cidadeFilter || especialidadeFilter
                      ? 'Tente ajustar os filtros para ver mais resultados'
                      : 'Execute o backfill de geocodificação para visualizar os credenciados no mapa'}
                  </p>
                </div>
              </div>
            ) : (
              <MapContainer
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {credenciados?.map((credenciado) => (
                  <Marker
                    key={credenciado.id}
                    position={[credenciado.latitude, credenciado.longitude]}
                  >
                    <Popup>
                      <div className="space-y-2 p-2 min-w-[250px]">
                        <div>
                          <h3 className="font-semibold text-base mb-1">
                            {credenciado.nome}
                          </h3>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {credenciado.especialidades.map((esp, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {esp}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="text-sm space-y-1 text-muted-foreground">
                          {credenciado.endereco && (
                            <p className="text-xs">{credenciado.endereco}</p>
                          )}
                          {credenciado.cidade && credenciado.estado && (
                            <p className="text-xs font-medium">
                              {credenciado.cidade} - {credenciado.estado}
                            </p>
                          )}
                          {credenciado.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">{credenciado.telefone}</span>
                            </div>
                          )}
                          {credenciado.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="text-xs">{credenciado.email}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                          <Button size="sm" variant="outline" asChild className="flex-1">
                            <Link to={`/credenciados/${credenciado.id}`}>
                              Ver Perfil
                            </Link>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default"
                            className="flex-1"
                            asChild
                          >
                            <a
                              href={getGoogleMapsUrl(
                                credenciado.latitude,
                                credenciado.longitude
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Navigation className="h-3 w-3 mr-1" />
                              Rotas
                            </a>
                          </Button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
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
