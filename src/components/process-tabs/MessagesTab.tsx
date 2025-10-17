import { ChatWorkflow } from '@/components/workflow/ChatWorkflow';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CandidatoInfoCard } from './CandidatoInfoCard';

interface MessagesTabProps {
  processoId: string;
  candidatoNome: string;
  executionId?: string;
  inscricaoId: string;
  dadosInscricao?: any;
}

export function MessagesTab({ 
  processoId, 
  candidatoNome, 
  executionId, 
  inscricaoId,
  dadosInscricao
}: MessagesTabProps) {
  const { isAdmin, isGestor, isAnalista } = useUserRole();
  
  // Determinar papel do usuário
  const usuarioPapel = isAdmin ? 'admin' 
    : isGestor ? 'gestor'
    : isAnalista ? 'analista' 
    : 'candidato';

  // Buscar credenciado vinculado à inscrição
  const { data: credenciado } = useQuery({
    queryKey: ['credenciado-inscricao', inscricaoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('credenciados')
        .select('*')
        .eq('inscricao_id', inscricaoId)
        .single();
      return data;
    },
    enabled: !!inscricaoId && usuarioPapel === 'candidato'
  });

  // Buscar documentos do credenciado
  const { data: documentos } = useQuery({
    queryKey: ['documentos-credenciado', credenciado?.id],
    queryFn: async () => {
      if (!credenciado?.id) return [];
      
      const { data } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .eq('inscricao_id', inscricaoId)
        .eq('is_current', true)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!credenciado?.id && usuarioPapel === 'candidato'
  });

  return (
    <div className="space-y-4">
      <CandidatoInfoCard dadosInscricao={dadosInscricao} />
      <ChatWorkflow
        inscricaoId={inscricaoId}
        executionId={executionId}
        etapaAtual={undefined}
        usuarioPapel={usuarioPapel}
        credenciadoId={credenciado?.id}
        dadosCredenciado={credenciado}
        documentosCredenciado={documentos || []}
      />
    </div>
  );
}
