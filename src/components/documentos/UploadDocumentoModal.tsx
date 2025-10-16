import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDocumentosCredenciado } from '@/hooks/useDocumentosCredenciado';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UploadDocumentoModalProps {
  open: boolean;
  onClose: () => void;
  credenciadoId?: string;
}

const TIPOS_DOCUMENTOS = [
  { value: 'CNPJ', label: 'CNPJ', mesesValidade: 24 },
  { value: 'ALVARA_SANITARIO', label: 'Alvará Sanitário', mesesValidade: 12 },
  { value: 'CERTIDAO_FEDERAL', label: 'Certidão Negativa Federal', mesesValidade: 6 },
  { value: 'CERTIDAO_ESTADUAL', label: 'Certidão Negativa Estadual', mesesValidade: 6 },
  { value: 'CERTIDAO_MUNICIPAL', label: 'Certidão Negativa Municipal', mesesValidade: 6 },
  { value: 'CNES', label: 'CNES', mesesValidade: 24 },
  { value: 'CRM_MEDICO', label: 'CRM Médico', mesesValidade: 12 },
  { value: 'CONTRATO_SOCIAL', label: 'Contrato Social', mesesValidade: 0 },
];

export function UploadDocumentoModal({ open, onClose, credenciadoId }: UploadDocumentoModalProps) {
  const { uploadDocumento } = useDocumentosCredenciado(credenciadoId);
  const [file, setFile] = useState<File | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [dataEmissao, setDataEmissao] = useState<Date>();
  const [dataVencimento, setDataVencimento] = useState<Date>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !tipoDocumento) return;

    await uploadDocumento.mutateAsync({
      file,
      tipoDocumento,
      dataEmissao,
      dataVencimento,
      numeroDocumento
    });

    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setTipoDocumento('');
    setNumeroDocumento('');
    setDataEmissao(undefined);
    setDataVencimento(undefined);
    onClose();
  };

  const handleTipoChange = (tipo: string) => {
    setTipoDocumento(tipo);
    
    // Auto-calcular data de vencimento
    if (dataEmissao) {
      const tipoConfig = TIPOS_DOCUMENTOS.find(t => t.value === tipo);
      if (tipoConfig && tipoConfig.mesesValidade > 0) {
        const venc = new Date(dataEmissao);
        venc.setMonth(venc.getMonth() + tipoConfig.mesesValidade);
        setDataVencimento(venc);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Documento</DialogTitle>
          <DialogDescription>
            Envie um novo documento do credenciado
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Documento</Label>
            <Select value={tipoDocumento} onValueChange={handleTipoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DOCUMENTOS.map(tipo => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Número do Documento (opcional)</Label>
            <Input
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              placeholder="Ex: 12.345.678/0001-90"
            />
          </div>

          <div>
            <Label>Data de Emissão</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataEmissao ? format(dataEmissao, "PPP", { locale: ptBR }) : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dataEmissao}
                  onSelect={(date) => {
                    setDataEmissao(date);
                    // Auto-calcular vencimento
                    if (date && tipoDocumento) {
                      const tipoConfig = TIPOS_DOCUMENTOS.find(t => t.value === tipoDocumento);
                      if (tipoConfig && tipoConfig.mesesValidade > 0) {
                        const venc = new Date(date);
                        venc.setMonth(venc.getMonth() + tipoConfig.mesesValidade);
                        setDataVencimento(venc);
                      }
                    }
                  }}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Data de Vencimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataVencimento ? format(dataVencimento, "PPP", { locale: ptBR }) : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dataVencimento}
                  onSelect={setDataVencimento}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Arquivo (PDF)</Label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!file || !tipoDocumento || uploadDocumento.isPending}
            >
              {uploadDocumento.isPending ? 'Enviando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
