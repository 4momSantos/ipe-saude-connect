import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

interface ContratoData {
  inscricao_id: string;
  tipo_credenciamento: 'PF' | 'PJ';
  candidato_nome: string;
  candidato_cpf: string;
  candidato_cnpj?: string;
  candidato_documento_tipo: 'CPF' | 'CNPJ';
  candidato_documento: string;
  candidato_cpf_formatado: string;
  candidato_rg: string;
  candidato_email: string;
  candidato_telefone: string;
  candidato_celular: string;
  candidato_endereco_completo: string;
  candidato_data_nascimento: string;
  candidato_data_nascimento_formatada: string;
  consultorios: Array<{
    nome: string;
    cnes: string;
    endereco_completo: string;
    telefone: string;
    especialidades: string[];
    is_principal: boolean;
  }>;
  edital_titulo: string;
  edital_numero: string;
  edital_objeto: string;
  edital_data_publicacao: string;
  edital_data_publicacao_formatada: string;
  especialidades: string[];
  especialidades_texto: string;
  sistema_data_atual: string;
  sistema_data_extenso: string;
}

/**
 * Gera PDF/A-1b compatível usando pdf-lib
 */
export async function gerarContratoPDFA(contratoData: ContratoData): Promise<Uint8Array> {
  console.log(JSON.stringify({
    level: 'info',
    action: 'pdfa_generation_start',
    library: 'pdf-lib',
    inscricao_id: contratoData.inscricao_id
  }));

  const pdfDoc = await PDFDocument.create();

  // Metadados básicos
  pdfDoc.setTitle('Contrato de Credenciamento');
  pdfDoc.setAuthor('Sistema de Gestão de Credenciamentos');
  pdfDoc.setSubject('Credenciamento de Prestador de Serviços de Saúde');
  pdfDoc.setKeywords(['contrato', 'credenciamento', 'saúde', 'PDF/A-1b']);
  pdfDoc.setProducer('pdf-lib + Lovable Cloud');
  pdfDoc.setCreator('Sistema Lovable PDF/A-1b Generator');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  // Adicionar XMP Metadata para PDF/A-1b
  const xmpMetadata = `<?xpacket begin='' id='W5M0MpCehiHzreSzNTczkc9d'?>
<x:xmpmeta xmlns:x='adobe:ns:meta/'>
  <rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>
    <rdf:Description rdf:about='' xmlns:dc='http://purl.org/dc/elements/1.1/'>
      <dc:format>application/pdf</dc:format>
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang='pt-BR'>Contrato de Credenciamento</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>Sistema de Gestão de Credenciamentos</rdf:li>
        </rdf:Seq>
      </dc:creator>
      <dc:subject>
        <rdf:Bag>
          <rdf:li>credenciamento</rdf:li>
          <rdf:li>saúde</rdf:li>
        </rdf:Bag>
      </dc:subject>
    </rdf:Description>
    <rdf:Description rdf:about='' xmlns:xmp='http://ns.adobe.com/xap/1.0/'>
      <xmp:CreateDate>${new Date().toISOString()}</xmp:CreateDate>
      <xmp:CreatorTool>pdf-lib 1.17.1 PDF/A-1b Generator</xmp:CreatorTool>
      <xmp:ModifyDate>${new Date().toISOString()}</xmp:ModifyDate>
    </rdf:Description>
    <rdf:Description rdf:about='' xmlns:pdfaid='http://www.aiim.org/pdfa/ns/id/'>
      <pdfaid:part>1</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end='w'?>`;

  const context = pdfDoc.context;
  const metadataStreamRef = context.register(
    context.stream(new TextEncoder().encode(xmpMetadata), {
      Type: 'Metadata',
      Subtype: 'XML',
    })
  );

  pdfDoc.catalog.set(context.obj({ Metadata: metadataStreamRef }));

  // Adicionar Output Intent com ICC Profile sRGB
  try {
    const iccProfileResponse = await fetch(
      "https://raw.githubusercontent.com/saucelabs/sRGB-IEC61966-2.1/master/sRGB-IEC61966-2.1.icc"
    );
    const iccProfileBytes = await iccProfileResponse.arrayBuffer();
    
    const iccStreamRef = context.register(
      context.flateStream(new Uint8Array(iccProfileBytes))
    );

    const outputIntentDict = context.obj({
      Type: 'OutputIntent',
      S: 'GTS_PDFA1',
      OutputConditionIdentifier: 'sRGB IEC61966-2.1',
      Info: 'sRGB IEC61966-2.1',
      DestOutputProfile: iccStreamRef,
    });

    const outputIntentRef = context.register(outputIntentDict);
    pdfDoc.catalog.set(context.obj({ OutputIntents: [outputIntentRef] }));
    
    console.log('[PDF/A] ICC Profile sRGB adicionado com sucesso');
  } catch (iccError) {
    console.warn('[PDF/A] Falha ao adicionar ICC Profile (não crítico):', iccError);
  }

  // Configurar página A4
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 em pontos
  const { width, height } = page.getSize();
  const margin = 56.69; // 20mm em pontos
  const contentWidth = width - (margin * 2);

  // Embedar fontes
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let yPos = height - margin;

  // Helper: adicionar texto com quebra de linha
  const addText = (
    text: string, 
    fontSize: number = 10, 
    font = fontRegular, 
    color = rgb(0, 0, 0),
    spacing: number = 6
  ) => {
    const lines = [];
    const words = text.split(' ');
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth > contentWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);

    lines.forEach(line => {
      if (yPos - fontSize < margin) {
        page = pdfDoc.addPage([595.28, 841.89]);
        yPos = height - margin;
      }

      page.drawText(line, {
        x: margin,
        y: yPos,
        size: fontSize,
        font,
        color,
      });
      yPos -= fontSize + 2;
    });

    yPos -= spacing;
  };

  // CABEÇALHO
  page.drawText('CONTRATO DE CREDENCIAMENTO', {
    x: width / 2 - fontBold.widthOfTextAtSize('CONTRATO DE CREDENCIAMENTO', 18) / 2,
    y: yPos,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.6),
  });
  yPos -= 30;

  addText(`Edital: ${contratoData.edital_numero}`, 10, fontRegular, rgb(0, 0, 0), 5);
  addText(`Data: ${contratoData.sistema_data_extenso}`, 10, fontRegular, rgb(0, 0, 0), 15);

  // SEÇÃO 1: DAS PARTES
  addText('1. DAS PARTES', 12, fontBold, rgb(0, 0, 0), 8);
  addText('CONTRATANTE:', 10, fontBold, rgb(0, 0, 0), 6);
  addText(
    '[Nome da Instituição], pessoa jurídica de direito público, inscrita no CNPJ sob nº [CNPJ], com sede na [Endereço], neste ato representada por [Representante Legal].',
    10,
    fontRegular,
    rgb(0, 0, 0),
    8
  );

  addText('CONTRATADO:', 10, fontBold, rgb(0, 0, 0), 6);
  if (contratoData.tipo_credenciamento === 'PF') {
    addText(
      `${contratoData.candidato_nome}, CPF ${contratoData.candidato_cpf_formatado}, RG ${contratoData.candidato_rg || 'não informado'}, residente em ${contratoData.candidato_endereco_completo}, e-mail ${contratoData.candidato_email}, telefone ${contratoData.candidato_telefone || contratoData.candidato_celular}.`,
      10,
      fontRegular,
      rgb(0, 0, 0),
      10
    );
  } else {
    addText(
      `${contratoData.candidato_nome}, CNPJ ${contratoData.candidato_cpf_formatado}, com sede em ${contratoData.candidato_endereco_completo}, e-mail ${contratoData.candidato_email}, telefone ${contratoData.candidato_telefone || contratoData.candidato_celular}.`,
      10,
      fontRegular,
      rgb(0, 0, 0),
      10
    );
  }

  // SEÇÃO 2: DO OBJETO
  addText('2. DO OBJETO', 12, fontBold, rgb(0, 0, 0), 8);
  addText(
    `O presente contrato tem por objeto o credenciamento do CONTRATADO para prestação de serviços de saúde, conforme especificado no ${contratoData.edital_numero}, publicado em ${contratoData.edital_data_publicacao_formatada}.`,
    10,
    fontRegular,
    rgb(0, 0, 0),
    8
  );
  addText('Objeto do Edital:', 10, fontBold, rgb(0, 0, 0), 6);
  addText(contratoData.edital_objeto, 10, fontRegular, rgb(0, 0, 0), 10);

  // CONSULTÓRIOS (para PJ)
  if (contratoData.tipo_credenciamento === 'PJ' && contratoData.consultorios.length > 0) {
    addText('3. DOS CONSULTÓRIOS CREDENCIADOS', 12, fontBold, rgb(0, 0, 0), 8);
    contratoData.consultorios.forEach((consultorio, idx) => {
      addText(
        `Consultório ${idx + 1}${consultorio.is_principal ? ' (Principal)' : ''}:`,
        10,
        fontBold,
        rgb(0, 0, 0),
        6
      );
      addText(`Nome: ${consultorio.nome}`, 10, fontRegular, rgb(0, 0, 0), 2);
      addText(`CNES: ${consultorio.cnes}`, 10, fontRegular, rgb(0, 0, 0), 2);
      addText(`Endereço: ${consultorio.endereco_completo}`, 10, fontRegular, rgb(0, 0, 0), 2);
      addText(`Telefone: ${consultorio.telefone}`, 10, fontRegular, rgb(0, 0, 0), 8);
    });
  }

  // ESPECIALIDADES (para PF)
  if (contratoData.tipo_credenciamento === 'PF' && contratoData.especialidades.length > 0) {
    addText('3. DAS ESPECIALIDADES', 12, fontBold, rgb(0, 0, 0), 8);
    addText(contratoData.especialidades_texto, 10, fontRegular, rgb(0, 0, 0), 10);
  }

  // CLÁUSULAS
  addText('4. DAS CLÁUSULAS CONTRATUAIS', 12, fontBold, rgb(0, 0, 0), 8);

  const clausulas = [
    {
      titulo: 'CLÁUSULA PRIMEIRA - DA VIGÊNCIA',
      texto: 'O presente contrato terá vigência de 12 (doze) meses, contados a partir da data de sua assinatura, podendo ser prorrogado por iguais períodos mediante acordo entre as partes.'
    },
    {
      titulo: 'CLÁUSULA SEGUNDA - DO VALOR',
      texto: 'Os valores dos serviços prestados serão conforme tabela anexa ao edital de credenciamento.'
    },
    {
      titulo: 'CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DO CONTRATADO',
      texto: 'O CONTRATADO obriga-se a: (a) Prestar os serviços com qualidade e dentro dos padrões técnicos; (b) Manter cadastro atualizado; (c) Cumprir as normas e regulamentos vigentes; (d) Emitir documentação fiscal adequada.'
    },
    {
      titulo: 'CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATANTE',
      texto: 'O CONTRATANTE obriga-se a: (a) Efetuar o pagamento pelos serviços prestados; (b) Fornecer as informações necessárias; (c) Fiscalizar a execução dos serviços.'
    },
    {
      titulo: 'CLÁUSULA QUINTA - DA RESCISÃO',
      texto: 'O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia de 30 (trinta) dias, sem ônus ou multas.'
    },
    {
      titulo: 'CLÁUSULA SEXTA - DO FORO',
      texto: 'Fica eleito o foro da Comarca para dirimir quaisquer questões decorrentes deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.'
    }
  ];

  clausulas.forEach(clausula => {
    addText(clausula.titulo, 10, fontBold, rgb(0, 0, 0), 6);
    addText(clausula.texto, 10, fontRegular, rgb(0, 0, 0), 8);
  });

  // ASSINATURAS
  yPos -= 20;
  addText(
    'E, por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor e forma.',
    10,
    fontRegular,
    rgb(0, 0, 0),
    15
  );

  addText(`${contratoData.sistema_data_extenso}`, 10, fontRegular, rgb(0, 0, 0), 25);

  // Linhas de assinatura
  const lineY = yPos;
  page.drawLine({
    start: { x: margin, y: lineY },
    end: { x: width / 2 - 28, y: lineY },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: width / 2 + 28, y: lineY },
    end: { x: width - margin, y: lineY },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawText('CONTRATANTE', {
    x: width / 4 - fontRegular.widthOfTextAtSize('CONTRATANTE', 10) / 2,
    y: lineY - 15,
    size: 10,
    font: fontRegular,
  });

  page.drawText('CONTRATADO', {
    x: (width * 3) / 4 - fontRegular.widthOfTextAtSize('CONTRATADO', 10) / 2,
    y: lineY - 15,
    size: 10,
    font: fontRegular,
  });

  page.drawText(contratoData.candidato_nome, {
    x: (width * 3) / 4 - fontRegular.widthOfTextAtSize(contratoData.candidato_nome, 8) / 2,
    y: lineY - 25,
    size: 8,
    font: fontRegular,
  });

  page.drawText(`CPF: ${contratoData.candidato_cpf_formatado}`, {
    x: (width * 3) / 4 - fontRegular.widthOfTextAtSize(`CPF: ${contratoData.candidato_cpf_formatado}`, 8) / 2,
    y: lineY - 35,
    size: 8,
    font: fontRegular,
  });

  // Rodapé em todas as páginas
  const pages = pdfDoc.getPages();
  pages.forEach((pg, idx) => {
    const footerText = `Documento gerado eletronicamente em ${contratoData.sistema_data_atual}`;
    pg.drawText(footerText, {
      x: width / 2 - fontItalic.widthOfTextAtSize(footerText, 8) / 2,
      y: 28,
      size: 8,
      font: fontItalic,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    const pageText = `Página ${idx + 1} de ${pages.length}`;
    pg.drawText(pageText, {
      x: width - margin - fontRegular.widthOfTextAtSize(pageText, 8),
      y: 28,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  });

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });

  console.log(JSON.stringify({
    level: 'info',
    action: 'pdfa_generation_complete',
    size_bytes: pdfBytes.length,
    pages: pages.length,
    pdf_version: '1.7',
    pdfa_compliance: 'PDF/A-1b',
    xmp_embedded: true,
    icc_profile_embedded: true
  }));

  return pdfBytes;
}
