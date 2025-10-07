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
        // Prioridade 1: Nome explicitamente marcado
        this.createRegexStrategy(1, /(?:NOME|PORTADOR)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]{9,60})/i),
        
        // Prioridade 2: Nome em MAIÚSCULAS isolado (comum em RG)
        this.createFunctionStrategy(2, (text) => {
          const match = text.match(/\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+){1,5})\b/);
          if (match && match[1].length >= 10 && match[1].length <= 60) {
            const name = match[1].trim();
            if (validateName(name)) return name;
          }
          return null;
        }),
        
        // Prioridade 3: Nome próximo ao RG (contexto)
        this.createFunctionStrategy(3, (text) => {
          const rgMatch = text.match(/(?:RG|IDENTIDADE|REGISTRO)[:\s]*\d/i);
          if (rgMatch) {
            const beforeRG = text.slice(Math.max(0, rgMatch.index! - 200), rgMatch.index!);
            const nameMatch = beforeRG.match(/\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]{9,60})\b/);
            return nameMatch ? nameMatch[1].trim() : null;
          }
          return null;
        }),
        
        // Prioridade 4: Nome antes de CPF/RG
        this.createFunctionStrategy(4, (text) => {
          const docMatch = text.match(/(?:CPF|RG)[:\s]*\d/i);
          if (docMatch) {
            const beforeDoc = text.slice(Math.max(0, docMatch.index! - 150), docMatch.index!);
            return extractName(beforeDoc);
          }
          return null;
        }),
        
        // Prioridade 5: Extração genérica
        this.createFunctionStrategy(5, (text) => extractName(text)),
      ],
      validator: validateName,
      required: true
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
        // Prioridade 1: Data explicitamente marcada
        this.createRegexStrategy(1, /(?:NASCIMENTO|NASC|DATA\s+DE\s+NASC)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
        
        // Prioridade 2: Data por extenso
        this.createFunctionStrategy(2, (text) => {
          const dateMatch = text.match(/(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i);
          if (dateMatch) {
            return extractDate(dateMatch[0]);
          }
          return null;
        }),
        
        // Prioridade 3: Data abreviada
        this.createFunctionStrategy(3, (text) => {
          const dateMatch = text.match(/(\d{1,2})[\/\-\s](jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*[\/\-\s](\d{4})/i);
          if (dateMatch) {
            return extractDate(dateMatch[0]);
          }
          return null;
        }),
        
        // Prioridade 4: Primeira data no documento (geralmente é nascimento)
        this.createFunctionStrategy(4, (text) => {
          const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g);
          if (dates) {
            for (const date of dates) {
              const extracted = extractDate(date);
              if (extracted && this.isValidBirthDate(extracted)) {
                return extracted;
              }
            }
          }
          return null;
        }),
      ],
      validator: (date) => this.isValidBirthDate(date),
      transform: (date) => extractDate(date) || date
    },
    {
      name: 'data_emissao',
      strategies: [
        // Prioridade 1: Data explicitamente marcada
        this.createRegexStrategy(1, /(?:EMISS[AÃ]O|EMITIDO\s+EM|EXPEDIDO\s+EM)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
        
        // Prioridade 2: Segunda data no documento (geralmente é emissão)
        this.createFunctionStrategy(2, (text) => {
          const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g);
          if (dates && dates.length > 1) {
            for (let i = 1; i < dates.length; i++) {
              const extracted = extractDate(dates[i]);
              if (extracted && this.isValidIssueDate(extracted)) {
                return extracted;
              }
            }
          }
          return null;
        }),
        
        // Prioridade 3: Data após menção a RG/Identidade
        this.createFunctionStrategy(3, (text) => {
          const rgMatch = text.match(/(?:RG|IDENTIDADE|EXPEDIDO)/i);
          if (rgMatch) {
            const afterRG = text.slice(rgMatch.index!, rgMatch.index! + 200);
            const dateMatch = afterRG.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/);
            if (dateMatch) {
              const extracted = extractDate(dateMatch[0]);
              if (extracted && this.isValidIssueDate(extracted)) {
                return extracted;
              }
            }
          }
          return null;
        }),
      ],
      validator: (date) => this.isValidIssueDate(date),
      transform: (date) => extractDate(date) || date
    },
    {
      name: 'orgao_emissor',
      strategies: [
        // Prioridade 1: Órgão explicitamente marcado
        this.createRegexStrategy(1, /(?:ORG[AÃ]O\s+EMISSOR|EXPEDIDO\s+POR)[:\s]*([A-Z\/\-\s]{2,20})/i,
          (match) => match.trim().replace(/\s*[\/\-]\s*/g, '/')),
        
        // Prioridade 2: Padrão SSP/UF, SSP-UF, SSP UF
        this.createRegexStrategy(2, /(SSP|DETRAN|PC|IFP)[\s\/\-]*([A-Z]{2})/i, 
          (match) => match.replace(/\s+/g, '/').replace('-', '/')),
        
        // Prioridade 3: UF isolado após RG
        this.createFunctionStrategy(3, (text) => {
          const rgMatch = text.match(/(?:RG|IDENTIDADE)[:\s]*\d+/i);
          if (rgMatch) {
            const afterRG = text.slice(rgMatch.index! + rgMatch[0].length, rgMatch.index! + rgMatch[0].length + 100);
            const ufMatch = afterRG.match(/\b([A-Z]{2})\b/);
            if (ufMatch && isValidUF(ufMatch[1])) {
              return `SSP/${ufMatch[1]}`;
            }
          }
          return null;
        }),
      ],
      validator: (orgao) => {
        // Validar se contém UF válido
        const ufMatch = orgao.match(/([A-Z]{2})\b/);
        return ufMatch ? isValidUF(ufMatch[1]) : true;
      }
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
        this.createRegexStrategy(1, /M[AÃ]E[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]{10,60})/i),
        this.createFunctionStrategy(2, (text) => {
          const filiacaoMatch = text.match(/FILIA[ÇC][AÃ]O[:\s]*([\s\S]{10,150}?)(?=PAI|DATA|CPF|RG|$)/i);
          if (filiacaoMatch) {
            const names = filiacaoMatch[1].match(/([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]{10,60})/g);
            return names && names.length > 0 ? names[0] : null;
          }
          return null;
        }),
      ],
      validator: validateName
    },
    {
      name: 'filiacao_pai',
      strategies: [
        this.createRegexStrategy(1, /PAI[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]{10,60})/i),
        this.createFunctionStrategy(2, (text) => {
          const filiacaoMatch = text.match(/FILIA[ÇC][AÃ]O[:\s]*([\s\S]{10,150}?)(?=DATA|CPF|RG|$)/i);
          if (filiacaoMatch) {
            const names = filiacaoMatch[1].match(/([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-Za-záàâãéèêíïóôõöúçñ\s]{10,60})/g);
            return names && names.length > 1 ? names[1] : null;
          }
          return null;
        }),
      ],
      validator: validateName
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
