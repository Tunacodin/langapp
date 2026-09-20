import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { addSrsCard, countSrsCards, getGrammarLibrary } from '@/lib/db';
import {
  ExamChoice,
  ExamErrorChoice,
  ExamGap,
  ExamScramble,
  getGrammarLesson,
  GrammarLesson,
} from '@/lib/grammarLessons';

// Gramer yol haritasi ADIM 6: Unite sonu sinavi + FSRS havuzu. TAM EKRAN.
// Sorular elle yazilir; FSRS "havuza ekle" GERCEKTEN addSrsCard ile eklenir ve
// gercek sayi gosterilir (uydurma "12 kart / Yarın 19:00" yok).

// Bu unitenin SRS'e eklenecek kartlari (pattern + ornek cumleler + kayit cumleleri).
function unitCards(lesson: GrammarLesson, patternKey: string, title: string) {
  const out: { front_type: string; front_en: string; back_tr: string }[] = [];
  out.push({ front_type: 'grammar', front_en: patternKey, back_tr: title });
  lesson.examples?.tabs.forEach((t) =>
    t.groups.forEach((g) => g.cards.forEach((c) => out.push({ front_type: 'chunk', front_en: c.en, back_tr: c.tr }))),
  );
  lesson.recording?.sentences.forEach((s) => out.push({ front_type: 'chunk', front_en: s.en, back_tr: s.tr }));
  return out;
}

const TABS = ['Test Soruları', 'Kural Özeti', 'FSRS Havuzu'];

