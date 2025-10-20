import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class DataExporter {
  
  // 📊 EXPORT PARA EXCEL
  static exportarParaExcel(dados: any[], nomeArquivo: string, nomePlanilha: string = 'Dados') {
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, nomePlanilha);
    
    // Ajustar largura das colunas
    const maxWidth = dados.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        const value = row[key]?.toString() || '';
        acc[key] = Math.max(acc[key] || 10, value.length + 2);
      });
      return acc;
    }, {} as Record<string, number>);
    
    worksheet['!cols'] = Object.values(maxWidth).map((w: number) => ({ wch: Math.min(w, 50) }));
    
    XLSX.writeFile(workbook, `${nomeArquivo}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
    
    console.log('📥 Download Excel:', nomeArquivo);
  }

  // 📄 EXPORT PARA PDF
  static exportarParaPDF(
    dados: any[],
    colunas: { header: string; dataKey: string }[],
    titulo: string,
    nomeArquivo: string
  ) {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text(titulo, 14, 22);
    
    // Subtítulo com data
    doc.setFontSize(11);
    doc.text(
      `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      14,
      32
    );
    
    // Tabela
    autoTable(doc, {
      startY: 40,
      head: [colunas.map(c => c.header)],
      body: dados.map(row => colunas.map(col => row[col.dataKey] || '-')),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
    
    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`${nomeArquivo}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
    
    console.log('📥 Download PDF:', nomeArquivo);
  }

  // 📋 EXPORT PARA CSV
  static exportarParaCSV(dados: any[], nomeArquivo: string) {
    if (!dados || dados.length === 0) return;
    
    const headers = Object.keys(dados[0]);
    const csvContent = [
      headers.join(';'),
      ...dados.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(';') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(';')
      )
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${nomeArquivo}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.click();
    
    console.log('📥 Download CSV:', nomeArquivo);
  }

  // 📊 EXPORT DE GRÁFICO COMO IMAGEM
  static async exportarGraficoComoImagem(
    elementId: string,
    nomeArquivo: string
  ) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Elemento não encontrado:', elementId);
      return;
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${nomeArquivo}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.png`;
        link.click();
        
        console.log('📥 Download Imagem:', nomeArquivo);
      });
    } catch (error) {
      console.error('Erro ao exportar gráfico:', error);
    }
  }
}
