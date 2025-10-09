import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar } from "lucide-react";

export function ProgramarDescredenciamento({ 
  credenciadoId, 
  open, 
  onClose 
}: { 
  credenciadoId: string; 
  open: boolean; 
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    data_descredenciamento_programado: '',
    motivo_descredenciamento: ''
  });

  const handleSubmit = async () => {
    if (!form.data_descredenciamento_programado || !form.motivo_descredenciamento) {
      toast.error("Preencha todos os campos");
      return;
    }

    const { error } = await supabase
      .from('credenciados')
      .update({
        data_descredenciamento_programado: form.data_descredenciamento_programado,
        motivo_descredenciamento: form.motivo_descredenciamento
      })
      .eq('id', credenciadoId);

    if (error) {
      toast.error("Erro ao programar descredenciamento");
      return;
    }

    toast.success("Descredenciamento programado com sucesso");
    queryClient.invalidateQueries({ queryKey: ['credenciado', credenciadoId] });
    setForm({ data_descredenciamento_programado: '', motivo_descredenciamento: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programar Descredenciamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data Programada</Label>
            <Input 
              type="date" 
              value={form.data_descredenciamento_programado}
              onChange={(e) => setForm({ ...form, data_descredenciamento_programado: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground">
              O credenciado será notificado 30 e 7 dias antes da data programada
            </p>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea 
              value={form.motivo_descredenciamento}
              onChange={(e) => setForm({ ...form, motivo_descredenciamento: e.target.value })}
              rows={4}
              placeholder="Descreva o motivo do descredenciamento..."
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" variant="destructive">
            Confirmar Programação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
