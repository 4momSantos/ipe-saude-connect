import { BaseExtractor } from './base-extractor.ts';
import { FieldExtractor } from '../types.ts';
import { isValidCNPJ, PATTERNS } from '../utils/regex-patterns.ts';
import { extractDate } from '../utils/date-parser.ts';

export class CNPJExtractor extends BaseExtractor {
  type = 'cnpj';
  
  fields: FieldExtractor[] = [
    {
      name: 'razao_social',
      strategies: [
        this.createRegexStrategy(1, /(?:RAZ[AÃ]O\s+SOCIAL|NOME\s+EMPRESARIAL)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-\.]{5,100})/i),
        this.createRegexStrategy(2, /EMPRESA[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-\.]{5,100})/i),
      ],
      required: true
    },
    {
      name: 'cnpj',
      strategies: [
        this.createRegexStrategy(1, /CNPJ[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[\-\.]?\d{2})/i),
        this.createRegexStrategy(2, /N[UÚ]MERO[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[\-\.]?\d{2})/i),
        this.createRegexStrategy(3, PATTERNS.CNPJ),
      ],
      validator: isValidCNPJ,
      transform: (cnpj) => cnpj.replace(/\D/g, ''),
      required: true
    },
    {
      name: 'nome_fantasia',
      strategies: [
        this.createRegexStrategy(1, /(?:NOME\s+FANTASIA|FANTASIA)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-\.]{3,100})/i),
      ]
    },
    {
      name: 'data_abertura',
      strategies: [
        this.createRegexStrategy(1, /(?:DATA\s+DE\s+ABERTURA|ABERTURA|CONSTITUI[ÇC][AÃ]O)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
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
        this.createRegexStrategy(1, /SITUA[ÇC][AÃ]O[:\s]*(ATIVA|INATIVA|SUSPENSA|BAIXADA|INAPTA)/i),
        this.createRegexStrategy(2, /(ATIVA|INATIVA|SUSPENSA|BAIXADA|INAPTA)/i),
      ]
    },
    {
      name: 'porte',
      strategies: [
        this.createRegexStrategy(1, /PORTE[:\s]*(ME|EPP|MICRO\s+EMPRESA|PEQUENO\s+PORTE|M[EÉ]DIO\s+PORTE|GRANDE\s+PORTE)/i),
      ]
    },
    {
      name: 'natureza_juridica',
      strategies: [
        this.createRegexStrategy(1, /NATUREZA\s+JUR[IÍ]DICA[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]{5,80})/i),
      ]
    }
  ];
}
