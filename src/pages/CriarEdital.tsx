import { EditalWizard } from "@/components/edital/EditalWizard";
import { RoleGuard } from "@/components/RoleGuard";

export default function CriarEdital() {
  return (
    <RoleGuard requiredRoles={["gestor", "admin"]}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <EditalWizard />
      </div>
    </RoleGuard>
  );
}
