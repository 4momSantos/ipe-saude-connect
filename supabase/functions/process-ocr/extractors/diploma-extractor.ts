import { BaseExtractor } from './base-extractor.ts';
import { FieldExtractor } from '../types.ts';
import { extractDate } from '../utils/date-parser.ts';
import { extractName, validateName } from '../utils/name-parser.ts';

export class DiplomaExtractor extends BaseExtractor {
  type = 'diploma';
  
  fields: FieldExtractor[] = [
    {
      name: 'nome',
      strategies: [
        this.createRegexStrategy(1, /CERTIFICA\s+QUE\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?=\s*(?:CONCLUIU|COLOU))/i),
        this.createRegexStrategy(2, /CONFERE\s+O\s+T[IÍ]TULO\s+DE[\s\S]{0,50}?A\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)\b/i),
        this.createRegexStrategy(3, /BACHARELA?\s+EM\s+[\w\s]+\s+A\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)\b/i),
        this.createFunctionStrategy(4, (text) => {
          const match = text.match(/\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)\b/);
          return match ? match[1] : null;
        }),
      ],
      validator: validateName,
      required: true
    },
    {
      name: 'curso',
      strategies: [
        this.createRegexStrategy(1, /(?:BACHARELADO|LICENCIATURA|TECN[OÓ]LOGO)\s+EM\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{3,50})/i),
        this.createRegexStrategy(2, /SUPERIOR\s+DE\s+(?:BACHARELADO|LICENCIATURA|TECNOLOGIA)\s+EM\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{3,50})/i),
        this.createRegexStrategy(3, /CURSO\s+DE\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{3,50})(?:\s+NA\s+|\s+PELA\s+)/i),
        this.createRegexStrategy(4, /\b(MEDICINA|DIREITO|ENGENHARIA|ADMINISTRA[ÇC][AÃ]O|ENFERMAGEM|ODONTOLOGIA|PSICOLOGIA|ARQUITETURA)\b/i),
      ],
      required: true
    },
    {
      name: 'instituicao',
      strategies: [
        this.createRegexStrategy(1, /(?:PELA|NA|DO|DA)\s+(UNIVERSIDADE[\s\S]{5,80}?)(?=\s*(?:EM|NO|NA|GRAU))/i),
        this.createRegexStrategy(2, /(?:CENTRO\s+UNIVERSIT[AÁ]RIO|INSTITUTO\s+FEDERAL|FACULDADE)[\s\S]{5,80}?(?=\s*(?:EM|NO|NA))/i),
        this.createRegexStrategy(3, /(UNIVERSIDADE|CENTRO\s+UNIVERSIT[AÁ]RIO|FACULDADE|INSTITUTO)\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{5,60}/i),
      ]
    },
    {
      name: 'data_conclusao',
      strategies: [
        this.createRegexStrategy(1, /(?:COLA[ÇC][AÃ]O\s+DE\s+GRAU\s+EM|CONCLUS[AÃ]O\s+DO\s+CURSO\s+EM)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
        this.createRegexStrategy(2, /(?:COLA[ÇC][AÃ]O\s+DE\s+GRAU\s+EM|CONCLUS[AÃ]O\s+DO\s+CURSO\s+EM)[:\s]*(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i),
        this.createFunctionStrategy(3, (text) => {
          const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g);
          return dates && dates.length > 0 ? dates[dates.length - 1] : null;
        }),
      ],
      transform: (date) => extractDate(date) || date
    }
  ];
}
