import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

interface CredenciadoMapData {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  especialidades: string[];
}

export function MapaRede() {
  const [credenciados, setCredenciados] = useState<CredenciadoMapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapData();
  }, []);

  async function loadMapData() {
    try {
      setLoading(true);
      
      const { data: credenciadosData, error: credError } = await supabase
        .from("credenciados")
        .select("id, nome, cidade, estado")
        .eq("status", "Ativo");

      if (credError) throw credError;

      const { data: especialidadesData, error: espError } = await supabase
        .from("credenciado_crms")
        .select("credenciado_id, especialidade");

      if (espError) throw espError;

      const mapData: CredenciadoMapData[] = (credenciadosData || []).map((cred) => {
        const especialidades = especialidadesData
          ?.filter((esp) => esp.credenciado_id === cred.id)
          .map((esp) => esp.especialidade) || [];

        return {
          id: cred.id,
          nome: cred.nome,
          cidade: cred.cidade || "N/A",
          estado: cred.estado || "N/A",
          especialidades,
        };
      });

      setCredenciados(mapData);
    } catch (error) {
      console.error("Erro ao carregar dados do mapa:", error);
      toast.error("Erro ao carregar dados do mapa");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[600px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por região
  const regioes = credenciados.reduce((acc, cred) => {
    const key = `${cred.cidade} - ${cred.estado}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cred);
    return acc;
  }, {} as Record<string, CredenciadoMapData[]>);

  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Mapa da Rede Credenciada</CardTitle>
        <CardDescription>
          Distribuição de {credenciados.length} credenciados ativos por localidade
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(regioes).map(([local, creds]) => (
            <Card key={local} className="hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-2">{local}</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {creds.length} credenciado{creds.length > 1 ? "s" : ""}
                    </p>
                    <div className="space-y-1">
                      {creds.slice(0, 3).map((cred) => (
                        <div key={cred.id} className="text-xs">
                          <p className="font-medium truncate">{cred.nome}</p>
                          {cred.especialidades.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cred.especialidades.slice(0, 2).map((esp, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {esp}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {creds.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{creds.length - 3} mais
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
