import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter, MapPin, Users, Activity, Layers } from "lucide-react";
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

      {/* Filtros Avançados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros Avançados
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
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Score Mínimo</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="0-100"
                value={filtros.scoreMinimo || ""}
                onChange={(e) =>
                  onFiltrosChange({ ...filtros, scoreMinimo: Number(e.target.value) || undefined })
                }
                className="h-8 mt-1"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onFiltrosChange({})}
              className="w-full"
            >
              Limpar Filtros
            </Button>
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
