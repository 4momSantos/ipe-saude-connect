import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { corsHeaders } from '../_shared/cors.ts';

// Funções de formatação
function formatarCPF(cpf: string): string {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatarTelefone(tel: string): string {
  if (!tel) return '';
  const cleaned = tel.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return tel;
}

function formatarCEP(cep: string): string {
  if (!cep) return '';
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return cep;
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const siteUrl = Deno.env.get('SITE_URL')!;

    const { credenciadoId, force_new = false } = await req.json();

    if (!credenciadoId) {
      throw new Error('credenciadoId é obrigatório');
    }

    console.log('[GERAR_CERTIFICADO] 🔥 VERSÃO COM STATUS - Gerando certificado para credenciado:', credenciadoId);

    // Buscar dados completos do credenciado
    const { data: credenciado, error: credenciadoError } = await supabase
      .from('credenciados')
      .select(`
        *,
        crms:credenciado_crms(
          id,
          crm,
          uf_crm,
          especialidade
        ),
        documentos:documentos_credenciados(
          id,
          tipo_documento,
          numero_documento,
          data_vencimento
        )
      `)
      .eq('id', credenciadoId)
      .single();

    if (credenciadoError) throw credenciadoError;
    if (!credenciado) throw new Error('Credenciado não encontrado');

    // Verificar se já existem certificados ativos
    const { data: existingCerts } = await supabase
      .from('certificados')
      .select('id, numero_certificado, documento_url, status')
      .eq('credenciado_id', credenciadoId)
      .eq('status', 'ativo');
    
    console.log('[GERAR_CERTIFICADO] Certificados existentes:', existingCerts?.length || 0);
    
    let numeroCertificado: string;
    let certificadoExistenteId: string | null = null;
    let motivo: string = 'emissao_inicial';
    
    // Verificar se há certificado incompleto (sem PDF) para regenerar
    const incompleteCert = existingCerts?.find(c => !c.documento_url);
    
    if (incompleteCert) {
      // CASO 1: Regenerar PDF no certificado existente sem PDF
      console.log('[GERAR_CERTIFICADO] Regenerando PDF para certificado:', incompleteCert.numero_certificado);
      numeroCertificado = incompleteCert.numero_certificado;
      certificadoExistenteId = incompleteCert.id;
      motivo = 'regeneracao';
      
      // Inativar outros certificados completos se houver
      const completeCerts = existingCerts?.filter(c => c.documento_url && c.id !== incompleteCert.id);
      if (completeCerts && completeCerts.length > 0) {
        console.log('[GERAR_CERTIFICADO] Inativando certificados anteriores completos:', completeCerts.length);
        await supabase
          .from('certificados')
          .update({ status: 'inativo' })
          .in('id', completeCerts.map(c => c.id));
      }
    } else if (existingCerts && existingCerts.length > 0) {
      // CASO 2: Existe(m) certificado(s) completo(s)
      const completeCerts = existingCerts.filter(c => c.documento_url);
      
      if (force_new) {
        // Forçar novo: inativar todos e criar novo
        console.log('[GERAR_CERTIFICADO] Gerando NOVO certificado (inativando', completeCerts.length, 'anteriores)');
        
        await supabase
          .from('certificados')
          .update({ status: 'inativo' })
          .in('id', completeCerts.map(c => c.id));
        
        const ano = new Date().getFullYear();
        const randomId = crypto.randomUUID().substring(0, 6).toUpperCase();
        numeroCertificado = `CERT-${ano}-${randomId}`;
        motivo = 'nova_copia';
      } else {
        // Inativar todos menos o mais recente e retornar ele
        const sortedCerts = completeCerts.sort((a, b) => 
          new Date(b.numero_certificado).getTime() - new Date(a.numero_certificado).getTime()
        );
        const mostRecent = sortedCerts[0];
        const toInactivate = sortedCerts.slice(1);
        
        if (toInactivate.length > 0) {
          console.log('[GERAR_CERTIFICADO] Inativando', toInactivate.length, 'certificados duplicados');
          await supabase
            .from('certificados')
            .update({ status: 'inativo' })
            .in('id', toInactivate.map(c => c.id));
        }
        
        console.log('[GERAR_CERTIFICADO] Retornando certificado mais recente:', mostRecent.numero_certificado);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Certificado já existe',
            certificado: mostRecent,
            documento_url: mostRecent.documento_url
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    } else {
      // CASO 3: Não existe certificado - criar novo
      const ano = new Date().getFullYear();
      const randomId = crypto.randomUUID().substring(0, 6).toUpperCase();
      numeroCertificado = `CERT-${ano}-${randomId}`;
      motivo = 'emissao_inicial';
    }

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
    currentY -= 30;
    
    // 🔵 Status do Credenciamento (NOVO)
    console.log('[GERAR_CERTIFICADO] Renderizando status:', credenciado.status || 'Ativo');
    const statusText = `Status: ${credenciado.status || 'Ativo'}`;
    const statusColor = credenciado.status === 'Ativo' ? rgb(0.13, 0.54, 0.13) :  // verde
                       credenciado.status === 'Suspenso' || credenciado.status === 'Suspenso Temporariamente' ? rgb(0.85, 0.55, 0.13) :  // laranja
                       credenciado.status === 'Descredenciado' ? rgb(0.8, 0.13, 0.13) :  // vermelho
                       gray;

    page.drawText(statusText, {
      x: width / 2 - (fontBold.widthOfTextAtSize(statusText, 14) / 2),
      y: currentY,
      size: 14,
      font: fontBold,
      color: statusColor,
    });
    currentY -= 30;
    
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
    
    // ===== PÁGINA 2: EXTRATO DE DADOS PESSOAIS =====
    console.log('[GERAR_CERTIFICADO] Gerando página 2 - Extrato de Dados Pessoais...');
    const page2 = pdfDoc.addPage([842, 595]); // A4 landscape
    const { width: width2, height: height2 } = page2.getSize();
    let y = height2 - 60;

    // Título página 2
    page2.drawText('EXTRATO DE DADOS PESSOAIS', {
      x: width2 / 2 - 180,
      y,
      size: 24,
      font: fontBold,
      color: blue,
    });
    y -= 10;

    // Linha decorativa
    page2.drawLine({
      start: { x: margin + 60, y },
      end: { x: width2 - margin - 60, y },
      thickness: 2,
      color: blue,
    });
    y -= 40;

    // === SEÇÃO: IDENTIFICAÇÃO ===
    page2.drawText('IDENTIFICAÇÃO', {
      x: margin + 20,
      y,
      size: 14,
      font: fontBold,
      color: blue,
    });
    y -= 25;

    // Nome
    page2.drawText('Nome Completo:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
    page2.drawText(credenciado.nome, { x: margin + 180, y, size: 10, font, color: gray });
    y -= 18;

    // Tipo de Pessoa
    const tipoPessoa = credenciado.cpf ? 'Pessoa Física' : 'Pessoa Jurídica';
    page2.drawText('Tipo:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
    page2.drawText(tipoPessoa, { x: margin + 180, y, size: 10, font, color: gray });
    y -= 18;

    // CPF/CNPJ
    if (credenciado.cpf) {
      page2.drawText('CPF:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
      page2.drawText(formatarCPF(credenciado.cpf), { x: margin + 180, y, size: 10, font, color: gray });
      y -= 18;
    } else if (credenciado.cnpj) {
      page2.drawText('CNPJ:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
      page2.drawText(formatarCNPJ(credenciado.cnpj), { x: margin + 180, y, size: 10, font, color: gray });
      y -= 18;
    }

    // Número de Credenciado
    if (credenciado.numero_credenciado) {
      page2.drawText('Nº Credenciado:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
      page2.drawText(credenciado.numero_credenciado, { x: margin + 180, y, size: 10, font, color: gray });
      y -= 25;
    }

    // === SEÇÃO: DADOS PROFISSIONAIS ===
    if (credenciado.crms && credenciado.crms.length > 0) {
      page2.drawText('DADOS PROFISSIONAIS', {
        x: margin + 20,
        y,
        size: 14,
        font: fontBold,
        color: blue,
      });
      y -= 25;

      credenciado.crms.forEach((crm: any, index: number) => {
        page2.drawText(`CRM ${index + 1}:`, { x: margin + 40, y, size: 10, font: fontBold, color: gray });
        page2.drawText(`${crm.crm}/${crm.uf_crm}`, { x: margin + 180, y, size: 10, font, color: gray });
        y -= 18;

        page2.drawText('Especialidade:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
        page2.drawText(crm.especialidade, { x: margin + 180, y, size: 10, font, color: gray });
        y -= 25;
      });
    }

    // === SEÇÃO: CONTATO ===
    page2.drawText('CONTATO', {
      x: margin + 20,
      y,
      size: 14,
      font: fontBold,
      color: blue,
    });
    y -= 25;

    if (credenciado.email) {
      page2.drawText('E-mail:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
      page2.drawText(credenciado.email, { x: margin + 180, y, size: 10, font, color: gray });
      y -= 18;
    }

    if (credenciado.telefone) {
      page2.drawText('Telefone:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
      page2.drawText(formatarTelefone(credenciado.telefone), { x: margin + 180, y, size: 10, font, color: gray });
      y -= 18;
    }

    if (credenciado.celular) {
      page2.drawText('Celular:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
      page2.drawText(formatarTelefone(credenciado.celular), { x: margin + 180, y, size: 10, font, color: gray });
      y -= 25;
    }

    // === SEÇÃO: ENDEREÇO ===
    if (credenciado.endereco || credenciado.cidade) {
      page2.drawText('ENDEREÇO', {
        x: margin + 20,
        y,
        size: 14,
        font: fontBold,
        color: blue,
      });
      y -= 25;

      if (credenciado.endereco) {
        page2.drawText('Logradouro:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
        page2.drawText(credenciado.endereco, { x: margin + 180, y, size: 10, font, color: gray });
        y -= 18;
      }

      if (credenciado.bairro) {
        page2.drawText('Bairro:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
        page2.drawText(credenciado.bairro, { x: margin + 180, y, size: 10, font, color: gray });
        y -= 18;
      }

      if (credenciado.cidade && credenciado.estado) {
        page2.drawText('Cidade/UF:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
        page2.drawText(`${credenciado.cidade} - ${credenciado.estado}`, { x: margin + 180, y, size: 10, font, color: gray });
        y -= 18;
      }

      if (credenciado.cep) {
        page2.drawText('CEP:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
        page2.drawText(formatarCEP(credenciado.cep), { x: margin + 180, y, size: 10, font, color: gray });
        y -= 25;
      }
    }

    // === SEÇÃO: INFORMAÇÕES DO CREDENCIAMENTO ===
    page2.drawText('INFORMAÇÕES DO CREDENCIAMENTO', {
      x: margin + 20,
      y,
      size: 14,
      font: fontBold,
      color: blue,
    });
    y -= 25;

    page2.drawText('Número do Certificado:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
    page2.drawText(numeroCertificado, { x: margin + 220, y, size: 10, font, color: gray });
    y -= 18;

    page2.drawText('Data de Emissão:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
    page2.drawText(emitidoEm, { x: margin + 220, y, size: 10, font, color: gray });
    y -= 18;

    page2.drawText('Validade:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
    page2.drawText(validoAteFormatted, { x: margin + 220, y, size: 10, font, color: gray });
    y -= 18;

    const statusColor2 = credenciado.status === 'Ativo' ? rgb(0.13, 0.54, 0.13) : rgb(0.8, 0.13, 0.13);
    page2.drawText('Status:', { x: margin + 40, y, size: 10, font: fontBold, color: gray });
    page2.drawText(credenciado.status || 'Ativo', { x: margin + 220, y, size: 10, font: fontBold, color: statusColor2 });
    y -= 25;

    // === SEÇÃO: DOCUMENTOS ANEXOS (se houver) ===
    if (credenciado.documentos && credenciado.documentos.length > 0) {
      page2.drawText('DOCUMENTOS ANEXOS', {
        x: margin + 20,
        y,
        size: 14,
        font: fontBold,
        color: blue,
      });
      y -= 25;

      credenciado.documentos.slice(0, 5).forEach((doc: any) => {
        const textoDoc = `• ${doc.tipo_documento}`;
        page2.drawText(textoDoc, { x: margin + 40, y, size: 9, font, color: gray });

        if (doc.numero_documento) {
          page2.drawText(`Nº ${doc.numero_documento}`, { x: margin + 280, y, size: 9, font, color: gray });
        }

        if (doc.data_vencimento) {
          const valDoc = new Date(doc.data_vencimento).toLocaleDateString('pt-BR');
          page2.drawText(`Val: ${valDoc}`, { x: margin + 450, y, size: 9, font, color: gray });
        }

        y -= 16;
      });
    }

    // Rodapé página 2
    page2.drawText('Este extrato contém informações cadastrais do credenciado.', {
      x: width2 / 2 - 180,
      y: 70,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page2.drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, {
      x: width2 / 2 - 100,
      y: 55,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Salvar PDF (agora com 2 páginas)
    const pdfBytes = await pdfDoc.save();
    console.log('[GERAR_CERTIFICADO] PDF gerado com 2 páginas, tamanho:', pdfBytes.length);
    
    // === UPLOAD PARA STORAGE ===
    const fileName = `${credenciadoId}/${numeroCertificado}.pdf`;
    
    console.log('[GERAR_CERTIFICADO] Tentando upload:', {
      bucket: 'certificados',
      fileName,
      fileSize: pdfBytes.length,
      contentType: 'application/pdf'
    });
    
    // Tentar upload com upsert
    let uploadResult = await supabase.storage
      .from('certificados')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true  // ⬅️ CORREÇÃO PRINCIPAL: Sobrescrever se já existir
      });
    
    let uploadError = uploadResult.error;
    
    // Se falhar com "já existe", tentar deletar e fazer upload novamente
    if (uploadError && (uploadError as any).status === 409) {
      console.log('[GERAR_CERTIFICADO] Arquivo existe apesar do upsert, deletando e tentando novamente...');
      
      await supabase.storage
        .from('certificados')
        .remove([fileName]);
      
      uploadResult = await supabase.storage
        .from('certificados')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf'
        });
      
      uploadError = uploadResult.error;
    }
    
    if (uploadError) {
      console.error('[GERAR_CERTIFICADO] Erro no upload:', {
        error: uploadError,
        status: (uploadError as any).status,
        message: uploadError.message
      });
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }
    
    console.log('[GERAR_CERTIFICADO] Upload realizado com sucesso:', uploadResult.data?.path);
    
    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('certificados')
      .getPublicUrl(fileName);
    
    console.log('[GERAR_CERTIFICADO] URL pública:', publicUrl);
    
    // HOTFIX #2: Validar que o arquivo está realmente acessível
    console.log('[GERAR_CERTIFICADO] Validando upload...');
    const validationResponse = await fetch(publicUrl, { method: 'HEAD' });
    if (!validationResponse.ok) {
      console.error('[GERAR_CERTIFICADO] ❌ Arquivo não acessível:', {
        url: publicUrl,
        status: validationResponse.status
      });
      throw new Error(`Upload não validado: arquivo não acessível (${validationResponse.status})`);
    }
    
    const contentLength = validationResponse.headers.get('content-length');
    console.log('[GERAR_CERTIFICADO] ✅ Upload validado:', {
      url: publicUrl,
      size: contentLength,
      contentType: validationResponse.headers.get('content-type')
    });

    // === SALVAR NO BANCO COM documento_url ===
    let certificadoSalvo: any;

    // Se certificado já existe (regeneração), fazer UPDATE
    if (certificadoExistenteId) {
      console.log('[GERAR_CERTIFICADO] Atualizando certificado existente:', certificadoExistenteId);
      
      const { data: certificadoAtualizado, error: updateError } = await supabase
        .from('certificados')
        .update({
          documento_url: publicUrl,
          dados_certificado: {
            nome: credenciado.nome,
            cpf: credenciado.cpf,
            cnpj: credenciado.cnpj,
            status: credenciado.status,
            especialidades,
            qr_code_url: qrCodeUrl,
            verification_url: verificationUrl
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', certificadoExistenteId)
        .select()
        .single();
      
      if (updateError) {
        console.error('[GERAR_CERTIFICADO] Erro ao atualizar certificado:', updateError);
        throw new Error(`Erro ao atualizar certificado: ${updateError.message}`);
      }
      
      certificadoSalvo = certificadoAtualizado;
    }
    // Senão, criar novo (comportamento padrão)
    else {
      console.log('[GERAR_CERTIFICADO] Criando novo certificado');
      
      const { data: novoCertificado, error: insertError } = await supabase
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
            status: credenciado.status,
            especialidades,
            qr_code_url: qrCodeUrl,
            verification_url: verificationUrl
          }
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[GERAR_CERTIFICADO] Erro ao inserir certificado:', insertError);
        throw new Error(`Erro ao inserir certificado: ${insertError.message}`);
      }
      
      certificadoSalvo = novoCertificado;
    }

    console.log('[GERAR_CERTIFICADO] Certificado salvo com sucesso:', certificadoSalvo.id);

    // === FASE 5: REGISTRAR NO HISTÓRICO ===
    const { error: historicoError } = await supabase
      .from('certificados_historico')
      .insert({
        certificado_id: certificadoSalvo.id,
        credenciado_id: credenciadoId,
        numero_certificado: numeroCertificado,
        documento_url: publicUrl,
        motivo,
        metadata: {
          force_new,
          regeneracao: certificadoExistenteId !== null,
          especialidades
        }
      });

    if (historicoError) {
      console.warn('[GERAR_CERTIFICADO] Erro ao registrar histórico (não crítico):', historicoError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        certificado: {
          id: certificadoSalvo.id,
          numero_certificado: certificadoSalvo.numero_certificado,
          credenciado_id: certificadoSalvo.credenciado_id,
          documento_url: certificadoSalvo.documento_url,
          emitido_em: certificadoSalvo.emitido_em,
          valido_ate: certificadoSalvo.valido_ate,
          status: certificadoSalvo.status,
          dados_certificado: certificadoSalvo.dados_certificado,
          verificationUrl: verificationUrl
        },
        credenciado: {
          id: credenciado.id,
          nome: credenciado.nome,
          cpf: credenciado.cpf,
          cnpj: credenciado.cnpj
        }
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
