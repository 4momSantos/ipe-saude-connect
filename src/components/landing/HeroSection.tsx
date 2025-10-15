import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                IPE Saúde
                <span className="block text-primary">Sistema de Credenciamento</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-[600px]">
                Gerencie seu credenciamento de forma simples, rápida e segura. 
                Valide certificados digitais com transparência total.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/login">
                  Acessar Sistema
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#validar-certificado">
                  <ShieldCheck className="mr-2 h-5 w-5" />
                  Validar Certificado
                </a>
              </Button>
            </div>
          </div>
          
          <div className="relative lg:block hidden">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-8">
              <ShieldCheck className="w-full h-full text-primary/40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
