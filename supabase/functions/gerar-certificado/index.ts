import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
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

    // === FASE 2: GERAR PDF COMPLETO ===
    console.log('[GERAR_CERTIFICADO] Gerando PDF...');
    
    // Baixar QR Code como imagem
    const qrResponse = await fetch(qrCodeUrl);
    const qrArrayBuffer = await qrResponse.arrayBuffer();
    
    // Criar documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const margin = 40;
    const blue = rgb(0.23, 0.51, 0.96); // #3B82F6
    const gray = rgb(0.17, 0.24, 0.31); // #2C3E50
    
    // Borda decorativa
    page.drawRectangle({
      x: margin,
      y: margin,
      width: width - 2 * margin,
      height: height - 2 * margin,
      borderColor: blue,
      borderWidth: 3,
    });
    
    page.drawRectangle({
      x: margin + 5,
      y: margin + 5,
      width: width - 2 * margin - 10,
      height: height - 2 * margin - 10,
      borderColor: blue,
      borderWidth: 1,
    });
    
    // Título
    page.drawText('CERTIFICADO DE CREDENCIAMENTO', {
      x: width / 2 - 300,
      y: height - 80,
      size: 32,
      font: fontBold,
      color: blue,
    });
    
    // Linha decorativa
    page.drawLine({
      start: { x: margin + 60, y: height - 95 },
      end: { x: width - margin - 60, y: height - 95 },
      thickness: 2,
      color: blue,
    });
    
    // Conteúdo
    let currentY = height - 150;
    
    page.drawText('Certificamos que:', {
      x: width / 2 - 70,
      y: currentY,
      size: 14,
      font: font,
      color: gray,
    });
    currentY -= 30;
    
    // Nome (destaque)
    page.drawText(credenciado.nome, {
      x: width / 2 - (credenciado.nome.length * 5),
      y: currentY,
      size: 20,
      font: fontBold,
      color: gray,
    });
    currentY -= 25;
    
    // CPF/CNPJ
    const cpfCnpj = credenciado.cpf || credenciado.cnpj || 'Não informado';
    page.drawText(`CPF/CNPJ: ${cpfCnpj}`, {
      x: width / 2 - 80,
      y: currentY,
      size: 12,
      font: font,
      color: gray,
    });
    currentY -= 20;
    
    // Especialidades
    page.drawText('Especialidade(s):', {
      x: width / 2 - 60,
      y: currentY,
      size: 12,
      font: font,
      color: gray,
    });
    currentY -= 15;
    
    page.drawText(especialidades, {
      x: width / 2 - (especialidades.length * 3),
      y: currentY,
      size: 12,
      font: fontBold,
      color: gray,
    });
    currentY -= 25;
    
    // Texto de certificação
    page.drawText('Está devidamente credenciado(a) junto à nossa instituição,', {
      x: width / 2 - 230,
      y: currentY,
      size: 11,
      font: font,
      color: gray,
    });
    currentY -= 12;
    
    page.drawText('com todos os requisitos necessários atendidos.', {
      x: width / 2 - 180,
      y: currentY,
      size: 11,
      font: font,
      color: gray,
    });
    currentY -= 20;
    
    // Datas
    const emitidoEm = new Date().toLocaleDateString('pt-BR');
    const validoAteFormatted = new Date(validoAte).toLocaleDateString('pt-BR');
    
    page.drawText(`Emitido em: ${emitidoEm}`, {
      x: width / 2 - 70,
      y: currentY,
      size: 10,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
    currentY -= 12;
    
    page.drawText(`Válido até: ${validoAteFormatted}`, {
      x: width / 2 - 70,
      y: currentY,
      size: 10,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // QR Code
    const qrImage = await pdfDoc.embedPng(qrArrayBuffer);
    const qrSize = 80;
    page.drawImage(qrImage, {
      x: width - margin - qrSize - 20,
      y: margin + 20,
      width: qrSize,
      height: qrSize,
    });
    
    page.drawText('Verificar autenticidade', {
      x: width - margin - qrSize - 5,
      y: margin + 10,
      size: 8,
      font: font,
      color: gray,
    });
    
    // Número do certificado (rodapé)
    page.drawText(`Nº ${numeroCertificado}`, {
      x: width / 2 - 80,
      y: margin + 10,
      size: 10,
      font: fontBold,
      color: blue,
    });
    
    // Salvar PDF
    const pdfBytes = await pdfDoc.save();
    console.log('[GERAR_CERTIFICADO] PDF gerado, tamanho:', pdfBytes.length);
    
    // === UPLOAD PARA STORAGE ===
    const fileName = `${credenciadoId}/${numeroCertificado}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('certificados')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (uploadError) {
      console.error('[GERAR_CERTIFICADO] Erro no upload:', uploadError);
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }
    
    console.log('[GERAR_CERTIFICADO] PDF enviado para storage:', fileName);
    
    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('certificados')
      .getPublicUrl(fileName);
    
    console.log('[GERAR_CERTIFICADO] URL pública:', publicUrl);

    // === SALVAR NO BANCO COM documento_url ===
    const { data: certificadoSalvo, error: saveError } = await supabase
      .from('certificados')
      .insert({
        credenciado_id: credenciadoId,
        numero_certificado: numeroCertificado,
        tipo: 'credenciamento',
        status: 'ativo',
        documento_url: publicUrl,
        emitido_em: new Date().toISOString(),
        valido_ate: validoAte.toISOString(),
        dados_certificado: {
          nome: credenciado.nome,
          cpf: credenciado.cpf,
          cnpj: credenciado.cnpj,
          especialidades,
          qr_code_url: qrCodeUrl,
          verification_url: verificationUrl
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('[GERAR_CERTIFICADO] Erro ao salvar certificado:', saveError);
      throw new Error(`Erro ao salvar certificado: ${saveError.message}`);
    }

    console.log('[GERAR_CERTIFICADO] Certificado salvo com sucesso:', certificadoSalvo.id);

    return new Response(
      JSON.stringify({
        success: true,
        certificado: {
          id: certificadoSalvo.id,
          numero_certificado: certificadoSalvo.numero_certificado,
          credenciado_id: certificadoSalvo.credenciado_id,
          documento_url: certificadoSalvo.documento_url,
          ...result.certificado
        },
        credenciado: result.credenciado
      }),
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
