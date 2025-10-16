import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Building2, FileText, Phone, Mail, Calendar } from "lucide-react";
import { normalizeDadosInscricao } from "@/utils/normalizeDadosInscricao";

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

  console.log('[DADOS_INSCRICAO_VIEW] Dados recebidos:', dadosInscricao);

  // ✅ Normalizar dados para snake_case consistente
  const dadosNorm = normalizeDadosInscricao(dadosInscricao);
  console.log('[DADOS_INSCRICAO_VIEW] Dados normalizados:', dadosNorm);
  
  const dadosPessoais = dadosNorm?.dados_pessoais || {};
  const endereco = dadosNorm?.endereco || {};
  const enderecoCorrespondencia = dadosNorm?.endereco_correspondencia || {};
  const consultorio = dadosNorm?.consultorio || {};
  const pessoaJuridica = dadosNorm?.pessoa_juridica || {};

  // Usar endereço de correspondência se endereço principal estiver vazio
  const enderecoFinal = Object.keys(endereco).length > 0 ? endereco : enderecoCorrespondencia;

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
            {dadosPessoais.nome_completo && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Nome Completo</span>
                <p className="text-base">{dadosPessoais.nome_completo}</p>
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
            {dadosPessoais.data_nascimento && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Data de Nascimento</span>
                  <p className="text-base">{new Date(dadosPessoais.data_nascimento).toLocaleDateString('pt-BR')}</p>
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
              {!dadosPessoais.email && enderecoCorrespondencia.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Email</span>
                    <p className="text-base break-all">{enderecoCorrespondencia.email}</p>
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
              {!dadosPessoais.celular && enderecoCorrespondencia.celular && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Celular</span>
                    <p className="text-base">{enderecoCorrespondencia.celular}</p>
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
              {!dadosPessoais.telefone && enderecoCorrespondencia.telefone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Telefone</span>
                    <p className="text-base">{enderecoCorrespondencia.telefone}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endereço */}
      {Object.keys(enderecoFinal).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {enderecoFinal.logradouro && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Logradouro</span>
                <p className="text-base">{enderecoFinal.logradouro}, {enderecoFinal.numero || "S/N"}</p>
                {enderecoFinal.complemento && <p className="text-sm text-muted-foreground">{enderecoFinal.complemento}</p>}
              </div>
            )}
            {!enderecoFinal.logradouro && enderecoFinal.endereco && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Endereço</span>
                <p className="text-base">{enderecoFinal.endereco}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {enderecoFinal.bairro && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Bairro</span>
                  <p className="text-base">{enderecoFinal.bairro}</p>
                </div>
              )}
              {enderecoFinal.cidade && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Cidade</span>
                  <p className="text-base">{enderecoFinal.cidade}</p>
                </div>
              )}
              {enderecoFinal.estado && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Estado</span>
                  <p className="text-base">{enderecoFinal.estado}</p>
                </div>
              )}
            </div>
            {enderecoFinal.cep && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">CEP</span>
                <p className="text-base">{enderecoFinal.cep}</p>
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
            {pessoaJuridica.denominacao_social && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Razão Social</span>
                <p className="text-base">{pessoaJuridica.denominacao_social}</p>
              </div>
            )}
            {pessoaJuridica.nome_fantasia && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Nome Fantasia</span>
                <p className="text-base">{pessoaJuridica.nome_fantasia}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pessoaJuridica.cnpj && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">CNPJ</span>
                  <p className="text-base">{pessoaJuridica.cnpj}</p>
                </div>
              )}
              {pessoaJuridica.inscricao_estadual && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Inscrição Estadual</span>
                  <p className="text-base">{pessoaJuridica.inscricao_estadual}</p>
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
      {dadosNorm && Object.keys(dadosNorm).filter(
        key => !['dados_pessoais', 'endereco', 'consultorio', 'pessoa_juridica', 'documentos', 'endereco_correspondencia'].includes(key)
      ).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outros Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(dadosNorm).filter(
                    ([key]) => !['dados_pessoais', 'endereco', 'consultorio', 'pessoa_juridica', 'documentos', 'endereco_correspondencia'].includes(key)
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
