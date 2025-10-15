import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const passos = [
  {
    numero: "1",
    titulo: "Faça seu Credenciamento",
    descricao: "Cadastre-se e envie sua documentação"
  },
  {
    numero: "2",
    titulo: "Documentação Analisada",
    descricao: "Nossa equipe analisa seus documentos"
  },
  {
    numero: "3",
    titulo: "Receba seu Certificado",
    descricao: "Certificado digital emitido automaticamente"
  },
  {
    numero: "4",
    titulo: "Valide a Qualquer Momento",
    descricao: "Consulta pública e transparente"
  }
];

export default function ComoFuncionaSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Como Funciona</h2>
          <p className="text-muted-foreground text-lg">
            Processo simples e transparente
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {passos.map((passo, index) => (
            <div key={index} className="relative">
              <Card className="h-full">
                <CardContent className="pt-8 space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full font-bold text-xl">
                    {passo.numero}
                  </div>
                  <h3 className="font-semibold text-lg">{passo.titulo}</h3>
                  <p className="text-sm text-muted-foreground">{passo.descricao}</p>
                  <CheckCircle className="h-5 w-5 text-primary" />
                </CardContent>
              </Card>
              {index < passos.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-primary/30" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
