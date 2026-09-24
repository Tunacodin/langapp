// Konusma merdiveni registry'si. Bir "track" = bir gramer konusu (norm_pattern)
// ve o konunun temalari. Yeni konu = yeni icerik dosyasi + buraya bir satir.
import { PRESENT_SIMPLE_THEMES } from './present-simple';
import type { LadderSentence, LadderTheme } from './types';

export * from './types';

export type LadderTrack = { id: string; title: string; subtitle: string; themes: LadderTheme[] };

export const LADDER_TRACKS: LadderTrack[] = [
  {
    id: 'present_simple',
    title: 'Present Simple ile konuş',
    subtitle: 'Her tema 4 cümlelik gruplarla ilerler: dinle, boşluklu söyle, ilk harflerle söyle, Türkçesinden söyle. Sonra hepsini art arda anlat.',
    themes: PRESENT_SIMPLE_THEMES,
  },
];

export function getLadderTheme(id: string | null | undefined): LadderTheme | null {
  if (!id) return null;
  for (const t of LADDER_TRACKS) {
    const hit = t.themes.find((x) => x.id === id);
    if (hit) return hit;
  }
  return null;
}

// Basamaklar (ekran sirasi). id'ler DB'de saklanir: 2 Turkceden sonradan en sona
// alindi; eski kayitlar bozulmasin diye id degil sira degisti.
export const LADDER_STAGES = [
  { id: 1, label: 'Dinle', done: 'Dinleme tamam' },
  { id: 3, label: 'Boşluk', done: 'Boşluklu söyleme tamam' },
  { id: 4, label: 'İpucu', done: 'İlk harflerle söyleme tamam' },
  { id: 2, label: 'Türkçe', done: 'Türkçeden söyleme tamam' },
] as const;
export type LadderStageId = (typeof LADDER_STAGES)[number]['id'];

// Tema 4'er cumlelik gruplara bolunur; bir grup tum basamaklari bitirmeden
// sonraki grup acilmaz. Zincir, bitmis gruplarin cumleleriyle buyur.
export const SET_SIZE = 4;
export function ladderSets(theme: LadderTheme): LadderSentence[][] {
  const out: LadderSentence[][] = [];
  for (let i = 0; i < theme.sentences.length; i += SET_SIZE) out.push(theme.sentences.slice(i, i + SET_SIZE));
  return out;
}

// Sekme listesi icin ozet etiket + ilerleme orani (sayimlardan; gruplar sirali bittigi icin yeterli).
export function ladderStep(theme: LadderTheme, byStage: Record<number, number>, chainLen: number) {
  const n = theme.sentences.length;
  const sets = Math.ceil(n / SET_SIZE);
  const turkce = byStage[2] ?? 0;
  const total = LADDER_STAGES.reduce((a, s) => a + (byStage[s.id] ?? 0), 0) + Math.min(chainLen, n);
  const frac = total / (n * (LADDER_STAGES.length + 1));
  if (turkce >= n) return { label: chainLen >= n ? 'Tamamlandı' : `Zincir ${Math.max(chainLen, 3)}/${n}`, frac };
  const g = Math.min(sets, Math.floor(turkce / SET_SIZE) + 1);
  const cap = Math.min(n, g * SET_SIZE);
  const st = LADDER_STAGES.find((s) => (byStage[s.id] ?? 0) < cap) ?? LADDER_STAGES[3];
  return { label: `${g}. grup · ${st.label}`, frac };
}
