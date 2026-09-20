import { LESSON_GLOSSARY, type Gloss } from './lessonAssets';

export type { Gloss };

// Ekrandaki bir kelimeyi (noktalama temizlenmis) o derse ait sozlukte ara.
export function lookupWord(mediaId: string, raw: string): { word: string; gloss: Gloss } | null {
  const w = raw.toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return null;
  const map = LESSON_GLOSSARY[mediaId] ?? {};
  const g = map[w];
  return g ? { word: w, gloss: g } : null;
}
