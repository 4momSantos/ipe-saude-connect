import { ChatWorkflow } from '@/components/workflow/ChatWorkflow';
import { useUserRole } from '@/hooks/useUserRole';

interface MessagesTabProps {
  processoId: string;
  candidatoNome: string;
  executionId?: string;
  inscricaoId: string;
}

export function MessagesTab({ 
  processoId, 
  candidatoNome, 
  executionId, 
  inscricaoId 
}: MessagesTabProps) {
  const { isAdmin, isGestor, isAnalista } = useUserRole();
  
  // Determinar papel do usuário
  const usuarioPapel = isAdmin ? 'admin' 
    : isGestor ? 'gestor'
    : isAnalista ? 'analista' 
    : 'candidato';

  return (
    <ChatWorkflow
      inscricaoId={inscricaoId}
      executionId={executionId}
      etapaAtual={undefined}
      usuarioPapel={usuarioPapel}
    />
  );
}
