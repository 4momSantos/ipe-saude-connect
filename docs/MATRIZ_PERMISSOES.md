# Matriz de Permissões por Role

## Roles do Sistema

- **candidato**: Usuário que se inscreve em editais
- **analista**: Profissional que analisa inscrições
- **gestor**: Gerente que supervisiona credenciados e processos
- **admin**: Administrador com acesso total ao sistema

---

## 1. Módulo: Inscrições

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver próprias inscrições** | ✅ | ❌ | ❌ | ❌ |
| **Ver todas inscrições** | ❌ | ✅ | ✅ | ✅ |
| **Criar inscrição** | ✅ | ❌ | ❌ | ❌ |
| **Editar inscrição (rascunho)** | ✅ | ❌ | ❌ | ❌ |
| **Editar inscrição (em_analise)** | ❌ | ❌ | ❌ | ❌ |
| **Cancelar inscrição** | ✅ | ❌ | ✅ | ✅ |
| **Submeter correções** | ✅ | ❌ | ❌ | ❌ |
| **Ver documentos próprios** | ✅ | ❌ | ❌ | ❌ |
| **Ver documentos de análise** | ❌ | ✅ | ✅ | ✅ |
| **Fazer upload documentos** | ✅ | ❌ | ❌ | ❌ |

### Regras Especiais
- Candidatos só podem editar inscrições com status `rascunho` ou `pendente_correcao`
- Documentos são visíveis apenas para o candidato dono e equipe de análise

---

## 2. Módulo: Análises

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver própria análise** | ✅ | ❌ | ❌ | ❌ |
| **Ver todas análises** | ❌ | ✅ | ✅ | ✅ |
| **Criar análise** | ❌ | ✅ | ✅ | ✅ |
| **Aprovar inscrição** | ❌ | ✅ | ✅ | ✅ |
| **Reprovar inscrição** | ❌ | ✅ | ✅ | ✅ |
| **Solicitar correções** | ❌ | ✅ | ✅ | ✅ |
| **Reanalisar correções** | ❌ | ✅ | ✅ | ✅ |
| **Ver parecer analista** | ✅ (próprio) | ✅ | ✅ | ✅ |

### Regras Especiais
- Analista não pode analisar própria inscrição (se for candidato também)
- Gestor pode revogar análises e reatribuir

---

## 3. Módulo: Contratos

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver próprio contrato** | ✅ | ❌ | ❌ | ❌ |
| **Ver todos contratos** | ❌ | ✅ | ✅ | ✅ |
| **Gerar contrato** | ❌ | ❌ | ✅ | ✅ |
| **Assinar contrato** | ✅ | ❌ | ❌ | ❌ |
| **Rescindir contrato** | ❌ | ❌ | ✅ | ✅ |
| **Download PDF** | ✅ (próprio) | ✅ | ✅ | ✅ |
| **Editar templates** | ❌ | ❌ | ✅ | ✅ |

### Regras Especiais
- Contrato só pode ser assinado pelo candidato titular da inscrição
- Rescisão requer justificativa obrigatória

---

## 4. Módulo: Credenciados

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver dados próprios (completo)** | ✅ | ❌ | ❌ | ❌ |
| **Ver dados públicos** | ✅ | ✅ | ✅ | ✅ |
| **Ver dados completos (todos)** | ❌ | ✅ | ✅ | ✅ |
| **Editar dados próprios** | ✅ (limitado) | ❌ | ❌ | ❌ |
| **Editar dados (qualquer)** | ❌ | ❌ | ✅ | ✅ |
| **Suspender credenciado** | ❌ | ❌ | ✅ | ✅ |
| **Reativar credenciado** | ❌ | ❌ | ✅ | ✅ |
| **Descredenciar** | ❌ | ❌ | ❌ | ✅ |
| **Gerenciar CRMs** | ✅ (próprio) | ❌ | ✅ | ✅ |
| **Gerenciar consultórios** | ✅ (próprio) | ❌ | ✅ | ✅ |
| **Ver histórico** | ✅ (próprio) | ✅ | ✅ | ✅ |

