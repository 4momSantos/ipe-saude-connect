import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DocumentoComMatch {
  id: string;
  origem?: 'credenciado' | 'inscricao';
  tipo_documento: string;
  numero_documento: string | null;
  data_emissao: string | null;
  data_vencimento: string | null;
  arquivo_nome: string;
  url_arquivo: string;
  observacao: string | null;
  descricao: string | null;
  is_current: boolean;
  status: string;
  ocr_processado: boolean;
  dias_para_vencer: number | null;
  match_termo: boolean;
}

export interface EspecialidadeCRM {
  crm_id: string;
  crm: string;
  uf_crm: string;
  especialidade: string | null;
  especialidade_id: string | null;
  especialidade_nome: string | null;
}

export interface CredenciadoComDocumentosCompleto {
  credenciado_id: string;
  credenciado_nome: string;
  credenciado_cpf: string | null;
  credenciado_cnpj: string | null;
  credenciado_email: string | null;
  credenciado_status: string;
  credenciado_numero: string | null;
  total_documentos: number;
  documentos_ativos: number;
  documentos_vencidos: number;
  documentos_vencendo: number;
  proximo_vencimento: string | null;
  especialidades: EspecialidadeCRM[];
  documentos: DocumentoComMatch[];
}

interface UseBuscarCredenciadosCompletoParams {
  termoBusca?: string;
  tipoDocumento?: string;
  status?: string;
  apenasComDocumentos?: boolean;
  apenasVencidos?: boolean;
  limite?: number;
  offset?: number;
}

export function useBuscarCredenciadosCompleto({
  termoBusca = '',
  tipoDocumento,
  status,
  apenasComDocumentos = false,
  apenasVencidos = false,
  limite = 50,
  offset = 0
}: UseBuscarCredenciadosCompletoParams = {}) {
  
  return useQuery({
    queryKey: ['buscar-credenciados-completo', termoBusca, tipoDocumento, status, apenasComDocumentos, apenasVencidos, limite, offset],
    queryFn: async () => {
      // Normalizar valores antes de chamar RPC
      const normalizedParams = {
        p_termo_busca: termoBusca?.trim() || null,
        p_tipo_documento: tipoDocumento?.trim() || null,
        p_status: status?.trim() || null,
        p_apenas_com_documentos: apenasComDocumentos,
        p_apenas_vencidos: apenasVencidos,
        p_limite: limite,
        p_offset: offset
      };

      console.log('[useBuscarCredenciadosCompleto] 🔍 Buscando:', { 
        termoBusca, 
        tipoDocumento, 
        status,
        apenasComDocumentos,
        apenasVencidos 
      });
      console.log('[useBuscarCredenciadosCompleto] 📤 Parâmetros normalizados:', normalizedParams);

      try {
        const { data, error } = await supabase.rpc(
          'buscar_credenciados_com_documentos_completo',
          normalizedParams
        );

        if (error) {
          console.error('[useBuscarCredenciadosCompleto] ❌ Erro RPC:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            params: normalizedParams
          });
          throw error;
        }

        console.log('[useBuscarCredenciadosCompleto] ✅ Resultados RPC:', data?.length || 0);
        
        // Converter Json para tipo correto
        return ((data || []) as any[]).map(item => ({
          ...item,
          especialidades: (item.especialidades || []) as EspecialidadeCRM[],
          documentos: (item.documentos || []) as DocumentoComMatch[]
        })) as CredenciadoComDocumentosCompleto[];

      } catch (error: any) {
        // Se RPC falhar com 400/404, usar fallback com query direta
        if (error?.code === 'PGRST202' || error?.code === '42883' || error?.message?.includes('400')) {
          console.warn('[useBuscarCredenciadosCompleto] ⚠️ RPC falhou, usando fallback com query direta');
          
          // Fallback: Busca direta com agregação manual
          let query = supabase
            .from('credenciados')
            .select(`
              id,
              nome,
              cpf,
              cnpj,
              email,
              status,
              numero_credenciado
            `);

          // Aplicar filtros
          if (termoBusca) {
            query = query.or(`nome.ilike.%${termoBusca}%,cpf.ilike.%${termoBusca}%,cnpj.ilike.%${termoBusca}%,email.ilike.%${termoBusca}%`);
          }
          if (status) {
            query = query.eq('status', status);
          }

          const { data: credenciadosData, error: credenciadosError } = await query
            .range(offset, offset + limite - 1);

          if (credenciadosError) throw credenciadosError;

          console.log('[useBuscarCredenciadosCompleto] ✅ Fallback retornou:', credenciadosData?.length || 0);

          // Para cada credenciado, buscar documentos (simplificado para fallback)
          const result = (credenciadosData || []).map(c => ({
            credenciado_id: c.id,
            credenciado_nome: c.nome,
            credenciado_cpf: c.cpf,
            credenciado_cnpj: c.cnpj,
            credenciado_email: c.email,
            credenciado_status: c.status,
            credenciado_numero: c.numero_credenciado,
            total_documentos: 0,
            documentos_ativos: 0,
            documentos_vencidos: 0,
            documentos_vencendo: 0,
            proximo_vencimento: null,
            especialidades: [] as EspecialidadeCRM[],
            documentos: [] as DocumentoComMatch[]
          })) as CredenciadoComDocumentosCompleto[];

          return result;
        }

        // Se não for erro de RPC, rejeitar
        throw error;
      }
    },
    staleTime: 30000, // Cache por 30 segundos
  });
}
