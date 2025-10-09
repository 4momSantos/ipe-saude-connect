import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateCertificadoPDF } from "@/lib/certificate-generator";

interface GerarCertificadoParams {
  credenciadoId: string;
}

export function useGerarCertificado() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ credenciadoId }: GerarCertificadoParams) => {
      console.log('[useGerarCertificado] Iniciando geração de certificado para:', credenciadoId);

      // 1. Chamar edge function para preparar dados
      const { data: certificadoData, error: functionError } = await supabase.functions.invoke(
        "gerar-certificado",
        {
          body: { credenciadoId }
        }
      );

      if (functionError) throw functionError;
      if (!certificadoData.certificado) {
        throw new Error(certificadoData.message || 'Erro ao preparar dados do certificado');
      }

      const { credenciado, certificado } = certificadoData;

      // 2. Baixar QR Code e converter para base64
      console.log('[useGerarCertificado] Baixando QR Code...');
      const qrResponse = await fetch(certificado.qrCodeUrl);
      const qrBlob = await qrResponse.blob();
      const qrDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(qrBlob);
      });

      // 3. Gerar PDF no cliente
      console.log('[useGerarCertificado] Gerando PDF...');
      const pdfBlob = await generateCertificadoPDF({
        nome: credenciado.nome,
        cpfCnpj: credenciado.cpf || credenciado.cnpj,
        especialidades: credenciado.especialidades,
        numeroCertificado: certificado.numero,
        emitidoEm: certificado.emitidoEm,
        validoAte: certificado.validoAte,
        qrCodeDataUrl: qrDataUrl
      });

      // 4. Upload do PDF para storage
      console.log('[useGerarCertificado] Fazendo upload do PDF...');
      const fileName = `${credenciadoId}/${certificado.numero}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('certificados')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 5. Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('certificados')
        .getPublicUrl(fileName);

      // 6. Salvar registro na tabela certificados
      console.log('[useGerarCertificado] Salvando registro no banco...');
      const { error: insertError } = await supabase
        .from('certificados')
        .insert({
          credenciado_id: credenciadoId,
          numero_certificado: certificado.numero,
          tipo: 'credenciamento',
          documento_url: publicUrl,
          valido_ate: certificado.validoAte,
          status: 'ativo',
          dados_certificado: {
            especialidades: credenciado.especialidades,
            verification_url: certificado.verificationUrl
          }
        });

      if (insertError) throw insertError;

      console.log('[useGerarCertificado] Certificado gerado com sucesso!');

      return {
        numeroCertificado: certificado.numero,
        documentoUrl: publicUrl,
        verificationUrl: certificado.verificationUrl
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["certificados"] });
      toast.success("Certificado gerado com sucesso!", {
        description: `Número: ${data.numeroCertificado}`
      });
    },
    onError: (error: Error) => {
      console.error("[useGerarCertificado] Erro:", error);
      toast.error("Erro ao gerar certificado", {
        description: error.message
      });
    }
  });

  return {
    gerar: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError
  };
}
