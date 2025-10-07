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
        this.createRegexStrategy(1, /(?:CNH|REGISTRO|N[UÚ]MERO)[:\s]*(\d{11})/i),
        this.createRegexStrategy(2, /PERMISS[AÃ]O[:\s]*(\d{11})/i),
        this.createFunctionStrategy(3, (text) => {
          const matches = text.match(/\b\d{11}\b/g);
          return matches ? matches[0] : null;
        }),
      ],
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
}
