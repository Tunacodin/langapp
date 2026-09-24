// UYARI: OTOMATIK URETILDI (scripts/gen_lesson_manifest.py). ELLE DUZENLEME.
// Ders basina STATIK varliklar: kelime zaman damgalari (words) + sozluk (glossary).
// Glossary yalniz LLM (Layer B) calisan derslerde vardir; digerleri icin yoktur (opsiyonel).

export type TWord = { w: string; start_ms: number; end_ms: number; lemma?: string; pos?: string };
export type Gloss = { pos: string; cefr: string; senses: string[] };

export const LESSON_WORDS: Record<string, TWord[]> = {
  aliabdaal_eve: require('../../assets/lessons/aliabdaal_eve.words.json'),
  aliabdaal_time: require('../../assets/lessons/aliabdaal_time.words.json'),
  bbc6min_food: require('../../assets/lessons/bbc6min_food.words.json'),
  damon_paris: require('../../assets/lessons/damon_paris.words.json'),
  davella_routine: require('../../assets/lessons/davella_routine.words.json'),
  davella_sugar: require('../../assets/lessons/davella_sugar.words.json'),
  easyeng_london: require('../../assets/lessons/easyeng_london.words.json'),
  fireship_ai: require('../../assets/lessons/fireship_ai.words.json'),
  foodreview_st: require('../../assets/lessons/foodreview_st.words.json'),
  foster_matchday: require('../../assets/lessons/foster_matchday.words.json'),
  hitc_risefall: require('../../assets/lessons/hitc_risefall.words.json'),
  kurzgesagt_lonely: require('../../assets/lessons/kurzgesagt_lonely.words.json'),
  learneng_tv: require('../../assets/lessons/learneng_tv.words.json'),
  lesson1: require('../../assets/lessons/lesson1.words.json'),
  mayuko_day: require('../../assets/lessons/mayuko_day.words.json'),
  mckinnon_day: require('../../assets/lessons/mckinnon_day.words.json'),
  mkbhd_ai: require('../../assets/lessons/mkbhd_ai.words.json'),
  ndrew_sleep: require('../../assets/lessons/ndrew_sleep.words.json'),
  neistat_count: require('../../assets/lessons/neistat_count.words.json'),
  neistat_vlog: require('../../assets/lessons/neistat_vlog.words.json'),
  oxford_self: require('../../assets/lessons/oxford_self.words.json'),
  schooloflife_career: require('../../assets/lessons/schooloflife_career.words.json'),
  skysports_micd: require('../../assets/lessons/skysports_micd.words.json'),
  techlead_day: require('../../assets/lessons/techlead_day.words.json'),
  ted_introvert: require('../../assets/lessons/ted_introvert.words.json'),
  ted_procrast: require('../../assets/lessons/ted_procrast.words.json'),
  ted_schools: require('../../assets/lessons/ted_schools.words.json'),
  tifo_clubs_money: require('../../assets/lessons/tifo_clubs_money.words.json'),
  vox_noise: require('../../assets/lessons/vox_noise.words.json'),
  wired_blockchain: require('../../assets/lessons/wired_blockchain.words.json'),
  yestheory_yes: require('../../assets/lessons/yestheory_yes.words.json'),
  zoella_vlog: require('../../assets/lessons/zoella_vlog.words.json'),
};

export const LESSON_GLOSSARY: Record<string, Record<string, Gloss>> = {
  easyeng_london: require('../../assets/lessons/easyeng_london.glossary.json'),
  fireship_ai: require('../../assets/lessons/fireship_ai.glossary.json'),
  lesson1: require('../../assets/lessons/lesson1.glossary.json'),
  mckinnon_day: require('../../assets/lessons/mckinnon_day.glossary.json'),
  tifo_clubs_money: require('../../assets/lessons/tifo_clubs_money.glossary.json'),
};
