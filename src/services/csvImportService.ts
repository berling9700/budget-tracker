import { Category } from '../../types';
import { ParsedExpenseData } from './geminiService';

export interface CsvMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  categoryColumn?: string;
}

export interface CsvMappingPreset {
  id: string;
  name: string;
  mapping: CsvMapping;
  delimiter: string;
  headerSignature: string[];
  categoryOverrides: Record<string, string>;
  categoryMappings?: Record<string, string>; // Maps importCategoryName/csvCategoryName to categoryId
  csvCategoryNames?: string[]; // Track which CSV category values were in the original import
}

const PRESETS_KEY = 'budget-tracker-csv-mapping-presets';
const DEFAULT_DELIMITER = ',';

const normalize = (value: string): string => value.trim().toLowerCase();

export const createHeaderSignature = (headers: string[]): string[] => {
  return [...new Set(headers.map(normalize).filter(Boolean))].sort();
};

const sameSignature = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const findPresetByHeaders = (presets: CsvMappingPreset[], headers: string[]): CsvMappingPreset | null => {
  const signature = createHeaderSignature(headers);
  return presets.find(p => sameSignature(p.headerSignature || [], signature)) || null;
};

const keywordRules: Array<{ keyword: string; categoryHint: string }> = [
  { keyword: 'amazon', categoryHint: 'shopping' },
  { keyword: 'walmart', categoryHint: 'grocer' },
  { keyword: 'costco', categoryHint: 'grocer' },
  { keyword: 'target', categoryHint: 'shopping' },
  { keyword: 'uber', categoryHint: 'transport' },
  { keyword: 'lyft', categoryHint: 'transport' },
  { keyword: 'shell', categoryHint: 'gas' },
  { keyword: 'chevron', categoryHint: 'gas' },
  { keyword: 'netflix', categoryHint: 'subscription' },
  { keyword: 'spotify', categoryHint: 'subscription' },
  { keyword: 'apple.com/bill', categoryHint: 'subscription' },
  { keyword: 'att', categoryHint: 'phone' },
  { keyword: 'verizon', categoryHint: 'phone' },
  { keyword: 't-mobile', categoryHint: 'phone' },
  { keyword: 'restaurant', categoryHint: 'dining' },
  { keyword: 'starbucks', categoryHint: 'dining' },
];

export const detectDelimiter = (content: string): string => {
  const firstLine = content.split(/\r?\n/).find(line => line.trim().length > 0) || '';
  const candidates = [',', ';', '\t', '|'];
  let winner = DEFAULT_DELIMITER;
  let bestCount = 0;

  for (const candidate of candidates) {
    const count = (firstLine.match(new RegExp(`\\${candidate}`, 'g')) || []).length;
    if (count > bestCount) {
      winner = candidate;
      bestCount = count;
    }
  }

  return winner;
};

const splitCsvLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

export const parseCsvRecords = (content: string, delimiter: string): Record<string, string>[] => {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0], delimiter).map(h => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').replace(/^"|"$/g, '');
    });
    return row;
  });
};

export const getCsvHeaders = (content: string, delimiter: string): string[] => {
  const first = content.split(/\r?\n/).find(line => line.trim().length > 0);
  if (!first) return [];
  return splitCsvLine(first, delimiter).map(h => h.replace(/^"|"$/g, ''));
};

export const suggestMapping = (headers: string[]): CsvMapping => {
  const lower = headers.map(h => normalize(h));
  const pick = (terms: string[]): string =>
    headers[lower.findIndex(h => terms.some(t => h.includes(t)))] || '';

  return {
    dateColumn: pick(['date', 'posted', 'transaction date']),
    descriptionColumn: pick(['description', 'merchant', 'name', 'memo', 'detail']),
    amountColumn: pick(['amount', 'debit', 'value']),
    categoryColumn: pick(['category', 'type']),
  };
};

const parseDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoAttempt = new Date(trimmed);
  if (!Number.isNaN(isoAttempt.getTime())) return isoAttempt.toISOString();

  const slashParts = trimmed.split('/');
  if (slashParts.length === 3) {
    const [month, day, year] = slashParts.map(Number);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return null;
};

const parseAmount = (value: string): number | null => {
  const normalized = value.replace(/[$,]/g, '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return null;
  return Math.abs(parsed);
};

const bestCategoryMatch = (description: string, categories: Category[]): string | undefined => {
  const normalizedDescription = normalize(description);
  const nameMatch = categories.find(c => normalizedDescription.includes(normalize(c.name)));
  if (nameMatch) return nameMatch.name;

  const keywordMatch = keywordRules.find(rule => normalizedDescription.includes(rule.keyword));
  if (!keywordMatch) return undefined;

  const categoryByHint = categories.find(c => normalize(c.name).includes(keywordMatch.categoryHint));
  return categoryByHint?.name;
};

export const convertMappedCsvToExpenses = (
  rows: Record<string, string>[],
  mapping: CsvMapping,
  categories: Category[],
): ParsedExpenseData[] => {
  return rows
    .map(row => {
      const date = parseDate(row[mapping.dateColumn] || '');
      const amount = parseAmount(row[mapping.amountColumn] || '');
      const name = (row[mapping.descriptionColumn] || '').trim();
      const mappedCategoryName = mapping.categoryColumn ? (row[mapping.categoryColumn] || '').trim() : '';
      const suggestedCategoryName = mappedCategoryName || bestCategoryMatch(name, categories) || 'Other';

      if (!date || !amount || !name) return null;

      return {
        name,
        amount,
        date,
        categoryName: suggestedCategoryName,
      } as ParsedExpenseData;
    })
    .filter((expense): expense is ParsedExpenseData => Boolean(expense));
};

export const loadMappingPresets = (): CsvMappingPreset[] => {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CsvMappingPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(preset => ({
      ...preset,
      headerSignature: Array.isArray(preset.headerSignature) ? preset.headerSignature : [],
      categoryOverrides: preset.categoryOverrides || {},
      categoryMappings: preset.categoryMappings || {},
      csvCategoryNames: Array.isArray(preset.csvCategoryNames) ? preset.csvCategoryNames : [],
    }));
  } catch {
    return [];
  }
};

export const saveMappingPresets = (presets: CsvMappingPreset[]): void => {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
};
