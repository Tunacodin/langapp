import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FocusBadge } from '@/components/focus-badge';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, space } from '@/constants/appTheme';
import { Image as ExpoImage } from 'expo-image';
import * as Speech from 'expo-speech';

import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';
import {
  ActiveFocus,
  countDueCards,
  getActiveFocus,
  getGrammarUsagesByPattern,
  getWatchClips,
  GrammarUsage,
  WatchClip,
} from '@/lib/db';
import { getPoster } from '@/lib/posters';
import { getSongsForFocus, type SongClip } from '@/lib/songs';
import { useClipThumb } from '@/lib/videoThumbs';

// Cumle icinde hedef kalip vurgusunu (span) kalinlastir.
function highlightSpan(text: string, start: number | null, end: number | null) {
  if (start == null || end == null || end <= start || start < 0 || end > text.length) return <Text>{text}</Text>;
  return (
    <Text>
      {text.slice(0, start)}
      <Text style={styles.hi}>{text.slice(start, end)}</Text>
      {text.slice(end)}
    </Text>
  );
}

function dedupeUsages(list: GrammarUsage[]): GrammarUsage[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    const k = `${s.media_id}:${s.sentence_idx}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// DINLEME: seviyene uygun video kesitlerini izleyip dinle. Kesitler KONU BASLIGINA
// (kaynak video basligi) gore gruplanir; her grup kendi basligiyla ayrisir.
// Ustte arama + "Bugun" tekrar seridi. Seviye (CEFR) cipleri kaldirildi.
export default function DinlemeScreen() {
  const [watch, setWatch] = useState<WatchClip[]>([]);
  const [focus, setFocus] = useState<ActiveFocus | null>(null);
  const [usages, setUsages] = useState<GrammarUsage[]>([]);
  const [due, setDue] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useScrollTopOnBlur();

  useFocusEffect(
    useCallback(() => {
      const f = getActiveFocus();
      setFocus(f);
      setUsages(f ? dedupeUsages(getGrammarUsagesByPattern(f.key, undefined, 80)) : []);
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
  const fUsages = useMemo(
    () => usages.filter((u) => !needle || `${u.text_en} ${u.text_tr}`.toLowerCase().includes(needle)),
    [usages, needle],
  );

  // Sarki kesitleri: aktif odaga (norm_pattern) uyanlar one gelir, tumu listelenir.
  const songs = useMemo(() => {
    const list = getSongsForFocus(focus?.key);
    return list.filter(
      (s) => !needle || `${s.artist} ${s.song_title} ${s.target_line}`.toLowerCase().includes(needle),
    );
  }, [focus?.key, needle]);

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

        <FocusBadge />

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

        {/* Sarki ile Pratik: odakli bosluk doldurma kesitleri */}
        {!loading && songs.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Ionicons name="musical-notes" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle} numberOfLines={1}>
                Şarkı ile Pratik
              </Text>
              <Text style={styles.sectionCount}>{songs.length}</Text>
            </View>
            {songs.map((s) => (
              <SongRow
                key={s.clip_id}
                song={s}
                onPress={() => router.push(`/song?id=${encodeURIComponent(s.clip_id)}`)}
              />
            ))}
          </View>
        ) : null}

        {loading ? <DinlemeSkeleton /> : null}

        {/* ODAK AKTIF: sadece o yapinin gectigi kesitler, hedef kisim vurgulu + anlamli */}
        {!loading && focus ? (
          <View style={styles.section}>
            {fUsages.length === 0 ? (
              <Text style={styles.empty}>
                {searching ? 'Sonuç yok.' : `${focus.label} için henüz dinleme kesiti yok.`}
              </Text>
            ) : (
              fUsages.map((u) => (
                <FocusRow
                  key={`u${u.media_id}${u.sentence_idx}`}
                  usage={u}
                  onPress={() =>
                    router.push(`/player?id=${encodeURIComponent(u.media_id)}&start=${u.sent_start}`)
                  }
                />
              ))
            )}
          </View>
        ) : null}

        {/* ODAK YOK: serbest gezinme, kaynak videoya gore gruplu */}
        {!loading && !focus && groups.length === 0 ? (
          <Text style={styles.empty}>{searching ? 'Sonuç yok.' : 'Henüz içerik yok.'}</Text>
        ) : null}

        {!loading && !focus
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

// Odak kesiti satiri: SOLDA o kesitin baslangic karesi (kapak), sagda hedef yapi
// vurgulu cumle + Turkce. Her klip kendi karesini alir; ayni videonun klipleri
// farkli kapak gosterir. Curated (videosuz ornek cumle) kartlarda kapak yerine
// sesli okuma (TTS) rozeti; dokununca cihaz cumleyi seslendirir.
function FocusRow({ usage: u, onPress }: { usage: GrammarUsage; onPress: () => void }) {
  const isCurated = u.media_id.startsWith('curated_');
  const thumb = useClipThumb(isCurated ? '' : u.media_id, u.sent_start);
  return (
    <Pressable
      style={styles.fRow}
      onPress={
        isCurated
          ? () => {
              Speech.stop();
              Speech.speak(u.text_en, { language: 'en-US', rate: 0.9 });
            }
          : onPress
      }>
      <View style={[styles.fThumb, isCurated && styles.fThumbCurated]}>
        {isCurated ? (
          <Ionicons name="volume-high" size={22} color={colors.accent} />
        ) : (
          <>
            {thumb ? <ExpoImage source={thumb} style={styles.fThumbImg} contentFit="cover" /> : null}
            <View style={styles.rowPlay}>
              <Ionicons name="play" size={15} color={colors.accent} />
            </View>
          </>
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.fEn}>{highlightSpan(u.text_en, u.span_start, u.span_end)}</Text>
        {u.text_tr ? (
          <Text style={styles.fTr} numberOfLines={2}>
            {u.text_tr}
          </Text>
        ) : null}
        <Text style={styles.fSource} numberOfLines={1}>
          {u.title}
        </Text>
      </View>
    </Pressable>
  );
}

// Sarki satiri: solda mercan nota rozeti, sagda sarki + hedef satir + odak etiketi.
function SongRow({ song, onPress }: { song: SongClip; onPress: () => void }) {
  const cover = getPoster(song.clip_id);
  return (
    <Pressable style={styles.songRow} onPress={onPress}>
      <View style={styles.songIcon}>
        {cover ? (
          <Image source={cover} style={styles.songCover} resizeMode="cover" />
        ) : (
          <Ionicons name="musical-note" size={22} color="#fff" />
        )}
        <View style={styles.songPlay}>
          <Ionicons name="play" size={13} color={colors.accent} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {song.song_title}
        </Text>
        <Text style={styles.songLine} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
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

  focusIntro: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: space.md,
  },
  focusIntroText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 19 },
  focusIntroStrong: { fontWeight: '800', color: colors.accent },

  fRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.sm,
  },
  fThumb: {
    width: 96,
    height: 72,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fThumbCurated: { backgroundColor: colors.accentSoft },
  fThumbImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  fEn: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 22 },
  fTr: { fontSize: 12.5, color: colors.muted, lineHeight: 18 },
  fSource: { fontSize: 11, color: colors.muted, fontWeight: '600', marginTop: 2 },
  fPlay: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hi: { color: colors.accent, fontWeight: '800' },

  empty: { fontSize: 14, color: colors.muted, paddingVertical: space.lg, textAlign: 'center' },

  songRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.sm,
  },
  songIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  songCover: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  songPlay: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  songLine: { fontSize: 12.5, color: colors.muted, lineHeight: 18 },
});
