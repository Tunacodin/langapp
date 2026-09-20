import topicsData from '../../assets/grammar/topics.json';

// Kapali gramer sozlugu (enum). Kaynak: assets/grammar/topics.json.
// norm_pattern SERBEST metin degil; pipeline (A regex + B LLM) yalniz bu
// kumeden bir deger uretebilir, aksi hepsi elenir (halusinasyon korumasi).

export type GrammarTopic = {
  norm_pattern: string;
  category: string;
  topic: string;
  formula: string;
  note_tr: string;
  cefr: string;
  layer: 'A' | 'B'; // A = regex/POS (deterministik), B = yapisal (LLM tercihli)
};

// Kategori sirasi (ekranda bolum sirasi) - tek kaynak.
export const CATEGORY_ORDER = [
  'Tenses & Aspects',
  'Modals & Modal Perfects',
  'Conditionals & Wish',
  'Subordinate Clauses',
  'Voice & Passives',
  'Quantity & Frequency',
] as const;

export const GRAMMAR_TOPICS: GrammarTopic[] = (topicsData as { topics: GrammarTopic[] }).topics;
export const GRAMMAR_TOPICS_VERSION: string = (topicsData as { version: string }).version;

// norm_pattern -> topic (hizli arama).
const BY_PATTERN = new Map(GRAMMAR_TOPICS.map((t) => [t.norm_pattern, t]));

export function getTopic(normPattern: string): GrammarTopic | undefined {
  return BY_PATTERN.get(normPattern);
}

export function isValidPattern(normPattern: string): boolean {
  return BY_PATTERN.has(normPattern);
}

// Highlight renkleri: spec -> mor=noun/WH, turuncu=IF, mavi=modal.
// Tenses icin ek nötr yesil. Kategori -> renk tek kaynak burada.
export const CATEGORY_COLOR: Record<string, string> = {
  'Subordinate Clauses': '#7C3AED', // mor
  'Conditionals & Wish': '#F97316', // turuncu
  'Modals & Modal Perfects': '#2563EB', // mavi
  'Tenses & Aspects': '#16A34A', // yesil
  'Voice & Passives': '#0D9488', // teal
  'Quantity & Frequency': '#DB2777', // pembe
};

export function colorFor(category: string): string {
  return CATEGORY_COLOR[category] ?? '#6B7280';
}
