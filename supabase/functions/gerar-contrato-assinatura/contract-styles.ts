// CSS consolidado para contratos de credenciamento
// Inclui todos os estilos do editor TipTap para garantir formatação correta

export const CONTRACT_STYLES = `
  /* Reset e estilos base */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  @page {
    size: A4;
    margin: 2.5cm 3cm;
  }

  body {
    font-family: 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #202124;
    max-width: 21cm;
    margin: 0 auto;
    padding: 2.5cm 3cm;
    background: white;
  }

  .document-container {
    width: 100%;
  }

  /* Tipografia */
  p {
    margin-bottom: 11pt;
    text-align: justify;
  }

  h1 {
    font-size: 18pt;
    font-weight: bold;
    text-align: center;
    margin: 20pt 0;
    text-transform: uppercase;
  }

  h2 {
    font-size: 14pt;
    font-weight: bold;
    margin-top: 16pt;
    margin-bottom: 10pt;
  }

  h3 {
    font-size: 12pt;
    font-weight: bold;
    margin-top: 12pt;
    margin-bottom: 8pt;
  }

  /* Formatação de texto */
  strong {
    font-weight: bold;
  }

  em {
    font-style: italic;
  }

  u {
    text-decoration: underline;
  }

  /* Alinhamentos */
  .text-center,
  [style*="text-align: center"] {
    text-align: center !important;
  }

  .text-right,
  [style*="text-align: right"] {
    text-align: right !important;
  }

  .text-left,
  [style*="text-align: left"] {
    text-align: left !important;
  }

  .text-justify,
  [style*="text-align: justify"] {
    text-align: justify !important;
  }

  /* Listas ordenadas (numeração hierárquica) */
  ol {
    counter-reset: item;
    list-style: none;
    padding-left: 0;
    margin: 12pt 0;
  }

  ol > li {
    counter-increment: item;
    margin-bottom: 8px;
    padding-left: 40px;
    position: relative;
  }

  /* Nível 1: 1., 2., 3. */
  ol[data-level="1"] > li::before {
    content: counter(item) ".";
    font-weight: 600;
    position: absolute;
    left: 0;
    width: 35px;
    text-align: right;
    padding-right: 8px;
  }

  /* Nível 2: 1.1, 1.2, 1.3 */
  ol[data-level="2"] > li::before {
    content: counter(item, decimal) "." counter(item, decimal);
    font-weight: 500;
    position: absolute;
    left: 0;
    width: 35px;
    text-align: right;
    padding-right: 8px;
  }

  /* Nível 3: 1.1.1, 1.1.2 */
  ol[data-level="3"] > li::before {
    content: counter(item, decimal) "." counter(item, decimal) "." counter(item, decimal);
    font-size: 0.95em;
    position: absolute;
    left: 0;
    width: 35px;
    text-align: right;
    padding-right: 8px;
  }

  /* Formato Legal: CLÁUSULA PRIMEIRA */
  ol[data-format="legal"] > li::before {
    content: "CLÁUSULA " counter(item, upper-roman);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.9em;
    letter-spacing: 0.5px;
  }

  /* Formato Alfabético: a), b), c) */
  ol[data-format="alpha"] > li::before {
    content: counter(item, lower-alpha) ")";
  }

  /* Indentação visual por nível */
  .hierarchical-list-level-1 { 
    margin-left: 0; 
  }
  
  .hierarchical-list-level-2 { 
    margin-left: 30px; 
  }
  
  .hierarchical-list-level-3 { 
    margin-left: 60px; 
  }
  
  .hierarchical-list-level-4 { 
    margin-left: 90px; 
  }
  
  .hierarchical-list-level-5 { 
    margin-left: 120px; 
  }
  
  .hierarchical-list-level-6 { 
    margin-left: 150px; 
  }

  /* Listas não ordenadas */
  ul {
    list-style-type: disc;
    margin: 12pt 0;
    padding-left: 40px;
  }

  ul > li {
    margin-bottom: 6px;
  }

  /* Subcláusulas jurídicas */
  .legal-subclause {
    border-left: 3px solid #6366f1;
    padding-left: 16px;
    margin-left: 20px;
    margin-top: 8px;
    margin-bottom: 12px;
  }

  /* Cláusulas */
  .clausula {
    margin-top: 20pt;
    margin-bottom: 15pt;
  }

  .clausula-titulo {
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 8pt;
  }

  /* Tabelas */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16pt 0;
    font-size: 11pt;
  }

  table th,
  table td {
    border: 1px solid #333;
    padding: 8px;
    text-align: left;
  }

  table th {
    background-color: #f3f4f6;
    font-weight: bold;
  }

  table tr:nth-child(even) {
    background-color: #f9fafb;
  }

  /* Quebras de página */
  .page-break {
    page-break-after: always;
    break-after: page;
    margin: 0;
    padding: 0;
    height: 0;
    border: none;
  }

  .page-break hr {
    display: none;
  }

  /* Assinaturas */
  .assinatura {
    margin-top: 60pt;
    text-align: center;
  }

  .linha-assinatura {
    border-top: 1px solid #333;
    width: 300px;
    margin: 40pt auto 8pt;
  }

  .nome-assinante {
    font-weight: bold;
    margin-bottom: 4pt;
  }

  .info-assinante {
    font-size: 10pt;
    color: #666;
  }

  /* Cabeçalho e rodapé */
  .header {
    text-align: center;
    margin-bottom: 30pt;
  }

  .footer {
    margin-top: 40pt;
    font-size: 10pt;
    color: #666;
    text-align: center;
  }

  /* Blockquote */
  blockquote {
    border-left: 4px solid #d1d5db;
    padding-left: 16px;
    margin: 16pt 0;
    font-style: italic;
    color: #4b5563;
  }

  /* Code blocks */
  pre {
    background-color: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 12px;
    margin: 16pt 0;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    overflow-x: auto;
  }

  code {
    background-color: #f3f4f6;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
  }

  pre code {
    background-color: transparent;
    padding: 0;
  }

  /* Links */
  a {
    color: #2563eb;
    text-decoration: underline;
  }

  a:visited {
    color: #7c3aed;
  }

  /* Imagens */
  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 16pt auto;
  }

  /* Horizontal rule */
  hr {
    border: none;
    border-top: 1px solid #d1d5db;
    margin: 20pt 0;
  }

  /* Media queries para impressão */
  @media print {
    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    a {
      color: #000;
      text-decoration: none;
    }

    /* Evitar quebras de página indesejadas */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
      break-after: avoid;
    }

    p, li {
      orphans: 3;
      widows: 3;
    }

    table {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }

  /* Estilos do Prose (compatibilidade com TipTap) */
  .prose {
    max-width: none;
  }

  .prose-sm {
    font-size: 11pt;
  }

  .prose-lg {
    font-size: 13pt;
  }

  /* Task lists */
  ul[data-type="taskList"] {
    list-style: none;
    padding-left: 0;
  }

  li[data-type="taskItem"] {
    display: flex;
    align-items: flex-start;
    margin-bottom: 6px;
  }

  li[data-type="taskItem"] > label {
    flex: 0 0 auto;
    margin-right: 8px;
  }

  li[data-type="taskItem"] > div {
    flex: 1 1 auto;
  }

  /* Highlights */
  mark {
    background-color: #fef08a;
    padding: 2px 0;
  }

  /* Subscript e Superscript */
  sub {
    font-size: 0.75em;
    vertical-align: sub;
  }

  sup {
    font-size: 0.75em;
    vertical-align: super;
  }

  /* Espaçamento adicional para legibilidade */
  .spacing-comfortable {
    line-height: 1.8;
  }

  .spacing-compact {
    line-height: 1.4;
  }

  /* Classes utilitárias */
  .text-uppercase {
    text-transform: uppercase;
  }

  .text-lowercase {
    text-transform: lowercase;
  }

  .text-capitalize {
    text-transform: capitalize;
  }

  .font-bold {
    font-weight: bold;
  }

  .font-normal {
    font-weight: normal;
  }

  .font-italic {
    font-style: italic;
  }
`;
