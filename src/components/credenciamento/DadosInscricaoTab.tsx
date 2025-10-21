import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Building2, 
  MapPin, 
  Stethoscope,
  Clock,
  Phone,
  Mail,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Home,
  ClipboardList
} from "lucide-react";
import { 
  formatCPF, 
  formatCNPJ, 
  formatCEP, 
  formatPhone,
  formatDate 
} from "@/utils/formatters";

interface DadosInscricaoTabProps {
  dadosInscricao: any;
}

interface DataRowProps {
  label: string;
  value: string | undefined | null;
  icon?: React.ComponentType<{ className?: string }>;
}

function DataRow({ label, value, icon: Icon }: DataRowProps) {
  if (!value || value === '') return null;
  
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && (
        <div className="mt-1">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1">
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm mt-1">{value}</dd>
      </div>
    </div>
  );
}

export function DadosInscricaoTab({ dadosInscricao }: DadosInscricaoTabProps) {
  console.log('[DEBUG DadosInscricaoTab] dadosInscricao recebido:', dadosInscricao);

  if (!dadosInscricao) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum dado de inscrição disponível.</p>
        </CardContent>
      </Card>
    );
  }

  // ✅ Extrair seções do JSONB
  const dadosPessoais = dadosInscricao.dados_pessoais || {};
  const pessoaJuridica = dadosInscricao.pessoa_juridica || {};
  const enderecoCorrespondencia = dadosInscricao.endereco_correspondencia || {};
  const consultorio = dadosInscricao.consultorio || {};
  const documentos = dadosInscricao.documentos || [];
  
  console.log('[DEBUG] Dados extraídos:', { dadosPessoais, pessoaJuridica, enderecoCorrespondencia, consultorio, documentos });

  // Função para obter ícone do status do documento
  const getDocumentoIcon = (status: string) => {
    switch (status) {
      case 'enviado':
      case 'aprovado':
        return <CheckCircle2 className="w-4 h-4 text-[hsl(135,84%,15%)]" />;
      case 'rejeitado':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'faltante':
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Função para obter cor do badge do status
  const getDocumentoVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'enviado':
      case 'aprovado':
        return 'default';
      case 'rejeitado':
        return 'destructive';
      case 'faltante':
      default:
        return 'outline';
    }
  };

  // Tradução dos nomes dos documentos
  const traduzirTipoDocumento = (tipo: string): string => {
    const traducoes: Record<string, string> = {
      'ficha_cadastral': 'Ficha Cadastral',
      'contrato_social': 'Contrato Social',
      'identidade_medica': 'Identidade Médica (CRM)',
      'rg_cpf': 'RG/CPF',
      'cert_regularidade_pj': 'Certidão de Regularidade PJ',
      'registro_especialidade': 'Registro de Especialidade',
      'alvara_sanitario': 'Alvará Sanitário',
      'cnpj': 'CNPJ',
      'certidoes_negativas': 'Certidões Negativas',
      'cert_fgts': 'Certidão FGTS',
      'comp_bancario': 'Comprovante Bancário',
      'simples_nacional': 'Simples Nacional',
      'doc_exames': 'Documentação de Exames'
    };
    return traducoes[tipo] || tipo;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dados Pessoais */}
      {dadosPessoais && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Dados Pessoais</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1">
              <DataRow label="Nome Completo" value={dadosPessoais.nome_completo} icon={User} />
              <DataRow label="CPF" value={formatCPF(dadosPessoais.cpf)} icon={FileText} />
              <DataRow label="RG" value={dadosPessoais.rg} icon={FileText} />
              <DataRow 
                label="Data de Nascimento" 
                value={formatDate(dadosPessoais.data_nascimento)} 
                icon={Calendar} 
              />
              <DataRow label="E-mail" value={dadosPessoais.email} icon={Mail} />
              <DataRow label="Telefone" value={formatPhone(dadosPessoais.telefone)} icon={Phone} />
              <DataRow label="Celular" value={formatPhone(dadosPessoais.celular)} icon={Phone} />
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Pessoa Jurídica */}
      {pessoaJuridica && (pessoaJuridica.cnpj || pessoaJuridica.denominacao_social) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <CardTitle>Dados da Empresa</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1">
              <DataRow label="Razão Social" value={pessoaJuridica.denominacao_social} icon={Building2} />
              <DataRow label="Nome Fantasia" value={pessoaJuridica.nome_fantasia} icon={Building2} />
              <DataRow label="CNPJ" value={formatCNPJ(pessoaJuridica.cnpj)} icon={FileText} />
              <DataRow label="Inscrição Estadual" value={pessoaJuridica.inscricao_estadual} icon={FileText} />
              {pessoaJuridica.porte && (
                <div className="py-2">
                  <dt className="text-sm font-medium text-muted-foreground mb-2">Porte da Empresa</dt>
                  <dd>
                    <Badge variant="outline">{pessoaJuridica.porte}</Badge>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Endereço de Correspondência */}
      {enderecoCorrespondencia && Object.keys(enderecoCorrespondencia).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              <CardTitle>Endereço de Correspondência</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1">
              <DataRow 
                label="Logradouro" 
                value={enderecoCorrespondencia.logradouro ? `${enderecoCorrespondencia.logradouro}, ${enderecoCorrespondencia.numero || 'S/N'}` : null}
                icon={MapPin} 
              />
              <DataRow label="Complemento" value={enderecoCorrespondencia.complemento} />
              <DataRow label="Bairro" value={enderecoCorrespondencia.bairro} />
              <DataRow label="Cidade" value={enderecoCorrespondencia.cidade} icon={MapPin} />
              <DataRow label="Estado (UF)" value={enderecoCorrespondencia.uf} />
              <DataRow label="CEP" value={formatCEP(enderecoCorrespondencia.cep)} icon={FileText} />
              <Separator className="my-3" />
              <DataRow label="E-mail" value={enderecoCorrespondencia.email} icon={Mail} />
              <DataRow label="Telefone" value={formatPhone(enderecoCorrespondencia.telefone)} icon={Phone} />
              <DataRow label="Celular" value={formatPhone(enderecoCorrespondencia.celular)} icon={Phone} />
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Dados do Consultório */}
      {consultorio && Object.keys(consultorio).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              <CardTitle>Dados do Consultório</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1">
              {consultorio.endereco && (
                <DataRow 
                  label="Endereço do Consultório" 
                  value={consultorio.endereco} 
                  icon={MapPin} 
                />
              )}
              {consultorio.telefone && (
                <DataRow 
                  label="Telefone do Consultório" 
                  value={formatPhone(consultorio.telefone)} 
                  icon={Phone} 
                />
              )}
              {consultorio.quantidade_consultas_minima && (
                <DataRow 
                  label="Quantidade Mínima de Consultas" 
                  value={`${consultorio.quantidade_consultas_minima} consultas/mês`} 
                  icon={ClipboardList} 
                />
              )}
              {consultorio.atendimento_hora_marcada !== undefined && (
                <div className="py-2">
                  <dt className="text-sm font-medium text-muted-foreground mb-2">Atendimento por Hora Marcada</dt>
                  <dd>
                    <Badge variant={consultorio.atendimento_hora_marcada ? "default" : "outline"}>
                      {consultorio.atendimento_hora_marcada ? "Sim" : "Não"}
                    </Badge>
                  </dd>
                </div>
              )}
            </dl>

            {/* Horários de Atendimento */}
            {consultorio.horarios && consultorio.horarios.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Horários de Atendimento</h4>
                  </div>
                  <div className="space-y-2 ml-6">
                    {consultorio.horarios.map((horario: any, hIndex: number) => (
                      <div key={hIndex} className="flex items-center gap-3 text-sm">
                        <span className="font-medium text-muted-foreground min-w-[100px] capitalize">
                          {horario.dia_semana}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span>
                          {horario.horario_inicio} às {horario.horario_fim}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status dos Documentos */}
      {documentos && documentos.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle>Status dos Documentos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documentos.map((doc: any, index: number) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getDocumentoIcon(doc.status)}
                    <span className="text-sm font-medium">
                      {traduzirTipoDocumento(doc.tipo)}
                    </span>
                  </div>
                  <Badge variant={getDocumentoVariant(doc.status)} className="text-xs">
                    {doc.status === 'enviado' ? 'Enviado' : 
                     doc.status === 'aprovado' ? 'Aprovado' :
                     doc.status === 'rejeitado' ? 'Rejeitado' :
                     'Faltante'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações Adicionais do CRM */}
      {dadosPessoais.crm && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              <CardTitle>Registro Profissional</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1">
              <DataRow 
                label="Número do CRM" 
                value={dadosPessoais.crm} 
                icon={FileText} 
              />
              <DataRow 
                label="UF do CRM" 
                value={dadosPessoais.uf_crm} 
                icon={MapPin} 
              />
              {dadosPessoais.sexo && (
                <DataRow 
                  label="Sexo" 
                  value={dadosPessoais.sexo === 'M' ? 'Masculino' : dadosPessoais.sexo === 'F' ? 'Feminino' : dadosPessoais.sexo} 
                  icon={User} 
                />
              )}
              {dadosPessoais.orgao_emissor && (
                <DataRow 
                  label="Órgão Emissor RG" 
                  value={dadosPessoais.orgao_emissor} 
                  icon={FileText} 
                />
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Outras informações */}
      {consultorio && (consultorio.capacidadeAtendimento || consultorio.observacoes) && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1">
              {consultorio.capacidadeAtendimento && (
                <DataRow 
                  label="Capacidade de Atendimento" 
                  value={`${consultorio.capacidadeAtendimento} pacientes/dia`} 
                />
              )}
              {consultorio.observacoes && (
                <div className="py-2">
                  <dt className="text-sm font-medium text-muted-foreground mb-2">Observações do Consultório</dt>
                  <dd className="text-sm bg-muted p-3 rounded-lg">{consultorio.observacoes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
