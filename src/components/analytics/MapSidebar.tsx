import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter, MapPin, Users, Activity, Layers, X } from "lucide-react";
import { FiltrosAvancadosMap } from "./FiltrosAvancadosMap";
import { useCidades } from "@/hooks/useCidades";
import type { FiltrosMap } from "./MapaUnificado";

interface MapSidebarProps {
  filtros: FiltrosMap;
  onFiltrosChange: (filtros: FiltrosMap) => void;
  stats: {
    total: number;
    ativos: number;
    especialidades: number;
    mediaScore?: number;
  };
  activeLayers: {
    credenciados: boolean;
    profissionais: boolean;
    densidade: boolean;
    zonas: boolean;
  };
  onLayersChange: (layers: any) => void;
  allowExport?: boolean;
  markers: any[];
}

export function MapSidebar({
  filtros,
  onFiltrosChange,
  stats,
  activeLayers,
  onLayersChange,
  allowExport = true,
  markers,
}: MapSidebarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const { data: cidades = [], isLoading: loadingCidades } = useCidades();

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filtros.status?.length) count += filtros.status.length;
    if (filtros.tipoProfissional?.length) count += filtros.tipoProfissional.length;
    if (filtros.especialidades?.length) count += filtros.especialidades.length;
    if (filtros.ufCrm?.length) count += filtros.ufCrm.length;
    if (filtros.estados?.length) count += filtros.estados.length;
    if (filtros.cidades?.length) count += filtros.cidades.length;
    if (filtros.scoreMinimo !== undefined) count++;
    if (filtros.scoreMaximo !== undefined) count++;
    if (filtros.atendimentosMinimo !== undefined) count++;
    if (filtros.atendimentosMaximo !== undefined) count++;
    if (filtros.produtividade) count++;
    if (filtros.avaliacaoMinima !== undefined) count++;
    if (filtros.notaQualidadeMin !== undefined) count++;
    if (filtros.notaExperienciaMin !== undefined) count++;
    if (filtros.apenasAvaliados) count++;
    if (filtros.raioKm) count++;
    return count;
  }, [filtros]);

  const handleExportCSV = () => {
    if (!markers.length) return;

    const headers = ["Nome", "Tipo", "Especialidades", "Score", "Endereço", "Cidade", "Estado", "Telefone", "Email"];
    const rows = markers.map(m => [
      m.nome,
      m.tipo,
      m.especialidades?.join("; ") || "",
      m.score || "",
      m.endereco || "",
      m.cidade || "",
      m.estado || "",
      m.telefone || "",
      m.email || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mapa-rede-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="w-80 space-y-4">
      {/* Busca Rápida */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4" />
            Busca Rápida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por nome..."
            value={filtros.busca || ""}
            onChange={(e) => onFiltrosChange({ ...filtros, busca: e.target.value })}
            className="h-9"
          />
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total:</span>
            <Badge variant="secondary">{stats.total}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ativos:</span>
            <Badge variant="default">{stats.ativos}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Especialidades:</span>
            <Badge variant="outline">{stats.especialidades}</Badge>
          </div>
          {stats.mediaScore !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Score Médio:</span>
              <Badge variant="secondary">{stats.mediaScore.toFixed(1)}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camadas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Camadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="layer-credenciados"
              checked={activeLayers.credenciados}
              onCheckedChange={(checked) =>
                onLayersChange({ ...activeLayers, credenciados: checked })
              }
            />
            <Label htmlFor="layer-credenciados" className="text-sm font-normal cursor-pointer flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Credenciados
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="layer-profissionais"
              checked={activeLayers.profissionais}
              onCheckedChange={(checked) =>
                onLayersChange({ ...activeLayers, profissionais: checked })
              }
            />
            <Label htmlFor="layer-profissionais" className="text-sm font-normal cursor-pointer flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Profissionais
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="layer-densidade"
              checked={activeLayers.densidade}
              onCheckedChange={(checked) =>
                onLayersChange({ ...activeLayers, densidade: checked })
              }
            />
            <Label htmlFor="layer-densidade" className="text-sm font-normal cursor-pointer flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
              Densidade
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="layer-zonas"
              checked={activeLayers.zonas}
              onCheckedChange={(checked) =>
                onLayersChange({ ...activeLayers, zonas: checked })
              }
            />
            <Label htmlFor="layer-zonas" className="text-sm font-normal cursor-pointer flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-purple-500" />
              Zonas
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Filtro por Cidade */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Cidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingCidades ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2">
              {cidades.map((cidade) => (
                <div key={cidade.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cidade-${cidade.id}`}
                    checked={filtros.cidades?.includes(cidade.nome) || false}
                    onCheckedChange={(checked) => {
                      const current = filtros.cidades || [];
                      onFiltrosChange({
                        ...filtros,
                        cidades: checked
                          ? [...current, cidade.nome]
                          : current.filter((c) => c !== cidade.nome),
                      });
                    }}
                  />
                  <Label
                    htmlFor={`cidade-${cidade.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {cidade.nome} - {cidade.uf}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtros Ativos */}
      {activeFiltersCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Filtros Ativos</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltrosChange({})}
              >
                Limpar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filtros.status?.map(status => (
                <Badge key={status} variant="secondary" className="gap-1">
                  {status}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => {
                    onFiltrosChange({
                      ...filtros,
                      status: filtros.status?.filter(s => s !== status)
                    });
                  }} />
                </Badge>
              ))}
              {filtros.especialidades?.map(esp => (
                <Badge key={esp} variant="secondary" className="gap-1">
                  {esp}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => {
                    onFiltrosChange({
                      ...filtros,
                      especialidades: filtros.especialidades?.filter(e => e !== esp)
                    });
                  }} />
                </Badge>
              ))}
              {filtros.estados?.map(estado => (
                <Badge key={estado} variant="secondary" className="gap-1">
                  {estado}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => {
                    onFiltrosChange({
                      ...filtros,
                      estados: filtros.estados?.filter(e => e !== estado)
                    });
                  }} />
                </Badge>
              ))}
              {filtros.cidades?.map(cidade => (
                <Badge key={cidade} variant="secondary" className="gap-1">
                  {cidade}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => {
                    onFiltrosChange({
                      ...filtros,
                      cidades: filtros.cidades?.filter(c => c !== cidade)
                    });
                  }} />
                </Badge>
              ))}
              {filtros.scoreMinimo !== undefined && (
                <Badge variant="secondary" className="gap-1">
                  Score ≥ {filtros.scoreMinimo}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => {
                    onFiltrosChange({ ...filtros, scoreMinimo: undefined });
                  }} />
                </Badge>
              )}
              {filtros.avaliacaoMinima !== undefined && (
                <Badge variant="secondary" className="gap-1">
                  Avaliação ≥ {filtros.avaliacaoMinima}⭐
                  <X className="h-3 w-3 cursor-pointer" onClick={() => {
                    onFiltrosChange({ ...filtros, avaliacaoMinima: undefined });
                  }} />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros Avançados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros Avançados
              {activeFiltersCount > 0 && (
                <Badge variant="default">{activeFiltersCount}</Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <FiltrosAvancadosMap filtros={filtros} onChange={onFiltrosChange} />
          </CardContent>
        )}
      </Card>

      {/* Exportação */}
      {allowExport && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!markers.length}
              className="w-full"
            >
              <Download className="h-3 w-3 mr-2" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
