import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { getGrammarLibrary } from '@/lib/db';
import { getGrammarLesson } from '@/lib/grammarLessons';
import { getPoster } from '@/lib/posters';
import { useSpeechAssessment } from '@/lib/useSpeechAssessment';

// Gramer yol haritasi ADIM 5: Cumle cumle ses kaydi. TAM EKRAN.
// Telaffuz puani + kelime skorlari GERCEK (Azure, useSpeechAssessment). Azure
// ayarli degilse dinle-tekrarla moduna duser (hook error verir). Sahte skor yok.

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

// Puan -> renk (gercek skor tonu).
function scoreColor(n: number) {
  if (n >= 80) return colors.good;
  if (n >= 50) return colors.warning;
  return colors.danger;
}

export default function GrammarRecordScreen() {
  const p = useLocalSearchParams<{ key?: string; title?: string }>();
  const insets = useSafeAreaInsets();

  const lesson = useMemo(() => getGrammarLesson(p.key), [p.key]);
  const row = useMemo(() => getGrammarLibrary().find((r) => r.norm_pattern === p.key) ?? null, [p.key]);
  const title = row?.label_tr ?? p.title ?? '';
  const poster = row ? getPoster(row.poster_media) : null;
  const rec = lesson?.recording;

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<number, number>>({});

  const active = rec?.sentences[idx];
  const sa = useSpeechAssessment(active?.en ?? '');

  // Gercek sonuc gelince o cumlenin en iyi puanini sakla (carousel isaretleri icin).
  useEffect(() => {
    if (sa.result) setScores((prev) => ({ ...prev, [idx]: Math.max(prev[idx] ?? 0, sa.result!.pron) }));
  }, [sa.result, idx]);

  if (!rec || !active) {
    return (
      <View style={styles.root}>
        <TopBar title={title} insets={insets} />
        <View style={styles.empty}>
          <Ionicons name="construct-outline" size={30} color={colors.muted} />
          <Text style={styles.emptyText}>Bu konunun ses kaydı pratiği henüz hazır değil.</Text>
        </View>
      </View>
    );
  }

  const recording = sa.status === 'recording';
  const assessing = sa.status === 'assessing';

  return (
    <View style={styles.root}>
      <TopBar title={title} insets={insets} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}>
        {/* Metadata pills */}
        <View style={styles.pills}>
          {row?.cefr ? <Pill text={`${row.cefr} Seviye`} /> : null}
          <Pill text="Ses Kaydı & Telaffuz" tone="teal" />
          {rec.minutes ? <Pill text={`${rec.minutes} dk`} /> : null}
          <Pill text={`${rec.sentences.length} hedef cümle`} />
        </View>

        {/* Baslik + giris */}
        <View style={styles.intro}>
          <Text style={styles.h2}>Konuşarak Pekiştir</Text>
          <Text style={styles.introText}>{rec.intro}</Text>
        </View>

        {/* Baglam hatirlatici */}
        {poster ? (
          <View style={styles.vignette}>
            <Image source={poster} style={styles.vignetteImg} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.vignetteKicker}>BAĞLAM HATIRLATICI</Text>
              <Text style={styles.vignetteText}>
                Geçmişte yaşanmış anıları aktarırken doğru fiil bükümünü sesinle içselleştir.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Cumle carousel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          {rec.sentences.map((s, i) => {
            const on = i === idx;
            const sc = scores[i];
            const dot = sc != null ? scoreColor(sc) : colors.lineStrong;
            return (
              <Pressable key={i} style={[styles.cPill, on && styles.cPillOn]} onPress={() => setIdx(i)}>
                <View style={[styles.cDot, { backgroundColor: on ? '#fff' : dot }]} />
                <Text style={[styles.cPillText, on && styles.cPillTextOn]} numberOfLines={1}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Hedef cumle karti */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardKicker}>
              HEDEF CÜMLE {String(idx + 1).padStart(2, '0')} / {String(rec.sentences.length).padStart(2, '0')}
            </Text>
            {scores[idx] != null ? (
              <View style={[styles.scoreTag, { backgroundColor: scoreColor(scores[idx]) }]}>
                <Text style={styles.scoreTagText}>Telaffuz %{scores[idx]}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.target}>{highlighted(active.en, active.highlight)}</Text>
          <Text style={styles.targetTr}>{active.tr}</Text>

          {/* Referans dinle (cihaz sesi) */}
          <View style={styles.listenRow}>
            <Pressable style={styles.listenBtn} onPress={() => sa.listen(1.0)}>
              <View style={styles.listenIcon}>
                <Ionicons name="play" size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.listenTitle}>Referans telaffuzu dinle</Text>
                <Text style={styles.listenSub}>Cihaz sesi · normal hız</Text>
              </View>
            </Pressable>
            <Pressable style={styles.slowBtn} onPress={() => sa.listen(0.8)}>
              <Ionicons name="speedometer-outline" size={15} color={colors.muted} />
              <Text style={styles.slowText}>0.8x</Text>
            </Pressable>
          </View>

          {/* Kayit + gercek sonuc alani */}
          <View style={styles.recZone}>
            {/* Durum rozeti */}
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: recording ? colors.danger : assessing ? colors.warning : colors.muted },
                ]}
              />
              <Text style={styles.statusText}>
                {recording
                  ? 'Kaydediliyor… bitince tekrar bas'
                  : assessing
                    ? 'Değerlendiriliyor…'
                    : sa.result
                      ? `Telaffuz %${sa.result.pron} · eşleşme %${sa.result.matchPct} · akıcılık %${sa.result.fluency}`
                      : 'Mikrofona basıp cümleyi oku'}
              </Text>
            </View>

            {/* Gercek kelime kelime skorlar */}
            {sa.result?.words?.length ? (
              <View style={styles.words}>
                {sa.result.words.map((w, i) => {
                  const bad = w.errorType !== 'None';
                  const tone = bad ? colors.danger : scoreColor(w.accuracy);
                  return (
                    <View key={i} style={[styles.wordChip, { borderColor: tone }]}>
                      <Text style={[styles.wordText, { color: tone }]}>{w.word}</Text>
                      <Ionicons name={bad ? 'close' : 'checkmark'} size={12} color={tone} />
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Azure yoksa / hata: durust not */}
            {sa.error ? (
              <View style={styles.errNote}>
                <Ionicons name="information-circle-outline" size={15} color={colors.muted} />
                <Text style={styles.errText}>{sa.error}</Text>
              </View>
            ) : null}

            {/* Mikrofon */}
            <Pressable
              style={[styles.mic, recording && styles.micActive, assessing && styles.micDisabled]}
              disabled={assessing}
              onPress={sa.toggleRecord}>
              <Ionicons name={recording ? 'stop' : 'mic'} size={30} color="#fff" />
            </Pressable>
            <Text style={styles.micHint}>
              {recording ? 'Durdurmak için bas' : sa.result ? 'Tekrar kaydetmek için bas' : 'Kaydetmek için bas'}
            </Text>
          </View>
        </View>

        {/* Telaffuz ipucu */}
        {active.tip ? (
          <View style={styles.tipBox}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb-outline" size={18} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Telaffuz ipucu</Text>
              <Text style={styles.tipText}>{active.tip}</Text>
            </View>
          </View>
        ) : null}

      </ScrollView>

      {/* Sabit alt: Adim 6 (sinav) varsa oraya gec, yoksa yol haritasina don */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + space.sm }]}>
        <Pressable
          style={styles.cta}
          onPress={() => {
            if (lesson?.exam) {
              router.replace(
                `/grammar-exam?key=${encodeURIComponent(p.key ?? '')}&title=${encodeURIComponent(title)}`,
              );
            } else {
              router.back();
            }
          }}>
          <Ionicons name={lesson?.exam ? 'arrow-forward' : 'checkmark-circle'} size={20} color="#fff" />
          <Text style={styles.ctaText}>
            {lesson?.exam ? 'Kaydettim · 06. Adıma geç' : 'Kayıtları tamamladım · Yol haritasına dön'}
          </Text>
        </Pressable>
      </View>
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
        <Text style={styles.topTitle}>05. Cümle Cümle Ses Kaydı</Text>
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
  pillText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  pillTextTeal: { color: colors.teal },

  intro: { gap: 6 },
  h2: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  introText: { fontSize: 14, color: colors.muted, lineHeight: 21 },

  vignette: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.sm },
  vignetteImg: { width: 64, height: 64, borderRadius: radius.sm },
  vignetteKicker: { fontSize: 10, fontWeight: '800', color: colors.accent, letterSpacing: 0.4 },
  vignetteText: { fontSize: 12, color: colors.muted, lineHeight: 17, marginTop: 2 },

  carousel: { gap: space.xs, paddingVertical: 2 },
  cPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  cPillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  cDot: { width: 8, height: 8, borderRadius: radius.pill },
  cPillText: { fontSize: 12, fontWeight: '700', color: colors.muted, maxWidth: 150 },
  cPillTextOn: { color: '#fff' },

  card: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardKicker: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.4 },
  scoreTag: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  scoreTagText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  target: { fontSize: 22, fontWeight: '700', color: colors.ink, lineHeight: 30 },
  hi: { color: colors.accent, fontWeight: '800' },
  targetTr: { fontSize: 14, color: colors.muted, lineHeight: 20 },

  listenRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.sm },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 },
  listenIcon: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  listenTitle: { fontSize: 13, fontWeight: '800', color: colors.ink },
  listenSub: { fontSize: 11, color: colors.muted },
  slowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  slowText: { fontSize: 12, fontWeight: '700', color: colors.muted },

  recZone: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, alignItems: 'center', gap: space.md },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  statusDot: { width: 9, height: 9, borderRadius: radius.pill },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  words: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  wordChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.bg, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  wordText: { fontSize: 12, fontWeight: '700' },
  errNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8 },
  errText: { flex: 1, fontSize: 11.5, color: colors.muted, lineHeight: 16 },
  mic: { width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  micActive: { backgroundColor: colors.danger },
  micDisabled: { opacity: 0.5 },
  micHint: { fontSize: 11, color: colors.muted, fontWeight: '600' },

  tipBox: { flexDirection: 'row', gap: space.md, backgroundColor: colors.tealSoft, borderRadius: radius.lg, padding: space.lg },
  tipIcon: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  tipText: { fontSize: 13, color: colors.muted, lineHeight: 20, marginTop: 2 },

  selfKicker: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.4 },
  selfQ: { fontSize: 14, fontWeight: '700', color: colors.ink, lineHeight: 20 },
  selfRow: { flexDirection: 'row', gap: space.sm },
  selfBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 11 },
  selfBtnOk: { backgroundColor: '#ECFDF3', borderColor: '#ABEFC6' },
  selfBtnHard: { backgroundColor: '#FFF8E6', borderColor: '#FCE4A6' },
  selfBtnText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  selfBtnTextOn: { color: colors.ink },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },

  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.accent, borderRadius: radius.md, height: 52 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
