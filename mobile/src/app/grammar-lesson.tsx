import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { getGrammarLibrary } from '@/lib/db';
import { getGrammarLesson, LessonStructure } from '@/lib/grammarLessons';
import { getPoster } from '@/lib/posters';

// Gramer yol haritasi ADIM 1: Konu Ogretimi.
// Icerik grammarLessons.ts'ten gelir; bulunmayan bolumler cizilmez.
// Ingilizce seslendirme icin expo-speech (uygulama genelinde kullanilan yol).

function speak(text: string, rate = 0.85) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate });
}

// Vurgulanacak parcalari kalinlastirarak cumleyi cizer.
function highlighted(text: string, marks?: string[]) {
  if (!marks || marks.length === 0) return <Text>{text}</Text>;
  const escaped = marks.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(re);
  return (
    <Text>
      {parts.map((part, i) =>
        marks.includes(part) ? (
          <Text key={i} style={styles.exHi}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

export default function GrammarLessonScreen() {
  const p = useLocalSearchParams<{ key?: string; title?: string }>();
  const insets = useSafeAreaInsets();

  const lesson = useMemo(() => getGrammarLesson(p.key), [p.key]);
  const row = useMemo(() => getGrammarLibrary().find((r) => r.norm_pattern === p.key) ?? null, [p.key]);
  const title = row?.label_tr ?? p.title ?? '';
  const poster = row ? getPoster(row.poster_media) : null;

  const [answered, setAnswered] = useState<null | boolean>(null); // quiz: null / dogru / yanlis

  // Icerik yoksa (kilitli konu) durustce bildir.
  if (!lesson) {
    return (
      <View style={styles.root}>
        <TopBar title={title} insets={insets} />
        <View style={styles.empty}>
          <Ionicons name="construct-outline" size={30} color={colors.muted} />
          <Text style={styles.emptyText}>Bu konunun öğretim içeriği henüz hazır değil.</Text>
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
        {/* Konu & baglam kart */}
        <View style={styles.card}>
          <View style={styles.banner}>
            {poster ? (
              <Image source={poster} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.bannerFallback]}>
                <Ionicons name="git-branch" size={30} color={colors.teal} />
              </View>
            )}
            <View style={styles.bannerRow}>
              {row?.cefr ? (
                <View style={styles.bannerBadge}>
                  <Text style={styles.bannerBadgeText}>{row.cefr} Seviye</Text>
                </View>
              ) : null}
              {lesson.minutes ? (
                <View style={styles.bannerTime}>
                  <Ionicons name="time-outline" size={13} color="#fff" />
                  <Text style={styles.bannerTimeText}>{lesson.minutes} dk</Text>
                </View>
              ) : null}
            </View>
          </View>

          <Text style={styles.h2}>{title} Mantığı</Text>
          <Text style={styles.para}>{splitStrong(lesson.summary, lesson.summaryStrong)}</Text>

          {lesson.timeMarkers?.length ? (
            <View style={styles.markersWrap}>
              <View style={styles.markersHead}>
                <Ionicons name="alarm-outline" size={15} color={colors.accent} />
                <Text style={styles.markersHeadText}>Sık kullanılan zaman zarfları</Text>
              </View>
              <View style={styles.chips}>
                {lesson.timeMarkers.map((m) => (
                  <View key={m} style={styles.chip}>
                    <Text style={styles.chipText}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Yapi formulleri (uc stacked kart: olumlu/olumsuz/soru) */}
        {lesson.structures?.length ? (
          <View style={styles.section}>
            <View style={styles.secHead}>
              <View>
                <Text style={styles.h3}>3 Temel Durum Formülü</Text>
                <Text style={styles.secSub}>Cümle türlerine göre sıralı formül ve kurallar</Text>
              </View>
              <View style={styles.pillCount}>
                <Text style={styles.pillCountText}>Tüm Yapılar</Text>
              </View>
            </View>

            {lesson.structures.map((s) => (
              <StructureCard key={s.key} s={s} />
            ))}
          </View>
        ) : null}

        {/* Fiil donusumleri */}
        {lesson.verbForms ? (
          <View style={styles.card}>
            <Text style={styles.h3}>Fiil Dönüşüm Kuralları</Text>
            <Text style={styles.secSub}>Düzenli (+ed) ve düzensiz (kökten değişen) fiiller</Text>

            {lesson.verbForms.regular ? (
              <VerbColumn dotColor={colors.good} data={lesson.verbForms.regular} tag="Kural var" />
            ) : null}
            {lesson.verbForms.irregular ? (
              <VerbColumn dotColor={colors.accent} data={lesson.verbForms.irregular} tag="Kökten değişir" />
            ) : null}

            {lesson.verbForms.note ? (
              <View style={styles.noteBox}>
                <Ionicons name="school-outline" size={18} color={colors.ink} style={{ marginTop: 1 }} />
                <Text style={styles.noteText}>
                  <Text style={styles.tipStrong}>Öğrenme stratejisi: </Text>
                  {lesson.verbForms.note}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Hizli kavrama testi */}
        {lesson.quiz ? (
          <View style={styles.card}>
            <View style={styles.secHead}>
              <View style={styles.quizTitleRow}>
                <View style={styles.quizNo}>
                  <Text style={styles.quizNoText}>1</Text>
                </View>
                <View>
                  <Text style={styles.h3}>Hızlı Kavrama Testi</Text>
                  <Text style={styles.secSub}>Kuralı anında uygula</Text>
                </View>
              </View>
            </View>

            <View style={styles.quizPromptBox}>
              <View style={styles.quizPromptHead}>
                <Text style={styles.exKicker}>BOŞLUĞU DOLDUR</Text>
                <Pressable style={styles.quizListen} onPress={() => speak(lesson.quiz!.spoken)} hitSlop={8}>
                  <Ionicons name="volume-high" size={16} color={colors.muted} />
                  <Text style={styles.quizListenText}>Dinle</Text>
                </Pressable>
              </View>
              <Text style={styles.quizPrompt}>
                {renderPrompt(lesson.quiz.prompt, answered ? lesson.quiz.blankAnswer : '_____', answered === true)}
              </Text>
              {lesson.quiz.translation ? <Text style={styles.quizTr}>{lesson.quiz.translation}</Text> : null}
            </View>

            <View style={styles.quizOptions}>
              {lesson.quiz.options.map((o) => {
                const showCorrect = answered === true && o.correct;
                return (
                  <Pressable
                    key={o.label}
                    disabled={answered === true}
                    style={[styles.quizBtn, showCorrect && styles.quizBtnCorrect]}
                    onPress={() => {
                      setAnswered(o.correct);
                      if (o.correct) speak(lesson.quiz!.spoken);
                    }}>
                    <Text style={[styles.quizBtnText, showCorrect && styles.quizBtnTextCorrect]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {answered !== null ? (
              <View style={[styles.fbBox, answered ? styles.fbOk : styles.fbNo]}>
                <Ionicons
                  name={answered ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={answered ? colors.good : colors.danger}
                  style={{ marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fbTitle, { color: answered ? colors.good : colors.danger }]}>
                    {answered ? 'Doğru cevap!' : 'Tekrar dene'}
                  </Text>
                  <Text style={styles.fbText}>{answered ? lesson.quiz.explainCorrect : lesson.quiz.explainWrong}</Text>
                  {!answered ? (
                    <Pressable onPress={() => setAnswered(null)} style={styles.retry}>
                      <Text style={styles.retryText}>Tekrar dene</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Sabit alt: 02. Adima gec */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + space.sm }]}>
        <Text style={styles.dockHint}>
          Sıradaki: <Text style={styles.dockHintStrong}>02. Örnek Cümleler</Text>
        </Text>
        <Pressable
          style={styles.cta}
          onPress={() =>
            router.replace(
              `/grammar-examples?key=${encodeURIComponent(p.key ?? '')}&title=${encodeURIComponent(title)}`,
            )
          }>
          <Text style={styles.ctaText}>Anladım · 02. Adıma geç</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

// Tek yapi karti (olumlu/olumsuz/soru): numara + baslik + formul denklemi + ornek + ipucu.
function StructureCard({ s }: { s: LessonStructure }) {
  const red = s.tipTone === 'red';
  return (
    <View style={styles.structCard}>
      <View style={styles.structHead}>
        <View style={styles.structHeadLeft}>
          <View style={[styles.structNum, red && styles.structNumRed]}>
            <Text style={[styles.structNumText, red && styles.structNumTextRed]}>{s.num}</Text>
          </View>
          <Text style={styles.structTitle}>
            {s.title} <Text style={styles.structSub}>({s.subtitle})</Text>
          </Text>
        </View>
        <View style={styles.structTag}>
          <Text style={styles.structTagText}>{s.metaTag}</Text>
        </View>
      </View>

      {/* Akan formul denklemi */}
      <View style={styles.formula}>
        {s.formula.map((t, i) => (
          <View key={i} style={styles.formulaItem}>
            {i > 0 ? <Text style={styles.formulaPlus}>+</Text> : null}
            <Text
              style={[
                styles.fToken,
                t.style === 'accent' && styles.fAccent,
                t.style === 'neutral' && styles.fNeutral,
                t.style === 'muted' && styles.fMuted,
              ]}>
              {t.text}
            </Text>
          </View>
        ))}
      </View>

      {/* Canli ornek + dinle */}
      <View style={styles.exBox}>
        <View style={styles.exTextWrap}>
          <Text style={styles.exKicker}>CANLI ÖRNEK</Text>
          <Text style={styles.exText}>{highlighted(s.example.text, s.example.highlight)}</Text>
          <Text style={styles.exTr}>{s.example.translation}</Text>
        </View>
        <Pressable style={styles.speakBtn} onPress={() => speak(s.example.spoken)} hitSlop={8}>
          <Ionicons name="volume-high" size={20} color={colors.ink} />
        </Pressable>
      </View>

      {s.tip ? (
        <View style={[styles.tipBox, red && styles.tipBoxRed]}>
          <Ionicons
            name={red ? 'alert-circle-outline' : 'bulb-outline'}
            size={18}
            color={red ? colors.accent : colors.warning}
            style={{ marginTop: 1 }}
          />
          <Text style={[styles.tipText, red && styles.tipTextRed]}>
            <Text style={styles.tipStrong}>{red ? 'Kritik kural: ' : 'İpucu: '}</Text>
            {s.tip}
          </Text>
        </View>
      ) : null}
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
        <Text style={styles.topTitle}>01. Konu Öğretimi</Text>
        <Text style={styles.topSub} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.iconBtn} />
    </View>
  );
}

function VerbColumn({
  data,
  dotColor,
  tag,
}: {
  data: { title: string; desc: string; items: { from: string; to: string; note?: string }[]; formula?: string };
  dotColor: string;
  tag: string;
}) {
  return (
    <View style={styles.verbCol}>
      <View style={styles.verbHead}>
        <View style={styles.verbHeadLeft}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.verbTitle}>{data.title}</Text>
        </View>
        <Text style={[styles.verbTag, { color: dotColor }]}>{tag}</Text>
      </View>
      <Text style={styles.verbDesc}>{data.desc}</Text>
      {data.items.map((it) => (
        <View key={it.from} style={styles.verbRow}>
          <Text style={styles.verbFrom}>{it.from}</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.muted} />
          <Text style={[styles.verbTo, { color: dotColor }]}>
            {it.to}
            {it.note ? <Text style={styles.verbNote}> {it.note}</Text> : null}
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => speak(it.to, 0.9)} hitSlop={8}>
            <Ionicons name="volume-high" size={17} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      {data.formula ? (
        <Text style={styles.verbFormula}>
          Formül: <Text style={styles.verbFormulaStrong}>{data.formula}</Text>
        </Text>
      ) : null}
    </View>
  );
}

// Paragrafta bir bolumu kalinlastir (summaryStrong).
function splitStrong(text: string, strong?: string) {
  if (!strong || !text.includes(strong)) return text;
  const [a, b] = text.split(strong);
  return (
    <>
      {a}
      <Text style={styles.paraStrong}>{strong}</Text>
      {b}
    </>
  );
}

// Quiz cumlesini {blank} yerine pill koyarak ciz.
function renderPrompt(prompt: string, blank: string, correct: boolean) {
  const [a, b] = prompt.split('{blank}');
  return (
    <>
      {a}
      <Text style={[styles.blank, correct && styles.blankCorrect]}> {blank} </Text>
      {b}
    </>
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

  scroll: { padding: space.lg, gap: space.lg },

  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.md,
  },

  banner: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  bannerFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealSoft },
  bannerRow: { position: 'absolute', bottom: space.sm, left: space.sm, right: space.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerBadge: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  bannerBadgeText: { fontSize: 11, fontWeight: '800', color: colors.ink, letterSpacing: 0.3 },
  bannerTime: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  bannerTimeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  h2: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.4, lineHeight: 26 },
  para: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  paraStrong: { color: colors.ink, fontWeight: '700' },

  markersWrap: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md, gap: space.sm },
  markersHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  markersHeadText: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.ink },

  section: { gap: space.md },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h3: { fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  secSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pillCount: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillCountText: { fontSize: 11, fontWeight: '800', color: colors.accent },

  structCard: { backgroundColor: colors.bg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md },
  structHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  structHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  structNum: { width: 24, height: 24, borderRadius: radius.pill, backgroundColor: '#ECFDF3', borderWidth: 1, borderColor: '#ABEFC6', alignItems: 'center', justifyContent: 'center' },
  structNumRed: { backgroundColor: colors.accentSoft, borderColor: 'rgba(255,56,92,0.3)' },
  structNumText: { fontSize: 12, fontWeight: '800', color: colors.good },
  structNumTextRed: { color: colors.accent },
  structTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink },
  structSub: { fontSize: 12, fontWeight: '500', color: colors.muted },
  structTag: { backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  structTagText: { fontSize: 11, fontWeight: '700', color: colors.muted },

  formula: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 8, gap: 4 },
  formulaItem: { flexDirection: 'row', alignItems: 'center' },
  formulaPlus: { fontWeight: '800', color: colors.lineStrong, fontSize: 15, paddingHorizontal: 5 },
  fToken: { fontSize: 13, fontWeight: '700', color: colors.ink },
  fAccent: { color: colors.accent, fontWeight: '800', backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: 'rgba(255,56,92,0.3)', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  fNeutral: { color: colors.ink, fontWeight: '800', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  fMuted: { color: colors.muted, fontWeight: '500' },

  exBox: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md },
  exTextWrap: { flex: 1, gap: 2 },
  exKicker: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.4 },
  exText: { fontSize: 15, fontWeight: '600', color: colors.ink, lineHeight: 22 },
  exHi: { color: colors.accent, fontWeight: '800' },
  exTr: { fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  speakBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },

  tipBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FFF8E6', borderWidth: 1, borderColor: '#FCE4A6', borderRadius: radius.md, padding: space.md },
  tipBoxRed: { backgroundColor: colors.accentSoft, borderColor: 'rgba(255,56,92,0.3)' },
  tipText: { flex: 1, fontSize: 12.5, color: '#7A5B00', lineHeight: 19 },
  tipTextRed: { color: '#8A2530' },
  tipStrong: { fontWeight: '800' },

  verbCol: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, gap: space.sm },
  verbHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  verbHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  verbTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  verbTag: { fontSize: 11, fontWeight: '700' },
  verbDesc: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  verbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 9 },
  verbFrom: { fontSize: 13, fontWeight: '600', color: colors.muted, minWidth: 46 },
  verbTo: { fontSize: 13, fontWeight: '800' },
  verbNote: { fontSize: 10, fontWeight: '500', color: colors.muted },
  verbFormula: { fontSize: 11, fontWeight: '600', color: colors.muted, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 8 },
  verbFormulaStrong: { fontWeight: '800', color: colors.ink },

  noteBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md },
  noteText: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 19 },

  quizTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  quizNo: { width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  quizNoText: { fontSize: 12, fontWeight: '800', color: colors.accent },
  quizPromptBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, gap: 6 },
  quizPromptHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quizListen: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quizListenText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  quizPrompt: { fontSize: 17, fontWeight: '600', color: colors.ink, lineHeight: 26 },
  quizTr: { fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  blank: { color: colors.accent, fontWeight: '800' },
  blankCorrect: { color: colors.good },

  quizOptions: { flexDirection: 'row', gap: space.sm },
  quizBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  quizBtnCorrect: { backgroundColor: colors.good, borderColor: colors.good },
  quizBtnText: { fontSize: 14, fontWeight: '800', color: colors.ink },
  quizBtnTextCorrect: { color: '#fff' },

  fbBox: { flexDirection: 'row', gap: 8, borderRadius: radius.md, padding: space.md, borderWidth: 1 },
  fbOk: { backgroundColor: '#ECFDF3', borderColor: '#ABEFC6' },
  fbNo: { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' },
  fbTitle: { fontSize: 13, fontWeight: '800' },
  fbText: { fontSize: 12.5, color: colors.ink, marginTop: 2, lineHeight: 18 },
  retry: { marginTop: 6 },
  retryText: { fontSize: 12, fontWeight: '800', color: colors.accent },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },

  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line, gap: space.sm },
  dockHint: { fontSize: 12, color: colors.muted },
  dockHintStrong: { fontWeight: '800', color: colors.ink },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.accent, borderRadius: radius.md, height: 52 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
