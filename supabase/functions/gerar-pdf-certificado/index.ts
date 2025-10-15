import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { gerarPDFCertificado } from '../_shared/pdf-generator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { certificadoId } = await req.json();
    
    console.log('[GERAR_PDF] Processando certificado:', certificadoId);
    
    // 1. Buscar certificado
    const { data: cert, error: certError } = await supabase
      .from('certificados_regularidade')
      .select(`
        *,
        credenciados (nome, cpf, cnpj)
      `)
      .eq('id', certificadoId)
      .single();

    if (certError) {
      console.error('[GERAR_PDF] Erro ao buscar certificado:', certError);
      throw certError;
    }

    console.log('[GERAR_PDF] Certificado encontrado:', cert.numero_certificado);

    // 2. Gerar PDF
    const pdfData = await gerarPDFCertificado({
      numero_certificado: cert.numero_certificado,
      codigo_verificacao: cert.codigo_verificacao,
      credenciado_nome: cert.credenciados.nome,
      credenciado_cpf_cnpj: cert.credenciados.cpf || cert.credenciados.cnpj,
      status: cert.status,
      emitido_em: new Date(cert.emitido_em).toLocaleDateString('pt-BR'),
      valido_ate: new Date(cert.valido_ate).toLocaleDateString('pt-BR'),
      hash_verificacao: cert.hash_verificacao
    });

    console.log('[GERAR_PDF] PDF gerado, tamanho:', pdfData.length, 'bytes');

    // 3. Upload para storage
    const fileName = `${cert.numero_certificado}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('certificados-regularidade')
      .upload(fileName, pdfData, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('[GERAR_PDF] Erro ao fazer upload:', uploadError);
      throw uploadError;
    }

    console.log('[GERAR_PDF] Upload concluído:', fileName);

    // 4. Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('certificados-regularidade')
      .getPublicUrl(fileName);

    // 5. Atualizar URL no certificado
    const { error: updateError } = await supabase
      .from('certificados_regularidade')
      .update({ url_pdf: publicUrl })
      .eq('id', certificadoId);

    if (updateError) {
      console.error('[GERAR_PDF] Erro ao atualizar URL:', updateError);
      throw updateError;
    }

    console.log('[GERAR_PDF] ✅ Sucesso! URL:', publicUrl);

    return new Response(
      JSON.stringify({ success: true, url_pdf: publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[GERAR_PDF] ❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
