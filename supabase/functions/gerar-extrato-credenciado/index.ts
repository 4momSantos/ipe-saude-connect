// FASE 11.2: Edge Function - Gerar Extrato de Dados do Credenciado
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
    const { credenciadoId, secoes } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[EXTRATO] Gerando extrato para credenciado: ${credenciadoId}`);

    // Buscar dados do credenciado
    const { data: credenciado, error: credError } = await supabase
      .from("credenciados")
      .select(`
        *,
        credenciado_crms (
          id,
          crm,
          uf_crm,
          especialidade,
          horarios_atendimento (*)
        ),
        categoria:categoria_id (nome, descricao),
        inscricao:inscricao_id (
          id,
          dados_inscricao,
          edital:edital_id (titulo)
        )
      `)
      .eq("id", credenciadoId)
      .single();

    if (credError) throw credError;

    let html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Extrato de Dados - ${credenciado.nome}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #1e40af;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 10px;
    }
    h2 {
      color: #3b82f6;
      margin-top: 30px;
      border-left: 4px solid #3b82f6;
      padding-left: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .info-row {
      display: flex;
      margin: 10px 0;
    }
    .info-label {
      font-weight: bold;
      width: 200px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 14px;
    }
    .status-ativo {
      background-color: #d1fae5;
      color: #065f46;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>Extrato de Dados do Credenciado</h1>
  <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
`;

    // Seção: Dados Pessoais
    if (!secoes || secoes.includes('dados_pessoais')) {
      html += `
  <h2>Dados Pessoais</h2>
  <div class="info-row">
    <div class="info-label">Nome:</div>
    <div>${credenciado.nome}</div>
  </div>
  <div class="info-row">
    <div class="info-label">CPF:</div>
    <div>${credenciado.cpf || 'Não informado'}</div>
  </div>
  <div class="info-row">
    <div class="info-label">CNPJ:</div>
    <div>${credenciado.cnpj || 'Não informado'}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Email:</div>
    <div>${credenciado.email || 'Não informado'}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Telefone:</div>
    <div>${credenciado.telefone || 'Não informado'}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Celular:</div>
    <div>${credenciado.celular || 'Não informado'}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Status:</div>
    <div><span class="status-badge status-ativo">${credenciado.status}</span></div>
  </div>
  <div class="info-row">
    <div class="info-label">Categoria:</div>
    <div>${credenciado.categoria?.nome || 'Sem categoria'}</div>
  </div>
`;
    }

    // Seção: Endereço
    if (!secoes || secoes.includes('endereco')) {
      html += `
  <h2>Endereço</h2>
  <div class="info-row">
    <div class="info-label">Endereço:</div>
    <div>${credenciado.endereco || 'Não informado'}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Cidade:</div>
    <div>${credenciado.cidade || 'Não informado'}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Estado:</div>
    <div>${credenciado.estado || 'Não informado'}</div>
  </div>
  <div class="info-row">
    <div class="info-label">CEP:</div>
    <div>${credenciado.cep || 'Não informado'}</div>
  </div>
`;
    }

    // Seção: CRMs e Especialidades
    if ((!secoes || secoes.includes('crms')) && credenciado.credenciado_crms?.length > 0) {
      html += `
  <h2>CRMs e Especialidades</h2>
  <table>
    <thead>
      <tr>
        <th>CRM</th>
        <th>UF</th>
        <th>Especialidade</th>
      </tr>
    </thead>
    <tbody>
`;
      for (const crm of credenciado.credenciado_crms) {
        html += `
      <tr>
        <td>${crm.crm}</td>
        <td>${crm.uf_crm}</td>
        <td>${crm.especialidade}</td>
      </tr>
`;
      }
      html += `
    </tbody>
  </table>
`;
    }

    html += `
  <div class="footer">
    <p>IPE Saúde - Sistema de Gestão de Credenciados</p>
    <p>Este documento é de uso exclusivo e confidencial</p>
  </div>
</body>
</html>
`;

    const fileName = `extrato_${credenciado.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;

    // Upload para Storage
    const { error: uploadError } = await supabase.storage
      .from("certificados")
      .upload(`extratos/${fileName}`, html, {
        contentType: "text/html",
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Gerar URL pública
    const { data: urlData } = await supabase.storage
      .from("certificados")
      .createSignedUrl(`extratos/${fileName}`, 86400); // 24h

    // Registrar emissão
    await supabase
      .from('documentos_emitidos')
      .insert({
        credenciado_id: credenciadoId,
        tipo_documento: 'extrato_completo',
        url_documento: urlData?.signedUrl || '',
        metadata: {
          versao: '1.0',
          gerado_automaticamente: true,
          secoes: secoes || ['todas']
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        url: urlData?.signedUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[EXTRATO] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
