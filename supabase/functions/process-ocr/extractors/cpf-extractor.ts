import { BaseExtractor } from './base-extractor.ts';
import { FieldExtractor } from '../types.ts';
import { isValidCPF } from '../utils/regex-patterns.ts';
import { extractDate } from '../utils/date-parser.ts';
import { extractName, validateName } from '../utils/name-parser.ts';

export class CPFExtractor extends BaseExtractor {
  type = 'cpf';
  
  fields: FieldExtractor[] = [
    {
      name: 'nome',
      strategies: [
        this.createRegexStrategy(1, /NOME[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i),
        this.createRegexStrategy(2, /TITULAR[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i),
        this.createFunctionStrategy(3, (text) => extractName(text)),
      ],
      validator: validateName,
      required: true
    },
    {
      name: 'cpf',
      strategies: [
        this.createRegexStrategy(1, /CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2})/i),
        this.createRegexStrategy(2, /N[UÚ]MERO[:\s]*(\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2})/i),
        this.createRegexStrategy(3, /(\d{3}\.\d{3}\.\d{3}[\-\.]\d{2})/),
        this.createFunctionStrategy(4, (text) => {
          const matches = text.match(/\d{11}/g);
          return matches ? matches[0] : null;
        }),
      ],
      validator: isValidCPF,
      transform: (cpf) => cpf.replace(/\D/g, ''),
      required: true
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
      name: 'situacao',
      strategies: [
        this.createRegexStrategy(1, /SITUA[ÇC][AÃ]O[:\s]*(REGULAR|IRREGULAR|CANCELADO|SUSPENSO|NULO|PENDENTE)/i),
        this.createRegexStrategy(2, /(REGULAR|IRREGULAR|CANCELADO|SUSPENSO|NULO|PENDENTE)/i),
      ]
    }
  ];
}
