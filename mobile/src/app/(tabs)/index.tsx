import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, space } from '@/constants/appTheme';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';
import {
  CourseUnitOverview,
  getCourseUnits,
  getSetting,
  getWatchClips,
  WatchClip,
} from '@/lib/db';
import { getPoster } from '@/lib/posters';

type Chip = { key: string; label: string; accent?: boolean };

// DINLEME: seviyene uygun video kesitlerini izleyip dinle. Kart birimi = calisma
// KESITI (tek cumle klibi). Ustte arama + seviye cipleri + ders uniteleri seridi,
// altta "Bugunun Onerilen Videolari" dikey listesi. Tum metrikler GERCEK.
// NOT: "Ders Uniteleri" seridi eski Kesfet'ten geldi; nihai yeri henuz belirsiz.
export default function DinlemeScreen() {
  const [watch, setWatch] = useState<WatchClip[]>([]);
  const [units, setUnits] = useState<CourseUnitOverview[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [cefr, setCefr] = useState('all'); // 'all' | 'i1' | CEFR kodu
  const [loading, setLoading] = useState(true);
  const scrollRef = useScrollTopOnBlur();

  useFocusEffect(
    useCallback(() => {
      setWatch(getWatchClips(60));
      setUnits(getCourseUnits());
      setLevel(getSetting('level'));
      setLoading(false);
    }, []),
  );

  // Seviye cipleri: Tumu + i+1 (onboarding seviyesi) + veride gecen seviyeler.
  const chips = useMemo<Chip[]>(() => {
    const set = new Set<string>();
    for (const c of watch) if (c.cefr) set.add(c.cefr);
    const cefrs = [...set].sort();
    return [
      { key: 'all', label: 'Tümü' },
      ...(level ? [{ key: 'i1', label: `Seviyem (${level})`, accent: true }] : []),
      ...cefrs.map((c) => ({ key: c, label: c })),
    ];
  }, [watch, level]);

  const needle = q.trim().toLowerCase();
  const wantCefr = cefr === 'i1' ? level : cefr === 'all' ? null : cefr;

  const fWatch = useMemo(
    () =>
      watch.filter((c) => {
        if (wantCefr && c.cefr !== wantCefr) return false;
        if (needle && !(`${c.text_en} ${c.text_tr ?? ''} ${c.title}`.toLowerCase().includes(needle))) return false;
        return true;
      }),
    [watch, wantCefr, needle],
  );

  const searching = needle.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Dinleme"
          subtitle="İzleyerek ve dinleyerek öğren"
          icon="headset"
          right={
            <>
              <Pressable onPress={() => router.push('/vocabulary')} hitSlop={8}>
                <Ionicons name="book-outline" size={22} color={colors.muted} />
              </Pressable>
              <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
                <Ionicons name="notifications-outline" size={22} color={colors.muted} />
              </Pressable>
            </>
          }
        />

        {/* Arama + filtre sifirla */}
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Video, konuşmacı veya cümle ara"
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

        {loading ? <DinlemeSkeleton /> : null}

        {/* Seviye cipleri */}
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

        {/* Ders uniteleri (coursebook) - arama yokken */}
        {!loading && !searching ? <UnitsStrip units={units} /> : null}

        {/* Bugunun onerilen videolari (dikey liste) */}
        {!loading ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Ionicons name="play-circle" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Bugünün Önerilen Videoları</Text>
              <Text style={styles.sectionCount}>{fWatch.length}</Text>
            </View>
            {fWatch.length === 0 ? (
              <Text style={styles.empty}>{searching ? 'Sonuç yok.' : 'Bu seviyede içerik yok.'}</Text>
            ) : (
              fWatch.map((c) => (
                <VideoRow
                  key={`w${c.media_id}${c.idx}`}
                  clip={c}
                  onPress={() => router.push(`/player?id=${encodeURIComponent(c.media_id)}&start=${c.start_ms}`)}
                />
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// Tam genislikte video satiri: kucuk poster + cumle + sure + obek sayisi (GERCEK).
function VideoRow({ clip: c, onPress }: { clip: WatchClip; onPress: () => void }) {
  const poster = getPoster(c.youtube_id);
  const dur = c.end_ms - c.start_ms;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowThumb}>
        {poster ? <Image source={poster} style={styles.thumbImg} resizeMode="cover" /> : null}
        <View style={styles.rowPlay}>
          <Ionicons name="play" size={15} color={colors.accent} />
        </View>
        {dur > 0 ? <Text style={styles.rowDur}>{fmt(dur)}</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowText} numberOfLines={2}>
          {c.text_en}
        </Text>
        <View style={styles.rowFootRow}>
          {c.cefr ? <Text style={styles.rowCefr}>{c.cefr}</Text> : null}
          <Text style={styles.rowFoot} numberOfLines={1}>
            {c.chunk_count} öbek · {c.title}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function DinlemeSkeleton() {
  return (
    <>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[54, 96, 44, 44].map((w, i) => (
          <Skeleton key={i} width={w} height={32} radius={radius.pill} />
        ))}
      </View>
      {[0, 1, 2].map((r) => (
        <View key={r} style={styles.row}>
          <Skeleton width={112} height={64} radius={radius.sm} />
          <View style={{ flex: 1, gap: space.xs }}>
            <Skeleton width="90%" height={14} />
            <Skeleton width="50%" height={11} />
          </View>
        </View>
      ))}
    </>
  );
}

// Ders uniteleri seridi: 8 tematik unite, GERCEK icerik sayimlariyla.
function UnitsStrip({ units }: { units: CourseUnitOverview[] }) {
  if (!units.length) return null;
  return (
    <View style={styles.unitsBlock}>
      <View style={styles.unitsHead}>
        <Text style={styles.unitsTitle}>Ders Üniteleri</Text>
        <Text style={styles.unitsSub}>Tema · gramer · kelime</Text>
      </View>
      <FlatList
        data={units}
        horizontal
        keyExtractor={(u) => String(u.no)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.unitsRow}
        renderItem={({ item: u }) => {
          const total = u.grammarCount + u.vocabCount + u.readingCount + u.listeningCount;
          return (
            <Pressable style={styles.unitCard} onPress={() => router.push(`/unit?no=${u.no}`)}>
              <View style={styles.unitTop}>
                <View style={styles.unitBadge}>
                  <Ionicons name={u.icon as never} size={16} color={colors.accent} />
                </View>
                <Text style={styles.unitNo}>ÜNİTE {String(u.no).padStart(2, '0')}</Text>
              </View>
              <Text style={styles.unitTitle} numberOfLines={2}>
                {u.title_tr}
              </Text>
              <Text style={styles.unitMeta} numberOfLines={1}>
                {u.grammarCount} gramer · {u.vocabCount} kelime
              </Text>
              <View style={styles.unitFoot}>
                <Text style={styles.unitCefr}>{u.cefr}</Text>
                {total === 0 ? <Text style={styles.unitSoon}>yakında</Text> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function fmt(ms: number) {
  const s = Math.floor((ms || 0) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },

  unitsBlock: { gap: space.sm },
  unitsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  unitsTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  unitsSub: { fontSize: 12, color: colors.muted },
  unitsRow: { gap: space.md, paddingRight: space.xl },
  unitCard: {
    width: 156,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  unitTop: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  unitBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitNo: { fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  unitTitle: { fontSize: 14, fontWeight: '800', color: colors.ink, lineHeight: 18, marginTop: 2, minHeight: 36 },
  unitMeta: { fontSize: 11, color: colors.muted },
  unitFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  unitCefr: { fontSize: 10, fontWeight: '800', color: colors.teal, backgroundColor: colors.tealSoft, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  unitSoon: { fontSize: 10, color: colors.muted, fontStyle: 'italic' },

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
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.3, flex: 1 },
  sectionCount: { fontSize: 12, color: colors.muted, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.sm,
    alignItems: 'center',
  },
  rowThumb: {
    width: 112,
    height: 64,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  rowPlay: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDur: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  rowText: { fontSize: 14, fontWeight: '700', color: colors.ink, lineHeight: 19 },
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
