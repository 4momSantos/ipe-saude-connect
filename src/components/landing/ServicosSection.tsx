import { Card, CardContent } from "@/components/ui/card";
import { 
  FileCheck, 
  ShieldCheck, 
  Clock, 
  Users, 
  Hospital, 
  MapPin,
  FileText,
  Bell,
  Star,
  Activity
} from "lucide-react";

const servicos = [
  {
    icon: FileCheck,
    titulo: "Validação de Certificados",
    descricao: "Consulte certificados em tempo real"
  },
  {
    icon: ShieldCheck,
    titulo: "Credenciamento Seguro",
    descricao: "Processo digital protegido"
  },
  {
    icon: Clock,
    titulo: "Acompanhamento Online",
    descricao: "Status em tempo real"
  },
  {
    icon: Hospital,
    titulo: "Gestão de Prestadores",
    descricao: "Controle completo de cadastros"
  },
  {
    icon: MapPin,
    titulo: "Mapa de Profissionais",
    descricao: "Encontre prestadores próximos"
  },
  {
    icon: Star,
    titulo: "Avaliações Públicas",
    descricao: "Sistema de reviews transparente"
  },
  {
    icon: FileText,
    titulo: "Gestão Documental",
    descricao: "Documentos organizados e seguros"
  },
  {
    icon: Bell,
    titulo: "Notificações Automáticas",
    descricao: "Alertas de status e vencimento"
  },
  {
    icon: Activity,
    titulo: "Dashboard Analytics",
    descricao: "Relatórios e métricas em tempo real"
  }
];

export function ServicosSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Principais Serviços</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Soluções completas para credenciamento e gestão de prestadores de saúde
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {servicos.map((servico, index) => (
            <Card 
              key={index}
              className="bg-card hover:bg-accent/50 transition-all duration-300 hover:shadow-lg border-2 border-segurados/30 hover:border-segurados"
            >
              <CardContent className="p-6 space-y-3">
                <div className="inline-flex p-3 bg-segurados/10 rounded-lg">
                  <servico.icon className="h-6 w-6 text-segurados" />
                </div>
                <h3 className="font-semibold text-lg text-[hsl(135,84%,15%)]">
                  {servico.titulo}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {servico.descricao}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
