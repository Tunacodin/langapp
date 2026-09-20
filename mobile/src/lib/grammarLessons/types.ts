// Gramer eğitim modülü SEED tipleri.
// Her gramer konusu (PAST_SIMPLE, PRESENT_PERFECT ...) bir "seed" dosyasıdır
// (grammarLessons/<konu>.ts) ve GrammarLesson tipine uyar. index.ts hepsini
// bir registry'de toplar. İçerik veriden ayrık: elle yazılmış, pedagojik ESL
// içeriği. Bir bölüm yoksa ilgili adım kilitli kalır (yalan "hazır" yok).

// Formul denklemindeki tek parca. Aralarina otomatik "+" konur.
// style: accent=mercan pill, neutral=gri pill, muted=duz gri metin, yoksa duz koyu metin.
export type FormulaToken = {
  text: string;
  style?: 'accent' | 'neutral' | 'muted';
};

// Her yapi (olumlu/olumsuz/soru) ayri bir STACKED kart olarak cizilir.
export type LessonStructure = {
  key: string; // 'positive' | 'negative' | 'question' | ...
  num: number; // 1/2/3 (kart numarasi)
  title: string; // "Olumlu Cümle Yapısı"
  subtitle: string; // ingilizce karsilik ("Affirmative")
  metaTag: string; // sag ust etiket
  formula: FormulaToken[]; // akan formul denklemi
  example: { text: string; highlight?: string[]; spoken: string; translation: string };
  tip?: string; // puf noktasi
  tipTone?: 'amber' | 'red'; // ipucu kutusu tonu (varsayilan amber)
};

export type VerbPair = { from: string; to: string; note?: string };

export type LessonQuiz = {
  prompt: string; // bosluk yeri {blank} ile isaretli
  blankAnswer: string; // dogru cevap (bosluga yazilir)
  translation?: string;
  spoken: string; // dogru cumlenin seslendirmesi
  options: { label: string; correct: boolean }[];
  explainCorrect: string;
  explainWrong: string;
};

// --- Adim 2: ornek cumleler ---
export type ExampleCard = {
  en: string; // cumle (yalin metin)
  highlight?: string[]; // kalinlastirilacak parca(lar)
  tr: string; // Turkce cevirisi
  badge: string; // fiil/kalip rozeti ("visit -> visited (+ed)")
  meta: string; // sag alt kucuk not ("Zaman: yesterday")
};
export type ExampleGroup = {
  title: string;
  tag: string;
  color: 'red' | 'teal'; // nokta + rozet rengi
  cards: ExampleCard[];
};
export type ExampleTab = {
  key: string;
  tabLabel: string;
  groups: ExampleGroup[];
};
export type LessonExamples = {
  minutes?: number;
  intro: string; // baslik alti aciklama
  tabs: ExampleTab[];
  quiz?: LessonQuiz; // hizli pekistirme testi
};

// --- Adim 3: video kesitleri + 4 asamali pratik ---
// Video + transkript GERCEK veriden (DB sahneleri) gelir; buradaki icerik
// yalnizca elle yazilan PRATIK asamalari ve ipucudur.
export type VideoPracticeGap = {
  kind: 'gap';
  instruction: string; // baslik ("Boşluk Doldurma · Fiil Çekimi")
  prompt: string; // {blank} isaretli cumle
  answer: string;
  options: string[]; // dogru cevabi da icerir
  feedback: string; // dogru olunca
};
export type VideoPracticeScramble = {
  kind: 'scramble';
  instruction: string;
  hint: string;
  blocks: string[]; // karisik siralı bloklar
  correct: string[]; // dogru sira
  feedback: string;
};
export type VideoPracticeError = {
  kind: 'error';
  instruction: string;
  before: string; // hatali kelimeden onceki metin
  wrong: string; // hatali kelime
  after: string; // sonraki metin
  options: { label: string; correct: boolean }[];
  feedback: string;
};
export type VideoPracticeStage = VideoPracticeGap | VideoPracticeScramble | VideoPracticeError;
export type LessonVideo = {
  minutes?: number;
  intro: string;
  practice: VideoPracticeStage[];
  tip?: { title: string; text: string };
};

