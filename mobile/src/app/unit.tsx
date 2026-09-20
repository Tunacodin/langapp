import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WordUsageSheet } from '@/components/word-usage-sheet';
import { colors, radius, space } from '@/constants/appTheme';
import {
  ArticleRow,
  CatalogItem,
  CourseUnit,
  getCourseUnit,
  getUnitGrammar,
  getUnitListening,
  getUnitPractice,
  getUnitReading,
  getUnitVocab,
  GrammarLibRow,
  ShadowSentence,
  VocabHubRow,
} from '@/lib/db';
import { getPoster } from '@/lib/posters';

const POS_TR: Record<string, string> = { NOUN: 'isim', VERB: 'fiil', ADJ: 'sıfat', ADV: 'zarf' };

function fmt(ms: number) {
  const s = Math.floor((ms || 0) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Unite detay ekrani: coursebook yapisi (Grammar / Vocabulary / Reading /
// Listening / Speaking / Writing). Her bolum GERCEK icerikten dolar; icerik
// yoksa dururstce "yakinda" gorunur (uydurma yok).
export default function UnitScreen() {
  const p = useLocalSearchParams<{ no?: string }>();
  const no = Number(p.no ?? 0);

  const [unit, setUnit] = useState<CourseUnit | null>(null);
  const [grammar, setGrammar] = useState<GrammarLibRow[]>([]);
  const [vocab, setVocab] = useState<VocabHubRow[]>([]);
  const [reading, setReading] = useState<ArticleRow[]>([]);
  const [listening, setListening] = useState<CatalogItem[]>([]);
  const [practice, setPractice] = useState<ShadowSentence[]>([]);
  const [word, setWord] = useState<VocabHubRow | null>(null); // acik kelime sheet'i

  useFocusEffect(
    useCallback(() => {
      setUnit(getCourseUnit(no));
      setGrammar(getUnitGrammar(no));
      setVocab(getUnitVocab(no));
      setReading(getUnitReading(no));
      setListening(getUnitListening(no));
      setPractice(getUnitPractice(no));
    }, [no]),
  );

  if (!unit) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>Ünite bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  const startSpeaking = () => {
    const s = practice[0];
    if (!s) return;
    router.push(
      `/shadowing-studio?text=${encodeURIComponent(s.text_en)}&hint=${encodeURIComponent(s.text_tr ?? '')}&mediaId=${encodeURIComponent(s.media_id)}&start=${s.start_ms}&end=${s.end_ms}`,
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Baslik */}
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ÜNİTE {String(unit.no).padStart(2, '0')} · {unit.cefr}</Text>
            <Text style={styles.title}>{unit.title_tr}</Text>
            <Text style={styles.theme}>{unit.theme_tr}</Text>
          </View>
        </View>

        {/* Grammar */}
        <Section icon="git-branch-outline" title="Grammar" note={unit.grammarTargets}>
          {grammar.length === 0 ? (
            <Empty text="Bu ünitenin gramer kesitleri henüz içerikte yok." />
          ) : (
            grammar.map((g, i) => (
              <Pressable
                key={g.norm_pattern}
                style={[styles.row, i === 0 && styles.rowFirst]}
                onPress={() =>
                  router.push(`/grammar-topic?key=${encodeURIComponent(g.norm_pattern)}&title=${encodeURIComponent(g.label_tr)}`)
                }>
                <View style={styles.rowIcon}>
                  <Ionicons name="git-branch-outline" size={16} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{g.label_tr}</Text>
                  {g.formula ? <Text style={styles.rowSub}>{g.formula}</Text> : null}
                </View>
                <Text style={styles.count}>{g.cnt}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))
          )}
        </Section>

        {/* Vocabulary */}
        <Section
          icon="book-outline"
          title="Vocabulary"
          note={`${vocab.length} kelime`}
          action={vocab.length > 8 ? { label: 'Tümü', onPress: () => router.push('/vocabulary') } : undefined}>
          {vocab.length === 0 ? (
            <Empty text="Bu temada kelime henüz yok." />
          ) : (
            vocab.slice(0, 8).map((w, i) => (
              <Pressable key={w.lexicon_id} style={[styles.row, i === 0 && styles.rowFirst]} onPress={() => setWord(w)}>
                <View style={{ flex: 1 }}>
                  <View style={styles.lemmaRow}>
                    <Text style={styles.rowTitle}>{w.lemma}</Text>
                    <Text style={styles.pos}>{POS_TR[w.pos] ?? w.pos.toLowerCase()}</Text>
                    {w.cefr ? <Text style={styles.cefr}>{w.cefr}</Text> : null}
                  </View>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {w.first_sense ?? 'anlam yakında'}
                  </Text>
                </View>
                <Ionicons name="volume-medium-outline" size={16} color={colors.muted} />
              </Pressable>
            ))
          )}
        </Section>

        {/* Reading */}
        <Section icon="newspaper-outline" title="Reading" note={`${reading.length} metin`}>
          {reading.length === 0 ? (
            <Empty text="Bu üniteye bağlı okuma metni henüz yok." />
          ) : (
            reading.map((a, i) => (
              <Pressable
                key={a.id}
                style={[styles.row, i === 0 && styles.rowFirst]}
                onPress={() => router.push(`/reading?id=${encodeURIComponent(a.id)}`)}>
                <View style={styles.rowIcon}>
                  <Ionicons name="document-text-outline" size={16} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {a.title}
                  </Text>
                  <Text style={styles.rowSub}>
                    {a.cefr ? `${a.cefr} · ` : ''}
                    {a.read_minutes} dk · {a.word_count} kelime
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))
          )}
        </Section>

        {/* Listening */}
        <Section icon="headset-outline" title="Listening" note={`${listening.length} video`}>
          {listening.length === 0 ? (
            <Empty text="Bu üniteye bağlı video henüz yok." />
          ) : (
            listening.map((m, i) => (
              <Pressable
                key={m.id}
                style={[styles.row, i === 0 && styles.rowFirst]}
                onPress={() => router.push(`/player?id=${encodeURIComponent(m.id)}`)}>
                <View style={styles.thumb}>
                  {getPoster(m.youtube_id) ? (
                    <Image source={getPoster(m.youtube_id)!} style={styles.thumbImg} resizeMode="cover" />
                  ) : (
                    <Ionicons name="play" size={16} color="#fff" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {m.title}
                  </Text>
                  <Text style={styles.rowSub}>
                    {fmt(m.duration_ms)} · {m.sentence_count} cümle
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))
          )}
        </Section>

        {/* Speaking */}
        <Section icon="mic-outline" title="Speaking" note={`${practice.length} pratik cümlesi`}>
          {practice.length === 0 ? (
            <Empty text="Konuşma pratiği için önce bu üniteye içerik gerekli." />
          ) : (
            <Pressable style={styles.cta} onPress={startSpeaking}>
              <Ionicons name="mic" size={18} color="#fff" />
              <Text style={styles.ctaText}>Konuşma Pratiğini Başlat</Text>
            </Pressable>
          )}
        </Section>

        {/* Writing */}
        <Section icon="create-outline" title="Writing" note="Yazma görevi">
          <View style={styles.writeBox}>
            <Text style={styles.writeTask}>{unit.writing_tr}</Text>
            <Text style={styles.writeNote}>Not: Bu sürümde uygulama içi metin girişi/değerlendirme henüz yok.</Text>
          </View>
        </Section>
      </ScrollView>

      <WordUsageSheet
        visible={!!word}
        onClose={() => setWord(null)}
        lemma={word?.lemma ?? null}
        pos={word?.pos ?? null}
        meaning={word?.first_sense ?? null}
      />
    </SafeAreaView>
  );
}

function Section({
  icon,
  title,
  note,
  action,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  note?: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.secHead}>
        <View style={styles.secTitleRow}>
          <Ionicons name={icon} size={16} color={colors.ink} />
          <Text style={styles.secTitle}>{title}</Text>
          {note ? <Text style={styles.secNote}>· {note}</Text> : null}
        </View>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={6}>
            <Text style={styles.secAction}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.secBody}>{children}</View>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  eyebrow: { fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  theme: { fontSize: 13, color: colors.muted, marginTop: 2 },

  section: { gap: space.sm },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  secTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  secNote: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  secAction: { fontSize: 13, fontWeight: '700', color: colors.accent },
  secBody: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowFirst: { borderTopWidth: 0 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 52,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  lemmaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pos: { fontSize: 11, color: colors.muted, fontStyle: 'italic' },
  cefr: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.teal,
    backgroundColor: colors.tealSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  count: { fontSize: 13, fontWeight: '800', color: colors.muted },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    padding: space.md,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  writeBox: { padding: space.md, gap: space.sm },
  writeTask: { fontSize: 15, color: colors.ink, lineHeight: 21, fontWeight: '600' },
  writeNote: { fontSize: 11, color: colors.muted, lineHeight: 16 },

  empty: { fontSize: 13, color: colors.muted, padding: space.md, lineHeight: 18 },
});
