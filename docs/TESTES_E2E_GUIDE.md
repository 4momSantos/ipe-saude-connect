# 🧪 Guia de Testes E2E e Unitários

Este documento fornece instruções completas para executar testes E2E (End-to-End) com Playwright e testes unitários com Vitest no sistema de credenciamento.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração do Ambiente](#configuração-do-ambiente)
3. [Testes E2E (Playwright)](#testes-e2e-playwright)
4. [Testes Unitários (Vitest)](#testes-unitários-vitest)
5. [CI/CD](#cicd)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### Testes E2E (Playwright)

Testa o fluxo completo de credenciamento:
1. ✅ Criação de edital
2. ✅ Criação de inscrição de candidato
3. ✅ Aprovação via API
4. ✅ Geração de contrato
5. ✅ Simulação de webhook Assinafy (documento assinado)
6. ✅ Criação automática de credenciado
7. ✅ Geocodificação
8. ✅ Validação de marcador no mapa

### Testes Unitários (Vitest)

- ✅ Função de geocoding (retry, erro, cache)
- ✅ Hook `useCredenciados` (estados, filtros, busca)
- ✅ Validação de coordenadas
- ✅ Rate limiting
- ✅ Normalização de endereços

---

## ⚙️ Configuração do Ambiente

### 1. Instalar Dependências

```bash
npm install
```

Pacotes instalados:
- `@playwright/test` - Framework E2E
- `vitest` - Framework de testes unitários
- `@testing-library/react` - Utilitários de teste React
- `@testing-library/react-hooks` - Testes de hooks
- `@vitest/ui` - Interface visual para Vitest

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.test` na raiz do projeto:

```env
# Supabase (usar projeto de teste ou staging)
VITE_SUPABASE_URL=https://ncmofeencqpqhtguxmvy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# URL da aplicação
VITE_APP_URL=http://localhost:8080

# Assinafy (opcional, para testes de integração)
ASSINAFY_API_KEY=test_key
ASSINAFY_WEBHOOK_SECRET=test_secret
```

⚠️ **IMPORTANTE**: Use um projeto Supabase de **teste/staging**, não produção!

### 3. Instalar Browsers Playwright

```bash
npx playwright install
```

---

## 🎭 Testes E2E (Playwright)

### Estrutura de Testes

```
tests/
├── e2e/
│   └── credenciamento-flow.spec.ts  # Fluxo completo
├── helpers/
│   ├── api-helpers.ts               # Funções auxiliares API
│   └── test-data.ts                 # Dados mock
└── screenshots/                      # Screenshots de evidência
```

### Executar Testes E2E

#### Modo Headless (CI)

```bash
npm run test:e2e
```

#### Modo UI (Desenvolvimento)

```bash
npx playwright test --ui
```

#### Modo Debug

```bash
npx playwright test --debug
```

#### Executar Teste Específico

```bash
npx playwright test credenciamento-flow
```

### Relatórios

Após executar os testes, abra o relatório HTML:

```bash
npx playwright show-report
```

### Evidências

Screenshots são salvos automaticamente em:
- `tests/screenshots/` - Evidências manuais
- `test-results/` - Screenshots de falhas (automático)

---

## 🧪 Testes Unitários (Vitest)

### Estrutura de Testes

```
tests/
├── unit/
│   ├── geocoding.test.ts       # Testes de geocoding
│   └── useCredenciados.test.ts # Testes de hooks
└── setup.ts                     # Configuração global
```

### Executar Testes Unitários

#### Modo Watch (Desenvolvimento)

```bash
npm run test:unit
```

#### Executar Uma Vez

```bash
npm run test:unit:run
```

#### Com Cobertura

```bash
npm run test:coverage
```

#### Interface Visual

```bash
npm run test:ui
```

Abre interface em `http://localhost:51204/__vitest__/`

### Testes Incluídos

#### 1. `geocoding.test.ts`

✅ **Retry Logic**
- Sucesso na primeira tentativa
- Retry após falha temporária
- Erro após esgotar tentativas

✅ **Providers**
- Nominatim
- Mapbox
- Fallback automático

✅ **Cache**
- Hit de cache
- Miss de cache
- Normalização de endereço

✅ **Validações**
- Latitude válida (-90 a 90)
- Longitude válida (-180 a 180)

✅ **Rate Limiting**
- Respeito ao intervalo mínimo

#### 2. `useCredenciados.test.ts`

✅ **Estados**
- Loading inicial
- Sucesso com dados
- Erro de rede

✅ **Filtragem**
- Por status (Ativo/Inativo)
- Por cidade
- Por geocodificação (com/sem)

✅ **Busca**
- Por nome
- Por email
- Caso vazio

✅ **Estatísticas**
- Total de credenciados
- Taxa de geocodificação
- Agrupamento por estado

✅ **Ordenação**
- Alfabética por nome
- Por data de criação

---

## 🔄 CI/CD

### GitHub Actions

Exemplo de workflow `.github/workflows/tests.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit:run
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      
      - name: Upload Playwright Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## 🐛 Troubleshooting

### Problema: Testes E2E Falhando com Timeout

**Solução:**
- Aumentar timeout no `playwright.config.ts`:
  ```ts
  use: {
    actionTimeout: 15000,
    navigationTimeout: 30000,
  }
  ```
- Verificar se dev server está rodando
- Verificar conexão com Supabase

### Problema: Credenciado Não Geocodificado

**Solução:**
- Verificar variáveis de ambiente do geocoding provider
- Aumentar timeout de `waitForCondition`:
  ```ts
  await waitForCondition(checkFn, 60000); // 60s
  ```
- Verificar logs da edge function `geocodificar-credenciado`

### Problema: Testes Unitários Falhando

**Solução:**
- Limpar cache do Vitest:
  ```bash
  npx vitest run --clearCache
  ```
- Verificar mocks do Supabase client
- Verificar setup em `tests/setup.ts`

### Problema: "Can't find module @/integrations/supabase/client"

**Solução:**
- Verificar `tsconfig.json` com alias `@`:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@/*": ["./src/*"]
      }
    }
  }
  ```
- Verificar `vitest.config.ts` com resolve alias

### Problema: Navegadores Playwright Não Instalados

**Solução:**
```bash
npx playwright install
# ou para incluir dependências do sistema
npx playwright install --with-deps
```

---

## 📊 Métricas de Teste

### Cobertura Esperada

- **Geocoding**: > 80%
- **Hooks**: > 75%
- **E2E Flow**: 100% (caminho feliz)

### Tempo de Execução

- **Testes Unitários**: ~10-30s
- **Testes E2E**: ~2-5 min (depende do geocoding real)

---

## 🎯 Próximos Passos

1. [ ] Adicionar testes E2E para fluxo de rejeição
2. [ ] Adicionar testes de performance (Lighthouse CI)
3. [ ] Adicionar testes de acessibilidade (axe-core)
4. [ ] Adicionar testes visuais (Percy/Chromatic)
5. [ ] Configurar execução paralela de testes

---

## 📚 Recursos

- [Playwright Docs](https://playwright.dev/)
- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Supabase Testing](https://supabase.com/docs/guides/getting-started/local-development#testing)

---

**Tempo estimado de implementação**: 60-90 minutos
**Última atualização**: 2025-01-09
