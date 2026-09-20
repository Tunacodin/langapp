import { PronunciationResult } from '@/lib/pronunciation';

// Studyo -> Analiz ekrani arasi son degerlendirmeyi tasimak icin gecici bellek.
// (Router param'a agir nesne koymamak icin basit modul deposu; kalicilik yok.)
export type LastAssessment = { sentence: string; tr: string; result: PronunciationResult };

let last: LastAssessment | null = null;

export function setLastAssessment(v: LastAssessment) {
  last = v;
}
export function getLastAssessment(): LastAssessment | null {
  return last;
}
