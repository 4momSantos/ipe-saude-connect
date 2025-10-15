import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { CamposReprovados } from "./CamposReprovados";
import { DocumentosReprovados } from "./DocumentosReprovados";
import { DecisaoPreview } from "./DecisaoPreview";
import type { Decisao, StatusDecisao, CampoReprovado, DocumentoReprovado } from "@/types/decisao";
import type { InscricaoDocumento } from "@/hooks/useInscricaoDocumentos";

interface FormDecisaoProps {
  inscricaoId: string;
  analiseId: string;
  dadosInscricao: Record<string, any>;
  documentos: InscricaoDocumento[];
  onSubmit: (decisao: Decisao) => void;
  isSubmitting: boolean;
}

export function FormDecisao({
  inscricaoId,
  analiseId,
  dadosInscricao,
  documentos,
  onSubmit,
  isSubmitting
}: FormDecisaoProps) {
  const [status, setStatus] = useState<StatusDecisao>('aprovado');
  const [justificativa, setJustificativa] = useState('');
  const [camposReprovados, setCamposReprovados] = useState<CampoReprovado[]>([]);
  const [documentosReprovados, setDocumentosReprovados] = useState<DocumentoReprovado[]>([]);
  const [prazoCorrecao, setPrazoCorrecao] = useState<Date>();
  const [showPreview, setShowPreview] = useState(false);

  const minCaracteres = status === 'aprovado' ? 100 : 50;
  const isJustificativaValida = justificativa.trim().length >= minCaracteres;
  const isPrazoValido = status !== 'pendente_correcao' || prazoCorrecao !== undefined;
  const isFormValido = isJustificativaValida && isPrazoValido;

  const handleSubmit = () => {
    if (!isFormValido) return;

    const decisao: Decisao = {
      status,
      justificativa: justificativa.trim(),
      campos_reprovados: camposReprovados.length > 0 ? camposReprovados : undefined,
      documentos_reprovados: documentosReprovados.length > 0 ? documentosReprovados : undefined,
      prazo_correcao: prazoCorrecao,
    };

    setShowPreview(true);
  };

  const confirmarDecisao = () => {
    const decisao: Decisao = {
      status,
      justificativa: justificativa.trim(),
      campos_reprovados: camposReprovados.length > 0 ? camposReprovados : undefined,
      documentos_reprovados: documentosReprovados.length > 0 ? documentosReprovados : undefined,
      prazo_correcao: prazoCorrecao,
    };

    onSubmit(decisao);
  };

  if (showPreview) {
    return (
      <DecisaoPreview
        decisao={{
          status,
          justificativa,
          campos_reprovados: camposReprovados,
          documentos_reprovados: documentosReprovados,
          prazo_correcao: prazoCorrecao
        }}
        onConfirm={confirmarDecisao}
        onEdit={() => setShowPreview(false)}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Tipo de Decisão */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Tipo de Decisão *</Label>
        <RadioGroup value={status} onValueChange={(v) => setStatus(v as StatusDecisao)}>
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="aprovado" id="aprovado" />
            <Label htmlFor="aprovado" className="flex items-center gap-2 cursor-pointer flex-1">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold">Aprovar Inscrição</div>
                <div className="text-sm text-muted-foreground">
                  Documentos e dados estão em conformidade
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="reprovado" id="reprovado" />
            <Label htmlFor="reprovado" className="flex items-center gap-2 cursor-pointer flex-1">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <div className="font-semibold">Reprovar Inscrição</div>
                <div className="text-sm text-muted-foreground">
                  Não atende aos requisitos do edital
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="pendente_correcao" id="pendente_correcao" />
            <Label htmlFor="pendente_correcao" className="flex items-center gap-2 cursor-pointer flex-1">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <div className="font-semibold">Solicitar Correção</div>
                <div className="text-sm text-muted-foreground">
                  Necessita ajustes antes de prosseguir
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Justificativa */}
      <div className="space-y-3">
        <Label htmlFor="justificativa" className="text-base font-semibold">
          Justificativa * 
          <span className="text-sm font-normal text-muted-foreground ml-2">
            (mínimo {minCaracteres} caracteres - {justificativa.length}/{minCaracteres})
          </span>
        </Label>
        <Textarea
          id="justificativa"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          placeholder={
            status === 'aprovado' 
              ? "Descreva detalhadamente os motivos da aprovação, documentos validados e conformidades atendidas..."
              : status === 'reprovado'
              ? "Descreva detalhadamente os motivos da reprovação..."
              : "Descreva quais correções são necessárias e por quê..."
          }
          className={cn(
            "min-h-[150px]",
            !isJustificativaValida && justificativa.length > 0 && "border-red-500"
          )}
        />
        {!isJustificativaValida && justificativa.length > 0 && (
          <p className="text-sm text-red-600">
            Ainda faltam {minCaracteres - justificativa.length} caracteres
          </p>
        )}
        {status === 'aprovado' && (
          <p className="text-sm text-muted-foreground">
            ℹ️ A aprovação requer justificativa mais detalhada (mínimo 100 caracteres)
          </p>
        )}
      </div>

      {/* Campos Reprovados (se status != aprovado) */}
      {status !== 'aprovado' && (
        <CamposReprovados
          dadosInscricao={dadosInscricao}
          camposReprovados={camposReprovados}
          onCamposChange={setCamposReprovados}
        />
      )}

      {/* Documentos Reprovados (se status != aprovado) */}
      {status !== 'aprovado' && (
        <DocumentosReprovados
          documentos={documentos}
          documentosReprovados={documentosReprovados}
          onDocumentosChange={setDocumentosReprovados}
        />
      )}

      {/* Prazo de Correção (se pendente_correcao) */}
      {status === 'pendente_correcao' && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">Prazo para Correção *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !prazoCorrecao && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {prazoCorrecao ? format(prazoCorrecao, "PPP", { locale: ptBR }) : "Selecione uma data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={prazoCorrecao}
                onSelect={setPrazoCorrecao}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!isFormValido || isSubmitting}
          className="flex-1"
        >
          Revisar Decisão
        </Button>
      </div>
    </div>
  );
}
