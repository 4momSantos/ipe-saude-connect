import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Star, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTopCredenciados } from "@/hooks/useCredenciadosPublicos";
import { Stars } from "@/components/avaliacoes/Stars";

export function EncontreProfissionalSection() {
  const [busca, setBusca] = useState("");
  const { data: topCredenciados, isLoading } = useTopCredenciados(4);

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Encontre um Profissional
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Busque profissionais credenciados próximos a você, veja avaliações e entre em contato
          </p>
        </div>

        {/* Card de Busca */}
        <Card className="max-w-4xl mx-auto mb-12">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Busque por nome, especialidade ou cidade..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button asChild size="lg">
                <Link to={`/mapa${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Buscar no Mapa
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Top Profissionais */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6 text-center">
            Profissionais Mais Bem Avaliados
          </h3>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4" />
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3 mx-auto mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topCredenciados?.map((cred: any) => (
                <Card key={cred.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <Link to={`/profissional/${cred.id}`}>
                    <CardContent className="p-6 text-center">
                      <Avatar className="h-16 w-16 mx-auto mb-4">
                        <AvatarFallback className="bg-primary/10 text-primary text-xl">
                          {cred.nome?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <h4 className="font-semibold mb-2 line-clamp-1">
                        {cred.nome}
                      </h4>
                      
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Stars value={cred.nota_media} size="sm" readonly />
                        <span className="text-sm font-bold">
                          {cred.nota_media.toFixed(1)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">
                        {cred.total_avaliacoes} avaliações
                      </p>
                      
                      <Badge variant="secondary" className="text-xs">
                        {cred.credenciado_crms?.[0]?.especialidade || 'Profissional'}
                      </Badge>
                      
                      <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{cred.cidade}</span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* CTA para Ver Mapa */}
        <div className="text-center">
          <Button asChild size="lg" variant="outline">
            <Link to="/mapa">
              Ver Todos no Mapa Interativo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
