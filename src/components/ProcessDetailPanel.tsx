import { useState } from "react";
import { X, FileText, MessageSquare, History, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DocumentsTab } from "./process-tabs/DocumentsTab";
import { MessagesTab } from "./process-tabs/MessagesTab";
import { HistoryTab } from "./process-tabs/HistoryTab";
import { toast } from "sonner";

interface Processo {
  id: number;
  protocolo: string;
  nome: string;
  especialidade: string;
  dataSubmissao: string;
  status: "em_analise" | "aprovado" | "pendente" | "inabilitado";
  analista?: string;
}

interface ProcessDetailPanelProps {
  processo: Processo;
  onClose: () => void;
  onStatusChange: (id: number, newStatus: "aprovado" | "inabilitado" | "pendente") => void;
}

export function ProcessDetailPanel({ processo, onClose, onStatusChange }: ProcessDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("documentos");

  const handleAprovar = () => {
    onStatusChange(processo.id, "aprovado");
    toast.success("Processo aprovado com sucesso!");
  };

  const handleRejeitar = () => {
    onStatusChange(processo.id, "inabilitado");
    toast.error("Processo inabilitado");
  };

  const handleSolicitarInfo = () => {
    onStatusChange(processo.id, "pendente");
    toast.warning("Informações adicionais solicitadas");
    setActiveTab("mensagens");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed right-0 top-0 bottom-0 w-full lg:w-3/4 xl:w-2/3 bg-background border-l border-border shadow-2xl animate-slide-in-right overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">{processo.nome}</h2>
                <StatusBadge status={processo.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono">{processo.protocolo}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{processo.especialidade}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{new Date(processo.dataSubmissao).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Action Buttons */}
          {processo.status === "em_analise" && (
            <div className="flex gap-3 px-6 pb-4">
              <Button
                onClick={handleAprovar}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Aprovar
              </Button>
              <Button
                onClick={handleRejeitar}
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
              >
                <XCircle className="h-4 w-4" />
                Rejeitar
              </Button>
              <Button
                onClick={handleSolicitarInfo}
                variant="outline"
                className="border-orange-500/30 hover:bg-orange-500/10 text-orange-400 gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                Solicitar Informação
              </Button>
            </div>
          )}
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
            <TabsTrigger
              value="documentos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
            >
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger
              value="mensagens"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
            >
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="documentos" className="m-0 p-6">
              <DocumentsTab processoId={processo.id} />
            </TabsContent>
            <TabsContent value="mensagens" className="m-0 p-6">
              <MessagesTab processoId={processo.id} candidatoNome={processo.nome} />
            </TabsContent>
            <TabsContent value="historico" className="m-0 p-6">
              <HistoryTab processoId={processo.id} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
