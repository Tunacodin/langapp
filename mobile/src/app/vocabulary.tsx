import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WordUsageSheet } from '@/components/word-usage-sheet';
import { colors, radius, space } from '@/constants/appTheme';
import { getVocabulary, VOCAB_DOMAINS, VocabHubRow } from '@/lib/db';

const POS_TR: Record<string, string> = { NOUN: 'isim', VERB: 'fiil', ADJ: 'sıfat', ADV: 'zarf' };
const DOMAIN_BY_KEY = Object.fromEntries(VOCAB_DOMAINS.map((d) => [d.key, d]));
const PAGE = 20; // sayfa basina kelime

// Kart renkli basligi: her tema (domain) kendi rengini alir; boylece izgara
// tek renge (mavi) bogulmaz, canli ama duz/tonlu kalir. strong=metin, soft=zemin.
const PALETTE: { c: string; soft: string }[] = [
  { c: '#FF385C', soft: '#FFE8EC' }, // mercan
  { c: '#008489', soft: '#E3F1F1' }, // teal
  { c: '#C77700', soft: '#FBEFD9' }, // kehribar
  { c: '#7C3AED', soft: '#EEE7FD' }, // mor
  { c: '#2E7D32', soft: '#E6F1E7' }, // yesil
  { c: '#C2185B', soft: '#FBE4EE' }, // pembe
  { c: '#5D4037', soft: '#EFE9E7' }, // kahve
  { c: '#E64A19', soft: '#FCE7E0' }, // turuncu
  { c: '#455A64', soft: '#E9EDEF' }, // fume
  { c: '#00838F', soft: '#E0F2F4' }, // camgobegi
];
const DOMAIN_COLOR: Record<string, { c: string; soft: string }> = Object.fromEntries(
  VOCAB_DOMAINS.map((d, i) => [d.key, PALETTE[i % PALETTE.length]]),
);
function colorFor(domain: string) {
  return DOMAIN_COLOR[domain] ?? PALETTE[PALETTE.length - 1];
}

// Izgarada tek kalan son karti hizalamak icin gorunmez dolgu.
const GHOST_ID = -1;

