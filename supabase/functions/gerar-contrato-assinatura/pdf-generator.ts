/**
 * Gerador de PDF de Contratos - Modelo Oficial IPE Saúde
 * Baseado nos Anexos VI (Pessoa Física) e VII (Pessoa Jurídica)
 */
import jsPDF from "https://esm.sh/jspdf@2.5.1";

export interface ContratoData {
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
  // Novos campos para adequação ao modelo oficial
  candidato_crm?: string;
  candidato_uf_crm?: string;
  proa_habilitacao?: string;
  consultorios: Array<{
    nome: string;
    cnes: string;
    endereco_completo: string;
    telefone: string;
    especialidades: string[];
    is_principal: boolean;
    municipios_atendimento?: string[];
    exames_realizados?: string[];
    hospitais_vinculados?: string[];
    tempo_agendamento_consulta?: string;
    quantidade_consultas_minima?: number;
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

function formatCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Gera PDF do contrato no modelo oficial IPE Saúde
 */
export async function gerarContratoPDFDireto(contratoData: ContratoData): Promise<Uint8Array> {
  console.log(JSON.stringify({
    level: 'info',
    action: 'pdf_generation_start',
    inscricao_id: contratoData.inscricao_id,
    tipo: contratoData.tipo_credenciamento
  }));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
    precision: 2
  });

  doc.setProperties({
    title: `Contrato de Credenciamento - ${contratoData.candidato_nome}`,
    subject: 'Contrato de Credenciamento de Prestador de Serviços de Saúde',
    author: 'IPE Saúde - Instituto de Assistência à Saúde dos Servidores Públicos',
    keywords: 'contrato, credenciamento, saúde, IPE Saúde',
    creator: 'Sistema de Gestão de Credenciamentos IPE Saúde',
    producer: 'jsPDF + Lovable Cloud PDF Generator',
    creationDate: new Date()
  });

