import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, Loader2 } from 'lucide-react';
import { useDocumentReplace } from '@/hooks/useDocumentReplace';

interface InscricaoDocumento {
  id: string;
  tipo_documento: string;
  versao: number;
  observacoes: string | null;
}

interface DocumentoRejeitadoCardProps {
  documento: InscricaoDocumento;
  inscricaoId: string;
  onReenviar: () => void;
}

export function DocumentoRejeitadoCard({ 
  documento, 
  inscricaoId, 
  onReenviar 
}: DocumentoRejeitadoCardProps) {
  const { replaceDocument, isReplacing } = useDocumentReplace(inscricaoId);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (file: File) => {
    setUploading(true);
    try {
      await replaceDocument({
        currentDocId: documento.id,
        newFile: file,
        tipo_documento: documento.tipo_documento
      });
      onReenviar();
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{documento.tipo_documento}</CardTitle>
            <CardDescription>Versão {documento.versao}</CardDescription>
          </div>
          <Badge variant="destructive">Rejeitado</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Motivo da rejeição */}
        {documento.observacoes && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Motivo:</strong> {documento.observacoes}
            </AlertDescription>
          </Alert>
        )}

        {/* Botão de upload */}
        <Label htmlFor={`reenviar-${documento.id}`}>
          <div className="border-2 border-dashed rounded-lg p-6 hover:bg-accent cursor-pointer transition-colors">
            {uploading || isReplacing ? (
              <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                Processando...
              </div>
            ) : (
              <div className="flex items-center justify-center text-muted-foreground">
                <Upload className="mr-2 h-5 w-5" />
                Clique para reenviar documento
              </div>
            )}
          </div>
        </Label>
        <Input
          id={`reenviar-${documento.id}`}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChange(file);
          }}
          disabled={uploading || isReplacing}
        />
      </CardContent>
    </Card>
  );
}
