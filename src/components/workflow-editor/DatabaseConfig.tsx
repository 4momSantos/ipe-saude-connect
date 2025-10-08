import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Database, Info, Shield, ArrowUpDown } from "lucide-react";
import { DatabaseConfig, DatabaseFilter } from "@/types/workflow-editor";
import { useState } from "react";

interface DatabaseConfigProps {
  config: DatabaseConfig;
  onChange: (config: DatabaseConfig) => void;
}

const ALLOWED_TABLES = [
  'inscricoes_edital',
  'inscricao_documentos',
  'credenciados',
  'credenciado_crms',
  'horarios_atendimento',
  'workflow_form_data',
  'workflow_messages',
  'audit_logs',
  'app_notifications'
];

const OPERATORS = [
  { value: 'eq', label: '= (igual)' },
  { value: 'neq', label: '!= (diferente)' },
  { value: 'gt', label: '> (maior que)' },
  { value: 'gte', label: '>= (maior ou igual)' },
  { value: 'lt', label: '< (menor que)' },
  { value: 'lte', label: '<= (menor ou igual)' },
  { value: 'in', label: 'IN (está em)' },
  { value: 'like', label: 'LIKE (contém)' },
  { value: 'is', label: 'IS (é nulo)' },
  { value: 'isnot', label: 'IS NOT (não é nulo)' }
];

