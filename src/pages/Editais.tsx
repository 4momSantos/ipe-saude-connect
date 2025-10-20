import { useState, useEffect, useMemo, useCallback } from "react";
import { FileText, Calendar, Users, CheckCircle2, Clock, Download, Eye, Plus, FileSearch, Edit, Trash, Filter, X, Search, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FluxoCredenciamento } from "@/components/credenciamento/FluxoCredenciamento";
import { InscricaoWizard } from "@/components/inscricao/InscricaoWizard";
import { RascunhoDialog } from "@/components/inscricao/RascunhoDialog";
import { SuccessDialog } from "@/components/inscricao/SuccessDialog";
import { InscricaoCompletaForm } from "@/lib/inscricao-validation";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { EditalDetalhes } from "@/components/edital/EditalDetalhes";
import { useEspecialidades } from "@/hooks/useEspecialidades";
import { useInscricoes } from "@/hooks/useInscricoes";

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
  especialidades?: Array<{
    id: string;
    nome: string;
    codigo: string | null;
  }>;
};

type Inscricao = {
  id: string;
  edital_id: string;
  status: string;
  motivo_rejeicao: string | null;
  is_rascunho: boolean;
};

export default function Editais() {
  const [editais, setEditais] = useState<Edital[]>([]);
  const [user, setUser] = useState<any>(null);
  // ✅ Substituído por React Query
  const { inscricoes, isLoading: isLoadingInscricoes, submitInscricao, isSubmitting } = useInscricoes();
  const [selectedEdital, setSelectedEdital] = useState<Edital | null>(null);
  const [selectedInscricao, setSelectedInscricao] = useState<Inscricao | null>(null);
  const [inscricaoEdital, setInscricaoEdital] = useState<Edital | null>(null);
  const [detalhesEdital, setDetalhesEdital] = useState<Edital | null>(null);
  const [rascunhoData, setRascunhoData] = useState<{ id: string; lastSaved: Date } | null>(null);
  const [isRascunhoDialogOpen, setIsRascunhoDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [loadingEditalId, setLoadingEditalId] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successData, setSuccessData] = useState<{
    protocolo: string;
    dataEnvio: Date;
    emailCandidato: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<string[]>([]);
  const { isGestor, isAdmin, isCandidato } = useUserRole();
  const { data: especialidades } = useEspecialidades();
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    getUser();
  }, []);

  // ✅ Mapa estável de inscrições para evitar re-renders desnecessários
  const inscricoesMap = useMemo(() => {
    const map = new Map<string, Inscricao>();
    inscricoes.forEach(inscricao => {
      // ✅ Usar is_rascunho em vez de status
      if (!inscricao.is_rascunho) {
        map.set(inscricao.edital_id, inscricao);
      }
    });
    console.log('[Editais] inscricoesMap atualizado:', {
      total: Array.from(map.entries()).length,
      detalhes: Array.from(map.entries()).map(([id, i]) => ({ 
        edital_id: id, 
        inscricao_id: i.id,
        status: i.status, 
        is_rascunho: i.is_rascunho 
      }))
    });
    return map;
  }, [inscricoes]);

  useEffect(() => {
    loadEditais();
  }, []);

  // ✅ Carregar apenas editais (inscrições vêm do React Query)
  const loadEditais = async () => {
    try {
      setLoading(true);
      
      // Base query com join de especialidades
      let query = supabase
        .from("editais")
        .select(`
          *,
          edital_especialidades (
            especialidade_id,
            especialidades_medicas (
              id,
              nome,
              codigo
            )
          )
        `)
        .order("created_at", { ascending: false });

      // Filtro adicional para candidatos (camada extra de segurança)
      if (isCandidato && !isGestor && !isAdmin) {
        console.log('[Editais] Aplicando filtro de candidato: apenas publicados/abertos');
        query = query.in("status", ["publicado", "aberto"]);
      }

      const { data: editaisData, error: editaisError } = await query;

      if (editaisError) throw editaisError;
      
      // Transformar dados para incluir especialidades
      const editaisComEspecialidades = editaisData?.map(edital => ({
        ...edital,
        especialidades: edital.edital_especialidades?.map((ee: any) => ({
          id: ee.especialidades_medicas.id,
          nome: ee.especialidades_medicas.nome,
          codigo: ee.especialidades_medicas.codigo
        })) || []
      })) || [];
      
      setEditais(editaisComEspecialidades);
    } catch (error) {
      console.error("Erro ao carregar editais:", error);
      toast.error("Erro ao carregar editais");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Usar useCallback com inscricoesMap para estabilizar a função
  const getInscricaoForEdital = useCallback((editalId: string) => {
    const inscricao = inscricoesMap.get(editalId);
    console.log('[Editais] Buscando inscrição para edital', editalId, '→', inscricao?.status || 'não encontrada');
    return inscricao;
  }, [inscricoesMap]);

  const handleEditalClick = async (edital: Edital) => {
    setLoadingEditalId(edital.id); // ✅ Indicar carregamento
    
    const inscricao = inscricoesMap.get(edital.id); // ✅ Usar map diretamente
    
    if (inscricao) {
      // Se já está inscrito, mostrar acompanhamento
      setSelectedEdital(edital);
      setSelectedInscricao(inscricao);
      setLoadingEditalId(null);
    } else {
      // Verificar se existe rascunho
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar autenticado para se inscrever');
        setLoadingEditalId(null);
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
      setLoadingEditalId(null);
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
      await loadEditais();
    } catch (error: any) {
      console.error("Erro ao excluir edital:", error);
      toast.error(`❌ Erro: ${error.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInscricao = async (data: InscricaoCompletaForm) => {
    if (!inscricaoEdital || !user || isSubmitting) return;

    console.group('🔍 [DEBUG] Submissão de Inscrição com React Query');
    console.log('1️⃣ Edital:', inscricaoEdital.id);
    console.log('2️⃣ Usuário:', user.id);
    
    try {
      // Validação de data de nascimento
      if (!(data.data_nascimento instanceof Date) || isNaN(data.data_nascimento.getTime())) {
        throw new Error('Data de nascimento inválida. Por favor, selecione uma data válida.');
      }

      // Verificar se o edital está disponível para inscrições
      const hoje = new Date();
      const dataFim = new Date(inscricaoEdital.data_fim);
      const statusValidos = ['publicado', 'aberto'];
      
      if (!statusValidos.includes(inscricaoEdital.status) || hoje > dataFim) {
        throw new Error('Este edital não está mais aberto para inscrições');
      }

      // Verificar duplicação
      const { data: inscricaoExistente } = await supabase
        .from('inscricoes_edital')
        .select('id')
        .eq('candidato_id', user.id)
        .eq('edital_id', inscricaoEdital.id)
        .eq('is_rascunho', false)
        .maybeSingle();

      if (inscricaoExistente) {
        toast.error("❌ Você já está inscrito neste edital!");
        setInscricaoEdital(null);
        console.groupEnd();
        return;
      }

      // Montar dados de inscrição
      const inscricaoData = {
        candidato_id: user.id,
        edital_id: inscricaoEdital.id,
        status: 'em_analise',
        is_rascunho: false,
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
            cep: data.cep_correspondencia,
            logradouro: data.logradouro_correspondencia,
            numero: data.numero_correspondencia,
            complemento: data.complemento_correspondencia,
            bairro: data.bairro_correspondencia,
            cidade: data.cidade_correspondencia,
            uf: data.uf_correspondencia,
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
      
      console.log('3️⃣ Submetendo via React Query...');
      
      // ✅ Usar mutation do React Query
      const inscricaoResult = await submitInscricao(inscricaoData);
      
      console.log('✅ Inscrição processada:', inscricaoResult.id);

      // Limpar rascunho do localStorage
      localStorage.removeItem(`inscricao_rascunho_${inscricaoEdital.id}`);

      // Buscar workflow vinculada ao edital
      const { data: editalData } = await supabase
        .from('editais')
        .select('workflow_id')
        .eq('id', inscricaoEdital.id)
        .single();

      // Se houver workflow, executá-la automaticamente
      if (editalData?.workflow_id) {
        console.log('🔄 Executando workflow...', editalData.workflow_id);
        
        try {
          const { error: functionError } = await supabase.functions.invoke('execute-workflow', {
            body: {
              workflowId: editalData.workflow_id,
              inscricaoId: inscricaoResult.id,
              inputData: inscricaoData.dados_inscricao
            }
          });

          if (functionError) {
            console.error('❌ Erro ao executar workflow:', functionError);
            toast.warning('Inscrição criada, mas o workflow não pôde ser iniciado.');
          }
        } catch (workflowError) {
          console.error('❌ Erro ao executar workflow:', workflowError);
        }
      }

      // ✅ Fechar dialog de inscrição e abrir dialog de sucesso
      setInscricaoEdital(null);
      setShowSuccessDialog(true);
      setSuccessData({
        protocolo: inscricaoResult.protocolo || 'N/A',
        dataEnvio: new Date(),
        emailCandidato: data.email,
      });

      console.log('=== SUBMIT CONCLUÍDO - Cache será invalidado automaticamente ===');
    } catch (error: any) {
      console.error('❌ ERRO CAPTURADO:', error);
      // Toast de erro já é exibido pelo hook useInscricoes
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

  // ✅ Combinar loading states
  if (loading || isLoadingInscricoes) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando editais...</div>
      </div>
    );
  }

  const toggleEspecialidade = (especialidadeId: string) => {
    setSelectedEspecialidades(prev => 
      prev.includes(especialidadeId)
        ? prev.filter(id => id !== especialidadeId)
        : [...prev, especialidadeId]
    );
  };

  // Filtrar editais por busca e especialidades
  const editaisFiltrados = editais.filter(edital => {
    const matchSearch = !searchTerm || 
      edital.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      edital.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      edital.numero_edital?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchEspecialidades = selectedEspecialidades.length === 0 ||
      edital.especialidades?.some(esp => selectedEspecialidades.includes(esp.id));
    
    return matchSearch && matchEspecialidades;
  });

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

        {/* Barra de Busca e Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Barra de Busca */}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar editais por título, descrição ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Dropdown de Especialidades */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Especialidades
                {selectedEspecialidades.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                    {selectedEspecialidades.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-64 max-h-[400px] overflow-y-auto bg-popover z-50"
            >
              <DropdownMenuLabel>Filtrar por especialidades</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {selectedEspecialidades.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEspecialidades([])}
                    className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 mr-2" />
                    Limpar filtros
                  </Button>
                  <DropdownMenuSeparator />
                </>
              )}
              {especialidades?.map((esp) => {
                const count = editais.filter(e => 
                  e.especialidades?.some(es => es.id === esp.id)
                ).length;
                
                return (
                  <DropdownMenuCheckboxItem
                    key={esp.id}
                    checked={selectedEspecialidades.includes(esp.id)}
                    onCheckedChange={() => toggleEspecialidade(esp.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{esp.nome}</span>
                      <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                        {count}
                      </Badge>
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
              {(!especialidades || especialidades.length === 0) && (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma especialidade disponível
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Indicador de filtros ativos */}
          {(searchTerm || selectedEspecialidades.length > 0) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{editaisFiltrados.length} de {editais.length} editais</span>
            </div>
          )}
        </div>

        <div className="grid gap-6">
          {editaisFiltrados.length === 0 ? (
            <Card className="border bg-card">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm || selectedEspecialidades.length > 0
                    ? "Nenhum edital encontrado com os filtros aplicados"
                    : "Nenhum edital disponível no momento"}
                </p>
              </CardContent>
            </Card>
          ) : (
            editaisFiltrados.map((edital) => {
              const inscricao = inscricoesMap.get(edital.id); // ✅ Acesso direto ao map
              const isInscrito = !!inscricao;

              return (
                <Card 
                  key={edital.id} // ✅ Key estável baseada apenas no ID
                  className={`border bg-card card-glow hover-lift transition-all duration-300 ${
                    isInscrito ? "ring-2 ring-primary/20" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <CardTitle className="text-foreground flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          {edital.titulo}
                        </CardTitle>
                        <CardDescription>{edital.descricao}</CardDescription>
                        
                        {/* Tags de Especialidades */}
                        {edital.especialidades && edital.especialidades.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {edital.especialidades.map((esp) => (
                              <Badge 
                                key={esp.id} 
                                variant="secondary" 
                                className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEspecialidades([esp.id]);
                                }}
                              >
                                {esp.nome}
                              </Badge>
                            ))}
                          </div>
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
                {/* ✅ Loading state durante sincronização */}
                {isLoadingInscricoes ? (
                  <Button disabled className="bg-muted">
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </Button>
                ) : isInscrito ? (
                  <Button 
                    onClick={() => handleEditalClick(edital)}
                    disabled={loadingEditalId === edital.id}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loadingEditalId === edital.id ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Acompanhar Processo
                      </>
                    )}
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
                      disabled={isInscrito || isSubmitting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Inscrever-se
                        </>
                      )}
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
            {selectedInscricao ? (
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
                    loadEditais();
                    setSelectedEdital(null);
                    setSelectedInscricao(null);
                  } catch (error) {
                    console.error("Erro ao assinar contrato:", error);
                    toast.error("Erro ao assinar contrato");
                  }
                }}
              />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center">
                    Carregando informações da inscrição...
                  </p>
                </CardContent>
              </Card>
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
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle>Inscrição em Edital</DialogTitle>
            <DialogDescription>
              {inscricaoEdital?.titulo} - Preencha o formulário completo de inscrição
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <InscricaoWizard 
              editalId={inscricaoEdital?.id || ''}
              editalTitulo={inscricaoEdital?.titulo || ''}
              onSubmit={handleSubmitInscricao}
              rascunhoInscricaoId={rascunhoData?.id}
            />
          </div>
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

      {/* Dialog de sucesso */}
      {successData && (
        <SuccessDialog
          open={showSuccessDialog}
          onOpenChange={setShowSuccessDialog}
          protocolo={successData.protocolo}
          dataEnvio={successData.dataEnvio}
          emailCandidato={successData.emailCandidato}
          onAcompanhar={() => {
            setShowSuccessDialog(false);
            navigate('/minhas-inscricoes');
          }}
          onNovaInscricao={() => {
            setShowSuccessDialog(false);
            setSuccessData(null);
          }}
        />
      )}
    </>
  );
}
