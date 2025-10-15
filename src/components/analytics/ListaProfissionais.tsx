import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRedeProfissionais } from "@/hooks/useRedeAnalitica";
import { Search, Star, MapPin, Phone, Mail, Eye } from "lucide-react";

export function ListaProfissionais() {
  const [busca, setBusca] = useState("");
  const { data: profissionais, isLoading } = useRedeProfissionais();

  const profissionaisFiltrados = profissionais?.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.credenciado?.cidade?.toLowerCase().includes(busca.toLowerCase()) ||
    p.credenciado_crms?.some(crm => 
      crm.especialidade?.toLowerCase().includes(busca.toLowerCase())
    )
  ) || [];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 60) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse">Carregando profissionais...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, especialidade ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {profissionaisFiltrados.length} profissionais encontrados
          </p>
        </CardContent>
      </Card>

      {/* Lista de Profissionais */}
      <div className="grid gap-4">
        {profissionaisFiltrados.map((prof) => {
          const ultimoIndicador = prof.indicadores?.[0];
          const scoreGeral = ultimoIndicador?.score_geral || 0;
          const avaliacaoMedia = ultimoIndicador?.avaliacao_media || 0;

          return (
            <Card key={prof.id} className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{prof.nome}</h3>
                      {ultimoIndicador && (
                        <Badge className={getScoreBadge(scoreGeral)}>
                          Score: {scoreGeral.toFixed(0)}
                        </Badge>
                      )}
                    </div>

                    {/* Especialidades */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {prof.credenciado_crms?.map((crm, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {crm.especialidade} - CRM {crm.crm}
                        </Badge>
                      ))}
                    </div>

                    {/* Localização */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{prof.credenciado?.cidade}, {prof.credenciado?.estado}</span>
                      </div>
                      
                      {prof.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span>{prof.email}</span>
                        </div>
                      )}
                      
                      {prof.telefone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{prof.telefone}</span>
                        </div>
                      )}
                    </div>

                    {/* Indicadores */}
                    {ultimoIndicador && (
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span className="font-medium">{avaliacaoMedia.toFixed(1)}/5.0</span>
                          <span className="text-muted-foreground">média</span>
                        </div>
                        <div>
                          <span className="font-medium">{ultimoIndicador.atendimentos}</span>
                          <span className="text-muted-foreground"> atendimentos</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Perfil
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {profissionaisFiltrados.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                Nenhum profissional encontrado com os critérios de busca.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
