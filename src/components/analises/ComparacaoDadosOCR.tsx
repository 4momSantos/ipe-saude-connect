import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ComparacaoDadosOCRProps {
  dadosInscricao: any;
  documentos: any[];
}

export function ComparacaoDadosOCR({ dadosInscricao, documentos }: ComparacaoDadosOCRProps) {
  const campos = [
    { label: 'Nome Completo', key: 'nome_completo', docTipo: 'rg', ocrKey: 'nome' },
    { label: 'CPF', key: 'cpf', docTipo: 'cpf', ocrKey: 'cpf' },
    { label: 'RG', key: 'rg', docTipo: 'rg', ocrKey: 'rg' },
    { label: 'Data de Nascimento', key: 'data_nascimento', docTipo: 'rg', ocrKey: 'data_nascimento' },
    { label: 'CRM', key: 'numero_conselho', docTipo: 'identidade_medica', ocrKey: 'numero_registro' },
    { label: 'CNPJ', key: 'cnpj', docTipo: 'cnpj', ocrKey: 'cnpj' },
  ];

  const getValorInscricao = (key: string) => {
    // Tentar em dados_pessoais primeiro
    if (dadosInscricao?.dados_pessoais?.[key]) {
      return dadosInscricao.dados_pessoais[key];
    }
    // Depois em pessoa_juridica
    if (dadosInscricao?.pessoa_juridica?.[key]) {
      return dadosInscricao.pessoa_juridica[key];
    }
    return null;
  };

  const getValorOCR = (docTipo: string, ocrKey: string) => {
    const doc = documentos.find(d => d.tipo_documento === docTipo);
    if (!doc?.ocr_resultado) return null;
    
    // Tentar diferentes variações de chave
    return doc.ocr_resultado[ocrKey] || 
           doc.ocr_resultado[ocrKey.replace(/_/g, '')] ||
           null;
  };

  const verificarDiscrepancia = (valorInscricao: any, valorOCR: any) => {
    if (!valorOCR || !valorInscricao) return null;
    
    // Normalizar valores (remover caracteres especiais e espaços)
    const inscricaoStr = String(valorInscricao).toLowerCase().replace(/[^\w]/g, '');
    const ocrStr = String(valorOCR).toLowerCase().replace(/[^\w]/g, '');
    
    return inscricaoStr !== ocrStr;
  };

  return (
    <div className="space-y-4">
      {campos.map((campo) => {
        const valorInscricao = getValorInscricao(campo.key);
        const valorOCR = getValorOCR(campo.docTipo, campo.ocrKey);
        const hasDiscrepancia = verificarDiscrepancia(valorInscricao, valorOCR);

        // Só mostrar se tiver pelo menos um valor
        if (!valorInscricao && !valorOCR) return null;

        return (
          <Card 
            key={campo.key}
            className={hasDiscrepancia ? 'border-orange-500/50 bg-orange-500/5' : ''}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                {campo.label}
                {hasDiscrepancia ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Divergência
                  </Badge>
                ) : valorOCR ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    OK
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Valor da Inscrição */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Informado pelo Candidato</p>
                  <p className="font-mono text-sm font-medium">
                    {valorInscricao || <span className="text-muted-foreground">Não informado</span>}
                  </p>
                </div>

                {/* Valor do OCR */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Extraído do Documento</p>
                  <p className={`font-mono text-sm font-medium ${hasDiscrepancia ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                    {valorOCR || <span className="text-muted-foreground">OCR não processado</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
