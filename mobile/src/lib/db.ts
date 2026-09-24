import * as SQLite from 'expo-sqlite';

import { ALL_LESSONS, UNIT_BY_MEDIA } from './lessonManifest';
import globalLexicon from '../../assets/lessons/_lexicon.json';
import globalExamples from '../../assets/lessons/_examples.json';
import articlesSeed from '../../assets/articles/_articles.json';
import { LESSON_GLOSSARY, LESSON_WORDS } from './lessonAssets';
import { getTopic, GRAMMAR_TOPICS } from './grammar';
import { emptyCard, rate } from './srs';
import type { Grade } from 'ts-fsrs';

// ---------------------------------------------------------------------------
// Gramer konu sozlugu (KAPALI ENUM). Tek kaynak: assets/grammar/topics.json
// (src/lib/grammar.ts uzerinden yuklenir; scripts/grammar_topics.py ayni JSON'u
// okur). 4 ana kategori: Tenses & Aspects / Modals & Modal Perfects /
// Conditionals & Wish / Subordinate Clauses. norm_pattern SERBEST metin degil;
// tespit hatti (A regex + B LLM) yalniz bu kumeden bir deger uretebilir.
// ---------------------------------------------------------------------------
const GRAMMAR_PATTERN_SET = new Set(GRAMMAR_TOPICS.map((t) => t.norm_pattern));

// ---------------------------------------------------------------------------
// Kelime anlam-alani (tema) sozlugu (KAPALI ENUM). scripts/vocab_domains.py ile
// BIREBIR AYNIDIR (tek kaynak). Her icerik kokune (lemma) TAM BIR tema atanir.
// UI: ikon + tonlu renk. GENERAL = somut temaya girmeyen soyut/islev kelimeleri.
// ---------------------------------------------------------------------------
export type VocabDomain = {
  key: string;
  label_tr: string;
  icon: string; // Ionicons adi
};

export const VOCAB_DOMAINS: VocabDomain[] = [
  { key: 'GREETINGS', label_tr: 'Selamlaşma & Nezaket', icon: 'hand-left-outline' },
  { key: 'SOCIAL', label_tr: 'Sosyal & İlişkiler', icon: 'people-outline' },
  { key: 'EMOTIONS', label_tr: 'Duygular & Karakter', icon: 'happy-outline' },
  { key: 'HEALTH', label_tr: 'Sağlık & Beden', icon: 'fitness-outline' },
  { key: 'BUSINESS', label_tr: 'İş & Kariyer', icon: 'briefcase-outline' },
  { key: 'FINANCE', label_tr: 'Para & Ekonomi', icon: 'cash-outline' },
  { key: 'TECH', label_tr: 'Teknoloji & Yazılım', icon: 'hardware-chip-outline' },
  { key: 'MEDIA', label_tr: 'Medya & İletişim', icon: 'chatbubbles-outline' },
  { key: 'FOOD', label_tr: 'Yemek & İçecek', icon: 'restaurant-outline' },
  { key: 'TRAVEL', label_tr: 'Seyahat & Yer', icon: 'airplane-outline' },
  { key: 'HOME', label_tr: 'Ev & Günlük Yaşam', icon: 'home-outline' },
  { key: 'SPORTS', label_tr: 'Spor & Rekabet', icon: 'football-outline' },
  { key: 'NATURE', label_tr: 'Doğa & Çevre', icon: 'leaf-outline' },
  { key: 'EDUCATION', label_tr: 'Eğitim & Öğrenme', icon: 'school-outline' },
  { key: 'ARTS', label_tr: 'Sanat & Eğlence', icon: 'color-palette-outline' },
  { key: 'GENERAL', label_tr: 'Genel & Soyut', icon: 'ellipsis-horizontal-outline' },
];

// ---------------------------------------------------------------------------
// DERS MUFREDATI (KAPALI ENUM). Uluslararasi coursebook yapisi: 8 tematik unite.
// Her unite, sahip oldugu GRAMER hedefleri (norm_pattern) + KELIME temalari
// (VOCAB_DOMAINS) uzerinden GERCEK icerigi ceker (mercek mantigi, klasor degil).
// grammarTargets = ders kitabindaki tam hedef (gosterim); grammar[] = su an
// enum'da VAR OLAN ve baglanabilen norm_pattern'lar (bazi uniteler kismen bos).
// reading/listening: makale/video elle unite ile etiketlenir (UNIT_BY_*).
// ---------------------------------------------------------------------------
export type CourseUnit = {
  no: number;
  title_en: string;
  title_tr: string;
  theme_tr: string;
  icon: string; // Ionicons adi
  cefr: string;
  grammarTargets: string; // ders kitabi grameri (tam hedef, gosterim)
  grammar: string[]; // enum'da mevcut baglanabilir norm_pattern'lar
  domains: string[]; // VOCAB_DOMAINS anahtarlari
  writing_tr: string; // yazma gorevi (talimat)
};

export const COURSE_UNITS: CourseUnit[] = [
  {
    no: 1,
    title_en: 'Personal Identity & Relationships',
    title_tr: 'Kimlik & İlişkiler',
    theme_tr: 'Kendini tanıtma, aile, arkadaşlık, kişilik',
    icon: 'people-circle-outline',
    cefr: 'A2',
    grammarTargets: 'Present Simple & Continuous, Stative Verbs',
    grammar: ['present_simple', 'present_continuous'],
    domains: ['SOCIAL', 'GREETINGS', 'EMOTIONS'],
    writing_tr: 'Kısa bir kişisel profil ya da tanışma e-postası yaz.',
  },
  {
    no: 2,
    title_en: 'Daily Life, Routines & Habits',
    title_tr: 'Günlük Yaşam & Alışkanlıklar',
    theme_tr: 'Rutinler, iş-yaşam dengesi, serbest zaman',
    icon: 'time-outline',
    cefr: 'A2',
    grammarTargets: 'Adverbs of Frequency, Prepositions of Time',
    grammar: ['adverb_frequency'],
    domains: ['HOME'],
    writing_tr: 'Tipik bir gününü ya da bir alışkanlığını anlat.',
  },
  {
    no: 3,
    title_en: 'Travel, Culture & Exploration',
    title_tr: 'Seyahat & Kültür',
    theme_tr: 'Tatil, seyahat deneyimleri, kültürler, yön tarifi',
    icon: 'airplane-outline',
    cefr: 'A2',
    grammarTargets: 'Past Simple vs. Past Continuous, used to',
    grammar: ['simple_past', 'past_continuous_was_ving', 'used_to'],
    domains: ['TRAVEL'],
    writing_tr: 'Bir seyahat blog yazısı ya da kartpostal yaz.',
  },
  {
    no: 4,
    title_en: 'Food, Dining & Health',
    title_tr: 'Beslenme & Sağlık',
    theme_tr: 'Yemek kültürü, restoranlar, sağlıklı yaşam',
    icon: 'restaurant-outline',
    cefr: 'A2',
    grammarTargets: 'Countable/Uncountable, Quantifiers',
    grammar: ['quantifier'],
    domains: ['FOOD', 'HEALTH'],
    writing_tr: 'Bir restoran değerlendirmesi yaz.',
  },
  {
    no: 5,
    title_en: 'Work, Career & Ambition',
    title_tr: 'Kariyer & Gelecek',
    theme_tr: 'Meslekler, iş görüşmeleri, gelecek planları',
    icon: 'briefcase-outline',
    cefr: 'B1',
    grammarTargets: 'Future Forms (will / be going to)',
    grammar: ['future_will', 'future_going_to'],
    domains: ['BUSINESS', 'FINANCE'],
    writing_tr: 'Kısa bir ön yazı (cover letter) ya da hedef metni yaz.',
  },
  {
    no: 6,
    title_en: 'Technology, Media & Innovation',
    title_tr: 'Teknoloji & Medya',
    theme_tr: 'Dijital dünya, sosyal medya, yapay zeka',
    icon: 'hardware-chip-outline',
    cefr: 'B1',
    grammarTargets: 'Present Perfect Simple vs. Continuous',
    grammar: ['present_perfect_have_v3'],
    domains: ['TECH', 'MEDIA'],
    writing_tr: 'Ekran süresi üzerine bir görüş yazısı yaz.',
  },
  {
    no: 7,
    title_en: 'Environment, Nature & Climate',
    title_tr: 'Çevre & Doğa',
    theme_tr: 'İklim, geri dönüşüm, çevre koruma',
    icon: 'leaf-outline',
    cefr: 'B1',
    grammarTargets: 'Conditionals (Type 1 & 2), Modals of Obligation',
    grammar: ['if_type1', 'if_past_would', 'modal_v1'],
    domains: ['NATURE'],
    writing_tr: 'Sorun-çözüm (problem-solution) yazısı yaz.',
  },
  {
    no: 8,
    title_en: 'Arts, Entertainment & Leisure',
    title_tr: 'Sanat & Eğlence',
    theme_tr: 'Sinema, müzik, kitap, kültürel etkinlikler',
    icon: 'color-palette-outline',
    cefr: 'B1',
    grammarTargets: 'Passive Voice, Relative Clauses',
    grammar: ['passive_voice', 'relative_clause', 'noun_clause_wh', 'embedded_wh_question'],
    domains: ['ARTS'],
    writing_tr: 'Bir film ya da kitap değerlendirmesi yaz.',
  },
];

// UNIT_BY_MEDIA artik lessonManifest'ten gelir (sources.json unite alanindan uretilir).
const UNIT_BY_ARTICLE: Record<string, number> = {
  art_small_habits: 2,
  art_first_users: 5,
  art_why_sleep: 4,
};

// ---------------------------------------------------------------------------
// Ders JSON tipleri (cikarim/pipeline ciktisi). Yeni alanlar OPSIYONEL: eski
// sekilli lesson1.json da calisir (fallback ile lexicon/occurrence uretilir).
// ---------------------------------------------------------------------------
export type LessonChunk = {
  text_en: string;
  text_tr: string;
  type: string; // collocation | phrasal_verb | idiom | expression | pattern | connector
  cefr: string;
};
export type LessonGrammar = {
  pattern: string;
  note_tr: string;
  cefr: string;
  norm_pattern?: string | null; // GRAMMAR_TOPICS enum'undan; yoksa serbest metin kalir
  span_start?: number | null; // text_en icinde kalibin baslangic karakteri
  span_end?: number | null;
};
export type LessonVocab = { word: string; text_tr: string; pos: string; cefr: string };

// Yeni sekil: sozluklesmis kok + anlam ayrimi.
export type LessonSense = { sense_idx: number; gloss_tr: string };
export type LessonLexeme = {
  lemma: string;
  pos: string;
  cefr: string;
  domain?: string | null; // VOCAB_DOMAINS temasi; yoksa null
  senses: LessonSense[];
};
export type LessonOccurrence = {
  surface: string; // ekranda gecen sozcuk (temizlenmis kucuk harf)
  lemma: string; // lexicon kokune baglar
  pos?: string; // global sozlukte (lemma,pos) cifti icin gerekli
  sense_idx: number | null; // o baglamdaki anlam; belirsizse null (WSD kesin degil)
  start_ms: number;
  end_ms: number;
};

export type LessonSentence = {
  idx: number;
  start_ms: number;
  end_ms: number;
  text_en: string;
  text_tr: string;
  cefr: string;
  category?: string | null; // shadowing paketi (slug), or. 'greetings'
  category_group?: string | null; // paket bolumu (slug), or. 'daily'
  chunks: LessonChunk[];
  grammar: LessonGrammar[];
  vocab?: LessonVocab[]; // eski alan; artik occurrences tercih edilir
  occurrences?: LessonOccurrence[]; // yeni alan
};
export type Lesson = {
  video_id: string;
  title: string;
  license: string;
  cefr: string;
  topic?: string | null; // konu (software/daily/football...) - filtre icin
  video_url?: string | null; // uzak video adresi (CDN/depolama). Yoksa gomulu (require) fallback.
  lexicon?: LessonLexeme[]; // yeni: derse ait tekil kokler
  sentences: LessonSentence[];
};

// Tum dersler manifest'ten (assets/lessons taranarak uretilir). Yeni ders eklemek =
// python scripts/gen_lesson_manifest.py + SEED_VERSION artir.
const LESSONS: Lesson[] = ALL_LESSONS;

const db = SQLite.openDatabaseSync('cogni3.db');

// Ders verisi/semasi degistiginde artir; seed otomatik tazelenir (SRS korunur).
// 17: tum dersler manifest'ten seed'e girdi (5 -> 30+).
// 18: article_patterns (okuma odak suzme) eklendi.
// 19: Simple Wikipedia'dan 10 otomatik okuma makalesi eklendi (ingest_reading.py).
// 20: zayif odaklar icin curated ornek cumle dersleri (96 cumle, 8 konu).
// 21: tum video cumlelerine Turkce ceviri (fill_tr_gtx.py) + yanlis gramer etiketi temizligi.
const SEED_VERSION = '21';

