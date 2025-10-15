import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Users, Edit, Trash2, UserPlus, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Grupo {
  grupo_id: string;
  grupo_nome: string;
  descricao: string;
  tipo: string;
  permissoes: any;
  cor_identificacao: string;
  ativo: boolean;
  total_membros_ativos: number;
}

interface Permissao {
  key: string;
  label: string;
  descricao: string;
}

const PERMISSOES_DISPONIVEIS: Permissao[] = [
  { key: 'pode_aprovar', label: 'Aprovar', descricao: 'Pode aprovar solicitações' },
  { key: 'pode_reprovar', label: 'Reprovar', descricao: 'Pode reprovar solicitações' },
  { key: 'pode_solicitar_correcao', label: 'Solicitar Correção', descricao: 'Pode solicitar correções' },
  { key: 'pode_reatribuir', label: 'Reatribuir', descricao: 'Pode reatribuir tarefas' },
  { key: 'pode_ver_historico_completo', label: 'Ver Histórico', descricao: 'Acesso ao histórico completo' },
  { key: 'pode_editar_workflow', label: 'Editar Workflow', descricao: 'Pode editar workflows' }
];

const CORES_DISPONIVEIS = [
  { valor: '#3b82f6', nome: 'Azul' },
  { valor: '#10b981', nome: 'Verde' },
  { valor: '#f59e0b', nome: 'Laranja' },
  { valor: '#ef4444', nome: 'Vermelho' },
  { valor: '#8b5cf6', nome: 'Roxo' },
  { valor: '#ec4899', nome: 'Rosa' },
  { valor: '#06b6d4', nome: 'Ciano' }
];

export function GestaoGrupos() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [grupoEmEdicao, setGrupoEmEdicao] = useState<Partial<Grupo> | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'analista',
    cor_identificacao: '#3b82f6',
    permissoes: {
      pode_aprovar: false,
      pode_reprovar: false,
      pode_solicitar_correcao: false,
      pode_reatribuir: false,
      pode_ver_historico_completo: false,
      pode_editar_workflow: false
    }
  });

  useEffect(() => {
    carregarGrupos();
  }, []);

  const carregarGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('v_grupos_com_membros')
        .select('*')
        .order('grupo_nome');

      if (error) throw error;
      
      // Adicionar campos padrão para compatibilidade com a interface Grupo
      const gruposCompletos = (data || []).map(grupo => ({
        ...grupo,
        permissoes: (grupo as any).permissoes || {},
        cor_identificacao: (grupo as any).cor_identificacao || '#3b82f6'
      })) as Grupo[];
      
      setGrupos(gruposCompletos);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar grupos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setGrupoEmEdicao(null);
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'analista',
      cor_identificacao: '#3b82f6',
      permissoes: {
        pode_aprovar: false,
        pode_reprovar: false,
        pode_solicitar_correcao: false,
        pode_reatribuir: false,
        pode_ver_historico_completo: false,
        pode_editar_workflow: false
      }
    });
    setModalAberto(true);
  };

  const abrirModalEdicao = (grupo: Grupo) => {
    setGrupoEmEdicao(grupo);
    setFormData({
      nome: grupo.grupo_nome,
      descricao: grupo.descricao || '',
      tipo: grupo.tipo,
      cor_identificacao: grupo.cor_identificacao,
      permissoes: grupo.permissoes || {
        pode_aprovar: false,
        pode_reprovar: false,
        pode_solicitar_correcao: false,
        pode_reatribuir: false,
        pode_ver_historico_completo: false,
        pode_editar_workflow: false
      }
    });
    setModalAberto(true);
  };

  const salvarGrupo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (grupoEmEdicao) {
        // Atualizar
        const { error } = await supabase
          .from('grupos_usuarios')
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
            tipo: formData.tipo,
            cor_identificacao: formData.cor_identificacao,
            permissoes: formData.permissoes
          })
          .eq('id', grupoEmEdicao.grupo_id);

        if (error) throw error;

        toast({
          title: 'Grupo atualizado!',
          description: 'As alterações foram salvas com sucesso.'
        });
      } else {
        // Criar novo
        const { error } = await supabase
          .from('grupos_usuarios')
          .insert({
            nome: formData.nome,
            descricao: formData.descricao,
            tipo: formData.tipo,
            cor_identificacao: formData.cor_identificacao,
            permissoes: formData.permissoes,
            criado_por: user?.id,
            ativo: true
          });

        if (error) throw error;

        toast({
          title: 'Grupo criado!',
          description: 'O novo grupo foi criado com sucesso.'
        });
      }

      setModalAberto(false);
      carregarGrupos();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const desativarGrupo = async (grupoId: string) => {
    if (!confirm('Deseja realmente desativar este grupo? Os membros perderão suas atribuições.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('grupos_usuarios')
        .update({ ativo: false })
        .eq('id', grupoId);

      if (error) throw error;

      toast({
        title: 'Grupo desativado',
        description: 'O grupo foi desativado com sucesso.'
      });

      carregarGrupos();
    } catch (error: any) {
      toast({
        title: 'Erro ao desativar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const togglePermissao = (key: string) => {
    setFormData({
      ...formData,
      permissoes: {
        ...formData.permissoes,
        [key]: !formData.permissoes[key as keyof typeof formData.permissoes]
      }
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Grupos</h1>
          <p className="text-muted-foreground mt-1">
            Organize usuários em grupos com permissões específicas
          </p>
        </div>
        <Button onClick={abrirModalNovo}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

      {/* Lista de Grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grupos.map((grupo) => (
          <Card key={grupo.grupo_id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: grupo.cor_identificacao + '20' }}
                >
                  <Users
                    className="w-6 h-6"
                    style={{ color: grupo.cor_identificacao }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{grupo.grupo_nome}</h3>
                  <Badge variant="outline">{grupo.tipo}</Badge>
                </div>
              </div>
            </div>

            {grupo.descricao && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {grupo.descricao}
              </p>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {grupo.total_membros_ativos} membro(s)
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                {Object.values(grupo.permissoes || {}).filter(Boolean).length} permissões
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate(`/admin/grupos/${grupo.grupo_id}`)}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Membros
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => abrirModalEdicao(grupo)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => desativarGrupo(grupo.grupo_id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {grupoEmEdicao ? 'Editar Grupo' : 'Novo Grupo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Grupo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Analistas de Credenciamento"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva a função deste grupo..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analista">Analista</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="aprovador">Aprovador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cor">Cor de Identificação</Label>
                  <Select
                    value={formData.cor_identificacao}
                    onValueChange={(value) => setFormData({ ...formData, cor_identificacao: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CORES_DISPONIVEIS.map((cor) => (
                        <SelectItem key={cor.valor} value={cor.valor}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: cor.valor }}
                            />
                            {cor.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Permissões */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Permissões do Grupo
              </Label>
              <Card className="p-4">
                <div className="space-y-3">
                  {PERMISSOES_DISPONIVEIS.map((permissao) => (
                    <div key={permissao.key} className="flex items-start gap-3">
                      <Checkbox
                        id={permissao.key}
                        checked={formData.permissoes[permissao.key as keyof typeof formData.permissoes]}
                        onCheckedChange={() => togglePermissao(permissao.key)}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={permissao.key}
                          className="font-medium cursor-pointer"
                        >
                          {permissao.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {permissao.descricao}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarGrupo} disabled={!formData.nome}>
              {grupoEmEdicao ? 'Salvar Alterações' : 'Criar Grupo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}