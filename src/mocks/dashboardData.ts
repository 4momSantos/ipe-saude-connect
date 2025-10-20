import { faker } from '@faker-js/faker/locale/pt_BR';
import { subDays, format, eachDayOfInterval } from 'date-fns';

// 🎯 CONFIGURAÇÃO GERAL
const USE_MOCK_DATA = import.meta.env.DEV || true;

// 📊 GERADOR DE DADOS ALEATÓRIOS
export class MockDataGenerator {
  
  // 4.2.25 - DASHBOARD DE CREDENCIAMENTOS
  static gerarDadosCredenciamentos() {
    const hoje = new Date();
    const ultimos30Dias = eachDayOfInterval({
      start: subDays(hoje, 30),
      end: hoje
    });

    const porEspecialidade = [
      { especialidade: 'Cardiologia', total: faker.number.int({ min: 30, max: 60 }), ativos: 0, pendentes: 0 },
      { especialidade: 'Ortopedia', total: faker.number.int({ min: 25, max: 55 }), ativos: 0, pendentes: 0 },
      { especialidade: 'Pediatria', total: faker.number.int({ min: 35, max: 70 }), ativos: 0, pendentes: 0 },
      { especialidade: 'Clínica Geral', total: faker.number.int({ min: 40, max: 80 }), ativos: 0, pendentes: 0 },
      { especialidade: 'Ginecologia', total: faker.number.int({ min: 20, max: 45 }), ativos: 0, pendentes: 0 },
      { especialidade: 'Psiquiatria', total: faker.number.int({ min: 15, max: 35 }), ativos: 0, pendentes: 0 },
      { especialidade: 'Dermatologia', total: faker.number.int({ min: 10, max: 25 }), ativos: 0, pendentes: 0 },
      { especialidade: 'Oftalmologia', total: faker.number.int({ min: 12, max: 28 }), ativos: 0, pendentes: 0 }
    ].map(item => ({
      ...item,
      ativos: Math.floor(item.total * 0.85),
      pendentes: Math.floor(item.total * 0.15)
    }));

    const totalAtivos = porEspecialidade.reduce((sum, e) => sum + e.ativos, 0);
    const totalPendentes = porEspecialidade.reduce((sum, e) => sum + e.pendentes, 0);

    return {
      totais: {
        ativos: totalAtivos,
        pendentes: totalPendentes,
        inativos: faker.number.int({ min: 10, max: 30 }),
        total: totalAtivos + totalPendentes
      },
      
      porEspecialidade,

      evoluaoTemporal: ultimos30Dias.map(dia => ({
        data: format(dia, 'dd/MM'),
        dataCompleta: format(dia, 'yyyy-MM-dd'),
        credenciamentos: faker.number.int({ min: 1, max: 8 }),
        renovacoes: faker.number.int({ min: 0, max: 5 })
      })),

      porRegiao: [
        { regiao: 'Planalto', total: faker.number.int({ min: 80, max: 120 }), percentual: 0 },
        { regiao: 'Mata Norte', total: faker.number.int({ min: 60, max: 90 }), percentual: 0 },
        { regiao: 'Agreste', total: faker.number.int({ min: 50, max: 80 }), percentual: 0 },
        { regiao: 'Sertão', total: faker.number.int({ min: 30, max: 60 }), percentual: 0 },
        { regiao: 'Metropolitana', total: faker.number.int({ min: 100, max: 150 }), percentual: 0 }
      ].map(item => {
        const totalGeral = 450;
        return {
          ...item,
          percentual: Math.round((item.total / totalGeral) * 100)
        };
      }),

      statusDocumentos: {
        validos: faker.number.int({ min: 200, max: 250 }),
        vencendoEm30: faker.number.int({ min: 30, max: 60 }),
        vencendoEm7: faker.number.int({ min: 10, max: 25 }),
        vencidos: faker.number.int({ min: 5, max: 20 })
      }
    };
  }

