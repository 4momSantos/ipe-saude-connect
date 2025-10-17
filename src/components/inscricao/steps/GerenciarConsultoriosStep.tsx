import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash, MapPin, Phone, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FormularioConsultorio } from './FormularioConsultorio';

interface Consultorio {
  id: string;
  nome_consultorio: string;
  cnes: string;
  telefone?: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  responsavel_tecnico_nome?: string;
  responsavel_tecnico_crm?: string;
  is_principal: boolean;
}

interface GerenciarConsultoriosStepProps {
  inscricaoId?: string;
}

export function GerenciarConsultoriosStep({ inscricaoId }: GerenciarConsultoriosStepProps) {
  const [consultorios, setConsultorios] = useState<Consultorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [consultorioEditando, setConsultorioEditando] = useState<Consultorio | null>(null);

  useEffect(() => {
    if (inscricaoId) {
      carregarConsultorios();
    }
  }, [inscricaoId]);

  const carregarConsultorios = async () => {
    if (!inscricaoId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('inscricao_consultorios')
      .select('*')
      .eq('inscricao_id', inscricaoId)
      .eq('ativo', true)
      .order('is_principal', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[CONSULTORIOS] Erro ao carregar:', error);
      toast.error('Erro ao carregar consultórios');
    } else {
      setConsultorios(data || []);
    }
    setLoading(false);
  };

  const abrirModalNovo = () => {
    setConsultorioEditando(null);
    setModalAberto(true);
  };

  const abrirModalEditar = (consultorio: Consultorio) => {
    setConsultorioEditando(consultorio);
    setModalAberto(true);
  };

  const handleSalvar = async (dados: any) => {
    if (!inscricaoId) return;

    try {
      if (consultorioEditando) {
        // Atualizar existente
        const { error } = await supabase
          .from('inscricao_consultorios')
          .update(dados)
          .eq('id', consultorioEditando.id);

        if (error) throw error;
        toast.success('Consultório atualizado!');
      } else {
        // Criar novo
        const { error } = await supabase
          .from('inscricao_consultorios')
          .insert({
            inscricao_id: inscricaoId,
            ...dados,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (error) throw error;
        toast.success('Consultório cadastrado!');
      }

      await carregarConsultorios();
      setModalAberto(false);
    } catch (error: any) {
      console.error('[CONSULTORIOS] Erro ao salvar:', error);
      toast.error(error.message || 'Erro ao salvar consultório');
    }
  };

  const handleRemover = async (id: string) => {
    if (!confirm('Deseja realmente remover este consultório?')) return;

    try {
      const { error } = await supabase
        .from('inscricao_consultorios')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Consultório removido');
      await carregarConsultorios();
    } catch (error: any) {
      console.error('[CONSULTORIOS] Erro ao remover:', error);
      toast.error('Erro ao remover consultório');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando consultórios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            Consultórios da Rede ({consultorios.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Cadastre todos os consultórios/unidades da sua empresa
          </p>
        </div>
        <Button onClick={abrirModalNovo}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Consultório
        </Button>
      </div>

      {/* Lista de Consultórios */}
      {consultorios.length === 0 ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            É necessário cadastrar pelo menos 1 consultório para continuar.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {consultorios.map((consultorio) => (
            <Card key={consultorio.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {consultorio.nome_consultorio}
                      </CardTitle>
                      {consultorio.is_principal && (
                        <Badge variant="default">Principal</Badge>
                      )}
                    </div>
                    <CardDescription>
                      CNES: {consultorio.cnes}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrirModalEditar(consultorio)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!consultorio.is_principal && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemover(consultorio.id)}
                      >
                        <Trash className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Endereço</p>
                        <p className="text-muted-foreground">
                          {consultorio.logradouro}, {consultorio.numero}
                        </p>
                        <p className="text-muted-foreground">
                          {consultorio.bairro} - {consultorio.cidade}/{consultorio.estado}
                        </p>
                      </div>
                    </div>
                  </div>
                  {consultorio.responsavel_tecnico_nome && (
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Responsável Técnico</p>
                          <p className="text-muted-foreground">
                            {consultorio.responsavel_tecnico_nome}
                          </p>
                          <p className="text-muted-foreground">
                            CRM: {consultorio.responsavel_tecnico_crm}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Adicionar/Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {consultorioEditando ? 'Editar Consultório' : 'Cadastrar Novo Consultório'}
            </DialogTitle>
          </DialogHeader>
          <FormularioConsultorio
            dadosIniciais={consultorioEditando}
            onSalvar={handleSalvar}
            onCancelar={() => setModalAberto(false)}
            possuiPrincipal={consultorios.some((c) => c.is_principal && c.id !== consultorioEditando?.id)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
