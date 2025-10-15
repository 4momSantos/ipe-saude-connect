import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    console.log('[GERAR_PDFS_TESTE] Iniciando geração de PDFs de teste');
    
    // Buscar certificados de teste
    const { data: certificados, error: certError } = await supabase
      .from('certificados_regularidade')
      .select('id, numero_certificado, codigo_verificacao, status, credenciado_id')
      .in('codigo_verificacao', ['A1B2C3D4', 'X9Y8Z7W6', 'P1Q2R3S4']);
    
    if (certError) {
      console.error('[GERAR_PDFS_TESTE] Erro ao buscar certificados:', certError);
      throw certError;
    }
    
    console.log(`[GERAR_PDFS_TESTE] Encontrados ${certificados?.length} certificados`);
    
    const resultados = [];
    
    for (const cert of certificados || []) {
      try {
        // Buscar dados do credenciado
        const { data: credenciado } = await supabase
          .from('credenciados')
          .select('nome, cpf, cnpj')
          .eq('id', cert.credenciado_id)
          .single();
        
        // Gerar PDF simples (texto)
        const pdfContent = `
==============================================
   CERTIFICADO DE REGULARIDADE CADASTRAL
==============================================

Número: ${cert.numero_certificado}
Código de Verificação: ${cert.codigo_verificacao}
Status: ${cert.status}

Credenciado: ${credenciado?.nome || 'N/A'}
${credenciado?.cpf ? `CPF: ${credenciado.cpf}` : ''}
${credenciado?.cnpj ? `CNPJ: ${credenciado.cnpj}` : ''}

Este é um certificado de teste.
Gerado automaticamente em ${new Date().toISOString()}

==============================================
        `;
        
        const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
        const filename = `${cert.numero_certificado}.pdf`;
        
        // Upload para o storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('certificados-regularidade')
          .upload(filename, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });
        
        if (uploadError) {
          console.error(`[GERAR_PDFS_TESTE] Erro ao fazer upload de ${filename}:`, uploadError);
          resultados.push({
            numero: cert.numero_certificado,
            sucesso: false,
            erro: uploadError.message
          });
          continue;
        }
        
        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('certificados-regularidade')
          .getPublicUrl(filename);
        
        // Atualizar url_pdf na tabela
        const { error: updateError } = await supabase
          .from('certificados_regularidade')
          .update({ url_pdf: urlData.publicUrl })
          .eq('id', cert.id);
        
        if (updateError) {
          console.error(`[GERAR_PDFS_TESTE] Erro ao atualizar url_pdf:`, updateError);
        }
        
        console.log(`[GERAR_PDFS_TESTE] ✅ PDF gerado: ${filename}`);
        resultados.push({
          numero: cert.numero_certificado,
          sucesso: true,
          url: urlData.publicUrl
        });
        
      } catch (error) {
        console.error(`[GERAR_PDFS_TESTE] Erro ao processar certificado ${cert.numero_certificado}:`, error);
        resultados.push({
          numero: cert.numero_certificado,
          sucesso: false,
          erro: (error as Error).message
        });
      }
    }
    
    return new Response(
      JSON.stringify({
        sucesso: true,
        total: certificados?.length || 0,
        resultados
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('[GERAR_PDFS_TESTE] Erro:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
