import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export async function exportToPDF(data: any[], title: string) {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.setTextColor(59, 130, 246); // blue-500
  doc.text(title, 14, 20);

  // Data de geração
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);

  // Extrair colunas e dados
  const columns = Object.keys(data[0] || {});
  const rows = data.map((item) => columns.map((col) => item[col]));

  // Tabela
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 35,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246], // blue-500
      textColor: 255,
      fontSize: 11,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    margin: { top: 35 },
  });

  // Salvar
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export async function exportToExcel(data: any[], title: string) {
  // Criar workbook e worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Estilização básica (largura das colunas)
  const cols = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
  ws["!cols"] = cols;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");

  // Salvar
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}.xlsx`);
}

export async function exportToCSV(data: any[], title: string) {
  // Criar CSV
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);

  // Criar blob e download
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${title.replace(/\s+/g, "_")}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
