import { BaseExtractor } from './base-extractor.ts';
import { FieldExtractor } from '../types.ts';
import { PATTERNS, isValidCPF, isValidUF } from '../utils/regex-patterns.ts';
import { extractDate } from '../utils/date-parser.ts';
import { extractName, validateName } from '../utils/name-parser.ts';

export class RGExtractor extends BaseExtractor {
  type = 'rg';
  
  fields: FieldExtractor[] = [
    {
      name: 'nome',
      strategies: [
        // Prioridade 0: Nome após marcador explícito com stop words
        this.createRegexStrategy(
          0,
          /(?:NOME|PORTADOR)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]{9,60}?)(?=\s*(?:FILIA|RG|CPF|NASCIMENTO|DOC|IDENTIDADE|\d{2}\/\d{2}\/\d{4}))/i,
          undefined,
          'Nome após marcador NOME/PORTADOR (com stop words)'
        ),
        
        // Prioridade 1: Nome em maiúsculas completo (linha isolada)
        this.createRegexStrategy(
          1,
          /^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{14,60})$/m,
          undefined,
          'Nome em maiúsculas isolado'
        ),
        
        // Prioridade 2: Nome próximo ao RG (antes do número)
        this.createFunctionStrategy(
          2,
          (text: string) => {
            const rgMatch = text.match(/\b\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[-\s]?[\dXx]\b/);
            if (!rgMatch) return null;
            const beforeRG = text.substring(Math.max(0, rgMatch.index! - 150), rgMatch.index);
            // Buscar último nome em maiúsculas antes do RG
            const nameMatch = beforeRG.match(/([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{14,50})(?=\s*(?:RG|IDENTIDADE|\d))/i);
            return nameMatch ? nameMatch[1].trim() : null;
          },
          'Nome antes do número RG'
        ),
        
        // Prioridade 3: Nome antes de CPF ou data de nascimento
        this.createRegexStrategy(
          3,
          /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]{10,50})[\s\n]+(?:CPF|NASCIMENTO|DATA)/i,
          undefined,
          'Nome antes de CPF/NASCIMENTO'
        ),
        
        // Prioridade 4: Primeiro bloco de texto em maiúsculas após cabeçalho
        this.createFunctionStrategy(
          4,
          (text: string) => {
            // Pular cabeçalho (primeiras 200 caracteres)
            const afterHeader = text.substring(200);
            const lines = afterHeader.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{14,60}$/.test(trimmed)) {
                // Verificar se não contém palavras proibidas
                if (/FILIA|SECRETARIA|ESTADO|REPUBLICA/i.test(trimmed)) continue;
                return trimmed;
              }
            }
            return null;
          },
          'Primeiro nome longo em maiúsculas (após cabeçalho)'
        ),
      ],
      validator: (value: string) => {
        // Validar comprimento
        if (value.length < 10 || value.length > 60) return false;
        
        // Deve ter pelo menos duas palavras
        const words = value.trim().split(/\s+/);
        if (words.length < 2) return false;
        
        // Não pode conter números
        if (/\d/.test(value)) return false;
        
        // Não pode conter palavras proibidas
        if (/FILIA|RG[:\s]|CPF[:\s]|NASCIMENTO|DOCUMENTO|IDENTIDADE/i.test(value)) return false;
        
        return true;
      },
      transform: (value: string) => {
        return value
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      },
      required: true,
    },
    {
      name: 'rg',
      strategies: [
        // Prioridade 1: RG explicitamente marcado
        this.createRegexStrategy(1, /(?:RG|REGISTRO\s+GERAL|IDENTIDADE|CARTEIRA\s+DE\s+IDENTIDADE)[:\s]*(\d{1,2}[\s\.]?\d{3}[\s\.]?\d{3}[\s\-\.]?[\dXx])/i,
          (match) => match.replace(/[\s\.]/g, '').replace('-', '')),
        
        // Prioridade 2: RG próximo ao nome (contexto)
        this.createFunctionStrategy(2, (text) => {
          const nomeMatch = text.match(/(?:NOME|PORTADOR)[:\s]*[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}/i);
          if (nomeMatch) {
            const afterName = text.slice(nomeMatch.index! + nomeMatch[0].length, nomeMatch.index! + nomeMatch[0].length + 200);
            const rgMatch = afterName.match(/(\d{1,2}[\s\.]?\d{3}[\s\.]?\d{3}[\s\-\.]?[\dXx])/);
            return rgMatch ? rgMatch[1].replace(/[\s\.]/g, '').replace('-', '') : null;
          }
          return null;
        }),
        
        // Prioridade 3: RG nos primeiros 300 caracteres
        this.createFunctionStrategy(3, (text) => {
          const topText = text.slice(0, 300);
          const rgMatch = topText.match(/\b(\d{1,2}[\s\.]?\d{3}[\s\.]?\d{3}[\s\-\.]?[\dXx])\b/);
          if (rgMatch) {
            const cleaned = rgMatch[1].replace(/[\s\.]/g, '').replace('-', '');
            if (this.isValidRG(cleaned)) return cleaned;
          }
          return null;
        }),
        
        // Prioridade 4: Padrão formatado comum (XX.XXX.XXX-X)
        this.createFunctionStrategy(4, (text) => {
          const matches = text.match(/\b(\d{1,2}[\s\.]?\d{3}[\s\.]?\d{3}[\s\-\.]?[\dXx])\b/g);
          if (matches) {
            for (const match of matches) {
              const cleaned = match.replace(/[\s\.]/g, '').replace('-', '');
              if (this.isValidRG(cleaned)) return cleaned;
            }
          }
          return null;
        }),
        
        // Prioridade 5: Sequência genérica de 7-10 dígitos
        this.createFunctionStrategy(5, (text) => {
          const matches = text.match(/\b(\d{7,10}[Xx]?)\b/g);
          if (matches) {
            for (const match of matches) {
              if (this.isValidRG(match)) return match;
            }
          }
          return null;
        }),
      ],
      validator: (rg) => this.isValidRG(rg),
      transform: (rg) => rg.replace(/[\s\.\-]/g, ''),
      required: true
    },
    {
      name: 'cpf',
      strategies: [
        // Prioridade 1: CPF explicitamente marcado
        this.createRegexStrategy(1, /CPF[:\s]*(\d{3}[\s\.]?\d{3}[\s\.]?\d{3}[\s\-\.]?\d{2})/i,
          (match) => match.replace(/\D/g, '')),
        
        // Prioridade 2: CPF após "NASCIMENTO"
        this.createFunctionStrategy(2, (text) => {
          const nascMatch = text.match(/(?:NASCIMENTO|DATA\s+DE\s+NASC)/i);
          if (nascMatch) {
            const afterNasc = text.slice(nascMatch.index!, nascMatch.index! + 200);
            const cpfMatch = afterNasc.match(/(\d{3}[\s\.]?\d{3}[\s\.]?\d{3}[\s\-\.]?\d{2})/);
            return cpfMatch ? cpfMatch[1].replace(/\D/g, '') : null;
          }
          return null;
        }),
        
        // Prioridade 3: CPF próximo ao RG/nome
        this.createFunctionStrategy(3, (text) => {
          const rgMatch = text.match(/(?:RG|IDENTIDADE)[:\s]*\d/i);
          if (rgMatch) {
            const afterRG = text.slice(rgMatch.index!, rgMatch.index! + 300);
            const cpfMatch = afterRG.match(/(\d{3}[\s\.]?\d{3}[\s\.]?\d{3}[\s\-\.]?\d{2})/);
            return cpfMatch ? cpfMatch[1].replace(/\D/g, '') : null;
          }
          return null;
        }),
        
        // Prioridade 4: CPF nos primeiros 500 caracteres
        this.createFunctionStrategy(4, (text) => {
          const topText = text.slice(0, 500);
          const cpfMatch = topText.match(/(\d{3}[\s\.]?\d{3}[\s\.]?\d{3}[\s\-\.]?\d{2})/);
          if (cpfMatch) {
            const cleaned = cpfMatch[1].replace(/\D/g, '');
            if (isValidCPF(cleaned)) return cleaned;
          }
          return null;
        }),
        
        // Prioridade 5: Último recurso - últimos 11 dígitos
        this.createFunctionStrategy(5, (text) => {
          const matches = text.match(/\d{11}/g);
          if (matches) {
            for (let i = matches.length - 1; i >= 0; i--) {
              if (isValidCPF(matches[i])) return matches[i];
            }
          }
          return null;
        }),
      ],
      validator: isValidCPF,
      transform: (cpf) => cpf.replace(/\D/g, '')
    },
    {
      name: 'data_nascimento',
      strategies: [
        // Prioridade 0: Data após marcador NASCIMENTO (tolerante)
        this.createRegexStrategy(
          0,
          /NASCIMENTO[\s\S]{0,40}?(\d{1,2}[\s\/\-]?\d{1,2}[\s\/\-]?\d{2,4})/i,
          undefined,
          'Data após NASCIMENTO (até 40 caracteres)'
        ),
        
        // Prioridade 1: Data sem separadores (DDMMYYYY ou DDMMYY)
        this.createRegexStrategy(
          1,
          /\b(\d{2})(\d{2})(\d{4})\b/,
          (match) => {
            const parts = match.match(/(\d{2})(\d{2})(\d{4})/);
            if (!parts) return match;
            return `${parts[1]}/${parts[2]}/${parts[3]}`;
          },
          'Data sem separadores (DDMMYYYY)'
        ),
        
        // Prioridade 2: Data por extenso ou abreviada
        this.createRegexStrategy(
          2,
          /(\d{1,2})\s+(?:DE\s+)?(JANEIRO|FEVEREIRO|MAR[ÇC]O|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO|JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)(?:\s+DE\s+)?(\d{4})/i,
          (match) => {
            const monthMap: Record<string, string> = {
              'JANEIRO': '01', 'JAN': '01',
              'FEVEREIRO': '02', 'FEV': '02',
              'MARÇO': '03', 'MARCO': '03', 'MAR': '03',
              'ABRIL': '04', 'ABR': '04',
              'MAIO': '05', 'MAI': '05',
              'JUNHO': '06', 'JUN': '06',
              'JULHO': '07', 'JUL': '07',
              'AGOSTO': '08', 'AGO': '08',
              'SETEMBRO': '09', 'SET': '09',
              'OUTUBRO': '10', 'OUT': '10',
              'NOVEMBRO': '11', 'NOV': '11',
              'DEZEMBRO': '12', 'DEZ': '12',
            };
            const parts = match.match(/(\d{1,2})\s+(?:DE\s+)?([A-Z]+)(?:\s+DE\s+)?(\d{4})/i);
            if (!parts) return match;
            const day = parts[1].padStart(2, '0');
            const month = monthMap[parts[2].toUpperCase()] || '01';
            const year = parts[3];
            return `${day}/${month}/${year}`;
          },
          'Data por extenso'
        ),
        
        // Prioridade 3: Primeira data após o nome (nos próximos 200 caracteres)
        this.createFunctionStrategy(
          3,
          (text: string) => {
            // Buscar nome em maiúsculas
            const nameMatch = text.match(/[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{3,}\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,}/);
            if (!nameMatch) return null;
            
            // Buscar data nos próximos 200 caracteres após o nome
            const afterName = text.substring(nameMatch.index! + nameMatch[0].length, nameMatch.index! + nameMatch[0].length + 200);
            const dateMatch = afterName.match(/\b(\d{1,2}[\s\/\-]?\d{1,2}[\s\/\-]?\d{2,4})\b/);
            return dateMatch ? dateMatch[1] : null;
          },
          'Primeira data após o nome'
        ),
        
        // Prioridade 4: Primeira data no documento (fallback)
        this.createFunctionStrategy(
          4,
          (text: string) => {
            const dateMatch = text.match(/\b(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})\b/);
            return dateMatch ? dateMatch[1] : null;
          },
          'Primeira data encontrada (fallback)'
        ),
      ],
      validator: (date) => this.isValidBirthDate(date),
      transform: (date) => {
        const normalized = date.replace(/[\s\-]/g, '/').replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
        return extractDate(normalized) || normalized;
      },
      required: true,
    },
    {
      name: 'data_emissao',
      strategies: [
        // Prioridade 0: Data após marcador EMISSÃO (tolerante)
        this.createRegexStrategy(
          0,
          /EMISS[AÃ]O[\s\S]{0,40}?(\d{1,2}[\s\/\-]?\d{1,2}[\s\/\-]?\d{2,4})/i,
          undefined,
          'Data após EMISSÃO (até 40 caracteres)'
        ),
        
        // Prioridade 1: Última data no documento (geralmente é emissão)
        this.createFunctionStrategy(
          1,
          (text: string) => {
            const dates = text.match(/\b\d{1,2}[\s\/\-]?\d{1,2}[\s\/\-]?\d{2,4}\b/g);
            if (!dates || dates.length < 1) return null;
            
            // Pegar a última data que seja válida como data de emissão
            for (let i = dates.length - 1; i >= 0; i--) {
              const date = dates[i];
              const normalized = date.replace(/[\s\-]/g, '/').replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
              if (this.isValidIssueDate(normalized)) {
                return date;
              }
            }
            return null;
          },
          'Última data válida no documento'
        ),
        
        // Prioridade 2: Segunda data do documento (se houver)
        this.createFunctionStrategy(
          2,
          (text: string) => {
            const dates = text.match(/\b\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4}\b/g);
            return dates && dates.length >= 2 ? dates[1] : null;
          },
          'Segunda data encontrada'
        ),
        
        // Prioridade 3: Data próxima ao órgão emissor (SSP)
        this.createRegexStrategy(
          3,
          /(?:SSP|SECRETARIA)[\s\S]{0,80}?(\d{1,2}[\s\/\-]?\d{1,2}[\s\/\-]?\d{2,4})/i,
          undefined,
          'Data próxima ao órgão emissor'
        ),
      ],
      validator: (date) => this.isValidIssueDate(date),
      transform: (date) => {
        const normalized = date.replace(/[\s\-]/g, '/').replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
        return extractDate(normalized) || normalized;
      },
    },
    {
      name: 'orgao_emissor',
      strategies: [
        // Prioridade 0: SECRETARIA ou SSP seguido de UF
        this.createRegexStrategy(
          0,
          /(?:SECRETARIA|SSP)[\s\/\-]*(DA\s+)?(?:SEGURAN[ÇC]A\s+P[UÚ]BLICA)?[\s\/\-]*([A-Z]{2})\b/i,
          (match) => {
            const ufMatch = match.match(/\b([A-Z]{2})$/i);
            if (ufMatch && isValidUF(ufMatch[1])) {
              return `SSP/${ufMatch[1].toUpperCase()}`;
            }
            return match;
          },
          'SECRETARIA ou SSP seguido de UF'
        ),
        
        // Prioridade 1: UF isolado após "IDENTIDADE" ou "RG"
        this.createFunctionStrategy(
          1,
          (text: string) => {
            const rgMatch = text.match(/(?:IDENTIDADE|CARTEIRA\s+DE\s+IDENTIDADE|RG)/i);
            if (!rgMatch) return null;
            
            // Buscar UF nos próximos 150 caracteres
            const afterRG = text.substring(rgMatch.index!, rgMatch.index! + 150);
            const ufMatch = afterRG.match(/\b([A-Z]{2})\b/);
            
            if (ufMatch && isValidUF(ufMatch[1])) {
              return `SSP/${ufMatch[1].toUpperCase()}`;
            }
            return null;
          },
          'UF isolado após IDENTIDADE/RG'
        ),
        
        // Prioridade 2: Estado por extenso convertido para UF
        this.createRegexStrategy(
          2,
          /(?:ESTADO|EST\.?)\s+(?:DE|DO)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+)/i,
          (match) => {
            const stateMap: Record<string, string> = {
              'SAO PAULO': 'SP', 'SÃO PAULO': 'SP',
              'RIO DE JANEIRO': 'RJ',
              'MINAS GERAIS': 'MG',
              'BAHIA': 'BA',
              'PARANA': 'PR', 'PARANÁ': 'PR',
            };
            const stateMatch = match.match(/(?:ESTADO|EST\.?)\s+(?:DE|DO)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+)/i);
            if (stateMatch) {
              const stateName = stateMatch[1].trim().toUpperCase();
              const uf = stateMap[stateName];
              if (uf) return `SSP/${uf}`;
            }
            return match;
          },
          'Estado por extenso'
        ),
        
        // Prioridade 3: Buscar no cabeçalho (primeiros 300 caracteres)
        this.createFunctionStrategy(
          3,
          (text: string) => {
            const header = text.substring(0, 300);
            const ufMatch = header.match(/\b([A-Z]{2})\b/g);
            if (!ufMatch) return null;
            
            // Testar cada UF encontrado
            for (const uf of ufMatch) {
              if (isValidUF(uf)) {
                return `SSP/${uf.toUpperCase()}`;
              }
            }
            return null;
          },
          'UF no cabeçalho do documento'
        ),
      ],
      validator: (value: string) => {
        const ufMatch = value.match(/([A-Z]{2})$/);
        return ufMatch ? isValidUF(ufMatch[1]) : false;
      },
      transform: (value: string) => {
        // Normalizar para formato SSP/UF
        return value.toUpperCase().replace(/\s+/g, '/').replace(/SSP[-\/\s]+/, 'SSP/');
      },
    },
    {
      name: 'naturalidade',
      strategies: [
        this.createRegexStrategy(1, /(?:NATURALIDADE|NATURAL\s+DE)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]{3,50})/i),
        this.createFunctionStrategy(2, (text) => {
          const match = text.match(/\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+[\s\-][A-Z]{2})\b/);
          return match ? match[1] : null;
        }),
      ]
    },
    {
      name: 'filiacao_mae',
      strategies: [
        // Prioridade 0: Marcador explícito "MÃE:"
        this.createRegexStrategy(
          0,
          /(?:M[ÃA]E|FILIA[ÇC][AÃ]O\s+MATERNA)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]{10,60})/i,
          undefined,
          'Nome da mãe após marcador'
        ),
        
        // Prioridade 1: Primeiro nome após "FILIAÇÃO" ou "FILIACAO"
        this.createFunctionStrategy(
          1,
          (text: string) => {
            const filiacaoMatch = text.match(/FILIA[ÇC][AÃ]O[\s:]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?:\s+E\s+|\s{3,}|$)/i);
            if (!filiacaoMatch) return null;
            
            // Primeiro nome após FILIAÇÃO geralmente é da mãe
            const firstNameMatch = filiacaoMatch[1].match(/([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/);
            return firstNameMatch ? firstNameMatch[1].trim() : null;
          },
          'Primeiro nome após FILIAÇÃO'
        ),
        
        // Prioridade 2: Nome em maiúsculas após região de datas/RG
        this.createFunctionStrategy(
          2,
          (text: string) => {
            // Buscar após palavras-chave que indicam região de filiação
            const afterDatesMatch = text.match(/(?:NASCIMENTO|EMISS[AÃ]O|SSP)[\s\S]{50,}?([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{15,60})/i);
            if (!afterDatesMatch) return null;
            
            const names = afterDatesMatch[1].match(/[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{15,60}/g);
            return names && names.length > 0 ? names[0].trim() : null;
          },
          'Nome em maiúsculas na região de filiação'
        ),
      ],
      validator: (value: string) => {
        // Deve ter pelo menos 2 palavras
        const words = value.trim().split(/\s+/);
        if (words.length < 2) return false;
        
        // Não pode conter números
        if (/\d/.test(value)) return false;
        
        return true;
      },
      transform: (value: string) => {
        return value
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      },
    },
    {
      name: 'filiacao_pai',
      strategies: [
        // Prioridade 0: Marcador explícito "PAI:"
        this.createRegexStrategy(
          0,
          /(?:PAI|FILIA[ÇC][AÃ]O\s+PATERNA)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]{10,60})/i,
          undefined,
          'Nome do pai após marcador'
        ),
        
        // Prioridade 1: Segundo nome após "FILIAÇÃO" (após nome da mãe)
        this.createFunctionStrategy(
          1,
          (text: string) => {
            const filiacaoMatch = text.match(/FILIA[ÇC][AÃ]O[\s\S]{0,200}/i);
            if (!filiacaoMatch) return null;
            
            // Buscar dois nomes em maiúsculas consecutivos
            const names = filiacaoMatch[0].match(/[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{15,60}/g);
            if (names && names.length >= 2) {
              return names[1].trim();
            }
            return null;
          },
          'Segundo nome após FILIAÇÃO'
        ),
        
        // Prioridade 2: Nome após "E" ou espaço grande (indicando separação)
        this.createRegexStrategy(
          2,
          /FILIA[ÇC][AÃ]O[\s\S]{50,}?(?:\s+E\s+|\s{4,})([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{15,60})/i,
          undefined,
          'Nome do pai após separador'
        ),
      ],
      validator: (value: string) => {
        // Deve ter pelo menos 2 palavras
        const words = value.trim().split(/\s+/);
        if (words.length < 2) return false;
        
        // Não pode conter números
        if (/\d/.test(value)) return false;
        
        return true;
      },
      transform: (value: string) => {
        return value
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      },
    }
  ];
  
  /**
   * Valida se número é um RG válido
   */
  private isValidRG(rg: string): boolean {
    const cleaned = rg.replace(/\D/g, '');
    
    // RG deve ter entre 7 e 10 dígitos
    if (cleaned.length < 7 || cleaned.length > 10) return false;
    
    // Não pode ser sequência repetida
    if (/^(\d)\1+$/.test(cleaned)) return false;
    
    // Não pode ser CPF (11 dígitos)
    if (cleaned.length === 11) return false;
    
    // Não pode ser CNPJ (14 dígitos)
    if (cleaned.length === 14) return false;
    
    return true;
  }
  
  /**
   * Valida se data é válida para nascimento (1900-2010)
   */
  private isValidBirthDate(dateStr: string): boolean {
    const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (!match) return false;
    
    const year = parseInt(match[3]);
    return year >= 1900 && year <= 2010;
  }
  
  /**
   * Valida se data é válida para emissão (1970-2030)
   */
  private isValidIssueDate(dateStr: string): boolean {
    const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (!match) return false;
    
    const year = parseInt(match[3]);
    return year >= 1970 && year <= 2030;
  }
}
