import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export default function FooterPublico() {
  return (
    <footer className="bg-muted py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-lg mb-4">IPE Saúde</h3>
            <p className="text-sm text-muted-foreground">
              Sistema de credenciamento digital seguro e transparente.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Links Úteis</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#validar-certificado" className="hover:text-primary">Validar Certificado</a></li>
              <li><Link to="/login" className="hover:text-primary">Área Restrita</Link></li>
              {import.meta.env.DEV && (
                <li><Link to="/teste-certificados" className="hover:text-primary">Certificados de Teste</Link></li>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Email: suporte@ipesaude.com</li>
              <li>Telefone: (51) 3333-4444</li>
            </ul>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} IPE Saúde. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
