import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, Archive, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AcoesEmMassaProps {
  documentosSelecionados: string[];
  onClearSelection: () => void;
}

export function AcoesEmMassa({ documentosSelecionados, onClearSelection }: AcoesEmMassaProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: arquivarEmMassa, isPending: isArchiving } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('documentos_credenciados')
        .update({ status: 'arquivado', is_current: false })
        .in('id', documentosSelecionados);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Documentos arquivados",
        description: `${documentosSelecionados.length} documento(s) arquivado(s) com sucesso.`,
      });
      onClearSelection();
      queryClient.invalidateQueries({ queryKey: ['prazos-documentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-prazos-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao arquivar",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const { mutate: enviarLembreteEmMassa, isPending: isSending } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('enviar-lembretes-massa', {
        body: { documentos_ids: documentosSelecionados }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Lembretes enviados",
        description: `Lembretes enviados para ${documentosSelecionados.length} documento(s).`,
      });
      onClearSelection();
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar lembretes",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const exportarSelecionados = async () => {
    try {
      const { data, error } = await supabase
        .from('v_prazos_completos')
        .select('*')
        .in('id', documentosSelecionados);

      if (error) throw error;

      // Converter para CSV
      const headers = ['Credenciado', 'Tipo', 'Data Vencimento', 'Dias Restantes', 'Status'];
      const rows = data?.map(d => [
        d.credenciado_nome || '',
        d.entidade_nome || '',
        d.data_vencimento || '',
        d.dias_para_vencer || '',
        d.status_atual || ''
      ]) || [];

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentos-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();

      toast({
        title: "Exportação concluída",
        description: "Arquivo CSV baixado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (documentosSelecionados.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg border">
      <div className="flex-1 flex items-center">
        <span className="text-sm font-medium">
          {documentosSelecionados.length} documento(s) selecionado(s)
        </span>
      </div>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => enviarLembreteEmMassa()}
        disabled={isSending}
      >
        <Mail className="h-4 w-4 mr-2" />
        Enviar Lembrete
      </Button>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isArchiving}>
            <Archive className="h-4 w-4 mr-2" />
            Arquivar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar arquivamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar {documentosSelecionados.length} documento(s)? 
              Eles não aparecerão mais na listagem ativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => arquivarEmMassa()}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button 
        variant="outline" 
        size="sm"
        onClick={exportarSelecionados}
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>

      <Button 
        variant="ghost" 
        size="sm"
        onClick={onClearSelection}
      >
        Limpar Seleção
      </Button>
    </div>
  );
}
