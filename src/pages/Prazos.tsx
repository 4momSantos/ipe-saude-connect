// FASE 1: Página Principal de Controle de Prazos
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPIsVencimentos } from "@/components/prazos/KPIsVencimentos";
import { TabelaPrazos } from "@/components/prazos/TabelaPrazos";
import { usePrazosVencimentos } from "@/hooks/usePrazosVencimentos";
import { useNotificarPrazo } from "@/hooks/useNotificarPrazo";
import { Calendar, FileText, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function Prazos() {
  const { data, isLoading } = usePrazosVencimentos();
  const notificarPrazo = useNotificarPrazo();
  const [activeTab, setActiveTab] = useState("tabela");

  const handleNotificar = async (prazoId: string) => {
    try {
      await notificarPrazo.mutateAsync({ prazo_id: prazoId });
    } catch (error) {
      console.error("Erro ao notificar:", error);
    }
  };

  const handleProrrogar = (prazoId: string) => {
    toast.info("Prorrogação realizada via modal de detalhes");
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Controle de Prazos</h1>
        <p className="text-muted-foreground">
          Monitore e gerencie os vencimentos de documentos e certificados dos credenciados
        </p>
      </div>

      {/* KPIs */}
      <KPIsVencimentos
        totalizadores={data?.totalizadores || { vencidos: 0, vencendo7dias: 0, vencendo30dias: 0, validos: 0 }}
        isLoading={isLoading}
      />

      {/* Tabs de Conteúdo */}
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tabela" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lista Completa
            </TabsTrigger>
            <TabsTrigger value="calendario" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tabela" className="mt-6">
            <TabelaPrazos
              prazos={data?.prazos || []}
              onNotificar={handleNotificar}
              onProrrogar={handleProrrogar}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="calendario" className="mt-6">
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center space-y-2">
                <Calendar className="h-12 w-12 mx-auto opacity-50" />
                <p className="text-sm">Calendário de Vencimentos</p>
                <p className="text-xs">Em desenvolvimento - FASE 2</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="relatorio" className="mt-6">
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center space-y-2">
                <BarChart3 className="h-12 w-12 mx-auto opacity-50" />
                <p className="text-sm">Relatórios e Exportação</p>
                <p className="text-xs">Em desenvolvimento - FASE 5</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}