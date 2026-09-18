import words from '../../assets/lessons/lesson1.words.json';

export type TWord = { w: string; start_ms: number; end_ms: number };

const ALL = words as TWord[];

// Bir cumlenin kelimeleri. Sinir = cumle baslangiclari; kelime, ORTA NOKTASINA gore
// tek bir cumleye ait olur (baslangic damgalari birebir tutmadigi icin +/-tolerans
// yerine bu kesin bolme kullanilir; boylece kelime iki karta birden sizmaz).
// nextStartMs = bir sonraki cumlenin start_ms'i; son cumlede null.
export function getSentenceWords(startMs: number, nextStartMs: number | null): TWord[] {
  return ALL.filter((w) => {
    const mid = (w.start_ms + w.end_ms) / 2;
    return mid >= startMs && (nextStartMs == null || mid < nextStartMs);
  });
}
