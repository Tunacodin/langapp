// Gramer eğitim modülü SEED registry'si.
// Her konu ayrı bir seed dosyasıdır (./past-simple, ./present-simple ...).
// Yeni konu eklemek = yeni dosya + buraya bir satır. Ekranlar bu registry'yi
// getGrammarLesson ile sorgular; içeriği olmayan konularda ilgili adım kilitli kalır.

import type { GrammarLesson } from './types';
import { PAST_SIMPLE } from './past-simple';

export * from './types';

// norm_pattern -> ders. (grammar_topics.norm_pattern ile eşleşir.)
export const GRAMMAR_LESSONS: Record<string, GrammarLesson> = {
  PAST_SIMPLE,
};

export function getGrammarLesson(pattern: string | null | undefined): GrammarLesson | null {
  if (!pattern) return null;
  return GRAMMAR_LESSONS[pattern] ?? null;
}
