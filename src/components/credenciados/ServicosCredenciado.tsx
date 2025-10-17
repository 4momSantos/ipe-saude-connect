import { useState } from "react";
import { Plus, Edit2, Trash2, DollarSign, Clock, MapPin, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useServicosCredenciado, 
  useCreateServicoCredenciado,
  useUpdateServicoCredenciado,
  useDeleteServicoCredenciado,
  ServicoCredenciado
} from "@/hooks/useServicosCredenciado";
import { useProcedimentos } from "@/hooks/useProcedimentos";
import { useProfissionais } from "@/hooks/useProfissionais";
import { useEspecialidades } from "@/hooks/useEspecialidades";
import { useResolverEspecialidades } from "@/hooks/useResolverEspecialidades";

interface ServicosCredenciadoProps {
  credenciadoId: string;
  canEdit?: boolean;
}

export function ServicosCredenciado({ credenciadoId, canEdit = false }: ServicosCredenciadoProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<ServicoCredenciado | null>(null);
  const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState<string>("");

  const { data: servicos, isLoading } = useServicosCredenciado(credenciadoId);
  const { data: especialidades } = useEspecialidades();
  const { data: procedimentos } = useProcedimentos(especialidadeSelecionada || undefined);
  const { data: profissionais } = useProfissionais(credenciadoId);
  
  // Extrair CRMs dos profissionais para exibição
  const profissionaisComCRM = profissionais?.flatMap(prof => 
    prof.credenciado_crms?.map(crm => ({
      id: prof.id,
      nome: prof.nome,
      crm: crm.crm,
      uf_crm: crm.uf_crm,
    })) || []
  ) || [];

  const createMutation = useCreateServicoCredenciado();
  const updateMutation = useUpdateServicoCredenciado();
  const deleteMutation = useDeleteServicoCredenciado();

  const [formData, setFormData] = useState({
    procedimento_id: "",
    profissional_id: "",
    preco_base: "",
    preco_particular: "",
    preco_convenio: "",
    aceita_sus: false,
    disponivel_online: false,
    local_atendimento: "",
    observacoes: "",
  });

  const handleSubmit = () => {
    const data = {
      credenciado_id: credenciadoId,
      procedimento_id: formData.procedimento_id,
      profissional_id: formData.profissional_id || undefined,
      preco_base: formData.preco_base ? parseFloat(formData.preco_base) : undefined,
      preco_particular: formData.preco_particular ? parseFloat(formData.preco_particular) : undefined,
      preco_convenio: formData.preco_convenio ? parseFloat(formData.preco_convenio) : undefined,
      aceita_sus: formData.aceita_sus,
      disponivel_online: formData.disponivel_online,
      local_atendimento: formData.local_atendimento || undefined,
      observacoes: formData.observacoes || undefined,
    };

    if (editingServico) {
      updateMutation.mutate({ id: editingServico.servico_id, updates: data });
    } else {
      createMutation.mutate(data);
    }

    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      procedimento_id: "",
      profissional_id: "",
      preco_base: "",
      preco_particular: "",
      preco_convenio: "",
      aceita_sus: false,
      disponivel_online: false,
      local_atendimento: "",
      observacoes: "",
    });
    setEditingServico(null);
    setEspecialidadeSelecionada("");
  };

  const handleEdit = (servico: ServicoCredenciado) => {
    setEditingServico(servico);
    setEspecialidadeSelecionada(servico.especialidade_id);
    setFormData({
      procedimento_id: servico.procedimento_id,
      profissional_id: servico.profissional_id || "",
      preco_base: servico.preco_base?.toString() || "",
      preco_particular: servico.preco_particular?.toString() || "",
      preco_convenio: servico.preco_convenio?.toString() || "",
      aceita_sus: servico.aceita_sus,
      disponivel_online: servico.disponivel_online,
      local_atendimento: servico.local_atendimento || "",
      observacoes: servico.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (servicoId: string) => {
    if (confirm("Tem certeza que deseja remover este serviço do catálogo?")) {
      deleteMutation.mutate({ id: servicoId, credenciado_id: credenciadoId });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Catálogo de Serviços
            </CardTitle>
            <CardDescription>
              Procedimentos e serviços médicos ofertados por este credenciado
            </CardDescription>
          </div>
          {canEdit && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Serviço
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingServico ? "Editar Serviço" : "Adicionar Novo Serviço"}
                  </DialogTitle>
                  <DialogDescription>
                    Cadastre os procedimentos médicos oferecidos por este credenciado
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="especialidade">Especialidade *</Label>
                    <Select
                      value={especialidadeSelecionada}
                      onValueChange={(value) => {
                        setEspecialidadeSelecionada(value);
                        setFormData({ ...formData, procedimento_id: "" });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a especialidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {especialidades?.map((esp) => (
                          <SelectItem key={esp.id} value={esp.id}>
                            {esp.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="procedimento">Procedimento *</Label>
                    <Select
                      value={formData.procedimento_id}
                      onValueChange={(value) => setFormData({ ...formData, procedimento_id: value })}
                      disabled={!especialidadeSelecionada}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          especialidadeSelecionada 
                            ? "Selecione o procedimento" 
                            : "Selecione uma especialidade primeiro"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {procedimentos?.map((proc) => (
                          <SelectItem key={proc.id} value={proc.id}>
                            <div className="flex flex-col">
                              <span>{proc.nome}</span>
                              {proc.codigo_tuss && (
                                <span className="text-xs text-muted-foreground">
                                  TUSS: {proc.codigo_tuss}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!especialidadeSelecionada && (
                      <p className="text-xs text-muted-foreground">
                        Escolha uma especialidade para ver os procedimentos disponíveis
                      </p>
                    )}
                    {especialidadeSelecionada && (!procedimentos || procedimentos.length === 0) && (
                      <p className="text-xs text-amber-600">
                        Nenhum procedimento cadastrado para esta especialidade
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="profissional">Profissional Responsável (opcional)</Label>
                    <Select
                      value={formData.profissional_id}
                      onValueChange={(value) => setFormData({ ...formData, profissional_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        {profissionais?.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.nome} - CRM {prof.credenciado_crms?.[0]?.crm}/{prof.credenciado_crms?.[0]?.uf_crm}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="preco_base">Preço Base</Label>
                      <Input
                        id="preco_base"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.preco_base}
                        onChange={(e) => setFormData({ ...formData, preco_base: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="preco_particular">Particular</Label>
                      <Input
                        id="preco_particular"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.preco_particular}
                        onChange={(e) => setFormData({ ...formData, preco_particular: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="preco_convenio">Convênio</Label>
                      <Input
                        id="preco_convenio"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.preco_convenio}
                        onChange={(e) => setFormData({ ...formData, preco_convenio: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="aceita_sus"
                        checked={formData.aceita_sus}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, aceita_sus: checked as boolean })
                        }
                      />
                      <Label htmlFor="aceita_sus" className="cursor-pointer">
                        Aceita SUS
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="disponivel_online"
                        checked={formData.disponivel_online}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, disponivel_online: checked as boolean })
                        }
                      />
                      <Label htmlFor="disponivel_online" className="cursor-pointer">
                        Telemedicina
                      </Label>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="local_atendimento">Local de Atendimento</Label>
                    <Input
                      id="local_atendimento"
                      placeholder="Ex: Consultório A, Sala 5"
                      value={formData.local_atendimento}
                      onChange={(e) => setFormData({ ...formData, local_atendimento: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Requisitos, preparos, informações adicionais..."
                      rows={3}
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.procedimento_id || createMutation.isPending || updateMutation.isPending}
                  >
                    {editingServico ? "Atualizar" : "Adicionar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!servicos || servicos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum serviço cadastrado ainda</p>
            {canEdit && (
              <p className="text-sm mt-2">Clique em "Adicionar Serviço" para começar</p>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Local</TableHead>
                  {canEdit && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicos.map((servico) => (
                  <TableRow key={servico.servico_id}>
                    <TableCell>
                      <div className="font-medium">{servico.especialidade_nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {servico.procedimento_categoria}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{servico.procedimento_nome}</div>
                      {servico.procedimento_codigo && (
                        <div className="text-xs text-muted-foreground">
                          TUSS: {servico.procedimento_codigo}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {servico.profissional_nome ? (
                        <div>
                          <div className="font-medium">{servico.profissional_nome}</div>
                          <div className="text-xs text-muted-foreground">
                            CRM {servico.profissional_crm}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Não especificado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {servico.preco_base ? (
                        <div className="font-semibold text-green-600">
                          R$ {servico.preco_base.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sob consulta</span>
                      )}
                      {servico.aceita_sus && (
                        <Badge variant="secondary" className="mt-1">
                          SUS
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {servico.disponivel_online && (
                          <Badge variant="outline" className="w-fit">
                            <Globe className="h-3 w-3 mr-1" />
                            Online
                          </Badge>
                        )}
                        <Badge variant="outline" className="w-fit">
                          <MapPin className="h-3 w-3 mr-1" />
                          Presencial
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {servico.local_atendimento || "—"}
                      </div>
                      {servico.tempo_espera_medio && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {servico.tempo_espera_medio} dias
                        </div>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(servico)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(servico.servico_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
