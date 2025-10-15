import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Star, Activity, MapPin } from "lucide-react";
import { useFiltroOptions } from "@/hooks/useFiltroOptions";
import type { FiltrosMap } from "./MapaUnificado";

interface FiltrosAvancadosMapProps {
  filtros: FiltrosMap;
  onChange: (filtros: FiltrosMap) => void;
}

export function FiltrosAvancadosMap({ filtros, onChange }: FiltrosAvancadosMapProps) {
  const { especialidades, estados, cidadesPorEstado, ufsCrm, isLoading } = useFiltroOptions();

  const getActiveFiltersCount = (keys: (keyof FiltrosMap)[]) => {
    return keys.reduce((count, key) => {
      const value = filtros[key];
      if (Array.isArray(value) && value.length > 0) return count + 1;
      if (typeof value === 'number' && value !== undefined) return count + 1;
      if (typeof value === 'string' && value) return count + 1;
      if (typeof value === 'boolean' && value) return count + 1;
      return count;
    }, 0);
  };

  const cidadesFiltradas = filtros.estados?.length === 1
    ? [...new Set(cidadesPorEstado
        .filter(c => c.estado === filtros.estados[0])
        .map(c => c.cidade)
        .filter(Boolean)
      )].sort()
    : [];

  return (
    <Accordion type="multiple" className="w-full">
      {/* PERFIL DA REDE */}
      <AccordionItem value="perfil">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Perfil da Rede
            {getActiveFiltersCount(['status', 'tipoProfissional']) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount(['status', 'tipoProfissional'])}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          {/* Status */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Status</Label>
            <div className="space-y-2">
              {['Ativo', 'Inativo', 'Suspenso'].map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filtros.status?.includes(status as any)}
                    onCheckedChange={(checked) => {
                      const current = filtros.status || [];
                      onChange({
                        ...filtros,
                        status: checked
                          ? [...current, status as any]
                          : current.filter(s => s !== status),
                      });
                    }}
                  />
                  <Label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Tipo de Profissional */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Tipo de Profissional</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tipo-principal"
                  checked={filtros.tipoProfissional?.includes('principal')}
                  onCheckedChange={(checked) => {
                    const current = filtros.tipoProfissional || [];
                    onChange({
                      ...filtros,
                      tipoProfissional: checked
                        ? [...current, 'principal']
                        : current.filter(t => t !== 'principal'),
                    });
                  }}
                />
                <Label htmlFor="tipo-principal" className="text-sm cursor-pointer">
                  Principal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tipo-secundario"
                  checked={filtros.tipoProfissional?.includes('secundario')}
                  onCheckedChange={(checked) => {
                    const current = filtros.tipoProfissional || [];
                    onChange({
                      ...filtros,
                      tipoProfissional: checked
                        ? [...current, 'secundario']
                        : current.filter(t => t !== 'secundario'),
                    });
                  }}
                />
                <Label htmlFor="tipo-secundario" className="text-sm cursor-pointer">
                  Secundário
                </Label>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* DESEMPENHO */}
      <AccordionItem value="desempenho">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Desempenho
            {getActiveFiltersCount(['scoreMinimo', 'scoreMaximo', 'atendimentosMinimo', 'atendimentosMaximo', 'produtividade']) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount(['scoreMinimo', 'scoreMaximo', 'atendimentosMinimo', 'atendimentosMaximo', 'produtividade'])}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          {/* Score Range */}
          <div>
            <Label className="text-xs font-medium mb-2 block">
              Score Geral: {filtros.scoreMinimo || 0} - {filtros.scoreMaximo || 100}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Mín"
                min="0"
                max="100"
                value={filtros.scoreMinimo || ''}
                onChange={(e) => onChange({ ...filtros, scoreMinimo: Number(e.target.value) || undefined })}
                className="h-8"
              />
              <Input
                type="number"
                placeholder="Máx"
                min="0"
                max="100"
                value={filtros.scoreMaximo || ''}
                onChange={(e) => onChange({ ...filtros, scoreMaximo: Number(e.target.value) || undefined })}
                className="h-8"
              />
            </div>
          </div>

          {/* Atendimentos */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Atendimentos Mensais</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Mínimo"
                value={filtros.atendimentosMinimo || ''}
                onChange={(e) => onChange({ ...filtros, atendimentosMinimo: Number(e.target.value) || undefined })}
                className="h-8"
              />
              <Input
                type="number"
                placeholder="Máximo"
                value={filtros.atendimentosMaximo || ''}
                onChange={(e) => onChange({ ...filtros, atendimentosMaximo: Number(e.target.value) || undefined })}
                className="h-8"
              />
            </div>
          </div>

          {/* Produtividade */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Produtividade</Label>
            <Select
              value={filtros.produtividade || ''}
              onValueChange={(value) => onChange({ ...filtros, produtividade: value as any || undefined })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta (≥80% meta)</SelectItem>
                <SelectItem value="media">Média (60-79%)</SelectItem>
                <SelectItem value="baixa">Baixa (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* AVALIAÇÃO */}
      <AccordionItem value="avaliacao">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Avaliação
            {getActiveFiltersCount(['avaliacaoMinima', 'notaQualidadeMin', 'notaExperienciaMin', 'apenasAvaliados']) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount(['avaliacaoMinima', 'notaQualidadeMin', 'notaExperienciaMin', 'apenasAvaliados'])}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          {/* Avaliação Mínima */}
          <div>
            <Label className="text-xs font-medium mb-2 block">
              Avaliação Média Mínima: {filtros.avaliacaoMinima || 0}⭐
            </Label>
            <Slider
              value={[filtros.avaliacaoMinima || 0]}
              onValueChange={([value]) => onChange({ ...filtros, avaliacaoMinima: value })}
              max={5}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Nota Qualidade */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Qualidade Mínima</Label>
            <Input
              type="number"
              placeholder="1-5"
              min="1"
              max="5"
              step="0.1"
              value={filtros.notaQualidadeMin || ''}
              onChange={(e) => onChange({ ...filtros, notaQualidadeMin: Number(e.target.value) || undefined })}
              className="h-8"
            />
          </div>

          {/* Nota Experiência */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Experiência Mínima</Label>
            <Input
              type="number"
              placeholder="1-5"
              min="1"
              max="5"
              step="0.1"
              value={filtros.notaExperienciaMin || ''}
              onChange={(e) => onChange({ ...filtros, notaExperienciaMin: Number(e.target.value) || undefined })}
              className="h-8"
            />
          </div>

          {/* Apenas Avaliados */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="apenas-avaliados"
              checked={filtros.apenasAvaliados || false}
              onCheckedChange={(checked) => onChange({ ...filtros, apenasAvaliados: checked as boolean })}
            />
            <Label htmlFor="apenas-avaliados" className="text-sm cursor-pointer">
              Apenas profissionais com avaliações
            </Label>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ESPECIALIDADE */}
      <AccordionItem value="especialidade">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Especialidade
            {(filtros.especialidades?.length || 0) + (filtros.ufCrm?.length || 0) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {(filtros.especialidades?.length || 0) + (filtros.ufCrm?.length || 0)}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          {/* Especialidades */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Especialidades Médicas</Label>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                {especialidades.map((esp) => (
                  <div key={esp} className="flex items-center space-x-2">
                    <Checkbox
                      id={`esp-${esp}`}
                      checked={filtros.especialidades?.includes(esp)}
                      onCheckedChange={(checked) => {
                        const current = filtros.especialidades || [];
                        onChange({
                          ...filtros,
                          especialidades: checked
                            ? [...current, esp]
                            : current.filter(e => e !== esp),
                        });
                      }}
                    />
                    <Label htmlFor={`esp-${esp}`} className="text-xs cursor-pointer">
                      {esp}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* UF CRM */}
          <div>
            <Label className="text-xs font-medium mb-2 block">UF do CRM</Label>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-2">
                {ufsCrm.map((uf) => (
                  <div key={uf} className="flex items-center space-x-2">
                    <Checkbox
                      id={`uf-crm-${uf}`}
                      checked={filtros.ufCrm?.includes(uf)}
                      onCheckedChange={(checked) => {
                        const current = filtros.ufCrm || [];
                        onChange({
                          ...filtros,
                          ufCrm: checked
                            ? [...current, uf]
                            : current.filter(u => u !== uf),
                        });
                      }}
                    />
                    <Label htmlFor={`uf-crm-${uf}`} className="text-xs cursor-pointer">
                      {uf}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* GEOGRÁFICO */}
      <AccordionItem value="geografico">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localização
            {(filtros.estados?.length || 0) + (filtros.cidades?.length || 0) + (filtros.raioKm ? 1 : 0) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {(filtros.estados?.length || 0) + (filtros.cidades?.length || 0) + (filtros.raioKm ? 1 : 0)}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          {/* Estados */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Estados</Label>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-2">
                {estados.map((estado) => (
                  <div key={estado} className="flex items-center space-x-2">
                    <Checkbox
                      id={`estado-${estado}`}
                      checked={filtros.estados?.includes(estado)}
                      onCheckedChange={(checked) => {
                        const current = filtros.estados || [];
                        onChange({
                          ...filtros,
                          estados: checked
                            ? [...current, estado]
                            : current.filter(e => e !== estado),
                        });
                      }}
                    />
                    <Label htmlFor={`estado-${estado}`} className="text-xs cursor-pointer">
                      {estado}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cidades */}
          {filtros.estados?.length === 1 && cidadesFiltradas.length > 0 && (
            <div>
              <Label className="text-xs font-medium mb-2 block">Cidades</Label>
              <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-2">
                {cidadesFiltradas.map((cidade) => (
                  <div key={cidade} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cidade-${cidade}`}
                      checked={filtros.cidades?.includes(cidade)}
                      onCheckedChange={(checked) => {
                        const current = filtros.cidades || [];
                        onChange({
                          ...filtros,
                          cidades: checked
                            ? [...current, cidade]
                            : current.filter(c => c !== cidade),
                        });
                      }}
                    />
                    <Label htmlFor={`cidade-${cidade}`} className="text-xs cursor-pointer">
                      {cidade}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raio de Proximidade */}
          <div>
            <Label className="text-xs font-medium mb-2 block">
              Raio de Proximidade: {filtros.raioKm || 0} km
            </Label>
            <Slider
              value={[filtros.raioKm || 0]}
              onValueChange={([value]) => onChange({ ...filtros, raioKm: value })}
              max={200}
              step={10}
              className="w-full"
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
