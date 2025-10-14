import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SituacaoCadastralDashboard } from "@/components/credenciado/SituacaoCadastralDashboard";
import { FormSuspensao } from "@/components/credenciado/FormSuspensao";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SituacaoCadastral() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: credenciado, isLoading } = useQuery({
    queryKey: ['credenciado', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credenciados')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  if (!id) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-red-500">ID do credenciado não fornecido</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center">Carregando...</p>
      </div>
    );
  }

  if (!credenciado) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-red-500">Credenciado não encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Situação Cadastral</h1>
            <p className="text-muted-foreground">{credenciado.nome}</p>
          </div>
        </div>
        
        {credenciado.status === 'Ativo' && (
          <FormSuspensao credenciadoId={id} credenciadoNome={credenciado.nome} />
        )}
      </div>

      <SituacaoCadastralDashboard credenciadoId={id} />
    </div>
  );
}