  // 4.2.26 - DASHBOARD DE PRAZOS E VALIDADES
  static gerarDadosPrazos() {
    const hoje = new Date();
    
    const documentosVencendo = Array.from({ length: 50 }, () => ({
      id: faker.string.uuid(),
      credenciado: faker.person.fullName(),
      cpf: faker.helpers.replaceSymbols('###.###.###-##'),
      tipoDocumento: faker.helpers.arrayElement([
        'CRM', 'Identidade Médica', 'Diploma', 'Certificado Especialidade',
        'Comprovante Residência', 'Certidão Negativa'
      ]),
      numeroDocumento: faker.helpers.replaceSymbols('DOC-####-####'),
      dataVencimento: faker.date.between({ 
        from: subDays(hoje, 30), 
        to: new Date(hoje.getFullYear(), hoje.getMonth() + 2, hoje.getDate()) 
      }),
      diasParaVencer: 0,
      status: '',
      nivel: ''
    })).map(doc => {
      const diasParaVencer = Math.floor(
        (doc.dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      let status = 'válido';
      let nivel = 'normal';
      
      if (diasParaVencer < 0) {
        status = 'vencido';
        nivel = 'critico';
      } else if (diasParaVencer <= 7) {
        status = 'vence_em_7_dias';
        nivel = 'critico';
      } else if (diasParaVencer <= 30) {
        status = 'vence_em_30_dias';
        nivel = 'alerta';
      }
      
      return { ...doc, diasParaVencer, status, nivel };
    }).sort((a, b) => a.diasParaVencer - b.diasParaVencer);

    const distribuicaoPorTipo = [
      { tipo: 'CRM', vencidos: 3, vencendo30: 8, vencendo7: 2, validos: 35 },
      { tipo: 'Identidade Médica', vencidos: 5, vencendo30: 12, vencendo7: 4, validos: 42 },
      { tipo: 'Diploma', vencidos: 1, vencendo30: 3, vencendo7: 1, validos: 50 },
      { tipo: 'Certificado Especialidade', vencidos: 4, vencendo30: 10, vencendo7: 3, validos: 38 },
      { tipo: 'Comprovante Residência', vencidos: 8, vencendo30: 15, vencendo7: 5, validos: 30 }
    ];

    return {
      totais: {
        vencidos: documentosVencendo.filter(d => d.status === 'vencido').length,
        vencendo7: documentosVencendo.filter(d => d.status === 'vence_em_7_dias').length,
        vencendo30: documentosVencendo.filter(d => d.status === 'vence_em_30_dias').length,
        validos: documentosVencendo.filter(d => d.status === 'válido').length
      },
      documentosVencendo,
      distribuicaoPorTipo,
      alertasCriticos: documentosVencendo
        .filter(d => d.nivel === 'critico')
        .slice(0, 10)
    };
  }

  // 4.2.27 - RELATÓRIO DE DOCUMENTOS
  static gerarRelatorioDocumentos() {
    return {
      periodo: {
        inicio: format(subDays(new Date(), 30), 'dd/MM/yyyy'),
        fim: format(new Date(), 'dd/MM/yyyy')
      },
      
      resumo: {
        totalDocumentos: faker.number.int({ min: 500, max: 800 }),
        documentosRecebidos: faker.number.int({ min: 50, max: 100 }),
        documentosAprovados: faker.number.int({ min: 40, max: 90 }),
        documentosRejeitados: faker.number.int({ min: 5, max: 20 }),
        documentosPendentes: faker.number.int({ min: 10, max: 30 })
      },

      porTipo: [
        'CRM', 'Identidade Médica', 'Diploma', 'Certificado Especialidade',
        'Comprovante Residência', 'CPF', 'Certidão Negativa', 'Currículo'
      ].map(tipo => ({
        tipo,
        total: faker.number.int({ min: 40, max: 120 }),
        aprovados: faker.number.int({ min: 30, max: 100 }),
        rejeitados: faker.number.int({ min: 2, max: 15 }),
        pendentes: faker.number.int({ min: 5, max: 20 })
      })),

      motivosRejeicao: [
        { motivo: 'Documento ilegível', quantidade: faker.number.int({ min: 5, max: 15 }) },
        { motivo: 'Documento vencido', quantidade: faker.number.int({ min: 3, max: 10 }) },
        { motivo: 'Informações incompletas', quantidade: faker.number.int({ min: 4, max: 12 }) },
        { motivo: 'Formato incorreto', quantidade: faker.number.int({ min: 2, max: 8 }) },
        { motivo: 'Assinatura faltando', quantidade: faker.number.int({ min: 1, max: 5 }) }
      ],

      tempoMedioAnalise: {
        dias: faker.number.int({ min: 2, max: 7 }),
        horas: faker.number.int({ min: 0, max: 23 })
      }
    };
  }

  // 4.2.36 - ANÁLISE DE CONFORMIDADE
  static gerarDadosConformidade() {
    const credenciados = Array.from({ length: 100 }, () => ({
      id: faker.string.uuid(),
      nome: faker.person.fullName(),
      cpf: faker.helpers.replaceSymbols('###.###.###-##'),
      especialidade: faker.helpers.arrayElement([
        'Cardiologia', 'Ortopedia', 'Pediatria', 'Clínica Geral',
        'Ginecologia', 'Psiquiatria', 'Dermatologia', 'Oftalmologia'
      ]),
      status: faker.helpers.arrayElement(['Ativo', 'Pendente', 'Inativo']),
      documentosTotal: 8,
      documentosValidos: faker.number.int({ min: 4, max: 8 }),
      documentosVencidos: 0,
      documentosPendentes: 0,
      percentualConformidade: 0,
      nivel: ''
    })).map(cred => {
      cred.documentosVencidos = Math.max(0, cred.documentosTotal - cred.documentosValidos - faker.number.int({ min: 0, max: 2 }));
      cred.documentosPendentes = cred.documentosTotal - cred.documentosValidos - cred.documentosVencidos;
      cred.percentualConformidade = Math.round((cred.documentosValidos / cred.documentosTotal) * 100);
      
      if (cred.percentualConformidade >= 90) cred.nivel = 'excelente';
      else if (cred.percentualConformidade >= 70) cred.nivel = 'bom';
      else if (cred.percentualConformidade >= 50) cred.nivel = 'regular';
      else cred.nivel = 'critico';
      
      return cred;
    });

    return {
      visaoGeral: {
        totalCredenciados: credenciados.length,
        conformes: credenciados.filter(c => c.percentualConformidade >= 90).length,
        naoConformes: credenciados.filter(c => c.percentualConformidade < 90).length,
        percentualGeralConformidade: Math.round(
          credenciados.reduce((sum, c) => sum + c.percentualConformidade, 0) / credenciados.length
        )
      },

      distribuicaoNiveis: [
        { nivel: 'Excelente (90-100%)', quantidade: credenciados.filter(c => c.nivel === 'excelente').length, cor: '#22c55e' },
        { nivel: 'Bom (70-89%)', quantidade: credenciados.filter(c => c.nivel === 'bom').length, cor: '#3b82f6' },
        { nivel: 'Regular (50-69%)', quantidade: credenciados.filter(c => c.nivel === 'regular').length, cor: '#f59e0b' },
        { nivel: 'Crítico (<50%)', quantidade: credenciados.filter(c => c.nivel === 'critico').length, cor: '#ef4444' }
      ],

      credenciados,

      porEspecialidade: [
        'Cardiologia', 'Ortopedia', 'Pediatria', 'Clínica Geral',
        'Ginecologia', 'Psiquiatria', 'Dermatologia', 'Oftalmologia'
      ].map(esp => {
        const credsDaEsp = credenciados.filter(c => c.especialidade === esp);
        const mediaConf = credsDaEsp.length > 0
          ? Math.round(credsDaEsp.reduce((sum, c) => sum + c.percentualConformidade, 0) / credsDaEsp.length)
          : 0;
        
        return {
          especialidade: esp,
          total: credsDaEsp.length,
          conformes: credsDaEsp.filter(c => c.percentualConformidade >= 90).length,
          percentualMedio: mediaConf
        };
      }),

      tendencia: eachDayOfInterval({
        start: subDays(new Date(), 30),
        end: new Date()
      }).map(dia => ({
        data: format(dia, 'dd/MM'),
        percentualConformidade: faker.number.int({ min: 75, max: 95 })
      }))
    };
  }

  // DADOS CONSOLIDADOS
  static gerarTodosDados() {
    return {
      credenciamentos: this.gerarDadosCredenciamentos(),
      prazos: this.gerarDadosPrazos(),
      relatorioDocumentos: this.gerarRelatorioDocumentos(),
      conformidade: this.gerarDadosConformidade()
    };
  }
}

export const USE_MOCK = USE_MOCK_DATA;
