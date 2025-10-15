import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Smartphone, FileCheck, Clock } from "lucide-react";

const beneficios = [
  {
    icon: ShieldCheck,
    titulo: "Segurança e Confiabilidade",
    descricao: "Certificados digitais com hash de verificação garantem autenticidade"
  },
  {
    icon: Smartphone,
    titulo: "Acesso Rápido",
    descricao: "Consulte certificados em qualquer lugar, a qualquer hora"
  },
  {
    icon: FileCheck,
    titulo: "Transparência Total",
    descricao: "Validade, status e informações sempre atualizadas"
  },
  {
    icon: Clock,
    titulo: "Validação Instantânea",
    descricao: "Resultados em tempo real sem burocracia"
  }
];

export default function BeneficiosSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Por que usar nosso sistema?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tecnologia e praticidade para simplificar o processo de credenciamento
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {beneficios.map((item, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 space-y-4">
                <div className="inline-flex p-4 bg-primary/10 rounded-full">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{item.titulo}</h3>
                <p className="text-sm text-muted-foreground">{item.descricao}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
