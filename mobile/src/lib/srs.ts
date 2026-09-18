import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';

// FSRS zamanlayici. enable_fuzz: ayni gun biriken kartlari hafifce dagitir.
const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

// Yeni kart: bos FSRS karti + hemen tekrar edilebilir (due = simdi).
export function emptyCard(now = new Date()): { card_json: string; due_ms: number } {
  const c = createEmptyCard(now);
  return { card_json: JSON.stringify(c), due_ms: c.due.getTime() };
}

// JSON'dan Card'i geri kur (tarih alanlarini Date'e cevir).
function revive(json: string): Card {
  const o = JSON.parse(json);
  return {
    ...o,
    due: new Date(o.due),
    last_review: o.last_review ? new Date(o.last_review) : undefined,
  } as Card;
}

export type ReviewResult = {
  card_json: string;
  due_ms: number;
  stability: number;
  difficulty: number;
  state: number;
  reps: number;
  lapses: number;
};

// Bir karti puanla (Again/Hard/Good/Easy) ve yeni FSRS durumunu don.
export function rate(cardJson: string, grade: Grade, now = new Date()): ReviewResult {
  const { card } = scheduler.next(revive(cardJson), now, grade);
  return {
    card_json: JSON.stringify(card),
    due_ms: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    state: card.state,
    reps: card.reps,
    lapses: card.lapses,
  };
}

// Sonraki tekrarin ne zaman olacagini onizle (buton alti etiketi icin).
export function previewIntervals(cardJson: string, now = new Date()) {
  const record = scheduler.repeat(revive(cardJson), now);
  const days = (g: Grade) => {
    const due = record[g].card.due.getTime();
    const d = Math.round((due - now.getTime()) / 86400000);
    return d <= 0 ? '<1g' : `${d}g`;
  };
  return {
    [Rating.Again]: days(Rating.Again),
    [Rating.Hard]: days(Rating.Hard),
    [Rating.Good]: days(Rating.Good),
    [Rating.Easy]: days(Rating.Easy),
  } as Record<Grade, string>;
}

export const RATINGS: { grade: Grade; label: string }[] = [
  { grade: Rating.Again, label: 'Tekrar' },
  { grade: Rating.Hard, label: 'Zor' },
  { grade: Rating.Good, label: 'İyi' },
  { grade: Rating.Easy, label: 'Kolay' },
];
