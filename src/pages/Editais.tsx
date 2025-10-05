import { useState, useEffect } from "react";
import { FileText, Calendar, Users, CheckCircle2, Clock, Download, Eye, Plus, FileSearch, Edit, Trash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FluxoCredenciamento } from "@/components/credenciamento/FluxoCredenciamento";
import { InscricaoWizard } from "@/components/inscricao/InscricaoWizard";
import { RascunhoDialog } from "@/components/inscricao/RascunhoDialog";
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
  const [rascunhoData, setRascunhoData] = useState<{ id: string; lastSaved: Date } | null>(null);
  const [isRascunhoDialogOpen, setIsRascunhoDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const { isGestor, isAdmin, isCandidato } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Base query
      let query = supabase
        .from("editais")
        .select("*")
        .order("created_at", { ascending: false });

      // Filtro adicional para candidatos (camada extra de segurança)
      if (isCandidato && !isGestor && !isAdmin) {
        console.log('[Editais] Aplicando filtro de candidato: apenas publicados/abertos');
        query = query.in("status", ["publicado", "aberto"]);
      }

      const { data: editaisData, error: editaisError } = await query;

      if (editaisError) throw editaisError;
      setEditais(editaisData || []);

      // Se for candidato, carregar suas inscrições
      if (isCandidato) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: inscricoesData, error: inscricoesError } = await supabase
            .from("inscricoes_edital")
            .select("*")
            .eq("candidato_id", user.id)
            .neq("status", "rascunho"); // ✅ EXCLUIR RASCUNHOS

          if (inscricoesError) throw inscricoesError;
          
          console.log('[Editais] Inscrições carregadas:', {
            total: inscricoesData?.length,
            porStatus: inscricoesData?.reduce((acc, i) => {
              acc[i.status] = (acc[i.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          });
          
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
    const inscricao = inscricoes.find((i) => i.edital_id === editalId && i.status !== 'rascunho');
    console.log('[Editais] Buscando inscrição para edital', editalId, '→', inscricao?.status || 'não encontrada');
    return inscricao;
  };

  const handleEditalClick = async (edital: Edital) => {
    const inscricao = getInscricaoForEdital(edital.id);
    
    if (inscricao) {
      // Se já está inscrito, mostrar acompanhamento
      setSelectedEdital(edital);
      setSelectedInscricao(inscricao);
    } else {
      // Verificar se existe rascunho
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar autenticado para se inscrever');
        return;
      }

      const { data: rascunho, error } = await supabase
        .from('inscricoes_edital')
        .select('*')
        .eq('candidato_id', user.id)
        .eq('edital_id', edital.id)
        .eq('status', 'rascunho')
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar rascunho:', error);
      }

      setInscricaoEdital(edital);

      if (rascunho) {
        // Tem rascunho - mostrar dialog
        setRascunhoData({
          id: rascunho.id,
          lastSaved: new Date(rascunho.updated_at)
        });
        setIsRascunhoDialogOpen(true);
      }
      // Se não tem rascunho, o dialog abre normalmente
    }
  };

  const handleContinueRascunho = () => {
    setIsRascunhoDialogOpen(false);
    // inscricaoEdital já está setado, apenas fecha o dialog
  };

  const handleStartNewInscricao = async () => {
    if (!rascunhoData) return;

    try {
      // Deletar rascunho antigo
      const { error } = await supabase
        .from('inscricoes_edital')
        .delete()
        .eq('id', rascunhoData.id);

      if (error) throw error;

      setRascunhoData(null);
      setIsRascunhoDialogOpen(false);

      toast.success('Rascunho excluído. Você pode começar uma nova inscrição.');
    } catch (error: any) {
      console.error('Erro ao deletar rascunho:', error);
      toast.error('Erro ao excluir rascunho: ' + error.message);
    }
  };

  const handleDeleteEdital = async (editalId: string) => {
    const confirmMsg = 
      `⚠️ ATENÇÃO: Deseja EXCLUIR este edital?\n\n` +
      `Esta ação irá remover:\n` +
      `• O edital\n` +
      `• Todas as inscrições vinculadas\n` +
      `• Workflows em execução\n` +
      `• Aprovações pendentes\n\n` +
      `Esta ação NÃO pode ser desfeita!`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      
      // Verificar inscrições existentes
      const { count } = await supabase
        .from("inscricoes_edital")
        .select("*", { count: "exact", head: true })
        .eq("edital_id", editalId);

      if (count && count > 0) {
        const confirmWithData = window.confirm(
          `Este edital possui ${count} inscrição(ões) ativas.\n\n` +
          `Deseja continuar com a exclusão?`
        );
        if (!confirmWithData) {
          setLoading(false);
          return;
        }
      }

      // Deletar (CASCADE cuida das dependências)
      const { error } = await supabase
        .from("editais")
        .delete()
        .eq("id", editalId);

      if (error) throw error;
      
      toast.success("✅ Edital excluído com sucesso!");
      await loadData();
    } catch (error: any) {
      console.error("Erro ao excluir edital:", error);
      toast.error(`❌ Erro: ${error.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInscricao = async (data: InscricaoCompletaForm) => {
    console.group('🔍 [DEBUG] Submissão de Inscrição');
    console.log('1️⃣ Dados recebidos (RAW):', JSON.stringify(data, (key, value) => 
      value instanceof Date ? value.toISOString() : value
    , 2));
    console.log('2️⃣ Tipo de data_nascimento:', typeof data.data_nascimento, data.data_nascimento);
    console.log('3️⃣ É instância de Date?', data.data_nascimento instanceof Date);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('4️⃣ Usuário autenticado:', user?.id, user?.email);
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (!inscricaoEdital) {
        throw new Error('Edital não selecionado');
      }

      // NOVA VALIDAÇÃO: Garantir que data_nascimento é Date válido
      if (!(data.data_nascimento instanceof Date)) {
        console.error('❌ ERRO: data_nascimento não é Date!', {
          tipo: typeof data.data_nascimento,
          valor: data.data_nascimento,
          isNull: data.data_nascimento === null,
          isUndefined: data.data_nascimento === undefined
        });
        throw new Error('Data de nascimento inválida. Por favor, selecione uma data válida.');
      }
      
      if (isNaN(data.data_nascimento.getTime())) {
        console.error('❌ ERRO: data_nascimento é Date inválido!');
        throw new Error('Data de nascimento inválida. Por favor, selecione uma data válida.');
      }
      
      console.log('5️⃣ Data validada com sucesso:', data.data_nascimento.toISOString());

      // Verificar se o edital está disponível para inscrições
      const hoje = new Date();
      const dataFim = new Date(inscricaoEdital.data_fim);
      
      const statusValidos = ['publicado', 'aberto'];
      const statusOk = statusValidos.includes(inscricaoEdital.status);
      const antesDataFim = hoje <= dataFim;
      
      console.log('6️⃣ Validação de edital:', { statusOk, antesDataFim });

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
            especialidades_ids: data.especialidades_ids,
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
      
      console.log('7️⃣ inscricaoData montado:', JSON.stringify(inscricaoData, null, 2));
      
      console.log('8️⃣ Verificando se já existe inscrição...');
      
      // Verificar se já existe inscrição/rascunho
      const { data: existingInscricao } = await supabase
        .from('inscricoes_edital')
        .select('id, is_rascunho')
        .eq('candidato_id', user.id)
        .eq('edital_id', inscricaoEdital.id)
        .maybeSingle();

      let inscricaoResult;

      if (existingInscricao) {
        console.log('✏️ Atualizando inscrição existente:', existingInscricao.id);
        
        const { data, error } = await supabase
          .from('inscricoes_edital')
          .update({
            dados_inscricao: inscricaoData.dados_inscricao,
            status: 'em_analise',
            is_rascunho: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInscricao.id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Erro ao atualizar:', error);
          throw error;
        }
        inscricaoResult = data;
      } else {
        console.log('➕ Criando nova inscrição');
        
        const { data, error } = await supabase
          .from('inscricoes_edital')
          .insert([inscricaoData])
          .select()
          .single();
        
        if (error) {
          console.error('❌ Erro ao criar:', error);
          throw error;
        }
        inscricaoResult = data;
      }

      console.log('✅ Inscrição processada:', inscricaoResult?.id);

      // Buscar workflow vinculada ao edital
      const { data: editalData } = await supabase
        .from('editais')
        .select('workflow_id')
        .eq('id', inscricaoEdital.id)
        .single();

      // Se houver workflow, executá-la automaticamente
      if (editalData?.workflow_id && inscricaoResult) {
        console.log('🔄 Executando workflow automaticamente...', editalData.workflow_id);
        
        try {
          const { data: functionData, error: functionError } = await supabase.functions.invoke('execute-workflow', {
            body: {
              workflowId: editalData.workflow_id,
              inscricaoId: inscricaoResult.id,
              inputData: inscricaoData.dados_inscricao
            }
          });

          if (functionError) {
            console.error('❌ Erro ao executar workflow:', functionError);
            
            // 🔧 Etapa 2: Marcar como pendente_workflow e avisar usuário
            await supabase
              .from('inscricoes_edital')
              .update({ status: 'pendente_workflow' })
              .eq('id', inscricaoResult.id);
            
            toast.warning('Inscrição criada, mas o workflow não pôde ser iniciado. Nossa equipe foi notificada.');
          } else {
            console.log('✅ Workflow iniciada:', functionData);
            
            // 🔄 Etapa 2: POLLING - Aguardar vinculação do workflow_execution_id
            console.log('⏳ Aguardando vinculação do workflow (máx 3 segundos)...');
            let tentativas = 0;
            let vinculado = false;
            
            while (tentativas < 6 && !vinculado) { // 6 tentativas x 500ms = 3 segundos
              await new Promise(resolve => setTimeout(resolve, 500));
              
              const { data: inscricaoAtualizada } = await supabase
                .from('inscricoes_edital')
                .select('workflow_execution_id')
                .eq('id', inscricaoResult.id)
                .single();
              
              if (inscricaoAtualizada?.workflow_execution_id) {
                vinculado = true;
                console.log('✅ Workflow vinculado com sucesso:', inscricaoAtualizada.workflow_execution_id);
                toast.success('Inscrição enviada e workflow iniciada com sucesso!');
              }
              
              tentativas++;
            }
            
            if (!vinculado) {
              console.warn('⚠️ Workflow não foi vinculada após 3 segundos');
              toast.success('Inscrição enviada! O workflow será processado em breve.');
            }
          }
        } catch (workflowError) {
          console.error('❌ Erro ao executar workflow:', workflowError);
          toast.success('Inscrição enviada com sucesso! (Workflow será processada em breve)');
        }
      } else {
        console.log('[Editais] Inscrição enviada com sucesso (sem workflow)!');
        toast.success('Inscrição enviada com sucesso!');
      }

      // ✅ AGUARDAR RELOAD ANTES DE FECHAR
      setIsReloading(true);
      await loadData();
      setIsReloading(false);
      setInscricaoEdital(null);
      
      // Redirecionar para "Minhas Inscrições"
      setTimeout(() => {
        navigate('/minhas-inscricoes');
      }, 1000);
    } catch (error: any) {
      console.error('❌ ERRO CAPTURADO:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        details: error.details
      });
      
      // Tratamento específico por tipo de erro
      if (error.message?.includes('data_nascimento')) {
        toast.error('Erro: Data de nascimento inválida. Verifique se selecionou uma data válida.');
      } else if (error.message?.includes('unique_candidato_edital')) {
        toast.error('Você já possui uma inscrição neste edital');
      } else if (error.code === '23505') { // Unique constraint
        toast.error('Você já possui uma inscrição neste edital');
      } else if (error.code === '42501') { // RLS violation
        toast.error('Erro de permissão. Entre em contato com o suporte.');
      } else {
        toast.error('Erro ao enviar inscrição: ' + (error.message || 'Tente novamente'));
      }
      
      // NÃO re-lançar erro para prevenir double-submit
    } finally {
      console.groupEnd();
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
                  key={`${edital.id}-${inscricoes.length}`}
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
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => navigate(`/editais/editar/${edital.id}`)}
                        variant="outline" 
                        className="border-border hover:bg-card"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button 
                        onClick={() => handleDeleteEdital(edital.id)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
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
        if (!open) {
          setInscricaoEdital(null);
          setRascunhoData(null);
        }
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
            rascunhoInscricaoId={rascunhoData?.id}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de rascunho encontrado */}
      {rascunhoData && (
        <RascunhoDialog
          open={isRascunhoDialogOpen}
          onOpenChange={setIsRascunhoDialogOpen}
          lastSaved={rascunhoData.lastSaved}
          onContinue={handleContinueRascunho}
          onStartNew={handleStartNewInscricao}
        />
      )}
    </>
  );
}
