import { useUserRole } from "@/hooks/useUserRole";
import { DashboardCandidato } from "@/components/dashboard/DashboardCandidato";
import { DashboardAnalista } from "@/components/dashboard/DashboardAnalista";
import { DashboardGestor } from "@/components/dashboard/DashboardGestor";

export default function Dashboard() {
  const { isCandidato, isAnalista, isGestor, isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  // Candidato vê apenas suas inscrições
  if (isCandidato && !isAnalista && !isGestor && !isAdmin) {
    return <DashboardCandidato />;
  }

  // Analista vê painel de análises
  if (isAnalista && !isGestor && !isAdmin) {
    return <DashboardAnalista />;
  }

  // Gestor e Admin veem painel completo
  if (isGestor || isAdmin) {
    return <DashboardGestor />;
  }

  // Fallback para usuários sem role
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">
          Você não possui permissão para acessar esta página.
        </p>
      </div>
    </div>
  );
}
