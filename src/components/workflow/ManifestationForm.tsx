import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, FileSignature, ClipboardList, X } from "lucide-react";

interface ManifestationFormProps {
  tipoManifestation: "parecer" | "decisao" | "justificativa" | "observacao_formal";
  onSubmit: (data: {
    conteudo: string;
    metadata: {
      categoria?: string;
      impacto?: string;
      prazo_resposta?: string;
      requer_aprovacao?: boolean;
    };
  }) => void;
  onCancel: () => void;
  sending: boolean;
}

const TIPO_CONFIG = {
  parecer: {
    icon: FileText,
    label: "Parecer Técnico",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  decisao: {
    icon: CheckCircle,
    label: "Decisão",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  justificativa: {
    icon: FileSignature,
    label: "Justificativa",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  observacao_formal: {
    icon: ClipboardList,
    label: "Observação Formal",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
};

export function ManifestationForm({
  tipoManifestation,
  onSubmit,
  onCancel,
  sending,
}: ManifestationFormProps) {
  const [conteudo, setConteudo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [impacto, setImpacto] = useState("");
  const [prazoResposta, setPrazoResposta] = useState("");
  const [requerAprovacao, setRequerAprovacao] = useState(false);

  const config = TIPO_CONFIG[tipoManifestation];
  const Icon = config.icon;

  const handleSubmit = () => {
    if (!conteudo.trim()) return;

    const metadata: any = {};
    if (categoria) metadata.categoria = categoria;
    if (impacto) metadata.impacto = impacto;
    if (prazoResposta) metadata.prazo_resposta = prazoResposta;
    if (requerAprovacao) metadata.requer_aprovacao = true;

    onSubmit({ conteudo, metadata });
    
    // Reset form
    setConteudo("");
    setCategoria("");
    setImpacto("");
    setPrazoResposta("");
    setRequerAprovacao(false);
  };

  return (
    <div className={`border-2 rounded-lg p-4 space-y-4 ${config.bgColor} border-${config.color.replace('text-', '')}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <h3 className="font-semibold">{config.label}</h3>
          <Badge variant="outline" className={config.color}>
            Manifestação Formal
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="conteudo">Conteúdo da Manifestação *</Label>
          <Textarea
            id="conteudo"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Digite o conteúdo da manifestação..."
            className="min-h-[120px]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger id="categoria">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tecnica">Técnica</SelectItem>
                <SelectItem value="juridica">Jurídica</SelectItem>
                <SelectItem value="administrativa">Administrativa</SelectItem>
                <SelectItem value="financeira">Financeira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="impacto">Nível de Impacto</Label>
            <Select value={impacto} onValueChange={setImpacto}>
              <SelectTrigger id="impacto">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixo">Baixo</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="prazo">Prazo para Resposta</Label>
          <Select value={prazoResposta} onValueChange={setPrazoResposta}>
            <SelectTrigger id="prazo">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 horas</SelectItem>
              <SelectItem value="48h">48 horas</SelectItem>
              <SelectItem value="72h">72 horas</SelectItem>
              <SelectItem value="5d">5 dias úteis</SelectItem>
              <SelectItem value="10d">10 dias úteis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="aprovacao"
            checked={requerAprovacao}
            onCheckedChange={setRequerAprovacao}
          />
          <Label htmlFor="aprovacao">Requer aprovação adicional</Label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={!conteudo.trim() || sending}
          className="flex-1"
        >
          {sending ? "Enviando..." : "Registrar Manifestação"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={sending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
