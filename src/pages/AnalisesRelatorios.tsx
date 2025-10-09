import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, BarChart3, FileDown, Map, Activity } from "lucide-react";
import { MapaRedeInterativo } from "@/components/analytics/MapaRedeInterativo";
import { MapaCredenciados } from "@/components/analytics/MapaCredenciadosSimples";
import { DashboardRelatorios } from "@/components/analytics/DashboardRelatorios";
import { DimensionamentoRede } from "@/components/analytics/DimensionamentoRede";
import { RelatoriosCustomizaveis } from "@/components/analytics/RelatoriosCustomizaveis";
import { BatchGeocoding } from "@/components/analytics/BatchGeocoding";
import { BackfillGeocoding } from "@/components/analytics/BackfillGeocoding";

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
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="mapa" className="gap-2">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Mapa</span>
          </TabsTrigger>
          <TabsTrigger value="dimensionamento" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Dimensionamento</span>
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
          <div className="grid gap-6 md:grid-cols-2">
            <BatchGeocoding />
            <BackfillGeocoding />
          </div>
          <MapaCredenciados height="700px" />
        </TabsContent>

        <TabsContent value="dimensionamento" className="mt-6">
          <DimensionamentoRede />
        </TabsContent>

        <TabsContent value="dashboards" className="mt-6">
          <DashboardRelatorios />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-6">
          <RelatoriosCustomizaveis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
