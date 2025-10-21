import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/ipe-saude-logo.png";

export function NavbarPublica() {
  return (
    <nav className="sticky top-0 z-50 border-b border-segurados/20 bg-[hsl(135,84%,10%)] shadow-md">
      <div className="container mx-auto px-4 py-0">
        <div className="flex items-center justify-between">
          <Link to="/login" className="flex items-center">
            <img 
              src={logo} 
              alt="IPE Saúde" 
              className="h-20 w-auto object-contain hover:opacity-90 transition-opacity"
            />
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-base font-medium text-white/90 hover:text-white transition-colors">
              Início
            </Link>
            <Link to="/mapa" className="flex items-center gap-1 text-base font-medium text-white/90 hover:text-white transition-colors">
              <MapPin className="h-5 w-5" />
              Encontrar Profissionais
            </Link>
            <a href="/#validar-certificado" className="text-base font-medium text-white/90 hover:text-white transition-colors">
              Validar Certificado
            </a>
          </div>

          <Button asChild variant="secondary" className="bg-white text-[hsl(135,84%,15%)] hover:bg-white/90">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
