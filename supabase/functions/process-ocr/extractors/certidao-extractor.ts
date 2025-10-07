import { BaseExtractor } from './base-extractor.ts';
import { FieldExtractor } from '../types.ts';
import { extractDate } from '../utils/date-parser.ts';
import { extractUppercaseName, validateName } from '../utils/name-parser.ts';

export class CertidaoExtractor extends BaseExtractor {
  type = 'certidao';
  
  fields: FieldExtractor[] = [
    {
      name: 'nome',
      strategies: [
        this.createRegexStrategy(1, /CERTID[AÃ]O\s+DE[\s\S]{0,30}?([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+){1,})/i),
        this.createFunctionStrategy(2, (text) => {
          const match = text.match(/([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+){1,})[\s\S]{0,50}?FILHO/i);
          return match ? match[1].trim() : null;
        }),
        this.createFunctionStrategy(3, (text) => extractUppercaseName(text)),
      ],
      validator: validateName,
      required: true
    },
    {
      name: 'filiacao',
      strategies: [
        this.createRegexStrategy(1, /FILHO\s+DE\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+)\s+E\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+)/i, (match) => {
          const parts = match.match(/FILHO\s+DE\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+)\s+E\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+)/i);
          return parts ? `Pai: ${parts[1].trim()}, Mãe: ${parts[2].trim()}` : match;
        }),
        this.createFunctionStrategy(2, (text) => {
          const paiMatch = text.match(/PAI[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i);
          const maeMatch = text.match(/M[AÃ]E[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60})/i);
          if (paiMatch && maeMatch) {
            return `Pai: ${paiMatch[1].trim()}, Mãe: ${maeMatch[1].trim()}`;
          }
          return null;
        }),
        this.createFunctionStrategy(3, (text) => {
          const lines = text.split('\n');
          const names = lines
            .filter(line => /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}$/.test(line.trim()))
            .map(line => line.trim());
          if (names.length >= 2) {
            return `Pai: ${names[0]}, Mãe: ${names[1]}`;
          }
          return null;
        }),
      ]
    },
    {
      name: 'data_nascimento',
      strategies: [
        this.createRegexStrategy(1, /(?:NASCIDO?\s+EM|AOS|NO\s+DIA)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
        this.createRegexStrategy(2, /(?:NASCIDO?\s+EM|AOS|NO\s+DIA)[:\s]*(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i),
        this.createFunctionStrategy(3, (text) => {
          const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g);
          if (dates) {
            // Priorizar datas antigas (antes de 2020) para nascimento
            const oldDates = dates.filter(d => {
              const year = parseInt(d.split(/[\/\-]/)[2]);
              return year < 2020;
            });
            return oldDates.length > 0 ? oldDates[0] : dates[0];
          }
          return null;
        }),
      ],
      transform: (date) => extractDate(date) || date
    },
    {
      name: 'data_emissao',
      strategies: [
        this.createRegexStrategy(1, /(?:EMISS[AÃ]O|EXPEDIDA\s+EM|LAVRADO\s+EM)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i),
        this.createFunctionStrategy(2, (text) => {
          const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g);
          if (dates && dates.length > 1) {
            // Priorizar datas recentes (após 2020) para emissão
            const recentDates = dates.filter(d => {
              const year = parseInt(d.split(/[\/\-]/)[2]);
              return year >= 2020;
            });
            return recentDates.length > 0 ? recentDates[0] : dates[dates.length - 1];
          }
          return null;
        }),
      ],
      transform: (date) => extractDate(date) || date
    },
    {
      name: 'livro',
      strategies: [
        this.createRegexStrategy(1, /LIVRO[:\s]*([A-Z0-9\-]+)/i),
        this.createRegexStrategy(2, /LV[:\s]*([A-Z0-9\-]+)/i),
        this.createFunctionStrategy(3, (text) => {
          const match = text.match(/\bLIVRO\s+([A-Z0-9\-]+)/i);
          return match ? match[1] : null;
        }),
      ]
    },
    {
      name: 'folha',
      strategies: [
        this.createRegexStrategy(1, /(?:FOLHA|FLS|FL)[:\s]*(\d+[A-Za-z]?)/i),
        this.createFunctionStrategy(2, (text) => {
          const match = text.match(/\b(?:FOLHA|FLS|FL)\s+(\d+[A-Za-z]?)/i);
          return match ? match[1] : null;
        }),
      ]
    },
    {
      name: 'termo',
      strategies: [
        this.createRegexStrategy(1, /TERMO[:\s]*(\d+)/i),
        this.createFunctionStrategy(2, (text) => {
          const match = text.match(/\bTERMO\s+(\d+)/i);
          return match ? match[1] : null;
        }),
      ]
    }
  ];
}
