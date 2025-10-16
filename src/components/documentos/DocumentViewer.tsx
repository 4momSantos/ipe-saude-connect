import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, X } from 'lucide-react';

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType?: string;
}

export function DocumentViewer({ open, onClose, fileUrl, fileName, fileType }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);

  const isPDF = fileType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isImage = fileType?.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg truncate max-w-md">{fileName}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(zoom + 10, 200))}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(zoom - 10, 50))}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 p-6">
          {isPDF ? (
            <div className="flex justify-center">
              <iframe
                src={`${fileUrl}#view=FitH`}
                className="w-full h-[70vh] border-0 rounded-lg bg-white shadow-lg"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                title={fileName}
              />
            </div>
          ) : isImage ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full h-auto rounded-lg shadow-lg"
                style={{ transform: `scale(${zoom / 100})` }}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Tipo de arquivo não suportado para visualização
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
