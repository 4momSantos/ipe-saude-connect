import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Stethoscope } from "lucide-react";

interface EspecialidadesHorariosProps {
  credenciadoId: string;
}

const mockEspecialidades = [
  {
    id: "1",
    nome: "Cardiologia",
    crm: "12345-SC",
    horarios: [
      { dia: "Segunda-feira", inicio: "08:00", fim: "12:00" },
      { dia: "Quarta-feira", inicio: "14:00", fim: "18:00" },
      { dia: "Sexta-feira", inicio: "08:00", fim: "12:00" },
    ],
  },
  {
    id: "2",
    nome: "Clínica Médica",
    crm: "12345-SC",
    horarios: [
      { dia: "Terça-feira", inicio: "09:00", fim: "17:00" },
      { dia: "Quinta-feira", inicio: "09:00", fim: "17:00" },
    ],
  },
];

export function EspecialidadesHorarios({ credenciadoId }: EspecialidadesHorariosProps) {
  return (
    <div className="space-y-6">
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Especialidades e Horários de Atendimento
          </CardTitle>
          <CardDescription>
            Configuração de especialidades vinculadas e agenda de atendimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mockEspecialidades.map((especialidade) => (
              <div
                key={especialidade.id}
                className="rounded-lg border border-border bg-card p-6 space-y-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {especialidade.nome}
                    </h3>
                    <p className="text-sm text-muted-foreground">CRM: {especialidade.crm}</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                    Ativo
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Horários de Atendimento
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {especialidade.horarios.map((horario, index) => (
                      <div
                        key={index}
                        className="rounded-md bg-muted/50 p-3 space-y-1"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {horario.dia}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {horario.inicio} - {horario.fim}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
