import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FocusBadge } from '@/components/focus-badge';
import { ScreenHeader } from '@/components/screen-header';
import { Segmented } from '@/components/segmented';
import { colors, radius, space } from '@/constants/appTheme';
import {
  ActiveFocus,
  countDueCards,
  getActiveFocus,
  getListeningClips,
  ListeningClip,
} from '@/lib/db';
import { colorFor, getTopic } from '@/lib/grammar';
import { getPoster } from '@/lib/posters';
import { getSongsForFocus, type SongClip } from '@/lib/songs';
import { useClipThumb } from '@/lib/videoThumbs';

const PAGE = 20;
type Tab = 'video' | 'song';

// Cumle icinde hedef kalip vurgusunu (span) kalinlastir.
function highlightSpan(text: string, start: number | null, end: number | null, color: string) {
  if (start == null || end == null || end <= start || start < 0 || end > text.length) return <Text>{text}</Text>;
  return (
    <Text>
      {text.slice(0, start)}
      <Text style={{ color, fontWeight: '800' }}>{text.slice(start, end)}</Text>
      {text.slice(end)}
    </Text>
  );
}

// DINLEME: iki bolum (Videolar / Sarkilar). Video kesitleri video adina gore DEGIL,
// "ne ogreneceksin"e gore listelenir: her kart kalip adi + Turkce ne ise yaradigi +
// kalip vurgulu cumle. Liste sayfali (asagi kaydirdikca 20'ser gelir), videolar
// arasinda donusumlu. Odak aktifse yalniz o kalip.
export default function DinlemeScreen() {
  const [tab, setTab] = useState<Tab>('video');
  const [focus, setFocus] = useState<ActiveFocus | null>(null);
  const [due, setDue] = useState(0);
  const [q, setQ] = useState('');
  const [clips, setClips] = useState<ListeningClip[]>([]);
  const [done, setDone] = useState(false);
  const listRef = useRef<FlatList<ListeningClip | SongClip>>(null);

  useFocusEffect(
    useCallback(() => {
      setFocus(getActiveFocus());
      setDue(countDueCards());
      // Sekmeden cikinca basa sar (geri donuste en ustten baslar).
      return () => listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, []),
  );

  const needle = q.trim();
  const focusKey = focus?.key ?? null;

  // Odak ya da arama degisince ilk sayfadan yeniden yukle.
  useEffect(() => {
    const first = getListeningClips({ focusKey, query: needle, limit: PAGE, offset: 0 });
    setClips(first);
    setDone(first.length < PAGE);
  }, [focusKey, needle]);

  const loadMore = useCallback(() => {
    if (done || tab !== 'video') return;
    const next = getListeningClips({ focusKey, query: needle, limit: PAGE, offset: clips.length });
    setClips((c) => [...c, ...next]);
    if (next.length < PAGE) setDone(true);
  }, [done, tab, focusKey, needle, clips.length]);

  const lower = needle.toLowerCase();
  const songs = getSongsForFocus(focusKey).filter(
    (s) => !lower || `${s.artist} ${s.song_title} ${s.target_line}`.toLowerCase().includes(lower),
  );

  const data: (ListeningClip | SongClip)[] = tab === 'video' ? clips : songs;

  const header = (
    <View style={styles.head}>
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

      {due > 0 ? (
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

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={tab === 'video' ? 'Cümle veya konu ara' : 'Şarkı ya da sanatçı ara'}
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <Segmented
        options={[
          { key: 'video', label: 'Videolar' },
          { key: 'song', label: `Şarkılar · ${songs.length}` },
        ]}
        value={tab}
        onChange={(k) => setTab(k as Tab)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(it) => ('clip_id' in it ? `s${it.clip_id}` : `v${it.media_id}:${it.idx}`)}
        renderItem={({ item }) =>
          'clip_id' in item ? (
            <SongRow song={item} onPress={() => router.push(`/song?id=${encodeURIComponent(item.clip_id)}`)} />
          ) : (
            <ClipRow clip={item} />
          )
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {needle ? 'Sonuç yok.' : focus ? `${focus.label} için henüz dinleme kesiti yok.` : 'Henüz içerik yok.'}
          </Text>
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// Kesit karti: ustte ne ogreneceksin (kalip adi + seviye + Turkce aciklama), altta
// kalip vurgulu cumle + ceviri. Solda o anin karesi. Videosuz ornek cumle (curated)
// kapak yerine ses rozeti gosterir; dokununca cihaz cumleyi seslendirir.
function ClipRow({ clip: c }: { clip: ListeningClip }) {
  const isCurated = c.media_id.startsWith('curated_');
  const thumb = useClipThumb(isCurated ? '' : c.media_id, c.start_ms);
  const color = colorFor(getTopic(c.norm_pattern)?.category ?? '');
  const onPress = isCurated
    ? () => {
        Speech.stop();
        Speech.speak(c.text_en, { language: 'en-US', rate: 0.9 });
      }
    : () => router.push(`/player?id=${encodeURIComponent(c.media_id)}&start=${c.start_ms}`);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.goal}>
        <View style={[styles.goalDot, { backgroundColor: color }]} />
        <Text style={[styles.goalTitle, { color }]} numberOfLines={1}>
          {c.topic}
        </Text>
        {c.cefr ? <Text style={styles.goalCefr}>{c.cefr}</Text> : null}
      </View>
      {c.note_tr ? (
        <Text style={styles.goalNote} numberOfLines={2}>
          {c.note_tr}
        </Text>
      ) : null}

      <View style={styles.body}>
        <View style={[styles.thumb, isCurated && styles.thumbCurated]}>
          {isCurated ? (
            <Ionicons name="volume-high" size={22} color={colors.accent} />
          ) : (
            <>
              {thumb ? <ExpoImage source={thumb} style={styles.fill} contentFit="cover" /> : null}
              <View style={styles.play}>
                <Ionicons name="play" size={14} color={colors.accent} />
              </View>
            </>
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.en}>{highlightSpan(c.text_en, c.span_start, c.span_end, color)}</Text>
          {c.text_tr ? (
            <Text style={styles.tr} numberOfLines={2}>
              {c.text_tr}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function SongRow({ song, onPress }: { song: SongClip; onPress: () => void }) {
  const cover = getPoster(song.clip_id);
  const topic = getTopic(song.norm_pattern);
  return (
    <Pressable style={styles.songRow} onPress={onPress}>
      <View style={styles.songIcon}>
        {cover ? (
          <Image source={cover} style={styles.fill} resizeMode="cover" />
        ) : (
          <Ionicons name="musical-note" size={22} color="#fff" />
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {song.song_title}
        </Text>
        <Text style={styles.songLine} numberOfLines={1}>
          {song.artist}
        </Text>
        {topic ? (
          <Text style={[styles.songGoal, { color: colorFor(topic.category) }]} numberOfLines={1}>
            {topic.topic} · {topic.note_tr}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, paddingBottom: space.xxl },
  head: { gap: space.lg, marginBottom: space.md },

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

  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  goal: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  goalDot: { width: 8, height: 8, borderRadius: 4 },
  goalTitle: { flex: 1, fontSize: 13, fontWeight: '800' },
  goalCefr: { fontSize: 11, fontWeight: '800', color: colors.muted },
  goalNote: { fontSize: 12.5, color: colors.muted, lineHeight: 18, marginTop: -4 },

  body: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  thumb: {
    width: 88,
    height: 64,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCurated: { backgroundColor: colors.accentSoft },
  fill: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  play: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  en: { fontSize: 15, fontWeight: '600', color: colors.ink, lineHeight: 22 },
  tr: { fontSize: 12.5, color: colors.muted, lineHeight: 18 },

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
  songTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  songLine: { fontSize: 12.5, color: colors.muted, lineHeight: 18 },
  songGoal: { fontSize: 12, fontWeight: '700' },
});
