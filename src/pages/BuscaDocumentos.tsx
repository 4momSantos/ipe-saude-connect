import { BuscaDocumentos } from "@/components/documentos/BuscaDocumentos";

export default function BuscaDocumentosPage() {
  return (
    <div className="container mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Busca de Documentos</h1>
        <p className="text-muted-foreground">
          Pesquise por nome, tipo, conteúdo ou credenciado usando busca inteligente
        </p>
      </div>

      <BuscaDocumentos />
    </div>
  );
}
