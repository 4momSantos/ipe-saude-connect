import { FileText, Calendar, Users, CheckCircle2, MapPin, DollarSign, Clock, Download, FileCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditalDetalhesProps {
  edital: {
    id: string;
    titulo: string;
    descricao: string | null;
    numero_edital: string | null;
    objeto: string | null;
    data_inicio: string;
    data_fim: string;
    data_publicacao: string | null;
    data_licitacao: string | null;
    vagas: number;
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
}

export function EditalDetalhes({ edital }: EditalDetalhesProps) {
  const handleDownloadAnexo = async (anexoKey: string) => {
    try {
      const fileName = edital.anexos[anexoKey];
      if (!fileName) return;

      const { data, error } = await supabase.storage
        .from('edital-anexos')
        .download(fileName);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.split('/').pop() || anexoKey;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download iniciado com sucesso');
    } catch (error) {
      console.error('Erro ao baixar anexo:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const criterioJulgamentoLabel: Record<string, string> = {
    menor_preco: "Menor Preço",
    melhor_tecnica: "Melhor Técnica",
    tecnica_preco: "Técnica e Preço",
    maior_desconto: "Maior Desconto",
  };

  return (
    <div className="space-y-6">
      {/* Informações Gerais */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{edital.titulo}</CardTitle>
              {edital.numero_edital && (
                <CardDescription>Edital Nº {edital.numero_edital}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {edital.objeto && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Objeto</h4>
              <p className="text-sm text-muted-foreground">{edital.objeto}</p>
            </div>
          )}
          {edital.descricao && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Descrição</h4>
              <p className="text-sm text-muted-foreground">{edital.descricao}</p>
            </div>
          )}
          {edital.especialidade && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Especialidade</h4>
              <Badge variant="secondary">{edital.especialidade}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prazos e Datas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <CardTitle>Prazos e Datas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {edital.data_publicacao && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Data de Publicação</p>
                  <p className="text-sm font-medium">
                    {new Date(edital.data_publicacao).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            )}
            {edital.data_licitacao && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Data da Licitação</p>
                  <p className="text-sm font-medium">
                    {new Date(edital.data_licitacao).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Período de Inscrição</p>
                <p className="text-sm font-medium">
                  {new Date(edital.data_inicio).toLocaleDateString("pt-BR")} até{" "}
                  {new Date(edital.data_fim).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
            {edital.prazo_validade_proposta && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Validade da Proposta</p>
                  <p className="text-sm font-medium">{edital.prazo_validade_proposta} dias</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Vagas Disponíveis</p>
                <p className="text-sm font-medium">{edital.vagas}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critérios e Condições */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <CardTitle>Critérios e Condições</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {edital.criterio_julgamento && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Critério de Julgamento</h4>
              <Badge variant="outline" className="font-medium">
                {criterioJulgamentoLabel[edital.criterio_julgamento] || edital.criterio_julgamento}
              </Badge>
            </div>
          )}
          {edital.garantia_execucao && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Garantia de Execução</p>
                <p className="text-sm font-medium">{edital.garantia_execucao}%</p>
              </div>
            </div>
          )}
          {edital.fonte_recursos && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Fonte de Recursos</h4>
              <p className="text-sm text-muted-foreground">{edital.fonte_recursos}</p>
            </div>
          )}
          {edital.local_portal && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Local/Portal</p>
                <p className="text-sm font-medium">{edital.local_portal}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participação Permitida */}
      {edital.participacao_permitida && Array.isArray(edital.participacao_permitida) && edital.participacao_permitida.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Quem Pode Participar</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {edital.participacao_permitida.map((tipo: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {tipo === "pj" ? "Pessoa Jurídica" : 
                   tipo === "consorcio" ? "Consórcio" : 
                   tipo === "me_epp" ? "ME/EPP" : tipo}
                </Badge>
              ))}
            </div>
            {edital.regras_me_epp && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Regras para ME/EPP</h4>
                <p className="text-sm text-muted-foreground">{edital.regras_me_epp}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documentos de Habilitação */}
      {edital.documentos_habilitacao && Array.isArray(edital.documentos_habilitacao) && edital.documentos_habilitacao.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Documentos Exigidos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {edital.documentos_habilitacao.map((doc: string, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm capitalize">{doc.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anexos */}
      {edital.anexos && Object.keys(edital.anexos).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Anexos Disponíveis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {Object.entries(edital.anexos).map(([key, value]) => (
                <Button
                  key={key}
                  variant="outline"
                  className="justify-start"
                  onClick={() => handleDownloadAnexo(key)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {key === "minuta_contrato" ? "Minuta do Contrato (Anexo I)" :
                   key === "planilha_custos" ? "Planilha de Custos (Anexo II)" :
                   key === "folha_dados" ? "Folha de Dados (Anexo V)" :
                   key === "termo_referencia" ? "Termo de Referência (Anexo VI)" : key}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
