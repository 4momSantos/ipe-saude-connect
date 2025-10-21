import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdicionarProfissional, type Profissional } from "@/hooks/useProfissionais";
import { useEspecialidades } from "@/hooks/useEspecialidades";
import { useValidateCPF } from "@/hooks/useValidateCPF";
import { validateCRM } from "@/lib/validators";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface AdicionarProfissionalDialogProps {
  open: boolean;
  onClose: () => void;
  credenciadoId: string;
}

export function AdicionarProfissionalDialog({
  open,
  onClose,
  credenciadoId,
}: AdicionarProfissionalDialogProps) {
  const { mutateAsync: adicionar, isPending } = useAdicionarProfissional();
  const { data: especialidades } = useEspecialidades();
  const { validar: validarCPF, isLoading: isValidatingCPF, data: cpfData } = useValidateCPF();
  
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
    responsavel_tecnico: false,
  });

  const handleValidateCPF = async () => {
    if (!formData.cpf || !formData.data_nascimento) {
      toast.error("Digite CPF e data de nascimento para validar");
      return;
    }

    setCpfValidationState('validating');
    
    try {
      const result = await validarCPF({ 
        cpf: formData.cpf, 
        birthdate: formData.data_nascimento 
      });
      
      if (result.valid && result.data) {
        setCpfValidationState('valid');
        
        // ✅ AUTO-PREENCHER campos com dados da Receita Federal
        setFormData(prev => ({
          ...prev,
          nome: result.data.nome,
          cpf: result.data.cpf,
          data_nascimento: result.data.data_nascimento
        }));
        
        console.log('📋 Dados preenchidos automaticamente:', result.data);
      } else {
        setCpfValidationState('invalid');
      }
    } catch (error) {
      setCpfValidationState('invalid');
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

    // Validações obrigatórias
    if (cpfValidationState !== 'valid') {
      toast.error("Validação obrigatória", {
        description: "Você precisa validar o CPF antes de salvar"
      });
      return;
    }
    
    if (crmValidationState !== 'valid') {
      toast.error("Validação obrigatória", {
        description: "Você precisa validar o CRM antes de salvar"
      });
      return;
    }
    
    if (!formData.especialidade) {
      toast.error("Campo obrigatório", {
        description: "Selecione uma especialidade"
      });
      return;
    }

    try {
      await adicionar({
        ...formData,
        credenciado_id: credenciadoId,
        ativo: true,
      });
      
      // Resetar formulário
      setFormData({
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
        responsavel_tecnico: false,
      });
      
      setCpfValidationState('idle');
      setCrmValidationState('idle');
      
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar profissional:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Adicionar Profissional</DialogTitle>
          <DialogDescription>
            Cadastre um novo profissional médico vinculado a este credenciado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                placeholder="João Silva"
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
                  disabled={isValidatingCPF || !formData.cpf || !formData.data_nascimento}
                >
                  {isValidatingCPF && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!isValidatingCPF && cpfValidationState === 'valid' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {!isValidatingCPF && cpfValidationState === 'invalid' && <XCircle className="h-4 w-4 text-red-600" />}
                  {!isValidatingCPF && cpfValidationState === 'idle' && <CheckCircle2 className="h-4 w-4" />}
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
              <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                required
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="responsavel_tecnico"
              checked={formData.responsavel_tecnico}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, responsavel_tecnico: checked === true })
              }
            />
            <Label
              htmlFor="responsavel_tecnico"
              className="text-sm font-normal cursor-pointer"
            >
              Marcar como Responsável Técnico (RT)
            </Label>
          </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background sticky bottom-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={
                isPending || 
                cpfValidationState !== 'valid' || 
                crmValidationState !== 'valid' ||
                !formData.especialidade
              }
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
