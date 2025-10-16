import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCredenciadoAtual } from "@/hooks/useCredenciadoAtual";
import { Loader2, FileText, Users, Edit, Calendar, Award } from "lucide-react";
import { DadosCredenciamentoTab } from "@/components/credenciados/tabs/DadosCredenciamentoTab";
import { DocumentosCredenciadoTab } from "@/components/credenciados/tabs/DocumentosCredenciadoTab";
import { ProfissionaisCredenciadoTab } from "@/components/credenciados/tabs/ProfissionaisCredenciadoTab";
import { SolicitacoesAlteracaoTab } from "@/components/credenciados/tabs/SolicitacoesAlteracaoTab";
import { AfastamentosTab } from "@/components/credenciados/tabs/AfastamentosTab";
import { CertificadosTab } from "@/components/credenciados/tabs/CertificadosTab";

export default function MeuCredenciamento() {
  const { data: credenciado, isLoading } = useCredenciadoAtual();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!credenciado) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Credenciamento não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'Ativo': 'bg-success/10 text-success border-success/20',
    'Suspenso': 'bg-warning/10 text-warning border-warning/20',
    'Inativo': 'bg-muted text-muted-foreground',
    'Descredenciado': 'bg-destructive/10 text-destructive border-destructive/20'
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Meu Credenciamento</h1>
          <p className="text-muted-foreground">
            Número: <span className="font-medium text-foreground">{credenciado.numero_credenciado}</span>
          </p>
        </div>
        <Badge className={statusColors[credenciado.status] || 'bg-muted'}>
          {credenciado.status}
        </Badge>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Meus Dados</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="profissionais" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Profissionais</span>
          </TabsTrigger>
          <TabsTrigger value="solicitacoes" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">Solicitações</span>
          </TabsTrigger>
          <TabsTrigger value="afastamentos" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Licenças</span>
          </TabsTrigger>
          <TabsTrigger value="certificados" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Certificados</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <DadosCredenciamentoTab credenciado={credenciado} />
        </TabsContent>

        <TabsContent value="documentos">
          <DocumentosCredenciadoTab credenciadoId={credenciado.id} />
        </TabsContent>

        <TabsContent value="profissionais">
          <ProfissionaisCredenciadoTab credenciadoId={credenciado.id} />
        </TabsContent>

        <TabsContent value="solicitacoes">
          <SolicitacoesAlteracaoTab credenciadoId={credenciado.id} />
        </TabsContent>

        <TabsContent value="afastamentos">
          <AfastamentosTab credenciadoId={credenciado.id} />
        </TabsContent>

        <TabsContent value="certificados">
          <CertificadosTab credenciado={credenciado} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
