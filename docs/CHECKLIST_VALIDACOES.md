# Checklist de Validações do Sistema

## 1. Inscrições - Validações Frontend (Zod)

### 1.1 Dados Pessoais (PF)

- [ ] **CPF**
  - Formato: 11 dígitos numéricos
  - Validação: Algoritmo de dígitos verificadores
  - Único por edital ativo
  
- [ ] **Nome Completo**
  - Mínimo: 5 caracteres
  - Máximo: 255 caracteres
  - Obrigatório
  
- [ ] **Email**
  - Formato: email válido (RFC 5322)
  - Único no sistema
  - Obrigatório
  
- [ ] **Telefone**
  - Formato: 10-11 dígitos numéricos (DDD + número)
  - Obrigatório
  
- [ ] **Data de Nascimento**
  - Formato: YYYY-MM-DD
  - Idade mínima: 18 anos
  - Obrigatório
  
- [ ] **Endereço de Correspondência**
  - CEP: 8 dígitos numéricos
  - Logradouro: obrigatório
  - Número: obrigatório
  - Cidade: obrigatório
  - Estado: 2 caracteres (UF)
  
### 1.2 Dados Pessoa Jurídica (PJ)

- [ ] **CNPJ**
  - Formato: 14 dígitos numéricos
  - Validação: Algoritmo de dígitos verificadores
  - Único por edital ativo
  - Obrigatório se tipo_credenciamento === 'PJ'
  
- [ ] **Razão Social**
  - Mínimo: 3 caracteres
  - Obrigatório se tipo_credenciamento === 'PJ'
  
- [ ] **Nome Fantasia**
  - Opcional
  - Máximo: 255 caracteres
  
### 1.3 Consultórios

- [ ] **Quantidade**
  - Mínimo: 1 consultório
  - Máximo: 10 consultórios
  
- [ ] **Campos Obrigatórios por Consultório**
  - [ ] CNES: formato específico
  - [ ] Nome do consultório
  - [ ] CEP: 8 dígitos
  - [ ] Logradouro
  - [ ] Número
  - [ ] Cidade
  - [ ] Estado (UF)
  
- [ ] **Horários de Atendimento**
  - Mínimo: 1 horário por consultório
  - Campos obrigatórios:
    - [ ] Dia da semana
    - [ ] Hora início (formato HH:mm)
    - [ ] Hora fim (formato HH:mm)
  - Validação: hora_fim > hora_inicio
  
### 1.4 Documentos

- [ ] **Documentos Obrigatórios PF**
  - [ ] Identidade (RG)
  - [ ] CPF
  - [ ] Comprovante de residência
  - [ ] Diploma de graduação
  - [ ] Certidão do conselho de classe
  - [ ] Currículo
  - [ ] Certificado de especialidade
  
- [ ] **Documentos Obrigatórios PJ**
  - [ ] Contrato social
  - [ ] CNPJ
  - [ ] Certidão de regularidade (Receita Federal)
  - [ ] Certidão de regularidade (FGTS)
  - [ ] Alvará de funcionamento
  
- [ ] **Documentos por Consultório**
  - [ ] Alvará sanitário
  - [ ] CNES
  
- [ ] **Validações de Upload**
  - Tamanho máximo: 10MB por arquivo
  - Formatos aceitos: PDF, JPG, JPEG, PNG
  - Nome de arquivo: sanitizado (sem caracteres especiais)

---

## 2. Análises - Validações Backend

### 2.1 Criação de Análise

- [ ] **Inscrição válida**
  - Status deve ser 'em_analise' ou 'pendente_correcao'
  - Não pode ter análise 'pendente' já criada
  
- [ ] **Analista autorizado**
  - Role deve ser 'analista', 'gestor' ou 'admin'
  - Analista não pode analisar própria inscrição
  
### 2.2 Decisão de Análise

- [ ] **Campos obrigatórios por decisão**
  - Aprovada: nenhum adicional
  - Reprovada: motivo_reprovacao obrigatório
  - Pendente correção: campos_reprovados ou documentos_reprovados obrigatórios
  
