import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FormSuspensaoProps {
  credenciadoId: string;
  credenciadoNome: string;
}

export function FormSuspensao({ credenciadoId, credenciadoNome }: FormSuspensaoProps) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [dataFim, setDataFim] = useState<Date>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('credenciados')
        .update({
          status: 'Suspenso',
          motivo_suspensao: motivo,
          suspensao_inicio: dataInicio.toISOString(),
          suspensao_fim: dataFim?.toISOString(),
          suspensao_automatica: false
        })
        .eq('id', credenciadoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credenciado-situacao', credenciadoId] });
      queryClient.invalidateQueries({ queryKey: ['historico-status', credenciadoId] });
      toast.success("Credenciado suspenso com sucesso");
      setOpen(false);
      setMotivo("");
      setDataFim(undefined);
    },
    onError: (error) => {
      console.error("Erro ao suspender:", error);
      toast.error("Erro ao suspender credenciado");
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Suspender Credenciado</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Suspender Credenciado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Credenciado: {credenciadoNome}</p>
          </div>

          <div>
            <Label>Motivo da Suspensão *</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da suspensão..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dataInicio, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={(date) => date && setDataInicio(date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Data Fim (Opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Indefinido"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    locale={ptBR}
                    disabled={(date) => date < dataInicio}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={!motivo || mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? "Suspendendo..." : "Confirmar Suspensão"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}