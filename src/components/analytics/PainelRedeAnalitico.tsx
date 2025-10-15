import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, BarChart3, Users, Star, TrendingUp, Activity } from "lucide-react";
import { MapaRedeComScores } from "./MapaRedeComScores";
import { DashboardKPIsRede } from "./DashboardKPIsRede";
import { ListaProfissionais } from "./ListaProfissionais";
import { useEstatisticasRede } from "@/hooks/useRedeAnalitica";

export function PainelRedeAnalitico() {
  const { data: stats, isLoading } = useEstatisticasRede();
  const [activeTab, setActiveTab] = useState("kpis");
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse">Carregando estatísticas da rede...</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com KPIs rápidos */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30 hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profissionais Ativos</p>
                <p className="text-3xl font-bold text-blue-400">{stats?.total_profissionais || 0}</p>
              </div>
              <Users className="h-10 w-10 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30 hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média de Avaliação</p>
                <p className="text-3xl font-bold text-green-400">
                  {stats?.media_avaliacao_geral?.toFixed(1) || "N/A"}
                </p>
              </div>
              <Star className="h-10 w-10 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/30 hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Especialidades</p>
                <p className="text-3xl font-bold text-purple-400">{stats?.especialidades?.length || 0}</p>
              </div>
              <Activity className="h-10 w-10 text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/30 hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credenciados Ativos</p>
                <p className="text-3xl font-bold text-orange-400">{stats?.total_credenciados || 0}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Abas de visualização */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kpis" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="mapa" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Mapa Interativo</span>
          </TabsTrigger>
          <TabsTrigger value="lista" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Lista de Profissionais</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="kpis" className="mt-6">
          <DashboardKPIsRede stats={stats} />
        </TabsContent>
        
        <TabsContent value="mapa" className="mt-6">
          <MapaRedeComScores />
        </TabsContent>
        
        <TabsContent value="lista" className="mt-6">
          <ListaProfissionais />
        </TabsContent>
      </Tabs>
    </div>
  );
}
