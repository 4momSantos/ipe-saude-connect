import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileEdit, FileText, CheckCircle, XCircle, Clock, Download } from 'lucide-react';

interface SolicitacaoCardProps {
  solicitacao: {
    tipo: 'campo' | 'documento';
    campo?: string;
    valorAtual?: string;
    valorNovo?: string;
    documentoId?: string;
    documentoNome?: string;
    novoArquivoUrl?: string;
    novoArquivoNome?: string;
    justificativa: string;
    status?: 'pendente' | 'aprovada' | 'rejeitada';
    aprovadoPor?: string;
    aprovadoEm?: string;
    motivoRejeicao?: string;
  };
  ehAnalista: boolean;
  onAprovar?: () => void;
  onRejeitar?: () => void;
}

const CAMPO_LABELS: Record<string, string> = {
  nome: 'Nome',
  email: 'Email',
  telefone: 'Telefone',
  celular: 'Celular',
  endereco: 'Endereço',
  cidade: 'Cidade',
  estado: 'Estado',
  cep: 'CEP',
  cpf: 'CPF',
  cnpj: 'CNPJ',
  rg: 'RG',
};

export function SolicitacaoCard({
  solicitacao,
  ehAnalista,
  onAprovar,
  onRejeitar
}: SolicitacaoCardProps) {
  const status = solicitacao.status || 'pendente';

  return (
    <Card className="p-4 border-l-4 border-l-orange-500 bg-orange-50/50">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {solicitacao.tipo === 'campo' ? (
              <FileEdit className="w-5 h-5 text-orange-600" />
            ) : (
              <FileText className="w-5 h-5 text-orange-600" />
            )}
            <div>
              <h4 className="font-semibold text-foreground">
                {solicitacao.tipo === 'campo' 
                  ? 'Solicitação de Alteração de Campo' 
                  : 'Solicitação de Substituição de Documento'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {solicitacao.tipo === 'campo' 
                  ? `Campo: ${CAMPO_LABELS[solicitacao.campo || ''] || solicitacao.campo}`
                  : `Documento: ${solicitacao.documentoNome}`}
              </p>
            </div>
          </div>

          {/* Badge de status */}
          <Badge
            variant={
              status === 'aprovada' ? 'default' : 
              status === 'rejeitada' ? 'destructive' : 
              'secondary'
            }
            className={
              status === 'aprovada' 
                ? 'bg-green-100 text-green-800 border-green-300'
                : status === 'rejeitada'
                ? 'bg-red-100 text-red-800 border-red-300'
                : 'bg-yellow-100 text-yellow-800 border-yellow-300'
            }
          >
            {status === 'aprovada' && <CheckCircle className="w-3 h-3 mr-1" />}
            {status === 'rejeitada' && <XCircle className="w-3 h-3 mr-1" />}
            {status === 'pendente' && <Clock className="w-3 h-3 mr-1" />}
            {status === 'aprovada' ? 'Aprovada' : status === 'rejeitada' ? 'Rejeitada' : 'Pendente'}
          </Badge>
        </div>

        {/* Dados da solicitação */}
        <div className="space-y-3 bg-background rounded-lg p-3">
          {solicitacao.tipo === 'campo' ? (
            <>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Valor Atual:</span>
                <p className="text-foreground">{solicitacao.valorAtual || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Novo Valor:</span>
                <p className="text-foreground font-medium">{solicitacao.valorNovo}</p>
              </div>
            </>
          ) : (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Novo Arquivo:</span>
              <div className="flex items-center gap-2 mt-1">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{solicitacao.novoArquivoNome}</span>
                {solicitacao.novoArquivoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={solicitacao.novoArquivoUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          <div>
            <span className="text-sm font-medium text-muted-foreground">Justificativa:</span>
            <p className="text-foreground mt-1 italic">{solicitacao.justificativa}</p>
          </div>
        </div>

        {/* Status info */}
        {status !== 'pendente' && (
          <div className="text-sm text-muted-foreground">
            {status === 'aprovada' && solicitacao.aprovadoPor && (
              <p>Aprovado por {solicitacao.aprovadoPor} em {solicitacao.aprovadoEm}</p>
            )}
            {status === 'rejeitada' && (
              <>
                <p>Rejeitado por {solicitacao.aprovadoPor} em {solicitacao.aprovadoEm}</p>
                {solicitacao.motivoRejeicao && (
                  <p className="mt-1">Motivo: {solicitacao.motivoRejeicao}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Ações para analista */}
        {ehAnalista && status === 'pendente' && onAprovar && onRejeitar && (
          <div className="flex gap-3 pt-2 border-t">
            <Button
              onClick={onAprovar}
              size="sm"
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
            <Button
              onClick={onRejeitar}
              size="sm"
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
