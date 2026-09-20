import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { getArticle, ArticleFull } from '@/lib/db';

// Okuma ekrani: bir makalenin tam metni. Ingilizce paragraflar + istege bagli
// Turkce ceviri (goster/gizle). Metrikler GERCEK (kelime say., okuma dk).
export default function ReadingScreen() {
  const p = useLocalSearchParams<{ id?: string }>();
  const [art, setArt] = useState<ArticleFull | null>(null);
  const [showTr, setShowTr] = useState(false);

  useEffect(() => {
    if (p.id) setArt(getArticle(p.id));
  }, [p.id]);

  const paras = useMemo(() => {
    if (!art) return [] as { en: string; tr: string | null }[];
    const en = art.body_en.split(/\n\s*\n/);
    const tr = (art.body_tr ?? '').split(/\n\s*\n/);
    return en.map((e, i) => ({ en: e.trim(), tr: tr[i]?.trim() ?? null }));
  }, [art]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        {art?.body_tr ? (
          <Pressable onPress={() => setShowTr((v) => !v)} style={[styles.trToggle, showTr && styles.trToggleOn]}>
            <Ionicons name="language" size={15} color={showTr ? '#fff' : colors.muted} />
            <Text style={[styles.trToggleText, showTr && { color: '#fff' }]}>Türkçe</Text>
          </Pressable>
        ) : null}
      </View>

      {art ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>OKUMA · {art.source ?? 'Metin'}</Text>
          <Text style={styles.title}>{art.title}</Text>
          <View style={styles.metaRow}>
            {art.cefr ? (
              <View style={styles.cefrTag}>
                <Text style={styles.cefrText}>{art.cefr}</Text>
              </View>
            ) : null}
            <Meta icon="text-outline" text={`${art.word_count} kelime`} />
            <Dot />
            <Meta icon="time-outline" text={`${art.read_minutes} dk`} />
          </View>

          <View style={styles.divider} />

          {paras.map((pr, i) => (
            <View key={i} style={styles.para}>
              <Text style={styles.body}>{pr.en}</Text>
              {showTr && pr.tr ? <Text style={styles.bodyTr}>{pr.tr}</Text> : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Metin bulunamadı.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={colors.muted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}
function Dot() {
  return <View style={styles.metaDot} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  trToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  trToggleOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  trToggleText: { fontSize: 12, fontWeight: '700', color: colors.muted },

  content: { padding: space.xl, paddingBottom: space.xxl },
  kicker: { fontSize: 11, fontWeight: '800', color: colors.teal, letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, lineHeight: 32, letterSpacing: -0.5, marginTop: space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  cefrTag: { backgroundColor: colors.tealSoft, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  cefrText: { fontSize: 11, fontWeight: '800', color: colors.teal },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  metaDot: { width: 3, height: 3, borderRadius: radius.pill, backgroundColor: colors.lineStrong },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.lg },

  para: { marginBottom: space.lg },
  body: { fontSize: 17, color: colors.ink, lineHeight: 28 },
  bodyTr: { fontSize: 15, color: colors.muted, lineHeight: 24, marginTop: space.sm, fontStyle: 'italic' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: colors.muted },
});
