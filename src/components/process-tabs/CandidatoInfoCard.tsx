import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, MapPin, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { formatCPF, formatCNPJ, formatPhone } from "@/utils/formatters";
import { extrairNomeCompleto } from "@/utils/normalizeDadosInscricao";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CandidatoInfoCardProps {
  dadosInscricao: any;
  collapsible?: boolean;
  showCounts?: {
    documentos?: number;
    mensagensNaoLidas?: number;
  };
}

export function CandidatoInfoCard({ 
  dadosInscricao, 
  collapsible = true,
  showCounts 
}: CandidatoInfoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!dadosInscricao) {
    return null;
  }

  const nomeCompleto = extrairNomeCompleto(dadosInscricao);
  const cpfCnpj = dadosInscricao.dadosPessoais?.cpf || 
                  dadosInscricao.dados_pessoais?.cpf ||
                  dadosInscricao.pessoaJuridica?.cnpj ||
                  dadosInscricao.pessoa_juridica?.cnpj;
  
  const email = dadosInscricao.dadosPessoais?.email || 
                dadosInscricao.dados_pessoais?.email ||
                dadosInscricao.enderecoCorrespondencia?.email ||
                dadosInscricao.endereco_correspondencia?.email;
  
  const telefone = dadosInscricao.dadosPessoais?.telefone || 
                   dadosInscricao.dados_pessoais?.telefone ||
                   dadosInscricao.dadosPessoais?.celular ||
                   dadosInscricao.dados_pessoais?.celular ||
                   dadosInscricao.enderecoCorrespondencia?.telefone ||
                   dadosInscricao.endereco_correspondencia?.telefone;
  
  const endereco = dadosInscricao.enderecoCorrespondencia || 
                   dadosInscricao.endereco_correspondencia;
  
  const enderecoTexto = endereco ? 
    `${endereco.logradouro || endereco.cep || ''}, ${endereco.numero || 'S/N'} - ${endereco.cidade || ''}/${endereco.uf || ''}` :
    'Não informado';

  const tipoPessoa = cpfCnpj?.length === 11 ? 'CPF' : cpfCnpj?.length === 14 ? 'CNPJ' : 'Documento';
  const documentoFormatado = cpfCnpj?.length === 11 ? formatCPF(cpfCnpj) :
                             cpfCnpj?.length === 14 ? formatCNPJ(cpfCnpj) :
                             cpfCnpj || 'Não informado';

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5 sticky top-0 z-10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{nomeCompleto}</h3>
                <p className="text-xs text-muted-foreground">
                  {tipoPessoa}: {documentoFormatado}
                </p>
              </div>
            </div>

            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                {email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{email}</span>
                  </div>
                )}
                {telefone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{formatPhone(telefone)}</span>
                  </div>
                )}
                {endereco && (
                  <div className="flex items-start gap-2 text-sm md:col-span-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{enderecoTexto}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showCounts?.documentos !== undefined && (
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                {showCounts.documentos}
              </Badge>
            )}
            {showCounts?.mensagensNaoLidas !== undefined && showCounts.mensagensNaoLidas > 0 && (
              <Badge variant="destructive" className="gap-1">
                {showCounts.mensagensNaoLidas}
              </Badge>
            )}
            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
