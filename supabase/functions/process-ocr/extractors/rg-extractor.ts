import { BaseExtractor } from './base-extractor.ts';
import { FieldExtractor } from '../types.ts';
import { PATTERNS, isValidCPF } from '../utils/regex-patterns.ts';
import { extractDate } from '../utils/date-parser.ts';
import { extractName, validateName } from '../utils/name-parser.ts';

export class RGExtractor extends BaseExtractor {
  type = 'rg';
  
  fields: FieldExtractor[] = [
    {
      name: 'nome',
      strategies: [
        this.createRegexStrategy(1, /NOME[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i),
        this.createRegexStrategy(2, /PORTADOR[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i),
        this.createFunctionStrategy(3, (text) => extractName(text)),
      ],
      validator: validateName,
      required: true
    },
    {
      name: 'rg',
      strategies: [
        this.createRegexStrategy(1, /(?:RG|REGISTRO\s+GERAL|IDENTIDADE)[:\s]*(\d{1,2}\.?\d{3}\.?\d{3}[\-\.]?[\dXx])/i),
        this.createRegexStrategy(2, /N[UÚ]MERO[:\s]*(\d{1,2}\.?\d{3}\.?\d{3}[\-\.]?[\dXx])/i),
        this.createRegexStrategy(3, /(\d{1,2}\.\d{3}\.\d{3}[\-\.]?[\dXx])/),
      ],
      required: true
    },
    {
      name: 'cpf',
      strategies: [
        this.createRegexStrategy(1, /CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2})/i),
        this.createRegexStrategy(2, /NASCIMENTO[\s\S]{0,100}(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\.\s]?\d{2})/),
        this.createFunctionStrategy(3, (text) => {
          const matches = text.match(/\d{11}/g);
          return matches ? matches[matches.length - 1] : null;
        }),
      ],
      validator: isValidCPF,
      transform: (cpf) => cpf.replace(/\D/g, '')
    },
    {
      name: 'data_nascimento',
      strategies: [
        this.createRegexStrategy(1, /(?:NASCIMENTO|NASC|DATA\s+DE\s+NASC)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
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
        this.createRegexStrategy(1, /(?:EMISS[AÃ]O|EMITIDO\s+EM)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
        this.createFunctionStrategy(2, (text) => {
          const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g);
          return dates && dates.length > 1 ? dates[1] : null;
        }),
      ],
      transform: (date) => extractDate(date) || date
    },
    {
      name: 'orgao_emissor',
      strategies: [
        this.createRegexStrategy(1, /(?:ORG[AÃ]O\s+EMISSOR|EXPEDIDO\s+POR)[:\s]*([A-Z\/\s]{2,20})/i),
        this.createRegexStrategy(2, /(SSP|DETRAN|PC|IFP)[\/\s]*([A-Z]{2})/i, (match) => match.replace(/\s+/g, '/')),
      ]
    },
    {
      name: 'naturalidade',
      strategies: [
        this.createRegexStrategy(1, /NATURALIDADE[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]{3,50})/i),
        this.createRegexStrategy(2, /NATURAL\s+DE[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]{3,50})/i),
      ]
    },
    {
      name: 'filiacao',
      strategies: [
        this.createRegexStrategy(1, /FILIA[ÇC][AÃ]O[:\s]*([\s\S]{10,150}?)(?=DATA|CPF|RG|$)/i),
        this.createRegexStrategy(2, /(?:PAI|M[AÃ]E)[:\s]*([\s\S]{10,150}?)(?=DATA|CPF|RG|$)/i),
      ]
    }
  ];
}