  doc.setFont('helvetica', 'normal');
  doc.setLanguage('pt-BR');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Função auxiliar para adicionar texto com quebra de linha
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false, addSpacing: number = 5, align: 'left' | 'center' | 'justify' = 'justify') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    
    if (yPos + (lines.length * 4.5) > pageHeight - 25) {
      doc.addPage();
      yPos = margin;
    }
    
    if (align === 'center') {
      doc.text(lines, pageWidth / 2, yPos, { align: 'center' });
    } else {
      doc.text(lines, margin, yPos, { maxWidth: contentWidth, align: align });
    }
    yPos += lines.length * 4.5 + addSpacing;
  };

  // Função para adicionar cláusula
  const addClausula = (numero: string, titulo: string, texto: string) => {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`CLÁUSULA ${numero} - ${titulo}`, margin, yPos);
    yPos += 6;
    
    addText(texto, 10, false, 8, 'justify');
  };

  // Função para adicionar subcláusula
  const addSubClausula = (numero: string, texto: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const fullText = `${numero} ${texto}`;
    const lines = doc.splitTextToSize(fullText, contentWidth - 5);
    doc.text(lines, margin + 5, yPos, { maxWidth: contentWidth - 5 });
    yPos += lines.length * 4.5 + 3;
  };

  // ===== CABEÇALHO OFICIAL =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SAÚDE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Instituto de Assistência à Saúde dos Servidores Públicos do Estado do Rio Grande do Sul', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Título do contrato
  const tipoTexto = contratoData.tipo_credenciamento === 'PF' ? 'PESSOA FÍSICA' : 'PESSOA JURÍDICA';
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`ANEXO ${contratoData.tipo_credenciamento === 'PF' ? 'VI' : 'VII'} – MINUTA DO CONTRATO DE CREDENCIAMENTO`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text(`(${tipoTexto})`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // PROA (se disponível)
  if (contratoData.proa_habilitacao) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`PROA DE HABILITAÇÃO: ${contratoData.proa_habilitacao}`, margin, yPos);
    yPos += 8;
  }

  // ===== PREÂMBULO =====
  const preambulo = contratoData.tipo_credenciamento === 'PF' 
    ? `O INSTITUTO DE ASSISTÊNCIA À SAÚDE DOS SERVIDORES PÚBLICOS DO ESTADO DO RIO GRANDE DO SUL – IPE SAÚDE, inscrito no CNPJ sob o nº 04.444.372/0001-07, com sede na Avenida Borges de Medeiros nº 1945, bairro Praia de Belas, em Porto Alegre-RS, doravante denominado simplesmente CONTRATANTE, neste ato representado por seu Diretor Presidente, e ${contratoData.candidato_nome}, inscrito(a) no CPF sob o nº ${contratoData.candidato_cpf_formatado}${contratoData.candidato_crm ? `, CRM/${contratoData.candidato_uf_crm || 'RS'} nº ${contratoData.candidato_crm}` : ''}, residente e domiciliado(a) em ${contratoData.candidato_endereco_completo}, doravante denominado simplesmente CONTRATADO(A), celebram o presente CONTRATO DE CREDENCIAMENTO, vinculado ao ${contratoData.edital_numero}, mediante as cláusulas e condições a seguir:`
    : `O INSTITUTO DE ASSISTÊNCIA À SAÚDE DOS SERVIDORES PÚBLICOS DO ESTADO DO RIO GRANDE DO SUL – IPE SAÚDE, inscrito no CNPJ sob o nº 04.444.372/0001-07, com sede na Avenida Borges de Medeiros nº 1945, bairro Praia de Belas, em Porto Alegre-RS, doravante denominado simplesmente CONTRATANTE, neste ato representado por seu Diretor Presidente, e ${contratoData.candidato_nome}, inscrita no CNPJ sob o nº ${contratoData.candidato_cpf_formatado}, com sede em ${contratoData.candidato_endereco_completo}, doravante denominada simplesmente CONTRATADA, celebram o presente CONTRATO DE CREDENCIAMENTO, vinculado ao ${contratoData.edital_numero}, mediante as cláusulas e condições a seguir:`;

  addText(preambulo, 10, false, 10, 'justify');

  // ===== CLÁUSULA PRIMEIRA - DO OBJETO =====
  addClausula('PRIMEIRA', 'DO OBJETO',
    `O presente contrato tem por objeto o credenciamento ${contratoData.tipo_credenciamento === 'PF' ? 'do(a) CONTRATADO(A)' : 'da CONTRATADA'} para prestação de serviços de saúde aos beneficiários do IPE SAÚDE, conforme especificações constantes do ${contratoData.edital_numero} e seus anexos, que passam a integrar este instrumento independentemente de transcrição.`
  );

  // ===== CLÁUSULA SEGUNDA - DOS SERVIÇOS =====
  const especialidadesLista = contratoData.especialidades.length > 0 
    ? contratoData.especialidades.join(', ')
    : 'Conforme habilitação';
  
  addClausula('SEGUNDA', 'DOS SERVIÇOS',
    `${contratoData.tipo_credenciamento === 'PF' ? 'O(A) CONTRATADO(A)' : 'A CONTRATADA'} prestará os serviços nas seguintes especialidades/áreas: ${especialidadesLista}.`
  );

  // Adicionar detalhes dos consultórios se PJ
  if (contratoData.tipo_credenciamento === 'PJ' && contratoData.consultorios.length > 0) {
    addText('Parágrafo Único. Os serviços serão prestados nos seguintes estabelecimentos:', 10, false, 4, 'justify');
    
    contratoData.consultorios.forEach((consultorio, idx) => {
      const detalhes = [
        `${idx + 1}. ${consultorio.nome}`,
        `   CNES: ${consultorio.cnes}`,
        `   Endereço: ${consultorio.endereco_completo}`,
        `   Especialidades: ${consultorio.especialidades.join(', ')}`
      ];
      
      if (consultorio.municipios_atendimento && consultorio.municipios_atendimento.length > 0) {
        detalhes.push(`   Municípios de Atendimento: ${consultorio.municipios_atendimento.join(', ')}`);
      }
      
      detalhes.forEach(linha => {
        doc.setFontSize(9);
        doc.text(linha, margin + 5, yPos);
        yPos += 4;
      });
      yPos += 2;
    });
  }

  // ===== CLÁUSULA TERCEIRA - DA VIGÊNCIA =====
  addClausula('TERCEIRA', 'DA VIGÊNCIA',
    'O presente contrato terá vigência de 12 (doze) meses, contados a partir da data de sua assinatura, podendo ser prorrogado por iguais e sucessivos períodos, até o limite máximo de 60 (sessenta) meses, mediante termo aditivo, desde que haja interesse das partes e observadas as disposições legais aplicáveis.'
  );

  // ===== CLÁUSULA QUARTA - DOS VALORES =====
  addClausula('QUARTA', 'DOS VALORES E FORMA DE PAGAMENTO',
    `Os serviços prestados serão remunerados de acordo com a Tabela de Honorários do IPE SAÚDE vigente à época da prestação. O pagamento será efetuado até o 30º (trigésimo) dia útil do mês subsequente à prestação dos serviços, mediante apresentação de fatura acompanhada dos documentos comprobatórios exigidos.`
  );

  // ===== CLÁUSULA QUINTA - DAS OBRIGAÇÕES DO CONTRATADO =====
  addClausula('QUINTA', `DAS OBRIGAÇÕES ${contratoData.tipo_credenciamento === 'PF' ? 'DO(A) CONTRATADO(A)' : 'DA CONTRATADA'}`, 
    `${contratoData.tipo_credenciamento === 'PF' ? 'O(A) CONTRATADO(A)' : 'A CONTRATADA'} obriga-se a:`
  );

  const obrigacoesContratado = [
    'Prestar os serviços com qualidade técnica, utilizando equipamentos e materiais adequados;',
    'Manter cadastro atualizado junto ao IPE SAÚDE, comunicando imediatamente qualquer alteração;',
    'Atender os beneficiários com urbanidade, respeito e dignidade;',
    'Emitir documentação fiscal em conformidade com a legislação vigente;',
    'Cumprir as normas técnicas e éticas aplicáveis à sua área de atuação;',
    'Manter sigilo sobre informações dos beneficiários atendidos;',
    'Não exigir depósitos, caução ou pagamentos antecipados dos beneficiários;',
    'Garantir o atendimento aos beneficiários nos prazos estabelecidos pelo IPE SAÚDE;'
  ];

  obrigacoesContratado.forEach((obrigacao, idx) => {
    addSubClausula(`5.${idx + 1}`, obrigacao);
  });

  // ===== CLÁUSULA SEXTA - DAS OBRIGAÇÕES DO CONTRATANTE =====
  addClausula('SEXTA', 'DAS OBRIGAÇÕES DO CONTRATANTE',
    'O CONTRATANTE obriga-se a:'
  );

  const obrigacoesContratante = [
    'Efetuar o pagamento pelos serviços prestados nos prazos estabelecidos;',
    'Fornecer as informações necessárias à execução dos serviços;',
    'Fiscalizar a execução dos serviços contratados;',
    'Disponibilizar os sistemas necessários para autorização e faturamento;',
    'Comunicar previamente eventuais alterações nas tabelas de valores e procedimentos;'
  ];

  obrigacoesContratante.forEach((obrigacao, idx) => {
    addSubClausula(`6.${idx + 1}`, obrigacao);
  });

  // ===== CLÁUSULA SÉTIMA - DA FISCALIZAÇÃO =====
  addClausula('SÉTIMA', 'DA FISCALIZAÇÃO',
    `O IPE SAÚDE, por meio de seus prepostos, exercerá a fiscalização dos serviços prestados, podendo, a qualquer tempo, realizar auditorias e solicitar informações ${contratoData.tipo_credenciamento === 'PF' ? 'ao(à) CONTRATADO(A)' : 'à CONTRATADA'}, que deverá atendê-las no prazo estabelecido.`
  );

  // ===== CLÁUSULA OITAVA - DAS PENALIDADES =====
  addClausula('OITAVA', 'DAS PENALIDADES',
    `O descumprimento das obrigações previstas neste contrato sujeitará ${contratoData.tipo_credenciamento === 'PF' ? 'o(a) CONTRATADO(A)' : 'a CONTRATADA'} às seguintes penalidades, sem prejuízo das sanções legais cabíveis: advertência; suspensão temporária do credenciamento; descredenciamento.`
  );

  // ===== CLÁUSULA NONA - DA RESCISÃO =====
  addClausula('NONA', 'DA RESCISÃO',
    'O presente contrato poderá ser rescindido: a) por mútuo acordo entre as partes; b) unilateralmente pelo CONTRATANTE, em caso de descumprimento de cláusula contratual; c) por qualquer das partes, mediante notificação prévia de 60 (sessenta) dias, sem ônus ou multas.'
  );

  // ===== CLÁUSULA DÉCIMA - DA ALTERAÇÃO CONTRATUAL =====
  addClausula('DÉCIMA', 'DA ALTERAÇÃO CONTRATUAL',
    'O presente contrato poderá ser alterado mediante termo aditivo, desde que haja concordância das partes e observadas as disposições legais e regulamentares aplicáveis.'
  );

  // ===== CLÁUSULA DÉCIMA PRIMEIRA - DAS DISPOSIÇÕES GERAIS =====
  addClausula('DÉCIMA PRIMEIRA', 'DAS DISPOSIÇÕES GERAIS',
    `${contratoData.tipo_credenciamento === 'PF' ? 'O(A) CONTRATADO(A)' : 'A CONTRATADA'} declara, sob as penas da lei, que as informações prestadas são verdadeiras e que se compromete a cumprir fielmente todas as condições estabelecidas neste contrato e no edital de credenciamento.`
  );

  // ===== CLÁUSULA DÉCIMA SEGUNDA - DO FORO =====
  addClausula('DÉCIMA SEGUNDA', 'DO FORO',
    'Fica eleito o Foro da Comarca de Porto Alegre/RS para dirimir quaisquer questões decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.'
  );

  // ===== FECHAMENTO =====
  yPos += 5;
  addText(`E, por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo.`, 10, false, 10, 'justify');

  addText(`Porto Alegre/RS, ${contratoData.sistema_data_extenso}.`, 10, false, 20, 'left');

  // ===== ASSINATURAS =====
  if (yPos > pageHeight - 70) {
    doc.addPage();
    yPos = margin;
  }

  // Linha CONTRATANTE
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPos, pageWidth / 2 - 15, yPos);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('IPE SAÚDE - CONTRATANTE', margin + (pageWidth / 4 - 15) / 2, yPos + 5, { align: 'center' });
  
  // Linha CONTRATADO
  doc.line(pageWidth / 2 + 15, yPos, pageWidth - margin, yPos);
  doc.text(contratoData.tipo_credenciamento === 'PF' ? 'CONTRATADO(A)' : 'CONTRATADA', pageWidth / 2 + 15 + (pageWidth / 4 - 15) / 2, yPos + 5, { align: 'center' });
  
  yPos += 12;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(contratoData.candidato_nome, pageWidth / 2 + 15 + (pageWidth / 4 - 15) / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text(`${contratoData.candidato_documento_tipo}: ${contratoData.candidato_cpf_formatado}`, pageWidth / 2 + 15 + (pageWidth / 4 - 15) / 2, yPos, { align: 'center' });

  // ===== NOVA PÁGINA: ANEXO =====
  doc.addPage();
  yPos = margin;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ANEXO AO CONTRATO DE CREDENCIAMENTO', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.text('DADOS DO CREDENCIAMENTO', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Tabela de dados
  const dadosAnexo = [
    ['Nome/Razão Social:', contratoData.candidato_nome],
    [contratoData.candidato_documento_tipo + ':', contratoData.candidato_cpf_formatado],
  ];

  if (contratoData.candidato_crm) {
    dadosAnexo.push(['CRM:', `${contratoData.candidato_crm}/${contratoData.candidato_uf_crm || 'RS'}`]);
  }

  dadosAnexo.push(
    ['E-mail:', contratoData.candidato_email],
    ['Telefone:', contratoData.candidato_telefone || contratoData.candidato_celular || 'Não informado'],
    ['Endereço:', contratoData.candidato_endereco_completo],
    ['Especialidade(s):', contratoData.especialidades_texto || 'Não especificada']
  );

  dadosAnexo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    const valueLines = doc.splitTextToSize(value, contentWidth - 50);
    doc.text(valueLines, margin + 45, yPos);
    yPos += valueLines.length * 4 + 2;
  });

  yPos += 10;

  // Tabela de Serviços Credenciados
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVIÇOS CREDENCIADOS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Cabeçalho da tabela
  const colWidths = [60, 35, 75];
  doc.setFillColor(59, 130, 246);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ESPECIALIDADE/ÁREA', margin + 2, yPos + 5);
  doc.text('MUNICÍPIO', margin + colWidths[0] + 2, yPos + 5);
  doc.text('CONDIÇÕES', margin + colWidths[0] + colWidths[1] + 2, yPos + 5);
  yPos += 7;

  // Linhas da tabela
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (contratoData.consultorios.length > 0) {
    contratoData.consultorios.forEach((consultorio, idx) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, contentWidth, 6, 'F');
      }

      const especialidade = consultorio.especialidades.join(', ') || 'Não especificada';
      const municipios = consultorio.municipios_atendimento?.join(', ') || 'A definir';
      const condicoes = [];
      
      if (consultorio.quantidade_consultas_minima) {
        condicoes.push(`Mín. ${consultorio.quantidade_consultas_minima} consultas/mês`);
      }
      if (consultorio.tempo_agendamento_consulta) {
        condicoes.push(`Prazo: ${consultorio.tempo_agendamento_consulta}`);
      }

      doc.text(especialidade.substring(0, 30), margin + 2, yPos + 4);
      doc.text(municipios.substring(0, 18), margin + colWidths[0] + 2, yPos + 4);
      doc.text(condicoes.join(', ').substring(0, 40) || '-', margin + colWidths[0] + colWidths[1] + 2, yPos + 4);
      yPos += 6;
    });
  } else {
    // Linha única com especialidades gerais
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, contentWidth, 6, 'F');
    doc.text(contratoData.especialidades_texto.substring(0, 30) || 'Conforme habilitação', margin + 2, yPos + 4);
    doc.text('A definir', margin + colWidths[0] + 2, yPos + 4);
    doc.text('-', margin + colWidths[0] + colWidths[1] + 2, yPos + 4);
    yPos += 6;
  }

  // Exames realizados (se houver)
  const todosExames = contratoData.consultorios.flatMap(c => c.exames_realizados || []);
  if (todosExames.length > 0) {
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('EXAMES/SADTs REALIZADOS:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    addText(todosExames.join(', '), 9, false, 5, 'left');
  }

  // Hospitais vinculados (se houver)
  const todosHospitais = contratoData.consultorios.flatMap(c => c.hospitais_vinculados || []);
  if (todosHospitais.length > 0) {
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('HOSPITAIS VINCULADOS:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    addText(todosHospitais.join(', '), 9, false, 5, 'left');
  }

  // ===== RODAPÉ COM METADATA =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Documento gerado eletronicamente em ${contratoData.sistema_data_atual} | ${contratoData.edital_numero}`,
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

  const pdfBytes = doc.output('arraybuffer');
  const uint8Array = new Uint8Array(pdfBytes);

  console.log(JSON.stringify({
    level: 'info',
    action: 'pdf_generation_complete',
    size_bytes: uint8Array.length,
    pages: totalPages,
    tipo: contratoData.tipo_credenciamento,
    has_anexo: true
  }));

  return uint8Array;
}
