import { SolicitacoesAlteracao } from '../SolicitacoesAlteracao';

interface SolicitacoesAlteracaoTabProps {
  credenciadoId: string;
}

export function SolicitacoesAlteracaoTab({ credenciadoId }: SolicitacoesAlteracaoTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">Minhas Solicitações</h2>
      <SolicitacoesAlteracao credenciadoId={credenciadoId} />
    </div>
  );
}
