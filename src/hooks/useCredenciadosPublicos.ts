import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FiltrosPublicos {
  especialidade?: string;
  notaMinima?: number;
  cidade?: string;
  raio?: number;
  latitude?: number;
  longitude?: number;
  busca?: string;
}

export function useCredenciadosPublicos(filtros: FiltrosPublicos = {}) {
  return useQuery({
    queryKey: ['credenciados-publicos', filtros],
    queryFn: async () => {
      let query = supabase
        .from('credenciados')
        .select(`
          id,
          nome,
          cpf,
          endereco,
          latitude,
          longitude,
          cidade,
          estado,
          telefone,
          celular,
          email,
          categoria_id,
          credenciado_crms(crm, uf_crm, especialidade, especialidade_id)
        `)
        .eq('status', 'Ativo')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null) as any;
      
      // Aplicar filtros
      if (filtros.especialidade) {
        query = query.ilike('credenciado_crms.especialidade', `%${filtros.especialidade}%`);
      }
      
      if (filtros.cidade) {
        query = query.eq('cidade', filtros.cidade);
      }

      if (filtros.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,cidade.ilike.%${filtros.busca}%,email.ilike.%${filtros.busca}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;

      // Filtrar por raio se coordenadas fornecidas
      let filteredData = data || [];
      if (filtros.raio && filtros.latitude && filtros.longitude) {
        filteredData = filteredData.filter((cred: any) => {
          const distance = calculateDistance(
            filtros.latitude!,
            filtros.longitude!,
            cred.latitude,
            cred.longitude
          );
          return distance <= filtros.raio!;
        });
      }

      // Buscar estatísticas para cada credenciado
      const credenciadosComStats = await Promise.all(
        filteredData.map(async (cred: any) => {
          const { data: stats } = await (supabase as any)
            .from('avaliacoes_publicas')
            .select('nota_estrelas')
            .eq('credenciado_id', cred.id)
            .eq('status', 'aprovada');

          const notaMedia = stats && stats.length > 0
            ? stats.reduce((acc: number, val: any) => acc + val.nota_estrelas, 0) / stats.length
            : 0;

          return {
            ...cred,
            estatisticas: {
              nota_media_publica: notaMedia || 0, // Garantir 0 em vez de null/undefined
              total_avaliacoes_publicas: stats?.length || 0
            }
          };
        })
      );

      // Filtrar por nota mínima
      if (filtros.notaMinima) {
        return credenciadosComStats.filter(
          c => c.estatisticas.nota_media_publica >= filtros.notaMinima!
        );
      }

      return credenciadosComStats;
    },
    staleTime: 5 * 60 * 1000, // Cache de 5 minutos
  });
}

export function useCredenciadoPublico(id: string | undefined) {
  return useQuery({
    queryKey: ['credenciado-publico', id],
    queryFn: async () => {
      if (!id) throw new Error('ID não fornecido');

      const { data, error } = await supabase
        .from('credenciados')
        .select(`
          id,
          nome,
          cpf,
          endereco,
          latitude,
          longitude,
          cidade,
          estado,
          cep,
          telefone,
          celular,
          email,
          observacoes,
          categoria_id,
          data_inicio_atendimento,
          credenciado_crms(crm, uf_crm, especialidade, especialidade_id)
        `)
        .eq('id', id)
        .eq('status', 'Ativo')
        .single() as any;
      
      if (error) throw error;

      // Buscar estatísticas
      const { data: avaliacoes } = await (supabase as any)
        .from('avaliacoes_publicas')
        .select('nota_estrelas')
        .eq('credenciado_id', id)
        .eq('status', 'aprovada');

      const notaMedia = avaliacoes && avaliacoes.length > 0
        ? avaliacoes.reduce((acc: number, val: any) => acc + val.nota_estrelas, 0) / avaliacoes.length
        : 0;

      return {
        ...data,
        estatisticas: {
          nota_media_publica: notaMedia,
          total_avaliacoes_publicas: avaliacoes?.length || 0
        }
      };
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopCredenciados(limit: number = 4) {
  return useQuery({
    queryKey: ['top-credenciados', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credenciados')
        .select(`
          id,
          nome,
          endereco,
          cidade,
          latitude,
          longitude,
          credenciado_crms(especialidade)
        `)
        .eq('status', 'Ativo')
        .not('latitude', 'is', null)
        .limit(limit) as any;
      
      if (error) throw error;

      // Buscar estatísticas
      const credenciadosComStats = await Promise.all(
        (data || []).map(async (cred: any) => {
          const { data: avaliacoes } = await (supabase as any)
            .from('avaliacoes_publicas')
            .select('nota_estrelas')
            .eq('credenciado_id', cred.id)
            .eq('status', 'aprovada');

          const notaMedia = avaliacoes && avaliacoes.length > 0
            ? avaliacoes.reduce((acc: number, val: any) => acc + val.nota_estrelas, 0) / avaliacoes.length
            : 0;

          return {
            ...cred,
            nota_media: notaMedia,
            total_avaliacoes: avaliacoes?.length || 0
          };
        })
      );

      // Ordenar por nota e retornar top
      return credenciadosComStats
        .sort((a, b) => b.nota_media - a.nota_media)
        .slice(0, limit);
    },
    staleTime: 10 * 60 * 1000, // Cache de 10 minutos
  });
}

// Função auxiliar para calcular distância entre coordenadas
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
