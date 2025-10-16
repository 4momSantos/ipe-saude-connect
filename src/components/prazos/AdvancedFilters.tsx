import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Download, RefreshCw } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface AdvancedFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filtroSituacaoPrazo: string | null;
  onFiltroSituacaoChange: (value: string | null) => void;
  filtroTipoDoc: string[];
  onFiltroTipoDocChange: (value: string[]) => void;
  tiposDisponiveis: string[];
  onClearFilters: () => void;
  onExport: (format: 'csv' | 'pdf') => void;
  onRefresh: () => void;
  incluirArquivados: boolean;
  onIncluirArquivadosChange: (value: boolean) => void;
}

export function AdvancedFilters({
  searchQuery,
  onSearchChange,
  filtroSituacaoPrazo,
  onFiltroSituacaoChange,
  filtroTipoDoc,
  onFiltroTipoDocChange,
  tiposDisponiveis,
  onClearFilters,
  onExport,
  onRefresh,
  incluirArquivados,
  onIncluirArquivadosChange
}: AdvancedFiltersProps) {
  
  const toggleTipoDoc = (tipo: string) => {
    if (filtroTipoDoc.includes(tipo)) {
      onFiltroTipoDocChange(filtroTipoDoc.filter(t => t !== tipo));
    } else {
      onFiltroTipoDocChange([...filtroTipoDoc, tipo]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Busca Principal */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, documento, protocolo, CPF/CNPJ..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10 max-w-2xl"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtros Rápidos */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Situação de Prazo */}
        <Select value={filtroSituacaoPrazo || 'todos'} onValueChange={(v) => onFiltroSituacaoChange(v === 'todos' ? null : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Situação Prazo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="vencido">⚠️ Vencidos</SelectItem>
            <SelectItem value="critico">🔴 Crítico (&lt;7 dias)</SelectItem>
            <SelectItem value="atencao">🟡 Atenção (7-15 dias)</SelectItem>
            <SelectItem value="normal">🟢 Normal (15-30 dias)</SelectItem>
            <SelectItem value="valido">✅ Válido (&gt;30 dias)</SelectItem>
          </SelectContent>
        </Select>

        {/* Tipo de Documento */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Tipo Doc {filtroTipoDoc.length > 0 && `(${filtroTipoDoc.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {tiposDisponiveis.map(tipo => (
              <DropdownMenuCheckboxItem
                key={tipo}
                checked={filtroTipoDoc.includes(tipo)}
                onCheckedChange={() => toggleTipoDoc(tipo)}
              >
                {tipo}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Incluir Arquivados */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Opções
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={incluirArquivados}
              onCheckedChange={onIncluirArquivadosChange}
            >
              Incluir Arquivados
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botões de Ação */}
        <div className="flex-1" />
        
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-2" />
          Limpar
        </Button>

        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem onClick={() => onExport('csv')}>
              Exportar CSV
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem onClick={() => onExport('pdf')}>
              Exportar PDF
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