- [ ] **Prazo de Correção**
  - Se status = 'pendente_correcao', prazo_correcao deve ser definido
  - Padrão: 15 dias a partir da decisão

---

## 3. Contratos - Validações

### 3.1 Geração de Contrato

- [ ] **Pré-requisitos**
  - Análise deve estar com status 'aprovada'
  - Inscrição deve estar com status 'aprovada'
  - Não pode existir contrato ativo para a mesma inscrição
  
- [ ] **Template válido**
  - Template deve existir e estar ativo (is_active = true)
  
- [ ] **Número de contrato**
  - Gerado automaticamente via trigger
  - Formato sequencial único

### 3.2 Assinatura de Contrato

- [ ] **Autorização**
  - Apenas o candidato titular pode assinar
  - Contrato deve estar com status 'pendente_assinatura'
  
- [ ] **Prazo**
  - Prazo de 30 dias para assinatura
  - Após prazo, status muda para 'expirado'

---

## 4. Credenciados - Validações

### 4.1 Criação de Credenciado

- [ ] **Origem**
  - Deve ser criado a partir de inscrição aprovada
  - Contrato deve estar assinado
  
- [ ] **Dados obrigatórios**
  - [ ] Nome completo
  - [ ] CPF (único)
  - [ ] Email (único)
  - [ ] Telefone
  - [ ] Pelo menos 1 CRM
  - [ ] Pelo menos 1 consultório
  
### 4.2 CRMs

- [ ] **Quantidade**
  - Mínimo: 1 CRM
  - Sem limite máximo
  
- [ ] **Campos obrigatórios**
  - [ ] Número do CRM
  - [ ] UF do CRM (2 caracteres)
  - [ ] Especialidade
  
- [ ] **Validação de formato**
  - CRM deve ser numérico
  - UF deve ser sigla válida de estado brasileiro

### 4.3 Consultórios

- [ ] **Quantidade**
  - Mínimo: 1 consultório
  - Máximo: 10 consultórios
  
- [ ] **Campos obrigatórios**
  - [ ] CNES (único por consultório)
  - [ ] Nome do consultório
  - [ ] Endereço completo (CEP, logradouro, número, cidade, estado)
  
- [ ] **Geocodificação**
  - Sistema deve geocodificar endereços automaticamente
  - Campos latitude/longitude preenchidos após geocodificação

### 4.4 Mudança de Status

- [ ] **Transições permitidas**
  - Ativo → Suspenso (via sanção ou prazo vencido)
  - Ativo → Em Afastamento (via solicitação aprovada)
  - Ativo → Descredenciado (via admin)
  - Suspenso → Ativo (via gestor ou regra automática)
  - Em Afastamento → Ativo (fim do período)
  
- [ ] **Transições bloqueadas**
  - Descredenciado → qualquer status (irreversível)

---

## 5. Prazos - Validações

### 5.1 Criação de Prazo

- [ ] **Campos obrigatórios**
  - [ ] entidade_tipo (tipo de documento/certificado)
  - [ ] entidade_id (ID do documento/certificado)
  - [ ] data_vencimento (data futura)
  - [ ] credenciado_id
  
- [ ] **Dias de alerta**
  - Valores padrão: [30, 15, 7, 1]
  - Pode ser customizado por tipo de entidade

### 5.2 Atualização de Status

- [ ] **Cálculo automático**
  - dias_para_vencer: calculado diariamente via cron job
  - status_atual: atualizado baseado em dias_para_vencer
    - 'valido': > 30 dias
    - 'proximo_vencimento': 7-30 dias
    - 'vencimento_iminente': 1-6 dias
    - 'vencido': <= 0 dias

### 5.3 Renovação

- [ ] **Tipos renováveis**
  - Documentos: Alvará sanitário, CNES, Certidões
  - Certificados: Certificados de regularidade
  
- [ ] **Validações de renovação**
  - [ ] Upload de novo documento obrigatório
  - [ ] Data de emissão deve ser posterior ao documento anterior
  - [ ] Data de vencimento deve ser futura

---

## 6. Avaliações - Validações

### 6.1 Avaliação Interna (Prestadores)

