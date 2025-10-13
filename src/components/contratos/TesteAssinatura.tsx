import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { TestTube, Send, CheckCircle2, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";

export function TesteAssinatura() {
  const [selectedEdital, setSelectedEdital] = useState("");
  const [emailSignatario, setEmailSignatario] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [selectedCandidatoId, setSelectedCandidatoId] = useState("");

  // Buscar candidatos para testes
  const { users: candidatos } = useUsers();

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("📋 Copiado!");
  };

  const handleTestarRapido = async () => {
    // Validações
    if (!selectedEdital) {
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
      toast.info("🔄 Criando inscrição de teste...");

      // 1. Buscar edital
      const { data: edital, error: editalError } = await supabase
        .from("editais")
        .select("*")
        .eq("id", selectedEdital)
        .single();

      if (editalError || !edital) throw new Error("Edital não encontrado");

      // 2. Obter candidato_id válido
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("Você precisa estar autenticado para realizar testes.");
      }
      
      // Usar candidato selecionado ou usuário atual
      const userId = selectedCandidatoId || userData.user.id;
      
      // Verificar se existe profile, criar se necessário
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      
      if (!profile) {
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
        
        toast.info("Profile criado automaticamente");
      }

      // 3. Limpar inscrições antigas
      const { data: deletedData } = await supabase
        .from("inscricoes_edital")
        .delete()
        .eq("candidato_id", userId)
        .eq("edital_id", selectedEdital)
        .select();

      if (deletedData && deletedData.length > 0) {
        toast.info(`🧹 ${deletedData.length} inscrição(ões) antiga(s) removida(s)`);
      }

      // 4. Criar inscrição de teste com CPF único
      const cpfTeste = `999${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
      
      const { data: inscricaoTeste, error: inscricaoError } = await supabase
        .from("inscricoes_edital")
        .insert({
          candidato_id: userId,
          edital_id: selectedEdital,
          status: "aprovado",
          dados_inscricao: {
            dadosPessoais: {
              nome: "TESTE - João da Silva",
              cpf: cpfTeste,
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

      toast.info("📄 Gerando contrato...");

      // 5. Chamar edge function para gerar contrato
      const { data, error } = await supabase.functions.invoke("gerar-contrato-assinatura", {
        body: {
          inscricao_id: inscricaoTeste.id
        }
      });

      if (error) throw error;

      setTestResult({
        success: true,
        data,
        inscricaoId: inscricaoTeste.id
      });

      toast.success("✅ Contrato gerado e enviado para assinatura!");
    } catch (error: any) {
      console.error("Erro no teste:", error);
      setTestResult({
        success: false,
        error: error.message
      });
      toast.error("❌ Erro: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            🧪 Teste Rápido de Assinatura Digital
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-blue-500/5 border-blue-500/20">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm">
              <strong>Como funciona:</strong> Esta página cria uma inscrição de teste aprovada e gera um contrato que será enviado para o e-mail especificado via Assinafy.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {/* Seletor de Edital */}
            <div className="space-y-2">
              <Label htmlFor="edital">Edital *</Label>
              <Select value={selectedEdital} onValueChange={setSelectedEdital}>
                <SelectTrigger id="edital">
                  <SelectValue placeholder="Selecione um edital" />
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

            {/* E-mail do Signatário */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do Signatário *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={emailSignatario}
                onChange={(e) => setEmailSignatario(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                O contrato será enviado para este e-mail
              </p>
            </div>

            {/* Candidato (Opcional) */}
            <div className="space-y-2">
              <Label htmlFor="candidato">Candidato (Opcional)</Label>
              <Select value={selectedCandidatoId} onValueChange={setSelectedCandidatoId}>
                <SelectTrigger id="candidato">
                  <SelectValue placeholder="Usar meu usuário" />
                </SelectTrigger>
                <SelectContent>
                  {candidatos?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nome || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se não selecionar, usará seu usuário atual
              </p>
            </div>

            <Separator />

            {/* Botão Principal */}
            <Button
              onClick={handleTestarRapido}
              disabled={isLoading || !selectedEdital || !emailSignatario}
              className="w-full gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  🚀 Gerar Contrato de Teste
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado do Teste */}
      {testResult && (
        <Card className={testResult.success ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <CardTitle className="text-lg">
                {testResult.success ? "✅ Contrato Gerado com Sucesso!" : "❌ Erro ao Gerar Contrato"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResult.success ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Número do Contrato</Label>
                    <p className="font-mono font-bold text-lg">
                      {testResult.data?.numero_contrato || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">ID da Inscrição</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs truncate">
                        {testResult.inscricaoId?.substring(0, 8)}...
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(testResult.inscricaoId)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>📧 E-mail Enviado Para:</Label>
                  <p className="text-sm font-medium">{emailSignatario}</p>
                </div>

                {testResult.data?.assinafy_document_id && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      asChild
                    >
                      <a
                        href={`https://app.assinafy.com.br/documents/${testResult.data.assinafy_document_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        🔗 Ver Documento no Assinafy
                      </a>
                    </Button>
                  </>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Próximos passos:</strong><br />
                    1. Verifique o e-mail <strong>{emailSignatario}</strong><br />
                    2. Clique no link recebido para assinar<br />
                    3. Após assinar, o webhook atualizará o status automaticamente
                  </AlertDescription>
                </Alert>

                {/* Dados brutos (debug) */}
                {testResult.data && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      🔍 Ver resposta completa (debug)
                    </summary>
                    <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-64">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </details>
                )}
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erro:</strong> {testResult.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informações Adicionais */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm">💡 Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Secrets necessários:</strong> ASSINAFY_API_KEY, ASSINAFY_ACCOUNT_ID, ASSINAFY_WEBHOOK_SECRET</li>
            <li><strong>Webhook configurado:</strong> https://[SEU_PROJETO].supabase.co/functions/v1/assinafy-webhook-finalizacao</li>
            <li><strong>Fluxo testado:</strong> Criação de inscrição → Geração de contrato → Envio para Assinafy</li>
            <li><strong>Limpeza automática:</strong> Inscrições antigas do mesmo candidato/edital são removidas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
