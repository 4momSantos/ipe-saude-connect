# 📝 Exemplos Práticos de Enriquecimento OSM

Este documento fornece exemplos práticos de como usar o sistema de enriquecimento de endereços via OSM.

---

## 🎯 Casos de Uso

### 1. Enriquecer Credenciado Individual (Frontend)

```typescript
import { useEnriquecerEndereco } from "@/hooks/useEnriquecerEndereco";

function CredenciadoDetail({ credenciadoId }: { credenciadoId: string }) {
  const { enriquecer, isLoading } = useEnriquecerEndereco();

  const handleEnrich = async () => {
    try {
      const result = await enriquecer({ credenciadoId });
      console.log('Dados enriquecidos:', result);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <Button onClick={handleEnrich} disabled={isLoading}>
      {isLoading ? 'Enriquecendo...' : 'Enriquecer Endereço'}
    </Button>
  );
}
```

---

### 2. Enriquecimento Automático Após Geocodificação

Adicionar ao final de `geocodificar-credenciado`:

```typescript
// Em geocodificar-credenciado/index.ts

// Após geocodificar com sucesso
if (geocodingResult.success && geocodingResult.latitude) {
  console.log('[AUTO_ENRICH] Enriquecendo endereço automaticamente...');
  
  // Chamar função de enriquecimento
  const { error: enrichError } = await supabase.functions.invoke(
    'enriquecer-endereco-osm',
    {
      body: { credenciado_id: credenciadoId }
    }
  );

  if (enrichError) {
    console.warn('[AUTO_ENRICH] Erro ao enriquecer (não crítico):', enrichError);
  } else {
    console.log('[AUTO_ENRICH] Endereço enriquecido com sucesso');
  }
}
```

---

### 3. Processar Lote via SQL Function

```sql
-- Criar função para enriquecer em lote
CREATE OR REPLACE FUNCTION public.enrich_credenciados_batch(
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  credenciado_id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credenciado RECORD;
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_response JSONB;
BEGIN
  -- Obter configurações
  v_supabase_url := current_setting('app.settings', true)::json->>'api_url';
  v_service_key := current_setting('app.settings', true)::json->>'service_role_key';
  
  -- Processar credenciados
  FOR v_credenciado IN 
    SELECT id, nome
    FROM credenciados
    WHERE latitude IS NOT NULL
      AND status = 'Ativo'
    LIMIT p_limit
  LOOP
    -- Chamar edge function
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/enriquecer-endereco-osm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object('credenciado_id', v_credenciado.id)
    ) INTO v_response;
    
    RETURN QUERY SELECT 
      v_credenciado.id,
      true,
      'Processado: ' || v_credenciado.nome;
    
    -- Rate limit
    PERFORM pg_sleep(1.1);
  END LOOP;
END;
$$;

-- Executar
SELECT * FROM public.enrich_credenciados_batch(20);
```

---

### 4. Validação de Dados Pós-Enriquecimento

```typescript
// Verificar qualidade do enriquecimento
async function auditEnrichment() {
  const { data: credenciados } = await supabase
    .from('credenciados')
    .select('id, nome, endereco, cidade, estado, cep, latitude, longitude')
    .eq('status', 'Ativo')
    .limit(100);

  const issues = {
    semBairro: 0,
    semCEP: 0,
    semCidade: 0,
    enderecoSimples: 0,
  };

  for (const c of credenciados || []) {
    if (!c.endereco || !c.endereco.includes(',')) {
      issues.enderecoSimples++;
    }
    if (!c.cep) {
      issues.semCEP++;
    }
    if (!c.cidade) {
      issues.semCidade++;
    }
  }

  console.log('📊 Auditoria de Enriquecimento:', issues);
  
  return issues;
}
```

---

### 5. Comparar OSM vs. Dados Informados

```typescript
async function compareOSMData(credenciadoId: string) {
  // 1. Buscar dados do credenciado
  const { data: credenciado } = await supabase
    .from('credenciados')
    .select('*')
    .eq('id', credenciadoId)
    .single();

  // 2. Buscar dados do OSM
  const { data: osmData } = await supabase.functions.invoke(
    'enriquecer-endereco-osm',
    {
      body: { 
        latitude: credenciado.latitude,
        longitude: credenciado.longitude 
      }
    }
  );

  // 3. Comparar
  const divergencias = {
    cidade: credenciado.cidade !== osmData.cidade,
    estado: credenciado.estado !== osmData.estado,
    cep: credenciado.cep !== osmData.cep,
  };

  if (Object.values(divergencias).some(d => d)) {
    console.warn('⚠️ Divergências encontradas:', divergencias);
    console.log('Credenciado:', {
      cidade: credenciado.cidade,
      estado: credenciado.estado,
      cep: credenciado.cep,
    });
    console.log('OSM:', {
      cidade: osmData.cidade,
      estado: osmData.estado,
      cep: osmData.cep,
    });
  }

  return divergencias;
}
```

