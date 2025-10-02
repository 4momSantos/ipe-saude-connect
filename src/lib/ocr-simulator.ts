// OCR simulation for document validation

export type DocumentType = "identity" | "address_proof" | "certificate" | "other";

export interface OCRResult {
  success: boolean;
  confidence: number;
  extractedData?: {
    documentType: DocumentType;
    name?: string;
    documentNumber?: string;
    issueDate?: string;
    expirationDate?: string;
    address?: string;
  };
  warnings?: string[];
  errors?: string[];
}

export const simulateOCR = async (file: File): Promise<OCRResult> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const fileName = file.name.toLowerCase();
  const confidence = Math.random() * 30 + 70; // 70-100%
  
  // Simulate different document types based on filename
  let documentType: DocumentType = "other";
  if (fileName.includes("rg") || fileName.includes("cpf") || fileName.includes("identidade")) {
    documentType = "identity";
  } else if (fileName.includes("comprovante") || fileName.includes("endereco")) {
    documentType = "address_proof";
  } else if (fileName.includes("certid") || fileName.includes("certificado")) {
    documentType = "certificate";
  }
  
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Simulate validation warnings
  if (confidence < 80) {
    warnings.push("Qualidade da imagem pode estar baixa");
  }
  
  if (file.size > 5 * 1024 * 1024) {
    warnings.push("Arquivo muito grande, considere comprimir");
  }
  
  // Simulate random issues
  const hasIssue = Math.random() > 0.7;
  if (hasIssue) {
    const issues = [
      "Documento pode estar vencido",
      "Imagem parcialmente ilegível",
      "Formato não padrão detectado"
    ];
    warnings.push(issues[Math.floor(Math.random() * issues.length)]);
  }
  
  // Generate mock extracted data
  const mockData = {
    documentType,
    name: "João Silva Santos",
    documentNumber: documentType === "identity" ? "123.456.789-00" : undefined,
    issueDate: "01/01/2020",
    expirationDate: documentType === "identity" ? "01/01/2030" : undefined,
    address: documentType === "address_proof" ? "Rua das Flores, 123" : undefined,
  };
  
  return {
    success: true,
    confidence: Math.round(confidence),
    extractedData: mockData,
    warnings: warnings.length > 0 ? warnings : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
};

export const checkDocumentExpiration = (expirationDate: string): {
  isExpired: boolean;
  daysUntilExpiration?: number;
  warning?: string;
} => {
  const [day, month, year] = expirationDate.split("/").map(Number);
  const expDate = new Date(year, month - 1, day);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      isExpired: true,
      warning: "Documento vencido"
    };
  }
  
  if (diffDays <= 30) {
    return {
      isExpired: false,
      daysUntilExpiration: diffDays,
      warning: `Documento vence em ${diffDays} dias`
    };
  }
  
  return {
    isExpired: false,
    daysUntilExpiration: diffDays
  };
};
