import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";

interface DimensionamentoData {
  municipio: string;
  codigo_ibge: string;
  beneficiarios: number;
  credenciados_atuais: number;
  credenciados_necessarios: number;
  deficit: number;
  cobertura: number;
}

export function DimensionamentoRedeRS() {
  const { data: dimensionamentoReal, isLoading: loadingReal } = useQuery({
    queryKey: ['dimensionamento-rs'],
    queryFn: async () => {
      console.log('[DIMENSIONAMENTO] Buscando dados...');
      const { data, error } = await supabase.rpc('calcular_dimensionamento' as any);
      if (error) {
        console.error('[DIMENSIONAMENTO] Erro:', error);
        throw error;
      }
      console.log('[DIMENSIONAMENTO] Dados recebidos:', data);
      return (data || []) as DimensionamentoData[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Dados mockados para demonstração
  const dimensionamentoMock: DimensionamentoData[] = [
    { municipio: 'Porto Alegre', codigo_ibge: '4314902', beneficiarios: 125000, credenciados_atuais: 342, credenciados_necessarios: 400, deficit: 58, cobertura: 85.5 },
    { municipio: 'Caxias do Sul', codigo_ibge: '4305108', beneficiarios: 85000, credenciados_atuais: 186, credenciados_necessarios: 272, deficit: 86, cobertura: 68.4 },
    { municipio: 'Pelotas', codigo_ibge: '4314407', beneficiarios: 62000, credenciados_atuais: 145, credenciados_necessarios: 198, deficit: 53, cobertura: 73.2 },
    { municipio: 'Canoas', codigo_ibge: '4304606', beneficiarios: 78000, credenciados_atuais: 198, credenciados_necessarios: 250, deficit: 52, cobertura: 79.2 },
    { municipio: 'Santa Maria', codigo_ibge: '4316907', beneficiarios: 54000, credenciados_atuais: 132, credenciados_necessarios: 173, deficit: 41, cobertura: 76.3 },
    { municipio: 'Gravataí', codigo_ibge: '4309100', beneficiarios: 48000, credenciados_atuais: 98, credenciados_necessarios: 154, deficit: 56, cobertura: 63.6 },
    { municipio: 'Viamão', codigo_ibge: '4323002', beneficiarios: 42000, credenciados_atuais: 76, credenciados_necessarios: 134, deficit: 58, cobertura: 56.7 },
    { municipio: 'Novo Hamburgo', codigo_ibge: '4313409', beneficiarios: 51000, credenciados_atuais: 124, credenciados_necessarios: 163, deficit: 39, cobertura: 76.1 },
    { municipio: 'São Leopoldo', codigo_ibge: '4318705', beneficiarios: 45000, credenciados_atuais: 112, credenciados_necessarios: 144, deficit: 32, cobertura: 77.8 },
    { municipio: 'Alvorada', codigo_ibge: '4300604', beneficiarios: 38000, credenciados_atuais: 68, credenciados_necessarios: 122, deficit: 54, cobertura: 55.7 }
  ];

  const dimensionamento = dimensionamentoMock;
  const isLoading = false;

  const totais = dimensionamento?.reduce((acc, d) => ({
    beneficiarios: acc.beneficiarios + Number(d.beneficiarios),
    credenciados: acc.credenciados + Number(d.credenciados_atuais),
    necessarios: acc.necessarios + Number(d.credenciados_necessarios),
    deficit: acc.deficit + Number(d.deficit)
  }), { beneficiarios: 0, credenciados: 0, necessarios: 0, deficit: 0 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando dimensionamento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dimensionamento de Rede - Rio Grande do Sul</h2>
        <p className="text-muted-foreground">
          Análise da capacidade da rede credenciada por município
        </p>
      </div>

      {/* Cards Totais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Beneficiários</p>
                <p className="text-2xl font-bold">{totais?.beneficiarios.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credenciados Atuais</p>
                <p className="text-2xl font-bold">{totais?.credenciados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Necessário</p>
                <p className="text-2xl font-bold">{totais?.necessarios}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${
                (totais?.deficit || 0) < 0 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <AlertTriangle className={`h-6 w-6 ${
                  (totais?.deficit || 0) < 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${
                  (totais?.deficit || 0) < 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {(totais?.deficit || 0) > 0 ? '-' : '+'}{Math.abs(totais?.deficit || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Municípios */}
      <div className="space-y-3">
        {dimensionamento?.map((d) => {
          const cobertura = Number(d.cobertura);
          const deficit = Number(d.deficit);
          
          return (
            <Card key={d.codigo_ibge}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{d.municipio}</CardTitle>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    cobertura >= 100 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : cobertura >= 80 
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {cobertura.toFixed(1)}% cobertura
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Beneficiários</p>
                    <p className="text-xl font-bold">{Number(d.beneficiarios).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Credenciados</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {d.credenciados_atuais}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Necessário</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {d.credenciados_necessarios}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className={`text-xl font-bold ${
                      deficit < 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {deficit > 0 ? '-' : '+'}{Math.abs(deficit)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        cobertura >= 100 
                          ? 'bg-green-600 dark:bg-green-500' 
                          : cobertura >= 80 
                            ? 'bg-yellow-500 dark:bg-yellow-600' 
                            : 'bg-red-500 dark:bg-red-600'
                      }`}
                      style={{ width: `${Math.min(cobertura, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Razão: {(Number(d.beneficiarios) / Number(d.credenciados_atuais) || 0).toFixed(0)} beneficiários/credenciado
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!dimensionamento || dimensionamento.length === 0) && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Nenhum dado de dimensionamento encontrado para o Rio Grande do Sul.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
