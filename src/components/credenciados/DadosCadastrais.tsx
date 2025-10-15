import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Calendar, Building2, Clock, Edit2 } from "lucide-react";
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
}

export function DadosCadastrais({ credenciado, hasRole }: DadosCadastraisProps) {
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

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Informações Principais */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Informações Principais
          </CardTitle>
          <CardDescription>Dados cadastrais do credenciado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.nome}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                <p className="text-base font-medium text-foreground mt-1">{credenciado.cpfCnpj}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">CRM</label>
                <p className="text-base font-medium text-foreground mt-1">{credenciado.crm}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Especialidade Principal</label>
              <div className="mt-1">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {credenciado.especialidade}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data de Credenciamento
              </label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.dataCredenciamento}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações de Contato */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Informações de Contato
          </CardTitle>
          <CardDescription>Dados para comunicação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail
              </label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.telefone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card className="card-glow md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Endereço
          </CardTitle>
          <CardDescription>Localização do estabelecimento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Logradouro</label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.endereco}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">CEP</label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.cep}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cidade</label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.cidade}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <p className="text-base font-medium text-foreground mt-1">{credenciado.estado}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datas do Credenciamento */}
      <Card className="card-glow md:col-span-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Datas do Credenciamento
          </CardTitle>
          <CardDescription>Registro das etapas do processo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Data da Solicitação</Label>
              <p className="font-medium text-sm">
                {credenciado.data_solicitacao
                  ? format(new Date(credenciado.data_solicitacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : "Não registrada"}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Data de Habilitação</Label>
              <p className="font-medium text-sm text-success">
                {credenciado.data_habilitacao
                  ? format(new Date(credenciado.data_habilitacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : "Não registrada"}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Início de Atendimento</Label>
              <p className="font-medium text-sm">
                {credenciado.data_inicio_atendimento
                  ? format(new Date(credenciado.data_inicio_atendimento), "dd/MM/yyyy", { locale: ptBR })
                  : "Não definida"}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Tempo de Processo</Label>
              <p className="font-medium text-sm text-primary">
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
                className="gap-2"
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
