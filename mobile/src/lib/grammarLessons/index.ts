// Gramer eğitim modülü SEED registry'si.
// Her konu ayrı bir seed dosyasıdır (./past-simple, ./present-simple ...).
// Yeni konu eklemek = yeni dosya + buraya bir satır. Ekranlar bu registry'yi
// getGrammarLesson ile sorgular; içeriği olmayan konularda ilgili adım kilitli kalır.

import type { GrammarLesson } from './types';
import { FUTURE_GOING_TO } from './future-going-to';
import { FUTURE_WILL } from './future-will';
import { PAST_SIMPLE } from './past-simple';

export * from './types';

// norm_pattern -> ders. Anahtar topics.json'daki norm_pattern ile BIREBIR ayni
// olmali (ekranlar ?key=<norm_pattern> ile sorar); farkli yazilirsa ders gorunmez.
export const GRAMMAR_LESSONS: Record<string, GrammarLesson> = {
  simple_past: PAST_SIMPLE,
  future_will: FUTURE_WILL,
  future_going_to: FUTURE_GOING_TO,
};

export function getGrammarLesson(pattern: string | null | undefined): GrammarLesson | null {
  if (!pattern) return null;
  return GRAMMAR_LESSONS[pattern] ?? null;
}