---

### 6. Enriquecimento Preventivo em Formulário

```typescript
// Em InscricaoWizard - Step de Endereço
import { useEnriquecerEndereco } from "@/hooks/useEnriquecerEndereco";

function EnderecoStep() {
  const { enriquecer } = useEnriquecerEndereco();
  const [endereco, setEndereco] = useState('');

  const handleBuscarCEP = async () => {
    const enderecoCompleto = `${endereco}, ${cidade}, ${estado}`;
    
    const result = await enriquecer({ endereco: enderecoCompleto });
    
    if (result.success) {
      // Preencher campos automaticamente
      setForm({
        ...form,
        bairro: result.bairro,
        cidade: result.cidade,
        estado: result.estado,
        cep: result.cep,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    }
  };

  return (
    <div>
      <Input 
        value={endereco} 
        onChange={(e) => setEndereco(e.target.value)}
        placeholder="Digite o endereço completo"
      />
      <Button onClick={handleBuscarCEP} variant="outline">
        🔍 Buscar Dados
      </Button>
    </div>
  );
}
```

---

### 7. Relatório de Qualidade de Dados

```sql
-- View para auditoria de qualidade
CREATE OR REPLACE VIEW public.view_data_quality AS
SELECT 
  'credenciados' as tabela,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE latitude IS NOT NULL) as com_geocoding,
  COUNT(*) FILTER (WHERE endereco LIKE '%,%,%') as endereco_completo,
  COUNT(*) FILTER (WHERE cep IS NOT NULL AND LENGTH(cep) = 9) as cep_valido,
  ROUND(100.0 * COUNT(*) FILTER (WHERE latitude IS NOT NULL) / COUNT(*), 2) as pct_geocoding,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cep IS NOT NULL) / COUNT(*), 2) as pct_cep
FROM credenciados
WHERE status = 'Ativo';

-- Consultar
SELECT * FROM view_data_quality;
```

---

### 8. Integração com Mapa

```typescript
// No componente do mapa, mostrar se dados foram enriquecidos
function CredenciadoPopup({ credenciado }) {
  const hasEnrichedData = credenciado.endereco?.includes(',') && credenciado.cep;

  return (
    <Popup>
      <div>
        <h3>{credenciado.nome}</h3>
        <p>{credenciado.endereco}</p>
        <p>{credenciado.cidade}, {credenciado.estado}</p>
        
        {hasEnrichedData && (
          <Badge variant="secondary" className="mt-2">
            ✨ Dados Enriquecidos
          </Badge>
        )}
        
        {!hasEnrichedData && (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => enrichCredenciado(credenciado.id)}
          >
            Enriquecer Endereço
          </Button>
        )}
      </div>
    </Popup>
  );
}
```

---

### 9. Enriquecimento Seletivo por Região

```typescript
// Enriquecer apenas credenciados de determinada região
async function enrichByRegion(estado: string, limite = 50) {
  const { data: credenciados } = await supabase
    .from('credenciados')
    .select('id')
    .eq('estado', estado)
    .eq('status', 'Ativo')
    .not('latitude', 'is', null)
    .limit(limite);

  for (const c of credenciados || []) {
    await supabase.functions.invoke('enriquecer-endereco-osm', {
      body: { credenciado_id: c.id }
    });
    
    await new Promise(r => setTimeout(r, 1100));
  }
  
  console.log(`✅ ${credenciados?.length || 0} credenciados de ${estado} enriquecidos`);
}

// Uso
await enrichByRegion('SP', 100);
```

---

### 10. Dashboard de Enriquecimento

