// Edge Function - Gerar Declaração de Vínculo
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { credenciadoId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[DECLARACAO] Gerando declaração para credenciado: ${credenciadoId}`);

    // Buscar dados do credenciado
    const { data: credenciado, error: credError } = await supabase
      .from("credenciados")
      .select(`
        *,
        credenciado_crms (
          id,
          crm,
          uf_crm,
          especialidade
        ),
        inscricao:inscricao_id (
          id,
          edital:edital_id (titulo)
        )
      `)
      .eq("id", credenciadoId)
      .single();

    if (credError) throw credError;

    const dataAtual = new Date();
    const dataExtenso = dataAtual.toLocaleDateString('pt-BR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const especialidades = credenciado.credenciado_crms?.map((c: any) => c.especialidade).join(', ') || 'Não especificado';
    const crms = credenciado.credenciado_crms?.map((c: any) => `${c.crm}/${c.uf_crm}`).join(', ') || 'Não informado';
    const documento = credenciado.cpf || credenciado.cnpj || 'Não informado';

    // Gerar código de verificação único
    const codigoVerificacao = `DV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Declaração de Vínculo - ${credenciado.nome}</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #000;
      line-height: 1.8;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 22px;
      margin: 0;
      text-transform: uppercase;
      font-weight: bold;
    }
    .content {
      text-align: justify;
      margin: 30px 0;
      font-size: 14px;
    }
    .dados {
      margin: 30px 0;
      padding: 20px;
      background-color: #f5f5f5;
      border: 1px solid #ccc;
    }
    .dados-item {
      margin: 10px 0;
    }
    .dados-label {
      font-weight: bold;
      display: inline-block;
      width: 180px;
    }
    .periodo {
      margin: 20px 0;
      padding: 15px;
      border: 2px solid #000;
      font-weight: bold;
    }
    .footer {
      margin-top: 60px;
      text-align: center;
      font-size: 12px;
    }
    .assinatura {
      margin-top: 80px;
      text-align: center;
      border-top: 1px solid #000;
      padding-top: 10px;
      width: 400px;
      margin-left: auto;
      margin-right: auto;
    }
    .codigo {
      margin-top: 40px;
      text-align: center;
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Declaração de Vínculo</h1>
    <p>IPE Saúde - Sistema de Gestão de Credenciados</p>
  </div>

  <div class="content">
    <p>Declaramos, para os devidos fins e a quem possa interessar, que o(a) profissional abaixo identificado(a) 
    encontra-se <strong>CREDENCIADO(A)</strong> junto ao IPE Saúde - Instituto de Previdência do Estado.</p>
  </div>

  <div class="dados">
    <h3 style="margin-top: 0;">DADOS DO CREDENCIADO</h3>
    <div class="dados-item">
      <span class="dados-label">Nome:</span>
      <span>${credenciado.nome}</span>
    </div>
    <div class="dados-item">
      <span class="dados-label">CPF/CNPJ:</span>
      <span>${documento}</span>
    </div>
    <div class="dados-item">
      <span class="dados-label">CRM:</span>
      <span>${crms}</span>
    </div>
    <div class="dados-item">
      <span class="dados-label">Especialidade(s):</span>
      <span>${especialidades}</span>
    </div>
  </div>

  <div class="periodo">
    <p style="margin: 0;"><strong>PERÍODO DE CREDENCIAMENTO</strong></p>
    <p style="margin: 10px 0 0 0;">Início: ${new Date(credenciado.created_at).toLocaleDateString('pt-BR')}</p>
    <p style="margin: 5px 0 0 0;">Status Atual: <span style="color: ${credenciado.status === 'Ativo' ? 'green' : 'red'};">${credenciado.status}</span></p>
  </div>

  <div class="content">
    <p>Esta declaração é válida por 90 (noventa) dias a partir da data de emissão e pode ser verificada 
    através do código de verificação informado abaixo.</p>
  </div>

  <div class="footer">
    <p><strong>${dataExtenso}</strong></p>
  </div>

  <div class="assinatura">
    <p>Sistema de Credenciamento IPE Saúde</p>
    <p style="font-size: 11px; margin-top: 5px;">Documento Gerado Eletronicamente</p>
  </div>

  <div class="codigo">
    <p><strong>Código de Verificação:</strong> ${codigoVerificacao}</p>
    <p>Este documento é de uso exclusivo e confidencial</p>
  </div>
</body>
</html>
`;

    const fileName = `declaracao_vinculo_${credenciado.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;

    // Upload para Storage
    const { error: uploadError } = await supabase.storage
      .from("certificados")
      .upload(`declaracoes/${fileName}`, html, {
        contentType: "text/html",
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Gerar URL pública
    const { data: urlData } = await supabase.storage
      .from("certificados")
      .createSignedUrl(`declaracoes/${fileName}`, 86400); // 24h

    // Registrar emissão
    await supabase
      .from('documentos_emitidos')
      .insert({
        credenciado_id: credenciadoId,
        tipo_documento: 'declaracao_vinculo',
        numero_documento: codigoVerificacao,
        url_documento: urlData?.signedUrl || '',
        validade_ate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 dias
        metadata: {
          versao: '1.0',
          gerado_automaticamente: true,
          especialidades,
          crms
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        url: urlData?.signedUrl,
        codigo: codigoVerificacao
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[DECLARACAO] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
