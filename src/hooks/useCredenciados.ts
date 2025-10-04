import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CredenciadoCRM {
  crm: string;
  especialidade: string;
  uf_crm: string;
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

      // Buscar CRMs para cada credenciado
      const credenciadosComCrms = await Promise.all(
        (credenciadosData || []).map(async (credenciado) => {
          const { data: crmsData } = await supabase
            .from("credenciado_crms")
            .select("crm, especialidade, uf_crm")
            .eq("credenciado_id", credenciado.id);

          return {
            ...credenciado,
            crms: crmsData || [],
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
      // Buscar credenciado
      const { data: credenciadoData, error: credenciadoError } = await supabase
        .from("credenciados")
        .select("*")
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
