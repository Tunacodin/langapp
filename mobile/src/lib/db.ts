import * as SQLite from 'expo-sqlite';

import lesson1 from '../../assets/lessons/lesson1.json';
import { emptyCard, rate } from './srs';
import type { Grade } from 'ts-fsrs';

// Ders JSON tipleri (cikarim motorunun ciktisi).
export type LessonChunk = {
  text_en: string;
  text_tr: string;
  type: string; // collocation | phrasal_verb | idiom | expression | pattern | connector
  cefr: string;
};
export type LessonGrammar = { pattern: string; note_tr: string; cefr: string };
export type LessonVocab = { word: string; text_tr: string; pos: string; cefr: string };
export type LessonSentence = {
  idx: number;
  start_ms: number;
  end_ms: number;
  text_en: string;
  text_tr: string;
  cefr: string;
  chunks: LessonChunk[];
  grammar: LessonGrammar[];
  vocab: LessonVocab[];
};
export type Lesson = {
  video_id: string;
  title: string;
  license: string;
  cefr: string;
  sentences: LessonSentence[];
};

const LESSONS: Lesson[] = [lesson1 as Lesson];

const db = SQLite.openDatabaseSync('cogni3.db');

// Ders verisi her degistiginde artir; seed otomatik tazelenir (SRS ilerlemesi korunur).
const SEED_VERSION = '3';

// Tum tablolar tek yerde. Offline-first; senkron sutunlari (updated_at/is_synced)
// v2'de eklenecek, simdilik yerel.
export function initSchema() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
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
    CREATE TABLE IF NOT EXISTS grammar_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id TEXT NOT NULL,
      sentence_idx INTEGER NOT NULL,
      pattern TEXT NOT NULL,
      note_tr TEXT,
      cefr TEXT
    );
    CREATE TABLE IF NOT EXISTS vocab (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id TEXT NOT NULL,
      sentence_idx INTEGER NOT NULL,
      word TEXT NOT NULL,
      text_tr TEXT,
      pos TEXT,
      cefr TEXT
    );
    -- FSRS kartlari: front_type = chunk | vocab | sentence, ref o tablodaki metin.
    -- card_json = ts-fsrs Card'in tam hali; due_ms = sonraki tekrar (epoch ms).
    CREATE TABLE IF NOT EXISTS srs_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      front_type TEXT NOT NULL,
      front_en TEXT NOT NULL,
      back_tr TEXT,
      media_id TEXT,
      sentence_idx INTEGER,
      card_json TEXT,
      due_ms INTEGER,
      stability REAL DEFAULT 0,
      difficulty REAL DEFAULT 0,
      state INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (front_type, front_en)
    );
  `);
  ensureColumns();
}

// Eski kurulumlarda eksik sutunlari ekle (guvenli goc).
function ensureColumns() {
  const cols = db.getAllSync<{ name: string }>(`PRAGMA table_info(srs_cards)`).map((c) => c.name);
  if (!cols.includes('card_json')) db.execSync(`ALTER TABLE srs_cards ADD COLUMN card_json TEXT`);
  if (!cols.includes('due_ms')) db.execSync(`ALTER TABLE srs_cards ADD COLUMN due_ms INTEGER`);
}

// Ders JSON'unu tabloya yaz. Seed surumu degismisse ders tablolarini tazeler
// (srs_cards'a dokunmaz, ilerleme korunur).
export function seedLessons() {
  const row = db.getFirstSync<{ value: string }>(`SELECT value FROM app_meta WHERE key = 'seed_version'`);
  if (row?.value === SEED_VERSION) return;

  // Ders tablolarini temizle (SRS haric), sonra yeniden doldur.
  db.execSync(`DELETE FROM media_items; DELETE FROM sentences; DELETE FROM chunks; DELETE FROM grammar_patterns; DELETE FROM vocab;`);

  for (const L of LESSONS) {
    db.runSync(
      `INSERT OR IGNORE INTO media_items (id, youtube_id, title, license, cefr) VALUES (?, ?, ?, ?, ?)`,
      [L.video_id, L.video_id, L.title, L.license, L.cefr],
    );
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
        db.runSync(
          `INSERT INTO grammar_patterns (media_id, sentence_idx, pattern, note_tr, cefr) VALUES (?, ?, ?, ?, ?)`,
          [L.video_id, s.idx, g.pattern, g.note_tr, g.cefr],
        );
      }
      for (const v of s.vocab) {
        db.runSync(
          `INSERT INTO vocab (media_id, sentence_idx, word, text_tr, pos, cefr) VALUES (?, ?, ?, ?, ?, ?)`,
          [L.video_id, s.idx, v.word, v.text_tr, v.pos, v.cefr],
        );
      }
    }
  }

  db.runSync(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_version', ?)`, [SEED_VERSION]);
}

export function setupDb() {
  initSchema();
  seedLessons();
}

// --- Sorgular ---

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
  return db.getAllSync<SentenceRow>(
    `SELECT * FROM sentences WHERE media_id = ? ORDER BY idx`,
    [mediaId],
  );
}

export function getChunksForSentence(mediaId: string, sentenceIdx: number): LessonChunk[] {
  return db.getAllSync<LessonChunk>(
    `SELECT text_en, text_tr, type, cefr FROM chunks WHERE media_id = ? AND sentence_idx = ?`,
    [mediaId, sentenceIdx],
  );
}

export function getGrammarForSentence(mediaId: string, sentenceIdx: number): LessonGrammar[] {
  return db.getAllSync<LessonGrammar>(
    `SELECT pattern, note_tr, cefr FROM grammar_patterns WHERE media_id = ? AND sentence_idx = ?`,
    [mediaId, sentenceIdx],
  );
}

// SRS'e kart ekle (chunk/vocab/sentence). Ayni on yuz varsa yok sayar.
export function addSrsCard(input: {
  front_type: string;
  front_en: string;
  back_tr: string;
  media_id?: string;
  sentence_idx?: number;
}) {
  const { card_json, due_ms } = emptyCard();
  db.runSync(
    `INSERT OR IGNORE INTO srs_cards (front_type, front_en, back_tr, media_id, sentence_idx, card_json, due_ms, state)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      input.front_type,
      input.front_en,
      input.back_tr,
      input.media_id ?? null,
      input.sentence_idx ?? null,
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
  card_json: string;
  due_ms: number;
  state: number;
};

// Vakti gelmis kartlar (due_ms <= simdi). Yeni kartlar da due=simdi ile buraya duser.
export function getDueCards(limit = 50): SrsCardRow[] {
  return db.getAllSync<SrsCardRow>(
    `SELECT * FROM srs_cards WHERE due_ms IS NOT NULL AND due_ms <= ? ORDER BY due_ms LIMIT ?`,
    [Date.now(), limit],
  );
}

// Karti puanla: FSRS'i uygula ve yeni durumu kaydet.
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
