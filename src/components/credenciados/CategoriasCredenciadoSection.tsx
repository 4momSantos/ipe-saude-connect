import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Star, X, Building2 } from 'lucide-react';
import { useCredenciadoCategorias } from '@/hooks/useCredenciadoCategorias';
import { useCategoriasEstabelecimentos } from '@/hooks/useCategoriasEstabelecimentos';
import { useState } from 'react';

export function CategoriasCredenciadoSection({ credenciadoId }: { credenciadoId: string }) {
  const { categorias, vincularCategoria, desvincularCategoria, definirPrincipal } = 
    useCredenciadoCategorias(credenciadoId);
  const { categorias: todasCategorias } = useCategoriasEstabelecimentos();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('');

  const categoriasDisponiveis = todasCategorias?.filter(
    (cat) => !categorias?.some((cc) => cc.categoria_id === cat.id)
  );

  const handleVincular = () => {
    if (categoriaSelecionada) {
      vincularCategoria({ categoriaId: categoriaSelecionada });
      setCategoriaSelecionada('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Categorias do Estabelecimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Lista de categorias vinculadas */}
        <div className="space-y-2 mb-4">
          {categorias && categorias.length > 0 ? (
            categorias.map((cc) => (
              <div key={cc.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant={cc.principal ? 'default' : 'secondary'}>
                    {cc.categoria?.nome}
                  </Badge>
                  {cc.categoria?.codigo && (
                    <span className="text-xs text-muted-foreground">({cc.categoria.codigo})</span>
                  )}
                  {cc.principal && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                </div>
                <div className="flex gap-1">
                  {!cc.principal && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => definirPrincipal(cc.id)}
                      title="Marcar como principal"
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => desvincularCategoria(cc.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma categoria vinculada</p>
          )}
        </div>

        {/* Adicionar nova categoria */}
        {categoriasDisponiveis && categoriasDisponiveis.length > 0 && (
          <div className="flex gap-2">
            <Select value={categoriaSelecionada} onValueChange={setCategoriaSelecionada}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione uma categoria..." />
              </SelectTrigger>
              <SelectContent>
                {categoriasDisponiveis.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nome} {cat.codigo && `(${cat.codigo})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleVincular} disabled={!categoriaSelecionada}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
