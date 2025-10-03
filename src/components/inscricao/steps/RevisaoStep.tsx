import { UseFormReturn } from 'react-hook-form';
import { InscricaoCompletaForm, DOCUMENTOS_OBRIGATORIOS } from '@/lib/inscricao-validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  User, 
  Building2, 
  MapPin, 
  Stethoscope, 
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RevisaoStepProps {
  form: UseFormReturn<InscricaoCompletaForm>;
}

export function RevisaoStep({ form }: RevisaoStepProps) {
  const values = form.getValues();
  const errors = form.formState.errors;
  const hasErrors = Object.keys(errors).length > 0;

  const documentosEnviados = values.documentos?.filter(d => d.arquivo || d.url).length || 0;
  const documentosObrigatorios = DOCUMENTOS_OBRIGATORIOS.filter(d => d.obrigatorio).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold mb-2">Revisão e Envio</h3>
        <p className="text-sm text-muted-foreground">
          Revise todas as informações antes de enviar sua inscrição
        </p>
      </div>

      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção: Existem erros no formulário</AlertTitle>
          <AlertDescription>
            Por favor, volte e corrija os campos marcados com erro antes de enviar.
          </AlertDescription>
        </Alert>
      )}

      {/* Dados Pessoais */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Dados Pessoais</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">CRM</p>
              <p className="text-sm">{values.crm} / {values.uf_crm}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
              <p className="text-sm">{values.nome_completo}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">CPF</p>
              <p className="text-sm">{values.cpf}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
              <p className="text-sm">
                {values.data_nascimento && format(values.data_nascimento, 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pessoa Jurídica */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Pessoa Jurídica</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">CNPJ</p>
              <p className="text-sm">{values.cnpj}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Denominação Social</p>
              <p className="text-sm">{values.denominacao_social}</p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Endereço</p>
            <p className="text-sm">
              {values.logradouro}, {values.numero}
              {values.complemento && ` - ${values.complemento}`}
              <br />
              {values.bairro} - {values.cidade}/{values.estado}
              <br />
              CEP: {values.cep}
            </p>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Telefone</p>
              <p className="text-sm">{values.telefone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">E-mail</p>
              <p className="text-sm">{values.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Regime Fiscal</p>
              <Badge variant={values.optante_simples ? 'default' : 'secondary'}>
                {values.optante_simples ? 'Simples Nacional' : 'Não optante'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consultório e Especialidades */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <CardTitle>Consultório e Especialidades</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Especialidade Principal</p>
              <p className="text-sm">{values.especialidade_principal}</p>
            </div>
            {values.especialidade_secundaria && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Especialidade Secundária</p>
                <p className="text-sm">{values.especialidade_secundaria}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Consultas Mínimas</p>
              <p className="text-sm">{values.quantidade_consultas_minima}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hora Marcada</p>
              <Badge variant={values.atendimento_hora_marcada ? 'default' : 'secondary'}>
                {values.atendimento_hora_marcada ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Horários de Atendimento</p>
            {values.horarios && values.horarios.length > 0 ? (
              <div className="space-y-1">
                {values.horarios.map((h, i) => (
                  <p key={i} className="text-sm">
                    {h.dia_semana}: {h.horario_inicio} às {h.horario_fim}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum horário definido</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Documentos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Progresso de envio</span>
            <Badge variant={documentosEnviados >= documentosObrigatorios ? 'default' : 'destructive'}>
              {documentosEnviados} de {documentosObrigatorios} obrigatórios
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((documentosEnviados / documentosObrigatorios) * 100, 100)}%` }}
            />
          </div>
          {documentosEnviados < documentosObrigatorios && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Você ainda precisa enviar {documentosObrigatorios - documentosEnviados} documento(s) obrigatório(s).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Confirmação */}
      {!hasErrors && documentosEnviados >= documentosObrigatorios && (
        <Alert className="border-[hsl(var(--green-approved))] bg-[hsl(var(--green-approved)_/_0.1)]">
          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--green-approved))]" />
          <AlertTitle className="text-[hsl(var(--green-approved))]">Tudo pronto!</AlertTitle>
          <AlertDescription className="text-sm">
            Sua inscrição está completa e pode ser enviada. Clique em "Enviar Inscrição" para finalizar o processo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
