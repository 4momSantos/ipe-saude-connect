import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { TestTube, Send, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";
import { FluxoCredenciamentoMonitor } from "./FluxoCredenciamentoMonitor";

export function TesteAssinatura() {
  const [selectedInscricao, setSelectedInscricao] = useState("");
  const [selectedEditalTeste, setSelectedEditalTeste] = useState("");
  const [selectedEditalFluxoProg, setSelectedEditalFluxoProg] = useState("");
  const [emailSignatario, setEmailSignatario] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [inscricaoMonitorada, setInscricaoMonitorada] = useState<string | null>(null);

  // Buscar inscrições aprovadas para teste
  const { data: inscricoes } = useQuery({
    queryKey: ["inscricoes-para-teste"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_edital")
        .select(`
          id,
          dados_inscricao,
          status,
          edital:editais(titulo)
        `)
        .eq("status", "aprovado")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    }
  });

  // Buscar editais disponíveis para teste
  const { data: editais } = useQuery({
    queryKey: ["editais-para-teste"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editais")
        .select("id, titulo, numero_edital")
        .in("status", ["aberto", "publicado"])
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  // Cenário 1: Gerar contrato via fluxo normal
  const handleTestarFluxoCompleto = async () => {
    if (!selectedInscricao) {
      toast.error("Selecione uma inscrição");
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("gerar-contrato-assinatura", {
        body: {
          inscricao_id: selectedInscricao
        }
      });

      if (error) throw error;

      setTestResult({
        success: true,
        type: "fluxo_completo",
        data
      });

      toast.success("✅ Contrato gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro no teste:", error);
      setTestResult({
        success: false,
        type: "fluxo_completo",
        error: error.message
      });
      toast.error("❌ Erro ao gerar contrato: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cenário 2: Testar Edge Function diretamente com dados mockados
  const handleTestarEdgeFunctionDireta = async () => {
    // Validações
    if (!selectedEditalTeste) {
      toast.error("Selecione um edital");
      return;
    }
    
    if (!emailSignatario || !emailSignatario.includes("@")) {
      toast.error("Digite um email válido para o signatário");
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // 1. Buscar edital ANTES de criar inscrição
      const { data: edital, error: editalError } = await supabase
        .from("editais")
        .select("*")
        .eq("id", selectedEditalTeste)
        .single();

      if (editalError || !edital) throw new Error("Edital não encontrado");

      // 2. Obter candidato_id válido (DEVE ser auth.uid() por causa da RLS)
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("Você precisa estar autenticado para realizar testes.");
      }
      
      const userId = userData.user.id;
      
      // Verificar se existe profile, criar se necessário
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      
      if (!profile) {
        // Criar profile automaticamente para o teste
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email: userData.user.email,
            nome: userData.user.email?.split("@")[0] || "Usuário Teste"
          });
        
        if (createProfileError) {
          throw new Error("Erro ao criar profile: " + createProfileError.message);
        }
        
        toast.info("Profile criado automaticamente para o teste");
      }

      // 3. Limpar inscrições de teste antigas do mesmo candidato/edital
      const { error: deleteError } = await supabase
        .from("inscricoes_edital")
        .delete()
        .eq("candidato_id", userId)
        .eq("edital_id", selectedEditalTeste)
        .in("status", ["rascunho", "aguardando_analise", "aprovado"]);

      if (deleteError) {
        console.warn("Aviso ao limpar inscrições antigas:", deleteError);
      } else {
        toast.info("🧹 Inscrições de teste antigas limpas");
      }

      // 4. Criar inscrição de teste com dados completos
      const { data: inscricaoTeste, error: inscricaoError } = await supabase
        .from("inscricoes_edital")
        .insert({
          candidato_id: userId, // DEVE ser auth.uid() por causa da política RLS
          edital_id: selectedEditalTeste,
          status: "aprovado",
          dados_inscricao: {
            dadosPessoais: {
              nome: "TESTE - João da Silva",
              cpf: "000.000.000-00",
              email: emailSignatario,
              telefone: "(11) 99999-9999",
              dataNascimento: "1990-01-01",
              rg: "00.000.000-0"
            },
            endereco: {
              logradouro: "Rua Teste",
              numero: "123",
              cidade: "São Paulo",
              estado: "SP",
              cep: "00000-000"
            }
          },
          is_rascunho: false
        })
        .select()
        .single();

      if (inscricaoError) throw inscricaoError;

      // 4. Chamar a edge function diretamente
      const { data, error } = await supabase.functions.invoke("gerar-contrato-assinatura", {
        body: {
          inscricao_id: inscricaoTeste.id
        }
      });

      if (error) throw error;

      setTestResult({
        success: true,
        type: "edge_function_direta",
        data,
        inscricaoId: inscricaoTeste.id
      });

      toast.success("✅ Edge Function testada com sucesso!");
    } catch (error: any) {
      console.error("Erro no teste direto:", error);
      setTestResult({
        success: false,
        type: "edge_function_direta",
        error: error.message
      });
      toast.error("❌ Erro no teste: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cenário 3: Fluxo Programático E2E
  const handleTestarFluxoProgramatico = async () => {
    if (!selectedEditalFluxoProg) {
      toast.error("Selecione um edital para teste do fluxo programático");
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    setInscricaoMonitorada(null);

    try {
      // 1. Validar usuário autenticado e profile
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("Você precisa estar autenticado para realizar testes.");
      }
      
      const userId = userData.user.id;
      
      // Verificar se existe profile, criar se necessário
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      
      if (!profile) {
        // Criar profile automaticamente
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email: userData.user.email,
            nome: userData.user.email?.split("@")[0] || "Usuário Teste"
          });
        
        if (createProfileError) {
          throw new Error("Erro ao criar profile: " + createProfileError.message);
        }
        
        toast.info("Profile criado automaticamente para o teste");
      }

      // 2. Limpar inscrições de teste antigas do mesmo candidato/edital
      const { error: deleteError } = await supabase
        .from("inscricoes_edital")
        .delete()
        .eq("candidato_id", userId)
        .eq("edital_id", selectedEditalFluxoProg)
        .in("status", ["rascunho", "aguardando_analise"]);

      if (deleteError) {
        console.warn("Aviso ao limpar inscrições antigas:", deleteError);
        // Não falhar se não houver inscrições antigas
      } else {
        toast.info("🧹 Inscrições de teste antigas limpas");
      }

      // 3. Criar inscrição em rascunho
      const { data: inscricaoTeste, error: inscricaoError } = await supabase
        .from("inscricoes_edital")
        .insert({
          candidato_id: userId, // DEVE ser auth.uid() por causa da política RLS
          edital_id: selectedEditalFluxoProg,
          status: "rascunho",
          dados_inscricao: {
            dadosPessoais: {
              nome: "FLUXO PROG - Maria Silva",
              cpf: "111.111.111-11",
              email: "teste.fluxo@example.com",
              telefone: "(11) 88888-8888"
            }
          },
          is_rascunho: true
        })
        .select()
        .single();

      if (inscricaoError) throw inscricaoError;

      // 3. Enviar inscrição via edge function
      const { error: enviarError } = await supabase.functions.invoke("enviar-inscricao", {
        body: { inscricao_id: inscricaoTeste.id }
      });

      if (enviarError) throw enviarError;

      setInscricaoMonitorada(inscricaoTeste.id);

      setTestResult({
        success: true,
        type: "fluxo_programatico",
        inscricaoId: inscricaoTeste.id,
        message: "Inscrição criada e enviada. Agora você pode aprovar manualmente via interface de Análises."
      });

      toast.success("✅ Fluxo programático iniciado! Monitore o progresso abaixo.");
    } catch (error: any) {
      console.error("Erro no fluxo programático:", error);
      setTestResult({
        success: false,
        type: "fluxo_programatico",
        error: error.message
      });
      toast.error("❌ Erro no fluxo: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Teste de Assinatura Digital
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cenário 1 */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            🎯 Cenário 1: Fluxo End-to-End Completo
          </h3>
          <p className="text-sm text-muted-foreground">
            Testa o fluxo completo de geração de contrato + envio para Assinafy usando uma inscrição aprovada real
          </p>
          <div className="flex gap-2">
            <Select value={selectedInscricao} onValueChange={setSelectedInscricao}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione uma inscrição aprovada" />
              </SelectTrigger>
              <SelectContent>
                {inscricoes?.map((insc) => (
                  <SelectItem key={insc.id} value={insc.id}>
                    {(insc.dados_inscricao as any)?.dadosPessoais?.nome || "Sem nome"} - {(insc.edital as any)?.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleTestarFluxoCompleto}
              disabled={isLoading || !selectedInscricao}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Testar
            </Button>
          </div>
        </div>

        {/* Cenário 2 */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            ⚡ Cenário 2: Edge Function Direta
          </h3>
          <p className="text-sm text-muted-foreground">
            Cria uma inscrição de teste e chama a Edge Function diretamente com dados mockados
          </p>
          
          {/* Seletor de Edital */}
          <div className="space-y-2">
            <Label htmlFor="edital-teste">Selecione o Edital:</Label>
            <Select value={selectedEditalTeste} onValueChange={setSelectedEditalTeste}>
              <SelectTrigger id="edital-teste">
                <SelectValue placeholder="Escolha um edital" />
              </SelectTrigger>
              <SelectContent>
                {editais?.map((edital) => (
                  <SelectItem key={edital.id} value={edital.id}>
                    {edital.numero_edital || "Sem número"} - {edital.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Input de Email */}
          <div className="space-y-2">
            <Label htmlFor="email-signatario">Email do Signatário:</Label>
            <Input
              id="email-signatario"
              type="email"
              placeholder="email@exemplo.com"
              value={emailSignatario}
              onChange={(e) => setEmailSignatario(e.target.value)}
            />
          </div>

          <Button
            onClick={handleTestarEdgeFunctionDireta}
            disabled={isLoading || !selectedEditalTeste || !emailSignatario}
            variant="outline"
            className="gap-2 w-full"
          >
            <TestTube className="h-4 w-4" />
            Testar com Dados Mock
          </Button>
        </div>

        {/* Resultado */}
        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            <div className="flex items-start gap-2">
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <div className="flex-1">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">
                      {testResult.success ? "✅ Teste Concluído" : "❌ Erro no Teste"}
                    </p>
                    {testResult.success ? (
                      <div className="text-sm space-y-1">
                        <p>• Contrato: {testResult.data?.numero_contrato}</p>
                        <p>• Signature Request ID: {testResult.data?.signature_request_id}</p>
                        {testResult.data?.assinafy_document_id && (
                          <p>• Assinafy Document ID: {testResult.data.assinafy_document_id}</p>
                        )}
                        {testResult.inscricaoId && (
                          <p>• Inscrição Teste: {testResult.inscricaoId}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{testResult.error}</p>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {/* Cenário 3: Fluxo Programático */}
        <div className="space-y-3 border-t pt-6">
          <h3 className="font-semibold flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            🚀 Cenário 3: Fluxo Programático E2E
          </h3>
          <p className="text-sm text-muted-foreground">
            Testa o fluxo programático completo (sem workflow engine): criar inscrição → enviar → aguardar análise manual → contrato → assinatura → certificado
          </p>
          <div className="space-y-3">
            <div>
              <Label>Edital para Teste (sem workflow)</Label>
              <Select value={selectedEditalFluxoProg} onValueChange={setSelectedEditalFluxoProg}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um edital de teste" />
                </SelectTrigger>
                <SelectContent>
                  {editais?.map((edital) => (
                    <SelectItem key={edital.id} value={edital.id}>
                      {edital.titulo} ({edital.numero_edital})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleTestarFluxoProgramatico}
              disabled={isLoading || !selectedEditalFluxoProg}
              className="w-full"
              variant="outline"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              {isLoading ? "Processando..." : "Iniciar Teste do Fluxo Programático"}
            </Button>
            
            {inscricaoMonitorada && (
              <div className="mt-4">
                <FluxoCredenciamentoMonitor inscricaoId={inscricaoMonitorada} />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <Alert>
          <AlertDescription className="text-xs">
            <p className="font-semibold mb-1">💡 Validações Automáticas:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Credenciais Assinafy (ASSINAFY_API_KEY + ASSINAFY_ACCOUNT_ID)</li>
              <li>Geração do HTML do contrato</li>
              <li>Criação do registro em signature_requests</li>
              <li>Invocação da send-signature-request</li>
              <li>Criação do documento na Assinafy</li>
            </ul>
            <p className="font-semibold mt-3 mb-1">🔄 Fluxo Programático:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Inscrição criada via API (sem workflow_execution_id)</li>
              <li>Triggers de banco executam automaticamente</li>
              <li>Edge functions diretas (sem orquestração)</li>
              <li>Status rastreável em tempo real</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
