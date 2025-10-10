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
  Calendar
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

  const { dadosPessoais, pessoaJuridica, endereco, consultorio } = dadosInscricao;

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
              <DataRow label="Nome Completo" value={dadosPessoais.nome} icon={User} />
              <DataRow label="CPF" value={formatCPF(dadosPessoais.cpf)} icon={FileText} />
              <DataRow label="RG" value={dadosPessoais.rg} icon={FileText} />
              <DataRow 
                label="Data de Nascimento" 
                value={formatDate(dadosPessoais.dataNascimento)} 
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
      {pessoaJuridica && (pessoaJuridica.cnpj || pessoaJuridica.razaoSocial) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <CardTitle>Dados da Empresa</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1">
              <DataRow label="Razão Social" value={pessoaJuridica.razaoSocial} icon={Building2} />
              <DataRow label="Nome Fantasia" value={pessoaJuridica.nomeFantasia} icon={Building2} />
              <DataRow label="CNPJ" value={formatCNPJ(pessoaJuridica.cnpj)} icon={FileText} />
              <DataRow label="Inscrição Estadual" value={pessoaJuridica.inscricaoEstadual} icon={FileText} />
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

      {/* Endereço */}
      {endereco && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <CardTitle>Endereço</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1">
              <DataRow 
                label="Logradouro" 
                value={endereco.logradouro ? `${endereco.logradouro}, ${endereco.numero || 'S/N'}` : null}
                icon={MapPin} 
              />
              <DataRow label="Complemento" value={endereco.complemento} />
              <DataRow label="Bairro" value={endereco.bairro} />
              <DataRow label="Cidade" value={endereco.cidade} icon={MapPin} />
              <DataRow label="Estado" value={endereco.estado} />
              <DataRow label="CEP" value={formatCEP(endereco.cep)} icon={FileText} />
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Consultório e Especialidades */}
      {consultorio?.crms && consultorio.crms.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              <CardTitle>Especialidades e Horários</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {consultorio.crms.map((crm: any, index: number) => (
              <div key={index}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Stethoscope className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="font-mono">
                          CRM {crm.crm}/{crm.uf}
                        </Badge>
                        <Badge variant="outline">{crm.especialidade}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Horários de Atendimento */}
                  {crm.horarios && crm.horarios.length > 0 && (
                    <div className="ml-7 mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium">Horários de Atendimento</h4>
                      </div>
                      <div className="space-y-2 ml-6">
                        {crm.horarios.map((horario: any, hIndex: number) => (
                          <div key={hIndex} className="flex items-center gap-3 text-sm">
                            <span className="font-medium text-muted-foreground min-w-[100px]">
                              {horario.diaSemana}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              {horario.horarioInicio} às {horario.horarioFim}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Outras informações */}
      {consultorio && (consultorio.capacidadeAtendimento || consultorio.observacoes) && (
        <Card>
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
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
                  <dt className="text-sm font-medium text-muted-foreground mb-2">Observações</dt>
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
