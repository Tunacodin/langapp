import * as SQLite from 'expo-sqlite';

import lesson1 from '../../assets/lessons/lesson1.json';
import lesson1Glossary from '../../assets/lessons/lesson1.glossary.json';
import lesson1Words from '../../assets/lessons/lesson1.words.json';
import { emptyCard, rate } from './srs';
import type { Grade } from 'ts-fsrs';

// ---------------------------------------------------------------------------
// Gramer konu sozlugu (KAPALI ENUM). 4 ana kategori altinda ~15 cekirdek kalip.
// Bu liste hem burada hem scripts/grammar_topics.py'de AYNIDIR (tek kaynak).
// A Katmani (regex) yuksek-kesinlikli olanlari, B Katmani (LLM) yapisal olanlari
// tespit eder; ikisi de norm_pattern'i bu listeden secmek ZORUNDA (enum ile suzme).
// ---------------------------------------------------------------------------
export type GrammarTopic = {
  norm_pattern: string;
  category: 'TENSE_ASPECT' | 'MODAL_VOICE' | 'VERB_PATTERN' | 'CLAUSE';
  label_tr: string;
  cefr: string;
  layer: 'A' | 'B'; // A = regex/POS, B = LLM
};

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  // 1) Zaman / Gorunus
  { norm_pattern: 'PRESENT_SIMPLE', category: 'TENSE_ASPECT', label_tr: 'Geniş Zaman', cefr: 'A1', layer: 'A' },
  { norm_pattern: 'PRESENT_CONTINUOUS', category: 'TENSE_ASPECT', label_tr: 'Şimdiki Zaman', cefr: 'A1', layer: 'A' },
  { norm_pattern: 'PRESENT_PERFECT', category: 'TENSE_ASPECT', label_tr: 'Yakın Geçmiş (have+V3)', cefr: 'B1', layer: 'A' },
  { norm_pattern: 'PAST_SIMPLE', category: 'TENSE_ASPECT', label_tr: 'Geçmiş Zaman', cefr: 'A2', layer: 'A' },
  { norm_pattern: 'PAST_CONTINUOUS', category: 'TENSE_ASPECT', label_tr: 'Geçmişte Sürekli (was+V-ing)', cefr: 'B1', layer: 'A' },
  { norm_pattern: 'FUTURE_FORM', category: 'TENSE_ASPECT', label_tr: 'Gelecek (will / going to)', cefr: 'A2', layer: 'A' },
  // 2) Kiplik / Cati
  { norm_pattern: 'MODAL_VERB', category: 'MODAL_VOICE', label_tr: 'Kip Fiili (can/must/should...)', cefr: 'A2', layer: 'A' },
  { norm_pattern: 'PASSIVE_VOICE', category: 'MODAL_VOICE', label_tr: 'Edilgen Çatı (be+V3)', cefr: 'B1', layer: 'A' },
  // 3) Fiil Kaliplari
  { norm_pattern: 'PHRASAL_VERB', category: 'VERB_PATTERN', label_tr: 'Öbek Fiil (verb+particle)', cefr: 'B1', layer: 'A' },
  { norm_pattern: 'GERUND_INFINITIVE', category: 'VERB_PATTERN', label_tr: 'Fiil + -ing / to', cefr: 'B1', layer: 'B' },
  { norm_pattern: 'CAUSATIVE', category: 'VERB_PATTERN', label_tr: 'Ettirgen (make/let/have + do)', cefr: 'B2', layer: 'B' },
  // 4) Cumle Yapisi
  { norm_pattern: 'RELATIVE_CLAUSE', category: 'CLAUSE', label_tr: 'Sıfat Cümleciği (who/which/that)', cefr: 'B1', layer: 'B' },
  { norm_pattern: 'NOUN_CLAUSE', category: 'CLAUSE', label_tr: 'İsim Cümleciği (that-clause)', cefr: 'B2', layer: 'B' },
  { norm_pattern: 'EMBEDDED_WH', category: 'CLAUSE', label_tr: 'Gömülü Soru (I know where...)', cefr: 'B2', layer: 'B' },
  { norm_pattern: 'CONDITIONAL', category: 'CLAUSE', label_tr: 'Koşul Cümlesi (if...)', cefr: 'B1', layer: 'B' },
];

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
export type LessonLexeme = { lemma: string; pos: string; cefr: string; senses: LessonSense[] };
export type LessonOccurrence = {
  surface: string; // ekranda gecen sozcuk (temizlenmis kucuk harf)
  lemma: string; // lexicon kokune baglar
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
  lexicon?: LessonLexeme[]; // yeni: derse ait tekil kokler
  sentences: LessonSentence[];
};

const LESSONS: Lesson[] = [lesson1 as Lesson];

const db = SQLite.openDatabaseSync('cogni3.db');

