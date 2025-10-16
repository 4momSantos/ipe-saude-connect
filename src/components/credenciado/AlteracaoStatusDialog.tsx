import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, CheckCircle2, XCircle, AlertTriangle, UserX, Ban, Loader2 } from "lucide-react";
import { useAlterarStatusCredenciado } from "@/hooks/useAlterarStatusCredenciado";

type StatusCredenciado = 'Ativo' | 'Suspenso' | 'Descredenciado' | 'Afastado' | 'Inativo';

interface AlteracaoStatusDialogProps {
  open: boolean;
  onClose: () => void;
  credenciadoId: string;
  credenciadoNome: string;
  statusAtual: string;
  onSuccess: () => void;
}

export function AlteracaoStatusDialog({
  open,
  onClose,
  credenciadoId,
  credenciadoNome,
  statusAtual,
  onSuccess
}: AlteracaoStatusDialogProps) {
  const [novoStatus, setNovoStatus] = useState<StatusCredenciado>('Ativo');
  const [justificativa, setJustificativa] = useState('');
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();
  const [dataEfetiva, setDataEfetiva] = useState<Date>();
  const [descredenciarImediato, setDescredenciarImediato] = useState(true);
  const [motivoDetalhado, setMotivoDetalhado] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const mutation = useAlterarStatusCredenciado();

  const isJustificativaValida = justificativa.trim().length >= 100;
  const isDatasValidas = (novoStatus !== 'Suspenso' && novoStatus !== 'Afastado') || (dataInicio && dataFim && dataFim > dataInicio);
  const isDataEfetivaValida = novoStatus !== 'Descredenciado' || descredenciarImediato || dataEfetiva !== undefined;
  const isFormValido = isJustificativaValida && isDatasValidas && isDataEfetivaValida;

  const getStatusConfig = (status: StatusCredenciado) => {
    switch (status) {
      case 'Ativo':
        return { 
          icon: CheckCircle2, 
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          borderColor: 'border-green-200 dark:border-green-800',
          label: 'Ativo',
          description: 'Credenciado em pleno funcionamento'
        };
      case 'Suspenso':
        return { 
          icon: AlertTriangle, 
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          label: 'Suspenso',
          description: 'Suspensão temporária com prazo definido'
        };
      case 'Afastado':
        return { 
          icon: UserX, 
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-blue-200 dark:border-blue-800',
          label: 'Afastado',
          description: 'Afastamento temporário do profissional'
        };
      case 'Descredenciado':
        return { 
          icon: XCircle, 
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          borderColor: 'border-red-200 dark:border-red-800',
          label: 'Descredenciado',
          description: 'Encerramento definitivo do credenciamento'
        };
      case 'Inativo':
        return { 
          icon: Ban, 
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-950/30',
          borderColor: 'border-gray-200 dark:border-gray-800',
          label: 'Inativo',
          description: 'Inativo sem prazo definido'
        };
    }
  };

  const handleRevisar = () => {
    if (!isFormValido) return;
    setShowPreview(true);
  };

  const handleConfirmar = async () => {
    try {
      const dataEfetivaFinal = descredenciarImediato ? new Date().toISOString().split('T')[0] : dataEfetiva?.toISOString().split('T')[0];
      
      await mutation.mutateAsync({
        credenciado_id: credenciadoId,
        novo_status: novoStatus,
        justificativa,
        data_inicio: dataInicio?.toISOString().split('T')[0],
        data_fim: dataFim?.toISOString().split('T')[0],
        data_efetiva: dataEfetivaFinal,
        motivo_detalhado: motivoDetalhado || undefined
      });
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const resetForm = () => {
    setNovoStatus('Ativo');
    setJustificativa('');
    setDataInicio(undefined);
    setDataFim(undefined);
    setDataEfetiva(undefined);
    setDescredenciarImediato(true);
    setMotivoDetalhado('');
    setShowPreview(false);
  };

  if (showPreview) {
    const config = getStatusConfig(novoStatus);
    const Icon = config.icon;

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Alteração de Status</DialogTitle>
            <DialogDescription>
              Confirme os dados antes de finalizar a alteração
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Alert className={cn(config.bgColor, config.borderColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">
                    Status será alterado de "{statusAtual}" para "{novoStatus}"
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Credenciado: {credenciadoNome}
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {(novoStatus === 'Suspenso' || novoStatus === 'Afastado') && dataInicio && dataFim && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-semibold mb-2">Período:</p>
                <p className="text-sm">
                  De {format(dataInicio, "PPP", { locale: ptBR })} até {format(dataFim, "PPP", { locale: ptBR })}
                </p>
              </div>
            )}

            {novoStatus === 'Descredenciado' && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-semibold mb-2">Data Efetiva:</p>
                <p className="text-sm">
                  {descredenciarImediato ? 'Imediato (hoje)' : dataEfetiva ? format(dataEfetiva, "PPP", { locale: ptBR }) : 'Não definida'}
                </p>
              </div>
            )}

            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-semibold mb-2">Justificativa:</p>
              <p className="text-sm whitespace-pre-wrap break-words">{justificativa}</p>
            </div>

            {motivoDetalhado && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-semibold mb-2">Motivo Detalhado:</p>
                <p className="text-sm whitespace-pre-wrap">{motivoDetalhado}</p>
              </div>
            )}

            {novoStatus === 'Descredenciado' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>ATENÇÃO:</strong> O descredenciamento é IRREVERSÍVEL. 
                  Uma vez descredenciado, será necessária uma nova inscrição para reativar.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(false)}
                disabled={mutation.isPending}
                className="flex-1"
              >
                Voltar e Editar
              </Button>
              <Button 
                onClick={handleConfirmar}
                disabled={mutation.isPending}
                variant={novoStatus === 'Descredenciado' ? 'destructive' : 'default'}
                className="flex-1"
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Alteração
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">Alterar Status - {credenciadoNome}</DialogTitle>
          <DialogDescription>
            Status Atual: <span className="font-semibold">{statusAtual}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Status */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Novo Status *</Label>
            <RadioGroup value={novoStatus} onValueChange={(v) => setNovoStatus(v as StatusCredenciado)}>
              {(['Ativo', 'Suspenso', 'Afastado', 'Descredenciado', 'Inativo'] as StatusCredenciado[]).map((status) => {
                const config = getStatusConfig(status);
                const Icon = config.icon;
                
                return (
                  <div 
                    key={status}
                    className={cn(
                      "flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all",
                      novoStatus === status ? cn(config.bgColor, config.borderColor) : "hover:bg-accent/50"
                    )}
                  >
                    <RadioGroupItem value={status} id={status} />
                    <Label htmlFor={status} className="flex items-center gap-3 cursor-pointer flex-1">
                      <Icon className={cn("h-5 w-5", config.color)} />
                      <div>
                        <div className="font-semibold">{config.label}</div>
                        <div className="text-sm text-muted-foreground">{config.description}</div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Datas para Suspenso/Afastado */}
          {(novoStatus === 'Suspenso' || novoStatus === 'Afastado') && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <Label className="text-base font-semibold">Período de {novoStatus} *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataInicio && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataInicio}
                        onSelect={setDataInicio}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataFim && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataFim}
                        onSelect={setDataFim}
                        disabled={(date) => dataInicio ? date <= dataInicio : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Data Efetiva para Descredenciado */}
          {novoStatus === 'Descredenciado' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <Label className="text-base font-semibold">Descredenciamento *</Label>
              
              <RadioGroup value={descredenciarImediato ? 'imediato' : 'programado'} onValueChange={(v) => setDescredenciarImediato(v === 'imediato')}>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="imediato" id="imediato" />
                  <Label htmlFor="imediato" className="cursor-pointer flex-1">
                    <div className="font-semibold">Imediato</div>
                    <div className="text-sm text-muted-foreground">Descredenciar hoje</div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="programado" id="programado" />
                  <Label htmlFor="programado" className="cursor-pointer flex-1">
                    <div className="font-semibold">Programado</div>
                    <div className="text-sm text-muted-foreground">Definir data futura</div>
                  </Label>
                </div>
              </RadioGroup>

              {!descredenciarImediato && (
                <div className="space-y-2">
                  <Label>Data de Descredenciamento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataEfetiva && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataEfetiva ? format(dataEfetiva, "PPP", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataEfetiva}
                        onSelect={setDataEfetiva}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          )}

          {/* Justificativa */}
          <div className="space-y-3">
            <Label htmlFor="justificativa" className="text-base font-semibold">
              Justificativa * 
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (mínimo 100 caracteres - {justificativa.length}/100)
              </span>
            </Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva detalhadamente o motivo da alteração de status..."
              className={cn(
                "min-h-[120px] break-words",
                !isJustificativaValida && justificativa.length > 0 && "border-red-500"
              )}
            />
            {!isJustificativaValida && justificativa.length > 0 && (
              <p className="text-sm text-red-600">
                Ainda faltam {100 - justificativa.length} caracteres
              </p>
            )}
          </div>

          {/* Motivo Detalhado (opcional, só para Descredenciado) */}
          {novoStatus === 'Descredenciado' && (
            <div className="space-y-3">
              <Label htmlFor="motivoDetalhado" className="text-base font-semibold">
                Motivo Detalhado (Opcional)
              </Label>
              <Textarea
                id="motivoDetalhado"
                value={motivoDetalhado}
                onChange={(e) => setMotivoDetalhado(e.target.value)}
                placeholder="Informações adicionais sobre o descredenciamento..."
                className="min-h-[80px]"
              />
            </div>
          )}

          {/* Avisos */}
          {novoStatus === 'Descredenciado' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>ATENÇÃO:</strong> O descredenciamento é uma ação IRREVERSÍVEL. 
                Uma vez descredenciado, será necessária uma nova inscrição completa para reativação.
              </AlertDescription>
            </Alert>
          )}

          {statusAtual === 'Descredenciado' && novoStatus === 'Ativo' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Não é possível reativar um credenciado descredenciado. É necessária nova inscrição.
              </AlertDescription>
            </Alert>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleRevisar} 
              disabled={!isFormValido || (statusAtual === 'Descredenciado' && novoStatus === 'Ativo')}
              className="flex-1"
            >
              Revisar Alteração
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
