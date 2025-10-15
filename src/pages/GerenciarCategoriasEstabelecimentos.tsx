import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { useCategoriasEstabelecimentos } from '@/hooks/useCategoriasEstabelecimentos';
import { Textarea } from '@/components/ui/textarea';

export default function GerenciarCategoriasEstabelecimentos() {
  const { categorias, isLoading, createCategoria, updateCategoria, deleteCategoria } = 
    useCategoriasEstabelecimentos(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    ativo: true,
  });

  const handleSave = () => {
    if (editingCategoria) {
      updateCategoria({ id: editingCategoria.id, ...formData }, {
        onSuccess: () => {
          setShowDialog(false);
          setEditingCategoria(null);
          setFormData({ nome: '', codigo: '', descricao: '', ativo: true });
        },
      });
    } else {
      createCategoria(formData, {
        onSuccess: () => {
          setShowDialog(false);
          setFormData({ nome: '', codigo: '', descricao: '', ativo: true });
        },
      });
    }
  };

  const openEditDialog = (categoria: any) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      codigo: categoria.codigo || '',
      descricao: categoria.descricao || '',
      ativo: categoria.ativo,
    });
    setShowDialog(true);
  };

  const openNewDialog = () => {
    setEditingCategoria(null);
    setFormData({ nome: '', codigo: '', descricao: '', ativo: true });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Categorias de Estabelecimentos</h1>
          <p className="text-muted-foreground">Gerencie os tipos de unidades credenciadas</p>
        </div>
        <Button onClick={openNewDialog}>
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
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{categoria.nome}</CardTitle>
                  </div>
                  <Badge variant={categoria.ativo ? 'default' : 'secondary'}>
                    {categoria.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {categoria.codigo && (
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Código:</span> {categoria.codigo}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mb-4">
                  {categoria.descricao || 'Sem descrição'}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(categoria)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => deleteCategoria(categoria.id)}
                    disabled={!categoria.ativo}
                  >
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
            <DialogTitle>
              {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Clínica, Hospital, Laboratório"
              />
            </div>
            <div>
              <Label>Código (opcional)</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="Ex: CLI, HOSP, LAB"
                maxLength={10}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da categoria"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.nome}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
