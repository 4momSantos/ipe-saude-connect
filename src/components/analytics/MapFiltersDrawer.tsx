import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MapFiltersDrawerProps {
  onFiltersChange: (filters: {
    search: string;
    especialidades: string[];
    estados: string[];
    cidades: string[];
  }) => void;
  defaultOpen?: boolean;
}

export function MapFiltersDrawer({ onFiltersChange, defaultOpen = false }: MapFiltersDrawerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [search, setSearch] = useState("");
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<string[]>([]);
  const [selectedEstados, setSelectedEstados] = useState<string[]>([]);
  const [selectedCidades, setSelectedCidades] = useState<string[]>([]);

  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    onFiltersChange({
      search,
      especialidades: selectedEspecialidades,
      estados: selectedEstados,
      cidades: selectedCidades,
    });
  }, [search, selectedEspecialidades, selectedEstados, selectedCidades]);

  async function loadFilterOptions() {
    try {
      // Carregar especialidades únicas
      const { data: espData } = await supabase
        .from('credenciado_crms')
        .select('especialidade');
      
      const uniqueEsp = [...new Set(espData?.map(e => e.especialidade) || [])].sort();
      setEspecialidades(uniqueEsp);

      // Carregar estados e cidades
      const { data: credData } = await supabase
        .from('credenciados')
        .select('estado, cidade')
        .eq('status', 'Ativo')
        .not('latitude', 'is', null);

      const uniqueEstados = [...new Set(credData?.map(c => c.estado).filter(Boolean) || [])].sort();
      const uniqueCidades = [...new Set(credData?.map(c => c.cidade).filter(Boolean) || [])].sort();

      setEstados(uniqueEstados);
      setCidades(uniqueCidades);
    } catch (error) {
      console.error('Erro ao carregar opções de filtro:', error);
    }
  }

  const handleClearFilters = () => {
    setSearch("");
    setSelectedEspecialidades([]);
    setSelectedEstados([]);
    setSelectedCidades([]);
  };

  const toggleEspecialidade = (esp: string) => {
    setSelectedEspecialidades(prev =>
      prev.includes(esp) ? prev.filter(e => e !== esp) : [...prev, esp]
    );
  };

  const toggleEstado = (estado: string) => {
    setSelectedEstados(prev =>
      prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
    );
  };

  const toggleCidade = (cidade: string) => {
    setSelectedCidades(prev =>
      prev.includes(cidade) ? prev.filter(c => c !== cidade) : [...prev, cidade]
    );
  };

  const activeFiltersCount = 
    selectedEspecialidades.length + 
    selectedEstados.length + 
    selectedCidades.length +
    (search ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2" aria-label="Abrir filtros do mapa">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]" aria-labelledby="filters-title">
        <SheetHeader>
          <SheetTitle id="filters-title">Filtros do Mapa</SheetTitle>
          <SheetDescription>
            Refine a visualização dos credenciados no mapa
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search-input">Buscar por nome</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-input"
                placeholder="Digite o nome do credenciado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Campo de busca por nome"
              />
            </div>
          </div>

          <Separator />

          {/* Especialidades */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Especialidades</Label>
              {selectedEspecialidades.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEspecialidades([])}
                  className="h-6 px-2"
                >
                  Limpar
                </Button>
              )}
            </div>
            <ScrollArea className="h-[150px] rounded-md border p-3">
              <div className="space-y-2">
                {especialidades.map((esp) => (
                  <div key={esp} className="flex items-center space-x-2">
                    <Checkbox
                      id={`esp-${esp}`}
                      checked={selectedEspecialidades.includes(esp)}
                      onCheckedChange={() => toggleEspecialidade(esp)}
                      aria-label={`Filtrar por ${esp}`}
                    />
                    <label
                      htmlFor={`esp-${esp}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {esp}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Estados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Estados</Label>
              {selectedEstados.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEstados([])}
                  className="h-6 px-2"
                >
                  Limpar
                </Button>
              )}
            </div>
            <ScrollArea className="h-[150px] rounded-md border p-3">
              <div className="space-y-2">
                {estados.map((estado) => (
                  <div key={estado} className="flex items-center space-x-2">
                    <Checkbox
                      id={`estado-${estado}`}
                      checked={selectedEstados.includes(estado)}
                      onCheckedChange={() => toggleEstado(estado)}
                      aria-label={`Filtrar por estado ${estado}`}
                    />
                    <label
                      htmlFor={`estado-${estado}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {estado}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Cidades */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Cidades</Label>
              {selectedCidades.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCidades([])}
                  className="h-6 px-2"
                >
                  Limpar
                </Button>
              )}
            </div>
            <ScrollArea className="h-[150px] rounded-md border p-3">
              <div className="space-y-2">
                {cidades.map((cidade) => (
                  <div key={cidade} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cidade-${cidade}`}
                      checked={selectedCidades.includes(cidade)}
                      onCheckedChange={() => toggleCidade(cidade)}
                      aria-label={`Filtrar por cidade ${cidade}`}
                    />
                    <label
                      htmlFor={`cidade-${cidade}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {cidade}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="flex-1 gap-2"
              disabled={activeFiltersCount === 0}
            >
              <X className="h-4 w-4" />
              Limpar Tudo
            </Button>
            <Button
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