- [ ] **Autorização**
  - Apenas gestores e admins podem criar
  
- [ ] **Campos obrigatórios**
  - [ ] credenciado_id
  - [ ] periodo_referencia (mês/ano)
  - [ ] Pelo menos 1 critério avaliado
  
- [ ] **Critérios**
  - [ ] Nota: 1-5 (inteiro)
  - [ ] Observação: máximo 500 caracteres (opcional)
  
- [ ] **Unicidade**
  - Uma avaliação por período de referência por credenciado

### 6.2 Avaliação Pública

- [ ] **Campos obrigatórios**
  - [ ] credenciado_id
  - [ ] nota_estrelas (1-5)
  - [ ] comentario (mínimo 10, máximo 1000 caracteres)
  
- [ ] **Moderação IA**
  - Score mínimo: 0.7
  - Verifica: linguagem ofensiva, spam, conteúdo inadequado
  - Status inicial: 'pendente'
  
- [ ] **Resposta do credenciado**
  - Máximo: 1 resposta por avaliação
  - Limite: 1000 caracteres

---

## 7. Workflows - Validações

### 7.1 Definição de Workflow

- [ ] **Estrutura obrigatória**
  - [ ] Pelo menos 1 nó START
  - [ ] Pelo menos 1 nó END
  - [ ] Todos os nós devem estar conectados
  
- [ ] **Configuração de nós**
  - Cada tipo de nó requer config específica:
    - SEND_MESSAGE: recipient_id, message_template
    - DECISION: condition, paths
    - APPROVAL: approver_role
    - HTTP_REQUEST: url, method

### 7.2 Execução de Workflow

- [ ] **Validações de execução**
  - [ ] Workflow deve estar ativo
  - [ ] Contexto inicial deve ser válido JSON
  - [ ] Todas as variáveis referenciadas devem existir no contexto
  
- [ ] **Limites**
  - Máximo de steps por execução: 1000
  - Timeout padrão: 24 horas
  - Retry em caso de falha: máximo 3 tentativas

---

## 8. Sanções - Validações

### 8.1 Registro de Ocorrência

- [ ] **Campos obrigatórios**
  - [ ] credenciado_id
  - [ ] tipo_ocorrencia
  - [ ] descricao (mínimo 20, máximo 2000 caracteres)
  - [ ] gravidade (leve, media, grave)
  
- [ ] **Evidências**
  - Obrigatórias se gravidade === 'grave'
  - Formato: URLs de documentos

### 8.2 Aplicação de Sanção

- [ ] **Campos obrigatórios**
  - [ ] credenciado_id
  - [ ] tipo_sancao
  - [ ] justificativa (mínimo 50 caracteres)
  - [ ] data_inicio (>= hoje)
  
- [ ] **Validações por tipo**
  - Suspensão temporária: data_fim obrigatória (>= data_inicio)
  - Descredenciamento: requer role 'admin'
  
- [ ] **Efeitos**
  - Suspensão: status do credenciado → 'Suspenso'
  - Descredenciamento: status → 'Descredenciado'
  - Advertência: não altera status

---

## 9. Suspensão Automática - Regras

### 9.1 Verificação de Regras

- [ ] **Frequência**
  - Cron job diário às 00:00 UTC
  
- [ ] **Regras padrão**
  - [ ] Documento vencido crítico (alvará, CNES, certidão)
  - [ ] Certificado de regularidade vencido
  - [ ] 3+ ocorrências graves em 90 dias
  
- [ ] **Execução**
  - Ordenação por prioridade (1 = mais alta)
  - Se múltiplas regras aplicam, executa apenas a de maior prioridade

### 9.2 Notificações

- [ ] **Antes da suspensão**
  - Se notificar_antes === true
  - Antecedência definida por dias_tolerancia
  
- [ ] **Após suspensão**
  - Notificação obrigatória
  - Destinatários: credenciado, gestores, admin

---

## 10. Certificados - Validações

### 10.1 Geração de Certificado

- [ ] **Pré-requisitos**
  - Credenciado deve ter status 'Ativo'
  - Não pode existir certificado ativo do mesmo tipo
  
