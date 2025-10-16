import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Upload, FileText } from 'lucide-react';

interface SolicitarAlteracaoChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dadosAtuais: any;
  documentosAtuais?: any[];
  onSubmit: (dados: {
    tipo: 'campo' | 'documento';
    campo?: string;
    valorAtual?: string;
    valorNovo?: string;
    documentoId?: string;
    novoArquivo?: File;
    justificativa: string;
  }) => Promise<void>;
}

const CAMPOS_DISPONIVEIS = [
  { value: 'nome', label: 'Nome', caminho: 'nome' },
  { value: 'email', label: 'Email', caminho: 'email' },
  { value: 'telefone', label: 'Telefone', caminho: 'telefone' },
  { value: 'celular', label: 'Celular', caminho: 'celular' },
  { value: 'endereco', label: 'Endereço', caminho: 'endereco' },
  { value: 'cidade', label: 'Cidade', caminho: 'cidade' },
  { value: 'estado', label: 'Estado', caminho: 'estado' },
  { value: 'cep', label: 'CEP', caminho: 'cep' },
  { value: 'cpf', label: 'CPF', caminho: 'cpf' },
  { value: 'cnpj', label: 'CNPJ', caminho: 'cnpj' },
  { value: 'rg', label: 'RG', caminho: 'rg' },
];

export function SolicitarAlteracaoChatDialog({
  open,
  onOpenChange,
  dadosAtuais,
  documentosAtuais = [],
  onSubmit
}: SolicitarAlteracaoChatDialogProps) {
  const [tipoSolicitacao, setTipoSolicitacao] = useState<'campo' | 'documento'>('campo');
  const [campoSelecionado, setCampoSelecionado] = useState('');
  const [valorNovo, setValorNovo] = useState('');
  const [documentoSelecionado, setDocumentoSelecionado] = useState('');
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async () => {
    // Validações
    if (tipoSolicitacao === 'campo') {
      if (!campoSelecionado) {
        toast.error('Selecione um campo para alterar');
        return;
      }
      if (!valorNovo.trim()) {
        toast.error('Informe o novo valor');
        return;
      }
    } else {
      if (!documentoSelecionado) {
        toast.error('Selecione um documento para substituir');
        return;
      }
      if (!novoArquivo) {
        toast.error('Faça upload do novo documento');
        return;
      }
    }

    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória');
      return;
    }

    setEnviando(true);
    try {
      const valorAtual = tipoSolicitacao === 'campo' 
        ? obterValorAtual(campoSelecionado)
        : documentosAtuais.find(d => d.id === documentoSelecionado)?.arquivo_nome || '';

      await onSubmit({
        tipo: tipoSolicitacao,
        campo: tipoSolicitacao === 'campo' ? campoSelecionado : undefined,
        valorAtual,
        valorNovo: tipoSolicitacao === 'campo' ? valorNovo : undefined,
        documentoId: tipoSolicitacao === 'documento' ? documentoSelecionado : undefined,
        novoArquivo: tipoSolicitacao === 'documento' ? novoArquivo! : undefined,
        justificativa
      });

      // Resetar formulário
      setCampoSelecionado('');
      setValorNovo('');
      setDocumentoSelecionado('');
      setNovoArquivo(null);
      setJustificativa('');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
    } finally {
      setEnviando(false);
    }
  };

  const obterValorAtual = (campo: string): string => {
    if (!dadosAtuais) return '';
    return dadosAtuais[campo] || '';
  };

  const obterLabelCampo = (campo: string): string => {
    return CAMPOS_DISPONIVEIS.find(c => c.value === campo)?.label || campo;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Alteração de Dados</DialogTitle>
          <DialogDescription>
            Preencha o formulário para solicitar alteração de dados cadastrais ou substituição de documentos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tipo de solicitação */}
          <div className="space-y-3">
            <Label>Tipo de Solicitação</Label>
            <RadioGroup value={tipoSolicitacao} onValueChange={(v) => setTipoSolicitacao(v as 'campo' | 'documento')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="campo" id="tipo-campo" />
                <Label htmlFor="tipo-campo" className="cursor-pointer">Alterar Campo Cadastral</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="documento" id="tipo-documento" />
                <Label htmlFor="tipo-documento" className="cursor-pointer">Substituir Documento</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Formulário para campo cadastral */}
          {tipoSolicitacao === 'campo' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="campo">Campo a Alterar</Label>
                <Select value={campoSelecionado} onValueChange={setCampoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPOS_DISPONIVEIS.map((campo) => (
                      <SelectItem key={campo.value} value={campo.value}>
                        {campo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {campoSelecionado && (
                <>
                  <div className="space-y-2">
                    <Label>Valor Atual</Label>
                    <Input 
                      value={obterValorAtual(campoSelecionado)} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor-novo">Novo Valor</Label>
                    <Input
                      id="valor-novo"
                      value={valorNovo}
                      onChange={(e) => setValorNovo(e.target.value)}
                      placeholder={`Informe o novo ${obterLabelCampo(campoSelecionado).toLowerCase()}`}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Formulário para documento */}
          {tipoSolicitacao === 'documento' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="documento">Documento a Substituir</Label>
                <Select value={documentoSelecionado} onValueChange={setDocumentoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentosAtuais.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {doc.tipo_documento} - {doc.arquivo_nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="novo-arquivo">Novo Documento</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    id="novo-arquivo"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setNovoArquivo(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="novo-arquivo" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    {novoArquivo ? (
                      <div>
                        <p className="font-medium">{novoArquivo.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(novoArquivo.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">Clique para fazer upload</p>
                        <p className="text-sm text-muted-foreground">PDF, JPG ou PNG (máx. 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa *</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique o motivo da alteração solicitada..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
