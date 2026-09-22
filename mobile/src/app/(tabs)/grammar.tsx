import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/progress-ring';
import { FocusBadge } from '@/components/focus-badge';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, space } from '@/constants/appTheme';
import { getGrammarLibrary, GrammarLibRow } from '@/lib/db';
import { getPoster } from '@/lib/posters';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';

// Kategori kimligi: baslik + ikon + renk (tonlu kart gorseli icin). Her kategori
// ayirt edici bir renk alir; acik/tonlu zemin + dolgun ikon (flat, golgesiz).
type CatMeta = { title: string; tag: string; icon: keyof typeof Ionicons.glyphMap; color: string; soft: string };
// topics.json'daki kategori adlariyla BIREBIR anahtarlanir (tek kaynak).
const CAT_META: Record<string, CatMeta> = {
  'Tenses & Aspects': { title: 'Tenses & Aspects', tag: 'Tenses', icon: 'time', color: '#16A34A', soft: 'rgba(22,163,74,0.10)' },
  'Modals & Modal Perfects': { title: 'Modals & Modal Perfects', tag: 'Modals', icon: 'options', color: '#2563EB', soft: 'rgba(37,99,235,0.10)' },
  'Conditionals & Wish': { title: 'Conditionals & Wish', tag: 'Conditionals', icon: 'git-branch', color: '#F97316', soft: 'rgba(249,115,22,0.12)' },
  'Subordinate Clauses': { title: 'Subordinate Clauses', tag: 'Clauses', icon: 'link', color: '#7C3AED', soft: 'rgba(124,58,237,0.10)' },
  'Voice & Passives': { title: 'Voice & Passives', tag: 'Passive', icon: 'swap-horizontal', color: '#0D9488', soft: 'rgba(13,148,136,0.10)' },
  'Quantity & Frequency': { title: 'Quantity & Frequency', tag: 'Quantity', icon: 'stats-chart', color: '#DB2777', soft: 'rgba(219,39,119,0.10)' },
};
const CAT_ORDER = ['Tenses & Aspects', 'Modals & Modal Perfects', 'Conditionals & Wish', 'Subordinate Clauses', 'Voice & Passives', 'Quantity & Frequency'];

// SRS/FSRS durumundan GERCEK ilerleme etiketi (uydurma yuzde yok).
type Status = { label: string; tone: string; mastered: boolean; icon: keyof typeof Ionicons.glyphMap } | null;
function statusOf(r: GrammarLibRow): Status {
  if (!r.saved) return null; // Baslanmamis kartta durum satiri gosterilmez.
  if (r.srs_state === 2) {
    const days = r.srs_stability != null ? Math.round(r.srs_stability) : null;
    return {
      label: days ? `Öğrenildi · ~${days}g` : 'Öğrenildi',
      tone: colors.success,
      mastered: true,
      icon: 'checkmark-circle',
    };
  }
  return { label: 'Öğreniliyor', tone: colors.warning, mastered: false, icon: 'time-outline' };
}