```sql
-- Estatísticas de enriquecimento por estado
SELECT 
  estado,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE cep IS NOT NULL) as com_cep,
  COUNT(*) FILTER (WHERE endereco LIKE '%,%,%') as endereco_detalhado,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cep IS NOT NULL) / COUNT(*), 2) as pct_enriquecido
FROM credenciados
WHERE status = 'Ativo'
  AND latitude IS NOT NULL
GROUP BY estado
ORDER BY pct_enriquecido ASC;

-- Credenciados com dados incompletos por prioridade
SELECT 
  id,
  nome,
  cidade,
  estado,
  CASE 
    WHEN cep IS NULL THEN 'Falta CEP'
    WHEN NOT endereco LIKE '%,%' THEN 'Endereço simples'
    ELSE 'OK'
  END as issue,
  created_at
FROM credenciados
WHERE status = 'Ativo'
  AND latitude IS NOT NULL
  AND (cep IS NULL OR NOT endereco LIKE '%,%')
ORDER BY created_at DESC
LIMIT 50;
```

---

## 🎨 UI Components Exemplos

### Badge de Status de Enriquecimento

```typescript
function EnrichmentStatusBadge({ credenciado }) {
  const isEnriched = 
    credenciado.cep && 
    credenciado.endereco?.includes(',');

  if (isEnriched) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Sparkles className="h-3 w-3" />
        Enriquecido
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1">
      <AlertCircle className="h-3 w-3" />
      Básico
    </Badge>
  );
}
```

### Card de Ação Rápida

```typescript
function QuickEnrichCard({ credenciado }) {
  const { enriquecer, isLoading } = useEnriquecerEndereco();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Enriquecer Dados</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => enriquecer({ credenciadoId: credenciado.id })}
          disabled={isLoading}
          className="w-full gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {isLoading ? 'Processando...' : 'Enriquecer via OSM'}
        </Button>
        
        <p className="text-xs text-muted-foreground mt-2">
          Obtém bairro, CEP e outros dados via OpenStreetMap
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## 🔧 Manutenção e Operações

### Script de Limpeza de Cache Antigo

```sql
-- Remover cache não usado há 6 meses
DELETE FROM geocode_cache
WHERE provider = 'nominatim'
  AND last_used_at < NOW() - INTERVAL '6 months'
  AND hit_count = 1;

-- Ver quantos serão removidos antes
SELECT COUNT(*) as will_be_deleted
FROM geocode_cache
WHERE provider = 'nominatim'
  AND last_used_at < NOW() - INTERVAL '6 months'
  AND hit_count = 1;
```

### Forçar Re-enriquecimento

```typescript
// Para credenciados com dados suspeitos
async function reEnrichSuspicious() {
  const { data: credenciados } = await supabase
    .from('credenciados')
    .select('id, nome, cep')
    .eq('status', 'Ativo')
    .or('cep.is.null,cep.eq.')
    .not('latitude', 'is', null)
    .limit(30);

  for (const c of credenciados || []) {
    console.log(`Re-enriquecendo: ${c.nome}`);
    
    await supabase.functions.invoke('enriquecer-endereco-osm', {
      body: { credenciado_id: c.id }
    });
    
    await new Promise(r => setTimeout(r, 1100));
  }
}
```

---

## 📊 Queries de Monitoramento

### Ver Taxa de Enriquecimento por Período

```sql
SELECT 
  DATE_TRUNC('day', created_at) as dia,
  COUNT(*) as total_criados,
  COUNT(*) FILTER (WHERE cep IS NOT NULL) as com_cep_no_dia,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cep IS NOT NULL) / COUNT(*), 2) as pct_enriquecido
FROM credenciados
WHERE created_at > NOW() - INTERVAL '30 days'
  AND status = 'Ativo'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY dia DESC;
```

### Ver Cache Hits do OSM

```sql
SELECT 
  address_text,
  hit_count,
  metadata->>'cidade' as cidade,
  metadata->>'estado' as estado,
  created_at,
  last_used_at
FROM geocode_cache
WHERE provider = 'nominatim'
  AND hit_count > 5
ORDER BY hit_count DESC
LIMIT 20;
```

### Identificar Gaps de Dados

```sql
SELECT 
  'Sem CEP' as gap_type,
  COUNT(*) as total
FROM credenciados
WHERE status = 'Ativo'
  AND latitude IS NOT NULL
  AND cep IS NULL

UNION ALL

SELECT 
  'Endereço Simples',
  COUNT(*)
FROM credenciados
WHERE status = 'Ativo'
  AND NOT endereco LIKE '%,%,%'

UNION ALL

SELECT 
  'Sem Bairro',
  COUNT(*)
