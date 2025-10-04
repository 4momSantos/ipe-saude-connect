import { useState, useEffect } from "react";
import { FileText, Calendar, Users, CheckCircle2, Clock, Download, Eye, Plus, FileSearch, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FluxoCredenciamento } from "@/components/credenciamento/FluxoCredenciamento";
import { InscricaoWizard } from "@/components/inscricao/InscricaoWizard";
import { InscricaoCompletaForm } from "@/lib/inscricao-validation";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { EditalDetalhes } from "@/components/edital/EditalDetalhes";

type Edital = {
  id: string;
  titulo: string;
  descricao: string | null;
  numero_edital: string | null;
  objeto: string | null;
  data_inicio: string;
  data_fim: string;
  data_publicacao: string | null;
  data_licitacao: string | null;
  possui_vagas: boolean;
  vagas: number | null;
  status: string;
  especialidade: string | null;
  local_portal: string | null;
  prazo_validade_proposta: number | null;
  criterio_julgamento: string | null;
  garantia_execucao: number | null;
  fonte_recursos: string | null;
  participacao_permitida: any;
  regras_me_epp: string | null;
  documentos_habilitacao: any;
  anexos: any;
};

type Inscricao = {
  id: string;
  edital_id: string;
  status: string;
  motivo_rejeicao: string | null;
};

