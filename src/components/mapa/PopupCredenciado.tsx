import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, ExternalLink, Navigation } from "lucide-react";
import { Stars } from "@/components/avaliacoes/Stars";

interface PopupCredenciadoProps {
  credenciado: {
    id: string;
    nome: string;
    latitude: number;
    longitude: number;
    endereco?: string;
    cidade?: string;
    estado?: string;
    telefone?: string;
    email?: string;
    credenciado_crms?: Array<{ especialidade: string }>;
    estatisticas: {
      nota_media_publica: number;
      total_avaliacoes_publicas: number;
    };
  };
}

export function PopupCredenciado({ credenciado }: PopupCredenciadoProps) {
  const inicial = credenciado.nome?.charAt(0) || 'P';
  const especialidades = credenciado.credenciado_crms?.map(c => c.especialidade) || [];
  const isVerificado = credenciado.estatisticas.total_avaliacoes_publicas >= 5;

  return (
    <div className="min-w-[280px] p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
            {inicial}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate">{credenciado.nome}</h3>
          <div className="flex items-center gap-1">
            <Stars value={credenciado.estatisticas.nota_media_publica} size="sm" readonly />
            <span className="text-sm font-medium">
              {credenciado.estatisticas.nota_media_publica.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({credenciado.estatisticas.total_avaliacoes_publicas})
            </span>
          </div>
        </div>
      </div>

      {/* Especialidades */}
      {especialidades.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {especialidades.map((esp, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {esp}
            </Badge>
          ))}
        </div>
      )}

      {/* Badge Verificado */}
      {isVerificado && (
        <Badge className="mb-3 bg-green-500 hover:bg-green-600">
          ✓ Verificado
        </Badge>
      )}

      {/* Endereço */}
      {credenciado.endereco && (
        <p className="text-sm text-muted-foreground mb-3 flex items-start gap-1">
          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">
            {credenciado.endereco}
            {credenciado.cidade && `, ${credenciado.cidade}`}
            {credenciado.estado && ` - ${credenciado.estado}`}
          </span>
        </p>
      )}

      {/* Ações */}
      <div className="flex gap-2">
        <Button asChild size="sm" className="flex-1">
          <a href={`/profissional/${credenciado.id}`}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Ver Perfil
          </a>
        </Button>
        <Button asChild size="sm" variant="outline" className="flex-1">
          <a 
            href={`https://www.google.com/maps/dir/?api=1&destination=${credenciado.latitude},${credenciado.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation className="h-3 w-3 mr-1" />
            Rotas
          </a>
        </Button>
      </div>
    </div>
  );
}
