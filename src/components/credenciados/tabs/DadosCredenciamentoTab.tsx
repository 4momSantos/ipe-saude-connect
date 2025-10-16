import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataDisplay } from '@/components/common/DataDisplay';
import { Badge } from '@/components/ui/badge';
import { 
  FileEdit, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  Building2,
  Calendar,
  Hash,
  FileText
} from 'lucide-react';
import { useState } from 'react';
import { SolicitarAlteracaoDialog } from '../SolicitarAlteracaoDialog';
import { format } from 'date-fns';

interface DadosCredenciamentoTabProps {
  credenciado: any;
}

export function DadosCredenciamentoTab({ credenciado }: DadosCredenciamentoTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const statusColors: Record<string, string> = {
    'Ativo': 'bg-success/10 text-success border-success/20',
    'Suspenso': 'bg-warning/10 text-warning border-warning/20',
    'Inativo': 'bg-muted text-muted-foreground',
    'Descredenciado': 'bg-destructive/10 text-destructive border-destructive/20'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Meus Dados Cadastrais</h2>
        <Button onClick={() => setDialogOpen(true)} variant="outline">
          <FileEdit className="mr-2 h-4 w-4" />
          Solicitar Alteração
        </Button>
      </div>

      {/* Dados Principais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
            <Badge className={statusColors[credenciado.status] || 'bg-muted'}>
              {credenciado.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <DataDisplay label="Número do Credenciado" value={credenciado.numero_credenciado} icon={Hash} />
          <DataDisplay label="Nome / Razão Social" value={credenciado.nome} icon={User} />
          <DataDisplay label="CPF" value={credenciado.cpf} icon={FileText} />
          <DataDisplay label="CNPJ" value={credenciado.cnpj} icon={Building2} />
          <DataDisplay label="RG" value={credenciado.rg} icon={FileText} />
          <DataDisplay 
            label="Data de Nascimento" 
            value={credenciado.data_nascimento ? format(new Date(credenciado.data_nascimento), 'dd/MM/yyyy') : null} 
            icon={Calendar} 
          />
          <DataDisplay label="Porte" value={credenciado.porte} icon={Building2} />
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contatos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DataDisplay label="Email" value={credenciado.email} icon={Mail} />
          <DataDisplay label="Telefone" value={credenciado.telefone} icon={Phone} />
          <DataDisplay label="Celular" value={credenciado.celular} icon={Phone} />
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço e Localização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DataDisplay label="Endereço Completo" value={credenciado.endereco} icon={MapPin} />
          <DataDisplay label="Cidade" value={credenciado.cidade} />
          <DataDisplay label="Estado" value={credenciado.estado} />
          <DataDisplay label="CEP" value={credenciado.cep} />
          {credenciado.latitude && credenciado.longitude && (
            <div className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">Coordenadas</p>
              <p className="text-sm font-mono">
                Lat: {credenciado.latitude?.toFixed(6)}, Long: {credenciado.longitude?.toFixed(6)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categorias */}
      {credenciado.credenciado_categorias && credenciado.credenciado_categorias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Categorias de Estabelecimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {credenciado.credenciado_categorias.map((cat: any) => (
                <Badge key={cat.id} variant={cat.principal ? "default" : "outline"}>
                  {cat.categorias_estabelecimentos?.nome}
                  {cat.principal && " (Principal)"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Datas Importantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Datas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DataDisplay 
            label="Data de Solicitação" 
            value={credenciado.data_solicitacao ? format(new Date(credenciado.data_solicitacao), 'dd/MM/yyyy HH:mm') : null} 
          />
          <DataDisplay 
            label="Data de Habilitação" 
            value={credenciado.data_habilitacao ? format(new Date(credenciado.data_habilitacao), 'dd/MM/yyyy') : null} 
          />
          <DataDisplay 
            label="Data de Início de Atendimento" 
            value={credenciado.data_inicio_atendimento ? format(new Date(credenciado.data_inicio_atendimento), 'dd/MM/yyyy') : null} 
          />
        </CardContent>
      </Card>

      {credenciado.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{credenciado.observacoes}</p>
          </CardContent>
        </Card>
      )}

      <SolicitarAlteracaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        credenciadoId={credenciado.id}
      />
    </div>
  );
}
