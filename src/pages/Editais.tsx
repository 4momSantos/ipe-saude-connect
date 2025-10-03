import { useState, useEffect } from "react";
import { FileText, Calendar, Users, CheckCircle2, Clock, Download, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FluxoCredenciamento } from "@/components/credenciamento/FluxoCredenciamento";
import { useUserRole } from "@/hooks/useUserRole";

type Edital = {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  vagas: number;
  status: string;
  especialidade: string | null;
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
  const [loading, setLoading] = useState(true);
  const { isGestor, isAdmin, isCandidato } = useUserRole();

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
      // Se não está inscrito, redirecionar para inscrição
      toast.info("Redirecionando para formulário de inscrição...");
      // Aqui você pode adicionar lógica para redirecionar ou abrir formulário
    }
  };

  const getStatusBadge = (edital: Edital) => {
    const inscricao = getInscricaoForEdital(edital.id);
    
    if (!inscricao) {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Aberto
        </Badge>
      );
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
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
                        <span>{edital.vagas} vagas disponíveis</span>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      {isInscrito ? (
                        <Button 
                          onClick={() => handleEditalClick(edital)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Acompanhar Processo
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleEditalClick(edital)}
                          variant="outline" 
                          className="border-border hover:bg-card"
                        >
                          Ver Detalhes e Inscrever-se
                        </Button>
                      )}
                      <Button variant="outline" className="border-border hover:bg-card">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Edital
                      </Button>
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
    </>
  );
}
