// Document generation utilities

export interface ProviderData {
  name: string;
  cpfCnpj: string;
  specialty: string;
  email: string;
  phone: string;
  cep: string;
  credentialNumber?: string;
}

export const generateCredentialCertificate = (data: ProviderData): string => {
  const certificateNumber = data.credentialNumber || `CRED-${Date.now()}`;
  const currentDate = new Date().toLocaleDateString("pt-BR");
  
  return `
CERTIFICADO DE CREDENCIAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Certificado Nº: ${certificateNumber}
Data de Emissão: ${currentDate}

Certificamos que:

${data.name.toUpperCase()}
CPF/CNPJ: ${data.cpfCnpj}

Foi devidamente credenciado(a) junto ao IPE Saúde como prestador(a) 
de serviços na especialidade de ${data.specialty}.

Este credenciamento está sujeito ao cumprimento das normas e 
regulamentos vigentes do IPE Saúde.

Contato: ${data.email} | ${data.phone}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este documento possui validade legal e foi gerado eletronicamente.
  `.trim();
};

export const generateDigitalContract = (data: ProviderData): string => {
  const contractNumber = `CONT-${Date.now()}`;
  const currentDate = new Date().toLocaleDateString("pt-BR");
  
  return `
CONTRATO DIGITAL DE PRESTAÇÃO DE SERVIÇOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contrato Nº: ${contractNumber}
Data: ${currentDate}

CONTRATANTE: IPE Saúde
CNPJ: 00.000.000/0001-00

CONTRATADO(A): ${data.name}
CPF/CNPJ: ${data.cpfCnpj}
Especialidade: ${data.specialty}

CLÁUSULA PRIMEIRA - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de saúde
na área de ${data.specialty} aos beneficiários do IPE Saúde.

CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES
O(A) contratado(a) se obriga a:
- Prestar atendimento de qualidade aos beneficiários;
- Manter seus dados cadastrais atualizados;
- Cumprir as normas técnicas e éticas da profissão;
- Respeitar os valores de honorários estabelecidos.

CLÁUSULA TERCEIRA - DA VIGÊNCIA
Este contrato terá vigência a partir da data de assinatura, 
por prazo indeterminado.

CLÁUSULA QUARTA - DO FORO
Fica eleito o foro da Comarca de [Cidade/UF] para dirimir 
quaisquer questões oriundas deste contrato.

Contato: ${data.email} | ${data.phone}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Documento gerado eletronicamente em ${currentDate}.
Assinatura eletrônica válida.
  `.trim();
};

export const downloadDocument = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
