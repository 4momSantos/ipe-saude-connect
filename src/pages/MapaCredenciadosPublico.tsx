import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { NavbarPublica } from "@/components/landing/NavbarPublica";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Filter, X } from "lucide-react";
import { useCredenciadosPublicos } from "@/hooks/useCredenciadosPublicos";
import { Stars } from "@/components/avaliacoes/Stars";
import { MapaCredenciadosPublico as MapaPublico } from "@/components/mapa/MapaCredenciadosPublico";

export default function MapaCredenciadosPublicoPagina() {
  const [searchParams] = useSearchParams();
  const [filtros, setFiltros] = useState({
    busca: searchParams.get('busca') || '',
    especialidade: '',
    cidade: '',
    notaMinima: 0,
    raio: 10
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const { data: credenciados, isLoading } = useCredenciadosPublicos(filtros);


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
              ) : !credenciados || credenciados.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="font-semibold text-lg mb-2">Nenhum credenciado encontrado</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Não há profissionais cadastrados com as suas preferências de busca ou na região selecionada.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFiltros({ busca: '', especialidade: '', cidade: '', notaMinima: 0, raio: 10 })}
                    >
                      Limpar Filtros
                    </Button>
                  </CardContent>
                </Card>
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

          <MapaPublico 
            credenciados={credenciados || []}
            height="100vh"
          />
        </main>
      </div>
    </div>
  );
}
