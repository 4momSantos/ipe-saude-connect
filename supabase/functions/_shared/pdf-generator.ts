import jsPDF from 'https://esm.sh/jspdf@2.5.1';

export interface CertificadoData {
  numero_certificado: string;
  codigo_verificacao: string;
  credenciado_nome: string;
  credenciado_cpf_cnpj: string;
  status: string;
  emitido_em: string;
  valido_ate: string;
  hash_verificacao: string;
}

export async function gerarPDFCertificado(data: CertificadoData): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Bordas decorativas
  doc.setDrawColor(79, 70, 229); // primary color
  doc.setLineWidth(2);
  doc.rect(10, 10, 190, 277);
  doc.setLineWidth(0.5);
  doc.rect(15, 15, 180, 267);

  // Título
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('CERTIFICADO DE REGULARIDADE', 105, 40, { align: 'center' });

  // Subtítulo
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text('Sistema de Credenciamento de Profissionais', 105, 50, { align: 'center' });

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(30, 60, 180, 60);

  // Corpo do certificado
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  doc.text('Certificamos que:', 30, 80);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(data.credenciado_nome, 30, 92);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`CPF/CNPJ: ${data.credenciado_cpf_cnpj}`, 30, 102);

  doc.text('Encontra-se com status:', 30, 120);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94); // green for regular status
  doc.text(data.status.toUpperCase(), 30, 130);

  // Box de informações
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(249, 250, 251);
  doc.rect(30, 145, 150, 60, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('Número do Certificado:', 35, 155);
  doc.setFont('helvetica', 'bold');
  doc.text(data.numero_certificado, 35, 162);

  doc.setFont('helvetica', 'normal');
  doc.text('Código de Verificação:', 35, 175);
  doc.setFont('helvetica', 'bold');
  doc.text(data.codigo_verificacao, 35, 182);

  doc.setFont('helvetica', 'normal');
  doc.text('Emitido em:', 35, 195);
  doc.setFont('helvetica', 'bold');
  doc.text(data.emitido_em, 35, 202);

  // Adicionar nota de autenticidade
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Este certificado pode ser validado através do código de verificação', 105, 250, { align: 'center' });
  doc.text('em nosso portal de consulta pública.', 105, 257, { align: 'center' });

  // Hash de verificação (pequeno)
  doc.setFontSize(7);
  doc.text(`Hash: ${data.hash_verificacao.substring(0, 40)}...`, 105, 267, { align: 'center' });

  // Rodapé
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Válido até: ${data.valido_ate}`, 105, 275, { align: 'center' });

  return new Uint8Array(doc.output('arraybuffer'));
}
