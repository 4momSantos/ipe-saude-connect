import { BaseExtractor } from './base-extractor.ts';
import { FieldExtractor } from '../types.ts';
import { isValidUF } from '../utils/regex-patterns.ts';
import { extractName, validateName } from '../utils/name-parser.ts';

export class CRMExtractor extends BaseExtractor {
  type = 'crm';
  
  fields: FieldExtractor[] = [
    {
      name: 'nome',
      strategies: [
        this.createRegexStrategy(1, /NOME[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i),
        this.createRegexStrategy(2, /M[EÉ]DICO[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i),
        this.createFunctionStrategy(3, (text) => extractName(text)),
      ],
      validator: validateName,
      required: true
    },
    {
      name: 'crm',
      strategies: [
        this.createRegexStrategy(1, /CRM[:\s\-\/]*([A-Z]{2})[:\s\-\/]*(\d{4,6})/i, (match) => {
          const parts = match.match(/([A-Z]{2})[:\s\-\/]*(\d{4,6})/i);
          return parts ? `CRM-${parts[1]} ${parts[2]}` : match;
        }),
        this.createRegexStrategy(2, /REGISTRO[:\s]*(\d{4,6})[:\s\-\/]*([A-Z]{2})/i, (match) => {
          const parts = match.match(/(\d{4,6})[:\s\-\/]*([A-Z]{2})/i);
          return parts ? `CRM-${parts[2]} ${parts[1]}` : match;
        }),
        this.createRegexStrategy(3, /\b(\d{4,6})[:\s\-\/]*([A-Z]{2})\b/, (match) => {
          const parts = match.match(/(\d{4,6})[:\s\-\/]*([A-Z]{2})/);
          return parts ? `CRM-${parts[2]} ${parts[1]}` : match;
        }),
      ],
      required: true
    },
    {
      name: 'uf',
      strategies: [
        this.createRegexStrategy(1, /CRM[:\s\-\/]*([A-Z]{2})/i),
        this.createRegexStrategy(2, /UF[:\s]*([A-Z]{2})/i),
        this.createRegexStrategy(3, /\b([A-Z]{2})\b/, (uf) => uf.toUpperCase()),
      ],
      validator: isValidUF
    },
    {
      name: 'especialidade',
      strategies: [
        this.createRegexStrategy(1, /ESPECIALIDADE[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{3,50})/i),
        this.createRegexStrategy(2, /[ÁA]REA[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{3,50})/i),
      ]
    },
    {
      name: 'situacao',
      strategies: [
        this.createRegexStrategy(1, /SITUA[ÇC][AÃ]O[:\s]*(ATIVO|INATIVO|CANCELADO|SUSPENSO|REGULAR)/i),
        this.createRegexStrategy(2, /(ATIVO|INATIVO|CANCELADO|SUSPENSO|REGULAR)/i),
      ]
    }
  ];
}
