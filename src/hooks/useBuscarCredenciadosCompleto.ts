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
      console.log('[useBuscarCredenciadosCompleto] 🔍 Buscando:', { 
        termoBusca, 
        tipoDocumento, 
        status,
        apenasComDocumentos,
        apenasVencidos 
      });

      const { data, error } = await supabase.rpc(
        'buscar_credenciados_com_documentos_completo',
        {
          p_termo_busca: termoBusca || null,
          p_tipo_documento: tipoDocumento || null,
          p_status: status || null,
          p_apenas_com_documentos: apenasComDocumentos,
          p_apenas_vencidos: apenasVencidos,
          p_limite: limite,
          p_offset: offset
        }
      );

      if (error) {
        console.error('[useBuscarCredenciadosCompleto] ❌ Erro:', error);
        throw error;
      }

      console.log('[useBuscarCredenciadosCompleto] ✅ Resultados:', data?.length || 0);
      
      // Converter Json para tipo correto
      return ((data || []) as any[]).map(item => ({
        ...item,
        especialidades: (item.especialidades || []) as EspecialidadeCRM[],
        documentos: (item.documentos || []) as DocumentoComMatch[]
      })) as CredenciadoComDocumentosCompleto[];
    },
    staleTime: 30000, // Cache por 30 segundos
  });
}
