import { BaseExtractor } from './base-extractor.ts';
import { FieldExtractor } from '../types.ts';
import { PATTERNS, isValidCEP } from '../utils/regex-patterns.ts';
import { extractDate } from '../utils/date-parser.ts';
import { extractName } from '../utils/name-parser.ts';

export class ComprovanteExtractor extends BaseExtractor {
  type = 'comprovante_endereco';
  
  fields: FieldExtractor[] = [
    {
      name: 'nome',
      strategies: [
        this.createRegexStrategy(1, /(?:DESTINAT[AÁ]RIO|CLIENTE|TITULAR)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i),
        this.createFunctionStrategy(2, (text) => extractName(text)),
      ]
    },
    {
      name: 'logradouro',
      strategies: [
        this.createRegexStrategy(1, /(?:ENDERE[ÇC]O|RUA|AVENIDA|AV|TRAVESSA|TV)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\d\,\.\-]{10,100})/i),
        this.createRegexStrategy(2, /(RUA|AVENIDA|AV|TRAVESSA|TV|ALAMEDA|ROD)\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\d\,\.\-]{5,80}/i),
      ]
    },
    {
      name: 'numero',
      strategies: [
        this.createRegexStrategy(1, /(?:N[UÚ]MERO|N[°º]|Nº)[:\s]*(\d+[A-Z]?)/i),
        this.createRegexStrategy(2, /\b(\d{1,5})\b/),
      ]
    },
    {
      name: 'complemento',
      strategies: [
        this.createRegexStrategy(1, /COMPLEMENTO[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\d\-]{2,50})/i),
        this.createRegexStrategy(2, /(?:APTO|APT|BLOCO|BL|SALA)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\d\-]{1,30})/i),
      ]
    },
    {
      name: 'bairro',
      strategies: [
        this.createRegexStrategy(1, /BAIRRO[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]{3,50})/i),
        this.createRegexStrategy(2, /\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]{5,40})\s+[\-\s]*\s*[A-Z]{2}\b/i),
      ]
    },
    {
      name: 'cidade',
      strategies: [
        this.createRegexStrategy(1, /CIDADE[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]{3,50})/i),
        this.createRegexStrategy(2, /(?:MUNIC[IÍ]PIO|LOC)[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]{3,50})/i),
      ]
    },
    {
      name: 'estado',
      strategies: [
        this.createRegexStrategy(1, /(?:ESTADO|UF)[:\s]*([A-Z]{2})/i),
        this.createRegexStrategy(2, PATTERNS.ESTADO_UF),
      ]
    },
    {
      name: 'cep',
      strategies: [
        this.createRegexStrategy(1, /CEP[:\s]*(\d{5}[\-\.]?\d{3})/i),
        this.createRegexStrategy(2, PATTERNS.CEP),
      ],
      validator: isValidCEP,
      transform: (cep) => cep.replace(/\D/g, '')
    },
    {
      name: 'data_documento',
      strategies: [
        this.createRegexStrategy(1, /(?:DATA|EMISS[AÃ]O|VENCIMENTO)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
        this.createFunctionStrategy(2, (text) => {
          const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g);
          return dates ? dates[0] : null;
        }),
      ],
      transform: (date) => extractDate(date) || date
    }
  ];
}
