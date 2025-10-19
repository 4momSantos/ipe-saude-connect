import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SmartSendResult {
  success: boolean;
  action: 'resend' | 'reprocess';
  contrato_numero?: string;
  assignment_id?: string;
  signature_url?: string;
  email?: string;
  error?: string;
}

export const useSmartContractSend = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contratoId: string): Promise<SmartSendResult> => {
      console.log('🧠 Smart Send: Analisando contrato', contratoId);
      
      // 1. Buscar signature_request do contrato
      const { data: signatureRequest, error: fetchError } = await supabase
        .from('signature_requests')
        .select(`
          id, 
          status, 
          metadata,
          contratos(
            numero_contrato,
            inscricao_id,
            inscricoes_edital(
              candidato:profiles(email)
            )
          )
        `)
        .eq('contrato_id', contratoId)
        .single();
      
      if (fetchError || !signatureRequest) {
        throw new Error('Signature request não encontrado');
      }

      const contratoData = signatureRequest.contratos as any;
      const contratoNumero = contratoData?.numero_contrato;
      const candidatoEmail = contratoData?.inscricoes_edital?.candidato?.email;
      
      // 2. Decidir ação baseado no status
      const metadata = signatureRequest.metadata as any;
      const hasAssignment = !!metadata?.assinafy_assignment_id;
      
      // CASO 1: Contrato pronto (pending com assignment) → Reenviar email
      if (signatureRequest.status === 'pending' && hasAssignment) {
        console.log('📧 Contrato pronto, reenviando email...');
        
        const { data, error } = await supabase.functions.invoke(
          "resend-signature-emails",
          { body: { contratoIds: [contratoId] } }
        );
        
        if (error) throw error;
        
        return {
          success: true,
          action: 'resend',
          contrato_numero: contratoNumero,
          assignment_id: metadata.assinafy_assignment_id,
          signature_url: metadata.signature_url,
          email: candidatoEmail
        };
      }
      
      // CASO 2: Contrato stuck (processing ou sem assignment) → Reprocessar
      if (signatureRequest.status === 'processing' || !hasAssignment) {
        console.log('🔄 Contrato stuck, reprocessando...');
        
        const { data, error } = await supabase.functions.invoke(
          "reprocess-stuck-contracts",
          { body: { contrato_id: contratoId } }
        );
        
        if (error) throw error;
        
        const result = data?.details?.[0];
        if (!result || result.status !== 'success') {
          throw new Error(result?.error || 'Erro ao reprocessar contrato');
        }
        
        return {
          success: true,
          action: 'reprocess',
          contrato_numero: result.contrato,
          assignment_id: result.assignment_id,
          signature_url: result.signature_url,
          email: result.email
        };
      }
      
      // CASO 3: Status inválido
      throw new Error(`Status inválido: ${signatureRequest.status}`);
    },
    
    onSuccess: (data) => {
      console.log("✅ Smart Send sucesso:", data);
      
      const actionText = data.action === 'resend' ? 'Email reenviado' : 'Contrato processado';
      
      toast.success(
        `✅ ${actionText} com sucesso!`,
        { 
          description: `Email de assinatura enviado para ${data.email}`,
          duration: 8000 
        }
      );
      
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['inscricoes'] });
    },
    
    onError: (error: Error) => {
      console.error("❌ Erro no Smart Send:", error);
      toast.error(`Erro ao enviar contrato`, {
        description: error.message
      });
    },
  });
};
