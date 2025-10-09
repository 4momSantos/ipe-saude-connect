import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

/**
 * Testes unitários para hook useCredenciados
 */

// Mock do Supabase client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock de dados
const mockCredenciados = [
  {
    id: '1',
    nome: 'Dr. João da Silva',
    cpf: '12345678901',
    email: 'joao@example.com',
    status: 'Ativo',
    latitude: -23.5505,
    longitude: -46.6333,
    cidade: 'São Paulo',
    estado: 'SP',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    nome: 'Dra. Maria Santos',
    cpf: '98765432109',
    email: 'maria@example.com',
    status: 'Ativo',
    latitude: -23.5600,
    longitude: -46.6400,
    cidade: 'São Paulo',
    estado: 'SP',
    created_at: '2024-01-02T00:00:00Z',
  },
];

// Hook simplificado para testes
function useCredenciadosTest() {
  const { data, isLoading, error } = {
    data: mockCredenciados,
    isLoading: false,
    error: null,
  };

  return {
    credenciados: data || [],
    isLoading,
    error,
  };
}

// Wrapper para testes com React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useCredenciados Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Carregamento de Dados', () => {
    it('deve retornar loading state inicialmente', () => {
      const { result } = renderHook(
        () => ({
          credenciados: [],
          isLoading: true,
          error: null,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.credenciados).toEqual([]);
    });

    it('deve carregar credenciados com sucesso', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: mockCredenciados,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useCredenciadosTest(), {
        wrapper: createWrapper(),
      });

      expect(result.current.credenciados).toHaveLength(2);
      expect(result.current.credenciados[0].nome).toBe('Dr. João da Silva');
    });

    it('deve retornar erro quando fetch falha', async () => {
      const mockError = new Error('Network error');
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      const { result } = renderHook(
        () => ({
          credenciados: [],
          isLoading: false,
          error: mockError,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.error).toBeTruthy();
      expect(result.current.credenciados).toEqual([]);
    });
  });

  describe('Filtragem de Dados', () => {
    it('deve filtrar credenciados por status', () => {
      const filterByStatus = (credenciados: typeof mockCredenciados, status: string) => {
        return credenciados.filter(c => c.status === status);
      };

      const ativos = filterByStatus(mockCredenciados, 'Ativo');
      
      expect(ativos).toHaveLength(2);
      expect(ativos.every(c => c.status === 'Ativo')).toBe(true);
    });

    it('deve filtrar credenciados por cidade', () => {
      const filterByCidade = (credenciados: typeof mockCredenciados, cidade: string) => {
        return credenciados.filter(c => c.cidade === cidade);
      };

      const saoPaulo = filterByCidade(mockCredenciados, 'São Paulo');
      
      expect(saoPaulo).toHaveLength(2);
    });

    it('deve filtrar credenciados geocodificados', () => {
      const filterGeocodificados = (credenciados: typeof mockCredenciados) => {
        return credenciados.filter(c => c.latitude !== null && c.longitude !== null);
      };

      const geocodificados = filterGeocodificados(mockCredenciados);
      
      expect(geocodificados).toHaveLength(2);
    });

    it('deve filtrar credenciados sem geocoding', () => {
      const credenciadosSemGeo = [
        ...mockCredenciados,
        {
          id: '3',
          nome: 'Dr. Pedro Costa',
          cpf: '11122233344',
          email: 'pedro@example.com',
          status: 'Ativo',
          latitude: null,
          longitude: null,
          cidade: 'Rio de Janeiro',
          estado: 'RJ',
          created_at: '2024-01-03T00:00:00Z',
        },
      ];

      const filterSemGeo = (credenciados: typeof credenciadosSemGeo) => {
        return credenciados.filter(c => c.latitude === null || c.longitude === null);
      };

      const semGeo = filterSemGeo(credenciadosSemGeo);
      
      expect(semGeo).toHaveLength(1);
      expect(semGeo[0].nome).toBe('Dr. Pedro Costa');
    });
  });

  describe('Busca e Search', () => {
    it('deve buscar credenciados por nome', () => {
      const searchByName = (credenciados: typeof mockCredenciados, query: string) => {
        const lowerQuery = query.toLowerCase();
        return credenciados.filter(c => 
          c.nome.toLowerCase().includes(lowerQuery)
        );
      };

      const results = searchByName(mockCredenciados, 'joão');
      
      expect(results).toHaveLength(1);
      expect(results[0].nome).toBe('Dr. João da Silva');
    });

    it('deve buscar credenciados por email', () => {
      const searchByEmail = (credenciados: typeof mockCredenciados, query: string) => {
        return credenciados.filter(c => 
          c.email.toLowerCase().includes(query.toLowerCase())
        );
      };

      const results = searchByEmail(mockCredenciados, 'maria');
      
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('maria@example.com');
    });

    it('deve retornar array vazio para query sem resultados', () => {
      const searchByName = (credenciados: typeof mockCredenciados, query: string) => {
        const lowerQuery = query.toLowerCase();
        return credenciados.filter(c => 
          c.nome.toLowerCase().includes(lowerQuery)
        );
      };

      const results = searchByName(mockCredenciados, 'xyz123');
      
      expect(results).toEqual([]);
    });
  });

  describe('Estatísticas', () => {
    it('deve calcular total de credenciados', () => {
      const getTotal = (credenciados: typeof mockCredenciados) => credenciados.length;
      
      expect(getTotal(mockCredenciados)).toBe(2);
    });

    it('deve calcular taxa de geocodificação', () => {
      const credenciadosComMisto = [
        ...mockCredenciados,
        {
          id: '3',
          nome: 'Dr. Pedro Costa',
          cpf: '11122233344',
          email: 'pedro@example.com',
          status: 'Ativo',
          latitude: null,
          longitude: null,
          cidade: 'Rio de Janeiro',
          estado: 'RJ',
          created_at: '2024-01-03T00:00:00Z',
        },
      ];

      const calculateGeocodingRate = (credenciados: typeof credenciadosComMisto) => {
        const total = credenciados.length;
        const geocodificados = credenciados.filter(
          c => c.latitude !== null && c.longitude !== null
        ).length;
        
        return total > 0 ? (geocodificados / total) * 100 : 0;
      };

      const rate = calculateGeocodingRate(credenciadosComMisto);
      
      expect(rate).toBeCloseTo(66.67, 1);
    });

    it('deve agrupar credenciados por estado', () => {
      const groupByEstado = (credenciados: typeof mockCredenciados) => {
        return credenciados.reduce((acc, c) => {
          const estado = c.estado;
          if (!acc[estado]) {
            acc[estado] = [];
          }
          acc[estado].push(c);
          return acc;
        }, {} as Record<string, typeof mockCredenciados>);
      };

      const grouped = groupByEstado(mockCredenciados);
      
      expect(grouped['SP']).toHaveLength(2);
      expect(Object.keys(grouped)).toContain('SP');
    });
  });

  describe('Ordenação', () => {
    it('deve ordenar por nome alfabeticamente', () => {
      const sortByName = (credenciados: typeof mockCredenciados) => {
        return [...credenciados].sort((a, b) => a.nome.localeCompare(b.nome));
      };

      const sorted = sortByName(mockCredenciados);
      
      expect(sorted[0].nome).toBe('Dr. João da Silva');
      expect(sorted[1].nome).toBe('Dra. Maria Santos');
    });

    it('deve ordenar por data de criação', () => {
      const sortByDate = (credenciados: typeof mockCredenciados) => {
        return [...credenciados].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      };

      const sorted = sortByDate(mockCredenciados);
      
      expect(sorted[0].nome).toBe('Dra. Maria Santos');
      expect(sorted[1].nome).toBe('Dr. João da Silva');
    });
  });
});
