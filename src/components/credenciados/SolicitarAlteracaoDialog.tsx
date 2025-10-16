import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileEdit, Loader2 } from "lucide-react";
import { useCriarSolicitacao } from "@/hooks/useSolicitacoesAlteracao";

interface SolicitarAlteracaoDialogProps {
  credenciadoId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  campoInicial?: string;
  valorAtual?: string;
  dadosAtuais?: {
    endereco?: string;
    telefone?: string;
    email?: string;
    especialidades?: string;
  };
}

const TIPOS_ALTERACAO = [
  "Alteração de Endereço",
  "Alteração de Telefone",
  "Alteração de Email",
  "Atualização de Especialidade",
  "Alteração de Horários",
  "Outros",
];

export function SolicitarAlteracaoDialog({ 
  credenciadoId, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange, 
  campoInicial,
  valorAtual,
  dadosAtuais = {} 
}: SolicitarAlteracaoDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [tipo, setTipo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [dadosNovos, setDadosNovos] = useState("");
  
  const criarMutation = useCriarSolicitacao();
  
  // Pré-preencher campos quando campoInicial for fornecido
  useEffect(() => {
    if (campoInicial && open) {
      const tipoMap: Record<string, string> = {
        'nome': 'Outros',
        'endereco': 'Alteração de Endereço',
        'telefone': 'Alteração de Telefone',
        'email': 'Alteração de Email',
        'cpf': 'Outros',
        'cnpj': 'Outros',
        'rg': 'Outros',
        'crm': 'Outros',
        'especialidade': 'Atualização de Especialidade',
        'cidade': 'Alteração de Endereço',
        'estado': 'Alteração de Endereço',
        'cep': 'Alteração de Endereço',
        'celular': 'Alteração de Telefone',
      };
      setTipo(tipoMap[campoInicial] || 'Outros');
      setDadosNovos(valorAtual || '');
    }
  }, [campoInicial, valorAtual, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tipo || !justificativa.trim() || !dadosNovos.trim()) {
      return;
    }

    const campoAtual = getCampoAtual(tipo);
    
    await criarMutation.mutateAsync({
      credenciado_id: credenciadoId,
      tipo_alteracao: tipo,
      justificativa: justificativa.trim(),
      dados_atuais: dadosAtuais[campoAtual as keyof typeof dadosAtuais] || "N/A",
      dados_propostos: dadosNovos.trim(),
    });

    setOpen(false);
    setTipo("");
    setJustificativa("");
    setDadosNovos("");
  };

  const getCampoAtual = (tipoAlteracao: string): string => {
    if (tipoAlteracao.includes("Endereço")) return "endereco";
    if (tipoAlteracao.includes("Telefone")) return "telefone";
    if (tipoAlteracao.includes("Email")) return "email";
    if (tipoAlteracao.includes("Especialidade")) return "especialidades";
    return "";
  };

  const getDadoAtualLabel = (): string => {
    if (!tipo) return "Selecione um tipo de alteração";
    const campo = getCampoAtual(tipo);
    const valor = dadosAtuais[campo as keyof typeof dadosAtuais];
    return valor || "N/A";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileEdit className="h-4 w-4" />
          Solicitar Alteração
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Solicitar Alteração de Dados</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para solicitar uma alteração nos seus dados cadastrais.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Alteração *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ALTERACAO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tipo && (
              <div className="rounded-md bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Dados Atuais
                </p>
                <p className="text-sm text-foreground">{getDadoAtualLabel()}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dadosNovos">Dados Novos *</Label>
              <Input
                id="dadosNovos"
                value={dadosNovos}
                onChange={(e) => setDadosNovos(e.target.value)}
                placeholder="Informe os novos dados"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa *</Label>
              <Textarea
                id="justificativa"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Explique o motivo da solicitação"
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={criarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={criarMutation.isPending || !tipo || !justificativa.trim() || !dadosNovos.trim()}>
              {criarMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
