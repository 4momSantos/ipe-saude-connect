import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileX, FileCheck } from "lucide-react";
import type { DocumentoReprovado } from "@/types/decisao";
import type { InscricaoDocumento } from "@/hooks/useInscricaoDocumentos";

interface DocumentosReprovadosProps {
  documentos: InscricaoDocumento[];
  documentosReprovados: DocumentoReprovado[];
  onDocumentosChange: (docs: DocumentoReprovado[]) => void;
}

export function DocumentosReprovados({
  documentos,
  documentosReprovados,
  onDocumentosChange
}: DocumentosReprovadosProps) {
  const [docsSelecionados, setDocsSelecionados] = useState<Set<string>>(
    new Set(documentosReprovados.map(d => d.documento_id))
  );

  const toggleDocumento = (doc: InscricaoDocumento, checked: boolean) => {
    const newSet = new Set(docsSelecionados);
    
    if (checked) {
      newSet.add(doc.id);
      onDocumentosChange([
        ...documentosReprovados,
        {
          documento_id: doc.id,
          tipo_documento: doc.tipo_documento,
          motivo: "",
          acao_requerida: 'reenviar'
        }
      ]);
    } else {
      newSet.delete(doc.id);
      onDocumentosChange(
        documentosReprovados.filter(d => d.documento_id !== doc.id)
      );
    }
    
    setDocsSelecionados(newSet);
  };

  const updateDocumento = (docId: string, field: keyof DocumentoReprovado, value: any) => {
    onDocumentosChange(
      documentosReprovados.map(d => 
        d.documento_id === docId ? { ...d, [field]: value } : d
      )
    );
  };

  const getDocumentoReprovado = (docId: string) => {
    return documentosReprovados.find(d => d.documento_id === docId);
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Documentos com Problemas (Opcional)</Label>
      <p className="text-sm text-muted-foreground">
        Marque os documentos que precisam ser corrigidos ou reenviados
      </p>

      <div className="space-y-3">
        {documentos.map(doc => {
          const isSelected = docsSelecionados.has(doc.id);
          const docData = getDocumentoReprovado(doc.id);
          const isValidado = doc.status === 'validado';
          
          return (
            <div 
              key={doc.id} 
              className={`border rounded-lg p-4 space-y-3 ${
                isValidado ? 'bg-green-50 border-green-200' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={doc.id}
                  checked={isSelected}
                  onCheckedChange={(checked) => toggleDocumento(doc, checked as boolean)}
                  disabled={isValidado}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={doc.id}
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    {isValidado ? (
                      <FileCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <FileX className="h-4 w-4 text-orange-600" />
                    )}
                    {doc.tipo_documento}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {doc.arquivo_nome} • {isValidado ? 'Validado' : 'Pendente'}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="ml-9 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Ação Requerida</Label>
                    <RadioGroup
                      value={docData?.acao_requerida || 'reenviar'}
                      onValueChange={(v) => updateDocumento(doc.id, 'acao_requerida', v)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="reenviar" id={`${doc.id}-reenviar`} />
                        <Label htmlFor={`${doc.id}-reenviar`} className="text-sm font-normal cursor-pointer">
                          Reenviar documento completo
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="complementar" id={`${doc.id}-complementar`} />
                        <Label htmlFor={`${doc.id}-complementar`} className="text-sm font-normal cursor-pointer">
                          Complementar informações
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="corrigir" id={`${doc.id}-corrigir`} />
                        <Label htmlFor={`${doc.id}-corrigir`} className="text-sm font-normal cursor-pointer">
                          Corrigir dados/assinatura
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Textarea
                    placeholder="Descreva o problema com este documento..."
                    value={docData?.motivo || ''}
                    onChange={(e) => updateDocumento(doc.id, 'motivo', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {documentosReprovados.length > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>{documentosReprovados.length}</strong> documento(s) marcado(s) para correção
          </p>
        </div>
      )}
    </div>
  );
}
