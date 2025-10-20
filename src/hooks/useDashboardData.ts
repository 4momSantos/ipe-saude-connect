import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MockDataGenerator, USE_MOCK } from '@/mocks/dashboardData';

// Tipos para os dados dos dashboards
export type DadosCredenciamentos = ReturnType<typeof MockDataGenerator.gerarDadosCredenciamentos>;
export type DadosPrazos = ReturnType<typeof MockDataGenerator.gerarDadosPrazos>;
export type DadosRelatorioDocumentos = ReturnType<typeof MockDataGenerator.gerarRelatorioDocumentos>;
export type DadosConformidade = ReturnType<typeof MockDataGenerator.gerarDadosConformidade>;

// 4.2.25 - Dashboard de Credenciamentos
export function useDadosCredenciamentos() {
  return useQuery<DadosCredenciamentos>({
    queryKey: ['dashboard-credenciamentos'],
    queryFn: async () => {
      if (USE_MOCK) {
        console.log('🎨 [MOCK] Usando dados mockados - Credenciamentos');
        await new Promise(resolve => setTimeout(resolve, 500));
        return MockDataGenerator.gerarDadosCredenciamentos();
      }

      // Query real será implementada quando backend estiver pronto
      return MockDataGenerator.gerarDadosCredenciamentos();
    }
  });
}

// 4.2.26 - Dashboard de Prazos
export function useDadosPrazos() {
  return useQuery<DadosPrazos>({
    queryKey: ['dashboard-prazos'],
    queryFn: async () => {
      if (USE_MOCK) {
        console.log('🎨 [MOCK] Usando dados mockados - Prazos');
        await new Promise(resolve => setTimeout(resolve, 500));
        return MockDataGenerator.gerarDadosPrazos();
      }

      // Query real será implementada quando backend estiver pronto
      return MockDataGenerator.gerarDadosPrazos();
    }
  });
}

// 4.2.27 - Relatório de Documentos
export function useDadosRelatorioDocumentos() {
  return useQuery<DadosRelatorioDocumentos>({
    queryKey: ['relatorio-documentos'],
    queryFn: async () => {
      if (USE_MOCK) {
        console.log('🎨 [MOCK] Usando dados mockados - Relatório Documentos');
        await new Promise(resolve => setTimeout(resolve, 500));
        return MockDataGenerator.gerarRelatorioDocumentos();
      }

      // Query real será implementada quando backend estiver pronto
      return MockDataGenerator.gerarRelatorioDocumentos();
    }
  });
}

// 4.2.36 - Análise de Conformidade
export function useDadosConformidade() {
  return useQuery<DadosConformidade>({
    queryKey: ['analise-conformidade'],
    queryFn: async () => {
      if (USE_MOCK) {
        console.log('🎨 [MOCK] Usando dados mockados - Conformidade');
        await new Promise(resolve => setTimeout(resolve, 500));
        return MockDataGenerator.gerarDadosConformidade();
      }

      // Query real será implementada quando backend estiver pronto
      return MockDataGenerator.gerarDadosConformidade();
    }
  });
}
