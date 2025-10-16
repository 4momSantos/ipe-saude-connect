import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import jsPDF from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { certificadoId } = await req.json();
    
    if (!certificadoId) {
      throw new Error('certificadoId é obrigatório');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[GERAR_PDF] Buscando certificado:', certificadoId);

    // Buscar dados do certificado
    const { data: certificado, error: certError } = await supabase
      .from('certificados_regularidade')
      .select(`
        *,
        credenciado:credenciados(
          nome,
          cpf,
          cnpj,
          endereco,
          cidade,
          estado
        )
      `)
      .eq('id', certificadoId)
      .single();

    if (certError || !certificado) {
      throw new Error('Certificado não encontrado');
    }

    console.log('[GERAR_PDF] Gerando PDF para certificado:', certificado.numero_certificado);

    const credenciado = Array.isArray(certificado.credenciado) 
      ? certificado.credenciado[0] 
      : certificado.credenciado;

    // Criar PDF usando jsPDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Borda decorativa
    doc.setDrawColor(37, 99, 235); // blue-600
    doc.setLineWidth(2);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
    
    doc.setLineWidth(0.5);
    doc.rect(margin + 2, margin + 2, pageWidth - 2 * margin - 4, pageHeight - 2 * margin - 4);

    // Título
    doc.setFontSize(24);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICADO DE REGULARIDADE", pageWidth / 2, 40, { align: "center" });

    // Subtítulo
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFont("helvetica", "normal");
    doc.text("Documento de Autenticidade", pageWidth / 2, 50, { align: "center" });

    // Linha decorativa
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.line(margin + 30, 55, pageWidth - margin - 30, 55);

    // Conteúdo
    let currentY = 70;
    const lineHeight = 10;
    const fieldHeight = 15;

    // Helper para adicionar campo
    const addField = (label: string, value: string) => {
      doc.setFillColor(243, 244, 246); // gray-100
      doc.roundedRect(margin + 10, currentY, pageWidth - 2 * margin - 20, fieldHeight, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 65, 81); // gray-700
      doc.text(label, margin + 15, currentY + 9);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55); // gray-800
      const valueX = margin + 15 + doc.getTextWidth(label) + 5;
      doc.text(value, valueX, currentY + 9);
      
      currentY += fieldHeight + 5;
    };

    addField("Certificado Nº:", certificado.numero_certificado);
    addField("Nome/Razão Social:", credenciado?.nome || 'N/A');
    addField("CPF/CNPJ:", credenciado?.cpf || credenciado?.cnpj || 'N/A');
    
    // Status com badge
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(margin + 10, currentY, pageWidth - 2 * margin - 20, fieldHeight, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("Status:", margin + 15, currentY + 9);
    
    // Badge verde
    doc.setFillColor(220, 252, 231); // green-100
    doc.setDrawColor(22, 101, 52); // green-800
    const badgeX = margin + 15 + doc.getTextWidth("Status:") + 5;
    doc.roundedRect(badgeX, currentY + 3, 30, 8, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text(certificado.status.toUpperCase(), badgeX + 15, currentY + 9, { align: "center" });
    currentY += fieldHeight + 5;

    addField("Válido de:", new Date(certificado.valido_de).toLocaleDateString('pt-BR'));
    addField("Válido até:", new Date(certificado.valido_ate).toLocaleDateString('pt-BR'));
    
    // Código de verificação (destaque)
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(margin + 10, currentY, pageWidth - 2 * margin - 20, fieldHeight, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("Código de Verificação:", margin + 15, currentY + 9);
    doc.setFont("courier", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    const codeX = margin + 15 + doc.getTextWidth("Código de Verificação: ");
    doc.text(certificado.codigo_verificacao, codeX, currentY + 9);
    currentY += fieldHeight + 5;

    // Rodapé
    const footerY = pageHeight - margin - 20;
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setLineWidth(1);
    doc.line(margin + 30, footerY, pageWidth - margin - 30, footerY);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Emitido em: ${new Date(certificado.emitido_em).toLocaleString('pt-BR')}`,
      pageWidth / 2,
      footerY + 8,
      { align: "center" }
    );
    doc.setFontSize(9);
    doc.text(
      "Este certificado pode ser validado em nosso sistema de consulta pública",
      pageWidth / 2,
      footerY + 14,
      { align: "center" }
    );

    // Gerar PDF como ArrayBuffer
    const pdfBytes = doc.output("arraybuffer");
    const fileName = `certificado-${certificado.numero_certificado}.pdf`;

    console.log('[GERAR_PDF] Fazendo upload para storage:', fileName);

    // Upload para storage
    const { error: uploadError } = await supabase
      .storage
      .from('certificados-regularidade')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('[GERAR_PDF] Erro no upload:', uploadError);
      throw new Error(`Erro ao fazer upload do PDF: ${uploadError.message}`);
    }

    // Obter URL pública
    const { data: urlData } = supabase
      .storage
      .from('certificados-regularidade')
      .getPublicUrl(fileName);

    console.log('[GERAR_PDF] Atualizando certificado com URL pública');

    // Atualizar certificado com URL
    const { error: updateError } = await supabase
      .from('certificados_regularidade')
      .update({ 
        url_pdf: urlData.publicUrl,
        metadata_pdf: {
          gerado_em: new Date().toISOString(),
          formato: 'pdf_storage',
          bucket: 'certificados-regularidade',
          file_name: fileName
        }
      })
      .eq('id', certificadoId);

    if (updateError) {
      throw updateError;
    }

    console.log('[GERAR_PDF] ✅ PDF gerado e salvo com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        certificado_id: certificadoId,
        url_pdf: urlData.publicUrl,
        numero_certificado: certificado.numero_certificado
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[GERAR_PDF] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