// ---------------------------------------------------------------------------
// Sema
// ---------------------------------------------------------------------------
export function initSchema() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY NOT NULL,
      youtube_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      license TEXT,
      cefr TEXT,
      video_url TEXT,
      topic TEXT
    );
    CREATE TABLE IF NOT EXISTS sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      start_ms INTEGER NOT NULL,
      end_ms INTEGER NOT NULL,
      text_en TEXT NOT NULL,
      text_tr TEXT,
      cefr TEXT,
      category TEXT,
      category_group TEXT,
      UNIQUE (media_id, idx),
      FOREIGN KEY (media_id) REFERENCES media_items (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id TEXT NOT NULL,
      sentence_idx INTEGER NOT NULL,
      text_en TEXT NOT NULL,
      text_tr TEXT,
      type TEXT,
      cefr TEXT
    );

    -- Gramer konu sozlugu (KAPALI ENUM).
    CREATE TABLE IF NOT EXISTS grammar_topics (
      norm_pattern TEXT PRIMARY KEY NOT NULL,
      category TEXT NOT NULL,
      label_tr TEXT NOT NULL,
      cefr TEXT,
      layer TEXT,
      formula TEXT
    );

    -- Cumledeki gramer tespitleri. norm_pattern -> grammar_topics; span, text_en
    -- icinde kalibin karakter araligi (vurgulama icin).
    CREATE TABLE IF NOT EXISTS grammar_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id TEXT NOT NULL,
      sentence_idx INTEGER NOT NULL,
      pattern TEXT NOT NULL,
      note_tr TEXT,
      cefr TEXT,
      norm_pattern TEXT,
      span_start INTEGER,
      span_end INTEGER
    );

    -- SOZLUK MIMARISI: kok tekil, anlamlar koke bagli, gecisler koke+anlama baglanir.
    CREATE TABLE IF NOT EXISTS lexicon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lemma TEXT NOT NULL,
      pos TEXT,
      cefr TEXT,
      domain TEXT,
      UNIQUE (lemma, pos)
    );
    CREATE TABLE IF NOT EXISTS senses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lexicon_id INTEGER NOT NULL,
      sense_idx INTEGER NOT NULL,
      gloss_tr TEXT NOT NULL,
      UNIQUE (lexicon_id, sense_idx),
      FOREIGN KEY (lexicon_id) REFERENCES lexicon (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS word_occurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id TEXT NOT NULL,
      sentence_idx INTEGER NOT NULL,
      surface TEXT NOT NULL,     -- temizlenmis kucuk harf (arama icin)
      lexicon_id INTEGER,
      sense_id INTEGER,          -- o baglamdaki anlam; belirsizse NULL
      start_ms INTEGER,
      end_ms INTEGER,
      FOREIGN KEY (lexicon_id) REFERENCES lexicon (id) ON DELETE SET NULL,
      FOREIGN KEY (sense_id) REFERENCES senses (id) ON DELETE SET NULL
    );

    -- Ornek kullanimlar (transfer): bir ogenin (kelime/chunk/gramer) BASKA
    -- baglamlardaki ornek cumleleri. owner_key -> lexeme: 'lemma|pos',
    -- chunk: text_en, grammar: norm_pattern. build_corpus (Layer B) uretir.
    CREATE TABLE IF NOT EXISTS examples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_type TEXT NOT NULL,   -- 'lexeme' | 'chunk' | 'grammar'
      owner_key TEXT NOT NULL,
      text_en TEXT NOT NULL,
      text_tr TEXT,
      cefr TEXT
    );

    -- FSRS kartlari. Kelime karti benzersizligi ARTIK occurrence seviyesinde:
    -- (media_id, sentence_idx, lexicon_id). Diger kartlar (front_type,front_en).
    -- Kisitlar kismi (partial) UNIQUE index ile (asagida) kurulur; tablo-ici
    -- UNIQUE YOK (eski sema onu iceriyorsa ensureColumns yeniden kurar).
    -- source: kartin hangi ana bolumden ELLE kaydedildigi (Tekrar gruplamasi icin):
    -- 'vocab' | 'grammar' | 'shadow' | 'article' | 'watch'. NULL = eski/otomatik
    -- veri (Tekrar havuzunda gorunmez). Otomatik enroll YOK; yalniz kullanici ekler.
    CREATE TABLE IF NOT EXISTS srs_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      front_type TEXT NOT NULL,
      front_en TEXT NOT NULL,
      back_tr TEXT,
      media_id TEXT,
      sentence_idx INTEGER,
      lexicon_id INTEGER,
      source TEXT,
      card_json TEXT,
      due_ms INTEGER,
      stability REAL DEFAULT 0,
      difficulty REAL DEFAULT 0,
      state INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Shadowing ilerlemesi: her cumle icin en iyi telaffuz skoru + deneme sayisi.
    -- done = best_score >= SHADOW_DONE. Kutuphanedeki ilerleme cubuklari buradan
    -- GERCEK veriyle hesaplanir (uydurma yuzde yok).
    CREATE TABLE IF NOT EXISTS shadow_progress (
      media_id TEXT NOT NULL,
      sent_idx INTEGER NOT NULL,
      best_score INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (media_id, sent_idx)
    );

    -- Izleme ilerlemesi (Continue Watching): oynatici kaldigi konumu kaydeder.
    -- İzle ana ekranindaki "Kaldigin yerden izle" karti bu GERCEK veriyle dolar
    -- (uydurma yuzde yok). Kullanici verisi: seed tazelemede SILINMEZ.
    CREATE TABLE IF NOT EXISTS watch_progress (
      media_id TEXT PRIMARY KEY NOT NULL,
      position_ms INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    );

    -- Okuma metinleri (Kesfet 'Oku' bolumu). word_count/read_minutes seed aninda
    -- metinden TURETILIR (uydurma degil). Ilerde makale pipeline'i doldurur.
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      source TEXT,
      cefr TEXT,
      topic TEXT,
      body_en TEXT NOT NULL,
      body_tr TEXT,
      word_count INTEGER NOT NULL DEFAULT 0,
      read_minutes INTEGER NOT NULL DEFAULT 0,
      image_url TEXT
    );

    -- Okuma metnindeki gramer yapilari (norm_pattern). Okuma sekmesi aktif odaga
    -- gore metin suzer: WHERE norm_pattern = aktif_odak. Layer-A (tag_reading.py) uretir.
    CREATE TABLE IF NOT EXISTS article_patterns (
      article_id TEXT NOT NULL,
      norm_pattern TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_article_patterns ON article_patterns (norm_pattern);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_article_patterns ON article_patterns (article_id, norm_pattern);

    -- Konusma pratigi kayitlari (KULLANICI VERISI, seed tazelemede SILINMEZ).
    -- Her satir bir "take": bir odak varyasyonu icin ses (+ opsiyonel video) kaydi.
    -- audio/video_uri = FileSystem yolu (yalnizca yerel; buluta gitmez).
    CREATE TABLE IF NOT EXISTS speaking_takes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      focus_id TEXT NOT NULL,
      variation_key TEXT NOT NULL,
      text_en TEXT NOT NULL,
      audio_uri TEXT,
      video_uri TEXT,
      score INTEGER,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS ix_speaking_focus ON speaking_takes (focus_id, created_at);

    CREATE INDEX IF NOT EXISTS ix_occ_surface ON word_occurrences (surface);
    CREATE INDEX IF NOT EXISTS ix_occ_sentence ON word_occurrences (media_id, sentence_idx);
    CREATE INDEX IF NOT EXISTS ix_examples_owner ON examples (owner_type, owner_key);
  `);

  ensureColumns();

  // Kismi benzersizlik: kelime karti occurrence bazinda, digerleri metin bazinda.
  db.execSync(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_srs_vocab
      ON srs_cards (media_id, sentence_idx, lexicon_id) WHERE front_type = 'vocab';
    CREATE UNIQUE INDEX IF NOT EXISTS ux_srs_other
      ON srs_cards (front_type, front_en) WHERE front_type <> 'vocab';
  `);
}

// Eski kurulumlari guvenli goc et.
function ensureColumns() {
  // media_items: uzak video adresi + konu (filtre icin).
  const mi = db.getAllSync<{ name: string }>(`PRAGMA table_info(media_items)`).map((c) => c.name);
  if (!mi.includes('video_url')) db.execSync(`ALTER TABLE media_items ADD COLUMN video_url TEXT`);
  if (!mi.includes('topic')) db.execSync(`ALTER TABLE media_items ADD COLUMN topic TEXT`);

  // sentences: shadowing paketi (kategori) + bolumu.
  const se = db.getAllSync<{ name: string }>(`PRAGMA table_info(sentences)`).map((c) => c.name);
  if (!se.includes('category')) db.execSync(`ALTER TABLE sentences ADD COLUMN category TEXT`);
  if (!se.includes('category_group')) db.execSync(`ALTER TABLE sentences ADD COLUMN category_group TEXT`);

  // lexicon: kelime temasi (VOCAB_DOMAINS).
  const lx = db.getAllSync<{ name: string }>(`PRAGMA table_info(lexicon)`).map((c) => c.name);
  if (!lx.includes('domain')) db.execSync(`ALTER TABLE lexicon ADD COLUMN domain TEXT`);

  // grammar_topics: kural formulu (kart uzerinde gosterim).
  const gt = db.getAllSync<{ name: string }>(`PRAGMA table_info(grammar_topics)`).map((c) => c.name);
  if (!gt.includes('formula')) db.execSync(`ALTER TABLE grammar_topics ADD COLUMN formula TEXT`);

  // grammar_patterns: yeni sutunlar.
  const gp = db.getAllSync<{ name: string }>(`PRAGMA table_info(grammar_patterns)`).map((c) => c.name);
  if (!gp.includes('norm_pattern')) db.execSync(`ALTER TABLE grammar_patterns ADD COLUMN norm_pattern TEXT`);
  if (!gp.includes('span_start')) db.execSync(`ALTER TABLE grammar_patterns ADD COLUMN span_start INTEGER`);
  if (!gp.includes('span_end')) db.execSync(`ALTER TABLE grammar_patterns ADD COLUMN span_end INTEGER`);

  // srs_cards: eski sema tablo-ici UNIQUE(front_type,front_en) ve lexicon_id yok.
  // lexicon_id eksikse tabloyu yeniden kur (veri kaybi olmadan) ve eski UNIQUE'i at.
  const sc = db.getAllSync<{ name: string }>(`PRAGMA table_info(srs_cards)`).map((c) => c.name);
  if (!sc.includes('lexicon_id')) {
    db.execSync(`
      ALTER TABLE srs_cards RENAME TO srs_cards_old;
      CREATE TABLE srs_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        front_type TEXT NOT NULL,
        front_en TEXT NOT NULL,
        back_tr TEXT,
        media_id TEXT,
        sentence_idx INTEGER,
        lexicon_id INTEGER,
        card_json TEXT,
        due_ms INTEGER,
        stability REAL DEFAULT 0,
        difficulty REAL DEFAULT 0,
        state INTEGER DEFAULT 0,
        reps INTEGER DEFAULT 0,
        lapses INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO srs_cards
        (id, front_type, front_en, back_tr, media_id, sentence_idx, card_json, due_ms,
         stability, difficulty, state, reps, lapses, created_at)
      SELECT id, front_type, front_en, back_tr, media_id, sentence_idx, card_json, due_ms,
         stability, difficulty, state, reps, lapses, created_at
      FROM srs_cards_old;
      DROP TABLE srs_cards_old;
    `);
  }
  // source: kartin geldigi ana bolum (Tekrar gruplamasi). Eski DB'lerde yoksa ekle.
  const sc2 = db.getAllSync<{ name: string }>(`PRAGMA table_info(srs_cards)`).map((c) => c.name);
  if (!sc2.includes('source')) db.execSync(`ALTER TABLE srs_cards ADD COLUMN source TEXT`);
}

