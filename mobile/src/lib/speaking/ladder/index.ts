// Konusma merdiveni registry'si. Bir "track" = bir gramer konusu (norm_pattern)
// ve o konunun temalari. Yeni konu = yeni icerik dosyasi + buraya bir satir.
// Sira = ders kitabi sirasi (docs/FOCUS_LOCKED_RULES.md Bolum 2); bir konu ancak
// bir oncekinin tum temalari bitince acilir (kullanici karari: Present Simple
// oturmadan sonraki konuya gecilmez).
import { COUNTABLE_UNCOUNTABLE_THEMES } from './countable-uncountable';
import { GOING_TO_THEMES } from './going-to';
import { IF_TYPE1_THEMES } from './if-type1';
import { IF_TYPE2_THEMES } from './if-type2';
import { MUST_HAVE_TO_THEMES } from './must-have-to';
import { PASSIVE_THEMES } from './passive';
import { PAST_CONTINUOUS_THEMES } from './past-continuous';
import { PAST_SIMPLE_THEMES } from './past-simple';
import { PRESENT_CONTINUOUS_THEMES } from './present-continuous';
import { PRESENT_CONTINUOUS_FUTURE_THEMES } from './present-continuous-future';
import { PRESENT_PERFECT_THEMES } from './present-perfect';
import { PRESENT_PERFECT_CONTINUOUS_THEMES } from './present-perfect-continuous';
import { PRESENT_SIMPLE_THEMES } from './present-simple';
import { RELATIVE_CLAUSES_THEMES } from './relative-clauses';
import { USED_TO_THEMES } from './used-to';
import { WILL_THEMES } from './will';
import type { LadderSentence, LadderTheme } from './types';

export * from './types';

// id = ana norm_pattern; patterns = aktif odakla eslesen tum norm_pattern'lar.
export type LadderTrack = { id: string; patterns: string[]; title: string; subtitle: string; themes: LadderTheme[] };

export const LADDER_TRACKS: LadderTrack[] = [
  { id: 'present_simple', patterns: ['present_simple', 'adverb_frequency', 'stative_verbs', 'prepositions_time'], title: 'Present Simple ile konuş', subtitle: 'Alışkanlıklarını ve genel gerçekleri anlat.', themes: PRESENT_SIMPLE_THEMES },
  { id: 'present_continuous', patterns: ['present_continuous'], title: 'Present Continuous ile konuş', subtitle: 'Şu anda ve bu aralar olanları anlat.', themes: PRESENT_CONTINUOUS_THEMES },
  { id: 'simple_past', patterns: ['simple_past'], title: 'Past Simple ile konuş', subtitle: 'Geçmişte olup biten olayları anlat.', themes: PAST_SIMPLE_THEMES },
  { id: 'past_continuous_was_ving', patterns: ['past_continuous_was_ving'], title: 'Past Continuous ile konuş', subtitle: 'Bir olay olurken ne yaptığını anlat.', themes: PAST_CONTINUOUS_THEMES },
  { id: 'used_to', patterns: ['used_to'], title: 'Used to ile konuş', subtitle: 'Eskiden olan ama artık olmayan alışkanlıkları anlat.', themes: USED_TO_THEMES },
  { id: 'countable_uncountable', patterns: ['countable_uncountable', 'quantifier'], title: 'Much / Many ile konuş', subtitle: 'Miktar ve sayıyı doğru sözcükle söyle.', themes: COUNTABLE_UNCOUNTABLE_THEMES },
  { id: 'future_going_to', patterns: ['future_going_to'], title: 'Be going to ile konuş', subtitle: 'Planlarını ve belirtiye dayanan tahminlerini anlat.', themes: GOING_TO_THEMES },
  { id: 'future_will', patterns: ['future_will'], title: 'Will ile konuş', subtitle: 'Anlık karar, söz ve tahminlerini söyle.', themes: WILL_THEMES },
  { id: 'present_cont_future', patterns: ['present_cont_future'], title: 'Programını anlat', subtitle: 'Kesinleşmiş planları Present Continuous ile söyle.', themes: PRESENT_CONTINUOUS_FUTURE_THEMES },
  { id: 'present_perfect_have_v3', patterns: ['present_perfect_have_v3'], title: 'Present Perfect ile konuş', subtitle: 'Deneyimlerini ve yeni olanları anlat.', themes: PRESENT_PERFECT_THEMES },
  { id: 'present_perfect_cont', patterns: ['present_perfect_cont'], title: 'Present Perfect Continuous ile konuş', subtitle: 'Ne zamandır sürdüğünü anlat.', themes: PRESENT_PERFECT_CONTINUOUS_THEMES },
  { id: 'modal_obligation', patterns: ['modal_obligation'], title: 'Must / Have to ile konuş', subtitle: 'Kuralları ve zorunlulukları anlat.', themes: MUST_HAVE_TO_THEMES },
  { id: 'if_type1', patterns: ['if_type1', 'if_type0'], title: 'If (1. tip) ile konuş', subtitle: 'Olası koşulları ve sonuçlarını anlat.', themes: IF_TYPE1_THEMES },
  { id: 'if_past_would', patterns: ['if_past_would'], title: 'If (2. tip) ile konuş', subtitle: 'Hayali durumları anlat.', themes: IF_TYPE2_THEMES },
  { id: 'passive_voice', patterns: ['passive_voice'], title: 'Passive ile konuş', subtitle: 'İşi yapanı değil, yapılan işi öne çıkar.', themes: PASSIVE_THEMES },
  { id: 'relative_clause', patterns: ['relative_clause'], title: 'Who / Which / That ile konuş', subtitle: 'İnsanları, yerleri ve eşyaları tarif et.', themes: RELATIVE_CLAUSES_THEMES },
];

