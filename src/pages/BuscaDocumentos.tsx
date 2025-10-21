import { BuscarCredenciadosDocumentos } from "@/components/documentos/BuscarCredenciadosDocumentos";

export default function BuscaDocumentosPage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Busca Inteligente de Documentos</h1>
        <p className="text-muted-foreground">
          Pesquise por nome, CPF, CNPJ, tipo de documento, número, arquivo, observações ou até conteúdo OCR
        </p>
      </div>

      <BuscarCredenciadosDocumentos />
    </div>
  );
}