// ---------------------------------------------------------------------------
// Tohumlama
// ---------------------------------------------------------------------------
function seedGrammarTopics() {
  for (const t of GRAMMAR_TOPICS) {
    // label_tr <- topic (kitap adi, ing.); tek kaynak topics.json.
    db.runSync(
      `INSERT OR REPLACE INTO grammar_topics (norm_pattern, category, label_tr, cefr, layer, formula)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [t.norm_pattern, t.category, t.topic, t.cefr, t.layer, t.formula],
    );
  }
}

function cleanSurface(s: string): string {
  return s.toLowerCase().replace(/[^a-z']/g, '');
}

// Yeni sekilli ders (L.lexicon var) icin sozluk verisini olustur; lemma->id ve
// (lexicon_id, sense_idx)->sense_id haritalarini dondur.
function seedLexemes(lexemes: LessonLexeme[]): {
  lemmaToId: Map<string, number>;
  senseId: Map<string, number>; // key: `${lexId}:${senseIdx}`
} {
  const lemmaToId = new Map<string, number>();
  const senseId = new Map<string, number>();
  for (const lx of lexemes) {
    db.runSync(`INSERT OR IGNORE INTO lexicon (lemma, pos, cefr, domain) VALUES (?, ?, ?, ?)`, [
      lx.lemma,
      lx.pos,
      lx.cefr,
      lx.domain ?? null,
    ]);
    const row = db.getFirstSync<{ id: number }>(
      `SELECT id FROM lexicon WHERE lemma = ? AND pos IS ?`,
      [lx.lemma, lx.pos ?? null],
    );
    const lexId = row?.id;
    if (lexId == null) continue;
    lemmaToId.set(`${lx.lemma}|${lx.pos}`, lexId); // anahtar: lemma|pos (global sozluk)
    for (const se of lx.senses) {
      db.runSync(
        `INSERT OR IGNORE INTO senses (lexicon_id, sense_idx, gloss_tr) VALUES (?, ?, ?)`,
        [lexId, se.sense_idx, se.gloss_tr],
      );
      const sr = db.getFirstSync<{ id: number }>(
        `SELECT id FROM senses WHERE lexicon_id = ? AND sense_idx = ?`,
        [lexId, se.sense_idx],
      );
      if (sr?.id != null) senseId.set(`${lexId}:${se.sense_idx}`, sr.id);
    }
  }
  return { lemmaToId, senseId };
}

// FALLBACK: pipeline henuz calismadi. Var olan glossary.json (surface->anlam) ve
// words.json (surface+zaman) uzerinden lexicon/senses/occurrences tureti.
// Gercek lemma/WSD YOK: lemma = surface, sense_idx = null (belirsiz).
function seedLessonFromLegacyAssets(L: Lesson) {
  type Gl = { pos: string; cefr: string; senses: string[] };
  const gloss = (LESSON_GLOSSARY[L.video_id] ?? {}) as Record<string, Gl>;
  const wordsFlat = (LESSON_WORDS[L.video_id] ?? []) as {
    w: string;
    start_ms: number;
    end_ms: number;
  }[];

  // lexicon + senses (glossary'den). Yalniz ICERIK kelimeleri: fonksiyon
  // kelimeleri (article/conjunction/preposition/pronoun/determiner) sozluge girmez.
  const CONTENT = new Set(['verb', 'noun', 'adjective', 'adverb']);
  const lemmaToId = new Map<string, number>();
  for (const [surface, g] of Object.entries(gloss)) {
    if (!CONTENT.has((g.pos ?? '').toLowerCase())) continue;
    const lemma = cleanSurface(surface);
    if (!lemma) continue;
    db.runSync(`INSERT OR IGNORE INTO lexicon (lemma, pos, cefr) VALUES (?, ?, ?)`, [lemma, g.pos, g.cefr]);
    const row = db.getFirstSync<{ id: number }>(
      `SELECT id FROM lexicon WHERE lemma = ? AND pos IS ?`,
      [lemma, g.pos ?? null],
    );
    if (!row?.id) continue;
    lemmaToId.set(lemma, row.id);
    g.senses.forEach((txt, i) => {
      db.runSync(`INSERT OR IGNORE INTO senses (lexicon_id, sense_idx, gloss_tr) VALUES (?, ?, ?)`, [
        row.id,
        i,
        txt,
      ]);
    });
  }

  // occurrences (words.json'u cumlelere orta-nokta ile dagitarak).
  const bounds = L.sentences.map((s) => s.start_ms).sort((a, b) => a - b);
  const sentenceIdxAt = (mid: number): number | null => {
    let idx: number | null = null;
    for (const s of L.sentences) {
      const next = bounds.find((b) => b > s.start_ms) ?? Infinity;
      if (mid >= s.start_ms && mid < next) {
        idx = s.idx;
        break;
      }
    }
    return idx;
  };
  for (const w of wordsFlat) {
    const surface = cleanSurface(w.w);
    if (!surface) continue;
    const mid = (w.start_ms + w.end_ms) / 2;
    const sIdx = sentenceIdxAt(mid);
    if (sIdx == null) continue;
    const lexId = lemmaToId.get(surface) ?? null;
    db.runSync(
      `INSERT INTO word_occurrences (media_id, sentence_idx, surface, lexicon_id, sense_id, start_ms, end_ms)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
      [L.video_id, sIdx, surface, lexId, w.start_ms, w.end_ms],
    );
  }
}

