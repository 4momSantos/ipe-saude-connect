import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, FileCheck, Calendar, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Pendencia {
  tipo: string;
  descricao: string;
  severidade: 'critica' | 'media';
}

interface ModalVisualizarPendenciasProps {
  open: boolean;
  onClose: () => void;
  pendencias: Pendencia[];
  credenciadoId: string;
}

export function ModalVisualizarPendencias({
  open,
  onClose,
  pendencias,
}: ModalVisualizarPendenciasProps) {
  const categorizarPendencias = () => {
    const categorias = {
      documentos: pendencias.filter((p) => p.tipo === 'documentos'),
      contrato: pendencias.filter((p) => p.tipo === 'contrato'),
      atualizacao: pendencias.filter((p) => p.tipo === 'atualizacao'),
      suspensao: pendencias.filter((p) => p.tipo === 'suspensao'),
      debito: pendencias.filter((p) => p.tipo === 'debito'),
    };

    return categorias;
  };

  const categorias = categorizarPendencias();

  const getIcone = (tipo: string) => {
    const iconeMap: Record<string, any> = {
      documentos: FileText,
      contrato: FileCheck,
      atualizacao: Calendar,
      suspensao: AlertTriangle,
      debito: AlertTriangle,
    };
    return iconeMap[tipo] || FileText;
  };

  const renderCategoria = (tipo: string, items: Pendencia[]) => {
    if (items.length === 0) return null;

    const Icone = getIcone(tipo);
    const nomes: Record<string, string> = {
      documentos: 'Documentos',
      contrato: 'Contratos',
      atualizacao: 'Atualização Cadastral',
      suspensao: 'Suspensões',
      debito: 'Débitos',
    };

    return (
      <div key={tipo} className="space-y-3">
        <div className="flex items-center gap-2">
          <Icone className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">{nomes[tipo]}</h3>
          <Badge variant="secondary">{items.length}</Badge>
        </div>

        <div className="space-y-2 ml-7">
          {items.map((item, idx) => (
            <div key={idx} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">{item.descricao}</p>
                <Badge variant={item.severidade === 'critica' ? 'destructive' : 'secondary'}>
                  {item.severidade === 'critica' ? 'Crítica' : 'Média'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pendências para Regularização</DialogTitle>
          <DialogDescription>
            Resolva as pendências abaixo para melhorar sua situação cadastral
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {renderCategoria('documentos', categorias.documentos)}
            {renderCategoria('contrato', categorias.contrato)}
            {renderCategoria('atualizacao', categorias.atualizacao)}
            {renderCategoria('suspensao', categorias.suspensao)}
            {renderCategoria('debito', categorias.debito)}

            {pendencias.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma pendência encontrada
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Entre em contato se tiver dúvidas sobre como resolver
          </p>
          <Button onClick={onClose}>Entendi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
