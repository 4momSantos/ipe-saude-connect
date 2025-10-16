import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportData {
  credenciado_nome: string;
  entidade_nome: string;
  data_vencimento: string;
  status_atual: string;
  dias_para_vencer: number;
}

export function exportToCSV(data: ExportData[], filename: string) {
  const headers = ['Credenciado', 'Documento', 'Vencimento', 'Status', 'Dias Restantes'];
  const rows = data.map(d => [
    d.credenciado_nome,
    d.entidade_nome,
    format(new Date(d.data_vencimento), 'dd/MM/yyyy'),
    d.status_atual,
    d.dias_para_vencer?.toString() || 'N/A'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

export function exportToPDF(data: ExportData[], filename: string) {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(16);
  doc.text('Relatório de Documentos - Controle de Prazos', 14, 20);

  // Data de geração
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);

  // Tabela
  autoTable(doc, {
    head: [['Credenciado', 'Documento', 'Vencimento', 'Status', 'Dias Restantes']],
    body: data.map(d => [
      d.credenciado_nome,
      d.entidade_nome,
      format(new Date(d.data_vencimento), 'dd/MM/yyyy'),
      d.status_atual,
      d.dias_para_vencer?.toString() || 'N/A'
    ]),
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Rodapé
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`${filename}.pdf`);
}