// Ilk yukleme iskeleti: bir bolum basligi + 2 satir (4 kart) grid taklidi.
function GrammarSkeleton() {
  return (
    <>
      {[0, 1].map((s) => (
        <View key={s} style={styles.section}>
          <View style={styles.secHead}>
            <Skeleton width={160} height={18} />
            <Skeleton width={44} height={44} radius={radius.pill} />
          </View>
          <View style={styles.grid}>
            {[0, 1].map((c) => (
              <View key={c} style={styles.card}>
                <Skeleton width="100%" height={100} radius={0} />
                <View style={styles.cardBody}>
                  <Skeleton width="85%" height={13} />
                  <Skeleton width="60%" height={11} />
                  <Skeleton width="70%" height={11} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

export default function GrammarScreen() {
  const [rows, setRows] = useState<GrammarLibRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true); // ilk yukleme iskeleti
  const scrollRef = useScrollTopOnBlur();

  const load = useCallback(() => setRows(getGrammarLibrary()), []);
  useFocusEffect(
    useCallback(() => {
      load(); // ekrana her donuste tazele: SRS'e eklenen kalip ilerlemesi guncellensin.
      setLoading(false);
      return () => Speech.stop();
    }, [load]),
  );

  // Arama -> kategoriye gore gruplu bolumler.
  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (needle && !`${r.label_tr} ${r.norm_pattern} ${r.formula ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    return CAT_ORDER.map((cat) => {
      const items = filtered.filter((r) => r.category === cat);
      const done = items.filter((r) => statusOf(r)?.mastered).length;
      return { cat, meta: CAT_META[cat], items, done };
    }).filter((s) => s.items.length > 0);
  }, [rows, q]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Cümle & Kurallar" subtitle="Cümle kur, kuralları pekiştir" icon="create" />

        <FocusBadge />

        {/* Arama */}
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Kural, yapı veya kalıp ara..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {loading ? <GrammarSkeleton /> : null}

        {!loading && sections.length === 0 && <Text style={styles.empty}>Kalıp bulunamadı.</Text>}

        {!loading && sections.map((sec) => (
          <View key={sec.cat} style={styles.section}>
            <View style={styles.secHead}>
              <View style={styles.secTitleWrap}>
                <Text style={styles.secTitle}>{sec.meta.title}</Text>
              </View>
              <View style={styles.secProg}>
                <Text style={styles.secProgText}>
                  {sec.done}/{sec.items.length} öğrenildi
                </Text>
                <ProgressRing
                  size={44}
                  strokeWidth={5}
                  progress={sec.items.length ? sec.done / sec.items.length : 0}
                  color={sec.meta.color}
                  trackColor={colors.line}>
                  <Text style={[styles.secProgPct, { color: sec.meta.color }]}>
                    %{Math.round((sec.done / Math.max(1, sec.items.length)) * 100)}
                  </Text>
                </ProgressRing>
              </View>
            </View>

            <View style={styles.grid}>
              {sec.items.map((item) => {
                const meta = sec.meta;
                const st = statusOf(item);
                return (
                  <Pressable
                    key={item.norm_pattern}
                    style={styles.card}
                    onPress={() =>
                      router.push(
                        `/grammar-topic?key=${encodeURIComponent(item.norm_pattern)}&title=${encodeURIComponent(item.label_tr)}`,
                      )
                    }>
                    {/* Gorsel baslik: kalibin gectigi videonun GERCEK posteri (Izle ile ayni),
                        yoksa kategori tonlu zemine + ikona duser. Uzerine koyu rozetler. */}
                    <View style={[styles.cardTop, { backgroundColor: meta.soft }]}>
                      {getPoster(item.poster_media) ? (
                        <>
                          <Image source={getPoster(item.poster_media)!} style={styles.thumbImg} resizeMode="cover" />
                          <View style={styles.thumbShade} />
                        </>
                      ) : (
                        <Ionicons name={meta.icon} size={34} color={meta.color} style={styles.cardIcon} />
                      )}
                      <View style={styles.cardTopOverlay}>
                        {/* Sadece seviye (sag ust). Kategori etiketi ve oynatma sayisi kaldirildi. */}
                        <View style={styles.cardTopRow}>
                          {st?.mastered ? (
                            <View style={styles.doneBadge}>
                              <Ionicons name="checkmark" size={12} color="#fff" />
                            </View>
                          ) : (
                            <View />
                          )}
                          <Text style={styles.cefrDark}>{item.cefr ?? '-'}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Govde: konu adi + formul + meta + gercek ilerleme */}
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {item.label_tr}
                      </Text>
                      <Text
                        style={[styles.formula, { color: colors.accent, backgroundColor: colors.accentSoft }]}
                        numberOfLines={1}>
                        {item.formula ?? item.norm_pattern.toLowerCase().replace(/_/g, ' ')}
                      </Text>

                      <View style={styles.metaRow}>
                        <Ionicons name="chatbubble-outline" size={13} color={colors.muted} />
                        <Text style={styles.meta}>{item.cnt} çalışma cümlesi</Text>
                      </View>

                      {st ? (
                        <View style={styles.statusRow}>
                          <Ionicons name={st.icon} size={13} color={st.tone} />
                          <Text style={[styles.statusText, { color: st.tone }]} numberOfLines={1}>
                            {st.label}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
              {/* Tek kalirsa hizalamayi koru */}
              {sec.items.length % 2 === 1 && <View style={[styles.card, styles.cardGhost]} />}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  // Diger sekmelerle ayni: padding xl + gap lg (header ve bolumler arasi tutarli bosluk).
  scroll: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },


  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, padding: 0 },

  chipsWrap: { marginHorizontal: -space.xl },
  chipsRow: { gap: space.sm, paddingHorizontal: space.xl },
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

  section: {},
  secHead: {
    marginBottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  secTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 },
  secTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, letterSpacing: -0.3 },
  secProg: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  secProgText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  secProgPct: { fontSize: 12, fontWeight: '800', letterSpacing: -0.2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  card: {
    width: '47.5%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  cardGhost: { borderColor: 'transparent', backgroundColor: 'transparent' },

  cardTop: {
    aspectRatio: 16 / 10,
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
  cardTopOverlay: { ...StyleSheet.absoluteFillObject, padding: space.sm, justifyContent: 'space-between' },
  thumbImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  thumbShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  cardIcon: { position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -17, opacity: 0.9 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTopBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  catChipText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  doneBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cefrDark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  playBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  playBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  cardBody: { padding: space.md, gap: space.sm },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, lineHeight: 19 },
  formula: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  empty: { fontSize: 14, color: colors.muted, paddingVertical: space.xl },
});