// Ders verisi/semasi degistiginde artir; seed otomatik tazelenir (SRS korunur).
const SEED_VERSION = '4';

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
      cefr TEXT
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
      layer TEXT
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

    -- FSRS kartlari. Kelime karti benzersizligi ARTIK occurrence seviyesinde:
    -- (media_id, sentence_idx, lexicon_id). Diger kartlar (front_type,front_en).
    -- Kisitlar kismi (partial) UNIQUE index ile (asagida) kurulur; tablo-ici
    -- UNIQUE YOK (eski sema onu iceriyorsa ensureColumns yeniden kurar).
    CREATE TABLE IF NOT EXISTS srs_cards (
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

    CREATE INDEX IF NOT EXISTS ix_occ_surface ON word_occurrences (surface);
    CREATE INDEX IF NOT EXISTS ix_occ_sentence ON word_occurrences (media_id, sentence_idx);
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
}

// ---------------------------------------------------------------------------
// Tohumlama
// ---------------------------------------------------------------------------
function seedGrammarTopics() {
  for (const t of GRAMMAR_TOPICS) {
    db.runSync(
      `INSERT OR REPLACE INTO grammar_topics (norm_pattern, category, label_tr, cefr, layer)
       VALUES (?, ?, ?, ?, ?)`,
      [t.norm_pattern, t.category, t.label_tr, t.cefr, t.layer],
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
    db.runSync(`INSERT OR IGNORE INTO lexicon (lemma, pos, cefr) VALUES (?, ?, ?)`, [
      lx.lemma,
      lx.pos,
      lx.cefr,
    ]);
    const row = db.getFirstSync<{ id: number }>(
      `SELECT id FROM lexicon WHERE lemma = ? AND pos IS ?`,
      [lx.lemma, lx.pos ?? null],
    );
    const lexId = row?.id;
    if (lexId == null) continue;
    lemmaToId.set(lx.lemma, lexId);
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
  const gloss = lesson1Glossary as Record<string, Gl>;
  const wordsFlat = lesson1Words as { w: string; start_ms: number; end_ms: number }[];

  // lexicon + senses (glossary'den).
  const lemmaToId = new Map<string, number>();
  for (const [surface, g] of Object.entries(gloss)) {
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
  `);

  for (const L of LESSONS) {
    db.runSync(
      `INSERT OR IGNORE INTO media_items (id, youtube_id, title, license, cefr) VALUES (?, ?, ?, ?, ?)`,
      [L.video_id, L.video_id, L.title, L.license, L.cefr],
    );

    // Sozluk: yeni sekil varsa dogrudan; yoksa eski varliklardan turet.
    let lemmaToId = new Map<string, number>();
    let senseId = new Map<string, number>();
    const hasNewShape = Array.isArray(L.lexicon) && L.lexicon.length > 0;
    if (hasNewShape) {
      const r = seedLexemes(L.lexicon as LessonLexeme[]);
      lemmaToId = r.lemmaToId;
      senseId = r.senseId;
    } else if (L.video_id === 'lesson1') {
      seedLessonFromLegacyAssets(L);
    }

    for (const s of L.sentences) {
      db.runSync(
        `INSERT OR IGNORE INTO sentences (media_id, idx, start_ms, end_ms, text_en, text_tr, cefr)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [L.video_id, s.idx, s.start_ms, s.end_ms, s.text_en, s.text_tr, s.cefr],
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
          g.norm_pattern && GRAMMAR_TOPICS.some((t) => t.norm_pattern === g.norm_pattern)
            ? g.norm_pattern
            : null;
        db.runSync(
          `INSERT INTO grammar_patterns (media_id, sentence_idx, pattern, note_tr, cefr, norm_pattern, span_start, span_end)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [L.video_id, s.idx, g.pattern, g.note_tr, g.cefr, norm, g.span_start ?? null, g.span_end ?? null],
        );
      }
      // occurrences yalnizca yeni sekilde (fallback zaten yukarida toplu yazdi).
      if (hasNewShape && Array.isArray(s.occurrences)) {
        for (const o of s.occurrences) {
          const lexId = lemmaToId.get(o.lemma) ?? null;
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

// ---------------------------------------------------------------------------
// Sorgular
// ---------------------------------------------------------------------------
export type MediaRow = { id: string; youtube_id: string; title: string; license: string; cefr: string };
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

export function getSentences(mediaId: string): SentenceRow[] {
  return db.getAllSync<SentenceRow>(`SELECT * FROM sentences WHERE media_id = ? ORDER BY idx`, [mediaId]);
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
}) {
  const { card_json, due_ms } = emptyCard();
  db.runSync(
    `INSERT OR IGNORE INTO srs_cards
       (front_type, front_en, back_tr, media_id, sentence_idx, lexicon_id, card_json, due_ms, state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      input.front_type,
      input.front_en,
      input.back_tr,
      input.media_id ?? null,
      input.sentence_idx ?? null,
      input.lexicon_id ?? null,
      card_json,
      due_ms,
    ],
  );
}

export function countSrsCards(): number {
  const r = db.getFirstSync<{ c: number }>(`SELECT COUNT(*) AS c FROM srs_cards`);
  return r?.c ?? 0;
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
