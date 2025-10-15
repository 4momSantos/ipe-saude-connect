import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapaCredenciados } from "./MapaCredenciadosBasico";
import { useRedeProfissionais } from "@/hooks/useRedeAnalitica";
import { Search, Filter } from "lucide-react";

export function MapaRedeComScores() {
  const [filtros, setFiltros] = useState({
    especialidade: "",
    cidade: "",
    uf: "",
    score_minimo: 0
  });

  const { data: profissionais, isLoading } = useRedeProfissionais(filtros);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Especialidade</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ex: Cardiologia"
                  value={filtros.especialidade}
                  onChange={(e) => setFiltros({ ...filtros, especialidade: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Cidade</label>
              <Input
                placeholder="Ex: São Paulo"
                value={filtros.cidade}
                onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={filtros.uf} onValueChange={(value) => setFiltros({ ...filtros, uf: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="SP">São Paulo</SelectItem>
                  <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                  <SelectItem value="MG">Minas Gerais</SelectItem>
                  <SelectItem value="BA">Bahia</SelectItem>
                  <SelectItem value="PR">Paraná</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Score Mínimo</label>
              <Select 
                value={filtros.score_minimo.toString()} 
                onValueChange={(value) => setFiltros({ ...filtros, score_minimo: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos</SelectItem>
                  <SelectItem value="50">≥ 50</SelectItem>
                  <SelectItem value="70">≥ 70</SelectItem>
                  <SelectItem value="80">≥ 80</SelectItem>
                  <SelectItem value="90">≥ 90</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {!isLoading && profissionais && (
            <div className="mt-4 text-sm text-muted-foreground">
              {profissionais.length} profissionais encontrados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mapa */}
      <Card>
        <CardContent className="p-0">
          <MapaCredenciados height="600px" />
        </CardContent>
      </Card>
    </div>
  );
}