export function DatabaseConfigPanel({ config, onChange }: DatabaseConfigProps) {
  const [activeTab, setActiveTab] = useState<'select' | 'insert' | 'update' | 'delete'>(
    config.operation || 'select'
  );

  const handleOperationChange = (operation: string) => {
    setActiveTab(operation as any);
    onChange({ ...config, operation: operation as any });
  };

  const addFilter = (filterType: 'filters' | 'where') => {
    const currentFilters = config[filterType] || [];
    onChange({
      ...config,
      [filterType]: [
        ...currentFilters,
        { column: '', operator: 'eq' as const, value: '' }
      ]
    });
  };

  const updateFilter = (
    filterType: 'filters' | 'where',
    index: number,
    field: keyof DatabaseFilter,
    value: any
  ) => {
    const currentFilters = config[filterType] || [];
    const updated = [...currentFilters];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...config, [filterType]: updated });
  };

  const removeFilter = (filterType: 'filters' | 'where', index: number) => {
    const currentFilters = config[filterType] || [];
    onChange({
      ...config,
      [filterType]: currentFilters.filter((_, i) => i !== index)
    });
  };

  const addColumn = () => {
    const columns = config.columns || [];
    onChange({ ...config, columns: [...columns, ''] });
  };

  const updateColumn = (index: number, value: string) => {
    const columns = [...(config.columns || [])];
    columns[index] = value;
    onChange({ ...config, columns });
  };

  const removeColumn = (index: number) => {
    const columns = config.columns || [];
    onChange({ ...config, columns: columns.filter((_, i) => i !== index) });
  };

  const addOrderBy = () => {
    const orderBy = config.orderBy || [];
    onChange({
      ...config,
      orderBy: [...orderBy, { column: '', direction: 'asc' as const }]
    });
  };

  const updateOrderBy = (index: number, field: 'column' | 'direction', value: any) => {
    const orderBy = [...(config.orderBy || [])];
    orderBy[index] = { ...orderBy[index], [field]: value };
    onChange({ ...config, orderBy });
  };

  const removeOrderBy = (index: number) => {
    const orderBy = config.orderBy || [];
    onChange({ ...config, orderBy: orderBy.filter((_, i) => i !== index) });
  };

  const addField = (fieldType: 'values' | 'set') => {
    const current = config[fieldType] as Record<string, any> || {};
    const newKey = `campo_${Date.now()}`;
    onChange({
      ...config,
      [fieldType]: { ...current, [newKey]: '' }
    });
  };

  const updateField = (fieldType: 'values' | 'set', oldKey: string, newKey: string, value: any) => {
    const current = { ...(config[fieldType] as Record<string, any> || {}) };
    delete current[oldKey];
    if (newKey) current[newKey] = value;
    onChange({ ...config, [fieldType]: current });
  };

  const removeField = (fieldType: 'values' | 'set', key: string) => {
    const current = { ...(config[fieldType] as Record<string, any> || {}) };
    delete current[key];
    onChange({ ...config, [fieldType]: current });
  };

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
      <div className="space-y-4">
        {/* Tabela */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Tabela do Banco</h3>
          </div>

          <div className="space-y-2">
            <Label>Tabela</Label>
            <Select
              value={config.table || ""}
              onValueChange={(value) => onChange({ ...config, table: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma tabela" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_TABLES.map(table => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              🔒 Apenas tabelas autorizadas por segurança
            </p>
          </div>
        </Card>

        {/* Operação */}
        <Tabs value={activeTab} onValueChange={handleOperationChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="select">SELECT</TabsTrigger>
            <TabsTrigger value="insert">INSERT</TabsTrigger>
            <TabsTrigger value="update">UPDATE</TabsTrigger>
            <TabsTrigger value="delete">DELETE</TabsTrigger>
          </TabsList>

          {/* SELECT */}
          <TabsContent value="select" className="space-y-4 mt-4">
            {/* Colunas */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Colunas (deixe vazio para selecionar todas)</Label>
                <Button size="sm" variant="outline" onClick={addColumn}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {config.columns?.map((column, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={column}
                    onChange={(e) => updateColumn(index, e.target.value)}
                    placeholder="nome_coluna"
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeColumn(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </Card>

            {/* Filtros */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Filtros (WHERE)</Label>
                <Button size="sm" variant="outline" onClick={() => addFilter('filters')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {config.filters?.map((filter, index) => (
                <Card key={index} className="p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="coluna"
                      value={filter.column}
                      onChange={(e) => updateFilter('filters', index, 'column', e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateFilter('filters', index, 'operator', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        placeholder="valor ou {{variavel}}"
                        value={filter.value}
                        onChange={(e) => updateFilter('filters', index, 'value', e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFilter('filters', index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </Card>

            {/* Ordenação */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <Label>Ordenação (ORDER BY)</Label>
                </div>
                <Button size="sm" variant="outline" onClick={addOrderBy}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {config.orderBy?.map((order, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="coluna"
                    value={order.column}
                    onChange={(e) => updateOrderBy(index, 'column', e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Select
                    value={order.direction}
                    onValueChange={(value) => updateOrderBy(index, 'direction', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">ASC ↑</SelectItem>
                      <SelectItem value="desc">DESC ↓</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeOrderBy(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </Card>

            {/* Paginação */}
            <Card className="p-4 space-y-3">
              <Label>Paginação</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Limit (máx: 1000)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={config.limit || ''}
                    onChange={(e) => onChange({ ...config, limit: parseInt(e.target.value) || undefined })}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Offset</Label>
                  <Input
                    type="number"
                    min={0}
                    value={config.offset || ''}
                    onChange={(e) => onChange({ ...config, offset: parseInt(e.target.value) || undefined })}
                    placeholder="0"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* INSERT */}
          <TabsContent value="insert" className="space-y-4 mt-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Valores a Inserir</Label>
                <Button size="sm" variant="outline" onClick={() => addField('values')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Campo
                </Button>
              </div>

              {config.values && typeof config.values === 'object' && !Array.isArray(config.values) && Object.entries(config.values).map(([key, value]) => (
                <Card key={key} className="p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="nome_coluna"
                      value={key.startsWith('campo_') ? '' : key}
                      onChange={(e) => updateField('values', key, e.target.value, value)}
                      className="flex-1 font-mono text-sm"
                    />
                    <Input
                      placeholder="valor ou {{variavel}}"
                      value={value as string}
                      onChange={(e) => updateField('values', key, key, e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeField('values', key)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Use {"{{variavel}}"} para inserir dados do contexto do workflow
                </AlertDescription>
              </Alert>
            </Card>
          </TabsContent>

          {/* UPDATE */}
          <TabsContent value="update" className="space-y-4 mt-4">
            {/* SET */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Valores a Atualizar (SET)</Label>
                <Button size="sm" variant="outline" onClick={() => addField('set')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Campo
                </Button>
              </div>

              {config.set && typeof config.set === 'object' && Object.entries(config.set).map(([key, value]) => (
                <Card key={key} className="p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="nome_coluna"
                      value={key.startsWith('campo_') ? '' : key}
                      onChange={(e) => updateField('set', key, e.target.value, value)}
                      className="flex-1 font-mono text-sm"
                    />
                    <Input
                      placeholder="novo_valor ou {{variavel}}"
                      value={value as string}
                      onChange={(e) => updateField('set', key, key, e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeField('set', key)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </Card>

            {/* WHERE */}
            <Card className="p-4 space-y-3 bg-yellow-500/5 border-yellow-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-yellow-500" />
                  <Label>Filtros WHERE (OBRIGATÓRIO)</Label>
                  <Badge variant="destructive">Requerido</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => addFilter('where')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {config.where?.map((filter, index) => (
                <Card key={index} className="p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="coluna"
                      value={filter.column}
                      onChange={(e) => updateFilter('where', index, 'column', e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateFilter('where', index, 'operator', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        placeholder="valor ou {{variavel}}"
                        value={filter.value}
                        onChange={(e) => updateFilter('where', index, 'value', e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFilter('where', index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  🔒 SEGURANÇA: WHERE é obrigatório para prevenir atualização de toda a tabela
                </AlertDescription>
              </Alert>
            </Card>
          </TabsContent>

          {/* DELETE */}
          <TabsContent value="delete" className="space-y-4 mt-4">
            <Card className="p-4 space-y-3 bg-red-500/5 border-red-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <Label>Filtros WHERE (OBRIGATÓRIO)</Label>
                  <Badge variant="destructive">Requerido</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => addFilter('where')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {config.where?.map((filter, index) => (
                <Card key={index} className="p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="coluna"
                      value={filter.column}
                      onChange={(e) => updateFilter('where', index, 'column', e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateFilter('where', index, 'operator', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        placeholder="valor ou {{variavel}}"
                        value={filter.value}
                        onChange={(e) => updateFilter('where', index, 'value', e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFilter('where', index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  🔒 SEGURANÇA: WHERE é obrigatório para prevenir deleção de toda a tabela
                </AlertDescription>
              </Alert>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Documentação */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-2">
            <div><strong>Variáveis do Contexto:</strong></div>
            <div className="font-mono bg-muted/50 p-2 rounded space-y-1">
              <div>• {"{{inscricaoId}}"} - ID da inscrição</div>
              <div>• {"{{candidatoId}}"} - ID do candidato</div>
              <div>• {"{{form_response.campo}}"} - Dados do formulário</div>
              <div>• {"{{http_response.data}}"} - Resposta de API</div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </ScrollArea>
  );
}
