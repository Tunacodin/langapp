import type { Ionicons } from '@expo/vector-icons';

// Konusma merdiveni icerik tipleri. Kurallar: docs/SPEAKING_RULES.md.
// alts: ayni ipucundan dogal olarak cikabilen en fazla 2 alternatif. cue: Turkce
// basamaginda gosterilen ciplak kavram ipucu (Ingilizce kelime sirasinda); yoksa
// tam Turkce cumleye (tr) dusulur.
export type LadderSentence = { key: string; en: string; tr: string; alts?: string[]; cue?: string };

// Seviye: ayni fiilin bir kullanim bicimi (olumlu / olumsuz / soru / baglac / uzun).
// bank: siklik kelimeleri listesi. show = bastan acik, onError = ilk hatada acilir.
export type LadderLevel = {
  id: string;
  title: string;
  note?: string;
  bank: 'show' | 'onError' | 'none';
  sentences: LadderSentence[];
};

export type LadderTheme = {
  id: string;
  title: string; // Turkce tema adi
  icon: keyof typeof Ionicons.glyphMap;
  sentences: LadderSentence[]; // tum cumleler (seviyeli temada seviyelerden duzlestirilir)
  levels?: LadderLevel[];
};

// Seviyeli rutin temasi kurar; sentences = seviyelerin sirali birlesimi.
export function routine(t: Omit<LadderTheme, 'sentences'> & { levels: LadderLevel[] }): LadderTheme {
  return { ...t, sentences: t.levels.flatMap((l) => l.sentences) };
}

// Seviyesiz eski temalar tek seviye gibi davranir.
export function themeLevels(t: LadderTheme): LadderLevel[] {
  return t.levels ?? [{ id: 'all', title: t.title, bank: 'none', sentences: t.sentences }];
}
