import { FileText, Calendar, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

const editais = [
  {
    id: 1,
    titulo: "Edital 001/2025 - Credenciamento Cardiologia",
    descricao: "Processo de credenciamento de prestadores da área de cardiologia",
    dataInicio: "2025-09-01",
    dataFim: "2025-10-31",
    vagas: 15,
    status: "em_habilitacao" as const,
  },
  {
    id: 2,
    titulo: "Edital 002/2025 - Credenciamento Pediatria",
    descricao: "Processo de credenciamento de prestadores da área de pediatria",
    dataInicio: "2025-09-15",
    dataFim: "2025-11-15",
    vagas: 20,
    status: "habilitado" as const,
  },
];

export default function Editais() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Editais</h1>
          <p className="text-muted-foreground mt-2">
            Processos de credenciamento disponíveis
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Novo Edital
        </Button>
      </div>

      <div className="grid gap-6">
        {editais.map((edital) => (
          <Card key={edital.id} className="border bg-card card-glow hover-lift">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {edital.titulo}
                  </CardTitle>
                  <CardDescription>{edital.descricao}</CardDescription>
                </div>
                <StatusBadge status={edital.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(edital.dataInicio).toLocaleDateString("pt-BR")} -{" "}
                    {new Date(edital.dataFim).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{edital.vagas} vagas disponíveis</span>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button variant="outline" className="border-border hover:bg-card">
                  Ver Detalhes
                </Button>
                <Button variant="outline" className="border-border hover:bg-card">
                  Baixar Edital
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
