import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Calendar, Building2, Clock, Edit2, FileText, CreditCard, Hash } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface DadosCadastraisProps {
  credenciado: {
    id: string;
    nome: string;
    cpfCnpj: string;
    crm: string;
    especialidade: string;
    email: string;
    telefone: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    dataCredenciamento: string;
    data_solicitacao?: string | null;
    data_habilitacao?: string | null;
    data_inicio_atendimento?: string | null;
    observacoes?: string | null;
  };
  hasRole?: (role: string) => boolean;
  isCandidato?: boolean;
  onSolicitarAlteracao?: (campo: string, valorAtual: string) => void;
}

export function DadosCadastrais({ 
  credenciado, 
  hasRole,
  isCandidato = false,
  onSolicitarAlteracao 
}: DadosCadastraisProps) {
  const [editarDatasOpen, setEditarDatasOpen] = useState(false);
  const [novaDataInicio, setNovaDataInicio] = useState<string>(
    credenciado.data_inicio_atendimento || ""
  );
  const [justificativa, setJustificativa] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSalvarDatas = async () => {
    if (!novaDataInicio) {
      toast.error("Data de início é obrigatória");
      return;
    }
    if (!justificativa.trim()) {
      toast.error("Justificativa é obrigatória");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("credenciados")
        .update({
          data_inicio_atendimento: novaDataInicio,
          observacoes: `${credenciado.observacoes || ""}\n\n[${format(new Date(), "dd/MM/yyyy HH:mm")}] Ajuste de data de início: ${justificativa}`.trim()
        })
        .eq("id", credenciado.id);

      if (error) throw error;

      toast.success("Data atualizada com sucesso");
      setEditarDatasOpen(false);
      queryClient.invalidateQueries({ queryKey: ["credenciado"] });
    } catch (error: any) {
      console.error("Erro ao atualizar data:", error);
      toast.error("Erro ao atualizar data: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const calcularTempoProcesso = () => {
    if (!credenciado.data_solicitacao || !credenciado.data_habilitacao) {
      return "N/A";
    }
    const dias = differenceInDays(
      new Date(credenciado.data_habilitacao),
      new Date(credenciado.data_solicitacao)
    );
    return `${dias} dia${dias !== 1 ? "s" : ""}`;
  };

  const renderCampoEditavel = (
    label: string, 
    value: string, 
    campo: string,
    icon?: React.ElementType
  ) => {
    const IconComponent = icon || FileText;
    
    return (
      <div className="min-w-0">
        <label className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5 md:gap-2">
          <IconComponent className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </label>
        <div className="flex items-start justify-between gap-2 mt-1">
          <p className="text-sm md:text-base font-medium text-foreground break-words flex-1 min-w-0">{value}</p>
          {isCandidato && onSolicitarAlteracao && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSolicitarAlteracao(campo, value)}
              className="h-6 w-6 md:h-8 md:w-8 p-0 shrink-0"
            >
              <Edit2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
      {/* Informações Principais */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
            <span className="truncate">Informações Principais</span>
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Dados cadastrais do credenciado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="grid gap-3 md:gap-4">
            {renderCampoEditavel("Nome Completo", credenciado.nome, "nome", Building2)}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {renderCampoEditavel("CNPJ", credenciado.cpfCnpj, "cpfCnpj", CreditCard)}
              {renderCampoEditavel("CRM", credenciado.crm, "crm", Hash)}
            </div>
            <div className="min-w-0">
              <label className="text-xs md:text-sm font-medium text-muted-foreground">Especialidade Principal</label>
              <div className="mt-1 flex items-center justify-between gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1 truncate">
                  {credenciado.especialidade}
                </Badge>
                {isCandidato && onSolicitarAlteracao && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSolicitarAlteracao("especialidade", credenciado.especialidade)}
                    className="h-6 w-6 md:h-8 md:w-8 p-0 shrink-0"
                  >
                    <Edit2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <label className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5 md:gap-2">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                <span className="truncate">Data de Credenciamento</span>
              </label>
              <p className="text-sm md:text-base font-medium text-foreground mt-1">{credenciado.dataCredenciamento}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações de Contato */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
            <span className="truncate">Informações de Contato</span>
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Dados para comunicação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="grid gap-3 md:gap-4">
            {renderCampoEditavel("E-mail", credenciado.email, "email", Mail)}
            {renderCampoEditavel("Telefone", credenciado.telefone, "telefone", Phone)}
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card className="card-glow md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
            <span className="truncate">Endereço</span>
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Localização do estabelecimento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="sm:col-span-2">
              {renderCampoEditavel("Logradouro", credenciado.endereco, "endereco", MapPin)}
            </div>
            <div>
              {renderCampoEditavel("CEP", credenciado.cep, "cep")}
            </div>
            {renderCampoEditavel("Cidade", credenciado.cidade, "cidade")}
            {renderCampoEditavel("Estado", credenciado.estado, "estado")}
          </div>
        </CardContent>
      </Card>

      {/* Datas do Credenciamento */}
      <Card className="card-glow md:col-span-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
            <span className="truncate">Datas do Credenciamento</span>
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Registro das etapas do processo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="space-y-1 min-w-0">
              <Label className="text-xs md:text-sm text-muted-foreground truncate block">Data da Solicitação</Label>
              <p className="font-medium text-xs md:text-sm break-words">
                {credenciado.data_solicitacao
                  ? format(new Date(credenciado.data_solicitacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : "Não registrada"}
              </p>
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-xs md:text-sm text-muted-foreground truncate block">Data de Habilitação</Label>
              <p className="font-medium text-xs md:text-sm text-success break-words">
                {credenciado.data_habilitacao
                  ? format(new Date(credenciado.data_habilitacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : "Não registrada"}
              </p>
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-xs md:text-sm text-muted-foreground truncate block">Início de Atendimento</Label>
              <p className="font-medium text-xs md:text-sm break-words">
                {credenciado.data_inicio_atendimento
                  ? format(new Date(credenciado.data_inicio_atendimento), "dd/MM/yyyy", { locale: ptBR })
                  : "Não definida"}
              </p>
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-xs md:text-sm text-muted-foreground truncate block">Tempo de Processo</Label>
              <p className="font-medium text-xs md:text-sm text-primary break-words">
                {calcularTempoProcesso()}
              </p>
            </div>
          </div>

          {hasRole?.("gestor") && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditarDatasOpen(true)}
                className="gap-2 text-xs md:text-sm w-full sm:w-auto"
              >
                <Edit2 className="h-3 w-3" />
                Ajustar Datas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição de Datas */}
      <Dialog open={editarDatasOpen} onOpenChange={setEditarDatasOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Datas do Credenciamento</DialogTitle>
            <DialogDescription>
              Edite a data de início de atendimento se houver necessidade de correção ou ajuste
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="data-inicio">Data de Início de Atendimento</Label>
              <Input
                id="data-inicio"
                type="date"
                value={novaDataInicio}
                onChange={(e) => setNovaDataInicio(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Data em que o credenciado efetivamente começou a atender
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa *</Label>
              <Textarea
                id="justificativa"
                placeholder="Descreva o motivo do ajuste..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditarDatasOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarDatas} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