- [ ] **Dados snapshot**
  - Captura estado completo do credenciado no momento da emissão
  - Armazenado em JSON no campo dados_snapshot

### 10.2 Consulta Pública

- [ ] **Busca por código**
  - Código de verificação: 8 caracteres alfanuméricos
  - Hash de verificação: validação de integridade
  
- [ ] **Log de consulta**
  - Registra IP de origem
  - Registra User-Agent
  - Registra resultado (encontrado/não encontrado)

---

## 11. Notificações - Validações

### 11.1 Criação de Notificação

- [ ] **Campos obrigatórios**
  - [ ] user_id (destinatário)
  - [ ] title (máximo 255 caracteres)
  - [ ] type (info, success, warning, error)
  
- [ ] **Campos opcionais**
  - message (máximo 1000 caracteres)
  - related_id (UUID da entidade relacionada)
  - related_type (tipo da entidade)

### 11.2 Limpeza Automática

- [ ] **Retenção**
  - Duração: 90 dias
  - Notificações lidas são deletadas após 90 dias
  - Notificações não lidas são mantidas

---

## 12. Auditoria - Regras

### 12.1 Eventos Auditados

- [ ] **Recursos críticos**
  - [ ] inscricoes_edital (CREATE, UPDATE, DELETE)
  - [ ] analises (CREATE, UPDATE)
  - [ ] credenciados (CREATE, UPDATE, DELETE)
  - [ ] contratos (CREATE, UPDATE)
  - [ ] sancoes_prestadores (CREATE, UPDATE, DELETE)
  - [ ] workflow_executions (CREATE, UPDATE)

### 12.2 Dados Capturados

- [ ] **Informações obrigatórias**
  - [ ] user_id (quem executou)
  - [ ] user_email
  - [ ] user_role
  - [ ] action (tipo de ação)
  - [ ] resource_type
  - [ ] resource_id
  - [ ] created_at (timestamp)
  
- [ ] **Informações adicionais**
  - old_values (JSON antes da mudança)
  - new_values (JSON depois da mudança)
  - ip_address
  - user_agent
  - metadata (contexto adicional)

### 12.3 Retenção e LGPD

- [ ] **Política de retenção**
  - Duração: 5 anos
  - Imutável: logs não podem ser editados ou deletados
  - Backup obrigatório
  
- [ ] **Anonimização**
  - Após 5 anos: campos sensíveis são anonimizados
  - Direito ao esquecimento: dados pessoais removidos, logs estruturais mantidos

---

## Checklist de Segurança (RLS)

### Verificações Gerais

- [ ] Todas as tabelas críticas têm RLS habilitado
- [ ] Políticas SELECT impedem vazamento de dados entre usuários
- [ ] Políticas INSERT/UPDATE/DELETE verificam propriedade dos dados
- [ ] Funções auxiliares (has_role, etc.) estão implementadas
- [ ] Triggers de auditoria registram todas mudanças críticas

### Tabelas com RLS Crítico

- [ ] inscricoes_edital: candidato vê apenas suas próprias
- [ ] analises: analistas veem todas, candidatos veem apenas suas
- [ ] credenciados: credenciados veem dados completos próprios, público vê apenas ativos
- [ ] documentos: apenas dono e equipe de análise têm acesso
- [ ] avaliacoes_publicas: apenas aprovadas são públicas
- [ ] audit_logs: apenas admin e gestor têm acesso
- [ ] workflow_messages: respeita visibilidade configurada

---

## Resumo de Prioridades

### 🔴 Crítico (Bloqueante)

- Validação de CPF/CNPJ únicos
- Upload de documentos obrigatórios
- RLS em tabelas de dados sensíveis
- Autorização de mudanças de status
- Auditoria de ações críticas

### 🟡 Importante (Alta)

- Validação de formatos de dados
- Geocodificação de endereços
- Prazos e alertas automáticos
- Moderação de avaliações públicas
- Notificações em tempo real

### 🟢 Desejável (Média)

- Validação de horários de atendimento
- Estatísticas de desempenho
- Logs detalhados de workflows
- Histórico completo de mudanças
