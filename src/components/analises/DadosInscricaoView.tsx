import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Building2, FileText, Phone, Mail, Calendar } from "lucide-react";

interface DadosInscricaoViewProps {
  dadosInscricao: any;
}

export function DadosInscricaoView({ dadosInscricao }: DadosInscricaoViewProps) {
  if (!dadosInscricao) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Nenhum dado de inscrição disponível.</p>
        </CardContent>
      </Card>
    );
  }

  const dadosPessoais = dadosInscricao.dadosPessoais || {};
  const endereco = dadosInscricao.endereco || {};
  const consultorio = dadosInscricao.consultorio || {};
  const pessoaJuridica = dadosInscricao.pessoaJuridica || {};

  return (
    <div className="space-y-4">
      {/* Dados Pessoais */}
      {Object.keys(dadosPessoais).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dadosPessoais.nome && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Nome Completo</span>
                <p className="text-base">{dadosPessoais.nome}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dadosPessoais.cpf && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">CPF</span>
                  <p className="text-base">{dadosPessoais.cpf}</p>
                </div>
              )}
              {dadosPessoais.rg && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">RG</span>
                  <p className="text-base">{dadosPessoais.rg}</p>
                </div>
              )}
            </div>
            {dadosPessoais.dataNascimento && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Data de Nascimento</span>
                  <p className="text-base">{new Date(dadosPessoais.dataNascimento).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dadosPessoais.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Email</span>
                    <p className="text-base break-all">{dadosPessoais.email}</p>
                  </div>
                </div>
              )}
              {dadosPessoais.celular && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Celular</span>
                    <p className="text-base">{dadosPessoais.celular}</p>
                  </div>
                </div>
              )}
              {dadosPessoais.telefone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Telefone</span>
                    <p className="text-base">{dadosPessoais.telefone}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endereço */}
      {Object.keys(endereco).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {endereco.logradouro && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Logradouro</span>
                <p className="text-base">{endereco.logradouro}, {endereco.numero || "S/N"}</p>
                {endereco.complemento && <p className="text-sm text-muted-foreground">{endereco.complemento}</p>}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {endereco.bairro && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Bairro</span>
                  <p className="text-base">{endereco.bairro}</p>
                </div>
              )}
              {endereco.cidade && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Cidade</span>
                  <p className="text-base">{endereco.cidade}</p>
                </div>
              )}
              {endereco.estado && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Estado</span>
                  <p className="text-base">{endereco.estado}</p>
                </div>
              )}
            </div>
            {endereco.cep && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">CEP</span>
                <p className="text-base">{endereco.cep}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consultório e CRMs */}
      {Object.keys(consultorio).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Dados do Consultório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {consultorio.crms && Array.isArray(consultorio.crms) && consultorio.crms.length > 0 && (
              <div className="space-y-3">
                <span className="text-sm font-medium text-muted-foreground">CRMs e Especialidades</span>
                {consultorio.crms.map((crm: any, idx: number) => (
                  <Card key={idx} className="bg-muted/50">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">CRM {crm.crm}/{crm.uf}</Badge>
                        {crm.especialidade && (
                          <Badge variant="outline">{crm.especialidade}</Badge>
                        )}
                      </div>
                      {crm.horarios && Array.isArray(crm.horarios) && crm.horarios.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-muted-foreground">Horários de Atendimento:</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                            {crm.horarios.map((horario: any, hidx: number) => (
                              <div key={hidx} className="text-sm">
                                <span className="font-medium">{horario.diaSemana}:</span> {horario.horarioInicio} - {horario.horarioFim}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pessoa Jurídica */}
      {Object.keys(pessoaJuridica).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Dados da Pessoa Jurídica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pessoaJuridica.razaoSocial && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Razão Social</span>
                <p className="text-base">{pessoaJuridica.razaoSocial}</p>
              </div>
            )}
            {pessoaJuridica.nomeFantasia && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Nome Fantasia</span>
                <p className="text-base">{pessoaJuridica.nomeFantasia}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pessoaJuridica.cnpj && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">CNPJ</span>
                  <p className="text-base">{pessoaJuridica.cnpj}</p>
                </div>
              )}
              {pessoaJuridica.inscricaoEstadual && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Inscrição Estadual</span>
                  <p className="text-base">{pessoaJuridica.inscricaoEstadual}</p>
                </div>
              )}
            </div>
            {pessoaJuridica.porte && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Porte</span>
                <Badge variant="outline">{pessoaJuridica.porte}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Outros dados (catch-all para campos não mapeados) */}
      {Object.keys(dadosInscricao).filter(
        key => !['dadosPessoais', 'endereco', 'consultorio', 'pessoaJuridica'].includes(key)
      ).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outros Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(dadosInscricao).filter(
                    ([key]) => !['dadosPessoais', 'endereco', 'consultorio', 'pessoaJuridica'].includes(key)
                  )
                ),
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
