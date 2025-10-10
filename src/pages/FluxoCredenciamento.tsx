import { useParams, useNavigate } from "react-router-dom";
import { FluxoCredenciamento } from "@/components/credenciamento/FluxoCredenciamento";
import { useContratos } from "@/hooks/useContratos";
import { useCertificadoPorInscricao } from "@/hooks/useCertificados";
import { useSignatureRequestByWorkflow } from "@/hooks/useSignatureRequest";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function FluxoCredenciamentoPage() {
  const { inscricaoId } = useParams();
  const navigate = useNavigate();

  console.log('[DEBUG FluxoCredenciamento] inscricaoId recebido:', inscricaoId);

  // ✅ Validação robusta logo no início
  if (!inscricaoId || inscricaoId.trim() === '') {
    console.warn('[FluxoCredenciamento] inscricaoId inválido ou não fornecido');
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <Card className="p-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Inscrição não encontrada
            </CardTitle>
            <CardDescription>
              O ID da inscrição não foi fornecido na URL. Retorne à lista de editais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/editais')}>
              Voltar aos Editais
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contrato, isLoading: loadingContrato } = useContratos(inscricaoId);
  const { certificado } = useCertificadoPorInscricao(inscricaoId);
  const [workflowExecutionId, setWorkflowExecutionId] = useState<string | null>(null);
  const [inscricaoData, setInscricaoData] = useState<any>(null);
  const { data: signatureRequest } = useSignatureRequestByWorkflow(workflowExecutionId || "");
  const [assignafyUrl, setAssignafyUrl] = useState<string | null>(null);

  // Buscar workflow_execution_id e dados da inscrição
  useEffect(() => {
    const fetchInscricaoData = async () => {
      if (!inscricaoId) return;
      
      try {
        console.log('[DEBUG FluxoCredenciamento] Iniciando busca de dados da inscrição');
        const { data, error } = await supabase
          .from("inscricoes_edital")
          .select("workflow_execution_id, dados_inscricao")
          .eq("id", inscricaoId)
          .maybeSingle();

        if (error) {
          console.error('[FluxoCredenciamento] Erro ao buscar dados da inscrição:', error);
          return;
        }
        
        if (data) {
          console.log('[FluxoCredenciamento] Dados da inscrição carregados');
          setInscricaoData(data);
          if (data.workflow_execution_id) {
            console.log('[FluxoCredenciamento] workflow_execution_id encontrado:', data.workflow_execution_id);
            setWorkflowExecutionId(data.workflow_execution_id);
          }
        } else {
          console.log('[FluxoCredenciamento] Nenhum dado encontrado para esta inscrição');
        }
      } catch (err) {
        console.error('[FluxoCredenciamento] Erro inesperado ao buscar dados:', err);
      }
    };

    fetchInscricaoData();
  }, [inscricaoId]);

  // Extrair URL de assinatura
  useEffect(() => {
    console.log('[DEBUG FluxoCredenciamento] Processando URL de assinatura', { 
      hasSignatureRequest: !!signatureRequest, 
      hasContrato: !!contrato 
    });
    
    if (signatureRequest?.metadata) {
      const metadata = signatureRequest.metadata as any;
      const url = metadata.signature_url || 
                  metadata.assinafy_data?.signature_url ||
                  metadata.assinafy_data?.signers?.[0]?.signature_url ||
                  (contrato?.dados_contrato as any)?.assinafy_url;
      console.log('[DEBUG FluxoCredenciamento] URL de assinatura extraída:', url);
      setAssignafyUrl(url);
    } else if ((contrato?.dados_contrato as any)?.assinafy_url) {
      const url = (contrato.dados_contrato as any).assinafy_url;
      console.log('[DEBUG FluxoCredenciamento] URL de assinatura do contrato:', url);
      setAssignafyUrl(url);
    }
  }, [signatureRequest, contrato]);

  const mapStatus = (contratoStatus?: string) => {
    if (!contratoStatus) return "em_analise";
    switch (contratoStatus) {
      case "pendente_assinatura": return "aguardando_assinatura";
      case "assinado": return certificado ? "ativo" : "assinado";
      case "rejeitado": return "rejeitado";
      default: return "em_analise";
    }
  };

  const handleAssinarContrato = async () => {
    console.log('[DEBUG FluxoCredenciamento] Iniciando assinatura, URL:', assignafyUrl);
    if (assignafyUrl) {
      window.open(assignafyUrl, "_blank");
    } else {
      toast.error("Link de assinatura não disponível no momento. Verifique seu email ou aguarde alguns instantes.");
    }
  };

  console.log('[DEBUG FluxoCredenciamento] Estado atual:', { 
    loadingContrato, 
    contratoStatus: contrato?.status,
    workflowExecutionId,
    assignafyUrl 
  });

  if (loadingContrato) {
    return <div className="container mx-auto max-w-7xl p-6"><Skeleton className="h-96" /></div>;
  }

  return (
    <ErrorBoundary 
      fallback={
        <div className="container mx-auto max-w-7xl p-6">
          <Card className="p-8 border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Erro ao carregar processo de credenciamento
              </CardTitle>
              <CardDescription>
                Ocorreu um erro inesperado ao tentar carregar os detalhes do seu processo. 
                Nossa equipe foi notificada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
              <Button variant="outline" onClick={() => navigate('/editais')}>
                Voltar aos Editais
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="container mx-auto max-w-7xl">
        <FluxoCredenciamento 
          status={mapStatus(contrato?.status)}
          motivoRejeicao={contrato?.status === 'rejeitado' ? 'Contrato rejeitado' : undefined}
          onAssinarContrato={handleAssinarContrato}
          inscricaoId={inscricaoId}
          dadosInscricao={inscricaoData?.dados_inscricao}
          candidatoNome={inscricaoData?.dados_inscricao?.dadosPessoais?.nome}
          workflowExecutionId={workflowExecutionId || undefined}
        />
      </div>
    </ErrorBoundary>
  );
}
