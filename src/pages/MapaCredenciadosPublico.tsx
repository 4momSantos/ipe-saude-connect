import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { NavbarPublica } from "@/components/landing/NavbarPublica";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star, Filter, X } from "lucide-react";
import { useCredenciadosPublicos } from "@/hooks/useCredenciadosPublicos";
import { Stars } from "@/components/avaliacoes/Stars";
import { toast } from "sonner";

export default function MapaCredenciadosPublico() {
  const [searchParams] = useSearchParams();
  const [filtros, setFiltros] = useState({
    busca: searchParams.get('busca') || '',
    especialidade: '',
    cidade: '',
    notaMinima: 0,
    raio: 10
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCredenciado, setSelectedCredenciado] = useState<any>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [viewport, setViewport] = useState({
    latitude: -30.0346,
    longitude: -51.2177,
    zoom: 11
  });

  const { data: credenciados, isLoading } = useCredenciadosPublicos(filtros);

  useEffect(() => {
    // Buscar token do Mapbox
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-mapbox-token`, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
      }
    })
      .then(res => res.json())
      .then(data => setMapboxToken(data.token))
      .catch(err => {
        console.error('Erro ao buscar token Mapbox:', err);
        toast.error('Erro ao carregar mapa');
      });
  }, []);

  const getMarkerColor = (notaMedia: number) => {
    if (notaMedia >= 4.5) return '#10b981'; // green
    if (notaMedia >= 4.0) return '#3b82f6'; // blue
    if (notaMedia >= 3.5) return '#eab308'; // yellow
    if (notaMedia >= 3.0) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavbarPublica />
      
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar de Filtros */}
        <aside className={`
          ${showFilters ? 'block' : 'hidden'} lg:block
          w-full lg:w-96 border-r bg-background p-6 overflow-y-auto
        `}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Filtros</h2>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setShowFilters(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <Input
                placeholder="Nome ou especialidade..."
                value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cidade</label>
              <Input
                placeholder="Digite a cidade..."
                value={filtros.cidade}
                onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Nota Mínima: {filtros.notaMinima.toFixed(1)} ⭐
              </label>
              <Slider
                value={[filtros.notaMinima]}
                onValueChange={([value]) => setFiltros({ ...filtros, notaMinima: value })}
                max={5}
                step={0.5}
                className="mt-2"
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setFiltros({ busca: '', especialidade: '', cidade: '', notaMinima: 0, raio: 10 })}
            >
              Limpar Filtros
            </Button>
          </div>

          {/* Lista de Profissionais */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">
              {credenciados?.length || 0} Profissionais Encontrados
            </h3>
            
            <div className="space-y-3">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-muted rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded" />
                          <div className="h-3 bg-muted rounded w-2/3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                credenciados?.slice(0, 10).map((cred: any) => (
                  <Card key={cred.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <Link to={`/profissional/${cred.id}`}>
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {cred.nome?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{cred.nome}</h4>
                            <div className="flex items-center gap-1 mt-1">
                              <Stars value={cred.estatisticas.nota_media_publica} size="sm" readonly />
                              <span className="text-xs font-medium">
                                {cred.estatisticas.nota_media_publica.toFixed(1)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({cred.estatisticas.total_avaliacoes_publicas})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{cred.cidade}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Mapa */}
        <main className="flex-1 relative">
          <Button
            className="lg:hidden absolute top-4 left-4 z-10"
            onClick={() => setShowFilters(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>

          <div className="flex items-center justify-center h-full bg-muted">
            <p className="text-muted-foreground">Mapa será carregado em breve</p>
          </div>
        </main>
      </div>
    </div>
  );
}
