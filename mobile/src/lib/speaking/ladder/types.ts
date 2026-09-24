import type { Ionicons } from '@expo/vector-icons';

// Konusma merdiveni icerik tipleri. Bir tema = bir konuda art arda anlatilan
// cumleler (konusma akisi). alts: Turkceden soylerken de kabul edilen en fazla 2
// alternatif (cogu cumlede yok).
export type LadderSentence = { key: string; en: string; tr: string; alts?: string[] };
export type LadderTheme = {
  id: string;
  title: string; // Turkce tema adi
  icon: keyof typeof Ionicons.glyphMap;
  sentences: LadderSentence[];
};
