import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useCategoriasPrestadores } from '@/hooks/useCategoriasPrestadores';
import * as Icons from 'lucide-react';

const ICONES_SUGERIDOS = ['Tag', 'Star', 'Award', 'Shield', 'Heart', 'Crown', 'Zap', 'Target'];

export default function GerenciarCategorias() {
  const { categorias, isLoading, createCategoria, updateCategoria, deleteCategoria } = useCategoriasPrestadores();
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#6366f1',
    icone: 'Tag',
  });

  const handleSave = () => {
    if (editingCategoria) {
      updateCategoria({ id: editingCategoria.id, ...formData }, {
        onSuccess: () => {
          setShowDialog(false);
          setEditingCategoria(null);
          setFormData({ nome: '', descricao: '', cor: '#6366f1', icone: 'Tag' });
        },
      });
    } else {
      createCategoria(formData, {
        onSuccess: () => {
          setShowDialog(false);
          setFormData({ nome: '', descricao: '', cor: '#6366f1', icone: 'Tag' });
        },
      });
    }
  };

  const openEditDialog = (categoria: any) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || '',
      cor: categoria.cor || '#6366f1',
      icone: categoria.icone || 'Tag',
    });
    setShowDialog(true);
  };

  const renderIcon = (iconName: string, color: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Tag;
    return <IconComponent className="h-5 w-5" style={{ color }} />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Categorias</h1>
          <p className="text-muted-foreground">Configure categorias de prestadores de serviços</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <p>Carregando...</p>
        ) : categorias && categorias.length > 0 ? (
          categorias.map((categoria) => (
            <Card key={categoria.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {renderIcon(categoria.icone || 'Tag', categoria.cor || '#6366f1')}
                    <CardTitle>{categoria.nome}</CardTitle>
                  </div>
                  <Badge
                    variant={categoria.ativo ? 'default' : 'secondary'}
                    style={{
                      backgroundColor: categoria.ativo ? categoria.cor : undefined,
                    }}
                  >
                    {categoria.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {categoria.descricao || 'Sem descrição'}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(categoria)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteCategoria(categoria.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-3 text-center text-muted-foreground py-8">
            Nenhuma categoria cadastrada
          </p>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Premium"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  placeholder="#6366f1"
                />
              </div>
            </div>
            <div>
              <Label>Ícone</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {ICONES_SUGERIDOS.map((icone) => (
                  <Button
                    key={icone}
                    type="button"
                    variant={formData.icone === icone ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, icone })}
                  >
                    {renderIcon(icone, formData.cor)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
