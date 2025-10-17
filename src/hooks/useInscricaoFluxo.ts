import { useState, useMemo } from 'react';

export type TipoCredenciamento = 'PF' | 'PJ';

interface Step {
  key: string;
  id: number;
  title: string;
  description: string;
}

export function useInscricaoFluxo() {
  const [tipoCredenciamento, setTipoCredenciamento] = useState<TipoCredenciamento | null>(null);
  const [etapaAtual, setEtapaAtual] = useState(0); // 0 = Seleção de tipo

  // Etapas para Pessoa Física
  const etapasPF: Step[] = [
    { key: 'tipo', id: 0, title: 'Tipo de Credenciamento', description: 'Escolha PF ou PJ' },
    { key: 'dados_pessoais', id: 1, title: 'Dados Pessoais', description: 'CPF, Nome, CRM' },
    { key: 'consultorio', id: 2, title: 'Dados do Consultório', description: 'Endereço e horários' },
    { key: 'documentos', id: 3, title: 'Documentos', description: 'Upload de arquivos' },
    { key: 'revisao', id: 4, title: 'Revisão e Envio', description: 'Conferir e finalizar' },
  ];

  // Etapas para Pessoa Jurídica
  const etapasPJ: Step[] = [
    { key: 'tipo', id: 0, title: 'Tipo de Credenciamento', description: 'Escolha PF ou PJ' },
    { key: 'dados_pessoais', id: 1, title: 'Dados Pessoais', description: 'CPF, Nome, CRM' },
    { key: 'pessoa_juridica', id: 2, title: 'Pessoa Jurídica', description: 'CNPJ e Razão Social' },
    { key: 'consultorios', id: 3, title: 'Cadastro de Consultórios', description: 'Múltiplas unidades' },
    { key: 'documentos', id: 4, title: 'Documentos', description: 'Upload de arquivos' },
    { key: 'revisao', id: 5, title: 'Revisão e Envio', description: 'Conferir e finalizar' },
  ];

  // Determinar etapas baseado no tipo
  const etapas = useMemo(() => {
    if (!tipoCredenciamento) {
      return [{ key: 'tipo', id: 0, title: 'Tipo de Credenciamento', description: 'Escolha PF ou PJ' }];
    }
    return tipoCredenciamento === 'PF' ? etapasPF : etapasPJ;
  }, [tipoCredenciamento]);

  const progresso = useMemo(() => {
    if (etapas.length === 0) return 0;
    return Math.round((etapaAtual / (etapas.length - 1)) * 100);
  }, [etapaAtual, etapas]);

  const proximaEtapa = () => {
    setEtapaAtual((prev) => Math.min(prev + 1, etapas.length - 1));
  };

  const etapaAnterior = () => {
    setEtapaAtual((prev) => Math.max(prev - 1, 0));
  };

  const irParaEtapa = (etapa: number) => {
    if (etapa >= 0 && etapa < etapas.length) {
      setEtapaAtual(etapa);
    }
  };

  const resetarFluxo = () => {
    setTipoCredenciamento(null);
    setEtapaAtual(0);
  };

  return {
    tipoCredenciamento,
    setTipoCredenciamento,
    etapaAtual,
    setEtapaAtual,
    etapas,
    progresso,
    proximaEtapa,
    etapaAnterior,
    irParaEtapa,
    resetarFluxo,
    isEtapaInicial: etapaAtual === 0,
    isEtapaFinal: etapaAtual === etapas.length - 1,
  };
}