### Regras Especiais
- Credenciados podem editar apenas dados de contato e horários, não dados fiscais
- Público pode ver credenciados com status `Ativo` no mapa
- Gestores veem todos os dados, inclusive inativos

---

## 5. Módulo: Avaliações

### 5.1 Avaliações Internas (Prestadores)

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver avaliações próprias** | ✅ | ❌ | ❌ | ❌ |
| **Ver todas avaliações** | ❌ | ❌ | ✅ | ✅ |
| **Criar avaliação** | ❌ | ❌ | ✅ | ✅ |
| **Editar avaliação** | ❌ | ❌ | ✅ | ✅ |
| **Deletar avaliação** | ❌ | ❌ | ❌ | ✅ |
| **Finalizar avaliação** | ❌ | ❌ | ✅ | ✅ |

### 5.2 Avaliações Públicas

| Operação | público | candidato | analista | gestor | admin |
|----------|---------|-----------|----------|--------|-------|
| **Ver avaliações aprovadas** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Criar avaliação** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Responder avaliação** | ❌ | ✅ (própria) | ❌ | ❌ | ❌ |
| **Moderar avaliações** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Aprovar/Rejeitar** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Denunciar avaliação** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver avaliações pendentes** | ❌ | ❌ | ❌ | ✅ | ✅ |

### Regras Especiais
- Credenciados podem responder avaliações públicas apenas uma vez
- IA modera automaticamente com score < 0.7
- Avaliações anônimas ocultam identidade do avaliador

---

## 6. Módulo: Prazos e Alertas

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver prazos próprios** | ✅ | ❌ | ❌ | ❌ |
| **Ver todos prazos** | ❌ | ✅ | ✅ | ✅ |
| **Criar prazo** | ❌ | ❌ | ✅ | ✅ |
| **Editar prazo** | ❌ | ❌ | ✅ | ✅ |
| **Prorrogar prazo** | ❌ | ❌ | ✅ | ✅ |
| **Excluir prazo** | ❌ | ❌ | ❌ | ✅ |
| **Renovar documento** | ✅ | ❌ | ✅ | ✅ |
| **Configurar alertas** | ❌ | ❌ | ✅ | ✅ |
| **Ver histórico ações** | ❌ | ❌ | ✅ | ✅ |

### Regras Especiais
- Sistema pode criar prazos automaticamente via triggers
- Alertas são enviados conforme configuração de dias_antecedencia
- Credenciados recebem notificações mas não editam prazos

---

## 7. Módulo: Workflows

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver workflows próprios** | ✅ | ❌ | ❌ | ❌ |
| **Ver todos workflows** | ❌ | ✅ | ✅ | ✅ |
| **Criar workflow** | ❌ | ❌ | ✅ | ✅ |
| **Editar definição** | ❌ | ❌ | ✅ | ✅ |
| **Executar workflow** | ❌ (auto) | ❌ (auto) | ✅ | ✅ |
| **Cancelar workflow** | ❌ | ❌ | ✅ | ✅ |
| **Responder mensagem** | ✅ (se destinatário) | ✅ (se destinatário) | ✅ | ✅ |
| **Aprovar step** | ❌ | ❌ | ✅ (se aprovador) | ✅ |
| **Ver histórico execução** | ✅ (próprio) | ✅ | ✅ | ✅ |
| **Configurar templates** | ❌ | ❌ | ✅ | ✅ |

### Regras Especiais
- Workflows pausados aguardam ação do destinatário configurado
- Aprovações são baseadas em role (gestor ou admin)
- Mensagens respeitam visibilidade configurada (todos, role, usuário)

---

## 8. Módulo: Sanções e Ocorrências

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver ocorrências próprias** | ✅ | ❌ | ❌ | ❌ |
| **Ver todas ocorrências** | ❌ | ✅ | ✅ | ✅ |
| **Registrar ocorrência** | ❌ | ❌ | ✅ | ✅ |
| **Editar ocorrência** | ❌ | ❌ | ✅ | ✅ |
| **Aplicar sanção** | ❌ | ❌ | ✅ | ✅ |
| **Remover sanção** | ❌ | ❌ | ❌ | ✅ |
| **Descredenciar** | ❌ | ❌ | ❌ | ✅ |
| **Contestar ocorrência** | ✅ | ❌ | ❌ | ❌ |

