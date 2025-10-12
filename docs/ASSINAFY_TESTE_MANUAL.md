# 🧪 Guia de Teste da Integração Assinafy

## ✅ O Que Foi Implementado

### 1. **Triggers SQL Corrigidos**
- ✅ `create_contrato_on_aprovacao`: Agora chama automaticamente a Edge Function `gerar-contrato-assinatura`
- ✅ `ensure_analise_exists`: Cria análise automaticamente antes de aprovar inscrição
- ✅ Análise órfã criada para inscrição `a77b710b-6ce9-410c-89da-6b2391711c03`

### 2. **Retry Automático**
- ✅ Função `retry_pending_contracts`: Reprocessa contratos pendentes
- ✅ Job cron agendado para executar a cada 30 minutos

### 3. **Logs Estruturados**
- ✅ Edge Function `gerar-contrato-assinatura` com logs detalhados em JSON

### 4. **Dashboard de Monitoramento**
- ✅ Componente `AssignafyMonitor` no Dashboard do Gestor
- ✅ Estatísticas em tempo real (atualização a cada 30s)

---

## 🚀 Como Testar

### **Passo 1: Verificar Credenciais Assinafy**

1. Acesse o Backend (botão "View Backend" no chat)
2. Vá em **Settings → Secrets**
3. Verifique se existem:
   - `ASSINAFY_API_KEY`
   - `ASSINAFY_ACCOUNT_ID`
   - `ASSINAFY_WEBHOOK_SECRET`

**Se não existirem**, adicione manualmente com os valores do painel Assinafy.

---

### **Passo 2: Configurar Webhook no Painel Assinafy**

1. Acesse: https://app.assinafy.com.br/
2. Vá em **Configurações → Webhooks**
3. Adicione novo webhook:
   - **URL**: `https://ncmofeencqpqhtguxmvy.supabase.co/functions/v1/assinafy-webhook-finalizacao`
   - **Secret**: Mesmo valor do `ASSINAFY_WEBHOOK_SECRET`
   - **Eventos**: Marcar todos:
     - ✅ `document.signed`
     - ✅ `document.rejected`
     - ✅ `document.expired`
     - ✅ `document.viewed`

4. Salvar e clicar em **"Test Webhook"**

---

### **Passo 3: Testar Fluxo Completo**

#### **3.1 Criar Nova Inscrição de Teste**

No console do navegador (F12 → Console):

```javascript
// 1. Obter token
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;

// 2. Criar inscrição de teste
const { data: inscricao, error } = await supabase
  .from('inscricoes_edital')
  .insert({
    candidato_id: session.user.id,
    edital_id: '<ID_DO_EDITAL_ATIVO>',
    dados_inscricao: {
      dadosPessoais: {
        nome: 'Teste Assinafy',
        cpf: '12345678900',
        email: 'teste@assinafy.com'
      }
    },
    is_rascunho: false
  })
  .select()
  .single();

console.log('Inscrição criada:', inscricao.id);
```

#### **3.2 Aprovar Inscrição (Criar Análise)**

```javascript
// 3. Criar análise aprovando
const { data: analise } = await supabase
  .from('analises')
  .insert({
    inscricao_id: '<ID_DA_INSCRICAO>',
    analista_id: session.user.id,
    status: 'aprovado',
    parecer: 'Teste de integração Assinafy'
  })
  .select()
  .single();

console.log('Análise criada:', analise.id);
```

#### **3.3 Verificar Criação Automática do Contrato**

Aguarde 5-10 segundos e execute:

```javascript
// 4. Verificar se contrato foi criado
const { data: contrato } = await supabase
  .from('contratos')
  .select('*')
  .eq('inscricao_id', '<ID_DA_INSCRICAO>')
  .single();

console.log('Contrato:', contrato);

// 5. Verificar se signature_request foi criado
const { data: signatureRequest } = await supabase
  .from('signature_requests')
  .select('*')
  .eq('metadata->>contrato_id', contrato.id)
  .single();

console.log('Signature Request:', signatureRequest);
```

---

### **Passo 4: Verificar no Painel Assinafy**

1. Acesse: https://app.assinafy.com.br/documents
2. Verifique se o documento aparece na lista
3. Verifique se o e-mail foi enviado ao candidato
4. Status deve estar como **"Aguardando Assinatura"**

---

### **Passo 5: Testar Assinatura**

1. No painel Assinafy, clique no documento
2. Simule a assinatura (ou use o e-mail enviado)
3. Após assinar, aguarde 30 segundos

