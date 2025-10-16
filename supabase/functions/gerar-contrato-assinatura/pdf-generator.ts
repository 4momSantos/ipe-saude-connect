/**
 * Gerador de PDF de Contratos usando jsPDF
 * Substitui a geração HTML + Paged.js por PDF nativo
 */
import jsPDF from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";

interface ContratoData {
  inscricao_id: string;
  candidato_nome: string;
  candidato_cpf: string;
  candidato_cpf_formatado: string;
  candidato_rg: string;
  candidato_email: string;
  candidato_telefone: string;
  candidato_celular: string;
  candidato_endereco_completo: string;
  candidato_data_nascimento: string;
  candidato_data_nascimento_formatada: string;
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
 * Gera PDF do contrato diretamente usando jsPDF
 * @returns Promise<Uint8Array> - PDF pronto para upload
 */
export async function gerarContratoPDFDireto(contratoData: ContratoData): Promise<Uint8Array> {
  console.log(JSON.stringify({
    level: 'info',
    action: 'pdf_generation_start',
    inscricao_id: contratoData.inscricao_id
  }));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

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
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. DAS PARTES', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATANTE:', margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  const contratanteText = `[Nome da Instituição], pessoa jurídica de direito público, inscrita no CNPJ sob nº [CNPJ], com sede na [Endereço], neste ato representada por [Representante Legal].`;
  const contratanteLines = doc.splitTextToSize(contratanteText, contentWidth);
  doc.text(contratanteLines, margin, yPos);
  yPos += contratanteLines.length * 5 + 8;

  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATADO:', margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  const contratadoText = `${contratoData.candidato_nome}, CPF ${contratoData.candidato_cpf_formatado}, RG ${contratoData.candidato_rg || 'não informado'}, residente em ${contratoData.candidato_endereco_completo}, e-mail ${contratoData.candidato_email}, telefone ${contratoData.candidato_telefone || contratoData.candidato_celular}.`;
  const contratadoLines = doc.splitTextToSize(contratadoText, contentWidth);
  doc.text(contratadoLines, margin, yPos);
  yPos += contratadoLines.length * 5 + 10;

  // Verifica se precisa de nova página
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = margin;
  }

  // ===== SEÇÃO 2: OBJETO DO CONTRATO =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. DO OBJETO', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const objetoText = `O presente contrato tem por objeto o credenciamento do CONTRATADO para prestação de serviços de saúde, conforme especificado no ${contratoData.edital_numero}, publicado em ${contratoData.edital_data_publicacao_formatada}.`;
  const objetoLines = doc.splitTextToSize(objetoText, contentWidth);
  doc.text(objetoLines, margin, yPos);
  yPos += objetoLines.length * 5 + 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Objeto do Edital:', margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  const editalObjetoLines = doc.splitTextToSize(contratoData.edital_objeto, contentWidth);
  doc.text(editalObjetoLines, margin, yPos);
  yPos += editalObjetoLines.length * 5 + 10;

  // Verifica se precisa de nova página
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  // ===== SEÇÃO 3: ESPECIALIDADES =====
  if (contratoData.especialidades && contratoData.especialidades.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. DAS ESPECIALIDADES', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('O CONTRATADO prestará serviços nas seguintes especialidades:', margin, yPos);
    yPos += 8;

    // Tabela de especialidades com autotable
    const especialidadesData = contratoData.especialidades.map((esp, idx) => [
      `${idx + 1}`,
      esp
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [['#', 'Especialidade']],
      body: especialidadesData,
      theme: 'striped',
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Verifica se precisa de nova página
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = margin;
  }

  // ===== SEÇÃO 4: CLÁUSULAS CONTRATUAIS =====
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('4. DAS OBRIGAÇÕES', margin, yPos);
  yPos += 8;

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
    // Verifica se precisa de nova página antes de cada cláusula
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(clausula.titulo, margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    const clausulaLines = doc.splitTextToSize(clausula.texto, contentWidth);
    doc.text(clausulaLines, margin, yPos);
    yPos += clausulaLines.length * 5 + 8;
  }

  // ===== ASSINATURAS =====
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }

  yPos += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('E, por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor e forma.', margin, yPos);
  yPos += 15;

  doc.text(`[Local], ${contratoData.sistema_data_extenso}`, margin, yPos);
  yPos += 25;

  // Linha de assinatura do contratante
  doc.line(margin, yPos, pageWidth / 2 - 10, yPos);
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
    action: 'pdf_generated',
    size_bytes: uint8Array.length,
    pages: totalPages
  }));

  return uint8Array;
}
