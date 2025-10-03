import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CPFData {
  validated: boolean;
  nome: string;
  data_nascimento: string;
  situacao: string;
  cpf: string;
}

interface CRMData {
  validated: boolean;
  especialidades: string[];
  instituicao_graduacao?: string;
  ano_formatura?: number;
}

interface CNPJData {
  validated: boolean;
  razao_social: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  situacao_cadastral: string;
}

interface ValidatedDataContextType {
  cpf: CPFData | null;
  crm: CRMData | null;
  cnpj: CNPJData | null;
  setCpfData: (data: CPFData | null) => void;
  setCrmData: (data: CRMData | null) => void;
  setCnpjData: (data: CNPJData | null) => void;
  resetData: () => void;
}

const ValidatedDataContext = createContext<ValidatedDataContextType | undefined>(undefined);

export function ValidatedDataProvider({ children }: { children: ReactNode }) {
  const [cpf, setCpf] = useState<CPFData | null>(null);
  const [crm, setCrm] = useState<CRMData | null>(null);
  const [cnpj, setCnpj] = useState<CNPJData | null>(null);

  const setCpfData = (data: CPFData | null) => setCpf(data);
  const setCrmData = (data: CRMData | null) => setCrm(data);
  const setCnpjData = (data: CNPJData | null) => setCnpj(data);
  
  const resetData = () => {
    setCpf(null);
    setCrm(null);
    setCnpj(null);
  };

  return (
    <ValidatedDataContext.Provider
      value={{
        cpf,
        crm,
        cnpj,
        setCpfData,
        setCrmData,
        setCnpjData,
        resetData,
      }}
    >
      {children}
    </ValidatedDataContext.Provider>
  );
}

export function useValidatedData() {
  const context = useContext(ValidatedDataContext);
  if (context === undefined) {
    throw new Error('useValidatedData must be used within a ValidatedDataProvider');
  }
  return context;
}
