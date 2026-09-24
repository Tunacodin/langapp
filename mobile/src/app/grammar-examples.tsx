import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { addSrsCard, getGrammarLibrary } from '@/lib/db';
import { ExampleCard, getGrammarLesson } from '@/lib/grammarLessons';
import { getPoster } from '@/lib/posters';

// Gramer yol haritasi ADIM 2: Ornek Cumleler.
// Icerik grammarLessons.ts'ten (kuratorlu). Kaydet butonu cumleyi GERCEK olarak
// SRS'e ekler (chunk karti, INSERT OR IGNORE -> tekrarsiz).

function speak(text: string, rate = 0.85) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate });
}

function highlighted(text: string, marks?: string[]) {
  if (!marks || marks.length === 0) return <Text>{text}</Text>;
  const escaped = marks.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(re);
  return (
    <Text>
      {parts.map((part, i) =>
        marks.includes(part) ? (
          <Text key={i} style={styles.hi}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

export default function GrammarExamplesScreen() {
  const p = useLocalSearchParams<{ key?: string; title?: string }>();
  const insets = useSafeAreaInsets();

  const lesson = useMemo(() => getGrammarLesson(p.key), [p.key]);
  const row = useMemo(() => getGrammarLibrary().find((r) => r.norm_pattern === p.key) ?? null, [p.key]);
  const title = row?.label_tr ?? p.title ?? '';
  const poster = row ? getPoster(row.poster_media) : null;
  const ex = lesson?.examples;

  const [tab, setTab] = useState(0);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [answered, setAnswered] = useState<null | boolean>(null);

  function save(card: ExampleCard) {
    if (saved.has(card.en)) return;
    addSrsCard({ front_type: 'chunk', front_en: card.en, back_tr: card.tr, source: 'grammar' });
    setSaved((s) => new Set(s).add(card.en));
  }

  if (!ex) {
    return (
      <View style={styles.root}>
        <TopBar title={title} insets={insets} />
        <View style={styles.empty}>
          <Ionicons name="construct-outline" size={30} color={colors.muted} />
          <Text style={styles.emptyText}>Bu konunun örnek cümleleri henüz hazır değil.</Text>
        </View>
      </View>
    );
  }

  const activeTab = ex.tabs[tab];

  return (
    <View style={styles.root}>
      <TopBar title={title} insets={insets} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}>
        {/* Baglam kart */}
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={styles.badgesLeft}>
              {row?.cefr ? (
                <View style={[styles.badge, styles.badgeRed]}>
                  <Text style={[styles.badgeText, { color: colors.accent }]}>{row.cefr} Seviye</Text>
                </View>
              ) : null}
              <View style={[styles.badge, styles.badgeGray]}>
                <Text style={[styles.badgeText, { color: colors.ink }]}>Örnek Cümleler</Text>
              </View>
            </View>
            {ex.minutes ? (
              <View style={styles.time}>
                <Ionicons name="time-outline" size={14} color={colors.muted} />
                <Text style={styles.timeText}>{ex.minutes} dk</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.h2}>{title}: Örnek Cümleler</Text>
          <Text style={styles.intro}>{ex.intro}</Text>

          {poster ? (
            <View style={styles.banner}>
              <Image source={poster} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.bannerCaption}>
                <Ionicons name="chatbubbles" size={15} color="#fff" />
                <Text style={styles.bannerCaptionText}>Doğal bağlam ve gerçek günlük cümleler</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Sekme secici */}
        <View style={styles.tabs}>
          {ex.tabs.map((t, i) => {
            const on = i === tab;
            return (
              <Pressable key={t.key} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(i)}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.tabLabel}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Gruplar + kartlar */}
        {activeTab.groups.map((g, gi) => {
          const gColor = g.color === 'red' ? colors.accent : colors.teal;
          const gBg = g.color === 'red' ? colors.accentSoft : colors.tealSoft;
          return (
            <View key={gi} style={styles.group}>
              <View style={styles.groupHead}>
                <View style={styles.groupTitleWrap}>
                  <View style={[styles.dot, { backgroundColor: gColor }]} />
                  <Text style={styles.groupTitle}>{g.title}</Text>
                </View>
                <Text style={styles.groupTag}>{g.tag}</Text>
              </View>

              {g.cards.map((c) => {
                const isSaved = saved.has(c.en);
                return (
                  <View key={c.en} style={styles.exCard}>
                    <View style={styles.exTop}>
                      <Text style={styles.exEn}>{highlighted(c.en, c.highlight)}</Text>
                      <View style={styles.exActions}>
                        <Pressable onPress={() => speak(c.en)} hitSlop={6}>
                          <Ionicons name="volume-high" size={19} color={colors.muted} />
                        </Pressable>
                        <Pressable onPress={() => save(c)} hitSlop={6}>
                          <Ionicons
                            name={isSaved ? 'bookmark' : 'bookmark-outline'}
                            size={19}
                            color={isSaved ? colors.accent : colors.muted}
                          />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={styles.exTr}>{c.tr}</Text>
                    <View style={styles.exFoot}>
                      <View style={[styles.exBadge, { backgroundColor: gBg }]}>
                        <Text style={[styles.exBadgeText, { color: gColor }]}>{c.badge}</Text>
                      </View>
                      <Text style={styles.exMeta}>{c.meta}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Hizli pekistirme testi */}
        {ex.quiz ? (
          <View style={styles.card}>
            <View style={styles.quizHead}>
              <Ionicons name="flash" size={18} color={colors.accent} />
              <Text style={styles.h3}>Hızlı Cümle Pekiştirme</Text>
            </View>
            <Text style={styles.quizAsk}>Parantez içindeki fiili doğru geçmiş zaman çekimiyle tamamla:</Text>

            <View style={styles.quizPromptBox}>
              <Text style={styles.quizPrompt}>
                {renderPrompt(ex.quiz.prompt, answered ? ex.quiz.blankAnswer : '_____', answered === true)}
              </Text>
              <Pressable onPress={() => speak(ex.quiz!.spoken)} hitSlop={8}>
                <Ionicons name="volume-high" size={20} color={colors.muted} />
              </Pressable>
            </View>

            <View style={styles.quizOptions}>
              {ex.quiz.options.map((o) => {
                const showCorrect = answered === true && o.correct;
                return (
                  <Pressable
                    key={o.label}
                    disabled={answered === true}
                    style={[styles.quizBtn, showCorrect && styles.quizBtnCorrect]}
                    onPress={() => {
                      setAnswered(o.correct);
                      if (o.correct) speak(ex.quiz!.spoken);
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
                    {answered ? 'Harika, doğru!' : 'Tekrar dene'}
                  </Text>
                  <Text style={styles.fbText}>{answered ? ex.quiz.explainCorrect : ex.quiz.explainWrong}</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Sabit alt: 03. Adima gec (video kesitleri + pratik) */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + space.sm }]}>
        <Text style={styles.dockHint}>
          Sıradaki: <Text style={styles.dockHintStrong}>03. Video Kesitleri & Pratik</Text>
        </Text>
        <Pressable
          style={styles.cta}
          onPress={() =>
            router.replace(
              `/grammar-video?key=${encodeURIComponent(p.key ?? '')}&title=${encodeURIComponent(title)}`,
            )
          }>
          <Text style={styles.ctaText}>İnceledim · 03. Adıma geç</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </View>
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
        <Text style={styles.topTitle}>02. Örnek Cümleler</Text>
        <Text style={styles.topSub} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.iconBtn} />
    </View>
  );
}

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

  scroll: { padding: space.lg, gap: space.md },

  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badgesLeft: { flexDirection: 'row', gap: 6 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeRed: { backgroundColor: colors.accentSoft },
  badgeGray: { backgroundColor: colors.surface },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, color: colors.muted, fontWeight: '600' },

  h2: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.4, marginTop: 2 },
  intro: { fontSize: 13, color: colors.muted, lineHeight: 20 },

  banner: { width: '100%', height: 140, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, marginTop: 4 },
  bannerCaption: { position: 'absolute', bottom: space.sm, left: space.sm, right: space.sm, flexDirection: 'row', alignItems: 'center', gap: 6 },
  bannerCaptionText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  tabs: { flexDirection: 'row', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center' },
  tabOn: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  tabTextOn: { color: colors.ink, fontWeight: '800' },

  group: { gap: space.sm },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  groupTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: radius.pill },
  groupTitle: { fontSize: 12.5, fontWeight: '800', color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.3, flex: 1 },
  groupTag: { fontSize: 11, fontWeight: '600', color: colors.muted },

  exCard: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.md, gap: space.sm },
  exTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  exEn: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.ink, lineHeight: 23 },
  exActions: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: 2 },
  hi: { fontWeight: '800', color: colors.accent },
  exTr: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  exFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.line },
  exBadge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  exBadgeText: { fontSize: 11, fontWeight: '700' },
  exMeta: { fontSize: 11, color: colors.muted, fontWeight: '500', flexShrink: 1, textAlign: 'right' },

  quizHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  h3: { fontSize: 15, fontWeight: '800', color: colors.ink },
  quizAsk: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  quizPromptBox: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md },
  quizPrompt: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.ink, lineHeight: 24 },
  blank: { color: colors.accent, fontWeight: '800' },
  blankCorrect: { color: colors.good },

  quizOptions: { flexDirection: 'row', gap: space.sm },
  quizBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  quizBtnCorrect: { backgroundColor: colors.good, borderColor: colors.good },
  quizBtnText: { fontSize: 14, fontWeight: '800', color: colors.ink },
  quizBtnTextCorrect: { color: '#fff' },

  fbBox: { flexDirection: 'row', gap: 8, borderRadius: radius.md, padding: space.md, borderWidth: 1 },
  fbOk: { backgroundColor: '#ECFDF3', borderColor: '#ABEFC6' },
  fbNo: { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' },
  fbTitle: { fontSize: 13, fontWeight: '800' },
  fbText: { fontSize: 12.5, color: colors.ink, marginTop: 2, lineHeight: 18 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },

  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line, gap: space.sm },
  dockHint: { fontSize: 12, color: colors.muted },
  dockHintStrong: { fontWeight: '800', color: colors.ink },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.accent, borderRadius: radius.md, height: 52 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
