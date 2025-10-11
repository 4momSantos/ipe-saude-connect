import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import { calcularSimilaridadeLevenshtein, normalize } from '@/utils/compareOCRData';

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
    
    const inscricaoNorm = normalize(valorInscricao);
    const ocrNorm = normalize(valorOCR);
    
    if (inscricaoNorm === ocrNorm) return null;

    // Calcular similaridade usando algoritmo de Levenshtein
    const similaridade = calcularSimilaridadeLevenshtein(inscricaoNorm, ocrNorm);

    return {
      hasDiscrepancia: true,
      similaridade,
      severidade: similaridade > 80 ? 'baixa' : similaridade > 60 ? 'moderada' : 'alta'
    };
  };

  return (
    <div className="space-y-4">
      {campos.map((campo) => {
        const valorInscricao = getValorInscricao(campo.key);
        const valorOCR = getValorOCR(campo.docTipo, campo.ocrKey);
        const resultado = verificarDiscrepancia(valorInscricao, valorOCR);

        // Só mostrar se tiver pelo menos um valor
        if (!valorInscricao && !valorOCR) return null;

        const hasDiscrepancia = resultado?.hasDiscrepancia;
        const severidade = resultado?.severidade || 'baixa';

        return (
          <Card 
            key={campo.key}
            className={
              hasDiscrepancia 
                ? severidade === 'alta' 
                  ? 'border-red-500/50 bg-red-500/5' 
                  : severidade === 'moderada'
                  ? 'border-orange-500/50 bg-orange-500/5'
                  : 'border-yellow-500/50 bg-yellow-500/5'
                : ''
            }
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                {campo.label}
                {hasDiscrepancia ? (
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={severidade === 'alta' ? 'destructive' : 'secondary'}
                      className="gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {severidade === 'alta' ? 'Crítica' : severidade === 'moderada' ? 'Moderada' : 'Baixa'}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {resultado.similaridade.toFixed(0)}%
                    </Badge>
                  </div>
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
                  <p className={`font-mono text-sm font-medium ${
                    hasDiscrepancia 
                      ? severidade === 'alta'
                        ? 'text-red-600 dark:text-red-400'
                        : severidade === 'moderada'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                      : ''
                  }`}>
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
