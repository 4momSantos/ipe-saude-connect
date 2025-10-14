import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  CPFInput,
  CNPJInput,
  TelefoneInput,
  CEPInput,
  DataInput,
  CRMInput
} from "./MaskedInputs";

/**
 * Componente de exemplo mostrando o uso das máscaras de entrada.
 * 
 * Para usar as máscaras em outros formulários:
 * 
 * 1. Importe o componente de máscara desejado:
 *    import { CPFInput, TelefoneInput } from "@/components/credenciado/MaskedInputs";
 * 
 * 2. Use no lugar do Input padrão:
 *    <CPFInput value={cpf} onChange={(e) => setCpf(e.target.value)} />
 * 
 * Máscaras disponíveis:
 * - CPFInput: 999.999.999-99
 * - CNPJInput: 99.999.999/9999-99
 * - TelefoneInput: (99) 99999-9999
 * - CEPInput: 99999-999
 * - DataInput: 99/99/9999
 * - CRMInput: 9999999
 */
export function ExemploFormularioComMascaras() {
  const [formData, setFormData] = useState({
    cpf: "",
    cnpj: "",
    telefone: "",
    cep: "",
    data: "",
    crm: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Dados do formulário:", formData);
    
    // Para processar os dados, remova as máscaras:
    const dadosLimpos = {
      cpf: formData.cpf.replace(/\D/g, ''), // Remove tudo que não é dígito
      cnpj: formData.cnpj.replace(/\D/g, ''),
      telefone: formData.telefone.replace(/\D/g, ''),
      cep: formData.cep.replace(/\D/g, ''),
      data: formData.data,
      crm: formData.crm.replace(/\D/g, '')
    };
    
    console.log("Dados sem máscara:", dadosLimpos);
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Exemplo de Formulário com Máscaras</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>CPF</Label>
              <CPFInput
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              />
            </div>

            <div>
              <Label>CNPJ</Label>
              <CNPJInput
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              />
            </div>

            <div>
              <Label>Telefone</Label>
              <TelefoneInput
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              />
            </div>

            <div>
              <Label>CEP</Label>
              <CEPInput
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
              />
            </div>

            <div>
              <Label>Data</Label>
              <DataInput
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              />
            </div>

            <div>
              <Label>CRM</Label>
              <CRMInput
                value={formData.crm}
                onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Enviar Exemplo
          </Button>
        </form>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Dados atuais:</h3>
          <pre className="text-sm">{JSON.stringify(formData, null, 2)}</pre>
        </div>
      </CardContent>
    </Card>
  );
}