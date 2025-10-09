import { test, expect } from '@playwright/test';
import {
  createTestUser,
  createTestEdital,
  createTestInscricao,
  aprovarInscricao,
  gerarContrato,
  simularAssinafyWebhook,
  geocodificarCredenciado,
  waitForCondition,
  cleanupTestData,
  supabaseAdmin,
  type TestUser,
  type TestEdital,
  type TestInscricao,
} from '../helpers/api-helpers';

test.describe('Fluxo Completo de Credenciamento', () => {
  let gestor: TestUser;
  let candidato: TestUser;
  let analista: TestUser;
  let edital: TestEdital;
  let inscricao: TestInscricao;
  let credenciadoId: string;

  test.beforeAll(async () => {
    // Criar usuários de teste
    gestor = await createTestUser(
      `gestor.${Date.now()}@example.com`,
      'Test@123456',
      'gestor'
    );
    
    candidato = await createTestUser(
      `candidato.${Date.now()}@example.com`,
      'Test@123456',
      'candidato'
    );
    
    analista = await createTestUser(
      `analista.${Date.now()}@example.com`,
      'Test@123456',
      'analista'
    );

    console.log('✅ Usuários criados:', { gestor: gestor.email, candidato: candidato.email, analista: analista.email });
  });

  test.afterAll(async () => {
    // Cleanup
    await cleanupTestData(gestor.id);
    await cleanupTestData(candidato.id);
    await cleanupTestData(analista.id);
    if (edital) {
      await cleanupTestData(undefined, edital.id);
    }
  });

  test('deve criar edital via API', async () => {
    edital = await createTestEdital(gestor.id);
    
    expect(edital.id).toBeTruthy();
    expect(edital.titulo).toContain('Edital de Teste');
    
    console.log('✅ Edital criado:', edital.numero_edital);
  });

  test('deve criar inscrição de candidato via API', async () => {
    inscricao = await createTestInscricao(edital.id, candidato.id);
    
    expect(inscricao.id).toBeTruthy();
    expect(inscricao.edital_id).toBe(edital.id);
    expect(inscricao.candidato_id).toBe(candidato.id);
    
    console.log('✅ Inscrição criada:', inscricao.id);
  });

  test('deve aprovar inscrição via API', async () => {
    await aprovarInscricao(inscricao.id, analista.id);
    
    // Verificar status
    const { data } = await supabaseAdmin
      .from('inscricoes_edital')
      .select('status')
      .eq('id', inscricao.id)
      .single();
    
    expect(data?.status).toBe('aprovado');
    
    console.log('✅ Inscrição aprovada');
  });

  test('deve gerar contrato via API', async () => {
    const result = await gerarContrato(inscricao.id);
    
    expect(result.contrato_id).toBeTruthy();
    
    // Verificar contrato criado
    const { data } = await supabaseAdmin
      .from('contratos')
      .select('*')
      .eq('inscricao_id', inscricao.id)
      .single();
    
    expect(data).toBeTruthy();
    expect(data?.status).toBe('pendente_assinatura');
    
    console.log('✅ Contrato gerado:', result.contrato_id);
  });

  test('deve simular webhook Assinafy com documento assinado', async () => {
    await simularAssinafyWebhook(inscricao.id);
    
    // Aguardar processamento
    await waitForCondition(async () => {
      const { data } = await supabaseAdmin
        .from('contratos')
        .select('status')
        .eq('inscricao_id', inscricao.id)
        .single();
      
      return data?.status === 'assinado';
    }, 10000);
    
    // Verificar contrato assinado
    const { data: contrato } = await supabaseAdmin
      .from('contratos')
      .select('status, assinado_em')
      .eq('inscricao_id', inscricao.id)
      .single();
    
    expect(contrato?.status).toBe('assinado');
    expect(contrato?.assinado_em).toBeTruthy();
    
    console.log('✅ Webhook Assinafy simulado e processado');
  });

  test('deve criar credenciado automaticamente', async () => {
    // Aguardar criação do credenciado (trigger automático)
    await waitForCondition(async () => {
      const { data } = await supabaseAdmin
        .from('credenciados')
        .select('id')
        .eq('inscricao_id', inscricao.id)
        .single();
      
      if (data?.id) {
        credenciadoId = data.id;
        return true;
      }
      return false;
    }, 15000);
    
    expect(credenciadoId).toBeTruthy();
    
    // Verificar dados do credenciado
    const { data: credenciado } = await supabaseAdmin
      .from('credenciados')
      .select('*')
      .eq('id', credenciadoId)
      .single();
    
    expect(credenciado?.nome).toBe('Dr. João da Silva');
    expect(credenciado?.status).toBe('Ativo');
    expect(credenciado?.email).toBe('joao.silva@example.com');
    
    console.log('✅ Credenciado criado:', credenciadoId);
  });

  test('deve geocodificar credenciado', async () => {
    await geocodificarCredenciado(credenciadoId);
    
    // Aguardar geocodificação
    await waitForCondition(async () => {
      const { data } = await supabaseAdmin
        .from('credenciados')
        .select('latitude, longitude')
        .eq('id', credenciadoId)
        .single();
      
      return !!data?.latitude && !!data?.longitude;
    }, 15000);
    
    // Verificar lat/lon preenchidos
    const { data: credenciado } = await supabaseAdmin
      .from('credenciados')
      .select('latitude, longitude, geocoded_at')
      .eq('id', credenciadoId)
      .single();
    
    expect(credenciado?.latitude).toBeTruthy();
    expect(credenciado?.longitude).toBeTruthy();
    expect(credenciado?.geocoded_at).toBeTruthy();
    
    console.log('✅ Credenciado geocodificado:', {
      lat: credenciado?.latitude,
      lon: credenciado?.longitude,
    });
  });

  test('deve exibir marcador no mapa', async ({ page }) => {
    // Navegar para página do mapa
    await page.goto('/analises-relatorios');
    
    // Aguardar carregamento
    await page.waitForLoadState('networkidle');
    
    // Clicar na aba "Mapa de Rede"
    await page.click('text=Mapa de Rede');
    
    // Aguardar mapa carregar
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    
    // Aguardar marcadores
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 15000 });
    
    // Verificar se existe marcador
    const markers = await page.locator('.leaflet-marker-icon').count();
    expect(markers).toBeGreaterThan(0);
    
    console.log('✅ Mapa carregado com', markers, 'marcadores');
    
    // Tentar encontrar marcador específico (via popup)
    const firstMarker = page.locator('.leaflet-marker-icon').first();
    await firstMarker.click();
    
    // Aguardar popup
    await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 });
    
    // Verificar conteúdo do popup
    const popupContent = await page.locator('.leaflet-popup-content').textContent();
    expect(popupContent).toBeTruthy();
    
    console.log('✅ Popup exibido:', popupContent?.substring(0, 100));
    
    // Screenshot para evidência
    await page.screenshot({ path: 'tests/screenshots/mapa-credenciado.png', fullPage: true });
  });

  test('deve pesquisar credenciado no mapa', async ({ page }) => {
    await page.goto('/analises-relatorios');
    await page.click('text=Mapa de Rede');
    
    // Abrir filtros
    await page.click('text=Filtros');
    
    // Pesquisar por nome
    await page.fill('input[placeholder*="Pesquisar"]', 'João da Silva');
    
    // Aguardar filtro aplicar
    await page.waitForTimeout(1000);
    
    // Verificar badge de filtros ativos
    const filterBadge = page.locator('text=1 filtro ativo');
    await expect(filterBadge).toBeVisible();
    
    console.log('✅ Pesquisa no mapa funcionando');
  });

  test('deve filtrar por especialidade', async ({ page }) => {
    await page.goto('/analises-relatorios');
    await page.click('text=Mapa de Rede');
    
    // Abrir filtros
    await page.click('text=Filtros');
    
    // Selecionar especialidade
    const especialidadeSelect = page.locator('[role="combobox"]').first();
    await especialidadeSelect.click();
    
    // Selecionar Cardiologia
    await page.click('text=Cardiologia');
    
    // Aguardar filtro aplicar
    await page.waitForTimeout(1000);
    
    // Verificar que filtro foi aplicado
    const filterCount = page.locator('text=/\\d+ filtros? ativos?/');
    await expect(filterCount).toBeVisible();
    
    console.log('✅ Filtro por especialidade funcionando');
  });
});
