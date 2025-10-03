import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InscricaoWizard } from "@/components/inscricao/InscricaoWizard";
import { InscricaoCompletaForm } from "@/lib/inscricao-validation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Inscricoes() {
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleSubmitInscricao = async (data: InscricaoCompletaForm) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Preparar dados para inserção
      const inscricaoData = {
        candidato_id: user.id,
        edital_id: '00000000-0000-0000-0000-000000000000',
        status: 'em_analise',
        dados_inscricao: {
          dados_pessoais: {
            crm: data.crm,
            uf_crm: data.uf_crm,
            nome_completo: data.nome_completo,
            cpf: data.cpf,
            rg: data.rg,
            orgao_emissor: data.orgao_emissor,
            nit_pis_pasep: data.nit_pis_pasep,
            data_nascimento: data.data_nascimento.toISOString(),
            sexo: data.sexo,
          },
          pessoa_juridica: {
            cnpj: data.cnpj,
            denominacao_social: data.denominacao_social,
            endereco: {
              logradouro: data.logradouro,
              numero: data.numero,
              complemento: data.complemento,
              bairro: data.bairro,
              cidade: data.cidade,
              estado: data.estado,
              cep: data.cep,
            },
            contatos: {
              telefone: data.telefone,
              celular: data.celular,
              email: data.email,
            },
            dados_bancarios: {
              agencia: data.banco_agencia,
              conta: data.banco_conta,
            },
            optante_simples: data.optante_simples,
          },
          endereco_correspondencia: {
            endereco: data.endereco_correspondencia,
            telefone: data.telefone_correspondencia,
            celular: data.celular_correspondencia,
            email: data.email_correspondencia,
          },
          consultorio: {
            endereco: data.endereco_consultorio,
            telefone: data.telefone_consultorio,
            ramal: data.ramal,
            especialidade_principal: data.especialidade_principal,
            especialidade_secundaria: data.especialidade_secundaria,
            quantidade_consultas_minima: data.quantidade_consultas_minima,
            atendimento_hora_marcada: data.atendimento_hora_marcada,
            horarios: data.horarios,
          },
          documentos: data.documentos.map(d => ({
            tipo: d.tipo,
            status: d.status,
            observacoes: d.observacoes,
          })),
        },
      };

      const { error } = await supabase
        .from('inscricoes_edital')
        .insert([inscricaoData]);

      if (error) throw error;

      toast.success('Inscrição enviada com sucesso!', {
        description: 'Você será notificado sobre o andamento da análise.',
      });

      setWizardOpen(false);
    } catch (error) {
      console.error('Erro ao enviar inscrição:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Inscrições</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas inscrições em editais de credenciamento
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Nova Inscrição
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Processo de Inscrição</CardTitle>
          <CardDescription>
            O formulário de inscrição é dividido em 5 etapas para facilitar o preenchimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Dados Pessoais</h3>
              <p className="text-xs text-muted-foreground">Informações do médico</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Pessoa Jurídica</h3>
              <p className="text-xs text-muted-foreground">Dados da empresa</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Consultório</h3>
              <p className="text-xs text-muted-foreground">Especialidades e horários</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Documentos</h3>
              <p className="text-xs text-muted-foreground">Upload de arquivos</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Revisão</h3>
              <p className="text-xs text-muted-foreground">Conferir e enviar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Inscrição em Edital</DialogTitle>
            <DialogDescription>
              Preencha o formulário completo de inscrição em etapas
            </DialogDescription>
          </DialogHeader>
          <InscricaoWizard onSubmit={handleSubmitInscricao} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
