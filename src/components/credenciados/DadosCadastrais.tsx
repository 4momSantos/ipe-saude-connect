import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Calendar, Building2, FileText } from "lucide-react";

interface DadosCadastraisProps {
  credenciado: {
    nome: string;
    cpfCnpj: string;
    crm: string;
    especialidade: string;
    email: string;
    telefone: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    dataCredenciamento: string;
  };
}

export function DadosCadastrais({ credenciado }: DadosCadastraisProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Informações Principais */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Informações Principais
          </CardTitle>
          <CardDescription>Dados cadastrais do credenciado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.nome}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                <p className="text-base font-medium text-foreground mt-1">{credenciado.cpfCnpj}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">CRM</label>
                <p className="text-base font-medium text-foreground mt-1">{credenciado.crm}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Especialidade Principal</label>
              <div className="mt-1">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {credenciado.especialidade}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data de Credenciamento
              </label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.dataCredenciamento}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações de Contato */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Informações de Contato
          </CardTitle>
          <CardDescription>Dados para comunicação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail
              </label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.telefone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card className="card-glow md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Endereço
          </CardTitle>
          <CardDescription>Localização do estabelecimento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Logradouro</label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.endereco}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">CEP</label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.cep}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cidade</label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.cidade}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.estado}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
