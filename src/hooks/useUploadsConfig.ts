import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DOCUMENTOS_OBRIGATORIOS } from '@/lib/inscricao-validation';

export interface UploadConfig {
  tipo: string;
  label: string;
  obrigatorio: boolean;
  habilitado: boolean;
  ocrConfig?: any;
}

export function useUploadsConfig(editalId?: string) {
  return useQuery({
    queryKey: ['uploads-config', editalId],
    queryFn: async (): Promise<UploadConfig[]> => {
      if (!editalId) {
        console.log('[useUploadsConfig] ⚠️ Sem editalId, usando config padrão');
        return DOCUMENTOS_OBRIGATORIOS.map(doc => ({
          tipo: doc.tipo,
          label: doc.label,
          obrigatorio: doc.obrigatorio || false,
          habilitado: true,
          ocrConfig: doc.ocrConfig
        }));
      }

      console.log('[useUploadsConfig] 🔍 Buscando config para edital:', editalId);

      // Buscar edital e template
      const { data: edital, error } = await supabase
        .from('editais')
        .select('id, uploads_config, inscription_template_id, inscription_templates(anexos_obrigatorios)')
        .eq('id', editalId)
        .single();

      if (error) {
        console.error('[useUploadsConfig] ❌ Erro ao buscar edital:', error);
        throw error;
      }

      // Hierarquia: edital.uploads_config > template.anexos_obrigatorios > DOCUMENTOS_OBRIGATORIOS
      let config: UploadConfig[] = [];

      if (edital.uploads_config && Object.keys(edital.uploads_config).length > 0) {
        // Usar config do edital (prioridade máxima)
        console.log('[useUploadsConfig] ✅ Usando uploads_config do edital');
        config = DOCUMENTOS_OBRIGATORIOS.map(doc => {
          const editalConfig = (edital.uploads_config as any)[doc.tipo];
          return {
            tipo: doc.tipo,
            label: editalConfig?.label || doc.label,
            obrigatorio: editalConfig?.obrigatorio ?? doc.obrigatorio ?? false,
            habilitado: editalConfig?.habilitado ?? true,
            ocrConfig: doc.ocrConfig
          };
        }).filter(c => c.habilitado);

        console.log('[useUploadsConfig] 📊 Config processada:', {
          total: config.length,
          obrigatorios: config.filter(c => c.obrigatorio).length,
          opcionais: config.filter(c => !c.obrigatorio).length,
          tipos: config.map(c => c.tipo)
        });
      } else if (edital.inscription_templates?.anexos_obrigatorios) {
        // Usar config do template
        console.log('[useUploadsConfig] ✅ Usando anexos_obrigatorios do template');
        const templateAnexos = Array.isArray(edital.inscription_templates.anexos_obrigatorios)
          ? edital.inscription_templates.anexos_obrigatorios
          : [];
        
        config = templateAnexos.map((anexo: any) => ({
          tipo: anexo.tipo || anexo.id,
          label: anexo.label || anexo.nome || 'Documento',
          obrigatorio: anexo.obrigatorio ?? true,
          habilitado: true,
          ocrConfig: anexo.ocrConfig
        }));

        console.log('[useUploadsConfig] 📊 Template config:', {
          total: config.length,
          obrigatorios: config.filter(c => c.obrigatorio).length
        });
      } else {
        // Fallback: usar lista padrão (apenas obrigatórios)
        console.log('[useUploadsConfig] ⚠️ Usando DOCUMENTOS_OBRIGATORIOS padrão (fallback)');
        config = DOCUMENTOS_OBRIGATORIOS
          .filter(doc => doc.obrigatorio)
          .map(doc => ({
            tipo: doc.tipo,
            label: doc.label,
            obrigatorio: true,
            habilitado: true,
            ocrConfig: doc.ocrConfig
          }));

        console.log('[useUploadsConfig] 📊 Config padrão:', {
          total: config.length
        });
      }

      return config;
    },
    enabled: !!editalId,
    staleTime: 1000 * 60 * 5, // Cache 5 min
  });
}
