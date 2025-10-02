import { ClipboardList, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";

const recentApplications = [
  {
    id: 1,
    name: "Dr. João Silva",
    specialty: "Cardiologia",
    status: "em_analise" as const,
    date: "2025-09-28",
  },
  {
    id: 2,
    name: "Clínica MedCenter",
    specialty: "Clínica Geral",
    status: "pendente" as const,
    date: "2025-09-27",
  },
  {
    id: 3,
    name: "Dra. Maria Santos",
    specialty: "Pediatria",
    status: "aprovado" as const,
    date: "2025-09-26",
  },
  {
    id: 4,
    name: "Hospital Santa Clara",
    specialty: "Hospitalar",
    status: "habilitado" as const,
    date: "2025-09-25",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral do sistema de credenciamento IPE Saúde
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Em Análise"
          value={24}
          icon={Clock}
          color="blue"
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Aprovados"
          value={156}
          icon={CheckCircle}
          color="green"
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Pendentes"
          value={18}
          icon={AlertCircle}
          color="orange"
          trend={{ value: 5, isPositive: false }}
        />
        <MetricCard
          title="Total Inscrições"
          value={198}
          icon={ClipboardList}
          color="purple"
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      <Card className="border bg-card card-glow">
        <CardHeader>
          <CardTitle className="text-foreground">Últimas Inscrições</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentApplications.map((application, index) => (
              <div
                key={application.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-4 transition-all hover:bg-card/80 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{application.name}</p>
                  <p className="text-sm text-muted-foreground">{application.specialty}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {new Date(application.date).toLocaleDateString("pt-BR")}
                  </span>
                  <StatusBadge status={application.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
