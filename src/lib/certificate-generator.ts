import jsPDF from "jspdf";

interface CertificateData {
  nome: string;
  cpfCnpj: string;
  especialidades: string;
  numeroCertificado: string;
  emitidoEm: string;
  validoAte: string;
  qrCodeDataUrl: string;
}

export async function generateCertificadoPDF(data: CertificateData): Promise<Blob> {
  // Criar PDF em landscape A4
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Borda decorativa (dupla)
  doc.setDrawColor(59, 130, 246); // blue-500
  doc.setLineWidth(2);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
  
  doc.setLineWidth(0.5);
  doc.rect(margin + 3, margin + 3, pageWidth - 2 * margin - 6, pageHeight - 2 * margin - 6);

  // Título principal
  doc.setFontSize(32);
  doc.setTextColor(59, 130, 246);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICADO DE CREDENCIAMENTO", pageWidth / 2, 40, { align: "center" });

  // Linha decorativa
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(margin + 40, 48, pageWidth - margin - 40, 48);

  // Corpo do certificado
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.setFont("helvetica", "normal");
  
  const startY = 65;
  const lineHeight = 12;
  let currentY = startY;

  doc.text("Certificamos que:", pageWidth / 2, currentY, { align: "center" });
  currentY += lineHeight;

  // Nome (destaque)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.nome, pageWidth / 2, currentY, { align: "center" });
  currentY += lineHeight + 3;

  // CPF/CNPJ
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`CPF/CNPJ: ${data.cpfCnpj}`, pageWidth / 2, currentY, { align: "center" });
  currentY += lineHeight;

  // Especialidades
  doc.setFontSize(12);
  doc.text("Especialidade(s):", pageWidth / 2, currentY, { align: "center" });
  currentY += 6;
  doc.setFont("helvetica", "bold");
  doc.text(data.especialidades, pageWidth / 2, currentY, { align: "center" });
  currentY += lineHeight + 5;

  // Texto de certificação
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Está devidamente credenciado(a) junto à nossa instituição,", pageWidth / 2, currentY, { align: "center" });
  currentY += 6;
  doc.text("com todos os requisitos necessários atendidos.", pageWidth / 2, currentY, { align: "center" });
  currentY += lineHeight;

  // Datas
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const emitidoEm = new Date(data.emitidoEm).toLocaleDateString("pt-BR");
  const validoAte = new Date(data.validoAte).toLocaleDateString("pt-BR");
  doc.text(`Emitido em: ${emitidoEm}`, pageWidth / 2, currentY, { align: "center" });
  currentY += 6;
  doc.text(`Válido até: ${validoAte}`, pageWidth / 2, currentY, { align: "center" });

  // QR Code (posição inferior direita)
  const qrSize = 40;
  const qrX = pageWidth - margin - qrSize - 10;
  const qrY = pageHeight - margin - qrSize - 10;
  
  doc.addImage(data.qrCodeDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
  
  // Texto abaixo do QR Code
  doc.setFontSize(8);
  doc.text("Verificar autenticidade", qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });

  // Número do certificado (rodapé)
  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246);
  doc.setFont("helvetica", "bold");
  doc.text(`Nº ${data.numeroCertificado}`, pageWidth / 2, pageHeight - margin - 5, { align: "center" });

  // Converter para Blob
  const pdfBlob = doc.output("blob");
  return pdfBlob;
}