// Kelime ekrani: anlam-alani (tema) cipleriyle suzulen duz liste. Metrikler GERCEK
// (lexicon.domain, video sayisi, kayitli kart). Liste 20'serli sayfalanir (kaydir).
export default function VocabularyScreen() {
  const [all, setAll] = useState<VocabHubRow[]>([]);
  const [domain, setDomain] = useState<string | null>(null); // null = Tumu
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [openWord, setOpenWord] = useState<VocabHubRow | null>(null); // acik kelime sheet'i

  useFocusEffect(
    useCallback(() => {
      setAll(getVocabulary()); // tum hub (A1/A2 haric); filtre + sayfalama bellekte
    }, []),
  );

  const total = all.length;

  // Tema basina kok sayisi (cok -> az). Cip sirasi bundan.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of all) m.set(r.domain, (m.get(r.domain) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [all]);

  const chips = useMemo(
    () =>
      [{ key: null as string | null, label: 'Tümü', c: total }].concat(
        counts
          .map(([key, c]) => {
            const d = DOMAIN_BY_KEY[key];
            return d ? { key, label: d.label_tr, c } : null;
          })
          .filter(Boolean) as { key: string | null; label: string; c: number }[],
      ),
    [counts, total],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (domain && r.domain !== domain) return false;
      if (needle && !`${r.lemma} ${r.first_sense ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [all, domain, q]);

  // Filtre/arama degisince ilk sayfaya don.
  useEffect(() => {
    setLimit(PAGE);
  }, [domain, q]);

  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  // 2 sutun izgara: tek kalan son karti hizalamak icin gorunmez dolgu ekle.
  const gridData =
    visible.length % 2 === 1 ? [...visible, { ...visible[0], lexicon_id: GHOST_ID }] : visible;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={gridData}
        keyExtractor={(r, i) => (r.lexicon_id === GHOST_ID ? `ghost-${i}` : String(r.lexicon_id))}
        numColumns={2}
        columnWrapperStyle={styles.rowWrap}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore) setLimit((l) => l + PAGE);
        }}
        ListHeaderComponent={
          <View style={styles.head}>
            <View style={styles.titleRow}>
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={colors.ink} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Kelimeler</Text>
                <Text style={styles.sub}>{total} kök · anlam alanına göre</Text>
              </View>
            </View>

            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Kelime veya anlam ara"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
              />
              {q ? (
                <Pressable onPress={() => setQ('')} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsRow}>
              {chips.map((c) => {
                const on = c.key === domain;
                return (
                  <Pressable key={c.key ?? 'all'} style={[styles.chip, on && styles.chipOn]} onPress={() => setDomain(c.key)}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {c.label} ({c.c})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{total === 0 ? 'Henüz kelime yok.' : 'Sonuç yok.'}</Text>}
        renderItem={({ item }) => {
          if (item.lexicon_id === GHOST_ID) return <View style={styles.cardGhost} />;
          const inSrs = item.card_count > 0;
          const col = colorFor(item.domain);
          return (
            <Pressable style={styles.card} onPress={() => setOpenWord(item)}>
              {/* Renkli baslik: KELIME (CEFR degil). Renk temaya gore degisir. */}
              <View style={[styles.cardHead, { backgroundColor: col.soft }]}>
                <Text style={[styles.headWord, { color: col.c }]} numberOfLines={1}>
                  {item.lemma}
                </Text>
                <View style={styles.headMetaRow}>
                  <Text style={[styles.headPos, { color: col.c }]}>{POS_TR[item.pos] ?? item.pos.toLowerCase()}</Text>
                  {inSrs ? <Ionicons name="bookmark" size={13} color={col.c} /> : null}
                </View>
              </View>
              {/* Govde: anlam + kaynak bilgisi + sessiz CEFR */}
              <View style={styles.cardBody}>
                <Text style={styles.meaning} numberOfLines={2}>
                  {item.first_sense ?? 'anlam yakında'}
                </Text>
                <View style={styles.cardFoot}>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.video_count} video{item.sense_count > 1 ? ` · ${item.sense_count} anlam` : ''}
                  </Text>
                  {item.cefr ? <Text style={styles.cefr}>{item.cefr}</Text> : null}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          filtered.length > 0 ? (
            <Text style={styles.footer}>
              {visible.length} / {filtered.length} kelime{hasMore ? ' · devamı için kaydır' : ''}
            </Text>
          ) : null
        }
      />

      {/* Kelimeye dokununca: farkli cumlelerdeki kullanim + dinle + mikrofonla tekrar */}
      <WordUsageSheet
        visible={!!openWord}
        onClose={() => setOpenWord(null)}
        lemma={openWord?.lemma ?? null}
        pos={openWord?.pos ?? null}
        meaning={openWord?.first_sense ?? null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingBottom: space.xxl },
  rowWrap: { gap: space.md, paddingHorizontal: space.xl, marginBottom: space.md },
  head: { gap: space.md, padding: space.xl, paddingBottom: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, padding: 0 },

  chipsScroll: { flexGrow: 0, flexShrink: 0, marginHorizontal: -space.xl },
  chipsRow: { gap: space.sm, paddingHorizontal: space.xl, alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chipTextOn: { color: '#fff' },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  cardGhost: { flex: 1 },
  cardHead: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: 2, minHeight: 58, justifyContent: 'center' },
  headWord: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  headMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headPos: { fontSize: 11, fontWeight: '600', opacity: 0.8, fontStyle: 'italic' },
  cardBody: { padding: space.md, gap: space.sm },
  meaning: { fontSize: 13, color: colors.ink, lineHeight: 18 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  meta: { fontSize: 11, color: colors.muted, flexShrink: 1 },
  cefr: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },

  footer: { fontSize: 12, color: colors.muted, textAlign: 'center', paddingVertical: space.lg },
  empty: { fontSize: 14, color: colors.muted, padding: space.xl },
});
