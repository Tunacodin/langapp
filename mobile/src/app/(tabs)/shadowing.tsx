import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, space } from '@/constants/appTheme';
import { getSetting, getShadowPacks, ShadowPack } from '@/lib/db';
import { getPoster } from '@/lib/posters';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';

// Kategori/bolum slug -> insan okunur baslik. Yeni slug eklenince buraya bir satir
// ekle; tanimsiz slug otomatik cap() ile gosterilir (bozulmaz). Bolum slug'lari
// cumlelerdeki category_group alanindan gelir.
const CATEGORY_LABEL: Record<string, string> = {
  greetings: 'Selamlaşma & Tanışma',
  smalltalk: 'Small Talk & Sohbet',
  directions: 'Yön & Ulaşım',
  opinions: 'Görüş Bildirme',
  advice: 'Tavsiye & Cesaret',
  feelings: 'Duygular & Anılar',
  meetings: 'Toplantı & Strateji',
  negotiation: 'Pazarlık & Uzlaşma',
  linking: 'Bağlantı & Reductions',
  intonation: 'Vurgu & Tonlama',
};
const GROUP_LABEL: Record<string, string> = {
  daily: 'Günlük Yaşam & Sohbet',
  business: 'İş Dünyası & İletişim',
  intonation: 'Doğal Bağlantılar & Tonlama',
  software: 'Teknoloji & Yazılım',
  football: 'Futbol & Spor',
};
function catLabel(slug: string): string {
  return CATEGORY_LABEL[slug] ?? cap(slug);
}
function groupLabel(slug: string | null): string {
  if (!slug) return 'Diğer';
  return GROUP_LABEL[slug] ?? cap(slug);
}

type Group = { key: string; label: string; packs: ShadowPack[] };

