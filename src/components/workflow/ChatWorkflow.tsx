import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, 
  Paperclip, 
  Eye, 
  EyeOff, 
  Reply,
  MoreVertical,
  Check,
  CheckCheck,
  AtSign,
  X,
  File,
  Loader2
} from 'lucide-react';
import { AttachmentPreview } from './AttachmentPreview';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Mapeia papel do usuário para sender_type válido no banco
const mapearSenderType = (papel: string): 'analista' | 'candidato' | 'sistema' => {
  if (papel === 'analista' || papel === 'gestor' || papel === 'admin') {
    return 'analista';
  }
  return 'candidato';
};

interface Mensagem {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string;
  usuario_papel: string;
  tipo: string;
  mensagem: string;
  mensagem_html: string;
  mencoes: string[];
  em_resposta_a: string | null;
  anexos: any[];
  lido_por: any[];
  created_at: string;
  editada: boolean;
  mensagem_original?: any;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: string;
}

interface ChatWorkflowProps {
  inscricaoId: string;
  executionId?: string;
  etapaAtual?: string;
  usuarioPapel?: 'candidato' | 'analista' | 'gestor' | 'admin';
}

export function ChatWorkflow({ inscricaoId, executionId, etapaAtual, usuarioPapel = 'candidato' }: ChatWorkflowProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Form state
  const [novaMensagem, setNovaMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'comentario' | 'nota_interna' | 'solicitacao'>('comentario');
  const [privada, setPrivada] = useState(false);
  const [emRespostaA, setEmRespostaA] = useState<string | null>(null);
  const [anexos, setAnexos] = useState<File[]>([]);
  
  // Menções
  const [mostrandoMencoes, setMostrandoMencoes] = useState(false);
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<Usuario[]>([]);
  const [posicaoCursorMencao, setPosicaoCursorMencao] = useState(0);
  const [buscaMencao, setBuscaMencao] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mensagensEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inicializar();
    const cleanup = setupRealtime();
    
    return () => {
      cleanup?.();
    };
  }, [inscricaoId, executionId]);

  useEffect(() => {
    scrollParaFinal();
  }, [mensagens]);

  const inicializar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      await carregarMensagens();
      await carregarUsuariosDisponiveis();
    } catch (error) {
      console.error('Erro ao inicializar:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarMensagens = async () => {
    try {
      const { data, error } = await supabase
        .from('v_mensagens_completas' as any)
        .select('*')
        .eq('inscricao_id', inscricaoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMensagens((data as any) || []);
      
      // Marcar mensagens como lidas
      if (currentUser) {
        (data as any)?.forEach((msg: any) => {
          if (msg.usuario_id !== currentUser?.id) {
            marcarComoLida(msg.id);
          }
        });
      }
    } catch (error: any) {
      toast.error('Erro ao carregar mensagens: ' + error.message);
    }
  };

  const carregarUsuariosDisponiveis = async () => {
    try {
      const { data, error } = await supabase
        .rpc('buscar_usuarios_para_mencao' as any, {
          p_inscricao_id: inscricaoId,
          p_termo: buscaMencao
        } as any);

      if (error) throw error;
      setUsuariosDisponiveis((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel(`workflow_chat_${inscricaoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_messages',
          filter: `inscricao_id=eq.${inscricaoId}`
        },
        (payload) => {
          console.log('Nova mensagem recebida:', payload);
          carregarMensagens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const processarMencoes = (texto: string): { mencoes: string[], html: string } => {
    const mencoes: string[] = [];
    let html = texto;

    // Regex para detectar @usuario
    const regexMencao = /@\[([^\]]+)\]\(([a-f0-9-]+)\)/g;
    
    let match;
    while ((match = regexMencao.exec(texto)) !== null) {
      const [_, nome, userId] = match;
      mencoes.push(userId);
      html = html.replace(match[0], `<span class="mention text-blue-600 font-medium">@${nome}</span>`);
    }

    return { mencoes, html };
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const valor = e.target.value;
    setNovaMensagem(valor);

    // Detectar @ para mostrar lista de menções
    const cursorPos = e.target.selectionStart;
    const textoAteCursor = valor.substring(0, cursorPos);
    const ultimoAt = textoAteCursor.lastIndexOf('@');

    if (ultimoAt !== -1 && (ultimoAt === 0 || valor[ultimoAt - 1] === ' ')) {
      const termoMencao = textoAteCursor.substring(ultimoAt + 1);
      if (!termoMencao.includes(' ')) {
        setBuscaMencao(termoMencao);
        setPosicaoCursorMencao(ultimoAt);
        setMostrandoMencoes(true);
        carregarUsuariosDisponiveis();
      } else {
        setMostrandoMencoes(false);
      }
    } else {
      setMostrandoMencoes(false);
    }
  };

  const inserirMencao = (usuario: Usuario) => {
    if (!textareaRef.current) return;

    const antes = novaMensagem.substring(0, posicaoCursorMencao);
    const depois = novaMensagem.substring(textareaRef.current.selectionStart);
    const mencaoFormatada = `@[${usuario.nome}](${usuario.id}) `;

    const novoTexto = antes + mencaoFormatada + depois;
    setNovaMensagem(novoTexto);
    setMostrandoMencoes(false);

    // Focar e posicionar cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const novaPosicao = (antes + mencaoFormatada).length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(novaPosicao, novaPosicao);
      }
    }, 0);
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() && anexos.length === 0) return;

    setEnviando(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar nome do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, email')
        .eq('id', user.id)
        .single();

      // Processar menções
      const { mencoes, html } = processarMencoes(novaMensagem);

      // Determinar visibilidade
      let visivel_para = ['todos'];
      if (tipoMensagem === 'nota_interna') {
        visivel_para = ['analista', 'gestor', 'admin'];
      } else if (privada) {
        visivel_para = ['gestor', 'admin'];
      }

      // Upload de anexos
      const anexosUpload = await Promise.all(
        anexos.map(async (file) => {
          const fileName = `${Date.now()}_${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('workflow-anexos')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('workflow-anexos')
            .getPublicUrl(fileName);

          return {
            nome: file.name,
            url: urlData.publicUrl,
            tipo: file.type,
            tamanho: file.size
          };
        })
      );

      // Inserir mensagem
      const insertData: any = {
        inscricao_id: inscricaoId,
        execution_id: executionId || null,
        etapa_id: etapaAtual || null,
        sender_id: user.id,
        usuario_nome: profile?.nome || user.email,
        usuario_email: user.email || '',
        usuario_papel: usuarioPapel,
        sender_type: mapearSenderType(usuarioPapel),
        tipo: tipoMensagem,
        content: novaMensagem,
        mensagem: novaMensagem,
        mensagem_html: html,
        mencoes: mencoes,
        visivel_para: visivel_para,
        privada: privada,
        em_resposta_a: emRespostaA || null
      };

      const { data, error } = await supabase
        .from('workflow_messages')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Registrar anexos
      if (anexosUpload.length > 0 && data) {
        await Promise.all(
          anexosUpload.map((anexo) =>
            supabase.from('anexos_mensagens' as any).insert({
              mensagem_id: data.id,
              nome_arquivo: anexo.nome,
              nome_original: anexo.nome,
              tamanho_bytes: anexo.tamanho,
              mime_type: anexo.tipo,
              storage_path: anexo.url,
              url_publica: anexo.url,
              enviado_por: user.id
            } as any)
          )
        );
      }

      // Limpar form
      setNovaMensagem('');
      setAnexos([]);
      setEmRespostaA(null);
      setPrivada(false);
      
      toast.success(
        mencoes.length > 0 
          ? `Mensagem enviada e ${mencoes.length} pessoa(s) mencionada(s)!` 
          : 'Mensagem enviada!'
      );

      // Recarregar mensagens
      await carregarMensagens();
    } catch (error: any) {
      toast.error('Erro ao enviar: ' + error.message);
    } finally {
      setEnviando(false);
    }
  };

  const marcarComoLida = async (mensagemId: string) => {
    try {
      await supabase.rpc('marcar_mensagem_lida' as any, {
        p_mensagem_id: mensagemId
      } as any);
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const responderMensagem = (mensagem: Mensagem) => {
    setEmRespostaA(mensagem.id);
    textareaRef.current?.focus();
  };

  const scrollParaFinal = () => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderizarMensagem = (mensagem: Mensagem) => {
    const ehAutor = mensagem.usuario_id === currentUser?.id;

    return (
      <div
        key={mensagem.id}
        className={`flex gap-3 ${ehAutor ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar */}
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback>
            {mensagem.usuario_nome?.charAt(0) || mensagem.usuario_email.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Conteúdo da mensagem */}
        <div className={`flex-1 max-w-[70%] ${ehAutor ? 'items-end' : 'items-start'}`}>
          {/* Header */}
          <div className={`flex items-center gap-2 mb-1 ${ehAutor ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-sm font-medium">
              {mensagem.usuario_nome || mensagem.usuario_email}
            </span>
            <Badge variant="outline" className="text-xs">
              {mensagem.usuario_papel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(mensagem.created_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </span>
            {mensagem.editada && (
              <span className="text-xs text-muted-foreground">(editada)</span>
            )}
          </div>

          {/* Mensagem em resposta */}
          {mensagem.mensagem_original && (
            <div className="bg-muted border-l-4 border-primary p-2 mb-2 rounded text-sm">
              <div className="font-medium text-foreground">
                {mensagem.mensagem_original.usuario_nome}
              </div>
              <div className="text-muted-foreground truncate">
                {mensagem.mensagem_original.mensagem}
              </div>
            </div>
          )}

          {/* Badge de tipo */}
          {mensagem.tipo !== 'comentario' && (
            <Badge
              variant={mensagem.tipo === 'nota_interna' ? 'secondary' : 'default'}
              className="mb-2"
            >
              {mensagem.tipo === 'nota_interna' && <EyeOff className="w-3 h-3 mr-1" />}
              {mensagem.tipo === 'nota_interna' ? 'Nota Interna' : 'Solicitação'}
            </Badge>
          )}

          {/* Balão da mensagem */}
          <Card
            className={`p-3 ${
              ehAutor
                ? 'bg-primary text-primary-foreground'
                : mensagem.tipo === 'nota_interna'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-card'
            }`}
          >
            <div
              className="whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{
                __html: mensagem.mensagem_html || mensagem.mensagem
              }}
            />

            {/* Anexos */}
            {mensagem.anexos && mensagem.anexos.length > 0 && (
              <div className="mt-2 space-y-2">
                {mensagem.anexos.map((anexo: any, idx: number) => (
                  <AttachmentPreview 
                    key={anexo.id || idx} 
                    anexo={{
                      nome: anexo.nome || anexo.nome_arquivo,
                      url: anexo.url || anexo.url_publica,
                      tipo: anexo.tipo || anexo.mime_type || 'application/octet-stream',
                      tamanho: anexo.tamanho || anexo.tamanho_bytes || 0
                    }}
                    compact={mensagem.anexos.length > 1} 
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Ações */}
          <div className={`flex items-center gap-2 mt-1 ${ehAutor ? 'flex-row-reverse' : 'flex-row'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => responderMensagem(mensagem)}
            >
              <Reply className="w-3 h-3 mr-1" />
              Responder
            </Button>

            {ehAutor && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {mensagem.lido_por && mensagem.lido_por.length > 1 ? (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    Lida por {mensagem.lido_por.length - 1}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Enviada
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Carregando mensagens...</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Chat do Workflow</h3>
          <p className="text-sm text-muted-foreground">
            {mensagens.length} mensagem(ns)
          </p>
        </div>

        {/* Filtros de tipo de mensagem */}
        <div className="flex gap-2">
          <Button
            variant={tipoMensagem === 'comentario' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTipoMensagem('comentario')}
          >
            Comentário
          </Button>
          {(usuarioPapel === 'analista' || usuarioPapel === 'gestor' || usuarioPapel === 'admin') && (
            <Button
              variant={tipoMensagem === 'nota_interna' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setTipoMensagem('nota_interna')}
            >
              <EyeOff className="w-4 h-4 mr-1" />
              Nota Interna
            </Button>
          )}
          <Button
            variant={tipoMensagem === 'solicitacao' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTipoMensagem('solicitacao')}
          >
            Solicitação
          </Button>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensagens.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          mensagens.map(renderizarMensagem)
        )}
        <div ref={mensagensEndRef} />
      </div>

      {/* Respondendo a */}
      {emRespostaA && (
        <div className="px-4 py-2 bg-muted border-t flex justify-between items-center">
          <div className="text-sm">
            <span className="text-muted-foreground">Respondendo a </span>
            <span className="font-medium">
              {mensagens.find(m => m.id === emRespostaA)?.usuario_nome}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEmRespostaA(null)}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Input de nova mensagem */}
      <div className="p-4 border-t">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={novaMensagem}
            onChange={handleTextareaChange}
            placeholder="Digite sua mensagem... Use @ para mencionar alguém"
            rows={3}
            className="pr-24"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensagem();
              }
            }}
          />

          {/* Lista de menções */}
          {mostrandoMencoes && usuariosDisponiveis.length > 0 && (
            <Card className="absolute bottom-full mb-2 w-64 max-h-48 overflow-y-auto z-10">
              {usuariosDisponiveis.map((usuario) => (
                <div
                  key={usuario.id}
                  className="p-2 hover:bg-muted cursor-pointer flex items-center gap-2"
                  onClick={() => inserirMencao(usuario)}
                >
                  <AtSign className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{usuario.nome}</div>
                    <div className="text-xs text-muted-foreground">{usuario.email}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {usuario.papel}
                  </Badge>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Preview de anexos antes de enviar */}
        {anexos.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 mb-3 bg-muted rounded-lg border mt-2">
            {anexos.map((file, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 px-3 py-2 bg-background rounded-md border border-border"
              >
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAnexos(anexos.filter((_, i) => i !== idx))}
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                
                // Validar tamanho (max 10MB por arquivo)
                const maxSize = 10 * 1024 * 1024;
                const invalidFiles = files.filter(f => f.size > maxSize);
                
                if (invalidFiles.length > 0) {
                  toast.error(`Arquivos muito grandes (máx 10MB): ${invalidFiles.map(f => f.name).join(', ')}`);
                  return;
                }
                
                // Validar total de arquivos (max 5)
                if (anexos.length + files.length > 5) {
                  toast.error('Máximo de 5 arquivos por mensagem');
                  return;
                }
                
                setAnexos([...anexos, ...files]);
                e.target.value = ''; // Limpar input
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4 mr-1" />
              Anexar
            </Button>

            {(usuarioPapel === 'gestor' || usuarioPapel === 'admin') && (
              <Button
                variant={privada ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setPrivada(!privada)}
              >
                {privada ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {privada ? 'Privada' : 'Pública'}
              </Button>
            )}
          </div>

          <Button
            onClick={enviarMensagem}
            disabled={enviando || (!novaMensagem.trim() && anexos.length === 0)}
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar
          </Button>
        </div>
      </div>
    </Card>
  );
}