import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes unitários para funções de geocoding
 */

// Mock da função de geocoding
interface GeocodingResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  provider: string;
  cached?: boolean;
  error?: string;
  attempts?: number;
}

interface GeocodingOptions {
  maxRetries?: number;
  retryDelay?: number;
  provider?: 'nominatim' | 'mapbox';
}

async function geocodeWithRetry(
  address: string,
  options: GeocodingOptions = {}
): Promise<GeocodingResult> {
  const { maxRetries = 3, retryDelay = 1000, provider = 'nominatim' } = options;
  
  let attempts = 0;
  let lastError: Error | null = null;
  
  while (attempts < maxRetries) {
    attempts++;
    
    try {
      // Simular chamada à API de geocoding
      const response = await fetch(`https://api.${provider}.com/geocode`, {
        method: 'POST',
        body: JSON.stringify({ address }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        latitude: data.lat,
        longitude: data.lon,
        provider,
        attempts,
      };
    } catch (error) {
      lastError = error as Error;
      
      // Se não for última tentativa, aguardar antes de retry
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  return {
    success: false,
    provider,
    attempts,
    error: lastError?.message || 'Unknown error',
  };
}

describe('Geocoding Functions', () => {
  beforeEach(() => {
    // Limpar mocks antes de cada teste
    vi.clearAllMocks();
  });

  describe('geocodeWithRetry', () => {
    it('deve retornar sucesso quando API responde corretamente', async () => {
      // Mock fetch bem-sucedido
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ lat: -23.5505, lon: -46.6333 }),
      });

      const result = await geocodeWithRetry('Rua Teste, 123, São Paulo, SP');

      expect(result.success).toBe(true);
      expect(result.latitude).toBe(-23.5505);
      expect(result.longitude).toBe(-46.6333);
      expect(result.provider).toBe('nominatim');
      expect(result.attempts).toBe(1);
    });

    it('deve fazer retry quando API falha temporariamente', async () => {
      // Mock: primeira chamada falha, segunda sucede
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ lat: -23.5505, lon: -46.6333 }),
        });
      });

      const result = await geocodeWithRetry('Rua Teste, 123', {
        maxRetries: 3,
        retryDelay: 10, // Delay curto para teste
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('deve retornar erro após esgotar todas as tentativas', async () => {
      // Mock: todas as chamadas falham
      global.fetch = vi.fn().mockRejectedValue(new Error('Provider timeout'));

      const result = await geocodeWithRetry('Endereço inválido', {
        maxRetries: 3,
        retryDelay: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Provider timeout');
      expect(result.attempts).toBe(3);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('deve retornar erro quando API retorna HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      const result = await geocodeWithRetry('Rua Teste, 123', {
        maxRetries: 2,
        retryDelay: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 429');
      expect(result.attempts).toBe(2);
    });

    it('deve usar provider alternativo quando especificado', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ lat: -23.5505, lon: -46.6333 }),
      });

      const result = await geocodeWithRetry('Rua Teste, 123', {
        provider: 'mapbox',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('mapbox');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('mapbox'),
        expect.any(Object)
      );
    });

    it('deve usar valores default quando opções não são fornecidas', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Error'));

      const result = await geocodeWithRetry('Rua Teste');

      expect(result.attempts).toBe(3); // maxRetries default
      expect(result.provider).toBe('nominatim'); // provider default
    });
  });

  describe('Cache de Geocoding', () => {
    it('deve usar cache quando disponível', async () => {
      const cache = new Map<string, GeocodingResult>();
      const address = 'Rua Teste, 123';
      
      // Adicionar resultado ao cache
      cache.set(address, {
        success: true,
        latitude: -23.5505,
        longitude: -46.6333,
        provider: 'nominatim',
        cached: true,
      });

      // Simular função que usa cache
      const geocodeWithCache = async (addr: string): Promise<GeocodingResult> => {
        const cached = cache.get(addr);
        if (cached) {
          return { ...cached, cached: true };
        }
        return geocodeWithRetry(addr);
      };

      const result = await geocodeWithCache(address);

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.latitude).toBe(-23.5505);
    });

    it('deve calcular hash de endereço corretamente', () => {
      const normalizeAddress = (addr: string): string => {
        return addr
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ');
      };

      const addr1 = 'Rua Teste, 123, São Paulo';
      const addr2 = '  rua  teste,  123,  são  paulo  ';

      expect(normalizeAddress(addr1)).toBe(normalizeAddress(addr2));
    });
  });

  describe('Validação de Coordenadas', () => {
    it('deve validar latitude dentro do range válido', () => {
      const isValidLatitude = (lat: number): boolean => {
        return lat >= -90 && lat <= 90;
      };

      expect(isValidLatitude(-23.5505)).toBe(true);
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(-91)).toBe(false);
    });

    it('deve validar longitude dentro do range válido', () => {
      const isValidLongitude = (lon: number): boolean => {
        return lon >= -180 && lon <= 180;
      };

      expect(isValidLongitude(-46.6333)).toBe(true);
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(-181)).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('deve respeitar rate limit entre chamadas', async () => {
      const rateLimiter = {
        lastCall: 0,
        minInterval: 100, // ms
        
        async waitIfNeeded() {
          const now = Date.now();
          const timeSinceLastCall = now - this.lastCall;
          
          if (timeSinceLastCall < this.minInterval) {
            await new Promise(resolve => 
              setTimeout(resolve, this.minInterval - timeSinceLastCall)
            );
          }
          
          this.lastCall = Date.now();
        },
      };

      const start = Date.now();
      
      await rateLimiter.waitIfNeeded();
      await rateLimiter.waitIfNeeded();
      
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });
});