#### **Verificar Atualização via Webhook**

```javascript
// 6. Verificar se webhook atualizou status
const { data: contratoAtualizado } = await supabase
  .from('contratos')
  .select('*, signature_requests(*)')
  .eq('id', '<ID_DO_CONTRATO>')
  .single();

console.log('Contrato após assinatura:', contratoAtualizado);
// status deve ser 'assinado'
// signature_requests.status deve ser 'signed'
// signature_requests.signed_at deve estar preenchido
```

---

### **Passo 6: Verificar Dashboard de Monitoramento**

1. Acesse o **Dashboard do Gestor** no sistema
2. Role até a seção **"Status Integração Assinafy"**
3. Verifique se as estatísticas estão corretas:
   - **Aguardando Assinatura**: Contratos pendentes
   - **Assinados**: Contratos concluídos
   - **Rejeitados**: Contratos recusados
   - **Falhas**: Erros de integração

---

## 🔍 Verificar Logs

### **Logs da Edge Function**

1. Acesse Backend → Edge Functions → `gerar-contrato-assinatura`
2. Clique em **"Logs"**
3. Procure por logs estruturados em JSON:

```json
{
  "timestamp": "2025-01-12T15:30:00Z",
  "level": "info",
  "service": "gerar-contrato-assinatura",
  "action": "contract_saved",
  "contrato_id": "...",
  "numero_contrato": "CONT-2025-..."
}
```

### **Logs do Webhook**

1. Backend → Edge Functions → `assinafy-webhook-finalizacao`
2. Verifique se há logs de recebimento do webhook após assinatura

---

## 🐛 Troubleshooting

### **Problema: Contrato criado mas não enviado para Assinafy**

**Causa**: Credenciais não configuradas

**Solução**:
1. Verificar se `ASSINAFY_API_KEY` e `ASSINAFY_ACCOUNT_ID` estão configurados
2. Executar manualmente:

```javascript
const { data, error } = await supabase.functions.invoke(
  'gerar-contrato-assinatura',
  {
    body: { inscricao_id: '<ID_DA_INSCRICAO>' }
  }
);
console.log('Resultado:', data, error);
```

---

### **Problema: Webhook não atualiza status**

**Causa**: Webhook não configurado ou secret incorreto

**Solução**:
1. Verificar URL do webhook no painel Assinafy
2. Verificar se `ASSINAFY_WEBHOOK_SECRET` está correto
3. Testar webhook manualmente no painel Assinafy

---

### **Problema: E-mail não enviado**

**Causa**: `RESEND_API_KEY` não configurado

**Solução**:
1. Configurar `RESEND_API_KEY` nos secrets
2. Ou verificar se o e-mail está válido no Assinafy

---

## 📊 Queries SQL Úteis

### **Verificar Contratos Órfãos**

```sql
SELECT 
  c.id,
  c.numero_contrato,
  c.status,
  c.created_at,
  sr.id as signature_request_id
FROM contratos c
LEFT JOIN signature_requests sr ON sr.metadata->>'contrato_id' = c.id::text
WHERE c.status = 'aguardando_assinatura'
  AND sr.id IS NULL
  AND c.created_at > NOW() - INTERVAL '7 days';
```

### **Testar Retry Manual**

```sql
SELECT retry_pending_contracts();
```

### **Verificar Estatísticas**

```sql
SELECT get_assinafy_stats();
```

---

## ✅ Critérios de Sucesso

- [ ] Contrato criado automaticamente após aprovar análise
- [ ] Documento aparece no painel Assinafy
- [ ] E-mail enviado ao candidato
- [ ] Webhook atualiza status após assinatura
- [ ] Dashboard mostra estatísticas corretas
- [ ] Logs estruturados em JSON
- [ ] Retry automático funciona para contratos órfãos

---

## 📞 Próximos Passos

Após validar todos os testes:

1. **Reprocessar inscrição órfã original**:
   ```sql
   SELECT retry_pending_contracts();
   ```

2. **Monitorar Dashboard** por 24-48h

3. **Ajustar intervalo do cron** se necessário:
   ```sql
   -- Alterar para cada 10 minutos
   SELECT cron.schedule(
     'retry-pending-contracts',
     '*/10 * * * *',
     $$ SELECT public.retry_pending_contracts(); $$
   );
   ```

4. **Configurar alertas** para falhas críticas

---

**Status**: 🟢 Pronto para testes
**Última atualização**: 2025-01-12
