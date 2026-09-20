import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SheetStep, SheetStepper } from '@/components/sheet-stepper';
import { SpeakPractice } from '@/components/speak-practice';
import { colors, radius, space } from '@/constants/appTheme';

export type PracticeUsage = {
  text_en: string;
  span_start: number | null;
  span_end: number | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  label: string; // kuralin adi (baslik)
  usage: PracticeUsage | null; // kuralin gectigi gercek cumle + span
};

// Gramer kurali icin 3 adimli interaktif pratik (Stepper Bottom Sheet):
// 1) Bosluk doldurma (kuralin span'i bosaltilir)
// 2) Kelime siralama (cumle token'lari karistirilir)
// 3) Sesli tekrar (shadowing + telaffuz)
export function GrammarPractice({ visible, onClose, label, usage }: Props) {
  const sentence = usage?.text_en ?? label;
  const answer =
    usage && usage.span_start != null && usage.span_end != null && usage.span_end > usage.span_start
      ? sentence.slice(usage.span_start, usage.span_end)
      : null;

  const steps: SheetStep[] = [
    {
      title: `${label} · Adım 1`,
      content: <BlankFill sentence={sentence} span={answer ? [usage!.span_start!, usage!.span_end!] : null} />,
    },
    { title: `${label} · Adım 2`, content: <WordOrder sentence={sentence} /> },
    {
      title: `${label} · Adım 3`,
      content: (
        <View style={{ gap: space.sm }}>
          <Text style={styles.prompt}>Cümleyi sesli söyle ve telaffuzunu kontrol et.</Text>
          <SpeakPractice text={sentence} />
        </View>
      ),
    },
  ];

  return (
    <SheetStepper
      visible={visible}
      onClose={onClose}
      onDone={onClose}
      steps={steps}
      height="full"
      nextLabel="Sonraki Adım"
      doneLabel="Bitti"
    />
  );
}

// --- Adim 1: Bosluk doldurma ---
function BlankFill({ sentence, span }: { sentence: string; span: [number, number] | null }) {
  const answer = span ? sentence.slice(span[0], span[1]) : null;
  const before = span ? sentence.slice(0, span[0]) : sentence;
  const after = span ? sentence.slice(span[1]) : '';
  const [picked, setPicked] = useState<string | null>(null);

  // Secenekler: dogru ifade + cumlenin kendi icinden 2 gercek kelime (uydurma yok).
  const options = useMemo(() => {
    if (!answer) return [];
    const answerLower = answer.toLowerCase();
    const pool = sentence
      .split(/\s+/)
      .map((w) => w.replace(/[^A-Za-z']/g, ''))
      .filter((w) => w.length >= 3 && !answerLower.includes(w.toLowerCase()));
    const distractors = dedupeStrings(pool).slice(0, 2);
    return shuffle([answer, ...distractors]);
  }, [sentence, answer]);

  if (!answer) {
    // Span yoksa: bosluksuz, dinle-oku modu.
    return (
      <View style={{ gap: space.md }}>
        <Text style={styles.prompt}>Bu kalıbın geçtiği örnek cümle:</Text>
        <View style={styles.sentenceBox}>
          <Text style={styles.sentenceText}>{sentence}</Text>
        </View>
      </View>
    );
  }

  const correct = picked?.toLowerCase() === answer.toLowerCase();
  return (
    <View style={{ gap: space.md }}>
      <Text style={styles.prompt}>Boşluğa gelen doğru ifadeyi seç.</Text>
      <View style={styles.sentenceBox}>
        <Text style={styles.sentenceText}>
          {before}
          <Text style={[styles.blank, picked ? (correct ? styles.blankOk : styles.blankNo) : null]}>
            {picked ?? ' _______ '}
          </Text>
          {after}
        </Text>
      </View>
      <View style={styles.optionsRow}>
        {options.map((o, i) => {
          const on = picked === o;
          const ok = on && correct;
          const no = on && !correct;
          return (
            <Pressable
              key={`${o}-${i}`}
              style={[styles.option, ok && styles.optionOk, no && styles.optionNo]}
              onPress={() => setPicked(o)}>
              <Text style={[styles.optionText, (ok || no) && { color: '#fff' }]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
      {picked ? (
        <View style={styles.feedback}>
          <Ionicons
            name={correct ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={correct ? colors.good : colors.again}
          />
          <Text style={[styles.feedbackText, { color: correct ? colors.good : colors.again }]}>
            {correct ? 'Doğru!' : `Doğrusu: ${answer}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// --- Adim 2: Kelime siralama ---
function WordOrder({ sentence }: { sentence: string }) {
  const target = useMemo(() => sentence.trim().replace(/\s+/g, ' ').split(' '), [sentence]);
  const shuffled = useMemo(() => shuffle(target.map((w, i) => ({ w, id: i }))), [target]);
  const [order, setOrder] = useState<{ w: string; id: number }[]>([]);

  const usedIds = new Set(order.map((o) => o.id));
  const built = order.map((o) => o.w).join(' ');
  const done = order.length === target.length;
  const correct = done && built === target.join(' ');

  return (
    <View style={{ gap: space.md }}>
      <Text style={styles.prompt}>Kelimelere dokunarak cümleyi doğru sırala.</Text>

      <View style={[styles.buildBox, done && (correct ? styles.buildOk : styles.buildNo)]}>
        {order.length === 0 ? (
          <Text style={styles.buildPlaceholder}>Cümleyi buraya kur</Text>
        ) : (
          <View style={styles.chipsWrap}>
            {order.map((o, i) => (
              <Pressable key={o.id} style={styles.chipBuilt} onPress={() => setOrder((prev) => prev.filter((_, j) => j !== i))}>
                <Text style={styles.chipBuiltText}>{o.w}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.chipsWrap}>
        {shuffled.map((o) => (
          <Pressable
            key={o.id}
            disabled={usedIds.has(o.id)}
            style={[styles.chip, usedIds.has(o.id) && styles.chipUsed]}
            onPress={() => setOrder((prev) => [...prev, o])}>
            <Text style={[styles.chipText, usedIds.has(o.id) && styles.chipTextUsed]}>{o.w}</Text>
          </Pressable>
        ))}
      </View>

      {done ? (
        <View style={styles.feedback}>
          <Ionicons
            name={correct ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={correct ? colors.good : colors.again}
          />
          <Text style={[styles.feedbackText, { color: correct ? colors.good : colors.again }]}>
            {correct ? 'Doğru sıralama!' : 'Sıra hatalı, kelimeleri kaldırıp tekrar dene.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function dedupeStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const styles = StyleSheet.create({
  prompt: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  sentenceBox: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.lg },
  sentenceText: { fontSize: 18, color: colors.ink, lineHeight: 28, fontWeight: '600' },
  blank: { fontWeight: '800', color: colors.teal },
  blankOk: { color: colors.good },
  blankNo: { color: colors.again },

  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  optionOk: { backgroundColor: colors.good, borderColor: colors.good },
  optionNo: { backgroundColor: colors.again, borderColor: colors.again },
  optionText: { fontSize: 15, fontWeight: '700', color: colors.ink },

  feedback: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  feedbackText: { fontSize: 14, fontWeight: '700' },

  buildBox: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    padding: space.md,
    justifyContent: 'center',
  },
  buildOk: { borderColor: colors.good },
  buildNo: { borderColor: colors.again },
  buildPlaceholder: { fontSize: 14, color: colors.muted },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chipBuilt: {
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  chipBuiltText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  chip: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  chipUsed: { backgroundColor: colors.surface, borderColor: colors.line },
  chipText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  chipTextUsed: { color: colors.line },
});
