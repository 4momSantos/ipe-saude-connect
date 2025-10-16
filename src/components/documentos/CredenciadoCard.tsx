import { useMemo } from 'react';
import { User, FileText, CheckCircle, Clock, XCircle, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ResultadoBusca } from '@/hooks/useBuscarDocumentos';
import { DocumentoItem } from './DocumentoItem';

interface CredenciadoCardProps {
  credenciadoNome: string;
  credenciadoCpf: string;
  documentos: ResultadoBusca[];
  onVisualizar: (url: string, nome: string) => void;
  onBaixar: (url: string, nome: string) => void;
  onVerOCR?: (documento: ResultadoBusca) => void;
  showPrazo?: boolean;
}

export function CredenciadoCard({ 
  credenciadoNome, 
  credenciadoCpf, 
  documentos,
  onVisualizar,
  onBaixar,
  onVerOCR,
  showPrazo = false
}: CredenciadoCardProps) {
  
  // Agrupar documentos por tipo
  const documentosPorTipo = useMemo(() => {
    return documentos.reduce((grupos, doc) => {
      const tipo = doc.tipo_documento || 'Sem tipo';
      if (!grupos[tipo]) {
        grupos[tipo] = [];
      }
      grupos[tipo].push(doc);
      return grupos;
    }, {} as Record<string, ResultadoBusca[]>);
  }, [documentos]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const statusCounts = documentos.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: documentos.length,
      tipos: Object.keys(documentosPorTipo).length,
      aprovado: (statusCounts['aprovado'] || 0) + (statusCounts['validado'] || 0),
      pendente: statusCounts['pendente'] || 0,
      rejeitado: statusCounts['rejeitado'] || 0
    };
  }, [documentos, documentosPorTipo]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="bg-primary/10 p-2 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{credenciadoNome}</CardTitle>
              <p className="text-sm text-muted-foreground">CPF: {credenciadoCpf}</p>
            </div>
          </div>
        </div>
        
        {/* Estatísticas */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
          <Badge variant="outline" className="gap-1.5">
            <FileText className="h-3 w-3" />
            {stats.total} {stats.total === 1 ? 'documento' : 'documentos'}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <FolderOpen className="h-3 w-3" />
            {stats.tipos} {stats.tipos === 1 ? 'tipo' : 'tipos'}
          </Badge>
          {stats.aprovado > 0 && (
            <Badge variant="default" className="gap-1.5">
              <CheckCircle className="h-3 w-3" />
              {stats.aprovado}
            </Badge>
          )}
          {stats.pendente > 0 && (
            <Badge variant="secondary" className="gap-1.5">
              <Clock className="h-3 w-3" />
              {stats.pendente}
            </Badge>
          )}
          {stats.rejeitado > 0 && (
            <Badge variant="destructive" className="gap-1.5">
              <XCircle className="h-3 w-3" />
              {stats.rejeitado}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Accordion type="multiple" className="space-y-2">
          {Object.entries(documentosPorTipo).map(([tipo, docs]) => (
            <AccordionItem key={tipo} value={tipo} className="border rounded-lg">
              <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-accent/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{tipo}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {docs.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-2 space-y-2">
                {docs.map((doc) => (
                  <DocumentoItem
                    key={doc.id}
                    documento={doc}
                    onVisualizar={onVisualizar}
                    onBaixar={onBaixar}
                    showCredenciado={false}
                    showPrazo={showPrazo}
                    onVerOCR={onVerOCR}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
