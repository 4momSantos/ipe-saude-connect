import { useState, useMemo } from 'react';
import { Search, User, Stethoscope } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useProfissionaisCredenciado } from '@/hooks/useProfissionaisCredenciado';
import type { ProfissionalCredenciado } from '@/hooks/useProfissionaisCredenciado';
import { cn } from '@/lib/utils';

interface SeletorProfissionalProps {
  credenciadoId: string;
  value: string | null;
  onChange: (profissionalId: string | null, profissional: ProfissionalCredenciado | null) => void;
  className?: string;
}

export function SeletorProfissional({ 
  credenciadoId, 
  value, 
  onChange,
  className 
}: SeletorProfissionalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: profissionais = [], isLoading } = useProfissionaisCredenciado(credenciadoId);

  const profissionaisFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return profissionais;
    
    const term = searchTerm.toLowerCase();
    return profissionais.filter(
      (p) =>
        p.nome.toLowerCase().includes(term) ||
        p.especialidade.toLowerCase().includes(term) ||
        p.crm.toLowerCase().includes(term)
    );
  }, [profissionais, searchTerm]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-2">
        <Label>Profissional Atendido (Opcional)</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, especialidade ou CRM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {profissionais.length} profissional(is) disponível(is)
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando profissionais...</div>
      ) : profissionaisFiltrados.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {searchTerm ? 'Nenhum profissional encontrado com este termo' : 'Nenhum profissional cadastrado'}
        </div>
      ) : (
        <RadioGroup 
          value={value || ''} 
          onValueChange={(val) => {
            if (val === value) {
              onChange(null, null);
            } else {
              const prof = profissionais.find(p => p.id === val);
              onChange(val, prof || null);
            }
          }}
          className="space-y-2 max-h-[300px] overflow-y-auto"
        >
          {profissionaisFiltrados.map((profissional) => (
            <Card 
              key={profissional.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                value === profissional.id && 'ring-2 ring-primary'
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <RadioGroupItem 
                    value={profissional.id} 
                    id={profissional.id}
                    className="mt-1"
                  />
                  <label 
                    htmlFor={profissional.id} 
                    className="flex-1 cursor-pointer space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{profissional.nome}</span>
                      {profissional.principal && (
                        <Badge variant="secondary" className="text-xs">Principal</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Stethoscope className="h-3 w-3" />
                      <span>{profissional.especialidade}</span>
                      <span>•</span>
                      <span>CRM {profissional.crm}/{profissional.uf_crm}</span>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}