// --- Adim 4: uzun okuma & baglam (kuratorlu hikaye) ---
export type ReadingTone = 'red' | 'teal' | 'green';
export type ReadingVerb = {
  base: string; // "decide" / "did not take"
  v2: string; // "decided" / "didn't take" (paragrafta gorunen bicim)
  type: string; // "Düzenli (+ed)" / "Düzensiz (V2)" / "Olumsuz Yapı"
  tr: string; // Turkce karsiligi
  tone: ReadingTone;
};
// Paragraf, duz metin parcalari ile tiklanabilir fiillerin karisimi.
export type ReadingSegment = string | { verb: ReadingVerb };
export type ReadingParagraph = {
  section: string; // "Bölüm I • Ayrılış"
  segments: ReadingSegment[];
  spoken: string; // seslendirme icin duz tam metin
};
export type ReadingQuiz = {
  question: string; // TR soru
  questionEn?: string; // ingilizce italik
  options: { label: string; correct: boolean }[];
  notice: string; // dogru cevap aciklamasi
};
export type LessonReading = {
  minutes?: number;
  storyTitle: string; // "The Unexpected Journey"
  intro: string;
  paragraphs: ReadingParagraph[];
  highlights?: { from: string; to: string; type: string; note: string; tone: ReadingTone }[];
  quiz?: ReadingQuiz;
  tip?: { title: string; text: string };
};

// --- Adim 5: cumle cumle ses kaydi (gercek telaffuz degerlendirmesi) ---
// Skor/kelime eslesmesi Azure ile GERCEK olcumdur (useSpeechAssessment); burada
// yalnizca HEDEF cumleler ve telaffuz ipuclari elle yazilir.
export type RecordSentence = {
  en: string; // hedef cumle
  label: string; // carousel kisa etiketi
  highlight?: string[]; // vurgulanacak fiil(ler)
  tr: string;
  tip?: string; // bu cumleye ozel telaffuz ipucu
};
export type LessonRecording = {
  minutes?: number;
  intro: string;
  sentences: RecordSentence[];
};

// --- Adim 6: unite sonu sinavi ---
export type ExamGap = {
  kind: 'gap';
  title: string;
  prompt: string; // {blank} isaretli
  answer: string;
  options: string[];
  feedback: string;
  rootHint?: string; // "Hedef fiil koku: [go]"
};
export type ExamErrorChoice = {
  kind: 'errorChoice';
  title: string;
  question: string;
  options: { label: string; note: string; correct: boolean }[]; // correct = HATALI cumle
};
export type ExamScramble = {
  kind: 'scramble';
  title: string;
  targetTr: string; // hedef Turkce cumle
  blocks: string[]; // karisik
  correct: string[]; // dogru sira
  feedback: string;
};
// Genel coktan secmeli (anlam / donusum / zaman zarfi ...).
export type ExamChoice = {
  kind: 'choice';
  title: string;
  question: string;
  options: { label: string; correct: boolean }[];
  explain: string;
};
export type ExamStage = ExamGap | ExamErrorChoice | ExamScramble | ExamChoice;
export type LessonExam = {
  minutes?: number;
  intro: string;
  passScore?: number; // gecme icin gereken dogru sayisi (varsayilan: soru sayisinin ~%60'i)
  stages: ExamStage[];
};

export type GrammarLesson = {
  minutes?: number; // tahmini sure
  summary: string; // giris paragrafi (konu mantigi)
  summaryStrong?: string; // paragraf icinde vurgulanacak kisim (opsiyonel)
  timeMarkers?: string[]; // zaman ipuclari cipleri
  structures?: LessonStructure[]; // sekmeli formul kartlari
  verbForms?: {
    regular?: { title: string; desc: string; items: VerbPair[]; formula?: string };
    irregular?: { title: string; desc: string; items: VerbPair[] };
    note?: string;
  };
  quiz?: LessonQuiz;
  examples?: LessonExamples; // Adim 2 icerigi
  video?: LessonVideo; // Adim 3 pratik icerigi (video+transkript gercek veriden)
  reading?: LessonReading; // Adim 4 icerigi
  recording?: LessonRecording; // Adim 5 hedef cumleleri
  exam?: LessonExam; // Adim 6 sinav sorulari
};