### Regras Especiais
- Descredenciamento requer role admin
- Sanções graves requerem múltiplas evidências
- Credenciados têm 15 dias para contestar ocorrências

---

## 9. Módulo: Certificados

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver certificado próprio** | ✅ | ❌ | ❌ | ❌ |
| **Ver todos certificados** | ❌ | ✅ | ✅ | ✅ |
| **Gerar certificado** | ❌ (auto) | ❌ | ✅ | ✅ |
| **Download PDF** | ✅ (próprio) | ✅ | ✅ | ✅ |
| **Cancelar certificado** | ❌ | ❌ | ❌ | ✅ |
| **Consultar público** | ✅ | ✅ | ✅ | ✅ |
| **Ver histórico** | ✅ (próprio) | ✅ | ✅ | ✅ |

### Regras Especiais
- Certificados de regularidade são públicos (consulta por código)
- Sistema gera certificados automaticamente após credenciamento
- Cancelamento deixa registro permanente no histórico

---

## 10. Módulo: Notificações

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver próprias notificações** | ✅ | ✅ | ✅ | ✅ |
| **Marcar como lida** | ✅ | ✅ | ✅ | ✅ |
| **Criar notificação customizada** | ❌ | ❌ | ✅ | ✅ |
| **Deletar notificações** | ❌ | ❌ | ❌ | ✅ |

### Regras Especiais
- Sistema cria notificações automaticamente via triggers
- Notificações expiram após 90 dias
- Badge contador atualiza em tempo real via realtime subscription

---

## 11. Módulo: Auditoria

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Ver logs próprios** | ❌ | ❌ | ❌ | ❌ |
| **Ver todos logs** | ❌ | ❌ | ✅ | ✅ |
| **Exportar logs** | ❌ | ❌ | ❌ | ✅ |
| **Deletar logs** | ❌ | ❌ | ❌ | ❌ |

### Regras Especiais
- Logs são imutáveis e retidos por 5 anos
- Apenas admin pode exportar logs para auditoria
- Ninguém pode deletar logs (apenas arquivamento automático)

---

## 12. Permissões Especiais: Afastamentos

| Operação | candidato | analista | gestor | admin |
|----------|-----------|----------|--------|-------|
| **Solicitar afastamento** | ✅ | ❌ | ❌ | ❌ |
| **Ver afastamentos próprios** | ✅ | ❌ | ❌ | ❌ |
| **Ver todos afastamentos** | ❌ | ✅ | ✅ | ✅ |
| **Aprovar afastamento** | ❌ | ❌ | ✅ | ✅ |
| **Rejeitar afastamento** | ❌ | ❌ | ✅ | ✅ |
| **Cancelar afastamento** | ✅ (próprio) | ❌ | ✅ | ✅ |

### Regras Especiais
- Afastamento altera status para "Em Afastamento"
- Requer upload de documentos justificativos
- Prazo máximo depende do tipo de afastamento

---

## Resumo de Hierarquia de Permissões

```
admin (total)
  ↓
gestor (supervisão + aprovações)
  ↓
analista (análise + visualização)
  ↓
candidato (próprios dados + ações limitadas)
  ↓
público (dados públicos de credenciados ativos)
```

## RLS (Row Level Security)

Todas as tabelas implementam RLS com políticas baseadas em:
- `auth.uid()` - ID do usuário logado
- `has_role(auth.uid(), 'role')` - Verificação de role
- Foreign keys para garantir acesso apenas a dados relacionados

**Exemplo de política comum:**
```sql
-- Usuário vê apenas seus próprios registros
CREATE POLICY "users_select_own" ON table_name
  FOR SELECT USING (user_id = auth.uid());

-- Gestores veem tudo
CREATE POLICY "managers_select_all" ON table_name
  FOR SELECT USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));
```
