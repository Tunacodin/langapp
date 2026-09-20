import { LESSON_WORDS, type TWord } from './lessonAssets';

export type { TWord };

// Bir cumlenin kelimeleri (o derse ait). Sinir = cumle baslangiclari; kelime ORTA
// NOKTASINA gore tek bir cumleye ait olur (baslangic damgalari birebir tutmadigi
// icin +/-tolerans yerine bu kesin bolme kullanilir; kelime iki karta birden sizmaz).
// nextStartMs = bir sonraki cumlenin start_ms'i; son cumlede null.
export function getSentenceWords(
  mediaId: string,
  startMs: number,
  nextStartMs: number | null,
): TWord[] {
  const all = LESSON_WORDS[mediaId] ?? [];
  return all.filter((w) => {
    const mid = (w.start_ms + w.end_ms) / 2;
    return mid >= startMs && (nextStartMs == null || mid < nextStartMs);
  });
}
