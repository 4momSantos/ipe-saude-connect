import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditarProfissional, type Profissional } from "@/hooks/useProfissionais";
import { useEspecialidades } from "@/hooks/useEspecialidades";
import { validateCPF, validateCRM } from "@/lib/validators";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface EditarProfissionalDialogProps {
  open: boolean;
  onClose: () => void;
  profissional: Profissional | null;
}

export function EditarProfissionalDialog({
  open,
  onClose,
  profissional,
}: EditarProfissionalDialogProps) {
  const { mutateAsync: editar, isPending } = useEditarProfissional();
  const { data: especialidades } = useEspecialidades();
  
  const [isValidatingCRM, setIsValidatingCRM] = useState(false);
  const [cpfValidationState, setCpfValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [crmValidationState, setCrmValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  
  const [formData, setFormData] = useState<Partial<Profissional>>({
    nome: "",
    cpf: "",
    rg: "",
    data_nascimento: "",
    email: "",
    telefone: "",
    celular: "",
    crm: "",
    uf_crm: "",
    especialidade: "",
    principal: false,
  });

  useEffect(() => {
    if (profissional && open) {
      setFormData({
        nome: profissional.nome || "",
        cpf: profissional.cpf || "",
        rg: profissional.rg || "",
        data_nascimento: profissional.data_nascimento || "",
        email: profissional.email || "",
        telefone: profissional.telefone || "",
        celular: profissional.celular || "",
        crm: profissional.crm || "",
        uf_crm: profissional.uf_crm || "",
        especialidade: profissional.especialidade || "",
        principal: profissional.principal || false,
      });
      setCpfValidationState('idle');
      setCrmValidationState('idle');
    }
  }, [profissional, open]);

  const handleValidateCPF = async () => {
    if (!formData.cpf) {
      toast.error("Digite um CPF para validar");
      return;
    }

    setCpfValidationState('validating');
    
    const isValid = validateCPF(formData.cpf);
    
    if (isValid) {
      setCpfValidationState('valid');
      toast.success("CPF válido");
    } else {
      setCpfValidationState('invalid');
      toast.error("CPF inválido");
    }
  };

  const handleValidateCRM = async () => {
    if (!formData.crm || !formData.uf_crm) {
      toast.error("Digite CRM e UF para validar");
      return;
    }

    setIsValidatingCRM(true);
    setCrmValidationState('idle');
    
    try {
      const result = await validateCRM(formData.crm, formData.uf_crm);
      
      if (result.valid && result.data) {
        setCrmValidationState('valid');
        
        // ✅ AUTO-PREENCHER com dados do CFM
        setFormData(prev => ({
          ...prev,
          nome: result.data.nome || prev.nome,
          especialidade: result.data.especialidades?.[0] || prev.especialidade
        }));
        
        toast.success("CRM Válido", {
          description: `${result.data.nome} - ${result.data.situacao || 'ATIVO'}`
        });
        
        console.log('📋 Dados do CRM preenchidos:', { 
          nome: result.data.nome, 
          especialidades: result.data.especialidades 
        });
      } else {
        setCrmValidationState('invalid');
        toast.error("CRM Inválido", {
          description: result.message || "CRM não encontrado"
        });
      }
    } catch (error) {
      setCrmValidationState('invalid');
      toast.error("Erro ao validar CRM");
    } finally {
      setIsValidatingCRM(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profissional?.id) return;
    
    try {
      await editar({
        id: profissional.id,
        ...formData,
      });
      
      onClose();
    } catch (error) {
      console.error("Erro ao editar profissional:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Profissional</DialogTitle>
          <DialogDescription>
            Atualize os dados do profissional médico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                placeholder="Dr. João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <div className="flex gap-2">
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => {
                    setFormData({ ...formData, cpf: e.target.value });
                    setCpfValidationState('idle');
                  }}
                  required
                  placeholder="000.000.000-00"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleValidateCPF}
                  disabled={cpfValidationState === 'validating' || !formData.cpf}
                >
                  {cpfValidationState === 'validating' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {cpfValidationState === 'valid' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {cpfValidationState === 'invalid' && <XCircle className="h-4 w-4 text-red-600" />}
                  {cpfValidationState === 'idle' && <CheckCircle2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={formData.rg}
                onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                placeholder="0000000-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="crm">CRM *</Label>
              <Input
                id="crm"
                value={formData.crm}
                onChange={(e) => {
                  setFormData({ ...formData, crm: e.target.value });
                  setCrmValidationState('idle');
                }}
                required
                placeholder="000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uf_crm">UF CRM *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.uf_crm}
                  onValueChange={(value) => {
                    setFormData({ ...formData, uf_crm: value });
                    setCrmValidationState('idle');
                  }}
                  required
                >
                  <SelectTrigger id="uf_crm" className="flex-1">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AC">AC</SelectItem>
                    <SelectItem value="AL">AL</SelectItem>
                    <SelectItem value="AP">AP</SelectItem>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="BA">BA</SelectItem>
                    <SelectItem value="CE">CE</SelectItem>
                    <SelectItem value="DF">DF</SelectItem>
                    <SelectItem value="ES">ES</SelectItem>
                    <SelectItem value="GO">GO</SelectItem>
                    <SelectItem value="MA">MA</SelectItem>
                    <SelectItem value="MT">MT</SelectItem>
                    <SelectItem value="MS">MS</SelectItem>
                    <SelectItem value="MG">MG</SelectItem>
                    <SelectItem value="PA">PA</SelectItem>
                    <SelectItem value="PB">PB</SelectItem>
                    <SelectItem value="PR">PR</SelectItem>
                    <SelectItem value="PE">PE</SelectItem>
                    <SelectItem value="PI">PI</SelectItem>
                    <SelectItem value="RJ">RJ</SelectItem>
                    <SelectItem value="RN">RN</SelectItem>
                    <SelectItem value="RS">RS</SelectItem>
                    <SelectItem value="RO">RO</SelectItem>
                    <SelectItem value="RR">RR</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                    <SelectItem value="SP">SP</SelectItem>
                    <SelectItem value="SE">SE</SelectItem>
                    <SelectItem value="TO">TO</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleValidateCRM}
                  disabled={isValidatingCRM || !formData.crm || !formData.uf_crm}
                >
                  {isValidatingCRM && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!isValidatingCRM && crmValidationState === 'valid' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {!isValidatingCRM && crmValidationState === 'invalid' && <XCircle className="h-4 w-4 text-red-600" />}
                  {!isValidatingCRM && crmValidationState === 'idle' && <CheckCircle2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="especialidade">Especialidade *</Label>
              <Select
                value={formData.especialidade}
                onValueChange={(value) => setFormData({ ...formData, especialidade: value })}
                required
              >
                <SelectTrigger id="especialidade">
                  <SelectValue placeholder="Selecione a especialidade" />
                </SelectTrigger>
                <SelectContent>
                  {especialidades?.map((esp) => (
                    <SelectItem key={esp.id} value={esp.nome}>
                      {esp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                value={formData.celular}
                onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="principal"
              checked={formData.principal}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, principal: checked === true })
              }
            />
            <Label
              htmlFor="principal"
              className="text-sm font-normal cursor-pointer"
            >
              Marcar como profissional principal
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
