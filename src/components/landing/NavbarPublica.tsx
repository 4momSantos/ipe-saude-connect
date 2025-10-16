import { Link } from "react-router-dom";
import { MapPin, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NavbarPublica() {
  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">IPE Saúde</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
              Início
            </Link>
            <Link to="/mapa" className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors">
              <MapPin className="h-4 w-4" />
              Encontrar Profissionais
            </Link>
            <a href="/#validar-certificado" className="text-sm font-medium hover:text-primary transition-colors">
              Validar Certificado
            </a>
          </div>

          <Button asChild>
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