// Shadowing sekmesi: KATEGORI PAKETLERI kutuphanesi. Her paket, farkli videolardan
// toplanan cumlelerin kesitidir ( or. "Selamlaşma" = 4 videodaki selamlasma cumleleri).
// Metrikler GERCEK (cumle/video sayisi, tamamlanan cumle). Karta dokun -> studyo.
export default function ShadowingLibrary() {
  const [packs, setPacks] = useState<ShadowPack[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string>('all'); // 'all' | group slug ('__none__' = Diğer)
  const [loading, setLoading] = useState(true); // ilk yukleme iskeleti
  const scrollRef = useScrollTopOnBlur();

  // Studyodan donunce ilerleme guncel kalsin.
  useFocusEffect(
    useCallback(() => {
      setPacks(getShadowPacks());
      setLevel(getSetting('level'));
      setLoading(false);
    }, []),
  );

  // Bolum cipleri: Tumu + gercek gruplar (paket sayisiyla).
  const chips = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of packs) map.set(p.category_group ?? '__none__', (map.get(p.category_group ?? '__none__') ?? 0) + 1);
    const list = [{ key: 'all', label: 'Tümü', c: packs.length }];
    for (const [key, c] of map) list.push({ key, label: groupLabel(key === '__none__' ? null : key), c });
    return list;
  }, [packs]);

  // Arama (paket basligi) + bolum filtresi -> bolume gore gruplu.
  const groups = useMemo<Group[]>(() => {
    const needle = q.trim().toLowerCase();
    const filtered = packs.filter((p) => {
      if (needle && !catLabel(p.category).toLowerCase().includes(needle)) return false;
      if (filter === 'all') return true;
      return (p.category_group ?? '__none__') === filter;
    });
    const byGroup = new Map<string, ShadowPack[]>();
    for (const p of filtered) {
      const k = p.category_group ?? '__none__';
      if (!byGroup.has(k)) byGroup.set(k, []);
      byGroup.get(k)!.push(p);
    }
    return [...byGroup.entries()].map(([k, ps]) => ({
      key: k,
      label: groupLabel(k === '__none__' ? null : k),
      packs: ps,
    }));
  }, [packs, q, filter]);

  // Genel ilerleme (GERCEK): tamamlanan / toplam cumle (tum paketler).
  const stat = useMemo(() => {
    const total = packs.reduce((a, p) => a + p.sentence_count, 0);
    const done = packs.reduce((a, p) => a + Math.min(p.done_count, p.sentence_count), 0);
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [packs]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bolum basligi (uygulama adi gecmez) */}
        <ScreenHeader title="Shadowing" subtitle="Dinleyerek konuşma pratiği" icon="mic" />

        {/* Arama */}
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Bölüm ara"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {loading ? <ShadowingSkeleton /> : null}

        {/* Bolum cipleri */}
        {!loading && chips.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}>
            {chips.map((c) => {
              const on = c.key === filter;
              return (
                <Pressable key={c.key} style={[styles.chip, on && styles.chipOn]} onPress={() => setFilter(c.key)}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {c.label} ({c.c})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Karisik pratik banner -> studyo (CEFR havuzu) */}
        {!loading ? (
          <Pressable style={styles.banner} onPress={() => router.push('/shadowing-studio')}>
            <View style={styles.bannerIcon}>
              <Ionicons name="shuffle" size={20} color={colors.accent} />
            </View>
            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>Karışık Pratik</Text>
              <Text style={styles.bannerSub}>
                {level ? `${level} seviyendeki cümlelerle` : 'Tüm seviyelerden'} hızlı tekrar.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.ink} />
          </Pressable>
        ) : null}

        {/* Genel ilerleme (GERCEK) */}
        {!loading && stat.total > 0 ? (
          <View style={styles.overall}>
            <View style={styles.overallHead}>
              <Text style={styles.overallLabel}>GENEL İLERLEME</Text>
              <Text style={styles.overallVal}>
                {stat.done}/{stat.total} cümle · %{stat.pct}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${stat.pct}%` }]} />
            </View>
          </View>
        ) : null}

        {/* Bolumler -> bolum kartlari */}
        {loading ? null : groups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="albums-outline" size={30} color={colors.muted} />
            <Text style={styles.emptyTitle}>Henüz bölüm yok</Text>
            <Text style={styles.emptyText}>
              Cümlelere ders dosyalarında `category` ve `category_group` etiketi ekleyince bölümler burada belirir.
            </Text>
          </View>
        ) : (
          groups.map((g, gi) => {
            const doneP = g.packs.filter((p) => p.done_count >= p.sentence_count).length;
            return (
              <View key={g.key} style={styles.section}>
                <View style={styles.sectionHead}>
                  <View>
                    <Text style={styles.sectionEyebrow}>KATEGORİ MODÜLÜ {String(gi + 1).padStart(2, '0')}</Text>
                    <Text style={styles.sectionTitle}>{g.label}</Text>
                  </View>
                  <Text style={styles.sectionMeta}>
                    {doneP}/{g.packs.length} bölüm
                  </Text>
                </View>
                <View style={styles.grid}>
                  {g.packs.map((p) => (
                    <Card key={p.category} pack={p} />
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Ilk yukleme iskeleti: cip satiri + banner + genel ilerleme + 2 kartli bir bolum.
function ShadowingSkeleton() {
  return (
    <>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[64, 88, 72].map((w, i) => (
          <Skeleton key={i} width={w} height={30} radius={radius.pill} />
        ))}
      </View>
      <Skeleton width="100%" height={64} radius={radius.md} />
      <View style={styles.overall}>
        <Skeleton width={120} height={12} />
        <Skeleton width="100%" height={6} radius={radius.pill} />
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={{ gap: 4 }}>
            <Skeleton width={90} height={11} />
            <Skeleton width={150} height={18} />
          </View>
          <Skeleton width={54} height={12} />
        </View>
        <View style={styles.grid}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.card}>
              <Skeleton width="100%" height={0} style={{ aspectRatio: 16 / 10 }} radius={0} />
              <View style={styles.cardBody}>
                <Skeleton width="80%" height={13} />
                <Skeleton width="50%" height={11} />
                <Skeleton width="100%" height={4} radius={radius.pill} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

function Card({ pack }: { pack: ShadowPack }) {
  const poster = getPoster(pack.poster_yt);
  const done = Math.min(pack.done_count, pack.sentence_count);
  const pct = pack.sentence_count ? Math.round((done / pack.sentence_count) * 100) : 0;
  const complete = done >= pack.sentence_count && pack.sentence_count > 0;
  const label = catLabel(pack.category);
  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push(`/shadowing-studio?pack=${encodeURIComponent(pack.category)}&title=${encodeURIComponent(label)}`)
      }>
      <View style={styles.cardThumb}>
        {poster ? <Image source={poster} style={styles.thumbImg} resizeMode="cover" /> : null}
        <View style={styles.thumbShade} />
        <View style={styles.cardPlay}>
          <Ionicons name="mic" size={16} color={colors.accent} />
        </View>
        <Text style={styles.cardClips}>{pack.video_count} video</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {label}
        </Text>
        <View style={styles.cardFootRow}>
          <Text style={styles.cardSent}>{pack.sentence_count} cümle</Text>
          {complete ? (
            <Text style={styles.cardDone}>
              Tamamlandı <Ionicons name="checkmark-circle" size={11} color={colors.success} />
            </Text>
          ) : (
            <Text style={styles.cardPct}>
              {done}/{pack.sentence_count}
            </Text>
          )}
        </View>
        <View style={styles.cardBarTrack}>
          <View style={[styles.cardBarFill, { width: `${pct}%` }, complete && { backgroundColor: colors.success }]} />
        </View>
      </View>
    </Pressable>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },

  search: {
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

  chipsScroll: { flexGrow: 0, flexShrink: 0, marginHorizontal: -space.xl },
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

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: colors.surface,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBody: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  bannerSub: { fontSize: 12, color: colors.muted, marginTop: 1 },

  overall: { gap: space.xs },
  overallHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overallLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  overallVal: { fontSize: 12, fontWeight: '700', color: colors.accent },
  barTrack: { height: 6, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.accent },

  section: { gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.3, marginTop: 2 },
  sectionMeta: { fontSize: 12, fontWeight: '700', color: colors.muted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  card: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  cardThumb: { aspectRatio: 16 / 10, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  thumbImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  thumbShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  cardPlay: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardClips: {
    position: 'absolute',
    bottom: space.sm,
    right: space.sm,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  cardBody: { padding: space.sm, gap: space.xs },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, lineHeight: 18 },
  cardFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardSent: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  cardPct: { fontSize: 11, color: colors.accent, fontWeight: '700' },
  cardDone: { fontSize: 11, color: colors.success, fontWeight: '700' },
  cardBarTrack: { height: 4, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  cardBarFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.accent },

  emptyBox: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
});
