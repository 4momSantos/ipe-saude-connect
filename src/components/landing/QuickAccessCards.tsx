import { Link } from "react-router-dom";
import { Users, Stethoscope, Shield, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const accessCards = [
  {
    title: "Sou Segurado",
    description: "Validar certificados de prestadores",
    icon: Users,
    link: "/#validar-certificado",
    color: "bg-gradient-to-br from-[#6B9B4D]/20 to-[#6B9B4D]/5",
    borderColor: "border-[#6B9B4D]/30",
    iconColor: "text-[#6B9B4D]",
    buttonVariant: "default" as const
  },
  {
    title: "Sou Prestador",
    description: "Acessar área de credenciamento",
    icon: Stethoscope,
    link: "/login",
    color: "bg-gradient-to-br from-[#3B7FC4]/20 to-[#3B7FC4]/5",
    borderColor: "border-[#3B7FC4]/30",
    iconColor: "text-[#3B7FC4]",
    buttonVariant: "default" as const
  },
  {
    title: "Sou Gestor",
    description: "Painel administrativo",
    icon: Shield,
    link: "/login",
    color: "bg-gradient-to-br from-[#E89F3C]/20 to-[#E89F3C]/5",
    borderColor: "border-[#E89F3C]/30",
    iconColor: "text-[#E89F3C]",
    buttonVariant: "default" as const
  }
];

export function QuickAccessCards() {
  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {accessCards.map((card, index) => (
            <Card 
              key={index} 
              className={`${card.color} ${card.borderColor} border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              <CardContent className="p-6 space-y-4">
                <div className={`inline-flex p-4 bg-background/80 rounded-full ${card.iconColor}`}>
                  <card.icon className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </div>
                <Button asChild className="w-full" variant={card.buttonVariant}>
                  <Link to={card.link}>
                    Acessar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
