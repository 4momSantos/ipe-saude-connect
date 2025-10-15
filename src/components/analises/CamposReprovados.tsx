import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import type { CampoReprovado } from "@/types/decisao";

interface CamposReprovadosProps {
  dadosInscricao: Record<string, any>;
  camposReprovados: CampoReprovado[];
  onCamposChange: (campos: CampoReprovado[]) => void;
}

const SECOES_FORMULARIO = {
  dados_pessoais: {
    label: "Dados Pessoais",
    campos: ["nome_completo", "cpf", "rg", "data_nascimento", "email", "crm", "uf_crm"]
  },
  pessoa_juridica: {
    label: "Pessoa Jurídica",
    campos: ["denominacao_social", "cnpj", "inscricao_estadual", "inscricao_municipal"]
  },
  endereco: {
    label: "Endereço",
    campos: ["logradouro", "numero", "complemento", "bairro", "cidade", "estado", "cep"]
  },
  consultorio: {
    label: "Consultório",
    campos: ["especialidades", "horarios_atendimento", "telefone", "celular"]
  }
};

export function CamposReprovados({
  dadosInscricao,
  camposReprovados,
  onCamposChange
}: CamposReprovadosProps) {
  const [camposSelecionados, setCamposSelecionados] = useState<Set<string>>(
    new Set(camposReprovados.map(c => `${c.secao}:${c.campo}`))
  );

  const toggleCampo = (secao: string, campo: string, checked: boolean) => {
    const key = `${secao}:${campo}`;
    const newSet = new Set(camposSelecionados);
    
    if (checked) {
      newSet.add(key);
      onCamposChange([
        ...camposReprovados,
        {
          campo,
          secao: SECOES_FORMULARIO[secao as keyof typeof SECOES_FORMULARIO].label,
          motivo: "",
          valor_atual: getValorCampo(dadosInscricao, secao, campo)
        }
      ]);
    } else {
      newSet.delete(key);
      onCamposChange(
        camposReprovados.filter(c => 
          c.secao !== SECOES_FORMULARIO[secao as keyof typeof SECOES_FORMULARIO].label || c.campo !== campo
        )
      );
    }
    
    setCamposSelecionados(newSet);
  };

  const updateMotivo = (secao: string, campo: string, motivo: string) => {
    onCamposChange(
      camposReprovados.map(c => 
        c.secao === SECOES_FORMULARIO[secao as keyof typeof SECOES_FORMULARIO].label && c.campo === campo
          ? { ...c, motivo }
          : c
      )
    );
  };

  const getValorCampo = (dados: Record<string, any>, secao: string, campo: string): string | undefined => {
    const secaoDados = dados[secao];
    if (!secaoDados) return undefined;
    const valor = secaoDados[campo];
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor || '');
  };

  const getCampoReprovado = (secao: string, campo: string) => {
    return camposReprovados.find(
      c => c.secao === SECOES_FORMULARIO[secao as keyof typeof SECOES_FORMULARIO].label && c.campo === campo
    );
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Campos com Problemas (Opcional)</Label>
      <p className="text-sm text-muted-foreground">
        Marque os campos que precisam ser corrigidos e justifique o motivo
      </p>

      <Accordion type="multiple" className="w-full">
        {Object.entries(SECOES_FORMULARIO).map(([secaoKey, secao]) => (
          <AccordionItem key={secaoKey} value={secaoKey}>
            <AccordionTrigger className="text-sm font-semibold">
              {secao.label}
              {secao.campos.some(c => camposSelecionados.has(`${secaoKey}:${c}`)) && (
                <span className="ml-2 text-xs text-orange-600">
                  ({secao.campos.filter(c => camposSelecionados.has(`${secaoKey}:${c}`)).length} campo(s))
                </span>
              )}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {secao.campos.map(campo => {
                  const key = `${secaoKey}:${campo}`;
                  const isChecked = camposSelecionados.has(key);
                  const campoData = getCampoReprovado(secaoKey, campo);
                  
                  return (
                    <div key={campo} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={isChecked}
                          onCheckedChange={(checked) => 
                            toggleCampo(secaoKey, campo, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={key}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          {campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                      </div>
                      
                      {isChecked && (
                        <div className="ml-6 space-y-2">
                          {campoData?.valor_atual && (
                            <div className="text-xs text-muted-foreground">
                              Valor atual: <span className="font-mono">{campoData.valor_atual}</span>
                            </div>
                          )}
                          <Textarea
                            placeholder="Descreva o problema com este campo..."
                            value={campoData?.motivo || ''}
                            onChange={(e) => updateMotivo(secaoKey, campo, e.target.value)}
                            className="min-h-[60px] text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {camposReprovados.length > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>{camposReprovados.length}</strong> campo(s) marcado(s) para correção
          </p>
        </div>
      )}
    </div>
  );
}
