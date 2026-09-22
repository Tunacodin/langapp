import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, space } from '@/constants/appTheme';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';
import { ArticleRow, getArticles, getSetting } from '@/lib/db';

type Chip = { key: string; label: string; accent?: boolean };

// OKUMA: seviyene uygun kisa metinler. Arama + seviye cipleri + tam genislikte
// makale listesi. Bir makaleye dokun -> /reading detay ekrani. Metrikler GERCEK.
export default function OkumaScreen() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [cefr, setCefr] = useState('all');
  const [loading, setLoading] = useState(true);
  const scrollRef = useScrollTopOnBlur();

  useFocusEffect(
    useCallback(() => {
      setArticles(getArticles());
      setLevel(getSetting('level'));
      setLoading(false);
    }, []),
  );

  const chips = useMemo<Chip[]>(() => {
    const set = new Set<string>();
    for (const a of articles) if (a.cefr) set.add(a.cefr);
    return [
      { key: 'all', label: 'Tümü' },
      ...(level ? [{ key: 'i1', label: `Seviyem (${level})`, accent: true }] : []),
      ...[...set].sort().map((c) => ({ key: c, label: c })),
    ];
  }, [articles, level]);

  const needle = q.trim().toLowerCase();
  const wantCefr = cefr === 'i1' ? level : cefr === 'all' ? null : cefr;

  const fArticles = useMemo(
    () => articles.filter((a) => (!wantCefr || a.cefr === wantCefr) && (!needle || a.title.toLowerCase().includes(needle))),
    [articles, wantCefr, needle],
  );
  const searching = needle.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Okuma" subtitle="Okuyarak kelime hazneni genişlet" icon="book" />

        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Metin başlığı ara"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />
          </View>
          <Pressable
            style={[styles.tuneBtn, (cefr !== 'all' || searching) && styles.tuneBtnOn]}
            onPress={() => {
              setCefr('all');
              setQ('');
            }}
            hitSlop={6}>
            <Ionicons name="options-outline" size={20} color={cefr !== 'all' || searching ? '#fff' : colors.ink} />
            {cefr !== 'all' || searching ? <View style={styles.tuneDot} /> : null}
          </Pressable>
        </View>

        {loading ? <OkumaSkeleton /> : null}

        {!loading ? (
          <FlatList
            data={chips}
            horizontal
            keyExtractor={(c) => c.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsWrap}
            renderItem={({ item: c }) => {
              const on = c.key === cefr;
              return (
                <Pressable
                  style={[styles.chip, on && styles.chipOn, c.accent && !on && styles.chipAccent]}
                  onPress={() => setCefr(c.key)}>
                  {c.accent ? <Ionicons name="sparkles" size={13} color={on ? '#fff' : colors.accent} /> : null}
                  <Text style={[styles.chipText, on && styles.chipTextOn, c.accent && !on && { color: colors.accent }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : null}

        {!loading ? (
          <View style={styles.section}>
            {fArticles.length === 0 ? (
              <Text style={styles.empty}>{searching ? 'Sonuç yok.' : 'Bu seviyede metin yok.'}</Text>
            ) : (
              fArticles.map((a) => (
                <Pressable
                  key={a.id}
                  style={styles.row}
                  onPress={() => router.push(`/reading?id=${encodeURIComponent(a.id)}`)}>
                  <View style={styles.rowIcon}>
                    <Ionicons name="document-text-outline" size={22} color={colors.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText} numberOfLines={2}>
                      {a.title}
                    </Text>
                    <View style={styles.rowFootRow}>
                      {a.cefr ? <Text style={styles.rowCefr}>{a.cefr}</Text> : null}
                      <Text style={styles.rowFoot} numberOfLines={1}>
                        {a.word_count} kelime · {a.read_minutes} dk
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function OkumaSkeleton() {
  return (
    <>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[54, 96, 44].map((w, i) => (
          <Skeleton key={i} width={w} height={32} radius={radius.pill} />
        ))}
      </View>
      {[0, 1, 2, 3].map((r) => (
        <View key={r} style={styles.row}>
          <Skeleton width={44} height={44} radius={radius.sm} />
          <View style={{ flex: 1, gap: space.xs }}>
            <Skeleton width="85%" height={14} />
            <Skeleton width="45%" height={11} />
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, padding: 0 },
  tuneBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tuneBtnOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  tuneDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.ink,
  },

  chipsWrap: { marginHorizontal: -space.xl },
  chipsRow: { gap: space.sm, paddingHorizontal: space.xl },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipAccent: { borderColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chipTextOn: { color: '#fff' },

  section: { gap: space.sm },
  row: {
    flexDirection: 'row',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 20 },
  rowFootRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 4 },
  rowCefr: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.teal,
    backgroundColor: colors.tealSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  rowFoot: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.muted },

  empty: { fontSize: 14, color: colors.muted, paddingVertical: space.lg, textAlign: 'center' },
});
