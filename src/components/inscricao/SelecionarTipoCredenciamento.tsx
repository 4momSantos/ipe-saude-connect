import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelecionarTipoCredenciamentoProps {
  onSelect: (tipo: 'PF' | 'PJ') => void;
  selectedTipo?: 'PF' | 'PJ' | null;
}

export function SelecionarTipoCredenciamento({ 
  onSelect, 
  selectedTipo 
}: SelecionarTipoCredenciamentoProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Escolha o Tipo de Credenciamento</h2>
        <p className="text-muted-foreground">
          Selecione como deseja se credenciar no sistema
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Card Pessoa Física */}
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-lg",
            selectedTipo === 'PF' && "ring-2 ring-primary shadow-lg"
          )}
          onClick={() => onSelect('PF')}
        >
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 relative">
              <div className={cn(
                "h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center",
                selectedTipo === 'PF' && "bg-primary"
              )}>
                <User className={cn(
                  "h-10 w-10 text-blue-600",
                  selectedTipo === 'PF' && "text-white"
                )} />
              </div>
              {selectedTipo === 'PF' && (
                <div className="absolute -top-2 -right-2 h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            <CardTitle className="text-xl">Pessoa Física</CardTitle>
            <CardDescription>Profissional Autônomo</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Profissional autônomo individual</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Consultório próprio</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Atendimento com CPF e CRM</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Processo de credenciamento simplificado</span>
              </li>
            </ul>
            
            <Button 
              className="w-full mt-6"
              variant={selectedTipo === 'PF' ? 'default' : 'outline'}
            >
              {selectedTipo === 'PF' ? 'Selecionado' : 'Selecionar Pessoa Física'}
            </Button>
          </CardContent>
        </Card>

        {/* Card Pessoa Jurídica */}
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-lg",
            selectedTipo === 'PJ' && "ring-2 ring-primary shadow-lg"
          )}
          onClick={() => onSelect('PJ')}
        >
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 relative">
              <div className={cn(
                "h-20 w-20 rounded-full bg-purple-100 flex items-center justify-center",
                selectedTipo === 'PJ' && "bg-primary"
              )}>
                <Building className={cn(
                  "h-10 w-10 text-purple-600",
                  selectedTipo === 'PJ' && "text-white"
                )} />
              </div>
              {selectedTipo === 'PJ' && (
                <div className="absolute -top-2 -right-2 h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            <CardTitle className="text-xl">Pessoa Jurídica</CardTitle>
            <CardDescription>Clínica ou Empresa</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Clínica, hospital ou empresa</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Múltiplos consultórios/unidades</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Atendimento com CNPJ</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Responsável técnico por unidade</span>
              </li>
            </ul>
            
            <Button 
              className="w-full mt-6"
              variant={selectedTipo === 'PJ' ? 'default' : 'outline'}
            >
              {selectedTipo === 'PJ' ? 'Selecionado' : 'Selecionar Pessoa Jurídica'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {selectedTipo && (
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Selecionado: <strong>{selectedTipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</strong>
          </p>
          <p className="mt-1">
            Clique em "Próximo" para continuar com o cadastro
          </p>
        </div>
      )}
    </div>
  );
}
