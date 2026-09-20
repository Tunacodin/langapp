// Ders basina STATIK varliklar (kelime zaman damgalari + sozluk). Metro require
// statik olmali; yeni ders eklerken buraya iki satir ekle. Anahtar (id), db.ts
// LESSONS ve video.tsx VIDEO_MODULES ile AYNI olmali.

export type TWord = { w: string; start_ms: number; end_ms: number; lemma?: string; pos?: string };
export type Gloss = { pos: string; cefr: string; senses: string[] };

export const LESSON_WORDS: Record<string, TWord[]> = {
  lesson1: require('../../assets/lessons/lesson1.words.json'),
  fireship_ai: require('../../assets/lessons/fireship_ai.words.json'),
  mckinnon_day: require('../../assets/lessons/mckinnon_day.words.json'),
  tifo_clubs_money: require('../../assets/lessons/tifo_clubs_money.words.json'),
  easyeng_london: require('../../assets/lessons/easyeng_london.words.json'),
};

export const LESSON_GLOSSARY: Record<string, Record<string, Gloss>> = {
  lesson1: require('../../assets/lessons/lesson1.glossary.json'),
  fireship_ai: require('../../assets/lessons/fireship_ai.glossary.json'),
  mckinnon_day: require('../../assets/lessons/mckinnon_day.glossary.json'),
  tifo_clubs_money: require('../../assets/lessons/tifo_clubs_money.glossary.json'),
  easyeng_london: require('../../assets/lessons/easyeng_london.glossary.json'),
};
