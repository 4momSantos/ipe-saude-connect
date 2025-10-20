import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, BarChart3, FileDown, Map, Activity, Layers } from "lucide-react";
import { MapaUnificado } from "@/components/analytics/MapaUnificado";
import { DashboardRelatorios } from "@/components/analytics/DashboardRelatorios";
import { DimensionamentoRedeRS } from "@/components/analytics/DimensionamentoRedeRS";
import { RelatoriosCustomizaveis } from "@/components/analytics/RelatoriosCustomizaveis";
import { GeocodingManager } from "@/components/analytics/GeocodingManager";
import { GeocodingObservability } from "@/components/analytics/GeocodingObservability";
import { MapaDensidadeMultiCidade } from "@/components/analytics/MapaDensidadeMultiCidade";
import { PainelRedeAnalitico } from "@/components/analytics/PainelRedeAnalitico";
import { RelatorioDesempenhoRede } from "@/components/analytics/RelatorioDesempenhoRede";

export default function AnalisesRelatorios() {
  const [activeTab, setActiveTab] = useState("mapa");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Análises e Relatórios
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualize dados, tendências e exporte relatórios personalizados
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto">
          <TabsTrigger value="mapa" className="gap-2">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Mapa</span>
          </TabsTrigger>
          <TabsTrigger value="densidade" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Densidade</span>
          </TabsTrigger>
          <TabsTrigger value="rede" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Rede</span>
          </TabsTrigger>
          <TabsTrigger value="dimensionamento" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Dimensionamento</span>
          </TabsTrigger>
          <TabsTrigger value="monitoramento" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Monitoramento</span>
          </TabsTrigger>
          <TabsTrigger value="dashboards" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboards</span>
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2">
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mapa" className="mt-6 space-y-6">
          <GeocodingManager />
          <MapaUnificado modo="credenciados" height="700px" />
        </TabsContent>

        <TabsContent value="densidade" className="mt-6">
          <MapaDensidadeMultiCidade />
        </TabsContent>

        <TabsContent value="rede" className="mt-6">
          <PainelRedeAnalitico />
        </TabsContent>

        <TabsContent value="dimensionamento" className="mt-6">
          <DimensionamentoRedeRS />
        </TabsContent>

        <TabsContent value="monitoramento" className="mt-6">
          <GeocodingObservability />
        </TabsContent>

        <TabsContent value="dashboards" className="mt-6">
          <DashboardRelatorios />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-6 space-y-6">
          <RelatorioDesempenhoRede />
          <RelatoriosCustomizaveis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
