import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CredenciadoCRM {
  crm: string;
  especialidade: string;
  uf_crm: string;
}

export interface CredenciadoServico {
  procedimento_id: string;
  procedimento_nome: string;
  categoria: string;
  tipo: string;
}

export interface Credenciado {
  id: string;
  nome: string;
  cpf: string | null;
  cnpj: string | null;
  rg: string | null;
  data_nascimento: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  porte: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  crms: CredenciadoCRM[];
  servicos?: CredenciadoServico[];
}

export interface CredenciadoMap {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  status: string;
  especialidades: string[];
}

interface UseCredenciadosMapOptions {
  especialidade?: string;
  cidade?: string;
  estado?: string;
  enabled?: boolean;
}

export function useCredenciados() {
  return useQuery({
    queryKey: ["credenciados"],
    queryFn: async () => {
      // Buscar credenciados
      const { data: credenciadosData, error: credenciadosError } = await supabase
        .from("credenciados")
        .select("*")
        .order("created_at", { ascending: false });

      if (credenciadosError) throw credenciadosError;

      // Buscar CRMs e Serviços para cada credenciado
      const credenciadosComCrms = await Promise.all(
        (credenciadosData || []).map(async (credenciado) => {
          const [crmsData, servicosData] = await Promise.all([
            supabase
              .from("credenciado_crms")
              .select("crm, especialidade, uf_crm")
              .eq("credenciado_id", credenciado.id)
              .then(res => res.data),
            supabase
              .from("credenciado_servicos")
              .select(`
                procedimento_id,
                procedimentos (
                  id,
                  nome,
                  categoria,
                  tipo
                )
              `)
              .eq("credenciado_id", credenciado.id)
              .eq("disponivel", true)
              .then(res => res.data)
          ]);

          const servicos = (servicosData || []).map((s: any) => ({
            procedimento_id: s.procedimento_id,
            procedimento_nome: s.procedimentos?.nome || "",
            categoria: s.procedimentos?.categoria || "",
            tipo: s.procedimentos?.tipo || "",
          }));

          return {
            ...credenciado,
            crms: crmsData || [],
            servicos,
          };
        })
      );

      return credenciadosComCrms as Credenciado[];
    },
  });
}

export function useCredenciado(id: string) {
  return useQuery({
    queryKey: ["credenciado", id],
    queryFn: async () => {
      // Buscar credenciado com relação à inscrição
      const { data: credenciadoData, error: credenciadoError } = await supabase
        .from("credenciados")
        .select(`
          *,
          inscricoes_edital(candidato_id)
        `)
        .eq("id", id)
        .single();

      if (credenciadoError) throw credenciadoError;

      // Buscar CRMs
      const { data: crmsData } = await supabase
        .from("credenciado_crms")
        .select("*")
        .eq("credenciado_id", id);

      // Buscar horários para cada CRM
      const crmsComHorarios = await Promise.all(
        (crmsData || []).map(async (crm) => {
          const { data: horariosData } = await supabase
            .from("horarios_atendimento")
            .select("*")
            .eq("credenciado_crm_id", crm.id);

          return {
            ...crm,
            horarios: horariosData || [],
          };
        })
      );

      return {
        ...credenciadoData,
        crms: crmsComHorarios,
      };
    },
    enabled: !!id,
  });
}

// Hook para buscar credenciados no mapa (apenas com coordenadas)
export function useCredenciadosMap(options: UseCredenciadosMapOptions = {}) {
  const { especialidade, cidade, estado, enabled = true } = options;

  return useQuery({
    queryKey: ['credenciados-map', { especialidade, cidade, estado }],
    queryFn: async () => {
      // Query base - busca apenas credenciados com coordenadas
      let query = supabase
        .from('credenciados')
        .select(`
          id,
          nome,
          latitude,
          longitude,
          cidade,
          estado,
          endereco,
          telefone,
          email,
          status,
          credenciado_crms (
            especialidade
          )
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .eq('status', 'Ativo');

      // Aplicar filtros opcionais
      if (cidade) {
        query = query.ilike('cidade', `%${cidade}%`);
      }

      if (estado) {
        query = query.eq('estado', estado);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar credenciados:', error);
        throw error;
      }

      // Processar dados e aplicar filtro de especialidade se necessário
      const processedData: CredenciadoMap[] = (data || []).map((credenciado: any) => {
        const especialidades = (credenciado.credenciado_crms || []).map(
          (crm: any) => crm.especialidade
        );

        return {
          id: credenciado.id,
          nome: credenciado.nome,
          latitude: credenciado.latitude,
          longitude: credenciado.longitude,
          cidade: credenciado.cidade,
          estado: credenciado.estado,
          endereco: credenciado.endereco,
          telefone: credenciado.telefone,
          email: credenciado.email,
          status: credenciado.status,
          especialidades,
        };
      });

      // Filtrar por especialidade no frontend (já que é relação many-to-many)
      if (especialidade) {
        return processedData.filter((c) =>
          c.especialidades.some((esp) =>
            esp.toLowerCase().includes(especialidade.toLowerCase())
          )
        );
      }

      return processedData;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

// Hook para buscar estatísticas de geocoding
export function useGeocodingStats() {
  return useQuery({
    queryKey: ['geocoding-stats'],
    queryFn: async () => {
      const [totalResult, geocodedResult, pendingResult] = await Promise.all([
        supabase
          .from('credenciados')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Ativo'),
        supabase
          .from('credenciados')
          .select('*', { count: 'exact', head: true })
          .not('latitude', 'is', null)
          .eq('status', 'Ativo'),
        supabase
          .from('credenciados')
          .select('*', { count: 'exact', head: true })
          .is('latitude', null)
          .not('endereco', 'is', null)
          .eq('status', 'Ativo')
          .lt('geocode_attempts', 5),
      ]);

      return {
        total: totalResult.count || 0,
        geocoded: geocodedResult.count || 0,
        pending: pendingResult.count || 0,
        percentageGeocoded:
          totalResult.count && totalResult.count > 0
            ? ((geocodedResult.count || 0) / totalResult.count) * 100
            : 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}
