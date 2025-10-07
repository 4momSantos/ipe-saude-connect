import { BaseExtractor } from './base-extractor.ts';
import { FieldExtractor } from '../types.ts';
import { PATTERNS, isValidCPF } from '../utils/regex-patterns.ts';
import { extractDate } from '../utils/date-parser.ts';
import { extractName, validateName } from '../utils/name-parser.ts';

export class CNHExtractor extends BaseExtractor {
  type = 'cnh';
  
  fields: FieldExtractor[] = [
    {
      name: 'nome',
      strategies: [
        this.createRegexStrategy(1, /NOME[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i),
        this.createRegexStrategy(2, /CONDUTOR[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i),
        this.createFunctionStrategy(3, (text) => extractName(text)),
      ],
      validator: validateName,
      required: true
    },
    {
      name: 'cnh',
      strategies: [
        // Prioridade 1: CNH explicitamente marcada
        this.createRegexStrategy(1, /(?:CNH|REGISTRO|N[UÚ]MERO|DOC(?:UMENTO)?)[:\s]*(\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d)/i, 
          (match) => match.replace(/[\s\.]/g, '')),
        
        // Prioridade 2: CNH próxima ao nome/condutor (contexto)
        this.createFunctionStrategy(2, (text) => {
          const nomeMatch = text.match(/(?:NOME|CONDUTOR)[:\s]*[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}/i);
          if (nomeMatch) {
            const afterName = text.slice(nomeMatch.index! + nomeMatch[0].length, nomeMatch.index! + nomeMatch[0].length + 200);
            const cnhMatch = afterName.match(/(\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d)/);
            return cnhMatch ? cnhMatch[1].replace(/[\s\.]/g, '') : null;
          }
          return null;
        }),
        
        // Prioridade 3: CNH nos primeiros 300 caracteres (topo do documento)
        this.createFunctionStrategy(3, (text) => {
          const topText = text.slice(0, 300);
          const matches = topText.match(/\b(\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d)\b/g);
          if (matches) {
            const cleaned = matches.map(m => m.replace(/[\s\.]/g, ''));
            // Filtrar números que não são CPF (diferente de 11 dígitos puros sem contexto)
            for (const num of cleaned) {
              if (num.length === 11 && !this.isCPFPattern(num)) {
                return num;
              }
            }
          }
          return null;
        }),
        
        // Prioridade 4: Sequência de 11 dígitos com tolerância a formatação
        this.createFunctionStrategy(4, (text) => {
          const matches = text.match(/\b(\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d[\s\.]?\d)\b/g);
          if (matches) {
            const cleaned = matches.map(m => m.replace(/[\s\.]/g, ''));
            for (const num of cleaned) {
              if (this.isValidCNH(num)) {
                return num;
              }
            }
          }
          return null;
        }),
        
        // Prioridade 5: Último recurso - qualquer 11 dígitos seguidos
        this.createFunctionStrategy(5, (text) => {
          const matches = text.match(/\b\d{11}\b/g);
          return matches ? matches[0] : null;
        }),
      ],
      validator: (cnh) => this.isValidCNH(cnh),
      transform: (cnh) => cnh.replace(/[\s\.]/g, ''),
      required: true
    },
    {
      name: 'cpf',
      strategies: [
        this.createRegexStrategy(1, /CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2})/i),
        this.createRegexStrategy(2, PATTERNS.CPF),
      ],
      validator: isValidCPF,
      transform: (cpf) => cpf.replace(/\D/g, '')
    },
    {
      name: 'data_nascimento',
      strategies: [
        this.createRegexStrategy(1, /(?:NASCIMENTO|NASC|DN)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
        this.createFunctionStrategy(2, (text) => {
          const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g);
          return dates ? dates[0] : null;
        }),
      ],
      transform: (date) => extractDate(date) || date
    },
    {
      name: 'data_emissao',
      strategies: [
        this.createRegexStrategy(1, /(?:EMISS[AÃ]O|EMITIDO)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
        this.createRegexStrategy(2, /(?:PRIMEIRA\s+HABILITA[ÇC][AÃ]O|1[AªÂ]\s+HABILITA[ÇC][AÃ]O)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
      ],
      transform: (date) => extractDate(date) || date
    },
    {
      name: 'data_validade',
      strategies: [
        this.createRegexStrategy(1, /(?:VALIDADE|VENCIMENTO|V[AÁ]LIDA\s+AT[EÉ])[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
        this.createFunctionStrategy(2, (text) => {
          const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g);
          return dates && dates.length > 2 ? dates[2] : null;
        }),
      ],
      transform: (date) => extractDate(date) || date
    },
    {
      name: 'categoria',
      strategies: [
        this.createRegexStrategy(1, /CATEGORIA[:\s]*([A-E]{1,3})/i),
        this.createRegexStrategy(2, /\b([A-E]{1,3})\b/),
      ],
      validator: (cat) => /^[A-E]{1,3}$/.test(cat)
    },
    {
      name: 'local_emissao',
      strategies: [
        this.createRegexStrategy(1, /LOCAL[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-\/]{3,50})/i),
        this.createRegexStrategy(2, /(DETRAN[\/\s]*[A-Z]{2})/i),
      ]
    }
  ];
  
  /**
   * Valida se número é uma CNH válida
   */
  private isValidCNH(cnh: string): boolean {
    const cleaned = cnh.replace(/\D/g, '');
    
    // Deve ter 11 dígitos
    if (cleaned.length !== 11) return false;
    
    // Não pode ser sequência repetida (00000000000, 11111111111, etc)
    if (/^(\d)\1{10}$/.test(cleaned)) return false;
    
    // Não pode ser CPF conhecido (opcional - evita confusão)
    if (this.isCPFPattern(cleaned)) return false;
    
    return true;
  }
  
  /**
   * Verifica se parece com padrão de CPF (para evitar confusão)
   */
  private isCPFPattern(num: string): boolean {
    // CPFs geralmente têm dígitos verificadores no final
    // CNHs geralmente começam com dígitos mais altos
    // Esta é uma heurística simples
    const firstDigit = parseInt(num[0]);
    return firstDigit <= 3; // CPFs geralmente começam com 0-3
  }
}