export default function Editais() {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [selectedEdital, setSelectedEdital] = useState<Edital | null>(null);
  const [selectedInscricao, setSelectedInscricao] = useState<Inscricao | null>(null);
  const [inscricaoEdital, setInscricaoEdital] = useState<Edital | null>(null);
  const [detalhesEdital, setDetalhesEdital] = useState<Edital | null>(null);
  const [loading, setLoading] = useState(true);
  const { isGestor, isAdmin, isCandidato } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar editais
      const { data: editaisData, error: editaisError } = await supabase
        .from("editais")
        .select("*")
        .order("created_at", { ascending: false });

      if (editaisError) throw editaisError;
      setEditais(editaisData || []);

      // Se for candidato, carregar suas inscrições
      if (isCandidato) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: inscricoesData, error: inscricoesError } = await supabase
            .from("inscricoes_edital")
            .select("*")
            .eq("candidato_id", user.id);

          if (inscricoesError) throw inscricoesError;
          setInscricoes(inscricoesData || []);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar editais");
    } finally {
      setLoading(false);
    }
  };

  const getInscricaoForEdital = (editalId: string) => {
    return inscricoes.find(i => i.edital_id === editalId);
  };

  const handleEditalClick = (edital: Edital) => {
    const inscricao = getInscricaoForEdital(edital.id);
    
    if (inscricao) {
      // Se já está inscrito, mostrar acompanhamento
      setSelectedEdital(edital);
      setSelectedInscricao(inscricao);
    } else {
      // Se não está inscrito, abrir formulário de inscrição
      setInscricaoEdital(edital);
    }
  };

  const handleSubmitInscricao = async (data: InscricaoCompletaForm) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (!inscricaoEdital) {
        throw new Error('Edital não selecionado');
      }

      // Verificar se o edital está disponível para inscrições
      const hoje = new Date();
      const dataFim = new Date(inscricaoEdital.data_fim);
      
      const statusValidos = ['publicado', 'aberto'];
      const statusOk = statusValidos.includes(inscricaoEdital.status);
      const antesDataFim = hoje <= dataFim;

      if (!statusOk || !antesDataFim) {
        throw new Error('Este edital não está mais aberto para inscrições');
      }

      const inscricaoData = {
        candidato_id: user.id,
        edital_id: inscricaoEdital.id,
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

      const { data: inscricaoResult, error } = await supabase
        .from('inscricoes_edital')
        .insert([inscricaoData])
        .select()
        .single();

      if (error) throw error;

      // Buscar workflow vinculada ao edital
      const { data: editalData } = await supabase
        .from('editais')
        .select('workflow_id')
        .eq('id', inscricaoEdital.id)
        .single();

      // Se houver workflow, executá-la automaticamente
      if (editalData?.workflow_id && inscricaoResult) {
        console.log('Executando workflow automaticamente...', editalData.workflow_id);
        
        try {
          const { data: functionData, error: functionError } = await supabase.functions.invoke('execute-workflow', {
            body: {
              workflowId: editalData.workflow_id,
              inscricaoId: inscricaoResult.id,
              inputData: inscricaoData.dados_inscricao
            }
          });

          if (functionError) {
            console.error('Erro ao executar workflow:', functionError);
            toast.error('Inscrição criada, mas houve um erro ao iniciar o workflow.');
          } else {
            console.log('Workflow iniciada:', functionData);
            toast.success('Inscrição enviada e workflow iniciada com sucesso!');
          }
        } catch (workflowError) {
          console.error('Erro ao executar workflow:', workflowError);
          toast.success('Inscrição enviada com sucesso! (Workflow será processada em breve)');
        }
      } else {
        toast.success('Inscrição enviada com sucesso!');
      }

      setInscricaoEdital(null);
      loadData(); // Recarregar dados para atualizar a lista
    } catch (error: any) {
      console.error('Erro ao enviar inscrição:', error);
      
      if (error.message?.includes('unique_candidato_edital')) {
        toast.error('Você já possui uma inscrição neste edital');
      } else {
        toast.error('Erro ao enviar inscrição: ' + (error.message || 'Tente novamente'));
      }
      throw error;
    }
  };

  const getStatusBadge = (edital: Edital) => {
    const inscricao = getInscricaoForEdital(edital.id);
    
    if (!inscricao) {
      // Verificar se o edital está aberto para inscrições
      const hoje = new Date();
      const dataFim = new Date(edital.data_fim);
      const statusAbertos = ['publicado', 'aberto'];
      
      if (statusAbertos.includes(edital.status) && hoje <= dataFim) {
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Aberto
          </Badge>
        );
      } else {
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
            Encerrado
          </Badge>
        );
      }
    }

    switch (inscricao.status) {
      case "em_analise":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Em Análise
          </Badge>
        );
      case "aprovado":
      case "aguardando_assinatura":
      case "assinado":
      case "ativo":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Inscrito
          </Badge>
        );
      case "rejeitado":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            Rejeitado
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando editais...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Editais</h1>
            <p className="text-muted-foreground mt-2">
              {isCandidato 
                ? "Editais disponíveis e acompanhamento das suas inscrições" 
                : "Processos de credenciamento"}
            </p>
          </div>
          {(isGestor || isAdmin) && (
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => navigate("/editais/criar")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Edital
            </Button>
          )}
        </div>

        <div className="grid gap-6">
          {editais.length === 0 ? (
            <Card className="border bg-card">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Nenhum edital disponível no momento</p>
              </CardContent>
            </Card>
          ) : (
            editais.map((edital) => {
              const inscricao = getInscricaoForEdital(edital.id);
              const isInscrito = !!inscricao;

              return (
                <Card 
                  key={edital.id} 
                  className={`border bg-card card-glow hover-lift transition-all duration-300 ${
                    isInscrito ? "ring-2 ring-primary/20" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <CardTitle className="text-foreground flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          {edital.titulo}
                        </CardTitle>
                        <CardDescription>{edital.descricao}</CardDescription>
                        {edital.especialidade && (
                          <Badge variant="secondary" className="mt-2">
                            {edital.especialidade}
                          </Badge>
                        )}
                      </div>
                      {getStatusBadge(edital)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(edital.data_inicio).toLocaleDateString("pt-BR")} -{" "}
                          {new Date(edital.data_fim).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {edital.possui_vagas 
                            ? `${edital.vagas} vagas disponíveis` 
                            : 'Sem limite de vagas'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3 flex-wrap">
                      {(isGestor || isAdmin) && (
                        <Button 
                          onClick={() => navigate(`/editais/editar/${edital.id}`)}
                          variant="outline" 
                          className="border-border hover:bg-card"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      )}
                      {isInscrito ? (
                        <Button 
                          onClick={() => handleEditalClick(edital)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Acompanhar Processo
                        </Button>
                      ) : isCandidato ? (
                        <>
                          <Button 
                            onClick={() => setDetalhesEdital(edital)}
                            variant="outline" 
                            className="border-border hover:bg-card"
                          >
                            <FileSearch className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                          <Button 
                            onClick={() => setInscricaoEdital(edital)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Inscrever-se
                          </Button>
                        </>
                      ) : (
                        <Button 
                          onClick={() => setDetalhesEdital(edital)}
                          variant="outline" 
                          className="border-border hover:bg-card"
                        >
                          <FileSearch className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Sheet para acompanhamento */}
      <Sheet open={!!selectedEdital} onOpenChange={(open) => {
        if (!open) {
          setSelectedEdital(null);
          setSelectedInscricao(null);
        }
      }}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {selectedEdital?.titulo}
            </SheetTitle>
            <SheetDescription>
              Acompanhe o status do seu processo de credenciamento
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            {selectedInscricao && (
              <FluxoCredenciamento 
                status={selectedInscricao.status as "em_analise" | "aprovado" | "aguardando_assinatura" | "assinado" | "ativo" | "rejeitado"}
                motivoRejeicao={selectedInscricao.motivo_rejeicao || undefined}
                inscricaoId={selectedInscricao.id}
                onAssinarContrato={async () => {
                  try {
                    const { error } = await supabase
                      .from("inscricoes_edital")
                      .update({ status: "assinado" })
                      .eq("id", selectedInscricao.id);

                    if (error) throw error;

                    toast.success("Contrato assinado com sucesso!");
                    loadData();
                    setSelectedEdital(null);
                    setSelectedInscricao(null);
                  } catch (error) {
                    console.error("Erro ao assinar contrato:", error);
                    toast.error("Erro ao assinar contrato");
                  }
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog para detalhes do edital */}
      <Dialog open={!!detalhesEdital} onOpenChange={(open) => {
        if (!open) setDetalhesEdital(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalhes do Edital
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre o processo de credenciamento
            </DialogDescription>
          </DialogHeader>
          {detalhesEdital && <EditalDetalhes edital={detalhesEdital} />}
        </DialogContent>
      </Dialog>

      {/* Dialog para nova inscrição */}
      <Dialog open={!!inscricaoEdital} onOpenChange={(open) => {
        if (!open) setInscricaoEdital(null);
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inscrição em Edital</DialogTitle>
            <DialogDescription>
              {inscricaoEdital?.titulo} - Preencha o formulário completo de inscrição
            </DialogDescription>
          </DialogHeader>
          <InscricaoWizard 
            editalId={inscricaoEdital?.id || ''}
            editalTitulo={inscricaoEdital?.titulo || ''}
            onSubmit={handleSubmitInscricao} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