// Ders JSON'unu tabloya yaz. Seed surumu degismisse ders tablolarini tazeler
// (srs_cards'a dokunmaz, ilerleme korunur).
export function seedLessons() {
  seedGrammarTopics(); // kapali enum: her acilista tazele (ucuz, OR REPLACE).

  const row = db.getFirstSync<{ value: string }>(`SELECT value FROM app_meta WHERE key = 'seed_version'`);
  if (row?.value === SEED_VERSION) return;

  db.execSync(`
    DELETE FROM media_items;
    DELETE FROM sentences;
    DELETE FROM chunks;
    DELETE FROM grammar_patterns;
    DELETE FROM lexicon;
    DELETE FROM senses;
    DELETE FROM word_occurrences;
    DELETE FROM examples;
    DELETE FROM articles;
    DELETE FROM article_patterns;
  `);

  // Okuma metinleri: kelime sayisi + okuma suresi (dk) METINDEN turetilir (~200 kelime/dk).
  for (const a of articlesSeed as ArticleSeed[]) {
    const wc = a.body_en.trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.round(wc / 200));
    db.runSync(
      `INSERT OR REPLACE INTO articles (id, title, source, cefr, topic, body_en, body_tr, word_count, read_minutes, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.title, a.source ?? null, a.cefr ?? null, a.topic ?? null, a.body_en, a.body_tr ?? null, wc, mins, a.image_url ?? null],
    );
    // Odak suzme icin: metindeki gecerli norm_pattern'lari (enum) article_patterns'a yaz.
    for (const np of a.norm_patterns ?? []) {
      if (GRAMMAR_PATTERN_SET.has(np)) {
        db.runSync(`INSERT OR IGNORE INTO article_patterns (article_id, norm_pattern) VALUES (?, ?)`, [a.id, np]);
      }
    }
  }

  // GLOBAL sozluk (tum videolar paylasir): bir kez tohumla, haritalari her derste kullan.
  const { lemmaToId, senseId } = seedLexemes(globalLexicon as LessonLexeme[]);

  // Ornek kullanimlar (transfer verisi).
  for (const e of globalExamples as ExampleSeed[]) {
    db.runSync(
      `INSERT INTO examples (owner_type, owner_key, text_en, text_tr, cefr) VALUES (?, ?, ?, ?, ?)`,
      [e.owner_type, e.owner_key, e.text_en, e.text_tr ?? null, e.cefr ?? null],
    );
  }

  for (const L of LESSONS) {
    db.runSync(
      `INSERT OR IGNORE INTO media_items (id, youtube_id, title, license, cefr, video_url, topic) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [L.video_id, L.video_id, L.title, L.license, L.cefr, L.video_url ?? null, L.topic ?? null],
    );

    // occurrences yeni sekilde global sozluge baglanir; yoksa (lesson1) eski
    // glossary/words varliklarindan turet.
    const hasOcc = L.sentences.some(
      (s) => Array.isArray(s.occurrences) && s.occurrences.length > 0,
    );
    if (!hasOcc && LESSON_GLOSSARY[L.video_id] && LESSON_WORDS[L.video_id]) {
      seedLessonFromLegacyAssets(L);
    }

    for (const s of L.sentences) {
      db.runSync(
        `INSERT OR IGNORE INTO sentences (media_id, idx, start_ms, end_ms, text_en, text_tr, cefr, category, category_group)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          L.video_id,
          s.idx,
          s.start_ms,
          s.end_ms,
          s.text_en,
          s.text_tr,
          s.cefr,
          s.category ?? null,
          s.category_group ?? null,
        ],
      );
      for (const c of s.chunks) {
        db.runSync(
          `INSERT INTO chunks (media_id, sentence_idx, text_en, text_tr, type, cefr) VALUES (?, ?, ?, ?, ?, ?)`,
          [L.video_id, s.idx, c.text_en, c.text_tr, c.type, c.cefr],
        );
      }
      for (const g of s.grammar) {
        // norm_pattern yalnizca gecerli enum ise yazilir (kapali liste dogrulamasi).
        const norm =
          g.norm_pattern && GRAMMAR_PATTERN_SET.has(g.norm_pattern) ? g.norm_pattern : null;
        db.runSync(
          `INSERT INTO grammar_patterns (media_id, sentence_idx, pattern, note_tr, cefr, norm_pattern, span_start, span_end)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [L.video_id, s.idx, g.pattern, g.note_tr, g.cefr, norm, g.span_start ?? null, g.span_end ?? null],
        );
      }
      // occurrences: global sozluge (lemma|pos) baglan (fallback zaten toplu yazdi).
      if (hasOcc && Array.isArray(s.occurrences)) {
        for (const o of s.occurrences) {
          const lexId = o.pos ? (lemmaToId.get(`${o.lemma}|${o.pos}`) ?? null) : null;
          const sId =
            lexId != null && o.sense_idx != null ? (senseId.get(`${lexId}:${o.sense_idx}`) ?? null) : null;
          db.runSync(
            `INSERT INTO word_occurrences (media_id, sentence_idx, surface, lexicon_id, sense_id, start_ms, end_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [L.video_id, s.idx, cleanSurface(o.surface), lexId, sId, o.start_ms, o.end_ms],
          );
        }
      }
    }
  }

  db.runSync(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_version', ?)`, [SEED_VERSION]);
}

export function setupDb() {
  initSchema();
  seedLessons();
}

// --- Basit ayar deposu (app_meta key-value): onboarding, seviye vb. ---
export function getSetting(key: string): string | null {
  return db.getFirstSync<{ value: string | null }>(`SELECT value FROM app_meta WHERE key = ?`, [key])?.value ?? null;
}
export function setSetting(key: string, value: string) {
  db.runSync(`INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`, [key, value]);
}

// ---------------------------------------------------------------------------
// Sorgular
// ---------------------------------------------------------------------------
export type MediaRow = {
  id: string;
  youtube_id: string;
  title: string;
  license: string;
  cefr: string;
  video_url: string | null;
  topic: string | null;
};
export type SentenceRow = {
  id: number;
  media_id: string;
  idx: number;
  start_ms: number;
  end_ms: number;
  text_en: string;
  text_tr: string;
  cefr: string;
};

export function getMedia(): MediaRow[] {
  return db.getAllSync<MediaRow>(`SELECT * FROM media_items ORDER BY title`);
}

// İzle ana ekrani icin zenginlestirilmis katalog: her video + GERCEK meta
// (toplam sure, benzersiz obek sayisi, cumle sayisi). Uydurma metrik yok.
export type CatalogItem = MediaRow & {
  duration_ms: number;
  chunk_count: number;
  sentence_count: number;
};
export function getCatalog(): CatalogItem[] {
  return db.getAllSync<CatalogItem>(
    `SELECT m.*,
            COALESCE((SELECT MAX(s.end_ms) FROM sentences s WHERE s.media_id = m.id), 0) AS duration_ms,
            (SELECT COUNT(DISTINCT c.text_en) FROM chunks c WHERE c.media_id = m.id) AS chunk_count,
            (SELECT COUNT(*) FROM sentences s WHERE s.media_id = m.id) AS sentence_count
     FROM media_items m
     ORDER BY m.title`,
  );
}

export function getSentences(mediaId: string): SentenceRow[] {
  return db.getAllSync<SentenceRow>(`SELECT * FROM sentences WHERE media_id = ? ORDER BY idx`, [mediaId]);
}

// --- Shadowing: CEFR seviyesine gore cumle havuzu (tum videolardan) ---
// Her cumle kaynak video bilgisiyle gelir (ses klibi icin youtube_id/video_url).
export type ShadowSentence = {
  media_id: string;
  youtube_id: string;
  video_url: string | null;
  title: string;
  idx: number;
  start_ms: number;
  end_ms: number;
  text_en: string;
  text_tr: string | null;
  cefr: string | null;
};

// Bir cumlenin kelime zamanlari (karaoke: video oynarken aktif kelimeyi vurgula).
// Yalniz zaman damgali kelimeler (start_ms dolu), sirali.
export type WordTiming = { surface: string; start_ms: number; end_ms: number };
export function getSentenceWords(mediaId: string, sentenceIdx: number): WordTiming[] {
  return db.getAllSync<WordTiming>(
    `SELECT surface, start_ms, end_ms FROM word_occurrences
     WHERE media_id = ? AND sentence_idx = ? AND start_ms IS NOT NULL AND end_ms IS NOT NULL
     ORDER BY start_ms`,
    [mediaId, sentenceIdx],
  );
}

export type SentenceCefrCount = { cefr: string | null; c: number };

// Filtre cipleri: CEFR basina cumle sayisi (bilinmeyen seviye null olarak en sona).
export function getSentenceCefrCounts(): SentenceCefrCount[] {
  return db.getAllSync<SentenceCefrCount>(
    `SELECT cefr, COUNT(*) AS c FROM sentences
     WHERE text_en IS NOT NULL AND TRIM(text_en) <> ''
     GROUP BY cefr ORDER BY (cefr IS NULL), cefr`,
  );
}

// CEFR filtreli cumle havuzu (bos ise tumu). idx sirasiyla, video icinde tutarli.
export function getSentencesByCefr(cefr?: string | null, limit = 200): ShadowSentence[] {
  const where = cefr ? `AND s.cefr = ?` : ``;
  const args: (string | number)[] = cefr ? [cefr, limit] : [limit];
  return db.getAllSync<ShadowSentence>(
    `SELECT s.media_id, m.youtube_id, m.video_url, m.title, s.idx,
            s.start_ms, s.end_ms, s.text_en, s.text_tr, s.cefr
     FROM sentences s JOIN media_items m ON m.id = s.media_id
     WHERE s.text_en IS NOT NULL AND TRIM(s.text_en) <> '' ${where}
     ORDER BY s.media_id, s.idx
     LIMIT ?`,
    args,
  );
}

// Bir videonun tum shadowing cumleleri (idx sirali, ses kaynagiyla). Kutuphaneden
// bir "ders" (video) secilince studyo bununla dolar.
export function getSentencesByMedia(mediaId: string): ShadowSentence[] {
  return db.getAllSync<ShadowSentence>(
    `SELECT s.media_id, m.youtube_id, m.video_url, m.title, s.idx,
            s.start_ms, s.end_ms, s.text_en, s.text_tr, s.cefr
     FROM sentences s JOIN media_items m ON m.id = s.media_id
     WHERE s.media_id = ? AND s.text_en IS NOT NULL AND TRIM(s.text_en) <> ''
     ORDER BY s.idx`,
    [mediaId],
  );
}

// --- Shadowing ilerleme takibi (GERCEK veri) ---
// Bir cumle "tamamlandi" sayilir: en iyi telaffuz skoru bu esigi gecerse.
export const SHADOW_DONE = 80;

// Bir cumle denemesini kaydet: en iyi skoru yukselt, deneme sayacini artir.
// NOT: Tekrar havuzuna SESSIZCE eklemez; kullanici "Kaydet" ile bilerek ekler.
export function recordShadowAttempt(mediaId: string, sentIdx: number, score: number) {
  db.runSync(
    `INSERT INTO shadow_progress (media_id, sent_idx, best_score, attempts, updated_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(media_id, sent_idx) DO UPDATE SET
       best_score = MAX(best_score, excluded.best_score),
       attempts   = attempts + 1,
       updated_at = excluded.updated_at`,
    [mediaId, sentIdx, Math.round(score), Date.now()],
  );
}

// Bir kategoriye (paket) ait TUM cumleler (4 videodan toplanir), ses kaynagiyla.
// Studyo bir paketle bununla dolar. Video icinde tutarli sira; videolar arasi baslik.
export function getSentencesByCategory(category: string): ShadowSentence[] {
  return db.getAllSync<ShadowSentence>(
    `SELECT s.media_id, m.youtube_id, m.video_url, m.title, s.idx,
            s.start_ms, s.end_ms, s.text_en, s.text_tr, s.cefr
     FROM sentences s JOIN media_items m ON m.id = s.media_id
     WHERE s.category = ? AND s.text_en IS NOT NULL AND TRIM(s.text_en) <> ''
     ORDER BY m.title, s.idx`,
    [category],
  );
}

// Shadowing kutuphanesi = KATEGORI PAKETLERI. Her paket (category), farkli
// videolardan toplanan cumlelerin kesitidir. GERCEK metrik: cumle sayisi, kaynak
// video sayisi, tamamlanan cumle (shadow_progress). Uydurma yok. category_group =
// bolum basligi. Temsili poster = pakette en cok cumlesi olan videonun posteri.
export type ShadowPack = {
  category: string; // slug
  category_group: string | null; // bolum slug
  sentence_count: number;
  video_count: number;
  done_count: number; // best_score >= SHADOW_DONE
  attempted_count: number;
  poster_yt: string | null; // temsili poster icin youtube_id
};
export function getShadowPacks(): ShadowPack[] {
  return db.getAllSync<ShadowPack>(
    `SELECT s.category AS category,
            MAX(s.category_group) AS category_group,
            COUNT(*) AS sentence_count,
            COUNT(DISTINCT s.media_id) AS video_count,
            SUM(CASE WHEN p.best_score >= ${SHADOW_DONE} THEN 1 ELSE 0 END) AS done_count,
            SUM(CASE WHEN p.media_id IS NOT NULL THEN 1 ELSE 0 END) AS attempted_count,
            (SELECT m2.youtube_id FROM sentences s2 JOIN media_items m2 ON m2.id = s2.media_id
               WHERE s2.category = s.category AND s2.text_en IS NOT NULL AND TRIM(s2.text_en) <> ''
               GROUP BY s2.media_id ORDER BY COUNT(*) DESC, s2.media_id LIMIT 1) AS poster_yt
     FROM sentences s
     LEFT JOIN shadow_progress p ON p.media_id = s.media_id AND p.sent_idx = s.idx
     WHERE s.category IS NOT NULL AND TRIM(s.category) <> ''
       AND s.text_en IS NOT NULL AND TRIM(s.text_en) <> ''
     GROUP BY s.category
     ORDER BY category_group, sentence_count DESC`,
  );
}

// --- Izleme ilerlemesi (Continue Watching) ---
// Oynatici konumu kaydeder; İzle ekrani "Kaldigin yerden izle" bunu GERCEK gosterir.
export function saveWatchProgress(mediaId: string, positionMs: number, durationMs: number) {
  db.runSync(
    `INSERT INTO watch_progress (media_id, position_ms, duration_ms, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(media_id) DO UPDATE SET
       position_ms = excluded.position_ms,
       duration_ms = MAX(watch_progress.duration_ms, excluded.duration_ms),
       updated_at = excluded.updated_at`,
    [mediaId, Math.max(0, Math.round(positionMs)), Math.max(0, Math.round(durationMs)), Date.now()],
  );
}

// Bir videonun kayitli konumu (ms); yoksa 0. Oynatici acilista buraya sarar.
export function getWatchPosition(mediaId: string): number {
  return (
    db.getFirstSync<{ position_ms: number }>(
      `SELECT position_ms FROM watch_progress WHERE media_id = ?`,
      [mediaId],
    )?.position_ms ?? 0
  );
}

// En son izlenen, henuz bitmemis video + katalog metrikleri (GERCEK ilerleme).
// Bitmis (>= %95) sayilan videoyu gostermez. position_ms/dur = gercek tamamlanma.
export type ContinueItem = CatalogItem & {
  position_ms: number;
  progress_duration_ms: number;
  updated_at: number;
};
export function getContinueWatching(): ContinueItem | null {
  const row = db.getFirstSync<ContinueItem>(
    `SELECT m.*,
            COALESCE((SELECT MAX(s.end_ms) FROM sentences s WHERE s.media_id = m.id), 0) AS duration_ms,
            (SELECT COUNT(DISTINCT c.text_en) FROM chunks c WHERE c.media_id = m.id) AS chunk_count,
            (SELECT COUNT(*) FROM sentences s WHERE s.media_id = m.id) AS sentence_count,
            w.position_ms AS position_ms,
            w.duration_ms AS progress_duration_ms,
            w.updated_at AS updated_at
     FROM watch_progress w JOIN media_items m ON m.id = w.media_id
     WHERE w.position_ms > 0
     ORDER BY w.updated_at DESC
     LIMIT 1`,
  );
  if (!row) return null;
  const dur = row.progress_duration_ms || row.duration_ms;
  if (dur > 0 && row.position_ms / dur >= 0.95) return null; // neredeyse bitmis
  return row;
}

// Video bazli shadowing ozeti (ana ekranda "kaldigin yerden" vb. icin). Her video +
// GERCEK ilerleme (bitmis/toplam cumle). Konuya (topic) gore. Uydurma metrik yok.
export type ShadowLibraryItem = MediaRow & {
  duration_ms: number;
  sentence_count: number;
  done_count: number; // best_score >= SHADOW_DONE
  attempted_count: number; // en az 1 deneme
};
export function getShadowLibrary(): ShadowLibraryItem[] {
  return db
    .getAllSync<ShadowLibraryItem>(
      `SELECT m.*,
            COALESCE((SELECT MAX(s.end_ms) FROM sentences s WHERE s.media_id = m.id), 0) AS duration_ms,
            (SELECT COUNT(*) FROM sentences s
               WHERE s.media_id = m.id AND s.text_en IS NOT NULL AND TRIM(s.text_en) <> '') AS sentence_count,
            (SELECT COUNT(*) FROM shadow_progress p
               WHERE p.media_id = m.id AND p.best_score >= ${SHADOW_DONE}) AS done_count,
            (SELECT COUNT(*) FROM shadow_progress p WHERE p.media_id = m.id) AS attempted_count
       FROM media_items m
       ORDER BY m.title`,
    )
    .filter((m) => m.sentence_count > 0);
}

// ---------------------------------------------------------------------------
// Kesfet ana ekrani: okuma metinleri + calisma kesitleri + siradaki gorev.
// Tum metrikler GERCEK (kelime say., okuma dk, klip suresi, shadow ilerlemesi).
// ---------------------------------------------------------------------------
type ArticleSeed = {
  id: string;
  title: string;
  source?: string | null;
  cefr?: string | null;
  topic?: string | null;
  body_en: string;
  body_tr?: string | null;
  norm_patterns?: string[]; // tag_reading.py: metindeki gramer yapilari (odak suzme)
  image_url?: string | null; // kapak gorseli (uzak adres)
};

export type ArticleRow = {
  id: string;
  title: string;
  source: string | null;
  cefr: string | null;
  topic: string | null;
  word_count: number;
  read_minutes: number;
  image_url: string | null;
};
export type ArticleFull = ArticleRow & { body_en: string; body_tr: string | null };

// focusKey verilirse SADECE o gramer yapisini iceren metinler doner (odak kilidi).
export function getArticles(focusKey?: string | null): ArticleRow[] {
  if (focusKey) {
    return db.getAllSync<ArticleRow>(
      `SELECT a.id, a.title, a.source, a.cefr, a.topic, a.word_count, a.read_minutes, a.image_url
       FROM articles a JOIN article_patterns ap ON ap.article_id = a.id
       WHERE ap.norm_pattern = ? ORDER BY a.cefr, a.title`,
      [focusKey],
    );
  }
  return db.getAllSync<ArticleRow>(
    `SELECT id, title, source, cefr, topic, word_count, read_minutes, image_url FROM articles ORDER BY cefr, title`,
  );
}
export function getArticle(id: string): ArticleFull | null {
  return (
    db.getFirstSync<ArticleFull>(
      `SELECT id, title, source, cefr, topic, word_count, read_minutes, image_url, body_en, body_tr
       FROM articles WHERE id = ?`,
      [id],
    ) ?? null
  );
}

// Calisma kesiti: bir videodan cikan TEK cumle (klip). Kart birimi budur; ham
// video degil. start/end = klibin video icindeki zaman araligi (kesit suresi).
export type SentenceClip = {
  media_id: string;
  youtube_id: string;
  video_url: string | null;
  title: string; // kaynak video basligi
  idx: number;
  start_ms: number;
  end_ms: number;
  text_en: string;
  text_tr: string | null;
  cefr: string | null;
};

// İzle kesitleri: obek (chunk) yogunlugu en yuksek cumleler (izlemeye en zengin).
export type WatchClip = SentenceClip & { chunk_count: number };
export function getWatchClips(limit = 40): WatchClip[] {
  return db.getAllSync<WatchClip>(
    `SELECT s.media_id, m.youtube_id, m.video_url, m.title, s.idx, s.start_ms, s.end_ms,
            s.text_en, s.text_tr, s.cefr,
            (SELECT COUNT(*) FROM chunks c WHERE c.media_id = s.media_id AND c.sentence_idx = s.idx) AS chunk_count
     FROM sentences s JOIN media_items m ON m.id = s.media_id
     WHERE s.text_en IS NOT NULL AND TRIM(s.text_en) <> ''
       AND s.media_id NOT LIKE 'curated_%'
     ORDER BY chunk_count DESC, s.media_id, s.idx
     LIMIT ?`,
    [limit],
  );
}

// Shadowing kesitleri: henuz bitmemis (best_score < SHADOW_DONE) cumleler once.
export type ShadowClip = SentenceClip & { best_score: number; attempts: number; done: number };
export function getShadowClips(limit = 40): ShadowClip[] {
  return db.getAllSync<ShadowClip>(
    `SELECT s.media_id, m.youtube_id, m.video_url, m.title, s.idx, s.start_ms, s.end_ms,
            s.text_en, s.text_tr, s.cefr,
            COALESCE(p.best_score, 0) AS best_score,
            COALESCE(p.attempts, 0) AS attempts,
            CASE WHEN COALESCE(p.best_score, 0) >= ${SHADOW_DONE} THEN 1 ELSE 0 END AS done
     FROM sentences s JOIN media_items m ON m.id = s.media_id
     LEFT JOIN shadow_progress p ON p.media_id = s.media_id AND p.sent_idx = s.idx
     WHERE s.text_en IS NOT NULL AND TRIM(s.text_en) <> ''
     ORDER BY done ASC, attempts ASC, s.media_id, s.idx
     LIMIT ?`,
    [limit],
  );
}

// Gramer kesitleri: icinde bir gramer kalibi gecen cumleler (kalip etiketiyle).
export type GrammarClip = SentenceClip & { norm_pattern: string; label_tr: string };
export function getGrammarClips(limit = 40): GrammarClip[] {
  return db.getAllSync<GrammarClip>(
    `SELECT gp.media_id, m.youtube_id, m.video_url, m.title, gp.sentence_idx AS idx,
            s.start_ms, s.end_ms, s.text_en, s.text_tr, s.cefr,
            gp.norm_pattern, gt.label_tr
     FROM grammar_patterns gp
     JOIN media_items m ON m.id = gp.media_id
     JOIN sentences s ON s.media_id = gp.media_id AND s.idx = gp.sentence_idx
     JOIN grammar_topics gt ON gt.norm_pattern = gp.norm_pattern
     WHERE gp.norm_pattern IS NOT NULL AND TRIM(s.text_en) <> ''
     GROUP BY gp.media_id, gp.sentence_idx, gp.norm_pattern
     ORDER BY gp.media_id, gp.sentence_idx
     LIMIT ?`,
    [limit],
  );
}

// Siradaki gorev: en son aktiviteye (izleme veya shadowing) gore bir SONRAKI
// cumle-kesiti. Hic aktivite yoksa ilk videonun ilk cumlesi ("buradan basla").
export type NextTask = SentenceClip & { domain: 'izle' | 'shadowing'; reason: string };
export function getNextStudyTask(): NextTask | null {
  const clipCols = `s.media_id, m.youtube_id, m.video_url, m.title, s.idx, s.start_ms, s.end_ms, s.text_en, s.text_tr, s.cefr`;
  const w = db.getFirstSync<{ media_id: string; position_ms: number; updated_at: number }>(
    `SELECT media_id, position_ms, updated_at FROM watch_progress ORDER BY updated_at DESC LIMIT 1`,
  );
  const sh = db.getFirstSync<{ media_id: string; sent_idx: number; updated_at: number }>(
    `SELECT media_id, sent_idx, updated_at FROM shadow_progress ORDER BY updated_at DESC LIMIT 1`,
  );
  const wT = w?.updated_at ?? 0;
  const shT = sh?.updated_at ?? 0;

  // Hic aktivite yok: en bastan basla.
  if (wT === 0 && shT === 0) {
    const first = db.getFirstSync<SentenceClip>(
      `SELECT ${clipCols} FROM sentences s JOIN media_items m ON m.id = s.media_id
       WHERE TRIM(s.text_en) <> '' ORDER BY m.title, s.idx LIMIT 1`,
    );
    return first ? { ...first, domain: 'izle', reason: 'Buradan başla' } : null;
  }

  let mediaId: string;
  let afterIdx: number;
  let domain: 'izle' | 'shadowing';
  let reason: string;
  if (shT >= wT && sh) {
    mediaId = sh.media_id;
    afterIdx = sh.sent_idx;
    domain = 'shadowing';
    reason = 'Shadowing’e devam';
  } else {
    mediaId = w!.media_id;
    domain = 'izle';
    reason = 'İzlemeye devam';
    const cur = db.getFirstSync<{ idx: number }>(
      `SELECT idx FROM sentences WHERE media_id = ? AND start_ms <= ? ORDER BY idx DESC LIMIT 1`,
      [mediaId, w!.position_ms],
    );
    afterIdx = cur?.idx ?? -1;
  }

  let next = db.getFirstSync<SentenceClip>(
    `SELECT ${clipCols} FROM sentences s JOIN media_items m ON m.id = s.media_id
     WHERE s.media_id = ? AND s.idx > ? AND TRIM(s.text_en) <> '' ORDER BY s.idx LIMIT 1`,
    [mediaId, afterIdx],
  );
  if (!next) {
    // Video bitti: baska bir videonun ilk cumlesi.
    next = db.getFirstSync<SentenceClip>(
      `SELECT ${clipCols} FROM sentences s JOIN media_items m ON m.id = s.media_id
       WHERE s.media_id <> ? AND TRIM(s.text_en) <> '' ORDER BY m.title, s.idx LIMIT 1`,
      [mediaId],
    );
    reason = 'Sıradaki video';
  }
  return next ? { ...next, domain, reason } : null;
}

export function getChunksForSentence(mediaId: string, sentenceIdx: number): LessonChunk[] {
  return db.getAllSync<LessonChunk>(
    `SELECT text_en, text_tr, type, cefr FROM chunks WHERE media_id = ? AND sentence_idx = ?`,
    [mediaId, sentenceIdx],
  );
}

export type GrammarRow = {
  pattern: string;
  note_tr: string;
  cefr: string;
  norm_pattern: string | null;
  span_start: number | null;
  span_end: number | null;
  label_tr: string | null; // grammar_topics'ten
  category: string | null;
};

export function getGrammarForSentence(mediaId: string, sentenceIdx: number): GrammarRow[] {
  return db.getAllSync<GrammarRow>(
    `SELECT gp.pattern, gp.note_tr, gp.cefr, gp.norm_pattern, gp.span_start, gp.span_end,
            gt.label_tr, gt.category
     FROM grammar_patterns gp
     LEFT JOIN grammar_topics gt ON gt.norm_pattern = gp.norm_pattern
     WHERE gp.media_id = ? AND gp.sentence_idx = ?`,
    [mediaId, sentenceIdx],
  );
}

// --- Sozluk arama (lemma tabanli) ---
export type Sense = { sense_idx: number; gloss_tr: string };
export type Lexeme = {
  lexicon_id: number;
  lemma: string;
  pos: string;
  cefr: string;
  senses: Sense[];
  contextSenseIdx: number | null; // bu geciste hangi anlam (varsa)
};

function sensesFor(lexiconId: number): Sense[] {
  return db.getAllSync<Sense>(
    `SELECT sense_idx, gloss_tr FROM senses WHERE lexicon_id = ? ORDER BY sense_idx`,
    [lexiconId],
  );
}

// Ekrandaki bir sozcugu (surface) o cumledeki gecise gore koke cozer.
// Once (media, sentence, surface) geciste arar (baglamsal anlami da getirir),
// yoksa genel surface eslesmesine duser.
export function lookupLexeme(
  surface: string,
  ctx?: { mediaId: string; sentenceIdx: number },
): Lexeme | null {
  const clean = cleanSurface(surface);
  if (!clean) return null;

  let occ: { lexicon_id: number | null; sense_idx: number | null } | null = null;
  if (ctx) {
    occ = db.getFirstSync<{ lexicon_id: number | null; sense_idx: number | null }>(
      `SELECT o.lexicon_id, s.sense_idx
       FROM word_occurrences o
       LEFT JOIN senses s ON s.id = o.sense_id
       WHERE o.media_id = ? AND o.sentence_idx = ? AND o.surface = ?
       LIMIT 1`,
      [ctx.mediaId, ctx.sentenceIdx, clean],
    );
  }
  if (!occ) {
    occ = db.getFirstSync<{ lexicon_id: number | null; sense_idx: number | null }>(
      `SELECT o.lexicon_id, s.sense_idx
       FROM word_occurrences o
       LEFT JOIN senses s ON s.id = o.sense_id
       WHERE o.surface = ? AND o.lexicon_id IS NOT NULL
       LIMIT 1`,
      [clean],
    );
  }
  if (!occ?.lexicon_id) return null;

  const lx = db.getFirstSync<{ id: number; lemma: string; pos: string; cefr: string }>(
    `SELECT id, lemma, pos, cefr FROM lexicon WHERE id = ?`,
    [occ.lexicon_id],
  );
  if (!lx) return null;

  return {
    lexicon_id: lx.id,
    lemma: lx.lemma,
    pos: lx.pos,
    cefr: lx.cefr,
    senses: sensesFor(lx.id),
    contextSenseIdx: occ.sense_idx,
  };
}

// Bir kokun (lemma) TUM turleri (isim/sifat/fiil...) anlamlariyla. Kelime sheet'i
// "turleri ve halleri" bolumunu bundan doldurur. Ayni yazilisin farkli POS'lari
// ayri lexicon kaydidir; hepsini getirir.
export type LexemeForm = {
  lexicon_id: number;
  lemma: string;
  pos: string;
  cefr: string | null;
  senses: Sense[];
};
export function getLexemeFormsByLemma(lemma: string): LexemeForm[] {
  const rows = db.getAllSync<{ id: number; lemma: string; pos: string; cefr: string | null }>(
    `SELECT id, lemma, pos, cefr FROM lexicon WHERE lemma = ? ORDER BY pos`,
    [lemma.toLowerCase().trim()],
  );
  return rows.map((r) => ({
    lexicon_id: r.id,
    lemma: r.lemma,
    pos: r.pos,
    cefr: r.cefr,
    senses: sensesFor(r.id),
  }));
}

// Vocabulary Hub: ogrenilen tum kelimeler (occurrence -> lexicon) CEFR/lemma ile.
export type VocabItem = { lexicon_id: number; lemma: string; pos: string; cefr: string };
export function getVocabForSentence(mediaId: string, sentenceIdx: number): VocabItem[] {
  return db.getAllSync<VocabItem>(
    `SELECT DISTINCT l.id AS lexicon_id, l.lemma, l.pos, l.cefr
     FROM word_occurrences o JOIN lexicon l ON l.id = o.lexicon_id
     WHERE o.media_id = ? AND o.sentence_idx = ? ORDER BY l.lemma`,
    [mediaId, sentenceIdx],
  );
}

// --- Vocabulary Hub ---
// Gorulen (occurrence'i olan) tum icerik kokleri; anlam + kac videoda gectigi +
// FSRS hafiza kararliligi ile. CEFR/lemma sirali.
export type VocabHubRow = {
  lexicon_id: number;
  lemma: string;
  pos: string;
  cefr: string | null;
  domain: string; // COALESCE(l.domain,'GENERAL')
  first_sense: string | null;
  sense_count: number;
  occ_count: number;
  video_count: number;
  stability: number | null; // FSRS kararlilik (gun); SRS'te degilse null
  card_count: number; // bu koke ait SRS kart sayisi
};

export type VocabCefrCount = { cefr: string | null; c: number };
export type VocabDomainCount = { domain: string; c: number };

// CEFR tabani: A1/A2 (temel/islev kelimeleri) sozluk hub'inda GORUNMEZ; en az B1.
// Seviyesi bilinmeyen (null) kokler gosterilir (Layer B ileride seviye atar).
const CEFR_FLOOR = `(l.cefr IS NULL OR l.cefr NOT IN ('A1', 'A2'))`;

// Filtre cipleri icin CEFR basina gorulen kok sayisi (A1/A2 haric).
export function getVocabCefrCounts(): VocabCefrCount[] {
  return db.getAllSync<VocabCefrCount>(
    `SELECT l.cefr, COUNT(DISTINCT l.id) AS c
     FROM lexicon l JOIN word_occurrences o ON o.lexicon_id = l.id
     WHERE ${CEFR_FLOOR}
     GROUP BY l.cefr
     ORDER BY (l.cefr IS NULL), l.cefr`,
  );
}

// Tema (domain) basina gorulen kok sayisi (A1/A2 haric). null tema -> GENERAL.
// Filtre cipleri icin; yalniz >0 olan temalar ekranda gosterilir.
export function getVocabDomainCounts(): VocabDomainCount[] {
  return db.getAllSync<VocabDomainCount>(
    `SELECT COALESCE(l.domain, 'GENERAL') AS domain, COUNT(DISTINCT l.id) AS c
     FROM lexicon l JOIN word_occurrences o ON o.lexicon_id = l.id
     WHERE ${CEFR_FLOOR}
     GROUP BY COALESCE(l.domain, 'GENERAL')
     ORDER BY c DESC`,
  );
}

// Kelime listesi: tema ve/veya CEFR filtresiyle. Ikisi de bos ise tum hub (A1/A2 haric).
export function getVocabulary(filter?: { cefr?: string | null; domain?: string | null }): VocabHubRow[] {
  const conds = [CEFR_FLOOR];
  const args: (string | null)[] = [];
  if (filter?.cefr) {
    conds.push(`l.cefr = ?`);
    args.push(filter.cefr);
  }
  if (filter?.domain) {
    conds.push(`COALESCE(l.domain, 'GENERAL') = ?`);
    args.push(filter.domain);
  }
  return db.getAllSync<VocabHubRow>(
    `SELECT l.id AS lexicon_id, l.lemma, l.pos, l.cefr, COALESCE(l.domain, 'GENERAL') AS domain,
            (SELECT s.gloss_tr FROM senses s WHERE s.lexicon_id = l.id ORDER BY s.sense_idx LIMIT 1) AS first_sense,
            (SELECT COUNT(*) FROM senses s WHERE s.lexicon_id = l.id) AS sense_count,
            COUNT(o.id) AS occ_count,
            COUNT(DISTINCT o.media_id) AS video_count,
            (SELECT MAX(c.stability) FROM srs_cards c WHERE c.front_type = 'vocab' AND c.lexicon_id = l.id) AS stability,
            (SELECT COUNT(*) FROM srs_cards c WHERE c.front_type = 'vocab' AND c.lexicon_id = l.id) AS card_count
     FROM lexicon l JOIN word_occurrences o ON o.lexicon_id = l.id
     WHERE ${conds.join(' AND ')}
     GROUP BY l.id
     ORDER BY (l.cefr IS NULL), l.cefr, l.lemma`,
    args,
  );
}

export type LexemeVideo = { media_id: string; title: string; cnt: number };
export type LexemeDetail = {
  lexicon_id: number;
  lemma: string;
  pos: string;
  cefr: string | null;
  senses: Sense[];
  videos: LexemeVideo[];
  stability: number | null;
  state: number | null;
  firstOcc: { media_id: string; sentence_idx: number } | null;
};

// Bir kokun tam detayi: anlamlar + hangi videolarda + SRS durumu + ilk gecis.
export function getLexemeDetail(lexiconId: number): LexemeDetail | null {
  const lx = db.getFirstSync<{ lemma: string; pos: string; cefr: string | null }>(
    `SELECT lemma, pos, cefr FROM lexicon WHERE id = ?`,
    [lexiconId],
  );
  if (!lx) return null;
  const videos = db.getAllSync<LexemeVideo>(
    `SELECT o.media_id, m.title, COUNT(*) AS cnt
     FROM word_occurrences o JOIN media_items m ON m.id = o.media_id
     WHERE o.lexicon_id = ? GROUP BY o.media_id ORDER BY cnt DESC`,
    [lexiconId],
  );
  const srs = db.getFirstSync<{ stability: number | null; state: number | null }>(
    `SELECT MAX(stability) AS stability, MAX(state) AS state
     FROM srs_cards WHERE front_type = 'vocab' AND lexicon_id = ?`,
    [lexiconId],
  );
  const firstOcc = db.getFirstSync<{ media_id: string; sentence_idx: number }>(
    `SELECT media_id, sentence_idx FROM word_occurrences
     WHERE lexicon_id = ? ORDER BY media_id, start_ms LIMIT 1`,
    [lexiconId],
  );
  return {
    lexicon_id: lexiconId,
    lemma: lx.lemma,
    pos: lx.pos,
    cefr: lx.cefr,
    senses: sensesFor(lexiconId),
    videos,
    stability: srs?.stability ?? null,
    state: srs?.state ?? null,
    firstOcc: firstOcc ?? null,
  };
}

// --- Sozluk kutuphanesi: Obek ve Gramer listeleri (segment icin) ---
export type ChunkLibRow = {
  text_en: string;
  text_tr: string;
  type: string;
  cefr: string;
  media_count: number;
};
export function getChunksLibrary(): ChunkLibRow[] {
  return db.getAllSync<ChunkLibRow>(
    `SELECT text_en,
            MAX(text_tr) AS text_tr,
            MAX(type) AS type,
            MAX(cefr) AS cefr,
            COUNT(DISTINCT media_id) AS media_count
     FROM chunks GROUP BY text_en ORDER BY text_en`,
  );
}

export type GrammarLibRow = {
  norm_pattern: string;
  label_tr: string;
  category: string;
  cefr: string | null;
  formula: string | null;
  cnt: number; // bu kalibin gectigi cumle sayisi (calisma cumlesi)
  video_count: number; // kac farkli videoda geciyor (video kesiti)
  poster_media: string | null; // kalibin EN COK gectigi video (kart posteri icin)
  saved: number; // 0/1: SRS'e eklendi mi (front_type='grammar')
  srs_state: number | null; // FSRS: 0 yeni, 1 ogreniliyor, 2 ogrenildi, 3 tekrar
  srs_stability: number | null; // FSRS kararlilik (gun)
};
// Not: (front_type,front_en) SRS'te benzersiz (ux_srs_other) -> gramer basina
// en fazla 1 kart, bu yuzden LEFT JOIN 1:1'dir ve GROUP BY guvenli.
export function getGrammarLibrary(): GrammarLibRow[] {
  return db.getAllSync<GrammarLibRow>(
    `SELECT gp.norm_pattern, gt.label_tr, gt.category, gt.cefr, gt.formula,
            COUNT(*) AS cnt,
            COUNT(DISTINCT gp.media_id) AS video_count,
            (SELECT gp2.media_id FROM grammar_patterns gp2
             WHERE gp2.norm_pattern = gp.norm_pattern
             GROUP BY gp2.media_id ORDER BY COUNT(*) DESC, gp2.media_id LIMIT 1) AS poster_media,
            CASE WHEN c.id IS NULL THEN 0 ELSE 1 END AS saved,
            c.state AS srs_state,
            c.stability AS srs_stability
     FROM grammar_patterns gp
     JOIN grammar_topics gt ON gt.norm_pattern = gp.norm_pattern
     LEFT JOIN srs_cards c ON c.front_type = 'grammar' AND c.front_en = gp.norm_pattern
     WHERE gp.norm_pattern IS NOT NULL
     GROUP BY gp.norm_pattern
     ORDER BY gt.category, gt.label_tr`,
  );
}

// --- Konular (Ogren ana ekrani: gorsel kartlar) ---
export type TopicRow = { topic: string; word_count: number };
export function getTopics(): TopicRow[] {
  return db.getAllSync<TopicRow>(
    `SELECT m.topic, COUNT(DISTINCT o.lexicon_id) AS word_count
     FROM media_items m JOIN word_occurrences o ON o.media_id = m.id
     WHERE m.topic IS NOT NULL AND m.topic <> '' AND o.lexicon_id IS NOT NULL
     GROUP BY m.topic ORDER BY word_count DESC`,
  );
}

// Bir konunun TUM ogeleri (gramer + ifade/kalip + kelime), tek liste, tip etiketli.
export type TopicItem = {
  kind: 'grammar' | 'chunk' | 'word';
  key: string; // grammar: norm_pattern | chunk: text_en | word: lexicon_id
  title: string;
  sub: string | null;
  cefr: string | null;
};
export function getTopicItems(topic: string): TopicItem[] {
  const grammar = db.getAllSync<{ key: string; title: string; cefr: string | null }>(
    `SELECT DISTINCT gp.norm_pattern AS key, gt.label_tr AS title, gt.cefr AS cefr
     FROM grammar_patterns gp
     JOIN media_items m ON m.id = gp.media_id
     JOIN grammar_topics gt ON gt.norm_pattern = gp.norm_pattern
     WHERE m.topic = ? AND gp.norm_pattern IS NOT NULL
     ORDER BY gt.category, gt.label_tr`,
    [topic],
  );
  const chunks = db.getAllSync<{ key: string; sub: string | null }>(
    `SELECT c.text_en AS key, MAX(c.text_tr) AS sub
     FROM chunks c JOIN media_items m ON m.id = c.media_id
     WHERE m.topic = ? GROUP BY c.text_en ORDER BY c.text_en`,
    [topic],
  );
  const words = db.getAllSync<{ key: string; title: string; sub: string | null; cefr: string | null }>(
    `SELECT l.id AS key, l.lemma AS title, l.cefr AS cefr,
            (SELECT gloss_tr FROM senses s WHERE s.lexicon_id = l.id ORDER BY sense_idx LIMIT 1) AS sub
     FROM lexicon l
     JOIN word_occurrences o ON o.lexicon_id = l.id
     JOIN media_items m ON m.id = o.media_id
     WHERE m.topic = ? AND (l.cefr IS NULL OR l.cefr NOT IN ('A1','A2'))
     GROUP BY l.id ORDER BY l.lemma`,
    [topic],
  );
  return [
    ...grammar.map((g) => ({ kind: 'grammar' as const, key: g.key, title: g.title, sub: null, cefr: g.cefr })),
    ...chunks.map((c) => ({ kind: 'chunk' as const, key: c.key, title: c.key, sub: c.sub, cefr: null })),
    ...words.map((w) => ({ kind: 'word' as const, key: String(w.key), title: w.title, sub: w.sub, cefr: w.cefr })),
  ];
}

// --- Kaydedilenler (Pratik ekrani: SRS'e eklenmis cumle/kelime/obek) ---
export type SavedCard = {
  id: number;
  front_type: string;
  front_en: string;
  back_tr: string | null;
  lexicon_id: number | null;
  due_ms: number | null;
};
export function getSavedCards(): SavedCard[] {
  return db.getAllSync<SavedCard>(
    `SELECT id, front_type, front_en, back_tr, lexicon_id, due_ms
     FROM srs_cards ORDER BY due_ms IS NULL, due_ms, front_type`,
  );
}

// Kartlarim hub'i icin zenginlestirilmis kart listesi: FSRS durumu + kararlilik +
// kaynak video basligi. Metrikler (yeni/tekrar/kritik, hafiza koruma) buradan hesaplanir.
export type CardFull = {
  id: number;
  front_type: string;
  front_en: string;
  back_tr: string | null;
  lexicon_id: number | null;
  media_id: string | null;
  media_title: string | null;
  due_ms: number | null;
  state: number;
  stability: number | null;
  card_json: string;
};
export function getAllCards(): CardFull[] {
  return db.getAllSync<CardFull>(
    `SELECT c.id, c.front_type, c.front_en, c.back_tr, c.lexicon_id, c.media_id,
            (SELECT m.title FROM media_items m WHERE m.id = c.media_id) AS media_title,
            c.due_ms, c.state, c.stability, c.card_json
     FROM srs_cards c
     ORDER BY c.due_ms IS NULL, c.due_ms`,
  );
}

// --- Ornek kullanimlar (transfer / ">=5 farkli baglam") ---
export type ExampleSeed = {
  owner_type: 'lexeme' | 'chunk' | 'grammar';
  owner_key: string;
  text_en: string;
  text_tr?: string | null;
  cefr?: string | null;
};
export type ExampleRow = { text_en: string; text_tr: string | null; cefr: string | null };

function getExamples(ownerType: string, ownerKey: string, limit = 8): ExampleRow[] {
  return db.getAllSync<ExampleRow>(
    `SELECT text_en, text_tr, cefr FROM examples
     WHERE owner_type = ? AND owner_key = ? LIMIT ?`,
    [ownerType, ownerKey, limit],
  );
}

export function getLexemeExamples(lemma: string, pos: string): ExampleRow[] {
  return getExamples('lexeme', `${lemma}|${pos}`, 8);
}
export function getChunkExamples(textEn: string): ExampleRow[] {
  return getExamples('chunk', textEn, 8);
}
export function getGrammarExamples(normPattern: string): ExampleRow[] {
  return getExamples('grammar', normPattern, 8);
}

// Gramer icin GERCEK corpus ornekleri: ayni norm_pattern'a sahip diger cumleler
// (baska videolar/anlar). LLM ornekleriyle birlikte ">=5 baglam"i besler.
export type GrammarUsage = {
  media_id: string;
  title: string;
  sentence_idx: number;
  text_en: string;
  text_tr: string;
  span_start: number | null;
  span_end: number | null;
  sent_start: number; // sahne klibi icin cumle zaman araligi
  sent_end: number;
};
export function getGrammarUsagesByPattern(
  normPattern: string,
  exclude?: { mediaId: string; sentenceIdx: number },
  limit = 10,
): GrammarUsage[] {
  return db.getAllSync<GrammarUsage>(
    `SELECT DISTINCT gp.media_id, m.title, gp.sentence_idx, s.text_en, s.text_tr,
            gp.span_start, gp.span_end, s.start_ms AS sent_start, s.end_ms AS sent_end
     FROM grammar_patterns gp
     JOIN media_items m ON m.id = gp.media_id
     JOIN sentences s ON s.media_id = gp.media_id AND s.idx = gp.sentence_idx
     WHERE gp.norm_pattern = ?
       AND NOT (gp.media_id = ? AND gp.sentence_idx = ?)
     ORDER BY gp.media_id, gp.sentence_idx
     LIMIT ?`,
    [normPattern, exclude?.mediaId ?? '', exclude?.sentenceIdx ?? -1, limit],
  );
}

// Dinleme listesi (sayfali). Her kesit TEK "ogrenecegin yapi" ile gelir: cumledeki
// en ileri seviye kalip (esitlikte en kisa vurgu). Odak varsa yalniz o kalip.
// Sira videolar arasinda donusumlu (ROW_NUMBER / media) -> liste tek videoya yigilmaz.
// Cok kisa/cok uzun cumleler (selamlama, paragraf) elenir.
export type ListeningClip = {
  media_id: string;
  youtube_id: string;
  idx: number;
  start_ms: number;
  end_ms: number;
  text_en: string;
  text_tr: string | null;
  norm_pattern: string;
  topic: string; // kalip adi (ing.)
  note_tr: string; // ne ise yaradigi (tr)
  cefr: string | null;
  span_start: number | null;
  span_end: number | null;
};
export function getListeningClips(opts: {
  focusKey?: string | null;
  query?: string;
  limit: number;
  offset: number;
}): ListeningClip[] {
  const q = opts.query?.trim() ? `%${opts.query.trim()}%` : null;
  return db.getAllSync<ListeningClip>(
    `WITH pick AS (
       SELECT gp.media_id, gp.sentence_idx, gp.norm_pattern, gp.span_start, gp.span_end,
              gt.label_tr AS topic, gt.cefr,
              ROW_NUMBER() OVER (
                PARTITION BY gp.media_id, gp.sentence_idx
                ORDER BY gt.cefr DESC, (gp.span_end - gp.span_start) ASC
              ) AS r
       FROM grammar_patterns gp
       JOIN grammar_topics gt ON gt.norm_pattern = gp.norm_pattern
       WHERE (?1 IS NULL OR gp.norm_pattern = ?1)
     ), rows AS (
       SELECT s.media_id, m.youtube_id, s.idx, s.start_ms, s.end_ms, s.text_en, s.text_tr,
              p.norm_pattern, p.topic, p.cefr, p.span_start, p.span_end,
              ROW_NUMBER() OVER (PARTITION BY s.media_id ORDER BY s.idx) AS rn
       FROM pick p
       JOIN sentences s ON s.media_id = p.media_id AND s.idx = p.sentence_idx
       JOIN media_items m ON m.id = s.media_id
       WHERE p.r = 1
         AND LENGTH(s.text_en) BETWEEN 25 AND 180
         AND (?1 IS NOT NULL OR s.media_id NOT LIKE 'curated_%')
         AND (?2 IS NULL OR s.text_en LIKE ?2 OR s.text_tr LIKE ?2 OR p.topic LIKE ?2)
     )
     SELECT * FROM rows ORDER BY rn, media_id LIMIT ?3 OFFSET ?4`,
    [opts.focusKey ?? null, q, opts.limit, opts.offset],
  ).map((c) => ({ ...c, note_tr: getTopic(c.norm_pattern)?.note_tr ?? '' }));
}

// --- Capraz-video graf (Obsidian benzeri) ---
// lexicon (lemma,pos) benzersiz ve dersler arasi PAYLASIMLI; ayni kok farkli
// videolardaki occurrence'lari tek lexicon_id altinda toplar. Boylece bir kelimeyi
// calisirken 20 videodaki tum gecisleri zaman damgasiyla getirebiliriz.
export type CrossOccurrence = {
  media_id: string;
  title: string;
  sentence_idx: number;
  surface: string;
  start_ms: number;
  end_ms: number;
  text_en: string;
  text_tr: string;
  sent_start: number; // sahne klibi icin cumle zaman araligi
  sent_end: number;
};

// Bir kok (lemma) icin TUM videolardaki gecisler (Capraz Baglam Oynatici verisi).
export function getCrossVideoOccurrencesByLemma(lemma: string): CrossOccurrence[] {
  return db.getAllSync<CrossOccurrence>(
    `SELECT o.media_id, m.title, o.sentence_idx, o.surface, o.start_ms, o.end_ms,
            s.text_en, s.text_tr, s.start_ms AS sent_start, s.end_ms AS sent_end
     FROM word_occurrences o
     JOIN lexicon l ON l.id = o.lexicon_id
     JOIN media_items m ON m.id = o.media_id
     JOIN sentences s ON s.media_id = o.media_id AND s.idx = o.sentence_idx
     WHERE l.lemma = ?
     ORDER BY o.media_id, o.start_ms`,
    [lemma.toLowerCase().trim()],
  );
}

// Birden fazla FARKLI videoda gecen kokler (graf koprusu) + video sayisi.
export type BridgeLemma = { lemma: string; pos: string; video_count: number; total: number };
export function getCrossVideoBridges(minVideos = 2, limit = 100): BridgeLemma[] {
  // Yalnizca icerik kelimeleri (isim/fiil/sifat/zarf/ozel isim). Islev kelimeleri
  // (the/a/to/of...) grafi bogar, elenir.
  return db.getAllSync<BridgeLemma>(
    `SELECT l.lemma, l.pos,
            COUNT(DISTINCT o.media_id) AS video_count,
            COUNT(*) AS total
     FROM word_occurrences o JOIN lexicon l ON l.id = o.lexicon_id
     WHERE l.pos IN ('NOUN', 'VERB', 'ADJ', 'ADV', 'PROPN')
     GROUP BY l.id
     HAVING COUNT(DISTINCT o.media_id) >= ?
     ORDER BY video_count DESC, total DESC
     LIMIT ?`,
    [minVideos, limit],
  );
}

// --- SRS ---
// SRS'e kart ekle. Kelime karti (front_type='vocab') occurrence bazinda benzersiz:
// ayni lexeme ayni cumlede iki kez eklenmez, farkli cumlelerde ayri kart olur.
export function addSrsCard(input: {
  front_type: string;
  front_en: string;
  back_tr: string;
  media_id?: string;
  sentence_idx?: number;
  lexicon_id?: number;
  source?: SavedSource; // hangi ana bolumden kaydedildi (Tekrar gruplamasi)
  no_card?: boolean; // true: FSRS doner-kart uretme (makale/izle gibi baglantilar)
}) {
  const { card_json, due_ms } = input.no_card ? { card_json: null, due_ms: null } : emptyCard();
  db.runSync(
    `INSERT OR IGNORE INTO srs_cards
       (front_type, front_en, back_tr, media_id, sentence_idx, lexicon_id, source, card_json, due_ms, state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      input.front_type,
      input.front_en,
      input.back_tr,
      input.media_id ?? null,
      input.sentence_idx ?? null,
      input.lexicon_id ?? null,
      input.source ?? null,
      card_json,
      due_ms,
    ],
  );
}

export function countSrsCards(): number {
  const r = db.getFirstSync<{ c: number }>(`SELECT COUNT(*) AS c FROM srs_cards`);
  return r?.c ?? 0;
}

// ===========================================================================
// Konusma pratigi kayitlari (speaking_takes) - KULLANICI VERISI
// ===========================================================================
export type SpeakingTake = {
  id: number;
  focus_id: string;
  variation_key: string;
  text_en: string;
  audio_uri: string | null;
  video_uri: string | null;
  score: number | null;
  duration_ms: number;
  created_at: number;
};

// Bir kaydi ekle; yeni satirin id'sini don (dosya adlandirma icin).
export function addSpeakingTake(t: {
  focus_id: string;
  variation_key: string;
  text_en: string;
  audio_uri?: string | null;
  video_uri?: string | null;
  score?: number | null;
  duration_ms?: number;
}): number {
  const res = db.runSync(
    `INSERT INTO speaking_takes
       (focus_id, variation_key, text_en, audio_uri, video_uri, score, duration_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.focus_id,
      t.variation_key,
      t.text_en,
      t.audio_uri ?? null,
      t.video_uri ?? null,
      t.score ?? null,
      t.duration_ms ?? 0,
      Date.now(),
    ],
  );
  return res.lastInsertRowId as number;
}

// Bir kaydin dosya yollarini (video guncellenirse) sonradan yaz.
export function updateSpeakingTakeMedia(id: number, m: { audio_uri?: string | null; video_uri?: string | null; score?: number | null }) {
  db.runSync(
    `UPDATE speaking_takes SET
       audio_uri = COALESCE(?, audio_uri),
       video_uri = COALESCE(?, video_uri),
       score = COALESCE(?, score)
     WHERE id = ?`,
    [m.audio_uri ?? null, m.video_uri ?? null, m.score ?? null, id],
  );
}

export function getSpeakingTakes(focusId: string): SpeakingTake[] {
  return db.getAllSync<SpeakingTake>(
    `SELECT * FROM speaking_takes WHERE focus_id = ? ORDER BY created_at DESC`,
    [focusId],
  );
}

export function deleteSpeakingTake(id: number) {
  db.runSync(`DELETE FROM speaking_takes WHERE id = ?`, [id]);
}

export type SpeakingFocusStat = { takes: number; days: number; last_at: number | null };
// Odak basina: toplam kayit, farkli gun sayisi (UTC gun bucket'i), son kayit ms.
export function getSpeakingStats(): Record<string, SpeakingFocusStat> {
  const rows = db.getAllSync<{ focus_id: string; takes: number; days: number; last_at: number }>(
    `SELECT focus_id,
            COUNT(*) AS takes,
            COUNT(DISTINCT created_at / 86400000) AS days,
            MAX(created_at) AS last_at
     FROM speaking_takes GROUP BY focus_id`,
  );
  const out: Record<string, SpeakingFocusStat> = {};
  for (const r of rows) out[r.focus_id] = { takes: r.takes, days: r.days, last_at: r.last_at };
  return out;
}

// ===========================================================================
// Aktif Odak (Global Active Focus Node) - app_meta'da JSON. Bir gramer konusu
// (norm_pattern) tum ekranlarda "odak rozeti" olarak sabitlenir. Sekmeler serbest
// kalir; rozet konuldugunda ilgili icerik one cikar / o konunun modulune donulur.
// ===========================================================================
export type ActiveFocus = { key: string; label: string };

export function getActiveFocus(): ActiveFocus | null {
  const v = getSetting('active_focus');
  if (!v) return null;
  try {
    const o = JSON.parse(v) as ActiveFocus;
    return o && o.key ? o : null;
  } catch {
    return null;
  }
}

export function setActiveFocus(f: ActiveFocus) {
  setSetting('active_focus', JSON.stringify({ key: f.key, label: f.label }));
}

export function clearActiveFocus() {
  setSetting('active_focus', '');
}

export type SrsCardRow = {
  id: number;
  front_type: string;
  front_en: string;
  back_tr: string;
  media_id: string | null;
  sentence_idx: number | null;
  lexicon_id: number | null;
  card_json: string;
  due_ms: number;
  state: number;
};

export function getDueCards(limit = 50): SrsCardRow[] {
  return db.getAllSync<SrsCardRow>(
    `SELECT * FROM srs_cards WHERE due_ms IS NOT NULL AND due_ms <= ? ORDER BY due_ms LIMIT ?`,
    [Date.now(), limit],
  );
}

export function reviewCard(id: number, grade: Grade) {
  const row = db.getFirstSync<SrsCardRow>(`SELECT * FROM srs_cards WHERE id = ?`, [id]);
  if (!row?.card_json) return;
  const r = rate(row.card_json, grade);
  db.runSync(
    `UPDATE srs_cards SET card_json = ?, due_ms = ?, stability = ?, difficulty = ?, state = ?, reps = ?, lapses = ? WHERE id = ?`,
    [r.card_json, r.due_ms, r.stability, r.difficulty, r.state, r.reps, r.lapses, id],
  );
}

export function countDueCards(): number {
  const r = db.getFirstSync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM srs_cards WHERE due_ms IS NOT NULL AND due_ms <= ?`,
    [Date.now()],
  );
  return r?.c ?? 0;
}

// ===========================================================================
// TEKRAR / KAYDEDILENLER (elle): kullanici 5 ana bolumden (kelime/gramer/shadow/
// makale/izle) bir ogeyi BILEREK kaydeder; Tekrar ekraninda kaynagina gore
// gruplanir. Otomatik/sessiz ekleme YOK. Her save 'source' damgalar.
// (front_type, front_en) benzersiz oldugu icin ayni oge iki kez eklenmez.
// ===========================================================================
export type SavedSource = 'vocab' | 'grammar' | 'shadow' | 'article' | 'watch';

// Kelime kaydet (Tekrar'da doner-kart). front_type='vocab' + lexicon_id -> vocab
// hub'inda "kayitli" isareti yanar. Ayni kok bir kez (elle var-yok kontrolu).
export function saveVocabReview(lexiconId: number, lemma: string, meaning?: string | null) {
  const w = (lemma ?? '').trim();
  if (!w || !lexiconId) return;
  const exists = db.getFirstSync<{ id: number }>(
    `SELECT id FROM srs_cards WHERE front_type = 'vocab' AND lexicon_id = ?`,
    [lexiconId],
  );
  if (exists) return;
  addSrsCard({ front_type: 'vocab', front_en: w, back_tr: meaning ?? '', lexicon_id: lexiconId, source: 'vocab' });
}

// Kelime sheet'inde bir ornek cumleyi elle "+" ile Tekrar'a tasima (kelime grubu).
export function enrollExampleReview(textEn: string, textTr?: string | null) {
  const en = (textEn ?? '').trim();
  if (!en) return;
  addSrsCard({ front_type: 'sentence', front_en: en, back_tr: textTr ?? '', source: 'vocab' });
}

// Gramer konusunu kaydet. front_en = norm_pattern (getGrammarLibrary join anahtari
// ile ayni), back_tr = Turkce ad. Tekrar'da tiklayinca konu detayi acilir.
export function enrollGrammarReview(normPattern: string, labelTr?: string | null) {
  const p = (normPattern ?? '').trim();
  if (!p) return;
  addSrsCard({ front_type: 'grammar', front_en: p, back_tr: labelTr ?? '', source: 'grammar' });
}

// Shadowing cumlesini kaydet. Tekrar'da tiklayinca studyoda o cumle acilir.
// media_id/idx yoksa (havuz/tek cumle) yalniz metinle kaydedilir.
export function saveShadowReview(
  mediaId: string | null | undefined,
  sentIdx: number | null | undefined,
  textEn: string,
  textTr?: string | null,
) {
  const en = (textEn ?? '').trim();
  if (!en) return;
  addSrsCard({
    front_type: 'sentence',
    front_en: en,
    back_tr: textTr ?? '',
    media_id: mediaId ?? undefined,
    sentence_idx: sentIdx ?? undefined,
    source: 'shadow',
  });
}

// Makaleyi kaydet (kart degil, baglanti). front_en = article_id, back_tr = baslik.
export function saveArticleReview(articleId: string, title: string) {
  const id = (articleId ?? '').trim();
  if (!id) return;
  addSrsCard({ front_type: 'article', front_en: id, back_tr: title ?? '', source: 'article', no_card: true });
}

// Videoyu kaydet (kart degil, baglanti). front_en = media_id, back_tr = baslik.
export function saveWatchReview(mediaId: string, title: string) {
  const id = (mediaId ?? '').trim();
  if (!id) return;
  addSrsCard({ front_type: 'watch', front_en: id, back_tr: title ?? '', media_id: id, source: 'watch', no_card: true });
}

// --- Kayitli mi? (buton durumu) ---
export function isVocabSaved(lexiconId: number): boolean {
  return !!db.getFirstSync<{ id: number }>(
    `SELECT id FROM srs_cards WHERE front_type = 'vocab' AND lexicon_id = ?`,
    [lexiconId],
  );
}
export function isSavedByFront(frontType: string, frontEn: string): boolean {
  return !!db.getFirstSync<{ id: number }>(
    `SELECT id FROM srs_cards WHERE front_type = ? AND front_en = ?`,
    [frontType, (frontEn ?? '').trim()],
  );
}
export function isGrammarSaved(normPattern: string): boolean {
  return isSavedByFront('grammar', normPattern);
}
export function isArticleSaved(articleId: string): boolean {
  return isSavedByFront('article', articleId);
}
export function isWatchSaved(mediaId: string): boolean {
  return isSavedByFront('watch', mediaId);
}

// Kaydi kaldir (kart id ile ya da (front_type, front_en) ile).
export function removeSavedById(id: number) {
  db.runSync(`DELETE FROM srs_cards WHERE id = ?`, [id]);
}
export function removeSavedByFront(frontType: string, frontEn: string) {
  db.runSync(`DELETE FROM srs_cards WHERE front_type = ? AND front_en = ?`, [frontType, (frontEn ?? '').trim()]);
}
export function removeVocabSaved(lexiconId: number) {
  db.runSync(`DELETE FROM srs_cards WHERE front_type = 'vocab' AND lexicon_id = ?`, [lexiconId]);
}

// --- Tekrar ekrani: kaynagina gore gruplanmis kayitlar ---
export type SavedRow = {
  id: number;
  source: SavedSource;
  front_type: string;
  front_en: string;
  back_tr: string | null;
  media_id: string | null;
  sentence_idx: number | null;
  lexicon_id: number | null;
  card_json: string | null;
  due_ms: number | null;
  media_title: string | null; // shadow/watch: kaynak video basligi (alt satir)
};
export function getSavedItems(): SavedRow[] {
  return db.getAllSync<SavedRow>(
    `SELECT c.id, c.source, c.front_type, c.front_en, c.back_tr, c.media_id, c.sentence_idx,
            c.lexicon_id, c.card_json, c.due_ms,
            (SELECT m.title FROM media_items m WHERE m.id = c.media_id) AS media_title
     FROM srs_cards c
     WHERE c.source IS NOT NULL
     ORDER BY c.id DESC`,
  );
}
export type SavedGroup = { source: SavedSource; items: SavedRow[] };
export function getSavedGrouped(): SavedGroup[] {
  const order: SavedSource[] = ['vocab', 'grammar', 'shadow', 'article', 'watch'];
  const rows = getSavedItems();
  return order
    .map((source) => ({ source, items: rows.filter((r) => r.source === source) }))
    .filter((g) => g.items.length > 0);
}

// Vakti gelen gramer konulari (kart flip yerine "konuyu tekrar et" baglantisi).
export type DueGrammar = {
  norm_pattern: string;
  label_tr: string;
  formula: string | null;
  cefr: string | null;
  due_ms: number;
  state: number;
};
export function getDueGrammar(limit = 20): DueGrammar[] {
  return db.getAllSync<DueGrammar>(
    `SELECT c.front_en AS norm_pattern, gt.label_tr, gt.formula, gt.cefr, c.due_ms, c.state
     FROM srs_cards c JOIN grammar_topics gt ON gt.norm_pattern = c.front_en
     WHERE c.front_type = 'grammar' AND c.due_ms IS NOT NULL AND c.due_ms <= ?
     ORDER BY c.due_ms LIMIT ?`,
    [Date.now(), limit],
  );
}

// "Geri donuk calismalar": bir sure once yapip donmedigin video/shadowing.
// idleDays'ten eski dokunulmus, tamamlanmamis olanlar; en cok ihmal edilen once.
export type RevisitItem = {
  kind: 'video' | 'shadowing';
  media_id: string;
  title: string;
  youtube_id: string | null;
  updated_at: number;
  days: number; // kac gun once dokunuldu
  detail: string; // dururst kisa aciklama (gercek sayilardan)
};
export function getRevisitItems(idleDays = 1, limit = 8): RevisitItem[] {
  const now = Date.now();
  const cutoff = now - idleDays * 86400000;
  const out: RevisitItem[] = [];

  // Video: yarim birakilmis izleme (>=%95 hariclenir).
  const vids = db.getAllSync<{
    media_id: string; title: string; youtube_id: string | null;
    updated_at: number; position_ms: number; duration_ms: number;
  }>(
    `SELECT m.id AS media_id, m.title, m.youtube_id, w.updated_at, w.position_ms,
            COALESCE(NULLIF(w.duration_ms, 0),
                     (SELECT MAX(s.end_ms) FROM sentences s WHERE s.media_id = m.id), 0) AS duration_ms
     FROM watch_progress w JOIN media_items m ON m.id = w.media_id
     WHERE w.position_ms > 0 AND w.updated_at > 0 AND w.updated_at < ?
     ORDER BY w.updated_at ASC`,
    [cutoff],
  );
  for (const v of vids) {
    if (v.duration_ms > 0 && v.position_ms / v.duration_ms >= 0.95) continue;
    const pct = v.duration_ms > 0 ? Math.round((v.position_ms / v.duration_ms) * 100) : 0;
    out.push({
      kind: 'video', media_id: v.media_id, title: v.title, youtube_id: v.youtube_id,
      updated_at: v.updated_at, days: Math.floor((now - v.updated_at) / 86400000),
      detail: pct > 0 ? `Izlemede %${pct} kaldin` : 'Yarim kaldi',
    });
  }

  // Shadowing: bir videoda calisip tamamlamadigin cumleler.
  const sh = db.getAllSync<{
    media_id: string; title: string; youtube_id: string | null;
    updated_at: number; done: number; total: number;
  }>(
    `SELECT p.media_id, m.title, m.youtube_id, MAX(p.updated_at) AS updated_at,
            SUM(CASE WHEN p.best_score >= ${SHADOW_DONE} THEN 1 ELSE 0 END) AS done,
            (SELECT COUNT(*) FROM sentences s
               WHERE s.media_id = p.media_id AND TRIM(s.text_en) <> '') AS total
     FROM shadow_progress p JOIN media_items m ON m.id = p.media_id
     GROUP BY p.media_id
     HAVING MAX(p.updated_at) < ? AND done < total
     ORDER BY updated_at ASC`,
    [cutoff],
  );
  for (const s of sh) {
    out.push({
      kind: 'shadowing', media_id: s.media_id, title: s.title, youtube_id: s.youtube_id,
      updated_at: s.updated_at, days: Math.floor((now - s.updated_at) / 86400000),
      detail: `Shadowing ${s.done}/${s.total} cumle`,
    });
  }

  return out.sort((a, b) => a.updated_at - b.updated_at).slice(0, limit);
}

// ---------------------------------------------------------------------------
// DERS MUFREDATI SORGULARI: unite -> GERCEK icerik (mercek). Gramer/kelime/pratik
// otomatik (norm_pattern + domain uzerinden); reading/listening elle etiketten
// (UNIT_BY_ARTICLE / UNIT_BY_MEDIA). Icerik yoksa bos doner (dururstce bos UI).
// ---------------------------------------------------------------------------
function unitPh(n: number): string {
  return Array(n).fill('?').join(', ');
}
function mediaIdsForUnit(no: number): string[] {
  return Object.keys(UNIT_BY_MEDIA).filter((k) => UNIT_BY_MEDIA[k] === no);
}
function articleIdsForUnit(no: number): string[] {
  return Object.keys(UNIT_BY_ARTICLE).filter((k) => UNIT_BY_ARTICLE[k] === no);
}

export type CourseUnitOverview = CourseUnit & {
  grammarCount: number; // bu unitenin baglanabilir kaliplarindan kaci videolarda geciyor
  vocabCount: number; // temaya ait gorulen kok sayisi
  practiceCount: number; // pratik cumlesi sayisi
  readingCount: number; // eslenen makale
  listeningCount: number; // eslenen video
};

function countIn(table: string, col: string, vals: string[]): number {
  if (!vals.length) return 0;
  const r = db.getFirstSync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM ${table} WHERE ${col} IN (${unitPh(vals.length)})`,
    vals,
  );
  return r?.c ?? 0;
}

function unitVocabCount(domains: string[]): number {
  if (!domains.length) return 0;
  const r = db.getFirstSync<{ c: number }>(
    `SELECT COUNT(DISTINCT l.id) AS c FROM lexicon l JOIN word_occurrences o ON o.lexicon_id = l.id
     WHERE l.domain IN (${unitPh(domains.length)})`,
    domains,
  );
  return r?.c ?? 0;
}

function unitGrammarCount(grammar: string[]): number {
  if (!grammar.length) return 0;
  const r = db.getFirstSync<{ c: number }>(
    `SELECT COUNT(DISTINCT norm_pattern) AS c FROM grammar_patterns WHERE norm_pattern IN (${unitPh(grammar.length)})`,
    grammar,
  );
  return r?.c ?? 0;
}

// Pratik cumlesi: cumle ya unitenin bir gramerini icerir YA DA temasindan bir kelime gecer.
function unitPracticeWhere(grammar: string[], domains: string[]): { sql: string; args: string[] } | null {
  const clauses: string[] = [];
  const args: string[] = [];
  if (grammar.length) {
    clauses.push(
      `EXISTS(SELECT 1 FROM grammar_patterns gp WHERE gp.media_id = s.media_id AND gp.sentence_idx = s.idx AND gp.norm_pattern IN (${unitPh(grammar.length)}))`,
    );
    args.push(...grammar);
  }
  if (domains.length) {
    clauses.push(
      `EXISTS(SELECT 1 FROM word_occurrences o JOIN lexicon l ON l.id = o.lexicon_id WHERE o.media_id = s.media_id AND o.sentence_idx = s.idx AND l.domain IN (${unitPh(domains.length)}))`,
    );
    args.push(...domains);
  }
  if (!clauses.length) return null;
  return { sql: clauses.join(' OR '), args };
}

function unitPracticeCount(grammar: string[], domains: string[]): number {
  const w = unitPracticeWhere(grammar, domains);
  if (!w) return 0;
  const r = db.getFirstSync<{ c: number }>(`SELECT COUNT(*) AS c FROM sentences s WHERE ${w.sql}`, w.args);
  return r?.c ?? 0;
}

// Tum uniteler + GERCEK icerik sayimlari (Kesfet ust seridi / ders ekrani).
export function getCourseUnits(): CourseUnitOverview[] {
  return COURSE_UNITS.map((u) => ({
    ...u,
    grammarCount: unitGrammarCount(u.grammar),
    vocabCount: unitVocabCount(u.domains),
    practiceCount: unitPracticeCount(u.grammar, u.domains),
    readingCount: countIn('articles', 'id', articleIdsForUnit(u.no)),
    listeningCount: countIn('media_items', 'id', mediaIdsForUnit(u.no)),
  }));
}

export function getCourseUnit(no: number): CourseUnit | null {
  return COURSE_UNITS.find((u) => u.no === no) ?? null;
}

// Unite grameri: enum'da baglanabilen kaliplar (kutuphane satiri).
export function getUnitGrammar(no: number): GrammarLibRow[] {
  const u = getCourseUnit(no);
  if (!u || !u.grammar.length) return [];
  const set = new Set(u.grammar);
  return getGrammarLibrary().filter((g) => set.has(g.norm_pattern));
}

// Unite kelimeleri: temalarina ait gorulen kokler.
export function getUnitVocab(no: number): VocabHubRow[] {
  const u = getCourseUnit(no);
  if (!u || !u.domains.length) return [];
  return db.getAllSync<VocabHubRow>(
    `SELECT l.id AS lexicon_id, l.lemma, l.pos, l.cefr, COALESCE(l.domain, 'GENERAL') AS domain,
            (SELECT s.gloss_tr FROM senses s WHERE s.lexicon_id = l.id ORDER BY s.sense_idx LIMIT 1) AS first_sense,
            (SELECT COUNT(*) FROM senses s WHERE s.lexicon_id = l.id) AS sense_count,
            COUNT(o.id) AS occ_count,
            COUNT(DISTINCT o.media_id) AS video_count,
            (SELECT MAX(c.stability) FROM srs_cards c WHERE c.front_type = 'vocab' AND c.lexicon_id = l.id) AS stability,
            (SELECT COUNT(*) FROM srs_cards c WHERE c.front_type = 'vocab' AND c.lexicon_id = l.id) AS card_count
     FROM lexicon l JOIN word_occurrences o ON o.lexicon_id = l.id
     WHERE l.domain IN (${unitPh(u.domains.length)})
     GROUP BY l.id
     ORDER BY (l.cefr IS NULL), l.cefr, l.lemma`,
    u.domains,
  );
}

// Unite pratik cumleleri (Konusma/Shadowing): gramer VEYA tema eslesen gercek cumleler.
export function getUnitPractice(no: number, limit = 100): ShadowSentence[] {
  const u = getCourseUnit(no);
  if (!u) return [];
  const w = unitPracticeWhere(u.grammar, u.domains);
  if (!w) return [];
  return db.getAllSync<ShadowSentence>(
    `SELECT s.media_id, m.youtube_id, m.video_url, m.title, s.idx,
            s.start_ms, s.end_ms, s.text_en, s.text_tr, s.cefr
     FROM sentences s JOIN media_items m ON m.id = s.media_id
     WHERE (${w.sql}) AND s.text_en IS NOT NULL AND TRIM(s.text_en) <> ''
     ORDER BY s.media_id, s.idx
     LIMIT ?`,
    [...w.args, limit],
  );
}

// Unite okuma metinleri (elle etiketli makaleler).
export function getUnitReading(no: number): ArticleRow[] {
  const ids = articleIdsForUnit(no);
  if (!ids.length) return [];
  return db.getAllSync<ArticleRow>(
    `SELECT id, title, source, cefr, topic, word_count, read_minutes, image_url FROM articles
     WHERE id IN (${unitPh(ids.length)}) ORDER BY cefr, title`,
    ids,
  );
}

// Unite dinleme/izleme (elle etiketli videolar), sure/obek/cumle sayilariyla.
export function getUnitListening(no: number): CatalogItem[] {
  const ids = mediaIdsForUnit(no);
  if (!ids.length) return [];
  return db.getAllSync<CatalogItem>(
    `SELECT m.*,
            COALESCE((SELECT MAX(s.end_ms) FROM sentences s WHERE s.media_id = m.id), 0) AS duration_ms,
            (SELECT COUNT(DISTINCT c.text_en) FROM chunks c WHERE c.media_id = m.id) AS chunk_count,
            (SELECT COUNT(*) FROM sentences s WHERE s.media_id = m.id) AS sentence_count
     FROM media_items m WHERE m.id IN (${unitPh(ids.length)}) ORDER BY m.title`,
    ids,
  );
}
