import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Award,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCPF, formatCNPJ, formatPhone, formatCEP } from '@/utils/formatters';

interface ExtratoDadosPessoaisProps {
  credenciado: any;
  certificado?: {
    numero: string;
    dataEmissao: string;
    dataValidade: string;
    status: string;
  };
}

export function ExtratoDadosPessoais({ credenciado, certificado }: ExtratoDadosPessoaisProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Extrato de Dados Pessoais
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Identificação */}
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
            <User className="h-4 w-4" />
            Identificação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
              <p className="font-medium">{credenciado.nome}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo de Pessoa</label>
              <p className="font-medium">
                {credenciado.cpf ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </p>
            </div>
            {credenciado.cpf && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">CPF</label>
                <p className="font-medium font-mono">{formatCPF(credenciado.cpf)}</p>
              </div>
            )}
            {credenciado.cnpj && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">CNPJ</label>
                <p className="font-medium font-mono">{formatCNPJ(credenciado.cnpj)}</p>
              </div>
            )}
            {credenciado.numero_credenciado && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nº Credenciado</label>
                <p className="font-medium font-mono">{credenciado.numero_credenciado}</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Dados Profissionais */}
        {credenciado.crms?.length > 0 && (
          <>
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
                <Award className="h-4 w-4" />
                Dados Profissionais
              </h3>
              <div className="space-y-3">
                {credenciado.crms.map((crm: any, index: number) => (
                  <Card key={index} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Registro Profissional
                          </label>
                          <p className="font-medium font-mono">
                            {crm.crm}/{crm.uf_crm}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Especialidade
                          </label>
                          <Badge variant="outline">{crm.especialidade}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Contato */}
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
            <Phone className="h-4 w-4" />
            Contato
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {credenciado.email && (
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  E-mail
                </label>
                <p className="font-medium">{credenciado.email}</p>
              </div>
            )}
            {credenciado.telefone && (
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Telefone
                </label>
                <p className="font-medium font-mono">
                  {formatPhone(credenciado.telefone)}
                </p>
              </div>
            )}
            {credenciado.celular && (
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Celular
                </label>
                <p className="font-medium font-mono">
                  {formatPhone(credenciado.celular)}
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Endereço */}
        {(credenciado.endereco || credenciado.cidade) && (
          <>
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
                <MapPin className="h-4 w-4" />
                Endereço
              </h3>
              <div className="space-y-2">
                {credenciado.endereco && (
                  <p className="font-medium">{credenciado.endereco}</p>
                )}
                {credenciado.bairro && (
                  <p className="text-muted-foreground">{credenciado.bairro}</p>
                )}
                {credenciado.cidade && credenciado.estado && (
                  <p className="text-muted-foreground">
                    {credenciado.cidade} - {credenciado.estado}
                  </p>
                )}
                {credenciado.cep && (
                  <p className="font-mono text-sm">
                    CEP: {formatCEP(credenciado.cep)}
                  </p>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Informações do Credenciamento */}
        {certificado && (
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
              <Calendar className="h-4 w-4" />
              Informações do Credenciamento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Número do Certificado
                </label>
                <p className="font-medium font-mono">{certificado.numero}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <Badge 
                  variant={certificado.status === 'ativo' ? 'default' : 'destructive'}
                >
                  {certificado.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Data de Emissão
                </label>
                <p className="font-medium">
                  {format(new Date(certificado.dataEmissao), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Validade
                </label>
                <p className="font-medium">
                  {format(new Date(certificado.dataValidade), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Documentos Anexos */}
        {credenciado.documentos_credenciados?.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-3">
                <FileText className="h-4 w-4" />
                Documentos Anexos
              </h3>
              <div className="space-y-2">
                {credenciado.documentos_credenciados.map((doc: any) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <p className="font-medium text-sm">{doc.tipo_documento}</p>
                      {doc.numero_documento && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {doc.numero_documento}
                        </p>
                      )}
                    </div>
                    {doc.data_vencimento && (
                      <Badge variant="outline" className="text-xs">
                        Val: {format(new Date(doc.data_vencimento), 'dd/MM/yyyy')}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Rodapé */}
        <div className="text-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Este extrato contém informações cadastrais do credenciado.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
