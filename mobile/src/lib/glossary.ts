import glossary from '../../assets/lessons/lesson1.glossary.json';

export type Gloss = { pos: string; cefr: string; senses: string[] };

const MAP = glossary as Record<string, Gloss>;

// Ekrandaki bir kelimeyi (noktalama temizlenmis) sozlukte ara.
export function lookupWord(raw: string): { word: string; gloss: Gloss } | null {
  const w = raw.toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return null;
  const g = MAP[w];
  return g ? { word: w, gloss: g } : null;
}
