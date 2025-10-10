import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useModelosJustificativa } from '@/hooks/useModelosJustificativa';

const CATEGORIAS = ['indeferimento', 'notificacao', 'suspensao', 'descredenciamento'];

const VARIAVEIS_DISPONIVEIS = [
  { nome: 'nome_candidato', descricao: 'Nome do candidato' },
  { nome: 'numero_edital', descricao: 'Número do edital' },
  { nome: 'data_analise', descricao: 'Data da análise' },
  { nome: 'motivo_especifico', descricao: 'Motivo específico' },
];

export default function GerenciarModelosJustificativa() {
  const [categoria, setCategoria] = useState<string>('');
  const { modelos, isLoading, createModelo, updateModelo, deleteModelo } = useModelosJustificativa(categoria);
  const [showDialog, setShowDialog] = useState(false);
  const [editingModelo, setEditingModelo] = useState<any>(null);
  const [previewModelo, setPreviewModelo] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    texto_padrao: '',
  });

  const handleSave = () => {
    if (editingModelo) {
      updateModelo({ id: editingModelo.id, ...formData }, {
        onSuccess: () => {
          setShowDialog(false);
          setEditingModelo(null);
          setFormData({ nome: '', categoria: '', texto_padrao: '' });
        },
      });
    } else {
      createModelo(formData, {
        onSuccess: () => {
          setShowDialog(false);
          setFormData({ nome: '', categoria: '', texto_padrao: '' });
        },
      });
    }
  };

  const openEditDialog = (modelo: any) => {
    setEditingModelo(modelo);
    setFormData({
      nome: modelo.nome,
      categoria: modelo.categoria,
      texto_padrao: modelo.texto_padrao,
    });
    setShowDialog(true);
  };

  const insertVariable = (variavel: string) => {
    setFormData((prev) => ({
      ...prev,
      texto_padrao: prev.texto_padrao + `{{${variavel}}}`,
    }));
  };

  const renderPreview = (texto: string) => {
    let preview = texto;
    VARIAVEIS_DISPONIVEIS.forEach((v) => {
      preview = preview.replace(new RegExp(`{{${v.nome}}}`, 'g'), `[${v.descricao}]`);
    });
    return preview;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Modelos de Justificativa</h1>
          <p className="text-muted-foreground">Gerenciar modelos de texto para comunicações</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {CATEGORIAS.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <p>Carregando...</p>
        ) : modelos && modelos.length > 0 ? (
          modelos.map((modelo) => (
            <Card key={modelo.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{modelo.nome}</CardTitle>
                    <CardDescription>
                      <Badge variant="outline">{modelo.categoria}</Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPreviewModelo(modelo)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(modelo)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteModelo(modelo.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {modelo.texto_padrao}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-2 text-center text-muted-foreground py-8">
            Nenhum modelo encontrado
          </p>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModelo ? 'Editar Modelo' : 'Novo Modelo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Modelo</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Indeferimento - Documentação Incompleta"
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Texto Padrão</Label>
              <Textarea
                value={formData.texto_padrao}
                onChange={(e) => setFormData({ ...formData, texto_padrao: e.target.value })}
                rows={8}
                placeholder="Digite o texto usando variáveis como {{nome_candidato}}"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <p className="text-xs text-muted-foreground w-full">Variáveis disponíveis:</p>
                {VARIAVEIS_DISPONIVEIS.map((v) => (
                  <Button
                    key={v.nome}
                    size="sm"
                    variant="outline"
                    onClick={() => insertVariable(v.nome)}
                    type="button"
                  >
                    {v.nome}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Preview</Label>
              <div className="bg-muted p-4 rounded-lg text-sm">
                {renderPreview(formData.texto_padrao) || 'Digite um texto para visualizar'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewModelo} onOpenChange={() => setPreviewModelo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewModelo?.nome}</DialogTitle>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">
              {previewModelo && renderPreview(previewModelo.texto_padrao)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
