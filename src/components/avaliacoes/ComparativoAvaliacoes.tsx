import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComparativoAvaliacoesProps {
  credenciadoId: string;
}

export function ComparativoAvaliacoes({ credenciadoId }: ComparativoAvaliacoesProps) {
  const { data: historico, isLoading } = useQuery({
    queryKey: ['historico-avaliacoes', credenciadoId],
    queryFn: async () => {
      // Buscar avaliações públicas agrupadas por mês
      const { data: publicas } = await supabase
        .from('avaliacoes_publicas')
        .select('nota_estrelas, created_at')
        .eq('credenciado_id', credenciadoId)
        .eq('status', 'aprovada')
        .order('created_at', { ascending: true });

      // Buscar avaliações internas
      const { data: internas } = await supabase
        .from('avaliacoes_prestadores')
        .select('pontuacao_geral, periodo_referencia')
        .eq('credenciado_id', credenciadoId)
        .eq('status', 'finalizada')
        .order('periodo_referencia', { ascending: true });

      // Agrupar por mês
      const meses = new Map<string, { publica: number[], interna: number[] }>();

      publicas?.forEach(av => {
        const mes = format(new Date(av.created_at), 'yyyy-MM');
        if (!meses.has(mes)) meses.set(mes, { publica: [], interna: [] });
        meses.get(mes)!.publica.push(av.nota_estrelas);
      });

      internas?.forEach(av => {
        const mes = format(new Date(av.periodo_referencia), 'yyyy-MM');
        if (!meses.has(mes)) meses.set(mes, { publica: [], interna: [] });
        meses.get(mes)!.interna.push(av.pontuacao_geral || 0);
      });

      // Calcular médias
      return Array.from(meses.entries())
        .map(([mes, valores]) => ({
          mes: format(new Date(mes + '-01'), 'MMM/yy', { locale: ptBR }),
          publica: valores.publica.length > 0 
            ? valores.publica.reduce((a, b) => a + b, 0) / valores.publica.length 
            : null,
          interna: valores.interna.length > 0 
            ? valores.interna.reduce((a, b) => a + b, 0) / valores.interna.length 
            : null
        }))
        .slice(-6); // Últimos 6 meses
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução das Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!historico || historico.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução das Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Histórico insuficiente para gerar gráfico.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução das Avaliações</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="publica" 
              stroke="hsl(var(--chart-1))" 
              name="Avaliação Pública"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="interna" 
              stroke="hsl(var(--chart-2))" 
              name="Avaliação Interna"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
