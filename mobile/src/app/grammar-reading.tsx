import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { getGrammarLibrary } from '@/lib/db';
import { getGrammarLesson, ReadingTone, ReadingVerb } from '@/lib/grammarLessons';
import { getPoster } from '@/lib/posters';

// Gramer yol haritasi ADIM 4: Uzun Okuma & Baglam. TAM EKRAN.
// Kuratorlu hikaye (grammarLessons.reading). Seslendirme cihaz TTS'i (expo-speech);
// sahte "Oxford aksan"/sure iddiasi yok. Kelime sayisi metinden GERCEK hesaplanir.

// Ton -> renk eslemesi (fiil vurgusu + rozet).
function toneColors(tone: ReadingTone): { bg: string; fg: string } {
  if (tone === 'teal') return { bg: colors.tealSoft, fg: colors.teal };
  if (tone === 'green') return { bg: '#E7F7EF', fg: colors.good };
  return { bg: colors.accentSoft, fg: colors.accent };
}

export default function GrammarReadingScreen() {
  const p = useLocalSearchParams<{ key?: string; title?: string }>();
  const insets = useSafeAreaInsets();

  const lesson = useMemo(() => getGrammarLesson(p.key), [p.key]);
  const row = useMemo(() => getGrammarLibrary().find((r) => r.norm_pattern === p.key) ?? null, [p.key]);
  const title = row?.label_tr ?? p.title ?? '';
  const poster = row ? getPoster(row.poster_media) : null;
  const rd = lesson?.reading;

  const [rate, setRate] = useState(1.0);
  const [playing, setPlaying] = useState(false);
  const [verb, setVerb] = useState<ReadingVerb | null>(null);
  const [answered, setAnswered] = useState<null | boolean>(null);

  // GERCEK kelime sayisi (uydurma degil): tum paragraflarin duz metninden.
  const wordCount = useMemo(() => {
    if (!rd) return 0;
    return rd.paragraphs.reduce((n, pr) => n + pr.spoken.trim().split(/\s+/).length, 0);
  }, [rd]);

  function speakOne(text: string) {
    Speech.stop();
    setPlaying(false);
    Speech.speak(text, { language: 'en-US', rate });
  }

  function toggleAll() {
    if (playing) {
      Speech.stop();
      setPlaying(false);
      return;
    }
    if (!rd) return;
    const full = rd.paragraphs.map((pr) => pr.spoken).join(' ');
    setPlaying(true);
    Speech.speak(full, {
      language: 'en-US',
      rate,
      onDone: () => setPlaying(false),
      onStopped: () => setPlaying(false),
      onError: () => setPlaying(false),
    });
  }

  if (!rd) {
    return (
      <View style={styles.root}>
        <TopBar title={title} insets={insets} />
        <View style={styles.empty}>
          <Ionicons name="construct-outline" size={30} color={colors.muted} />
          <Text style={styles.emptyText}>Bu konunun okuma parçası henüz hazır değil.</Text>
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
        {/* Metadata pill seridi */}
        <View style={styles.pills}>
          {row?.cefr ? <Pill text={`${row.cefr} Seviye`} tone="gray" /> : null}
          <Pill text="Uzun Okuma & Bağlam" tone="teal" />
          {rd.minutes ? <Pill text={`${rd.minutes} dk`} tone="gray" /> : null}
          <Pill text={`${wordCount} kelime`} tone="gray" />
        </View>

        {/* Hikaye giris */}
        <View style={styles.intro}>
          <Text style={styles.storyTitle}>Geçmiş Zaman Hikayesi: {rd.storyTitle}</Text>
          <Text style={styles.introText}>{rd.intro}</Text>
        </View>

        {/* Hero gorsel */}
        {poster ? (
          <View style={styles.hero}>
            <Image source={poster} style={styles.heroImg} resizeMode="cover" />
            <View style={styles.heroTag}>
              <Ionicons name="book-outline" size={14} color={colors.accent} />
              <Text style={styles.heroTagText}>Bağlamsal okuma parçası · gerçek akış</Text>
            </View>
          </View>
        ) : null}

        {/* Sesli okuma kontrolu (cihaz TTS) */}
        <View style={styles.audioBar}>
          <View style={styles.audioLeft}>
            <Pressable style={styles.audioPlay} onPress={toggleAll} hitSlop={6}>
              <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#fff" />
            </Pressable>
            <View>
              <Text style={styles.audioTitle}>Sesli okuma</Text>
              <Text style={styles.audioSub}>Cihaz sesi · İngilizce</Text>
            </View>
          </View>
          <View style={styles.speedWrap}>
            {[0.8, 1.0].map((r) => {
              const on = rate === r;
              return (
                <Pressable key={r} style={[styles.speed, on && styles.speedOn]} onPress={() => setRate(r)}>
                  <Text style={[styles.speedText, on && styles.speedTextOn]}>{r.toFixed(1)}x</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Hikaye paragraflari (tiklanabilir fiiller) */}
        {rd.paragraphs.map((pr, pi) => (
          <View key={pi} style={styles.para}>
            <View style={styles.paraHead}>
              <Text style={styles.paraSection}>{pr.section}</Text>
              <Pressable style={styles.roundBtn} onPress={() => speakOne(pr.spoken)} hitSlop={8}>
                <Ionicons name="volume-high" size={16} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={styles.paraText}>
              {pr.segments.map((seg, si) => {
                if (typeof seg === 'string') return <Text key={si}>{seg}</Text>;
                const tc = toneColors(seg.verb.tone);
                return (
                  <Text
                    key={si}
                    onPress={() => {
                      setVerb(seg.verb);
                      speakOne(seg.verb.v2);
                    }}
                    style={[styles.verbHi, { backgroundColor: tc.bg, color: tc.fg }]}>
                    {seg.verb.v2}
                  </Text>
                );
              })}
            </Text>
          </View>
        ))}

        {/* Fiil inceleyici kutusu */}
        {verb ? (
          <View style={styles.inspector}>
            <View style={styles.inspectorTop}>
              <View style={styles.inspectorLeft}>
                <Ionicons name="information-circle" size={20} color={colors.accent} />
                <Text style={styles.inspBase}>{verb.base}</Text>
                <Text style={styles.inspArrow}>→</Text>
                <Text style={styles.inspV2}>{verb.v2}</Text>
              </View>
              <View style={styles.inspTypeTag}>
                <Text style={styles.inspTypeText}>{verb.type}</Text>
              </View>
            </View>
            <Text style={styles.inspMeaning}>Türkçe karşılığı: "{verb.tr}"</Text>
          </View>
        ) : null}

        {/* One cikan fiil donusumleri */}
        {rd.highlights?.length ? (
          <View style={styles.section}>
            <View style={styles.secHead}>
              <Text style={styles.h3}>Hikayedeki Öne Çıkan Fiiller</Text>
              <Text style={styles.secCount}>{rd.highlights.length} yapı</Text>
            </View>
            <View style={styles.hlGrid}>
              {rd.highlights.map((h) => {
                const tc = toneColors(h.tone);
                return (
                  <View key={h.from} style={styles.hlCard}>
                    <View style={styles.hlTop}>
                      <Text style={styles.hlPair}>
                        {h.from} → {h.to}
                      </Text>
                      <Text style={[styles.hlType, { color: tc.fg }]}>{h.type}</Text>
                    </View>
                    <Text style={styles.hlNote}>{h.note}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Baglamsal anlama kontrolu */}
        {rd.quiz ? (
          <View style={styles.card}>
            <View style={styles.quizHead}>
              <Ionicons name="flash" size={18} color={colors.accent} />
              <Text style={styles.quizKicker}>BAĞLAMSAL ANLAMA KONTROLÜ</Text>
            </View>
            <Text style={styles.quizQ}>{rd.quiz.question}</Text>
            {rd.quiz.questionEn ? <Text style={styles.quizQEn}>"{rd.quiz.questionEn}"</Text> : null}

            <View style={styles.quizOpts}>
              {rd.quiz.options.map((o) => {
                const showOk = answered === true && o.correct;
                const showNo = answered === false && o.correct === false;
                return (
                  <Pressable
                    key={o.label}
                    disabled={answered === true}
                    style={[styles.quizOpt, showOk && styles.quizOptOk]}
                    onPress={() => setAnswered(o.correct)}>
                    <Text style={[styles.quizOptText, showOk && styles.quizOptTextOk]}>{o.label}</Text>
                    {showOk ? <Ionicons name="checkmark-circle" size={18} color="#fff" /> : null}
                    {showNo ? null : null}
                  </Pressable>
                );
              })}
            </View>

            {answered === true ? (
              <View style={styles.notice}>
                <Ionicons name="checkmark-circle" size={18} color={colors.good} />
                <Text style={styles.noticeText}>{rd.quiz.notice}</Text>
              </View>
            ) : null}
            {answered === false ? (
              <View style={[styles.notice, styles.noticeNo]}>
                <Ionicons name="close-circle" size={18} color={colors.danger} />
                <Text style={styles.noticeText}>Metni tekrar oku ve dene.</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Ogrenme ipucu */}
        {rd.tip ? (
          <View style={styles.tipBox}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb-outline" size={18} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{rd.tip.title}</Text>
              <Text style={styles.tipText}>{rd.tip.text}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Sabit alt: Adim 5 (ses kaydi) varsa oraya gec, yoksa yol haritasina don */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + space.sm }]}>
        <Pressable
          style={styles.cta}
          onPress={() => {
            Speech.stop();
            if (lesson?.recording) {
              router.replace(
                `/grammar-record?key=${encodeURIComponent(p.key ?? '')}&title=${encodeURIComponent(title)}`,
              );
            } else {
              router.back();
            }
          }}>
          <Ionicons name={lesson?.recording ? 'arrow-forward' : 'checkmark-circle'} size={20} color="#fff" />
          <Text style={styles.ctaText}>
            {lesson?.recording ? 'Okudum · 05. Adıma geç' : 'Okumayı tamamladım · Yol haritasına dön'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Pill({ text, tone }: { text: string; tone: 'gray' | 'teal' }) {
  return (
    <View style={[styles.pill, tone === 'teal' && styles.pillTeal]}>
      <Text style={[styles.pillText, tone === 'teal' && styles.pillTextTeal]}>{text}</Text>
    </View>
  );
}

function TopBar({ title, insets }: { title: string; insets: { top: number } }) {
  return (
    <View style={[styles.topbar, { paddingTop: insets.top + space.sm }]}>
      <Pressable
        style={styles.iconBtn}
        onPress={() => {
          Speech.stop();
          router.back();
        }}
        hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </Pressable>
      <View style={styles.topCenter}>
        <Text style={styles.topTitle}>04. Uzun Okuma</Text>
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

  scroll: { padding: space.lg, gap: space.lg },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  pill: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  pillTeal: { backgroundColor: colors.tealSoft, borderColor: 'transparent' },
  pillText: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.3 },
  pillTextTeal: { color: colors.teal },

  intro: { gap: 6 },
  storyTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5, lineHeight: 30 },
  introText: { fontSize: 14, color: colors.muted, lineHeight: 21 },

  hero: { width: '100%', height: 200, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  heroImg: { width: '100%', height: '100%' },
  heroTag: { position: 'absolute', bottom: space.sm, left: space.sm, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  heroTagText: { fontSize: 11, fontWeight: '700', color: colors.ink },

  audioBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md },
  audioLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  audioPlay: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  audioTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  audioSub: { fontSize: 11, color: colors.muted },
  speedWrap: { flexDirection: 'row', gap: 2, backgroundColor: colors.surface, borderRadius: radius.pill, padding: 3 },
  speed: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  speedOn: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  speedText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  speedTextOn: { color: colors.ink },

  para: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  paraHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paraSection: { fontSize: 11, fontWeight: '800', color: colors.teal, textTransform: 'uppercase', letterSpacing: 0.5 },
  roundBtn: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  paraText: { fontSize: 16, color: colors.ink, lineHeight: 29 },
  verbHi: { fontWeight: '700', borderRadius: radius.sm, overflow: 'hidden' },

  inspector: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, gap: 4 },
  inspectorTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inspectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  inspBase: { fontSize: 14, fontWeight: '800', color: colors.ink },
  inspArrow: { color: colors.muted },
  inspV2: { fontSize: 14, fontWeight: '800', color: colors.accent },
  inspTypeTag: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  inspTypeText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  inspMeaning: { fontSize: 12, color: colors.muted },

  section: { gap: space.sm },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h3: { fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  secCount: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  hlGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hlCard: { width: '48%', flexGrow: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.sm, gap: 2 },
  hlTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hlPair: { fontSize: 13, fontWeight: '800', color: colors.ink },
  hlType: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  hlNote: { fontSize: 11, color: colors.muted },

  card: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  quizHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quizKicker: { fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 0.4 },
  quizQ: { fontSize: 14, fontWeight: '700', color: colors.ink, lineHeight: 20 },
  quizQEn: { fontSize: 12, fontStyle: 'italic', color: colors.muted },
  quizOpts: { gap: space.sm, marginTop: 4 },
  quizOpt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md },
  quizOptOk: { backgroundColor: colors.good, borderColor: colors.good },
  quizOptText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  quizOptTextOk: { color: '#fff', fontWeight: '700' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF3', borderRadius: radius.sm, padding: space.sm },
  noticeNo: { backgroundColor: '#FEF3F2' },
  noticeText: { flex: 1, fontSize: 12.5, color: colors.ink, lineHeight: 18 },

  tipBox: { flexDirection: 'row', gap: space.md, backgroundColor: colors.tealSoft, borderRadius: radius.lg, padding: space.lg },
  tipIcon: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  tipText: { fontSize: 13, color: colors.muted, lineHeight: 20, marginTop: 2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },

  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.accent, borderRadius: radius.md, height: 52 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
