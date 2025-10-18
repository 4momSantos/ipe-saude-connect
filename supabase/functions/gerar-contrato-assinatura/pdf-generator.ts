/**
 * Gerador de PDF de Contratos usando jsPDF puro
 * Version: 2025-10-18-v3-jspdf-only
 * Sem dependências externas problemáticas
 */
import jsPDF from "https://esm.sh/jspdf@2.5.1";

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

function formatCPF(cpf: string): string {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Gera PDF do contrato diretamente usando jsPDF puro
 * @returns Promise<Uint8Array> - PDF pronto para upload
 */
export async function gerarContratoPDFDireto(contratoData: ContratoData): Promise<Uint8Array> {
  console.log(JSON.stringify({
    level: 'info',
    action: 'jspdf_generation_start_v3',
    library: 'jsPDF',
    version: '2.5.1',
    timestamp: new Date().toISOString(),
    inscricao_id: contratoData.inscricao_id
  }));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
    precision: 2
  });

  // Adicionar metadados PDF/A para compatibilidade com Assinafy
  doc.setProperties({
    title: 'Contrato de Credenciamento',
    subject: 'Credenciamento de Prestador de Serviços de Saúde',
    author: 'Sistema de Gestão de Credenciamentos',
    keywords: 'contrato, credenciamento, saúde, assinatura digital',
    creator: 'Supabase Edge Functions - jsPDF v2.5.1',
    producer: 'jsPDF + Lovable Cloud PDF Generator',
    creationDate: new Date()
  });

  // Definir encoding UTF-8 explícito
  doc.setFont('helvetica', 'normal');
  doc.setLanguage('pt-BR');

  console.log(JSON.stringify({
    level: 'info',
    action: 'pdf_metadata_added',
    title: 'Contrato de Credenciamento',
    producer: 'jsPDF + Lovable Cloud',
    creation_date: new Date().toISOString(),
    pdf_version: '1.3',
    target_standard: 'PDF/A-1b simulation'
  }));

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Função auxiliar para adicionar texto com quebra de linha
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false, addSpacing: number = 6) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    
    // Verificar se precisa de nova página
    if (yPos + (lines.length * 5) > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.text(lines, margin, yPos);
    yPos += lines.length * 5 + addSpacing;
  };

  // Função auxiliar para adicionar título de seção
  const addSectionTitle = (title: string) => {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 8;
  };

  // Função auxiliar para adicionar tabela simples
  const addSimpleTable = (headers: string[], rows: string[][], startY: number) => {
    const colWidth = contentWidth / headers.length;
    let currentY = startY;
    
    // Verificar espaço
    if (currentY + (rows.length * 8) > pageHeight - 30) {
      doc.addPage();
      currentY = margin;
    }
    
    // Cabeçalho
    doc.setFillColor(99, 102, 241);
    doc.rect(margin, currentY, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    headers.forEach((header, i) => {
      doc.text(header, margin + (i * colWidth) + 2, currentY + 6);
    });
    currentY += 8;
    
    // Linhas
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    rows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, currentY, contentWidth, 7, 'F');
      }
      
      row.forEach((cell, i) => {
        doc.text(cell, margin + (i * colWidth) + 2, currentY + 5);
      });
      currentY += 7;
    });
    
    return currentY + 5;
  };

  // ===== CABEÇALHO =====
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE CREDENCIAMENTO', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Edital: ${contratoData.edital_numero}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text(`Data: ${contratoData.sistema_data_extenso}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // ===== SEÇÃO 1: PARTES CONTRATANTES =====
  addSectionTitle('1. DAS PARTES');
  
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATANTE:', margin, yPos);
  yPos += 6;

  addText(
    '[Nome da Instituição], pessoa jurídica de direito público, inscrita no CNPJ sob nº [CNPJ], com sede na [Endereço], neste ato representada por [Representante Legal].',
    10,
    false,
    8
  );

  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATADO:', margin, yPos);
  yPos += 6;

  // Dados variáveis conforme tipo de credenciamento
  if (contratoData.tipo_credenciamento === 'PF') {
    addText(
      `${contratoData.candidato_nome}, CPF ${contratoData.candidato_cpf_formatado}, RG ${contratoData.candidato_rg || 'não informado'}, residente em ${contratoData.candidato_endereco_completo}, e-mail ${contratoData.candidato_email}, telefone ${contratoData.candidato_telefone || contratoData.candidato_celular}.`,
      10,
      false,
      10
    );
  } else {
    addText(
      `${contratoData.candidato_nome}, CNPJ ${contratoData.candidato_cpf_formatado}, com sede em ${contratoData.candidato_endereco_completo}, e-mail ${contratoData.candidato_email}, telefone ${contratoData.candidato_telefone || contratoData.candidato_celular}.`,
      10,
      false,
      6
    );
    
    if (contratoData.candidato_cpf) {
      addText(
        `Representada legalmente por seu responsável portador do CPF ${formatCPF(contratoData.candidato_cpf)}.`,
        10,
        false,
        10
      );
    }
  }

  // ===== SEÇÃO 2: OBJETO DO CONTRATO =====
  addSectionTitle('2. DO OBJETO');
  
  addText(
    `O presente contrato tem por objeto o credenciamento do CONTRATADO para prestação de serviços de saúde, conforme especificado no ${contratoData.edital_numero}, publicado em ${contratoData.edital_data_publicacao_formatada}.`,
    10,
    false,
    8
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Objeto do Edital:', margin, yPos);
  yPos += 6;

  addText(contratoData.edital_objeto, 10, false, 10);

  // ===== SEÇÃO 3: DOS CONSULTÓRIOS (para PJ) =====
  if (contratoData.tipo_credenciamento === 'PJ' && contratoData.consultorios.length > 0) {
    addSectionTitle('3. DOS CONSULTÓRIOS CREDENCIADOS');
    
    contratoData.consultorios.forEach((consultorio, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`Consultório ${idx + 1}${consultorio.is_principal ? ' (Principal)' : ''}:`, margin, yPos);
      yPos += 6;
      
      addText(`Nome: ${consultorio.nome}`, 10, false, 2);
      addText(`CNES: ${consultorio.cnes}`, 10, false, 2);
      addText(`Endereço: ${consultorio.endereco_completo}`, 10, false, 2);
      addText(`Telefone: ${consultorio.telefone}`, 10, false, 2);
      
      if (consultorio.especialidades.length > 0) {
        addText(`Especialidades: ${consultorio.especialidades.join(', ')}`, 10, false, 8);
      }
    });
  }

  // ===== SEÇÃO 4 ou 5: ESPECIALIDADES (para PF) =====
  if (contratoData.tipo_credenciamento === 'PF' && contratoData.especialidades && contratoData.especialidades.length > 0) {
    const secaoNumero = contratoData.consultorios.length > 0 ? '4' : '3';
    addSectionTitle(`${secaoNumero}. DAS ESPECIALIDADES`);
    addText('O CONTRATADO prestará serviços nas seguintes especialidades:', 10, false, 8);

    const tableData = contratoData.especialidades.map((esp, idx) => [
      `${idx + 1}`,
      esp
    ]);

    yPos = addSimpleTable(['#', 'Especialidade'], tableData, yPos);
  }

  // ===== SEÇÃO 4: CLÁUSULAS CONTRATUAIS =====
  addSectionTitle('4. DAS OBRIGAÇÕES');

  const clausulas = [
    {
      titulo: 'CLÁUSULA PRIMEIRA - DA VIGÊNCIA',
      texto: 'O presente contrato terá vigência de 12 (doze) meses, contados a partir da data de sua assinatura, podendo ser prorrogado por iguais períodos mediante acordo entre as partes.'
    },
    {
      titulo: 'CLÁUSULA SEGUNDA - DO VALOR',
      texto: 'Os valores dos serviços prestados serão conforme tabela anexa, conforme especificado no edital de credenciamento.'
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
      texto: 'Fica eleito o foro da Comarca [Local] para dirimir quaisquer questões decorrentes deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.'
    }
  ];

  for (const clausula of clausulas) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(clausula.titulo, margin, yPos);
    yPos += 6;

    addText(clausula.texto, 10, false, 8);
  }

  // ===== ASSINATURAS =====
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }

  yPos += 20;

  addText(
    'E, por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor e forma.',
    10,
    false,
    15
  );

  doc.text(`[Local], ${contratoData.sistema_data_extenso}`, margin, yPos);
  yPos += 25;

  // Linha de assinatura do contratante
  doc.line(margin, yPos, pageWidth / 2 - 10, yPos);
  doc.setFontSize(10);
  doc.text('CONTRATANTE', pageWidth / 4, yPos + 5, { align: 'center' });

  // Linha de assinatura do contratado
  doc.line(pageWidth / 2 + 10, yPos, pageWidth - margin, yPos);
  doc.text('CONTRATADO', (pageWidth / 4) * 3, yPos + 5, { align: 'center' });
  yPos += 10;

  doc.setFontSize(8);
  doc.text(contratoData.candidato_nome, (pageWidth / 4) * 3, yPos + 5, { align: 'center' });
  doc.text(`CPF: ${contratoData.candidato_cpf_formatado}`, (pageWidth / 4) * 3, yPos + 10, { align: 'center' });

  // ===== RODAPÉ COM METADATA =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Documento gerado eletronicamente em ${contratoData.sistema_data_atual}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  // Gerar PDF como Uint8Array
  const pdfBytes = doc.output('arraybuffer');
  const uint8Array = new Uint8Array(pdfBytes);

  console.log(JSON.stringify({
    level: 'info',
    action: 'pdf_generation_complete',
    size_bytes: uint8Array.length,
    pages: totalPages,
    has_metadata: true,
    compression_enabled: true,
    target_standard: 'PDF/A-1b simulation'
  }));

  return uint8Array;
}
