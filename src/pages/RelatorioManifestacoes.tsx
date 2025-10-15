import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, CheckCircle, FileSignature, ClipboardList, Download, FileDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TIPO_CONFIG = {
  parecer: {
    icon: FileText,
    label: "Parecer Técnico",
    color: "bg-blue-100 text-blue-800",
  },
  decisao: {
    icon: CheckCircle,
    label: "Decisão",
    color: "bg-green-100 text-green-800",
  },
  justificativa: {
    icon: FileSignature,
    label: "Justificativa",
    color: "bg-orange-100 text-orange-800",
  },
  observacao_formal: {
    icon: ClipboardList,
    label: "Observação Formal",
    color: "bg-purple-100 text-purple-800",
  },
};

export default function RelatorioManifestacoes() {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const { data: manifestacoes, isLoading } = useQuery({
    queryKey: ["manifestacoes-formais", filtroTipo],
    queryFn: async () => {
      let query = supabase
        .from("workflow_messages")
        .select(`
          *,
          profiles:sender_id(nome, email),
          workflow_executions!workflow_messages_execution_id_fkey(
            id,
            workflow_name,
            inscricoes_edital(
              id,
              protocolo,
              profiles(nome)
            )
          )
        `)
        .in("tipo", ["parecer", "decisao", "justificativa", "observacao_formal"])
        .order("created_at", { ascending: false });

      if (filtroTipo !== "todos") {
        query = query.eq("tipo", filtroTipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const exportarPDF = () => {
    if (!manifestacoes || manifestacoes.length === 0) return;

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text("Relatório de Manifestações Formais", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 28);
    doc.text(`Total de registros: ${manifestacoes.length}`, 14, 34);

    // Tabela
    const tableData = manifestacoes.map((m: any) => [
      format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      TIPO_CONFIG[m.tipo as keyof typeof TIPO_CONFIG]?.label || m.tipo,
      m.profiles?.nome || "Usuário",
      m.workflow_executions?.inscricoes_edital?.protocolo || "N/A",
      m.content?.substring(0, 60) + (m.content?.length > 60 ? "..." : ""),
      m.manifestacao_metadata?.categoria || "-",
      m.manifestacao_metadata?.impacto || "-",
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Data", "Tipo", "Autor", "Processo", "Conteúdo", "Categoria", "Impacto"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`manifestacoes_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manifestações Formais</h1>
          <p className="text-muted-foreground">
            Relatório completo de pareceres, decisões e justificativas
          </p>
        </div>
        <Button onClick={exportarPDF} disabled={!manifestacoes?.length}>
          <FileDown className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="parecer">Parecer Técnico</SelectItem>
                <SelectItem value="decisao">Decisão</SelectItem>
                <SelectItem value="justificativa">Justificativa</SelectItem>
                <SelectItem value="observacao_formal">Observação Formal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : !manifestacoes?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma manifestação formal encontrada
            </div>
          ) : (
            <div className="space-y-4">
              {manifestacoes.map((manifestacao: any) => {
                const config = TIPO_CONFIG[manifestacao.tipo as keyof typeof TIPO_CONFIG];
                const Icon = config?.icon || FileText;

                return (
                  <Card key={manifestacao.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${config?.color || "bg-gray-100"}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{config?.label || manifestacao.tipo}</Badge>
                            {manifestacao.manifestacao_metadata?.categoria && (
                              <Badge variant="secondary">
                                {manifestacao.manifestacao_metadata.categoria}
                              </Badge>
                            )}
                            {manifestacao.manifestacao_metadata?.impacto && (
                              <Badge
                                variant={
                                  manifestacao.manifestacao_metadata.impacto === "critico"
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                Impacto: {manifestacao.manifestacao_metadata.impacto}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong>{manifestacao.profiles?.nome || "Usuário"}</strong> •{" "}
                            {format(new Date(manifestacao.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}{" "}
                            • Processo:{" "}
                            {manifestacao.workflow_executions?.inscricoes_edital?.protocolo ||
                              "N/A"}
                          </p>
                          <p className="text-sm">{manifestacao.content}</p>
                          {manifestacao.manifestacao_metadata?.prazo_resposta && (
                            <p className="text-xs text-muted-foreground">
                              Prazo para resposta:{" "}
                              {manifestacao.manifestacao_metadata.prazo_resposta}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