FROM credenciados
WHERE status = 'Ativo'
  AND NOT endereco LIKE '%,%';
```

---

## 🚀 Automação Avançada

### Enriquecer Novos Credenciados Automaticamente

```sql
-- Trigger para enriquecer automaticamente após criação
CREATE OR REPLACE FUNCTION auto_enrich_new_credenciado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se tem lat/lon mas não tem CEP, enriquecer
  IF NEW.latitude IS NOT NULL AND NEW.cep IS NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/enriquecer-endereco-osm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object('credenciado_id', NEW.id)
    );
    
    RAISE NOTICE '[AUTO_ENRICH] Enriquecimento agendado para credenciado %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_enrich_credenciado
AFTER INSERT ON credenciados
FOR EACH ROW
EXECUTE FUNCTION auto_enrich_new_credenciado();
```

### Cron Job para Manutenção

```sql
-- Executar enriquecimento diário para gaps
SELECT cron.schedule(
  'daily-enrichment',
  '0 3 * * *', -- 3 AM todos os dias
  $$
  -- Processar 100 credenciados sem CEP
  DO $$
  DECLARE
    v_credenciado UUID;
  BEGIN
    FOR v_credenciado IN 
      SELECT id FROM credenciados
      WHERE latitude IS NOT NULL
        AND cep IS NULL
        AND status = 'Ativo'
      LIMIT 100
    LOOP
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/enriquecer-endereco-osm',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb,
        body := jsonb_build_object('credenciado_id', v_credenciado)
      );
      
      PERFORM pg_sleep(1.1);
    END LOOP;
  END $$;
  $$
);
```

---

## 🔍 Debugging

### Verificar Último Enriquecimento

```sql
SELECT 
  c.id,
  c.nome,
  c.cidade,
  c.cep,
  gc.created_at as enriched_at,
  gc.metadata->>'cached' as was_cached
FROM credenciados c
LEFT JOIN geocode_cache gc ON gc.latitude = c.latitude AND gc.longitude = c.longitude
WHERE c.id = '<CREDENCIADO_ID>'
  AND gc.provider = 'nominatim'
ORDER BY gc.created_at DESC
LIMIT 1;
```

### Ver Erros de Enriquecimento

```sql
SELECT 
  address_text,
  metadata->>'error' as error_message,
  created_at
FROM geocode_cache
WHERE provider = 'nominatim'
  AND metadata->>'success' = 'false'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 📈 KPIs de Enriquecimento

| KPI | Meta | Atual | Status |
|-----|------|-------|--------|
| Taxa de Enriquecimento | ≥ 90% | ? | Calcular |
| Cache Hit Rate | ≥ 60% | ? | Calcular |
| Tempo Médio | < 2s | ? | Calcular |
| Qualidade de CEP | ≥ 85% | ? | Calcular |

```sql
-- Calcular KPIs
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE cep IS NOT NULL) as com_cep,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cep IS NOT NULL) / COUNT(*), 2) as taxa_enriquecimento,
  (SELECT cache_reuse_rate_percent FROM view_geocode_cache_stats) as cache_hit_rate
FROM credenciados
WHERE status = 'Ativo'
  AND latitude IS NOT NULL;
```

---

## 🎓 Tutoriais

### Tutorial 1: Primeiro Enriquecimento

1. Acesse **Análises & Relatórios** → **Monitoramento**
2. Clique na aba **Enriquecimento**
3. Clique em **Enriquecer 50**
4. Aguarde o processamento (1-2 minutos)
5. Verifique estatísticas no card

### Tutorial 2: Via Script Deno

```bash
# 1. Definir variáveis
export VITE_SUPABASE_URL="https://ncmofeencqpqhtguxmvy.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua_key"

# 2. Executar
deno run --allow-net --allow-env scripts/enriquecer-credenciados.ts enrich 50

# 3. Ver resultado
# Output mostra progresso em tempo real
```

### Tutorial 3: Validar CEPs

```bash
deno run --allow-net --allow-env scripts/enriquecer-credenciados.ts validate 20
```

---

## 🔗 Ver Também

- [Guia Completo de Enriquecimento OSM](./ENRIQUECIMENTO_OSM_GUIDE.md)
- [Observabilidade de Geocoding](./OBSERVABILIDADE_GEOCODING.md)
- [Edge Function: enriquecer-endereco-osm](../supabase/functions/enriquecer-endereco-osm/README.md)

---

**Última atualização**: 2025-01-09