export default function GrammarExamScreen() {
  const p = useLocalSearchParams<{ key?: string; title?: string }>();
  const insets = useSafeAreaInsets();

  const lesson = useMemo(() => getGrammarLesson(p.key), [p.key]);
  const row = useMemo(() => getGrammarLibrary().find((r) => r.norm_pattern === p.key) ?? null, [p.key]);
  const title = row?.label_tr ?? p.title ?? '';
  const exam = lesson?.exam;

  const [tab, setTab] = useState(0);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [pool, setPool] = useState<{ total: number; added: number } | null>(null);

  // Gecme esigi: acikca verilmisse onu, yoksa soru sayisinin ~%60'i.
  const passScore = exam?.passScore ?? Math.ceil((exam?.stages.length ?? 0) * 0.6);

  function markSolved(i: number) {
    setSolved((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
  }

  function addToPool() {
    if (!lesson || !p.key) return;
    const cards = unitCards(lesson, p.key, title);
    const before = countSrsCards();
    cards.forEach((c) => addSrsCard(c));
    const after = countSrsCards();
    setPool({ total: cards.length, added: after - before });
  }

  if (!exam || !lesson) {
    return (
      <View style={styles.root}>
        <TopBar title={title} insets={insets} />
        <View style={styles.empty}>
          <Ionicons name="construct-outline" size={30} color={colors.muted} />
          <Text style={styles.emptyText}>Bu konunun ünite sınavı henüz hazır değil.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopBar title={title} insets={insets} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}>
        {/* Metadata + baslik */}
        <View style={styles.pills}>
          {row?.cefr ? <Pill text={`${row.cefr} Seviye`} /> : null}
          <Pill text="Ünite Değerlendirmesi" tone="teal" />
          {exam.minutes ? <Pill text={`${exam.minutes} dk`} /> : null}
          <Pill text={`${exam.stages.length} soru & FSRS`} />
        </View>
        <View style={styles.intro}>
          <Text style={styles.h2}>Ünite Sonu Sınavı & Kazanım Kontrolü</Text>
          <Text style={styles.introText}>{exam.intro}</Text>
        </View>

        {/* Sekmeler */}
        <View style={styles.tabs}>
          {TABS.map((t, i) => {
            const on = i === tab;
            return (
              <Pressable key={t} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(i)}>
                <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* --- Sekme 0: Test --- */}
        {tab === 0 ? (
          <>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Doğru cevap</Text>
              <View style={styles.scorePills}>
                {solved.size >= passScore ? (
                  <View style={styles.passPill}>
                    <Ionicons name="ribbon" size={13} color="#fff" />
                    <Text style={styles.passText}>Geçtin</Text>
                  </View>
                ) : (
                  <Text style={styles.passHint}>Geçme: {passScore}</Text>
                )}
                <View style={styles.scorePill}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.good} />
                  <Text style={styles.scoreText}>
                    {solved.size} / {exam.stages.length}
                  </Text>
                </View>
              </View>
            </View>
            {exam.stages.map((stage, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.stageHead}>
                  <View style={[styles.stageDot, { backgroundColor: dotFor(i) }]} />
                  <Text style={styles.stageTitle}>
                    {i + 1}. {stage.title}
                  </Text>
                  <Text style={styles.stageCount}>Soru {String(i + 1).padStart(2, '0')}/0{exam.stages.length}</Text>
                </View>
                {stage.kind === 'gap' ? <GapStage s={stage} onSolved={() => markSolved(i)} /> : null}
                {stage.kind === 'choice' ? <ChoiceStage s={stage} onSolved={() => markSolved(i)} /> : null}
                {stage.kind === 'errorChoice' ? <ErrorChoiceStage s={stage} onSolved={() => markSolved(i)} /> : null}
                {stage.kind === 'scramble' ? <ScrambleStage s={stage} onSolved={() => markSolved(i)} /> : null}
              </View>
            ))}
          </>
        ) : null}

        {/* --- Sekme 1: Kural Ozeti (mevcut icerikten) --- */}
        {tab === 1 ? (
          <View style={{ gap: space.md }}>
            {lesson.structures?.map((st) => (
              <View key={st.key} style={styles.card}>
                <Text style={styles.sumTitle}>{st.title}</Text>
                <Text style={styles.sumFormula}>{st.formula.map((f) => f.text).join('  +  ')}</Text>
                <Text style={styles.sumEx}>{st.example.text}</Text>
                <Text style={styles.sumTr}>{st.example.translation}</Text>
              </View>
            ))}
            {lesson.verbForms?.irregular ? (
              <View style={styles.card}>
                <Text style={styles.sumTitle}>{lesson.verbForms.irregular.title}</Text>
                <View style={styles.verbChips}>
                  {lesson.verbForms.irregular.items.map((v) => (
                    <View key={v.from} style={styles.verbChip}>
                      <Text style={styles.verbChipText}>
                        {v.from} → <Text style={{ color: colors.accent }}>{v.to}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* --- Sekme 2: FSRS Havuzu (gercek ekleme) --- */}
        {tab === 2 ? (
          <View style={styles.card}>
            <View style={styles.fsrsHead}>
              <View style={styles.fsrsIcon}>
                <Ionicons name="flash" size={16} color={colors.accent} />
              </View>
              <Text style={styles.fsrsTitle}>FSRS Hafıza Kartı Havuzu</Text>
            </View>
            <Text style={styles.fsrsText}>
              Bu ünitedeki kilit cümleler ve gramer kalıbı, aralıklı tekrar (FSRS) planına eklenir. Kartlar
              "Kartlarım" ekranında hemen tekrara hazırdır.
            </Text>

            {pool ? (
              <View style={styles.fsrsResult}>
                <Ionicons name="checkmark-circle" size={20} color={colors.good} />
                <Text style={styles.fsrsResultText}>
                  {pool.added > 0
                    ? `${pool.added} yeni kart eklendi · toplam ${pool.total} ünite kartı havuzda.`
                    : `Tüm ${pool.total} ünite kartı zaten havuzda.`}
                </Text>
              </View>
            ) : (
              <Pressable style={styles.fsrsBtn} onPress={addToPool}>
                <Ionicons name="albums-outline" size={18} color="#fff" />
                <Text style={styles.fsrsBtnText}>Ünite kartlarını havuza ekle</Text>
              </Pressable>
            )}

            {pool ? (
              <Pressable style={styles.reviewLink} onPress={() => router.navigate('/review')}>
                <Text style={styles.reviewLinkText}>Kartlarım'a git</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.accent} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Sabit alt: sinavi tamamla -> yol haritasina don */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + space.sm }]}>
        <Pressable
          style={styles.cta}
          onPress={() => {
            addToPool(); // tamamlarken kartlari da havuza al (idempotent)
            router.back();
          }}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.ctaText}>Sınavı tamamla · Yol haritasına dön</Text>
        </Pressable>
      </View>
    </View>
  );
}

function dotFor(i: number) {
  return i === 0 ? colors.accent : i === 1 ? colors.teal : colors.good;
}

// --- Boşluk doldurma ---
function GapStage({ s, onSolved }: { s: ExamGap; onSolved: () => void }) {
  const [answered, setAnswered] = useState<null | boolean>(null);
  const [a, b] = s.prompt.split('{blank}');
  return (
    <>
      <View style={styles.promptBox}>
        <Text style={styles.prompt}>
          {a}
          <Text style={[styles.blank, answered === true && styles.blankOk]}> {answered ? s.answer : '______'} </Text>
          {b}
        </Text>
        {s.rootHint ? <Text style={styles.rootHint}>{s.rootHint}</Text> : null}
      </View>
      <View style={styles.optRow}>
        {s.options.map((o) => {
          const showOk = answered === true && o === s.answer;
          return (
            <Pressable
              key={o}
              disabled={answered === true}
              style={[styles.opt, showOk && styles.optOk]}
              onPress={() => {
                const ok = o === s.answer;
                setAnswered(ok);
                if (ok) onSolved();
              }}>
              <Text style={[styles.optText, showOk && styles.optTextOk]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
      {answered === true ? <Feedback ok text={s.feedback} /> : null}
      {answered === false ? <Feedback ok={false} text="Tekrar dene." /> : null}
    </>
  );
}

// --- Çoktan seçmeli (anlam / dönüşüm / zaman zarfı) ---
function ChoiceStage({ s, onSolved }: { s: ExamChoice; onSolved: () => void }) {
  const [answered, setAnswered] = useState<null | boolean>(null);
  return (
    <>
      <Text style={styles.prompt}>{s.question}</Text>
      <View style={{ gap: space.sm }}>
        {s.options.map((o) => {
          const showOk = answered === true && o.correct;
          return (
            <Pressable
              key={o.label}
              disabled={answered === true}
              style={[styles.choice, showOk && styles.choiceOk]}
              onPress={() => {
                setAnswered(o.correct);
                if (o.correct) onSolved();
              }}>
              <Text style={[styles.choiceLabel, showOk && { color: '#fff' }]}>{o.label}</Text>
              {showOk ? <Ionicons name="checkmark-circle" size={18} color="#fff" /> : null}
            </Pressable>
          );
        })}
      </View>
      {answered === true ? <Feedback ok text={s.explain} /> : null}
      {answered === false ? <Feedback ok={false} text="Tekrar dene." /> : null}
    </>
  );
}

// --- Hata tespiti (hangi cümlede hata var) ---
function ErrorChoiceStage({ s, onSolved }: { s: ExamErrorChoice; onSolved: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <>
      <Text style={styles.prompt}>{s.question}</Text>
      <View style={{ gap: space.sm }}>
        {s.options.map((o, i) => {
          const isPicked = picked === i;
          const reveal = picked !== null && o.correct; // hatali cumleyi acikla
          const wrongPick = isPicked && !o.correct;
          return (
            <Pressable
              key={i}
              disabled={picked !== null && s.options[picked].correct}
              style={[styles.choice, reveal && styles.choiceBad, wrongPick && styles.choiceWrong]}
              onPress={() => {
                setPicked(i);
                if (o.correct) onSolved();
              }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceLabel}>{o.label}</Text>
                {picked !== null && (reveal || isPicked) ? (
                  <Text style={[styles.choiceNote, o.correct ? styles.noteBad : styles.noteOk]}>{o.note}</Text>
                ) : null}
              </View>
              {reveal ? (
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
              ) : wrongPick ? (
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

// --- Cümle sıralama (soru kalıbı) ---
function ScrambleStage({ s, onSolved }: { s: ExamScramble; onSolved: () => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const done = picked.length === s.blocks.length;
  const assembled = picked.map((i) => s.blocks[i]);
  const correct = done && assembled.join(' ') === s.correct.join(' ');

  useEffect(() => {
    if (correct) onSolved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correct]);

  return (
    <>
      <View style={styles.promptBox}>
        <Text style={styles.rootHint}>Hedef Türkçe cümle</Text>
        <Text style={styles.prompt}>{s.targetTr}</Text>
      </View>
      <View style={[styles.tray, done && (correct ? styles.trayOk : styles.trayNo)]}>
        {picked.length === 0 ? (
          <Text style={styles.trayPh}>Kelimeleri sırayla dizin…</Text>
        ) : (
          assembled.map((w, i) => (
            <View key={i} style={styles.trayChip}>
              <Text style={styles.trayChipText}>{w}</Text>
            </View>
          ))
        )}
      </View>
      <View style={styles.chips}>
        {s.blocks.map((w, i) => {
          const used = picked.includes(i);
          return (
            <Pressable
              key={i}
              disabled={used}
              style={[styles.chip, used && styles.chipUsed]}
              onPress={() => setPicked((prev) => [...prev, i])}>
              <Text style={[styles.chipText, used && styles.chipTextUsed]}>{w}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.scrambleFoot}>
        <Pressable style={styles.resetBtn} onPress={() => setPicked([])} hitSlop={6}>
          <Ionicons name="refresh" size={14} color={colors.muted} />
          <Text style={styles.resetText}>Sıfırla</Text>
        </Pressable>
      </View>
      {done ? <Feedback ok={correct} text={correct ? s.feedback : 'Sıralama hatalı, sıfırlayıp tekrar dene.'} /> : null}
    </>
  );
}

function Feedback({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={[styles.fb, ok ? styles.fbOk : styles.fbNo]}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={17} color={ok ? colors.good : colors.danger} />
      <Text style={styles.fbText}>{text}</Text>
    </View>
  );
}

function Pill({ text, tone }: { text: string; tone?: 'teal' }) {
  return (
    <View style={[styles.pill, tone === 'teal' && styles.pillTeal]}>
      <Text style={[styles.pillText, tone === 'teal' && styles.pillTextTeal]}>{text}</Text>
    </View>
  );
}

function TopBar({ title, insets }: { title: string; insets: { top: number } }) {
  return (
    <View style={[styles.topbar, { paddingTop: insets.top + space.sm }]}>
      <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </Pressable>
      <View style={styles.topCenter}>
        <Text style={styles.topTitle}>06. Ders Sonu & Sınav</Text>
        <Text style={styles.topSub} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.iconBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  topSub: { fontSize: 12, fontWeight: '500', color: colors.muted },

  scroll: { padding: space.lg, gap: space.md },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  pill: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  pillTeal: { backgroundColor: colors.tealSoft, borderColor: 'transparent' },
  pillText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  pillTextTeal: { color: colors.teal },

  intro: { gap: 6 },
  h2: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.4, lineHeight: 28 },
  introText: { fontSize: 14, color: colors.muted, lineHeight: 21 },

  tabs: { flexDirection: 'row', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center' },
  tabOn: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  tabTextOn: { color: colors.ink, fontWeight: '800' },

  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  scorePills: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  passHint: { fontSize: 11, fontWeight: '700', color: colors.muted },
  passPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.good, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  passText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { fontSize: 12, fontWeight: '800', color: colors.ink },

  card: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  stageHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageDot: { width: 9, height: 9, borderRadius: radius.pill },
  stageTitle: { flex: 1, fontSize: 12, fontWeight: '800', color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.3 },
  stageCount: { fontSize: 11, color: colors.muted, fontWeight: '600' },

  promptBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, gap: 4 },
  prompt: { fontSize: 17, fontWeight: '600', color: colors.ink, lineHeight: 26 },
  rootHint: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  blank: { color: colors.accent, fontWeight: '800' },
  blankOk: { color: colors.good },

  optRow: { flexDirection: 'row', gap: space.sm },
  opt: { flex: 1, paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  optOk: { backgroundColor: colors.good, borderColor: colors.good },
  optText: { fontSize: 13, fontWeight: '800', color: colors.ink },
  optTextOk: { color: '#fff' },

  choice: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md },
  choiceOk: { backgroundColor: colors.good, borderColor: colors.good },
  choiceBad: { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' },
  choiceWrong: { borderColor: colors.lineStrong },
  choiceLabel: { fontSize: 14, fontWeight: '600', color: colors.ink, lineHeight: 20 },
  choiceNote: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  noteBad: { color: colors.danger },
  noteOk: { color: colors.muted },

  tray: { minHeight: 46, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  trayOk: { backgroundColor: '#ECFDF3', borderColor: '#ABEFC6' },
  trayNo: { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' },
  trayPh: { fontSize: 13, color: colors.muted, fontStyle: 'italic', paddingHorizontal: 4 },
  trayChip: { backgroundColor: colors.bg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 6 },
  trayChipText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: 12, paddingVertical: 8 },
  chipUsed: { opacity: 0.35 },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  chipTextUsed: { color: colors.muted },
  scrambleFoot: { flexDirection: 'row', justifyContent: 'flex-end' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetText: { fontSize: 12, color: colors.muted, fontWeight: '600' },

  fb: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.sm, padding: space.sm },
  fbOk: { backgroundColor: '#ECFDF3' },
  fbNo: { backgroundColor: '#FEF3F2' },
  fbText: { flex: 1, fontSize: 12.5, color: colors.ink, lineHeight: 18 },

  sumTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  sumFormula: { fontSize: 13, fontWeight: '700', color: colors.accent },
  sumEx: { fontSize: 15, fontWeight: '600', color: colors.ink, marginTop: 2 },
  sumTr: { fontSize: 12, color: colors.muted },
  verbChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  verbChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  verbChipText: { fontSize: 13, fontWeight: '700', color: colors.ink },

  fsrsHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fsrsIcon: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  fsrsTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  fsrsText: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  fsrsResult: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF3', borderRadius: radius.md, padding: space.md },
  fsrsResultText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink, lineHeight: 19 },
  fsrsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.accent, borderRadius: radius.md, height: 48 },
  fsrsBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  reviewLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 4 },
  reviewLinkText: { fontSize: 13, fontWeight: '800', color: colors.accent },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },

  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.accent, borderRadius: radius.md, height: 52 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
