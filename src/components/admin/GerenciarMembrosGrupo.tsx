import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, UserMinus, Search, ArrowLeft, Crown, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Membro {
  usuario_id: string;
  email: string;
  nome: string;
  papel: string;
  adicionado_em: string;
  ativo: boolean;
}

interface Usuario {
  usuario_id: string;
  email: string;
  nome: string;
}

export function GerenciarMembrosGrupo() {
  const { grupoId } = useParams<{ grupoId: string }>();
  const navigate = useNavigate();
  const [grupo, setGrupo] = useState<any>(null);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form state
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [papelSelecionado, setPapelSelecionado] = useState('membro');

  useEffect(() => {
    if (grupoId) {
      carregarDados();
    }
  }, [grupoId]);

  const carregarDados = async () => {
    try {
      // Carregar grupo e membros
      const { data: grupoData, error: grupoError } = await supabase
        .from('v_grupos_com_membros')
        .select('*')
        .eq('grupo_id', grupoId)
        .single();

      if (grupoError) throw grupoError;

      setGrupo(grupoData);
      const membrosArray = grupoData.membros as unknown as Membro[];
      setMembros(Array.isArray(membrosArray) ? membrosArray : []);

      // Carregar todos os usuários (para adicionar novos)
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('v_usuarios_com_grupos')
        .select('usuario_id, email, nome');

      if (usuariosError) throw usuariosError;

      setTodosUsuarios(usuariosData || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const adicionarMembro = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('usuarios_grupos')
        .insert({
          usuario_id: usuarioSelecionado,
          grupo_id: grupoId,
          papel: papelSelecionado,
          ativo: true,
          adicionado_por: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Usuário já é membro',
            description: 'Este usuário já pertence a este grupo.',
            variant: 'destructive'
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Membro adicionado!',
        description: 'O usuário foi adicionado ao grupo com sucesso.'
      });

      setModalAberto(false);
      setUsuarioSelecionado('');
      setPapelSelecionado('membro');
      carregarDados();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar membro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const removerMembro = async (usuarioId: string) => {
    if (!confirm('Deseja realmente remover este usuário do grupo?')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('usuarios_grupos')
        .update({
          ativo: false,
          removido_em: new Date().toISOString(),
          removido_por: user?.id
        })
        .eq('usuario_id', usuarioId)
        .eq('grupo_id', grupoId);

      if (error) throw error;

      toast({
        title: 'Membro removido',
        description: 'O usuário foi removido do grupo.'
      });

      carregarDados();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const alterarPapel = async (usuarioId: string, novoPapel: string) => {
    try {
      const { error } = await supabase
        .from('usuarios_grupos')
        .update({ papel: novoPapel })
        .eq('usuario_id', usuarioId)
        .eq('grupo_id', grupoId);

      if (error) throw error;

      toast({
        title: 'Papel atualizado',
        description: 'O papel do usuário foi atualizado com sucesso.'
      });

      carregarDados();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar papel',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const usuariosDisponiveis = todosUsuarios.filter(
    (u) => !membros.some((m) => m.usuario_id === u.usuario_id && m.ativo)
  );

  const membrosFiltrados = membros.filter(
    (m) =>
      m.ativo &&
      (m.email.toLowerCase().includes(busca.toLowerCase()) ||
        m.nome?.toLowerCase().includes(busca.toLowerCase()))
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  if (!grupo) {
    return <div className="p-6">Grupo não encontrado</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/grupos')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
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
              <h1 className="text-2xl font-bold">{grupo.grupo_nome}</h1>
              <p className="text-muted-foreground">{grupo.descricao}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar membros..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Button onClick={() => setModalAberto(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>

      {/* Lista de Membros */}
      <Card>
        <div className="divide-y">
          {membrosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {busca ? 'Nenhum membro encontrado' : 'Este grupo ainda não tem membros'}
            </div>
          ) : (
            membrosFiltrados.map((membro) => (
              <div
                key={membro.usuario_id}
                className="p-4 flex items-center justify-between hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-lg font-semibold text-muted-foreground">
                      {membro.nome?.charAt(0) || membro.email.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {membro.nome || membro.email}
                      </span>
                      {membro.papel === 'coordenador' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{membro.email}</span>
                      <span>•</span>
                      <span>
                        Adicionado{' '}
                        {formatDistanceToNow(new Date(membro.adicionado_em), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Select
                    value={membro.papel}
                    onValueChange={(value) => alterarPapel(membro.usuario_id, value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membro">Membro</SelectItem>
                      <SelectItem value="coordenador">Coordenador</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removerMembro(membro.usuario_id)}
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal Adicionar Membro */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro ao Grupo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Usuário</Label>
              <Select
                value={usuarioSelecionado}
                onValueChange={setUsuarioSelecionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {usuariosDisponiveis.map((usuario) => (
                    <SelectItem key={usuario.usuario_id} value={usuario.usuario_id}>
                      {usuario.nome || usuario.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Papel no Grupo</Label>
              <Select value={papelSelecionado} onValueChange={setPapelSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membro">Membro</SelectItem>
                  <SelectItem value="coordenador">Coordenador</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={adicionarMembro} disabled={!usuarioSelecionado}>
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}