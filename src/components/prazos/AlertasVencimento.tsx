import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function AlertasVencimento() {
  const navigate = useNavigate();

  const { data: alertas = [] } = useQuery({
    queryKey: ['alertas-vencimento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_prazos_completos')
        .select('*')
        .in('nivel_alerta', ['critico', 'atencao'])
        .order('dias_para_vencer', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });

  if (alertas.length === 0) return null;

  return (
    <Card className="p-4 border-orange-200 bg-orange-50">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-orange-600" />
        <h3 className="font-semibold text-orange-900">
          Alertas de Vencimento ({alertas.length})
        </h3>
      </div>

      <div className="space-y-2">
        {alertas.map((alerta: any) => (
          <div
            key={alerta.id}
            className="bg-white p-3 rounded border border-orange-200 text-sm"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium">{alerta.entidade_nome}</p>
                <p className="text-gray-600 text-xs">{alerta.credenciado_nome}</p>
                <p className="text-xs text-orange-600 mt-1">
                  {alerta.dias_para_vencer < 0 
                    ? `Vencido há ${Math.abs(alerta.dias_para_vencer)} dias`
                    : `Vence em ${alerta.dias_para_vencer} dias`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(alerta.data_vencimento), 'dd/MM/yyyy')}
                </p>
              </div>
              <Badge
                variant="outline"
                style={{
                  backgroundColor: alerta.cor_status + '20',
                  color: alerta.cor_status,
                  borderColor: alerta.cor_status
                }}
              >
                {alerta.nivel_alerta}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="link"
        size="sm"
        className="mt-2 w-full text-orange-700"
        onClick={() => navigate('/prazos')}
      >
        Ver todos os prazos →
      </Button>
    </Card>
  );
}
