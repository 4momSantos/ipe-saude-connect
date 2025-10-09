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
import { TestTube, Send, CheckCircle2, AlertCircle } from "lucide-react";

export function TesteAssinatura() {
  const [selectedInscricao, setSelectedInscricao] = useState("");
  const [selectedEditalTeste, setSelectedEditalTeste] = useState("");
  const [emailSignatario, setEmailSignatario] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

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

      // 2. Criar inscrição de teste com dados completos
      const { data: inscricaoTeste, error: inscricaoError } = await supabase
        .from("inscricoes_edital")
        .insert({
          candidato_id: (await supabase.auth.getUser()).data.user?.id,
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

      // 3. Chamar a edge function diretamente
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
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
