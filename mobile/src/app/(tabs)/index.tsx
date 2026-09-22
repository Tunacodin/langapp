import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, space } from '@/constants/appTheme';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';
import { countDueCards, getWatchClips, WatchClip } from '@/lib/db';
import { getPoster } from '@/lib/posters';

// DINLEME: seviyene uygun video kesitlerini izleyip dinle. Kesitler KONU BASLIGINA
// (kaynak video basligi) gore gruplanir; her grup kendi basligiyla ayrisir.
// Ustte arama + "Bugun" tekrar seridi. Seviye (CEFR) cipleri kaldirildi.
export default function DinlemeScreen() {
  const [watch, setWatch] = useState<WatchClip[]>([]);
  const [due, setDue] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useScrollTopOnBlur();

  useFocusEffect(
    useCallback(() => {
      setWatch(getWatchClips(80));
      setDue(countDueCards());
      setLoading(false);
    }, []),
  );

  const needle = q.trim().toLowerCase();
  const fWatch = useMemo(
    () =>
      watch.filter(
        (c) => !needle || `${c.text_en} ${c.text_tr ?? ''} ${c.title}`.toLowerCase().includes(needle),
      ),
    [watch, needle],
  );

  // Konu basligina (kaynak video) gore grupla; ilk gorulen sirayi korur.
  const groups = useMemo(() => {
    const map = new Map<string, WatchClip[]>();
    for (const c of fWatch) {
      const key = c.title || 'Diğer';
      const arr = map.get(key);
      if (arr) arr.push(c);
      else map.set(key, [c]);
    }
    return [...map.entries()].map(([title, clips]) => ({ title, clips }));
  }, [fWatch]);

  const searching = needle.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Dinleme"
          subtitle="İzleyerek ve dinleyerek öğren"
          icon="headset"
          right={
            <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
              <Ionicons name="notifications-outline" size={22} color={colors.muted} />
            </Pressable>
          }
        />

        {/* Bugun seridi: vadesi gelen tekrarlar icin tek birlesik giris. */}
        {!loading && due > 0 ? (
          <Pressable style={styles.today} onPress={() => router.push('/review')}>
            <View style={styles.todayIcon}>
              <Ionicons name="alarm" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayTitle}>Bugün · {due} hatırlatma</Text>
              <Text style={styles.todaySub}>Tekrar zamanı gelen kartların seni bekliyor</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.accent} />
          </Pressable>
        ) : null}

        {/* Arama */}
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Video, konuşmacı veya cümle ara"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {loading ? <DinlemeSkeleton /> : null}

        {!loading && groups.length === 0 ? (
          <Text style={styles.empty}>{searching ? 'Sonuç yok.' : 'Henüz içerik yok.'}</Text>
        ) : null}

        {/* Konu basligina gore gruplu video listesi */}
        {!loading
          ? groups.map((g) => (
              <View key={g.title} style={styles.section}>
                <View style={styles.sectionHead}>
                  <Ionicons name="play-circle" size={18} color={colors.accent} />
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    {g.title}
                  </Text>
                  <Text style={styles.sectionCount}>{g.clips.length}</Text>
                </View>
                {g.clips.map((c) => (
                  <VideoRow
                    key={`w${c.media_id}${c.idx}`}
                    clip={c}
                    onPress={() => router.push(`/player?id=${encodeURIComponent(c.media_id)}&start=${c.start_ms}`)}
                  />
                ))}
              </View>
            ))
          : null}
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
        <Text style={styles.rowFoot} numberOfLines={1}>
          {c.chunk_count} öbek
        </Text>
      </View>
    </Pressable>
  );
}

function DinlemeSkeleton() {
  return (
    <>
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

function fmt(ms: number) {
  const s = Math.floor((ms || 0) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },

  today: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: space.md,
  },
  todayIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  todaySub: { fontSize: 12, color: colors.muted, marginTop: 2 },

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

  section: { gap: space.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
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
  rowFoot: { fontSize: 11, fontWeight: '600', color: colors.muted, marginTop: 4 },

  empty: { fontSize: 14, color: colors.muted, paddingVertical: space.lg, textAlign: 'center' },
});
