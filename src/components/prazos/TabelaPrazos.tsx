// FASE 1: Componente de Tabela de Prazos
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, FileText } from "lucide-react";
import { PrazoVencimento } from "@/hooks/usePrazosVencimentos";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModalDetalhePrazo } from "./ModalDetalhePrazo";

interface TabelaPrazosProps {
  prazos: PrazoVencimento[];
  onNotificar: (prazoId: string) => void;
  onProrrogar: (prazoId: string) => void;
  isLoading?: boolean;
}

type FiltroStatus = "todos" | "vencidos" | "vencendo7" | "vencendo30" | "validos";

export const TabelaPrazos = ({ prazos, onNotificar, onProrrogar, isLoading }: TabelaPrazosProps) => {
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [prazoSelecionado, setPrazoSelecionado] = useState<PrazoVencimento | null>(null);

  const prazosFiltrados = prazos.filter(prazo => {
    if (filtro === "todos") return true;
    if (filtro === "vencidos") return prazo.dias_restantes < 0;
    if (filtro === "vencendo7") return prazo.dias_restantes >= 0 && prazo.dias_restantes <= 7;
    if (filtro === "vencendo30") return prazo.dias_restantes > 7 && prazo.dias_restantes <= 30;
    if (filtro === "validos") return prazo.dias_restantes > 30;
    return true;
  });

  const getStatusBadge = (diasRestantes: number) => {
    if (diasRestantes < 0) {
      return <Badge variant="destructive">Vencido ({Math.abs(diasRestantes)}d)</Badge>;
    }
    if (diasRestantes <= 7) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Urgente ({diasRestantes}d)</Badge>;
    }
    if (diasRestantes <= 30) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Atenção ({diasRestantes}d)</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-600">Válido ({diasRestantes}d)</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {prazosFiltrados.length} {prazosFiltrados.length === 1 ? "prazo" : "prazos"}
          </span>
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as FiltroStatus)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="vencidos">Vencidos</SelectItem>
            <SelectItem value="vencendo7">Vencendo (7 dias)</SelectItem>
            <SelectItem value="vencendo30">Vencendo (30 dias)</SelectItem>
            <SelectItem value="validos">Válidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Credenciado</TableHead>
              <TableHead>Tipo de Prazo</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : prazosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum prazo encontrado
                </TableCell>
              </TableRow>
            ) : (
              prazosFiltrados.map((prazo) => (
                <TableRow key={prazo.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{prazo.credenciado_nome}</TableCell>
                  <TableCell>
                    <span className="capitalize">{prazo.tipo_prazo.replace(/_/g, " ")}</span>
                  </TableCell>
                  <TableCell>
                    {new Date(prazo.data_vencimento).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{getStatusBadge(prazo.dias_restantes)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrazoSelecionado(prazo)}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNotificar(prazo.id)}
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {prazoSelecionado && (
        <ModalDetalhePrazo
          prazo={prazoSelecionado}
          open={!!prazoSelecionado}
          onClose={() => setPrazoSelecionado(null)}
          onProrrogar={() => {
            onProrrogar(prazoSelecionado.id);
            setPrazoSelecionado(null);
          }}
        />
      )}
    </div>
  );
};