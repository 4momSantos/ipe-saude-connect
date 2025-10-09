import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const siteUrl = Deno.env.get('SITE_URL')!;

    const { credenciadoId } = await req.json();

    if (!credenciadoId) {
      throw new Error('credenciadoId é obrigatório');
    }

    console.log('[GERAR_CERTIFICADO] Gerando certificado para credenciado:', credenciadoId);

    // Buscar dados do credenciado
    const { data: credenciado, error: credenciadoError } = await supabase
      .from('credenciados')
      .select(`
        *,
        crms:credenciado_crms(
          id,
          crm,
          uf_crm,
          especialidade
        )
      `)
      .eq('id', credenciadoId)
      .single();

    if (credenciadoError) throw credenciadoError;
    if (!credenciado) throw new Error('Credenciado não encontrado');

    // Verificar se já existe certificado ativo
    const { data: existingCert } = await supabase
      .from('certificados')
      .select('id, numero_certificado')
      .eq('credenciado_id', credenciadoId)
      .eq('status', 'ativo')
      .single();

    if (existingCert) {
      console.log('[GERAR_CERTIFICADO] Certificado já existe:', existingCert.numero_certificado);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Certificado já existe para este credenciado',
          certificado: existingCert
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Gerar número único do certificado
    const ano = new Date().getFullYear();
    const randomId = crypto.randomUUID().substring(0, 6).toUpperCase();
    const numeroCertificado = `CERT-${ano}-${randomId}`;

    // URL de verificação
    const verificationUrl = `${siteUrl}/verificar-certificado/${numeroCertificado}`;

    // URL do QR Code via API externa
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verificationUrl)}`;

    // Especialidades formatadas
    const especialidades = credenciado.crms.map((c: any) => c.especialidade).join(', ') || 'Não informado';

    // Data de validade (2 anos)
    const validoAte = new Date();
    validoAte.setFullYear(validoAte.getFullYear() + 2);

    const result = {
      credenciado: {
        id: credenciado.id,
        nome: credenciado.nome,
        cpf: credenciado.cpf,
        cnpj: credenciado.cnpj,
        especialidades
      },
      certificado: {
        numero: numeroCertificado,
        emitidoEm: new Date().toISOString(),
        validoAte: validoAte.toISOString(),
        verificationUrl,
        qrCodeUrl
      }
    };

    console.log('[GERAR_CERTIFICADO] Dados do certificado preparados:', numeroCertificado);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('[GERAR_CERTIFICADO] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
