import { azure } from './azure';

export type WordScore = {
  word: string;
  accuracy: number;
  errorType: string; // None | Mispronunciation | Omission | Insertion
};

export type PronunciationResult = {
  accuracy: number; // sesleri ne kadar dogru cikardin (soyledigin kelimeler icin)
  fluency: number; // akicilik
  matchPct: number; // HEDEF cumleyle kelime eslesmesi (biz hesapliyoruz)
  pron: number; // genel telaffuz puani
  recognized: string; // Azure'un serbest tanima ile duydugu GERCEK metin
  words: WordScore[];
};

// Hedef cumle ile gercekten soylenen (tanina) metin arasindaki kelime eslesmesi (%).
function normWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z' ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
function computeMatch(target: string, said: string): number {
  const t = normWords(target);
  if (!t.length) return 0;
  const pool = normWords(said);
  const used = new Array(pool.length).fill(false);
  let hit = 0;
  for (const w of t) {
    const i = pool.findIndex((p, idx) => !used[idx] && p === w);
    if (i >= 0) {
      used[i] = true;
      hit++;
    }
  }
  return Math.round((100 * hit) / t.length);
}

// Kucuk ASCII base64 kodlayici (Pronunciation-Assessment basligi base64 JSON ister).
function base64Ascii(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < input.length; i += 3) {
    const a = input.charCodeAt(i);
    const b = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    const c = i + 2 < input.length ? input.charCodeAt(i + 2) : 0;
    out += chars[a >> 2];
    out += chars[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < input.length ? chars[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < input.length ? chars[c & 63] : '=';
  }
  return out;
}

// Kaydedilen WAV dosyasini Azure'a gonderip telaffuz puanini alir.
export async function assessPronunciation(
  uri: string,
  referenceText: string,
): Promise<PronunciationResult> {
  if (!azure.configured || !azure.sttEndpoint) {
    throw new Error('Azure ayarli degil (.env eksik).');
  }

  // UNSCRIPTED (serbest) tanima: ReferenceText BOS. Boylece Azure ne dediysen ONU yazar,
  // referansa zorlamaz. "Dogru cumleyi soyledin mi"yi biz computeMatch ile olceriz.
  const paramsJson = JSON.stringify({
    ReferenceText: '',
    GradingSystem: 'HundredMark',
    Granularity: 'Word',
    Dimension: 'Comprehensive',
  });

  const audioBlob = await (await fetch(uri)).blob();

  const res = await fetch(`${azure.sttEndpoint}?language=en-US`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': azure.key as string,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      'Pronunciation-Assessment': base64Ascii(paramsJson),
      Accept: 'application/json',
    },
    body: audioBlob,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Azure ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = await res.json();

  if (data?.RecognitionStatus !== 'Success' || !data?.NBest?.length) {
    throw new Error('Ses anlasilamadi, tekrar dene.');
  }

  const nb = data.NBest[0];
  // Azure skorlari bazen nb.PronunciationAssessment altinda, bazen dogrudan nb
  // uzerinde gelir. Ikisini de destekle.
  const pa = nb.PronunciationAssessment ?? nb;
  const words: WordScore[] = (nb.Words ?? []).map((w: any) => {
    const wpa = w.PronunciationAssessment ?? w;
    return {
      word: w.Word,
      accuracy: Math.round(wpa.AccuracyScore ?? 0),
      errorType: wpa.ErrorType ?? 'None',
    };
  });

  const recognized = data.DisplayText ?? '';
  return {
    accuracy: Math.round(pa.AccuracyScore ?? 0),
    fluency: Math.round(pa.FluencyScore ?? 0),
    matchPct: computeMatch(referenceText, nb.Lexical ?? recognized),
    pron: Math.round(pa.PronScore ?? 0),
    recognized,
    words,
  };
}
