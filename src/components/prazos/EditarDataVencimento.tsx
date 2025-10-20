import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

interface EditarDataVencimentoProps {
  documentoId: string;
  dataAtual?: string;
  onSuccess?: () => void;
  entidadeTipo?: 'documento_credenciado' | 'certificado';
}

export function EditarDataVencimento({ documentoId, dataAtual, onSuccess, entidadeTipo = 'documento_credenciado' }: EditarDataVencimentoProps) {
  const [open, setOpen] = useState(false);
  
  // Debug: Log quando modal abre
  useEffect(() => {
    if (open) {
      console.log('📋 [EDIT_DATA] Modal aberto com:', {
        documentoId,
        dataAtual,
        entidadeTipo
      });
    }
  }, [open, documentoId, dataAtual, entidadeTipo]);
  const [novaData, setNovaData] = useState<Date>();
  const [motivo, setMotivo] = useState("");
  const motivoRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: atualizarData, isPending } = useMutation({
    mutationFn: async ({ novaData, motivo }: { novaData: Date; motivo: string }) => {
      console.log('🔄 [EDIT_DATA] Iniciando atualização:', {
        documentoId,
        entidadeTipo,
        dataAtual,
        novaData: format(novaData, 'yyyy-MM-dd'),
        motivo
      });

      // ✅ SEMPRE atualizar controle_prazos (fonte dos dados)
      const { data: updated, error } = await supabase
        .from('controle_prazos')
        .update({ 
          data_vencimento: format(novaData, 'yyyy-MM-dd'),
          atualizado_em: new Date().toISOString()
        })
        .eq('entidade_id', documentoId)
        .eq('entidade_tipo', entidadeTipo)
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ [EDIT_DATA] Erro no UPDATE:', error);
        throw error;
      }

      if (!updated) {
        console.error('❌ [EDIT_DATA] Nenhum registro encontrado');
        throw new Error('Registro não encontrado no controle de prazos');
      }

      console.log('✅ [EDIT_DATA] Prazo atualizado:', updated);

      // Registrar histórico (apenas para documentos)
      if (entidadeTipo === 'documento_credenciado') {
        try {
          await supabase.rpc('registrar_historico_manual', {
            p_documento_id: documentoId,
            p_comentario: `Data alterada para ${format(novaData, "dd/MM/yyyy", { locale: ptBR })}. Motivo: ${motivo}`
          });
        } catch (histErr) {
          console.warn('⚠️ [EDIT_DATA] Erro ao registrar histórico:', histErr);
        }
      }

      return updated;
    },
    onSuccess: (data) => {
      console.log('✅ [EDIT_DATA] Sucesso! Invalidando TODAS as queries relacionadas...');

      // Invalidar TODAS as query keys relacionadas a documentos e prazos
      queryClient.invalidateQueries({ queryKey: ['documentos-credenciado'] });
      queryClient.invalidateQueries({ queryKey: ['prazos-documentos'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-aprovados-agrupados'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-prazos-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-vencimentos'] });
      queryClient.invalidateQueries({ queryKey: ['controle-prazos'] });

      console.log('✅ [EDIT_DATA] Queries invalidadas com sucesso');

      toast({
        title: "Data atualizada!",
        description: `Nova data: ${format(new Date(data.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}`,
      });
      setOpen(false);
      setMotivo("");
      setNovaData(undefined);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('❌ [EDIT_DATA] Falha na atualização:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleDateSelect = (date: Date | undefined) => {
    setNovaData(date);
    
    if (date && motivo.trim()) {
      // Se já tem motivo, salvar automaticamente
      atualizarData({ novaData: date, motivo });
    } else if (date) {
      // Se não tem motivo, focar no campo
      setTimeout(() => {
        motivoRef.current?.focus();
      }, 100);
    }
  };

  const handleSubmit = () => {
    if (!novaData) {
      toast({
        title: "Data obrigatória",
        description: "Por favor, selecione uma nova data.",
        variant: "destructive",
      });
      return;
    }

    // Validar se data está no futuro e dentro de 12 meses
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataEscolhida = new Date(novaData);
    dataEscolhida.setHours(0, 0, 0, 0);
    
    if (dataEscolhida < hoje) {
      toast({
        title: "Data inválida",
        description: "A data de vencimento não pode ser no passado.",
        variant: "destructive",
      });
      return;
    }
    
    // Calcular data máxima (12 meses no futuro)
    const dataMaxima = new Date(hoje);
    dataMaxima.setMonth(dataMaxima.getMonth() + 12);
    
    if (dataEscolhida > dataMaxima) {
      toast({
        title: "Data muito distante",
        description: "A validade máxima é de 12 meses a partir de hoje.",
        variant: "destructive",
      });
      return;
    }

    if (!motivo.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da alteração.",
        variant: "destructive",
      });
      return;
    }

    atualizarData({ novaData, motivo });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Editar Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Data de Vencimento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {dataAtual && (
            <div>
              <Label>Data Atual</Label>
              <Input 
                value={format(new Date(dataAtual), "dd/MM/yyyy", { locale: ptBR })} 
                disabled 
              />
            </div>
          )}
          
          <div>
            <Label>Nova Data de Vencimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {novaData ? format(novaData, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={novaData}
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label>Motivo da Alteração</Label>
            <Textarea 
              ref={motivoRef}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey && novaData && motivo.trim()) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ex: Documento renovado antes do prazo, erro na data anterior, etc."
              rows={3}
            />
            {novaData && <p className="text-xs text-muted-foreground mt-1">Pressione Ctrl+Enter para salvar rapidamente</p>}
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar Alteração"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
