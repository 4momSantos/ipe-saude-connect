import { useMemo, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { 
  InscricaoCompletaForm, 
  DOCUMENTOS_OBRIGATORIOS, 
  getSchemaByTipo, 
  getDocumentosByTipo 
} from '@/lib/inscricao-schema-unificado';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useEspecialidades } from '@/hooks/useEspecialidades';

interface RevisaoStepProps {
  form: UseFormReturn<InscricaoCompletaForm>;
}

export function RevisaoStep({ form }: RevisaoStepProps) {
  const DEBUG = false; // Ativar apenas para debugging
  const values = form.getValues();
  const { data: especialidades, isLoading: especialidadesLoading } = useEspecialidades();
  
  // ✅ OTIMIZAÇÃO 1: Memoizar tipo de credenciamento para evitar re-renders
  const tipoCredenciamento = useMemo(() => {
    return values.tipo_credenciamento;
  }, [values.tipo_credenciamento]);

  // ✅ OTIMIZAÇÃO 2: Memoizar nomes de especialidades
  const especialidadesNomes = useMemo(() => {
    if (!values.especialidades_ids || !especialidades || especialidadesLoading) return [];
    return values.especialidades_ids
      .map(id => especialidades.find(e => e.id === id)?.nome)
      .filter(Boolean);
  }, [values.especialidades_ids, especialidades, especialidadesLoading]);

  // ✅ OTIMIZAÇÃO 3: Memoizar validação para evitar re-execução desnecessária
  const validationResult = useMemo(() => {
    if (!tipoCredenciamento) return null;
    
    const schemaToUse = getSchemaByTipo(tipoCredenciamento);
    return schemaToUse.safeParse(values);
  }, [
    tipoCredenciamento, 
    values.cpf, 
    values.cnpj, 
    values.nome_completo,
    values.crm,
    values.uf_crm,
    values.data_nascimento,
    values.rg,
    values.orgao_emissor,
    values.endereco_consultorio,
    values.quantidade_consultas_minima,
    values.especialidades_ids,
    values.documentos?.length
  ]);

  const hasErrors = validationResult ? !validationResult.success : Object.keys(form.formState.errors).length > 0;

  // ✅ OTIMIZAÇÃO 4: Logs condicionais apenas em modo DEBUG dentro de useEffect
  useEffect(() => {
    if (!DEBUG) return;
    
    if (!validationResult?.success && validationResult) {
      console.group('🔴 [REVISAO] Erros de Validação Final');
      console.log('Tipo de Credenciamento:', tipoCredenciamento);
      console.log('❌ Erros de validação (primeiros 10):');
      validationResult.error.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.path.join('.')} → ${err.message}`);
      });
      console.groupEnd();
    } else if (validationResult?.success) {
      console.log('✅ [REVISAO] Validação passou com sucesso!');
    }
  }, [DEBUG, validationResult, tipoCredenciamento]);

  // PARTE 3: Calcular progresso dos documentos obrigatórios baseado no tipo
  const documentosObrigatoriosList = tipoCredenciamento
    ? getDocumentosByTipo(tipoCredenciamento).filter(d => d.obrigatorio)
    : DOCUMENTOS_OBRIGATORIOS.filter(d => d.obrigatorio);
  const documentosEnviados = values.documentos?.filter(d => 
    (d.arquivo || d.url) && 
    documentosObrigatoriosList.some(doc => doc.tipo === d.tipo)
  ).length || 0;

  return (
    <ScrollArea className="h-[calc(100vh-280px)] pr-4">
      <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold mb-2">Revisão e Envio</h3>
        <p className="text-sm text-muted-foreground">
          Revise todas as informações antes de enviar sua inscrição
        </p>
      </div>

      {hasErrors && validationResult && !validationResult.success && (
        <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100">
            ⚠️ Atenção: Alguns campos estão incompletos ({tipoCredenciamento || 'tipo não detectado'})
          </AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <div className="space-y-2">
              <p className="font-semibold">Campos sugeridos para preencher:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationResult.error.errors.slice(0, 5).map((error, idx) => (
                  <li key={idx} className="text-sm">
                    <span className="font-medium">{error.path.join(' → ') || 'Geral'}:</span>{' '}
                    {error.message}
                  </li>
                ))}
              </ul>
              {validationResult.error.errors.length > 5 && (
                <p className="text-sm mt-2">
                  ...e mais {validationResult.error.errors.length - 5} campo(s) sugerido(s)
                </p>
              )}
              <p className="mt-3 text-sm font-medium">
                ✅ Você pode enviar mesmo assim, mas recomendamos preencher todos os campos para agilizar a análise.
              </p>
            </div>
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
            {/* ✅ Adicionar RG e Órgão Emissor para PF */}
            {tipoCredenciamento === 'PF' && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">RG</p>
                  <p className="text-sm">{values.rg}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Órgão Emissor</p>
                  <p className="text-sm">{values.orgao_emissor}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bloco condicional: PF mostra Correspondência (opcional), PJ mostra Pessoa Jurídica (obrigatório) */}
      {tipoCredenciamento === 'PF' && (
        values.logradouro_correspondencia || 
        values.cep_correspondencia || 
        values.email_correspondencia
      ) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Endereço de Correspondência</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Endereço</p>
              <p className="text-sm">
                {values.logradouro_correspondencia}, {values.numero_correspondencia}
                {values.complemento_correspondencia && ` - ${values.complemento_correspondencia}`}
                <br />
                {values.bairro_correspondencia} - {values.cidade_correspondencia}/{values.uf_correspondencia}
                <br />
                CEP: {values.cep_correspondencia}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                <p className="text-sm">{values.telefone_correspondencia}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Celular</p>
                <p className="text-sm">{values.celular_correspondencia}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">E-mail</p>
                <p className="text-sm">{values.email_correspondencia}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tipoCredenciamento === 'PJ' && values.cnpj && (
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
                <p className="text-sm font-medium text-muted-foreground">Celular</p>
                <p className="text-sm">{values.celular}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">E-mail</p>
                <p className="text-sm">{values.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Banco/Agência</p>
                <p className="text-sm">{values.banco_agencia}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conta</p>
                <p className="text-sm">{values.banco_conta}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Optante Simples</p>
                <p className="text-sm">{values.optante_simples ? 'Sim' : 'Não'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <p className="text-sm font-medium text-muted-foreground">Especialidades</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {especialidadesLoading ? (
                  <Badge variant="secondary">Carregando...</Badge>
                ) : especialidadesNomes.length > 0 ? (
                  especialidadesNomes.map((nome, idx) => (
                    <Badge key={idx} variant="secondary">{nome}</Badge>
                  ))
                ) : (
                  <Badge variant="outline">Nenhuma especialidade selecionada</Badge>
                )}
              </div>
            </div>
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
            <Badge variant={documentosEnviados >= documentosObrigatoriosList.length ? 'default' : 'destructive'}>
              {documentosEnviados} de {documentosObrigatoriosList.length} obrigatórios
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((documentosEnviados / documentosObrigatoriosList.length) * 100, 100)}%` }}
            />
          </div>
          {documentosEnviados < documentosObrigatoriosList.length && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Você ainda precisa enviar {documentosObrigatoriosList.length - documentosEnviados} documento(s) obrigatório(s).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Confirmação */}
      {documentosEnviados >= 0 && (
        <Alert className="border-[hsl(var(--green-approved))] bg-[hsl(var(--green-approved)_/_0.1)]">
          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--green-approved))]" />
          <AlertTitle className="text-[hsl(var(--green-approved))]">Pronto para enviar!</AlertTitle>
          <AlertDescription className="text-sm">
            Sua inscrição pode ser enviada. Clique em "Enviar Inscrição" para finalizar.
          </AlertDescription>
        </Alert>
      )}
      </div>
    </ScrollArea>
  );
}