export function getLadderTheme(id: string | null | undefined): LadderTheme | null {
  if (!id) return null;
  for (const t of LADDER_TRACKS) {
    const hit = t.themes.find((x) => x.id === id);
    if (hit) return hit;
  }
  return null;
}

// Basamaklar (ekran sirasi). id'ler DB'de saklanir; Bosluk (3) ve Ipucu (4)
// kaldirildi (bosluk doldurma yerine dogrudan uretim) ama eski kayitlarla
// uyum icin id'ler degistirilmedi.
export const LADDER_STAGES = [
  { id: 1, label: 'Dinle', done: 'Dinleme tamam' },
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
  const st = LADDER_STAGES.find((s) => (byStage[s.id] ?? 0) < cap) ?? LADDER_STAGES[LADDER_STAGES.length - 1];
  return { label: `${g}. grup · ${st.label}`, frac };
}

// Tema bitti = tum cumleler Turkceden soylendi + zincir tam uzunlukta.
export function themeDone(theme: LadderTheme, byStage: Record<number, number>, chainLen: number): boolean {
  const n = theme.sentences.length;
  return (byStage[2] ?? 0) >= n && chainLen >= n;
}

type Summary = Record<string, { byStage: Record<number, number>; chainLen: number }>;

// Konu ilerlemesi: kac tema bitti.
export function trackProgress(track: LadderTrack, summary: Summary): { done: number; total: number } {
  const done = track.themes.filter((t) => {
    const s = summary[t.id];
    return s ? themeDone(t, s.byStage, s.chainLen) : false;
  }).length;
  return { done, total: track.themes.length };
}

// Konu kilidi: ilk konu hep acik; digerleri bir oncekinin tum temalari bitince acilir.
export function trackUnlocked(index: number, summary: Summary): boolean {
  if (index <= 0) return true;
  const prev = trackProgress(LADDER_TRACKS[index - 1], summary);
  return prev.done >= prev.total && trackUnlocked(index - 1, summary);
}
