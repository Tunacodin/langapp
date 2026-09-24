import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { setStatusBarStyle, StatusBar } from 'expo-status-bar';
import { setVideoCacheSizeAsync, useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { GrammarPractice, PracticeUsage } from '@/components/grammar-practice';
import {
  addSrsCard,
  getCrossVideoOccurrencesByLemma,
  getGrammarUsagesByPattern,
  getLexemeDetail,
} from '@/lib/db';
import { resolveVideoSource } from '@/lib/videoSource';

type Scene = {
  mediaId: string;
  youtubeId: string;
  start: number;
  end: number;
  text: string;
  title?: string | null; // kaynak video basligi
  spanStart?: number | null; // gramer kalibinin cumle icindeki vurgu araligi
  spanEnd?: number | null;
};

// Detay ekrani: odakta video SAHNELERI. Ust blokta gomulu oynatici o anin
// [start,end] araligini oynatir; sahneler arasi gezinilir. Alt sirada pratik.
export default function ItemScreen() {
  const p = useLocalSearchParams<{
    type?: string;
    id?: string;
    key?: string;
    title?: string;
    tr?: string;
    practice?: string;
  }>();
  const insets = useSafeAreaInsets();

  const title = p.title ?? '';
  const [meaning, setMeaning] = useState<string>(p.tr ?? '');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [add, setAdd] = useState<Parameters<typeof addSrsCard>[0] | null>(null);
  const [added, setAdded] = useState(false);
  const [usage, setUsage] = useState<PracticeUsage | null>(null); // gramer: pratik icin ilk gercek cumle + span
  const [practice, setPractice] = useState(false);

  // Sahne verisini turune gore topla.
  useEffect(() => {
    if (p.type === 'word' && p.id) {
      const d = getLexemeDetail(Number(p.id));
      if (d) {
        setMeaning(d.senses.map((s) => s.gloss_tr).join(', '));
        setAdd({
          front_type: 'vocab',
          front_en: d.lemma,
          back_tr: d.senses.map((s) => s.gloss_tr).join('; '),
          lexicon_id: d.lexicon_id,
          source: 'vocab',
        });
        const occ = getCrossVideoOccurrencesByLemma(d.lemma);
        setScenes(dedupe(occ.map((o) => scene(o.media_id, o.media_id, o.sent_start, o.sent_end, o.text_en))));
      }
    } else if (p.type === 'grammar' && p.key) {
      // Konu basligi altinda TUM videolardan TUM kesitler (limit yok).
      const u = getGrammarUsagesByPattern(p.key, undefined, 999);
      setScenes(
        dedupe(
          u.map((x) => ({
            mediaId: x.media_id,
            youtubeId: x.media_id,
            start: x.sent_start,
            end: x.sent_end,
            text: x.text_en,
            title: x.title,
            spanStart: x.span_start,
            spanEnd: x.span_end,
          })),
        ),
      );
      setAdd({ front_type: 'grammar', front_en: p.key, back_tr: p.title ?? '', source: 'grammar' });
      if (u[0]) {
        setUsage({ text_en: u[0].text_en, span_start: u[0].span_start, span_end: u[0].span_end });
        if (p.practice === '1') setPractice(true); // yol haritasi 3. adim: pratigi hemen ac
      }
    } else if (p.type === 'chunk' && p.key) {
      setAdd({ front_type: 'chunk', front_en: p.key, back_tr: p.tr ?? '', source: 'vocab' });
      // Obeklerde zaman damgasi yok -> sahne yok.
    }
  }, [p.type, p.id, p.key]);

  return (
    <View style={styles.root}>
      <StatusBarLight />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}>
        {scenes.length > 0 ? (
          <ScenePlayer scenes={scenes} topInset={insets.top} />
        ) : (
          <View style={[styles.noScene, { paddingTop: insets.top + space.xl }]}>
            <Ionicons name="videocam-off-outline" size={28} color={colors.muted} />
          </View>
        )}

        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          {meaning ? <Text style={styles.meaning}>{meaning}</Text> : null}
          {p.type === 'grammar' && scenes.length > 0 ? (
            <View style={styles.clipInfo}>
              <Ionicons name="film-outline" size={15} color={colors.teal} />
              <Text style={styles.clipInfoText}>
                {scenes.length} kesit · {new Set(scenes.map((s) => s.mediaId)).size} video
              </Text>
            </View>
          ) : null}
          {p.type === 'grammar' && usage ? (
            <Pressable style={styles.practiceBtn} onPress={() => setPractice(true)}>
              <Ionicons name="school-outline" size={18} color="#fff" />
              <Text style={styles.practiceText}>Pratiğe Başla</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {p.type === 'grammar' ? (
        <GrammarPractice visible={practice} onClose={() => setPractice(false)} label={title} usage={usage} />
      ) : null}

      {/* Sabit alt aksiyon cubugu: ikon odakli, minimum yazi. */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + space.sm }]}>
        <Pressable style={styles.barBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Pressable style={styles.barBtn} onPress={() => speakPractice(title, meaning, false, scenes)} hitSlop={8}>
          <Ionicons name="mic-outline" size={22} color={colors.ink} />
        </Pressable>
        <Pressable style={styles.barBtn} onPress={() => speakPractice(title, meaning, true, scenes)} hitSlop={8}>
          <Ionicons name="flame-outline" size={22} color={colors.ink} />
        </Pressable>
        {add ? (
          <Pressable
            style={styles.barBtn}
            hitSlop={8}
            onPress={() => {
              addSrsCard(add);
              setAdded(true);
            }}>
            <Ionicons name={added ? 'checkmark' : 'add'} size={24} color={added ? colors.success : colors.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// Gomulu sahne oynatici: mevcut sahnenin [start,end] araligini oynatir, durur.
function ScenePlayer({ scenes, topInset }: { scenes: Scene[]; topInset: number }) {
  const [idx, setIdx] = useState(0);
  const [source, setSource] = useState<VideoSource | null>(null);
  const [aspect, setAspect] = useState(16 / 9);
  const loadedMedia = useRef<string | null>(null);
  const pendingStart = useRef<number | null>(null);
  const endRef = useRef(0);

  const sc = scenes[idx];

  useEffect(() => {
    setVideoCacheSizeAsync(512 * 1024 * 1024).catch(() => {});
  }, []);

  // Sahne degisince: gerekiyorsa kaynagi coz, sonra basa sar + oynat.
  useEffect(() => {
    if (!sc) return;
    endRef.current = sc.end;
    pendingStart.current = sc.start;
    if (loadedMedia.current === sc.mediaId) {
      player.currentTime = sc.start / 1000;
      player.play();
    } else {
      loadedMedia.current = sc.mediaId;
      resolveVideoSource(sc.youtubeId, null).then((s) => setSource(s));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, sc?.mediaId]);

  const player = useVideoPlayer(source, (pl) => {
    pl.timeUpdateEventInterval = 0.1;
  });

  // Ekrandan cikinca (blur/unmount): sahne videosunu durdur.
  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          player.pause();
        } catch {}
      };
    }, [player]),
  );

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' && pendingStart.current != null) {
        player.currentTime = pendingStart.current / 1000;
        player.play();
        pendingStart.current = null;
      }
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (endRef.current > 0 && currentTime * 1000 >= endRef.current) player.pause();
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    const sub = player.addListener('sourceLoad', ({ availableVideoTracks }) => {
      const s = availableVideoTracks?.[0]?.size;
      if (s && s.width > 0 && s.height > 0) setAspect(s.width / s.height);
    });
    return () => sub.remove();
  }, [player]);

  function replay() {
    if (!sc) return;
    player.currentTime = sc.start / 1000;
    player.play();
  }

  return (
    <View style={[styles.player, { paddingTop: topInset }]}>
      <View style={[styles.videoWrap, { aspectRatio: aspect }]}>
        {source ? (
          <Pressable onPress={replay} style={StyleSheet.absoluteFill}>
            <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
          </Pressable>
        ) : null}
      </View>
      {sc?.title ? (
        <View style={styles.sceneSource}>
          <Ionicons name="videocam-outline" size={13} color="rgba(255,255,255,0.7)" />
          <Text style={styles.sceneSourceText} numberOfLines={1}>
            {sc.title}
          </Text>
        </View>
      ) : null}
      <Text style={styles.sceneText}>{renderSceneText(sc)}</Text>
      {scenes.length > 1 ? (
        <View style={styles.sceneNav}>
          <Pressable onPress={() => setIdx((v) => Math.max(0, v - 1))} disabled={idx === 0} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={idx === 0 ? '#555' : '#fff'} />
          </Pressable>
          <Text style={styles.sceneCount}>
            {idx + 1} / {scenes.length}
          </Text>
          <Pressable
            onPress={() => setIdx((v) => Math.min(scenes.length - 1, v + 1))}
            disabled={idx >= scenes.length - 1}
            hitSlop={8}>
            <Ionicons name="chevron-forward" size={22} color={idx >= scenes.length - 1 ? '#555' : '#fff'} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// Kesit cumlesini, gramer kalibinin gectigi bolumu vurgulayarak goster.
// Span yoksa duz metin. Karakter araligi (spanStart,spanEnd) cumle icinde.
function renderSceneText(sc: Scene | undefined) {
  if (!sc) return null;
  const { text, spanStart, spanEnd } = sc;
  if (
    spanStart == null ||
    spanEnd == null ||
    spanEnd <= spanStart ||
    spanStart < 0 ||
    spanEnd > text.length
  ) {
    return text;
  }
  return (
    <>
      {text.slice(0, spanStart)}
      <Text style={styles.sceneHighlight}>{text.slice(spanStart, spanEnd)}</Text>
      {text.slice(spanEnd)}
    </>
  );
}

function StatusBarLight() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );
  return <StatusBar style="light" />;
}

function scene(mediaId: string, youtubeId: string, start: number, end: number, text: string): Scene {
  return { mediaId, youtubeId, start, end, text };
}
function dedupe(list: Scene[]): Scene[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    const k = `${s.mediaId}:${s.start}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function speakPractice(title: string, hint: string, hard: boolean, scenes: Scene[]) {
  const target = scenes[0]?.text ?? title;
  router.push({
    pathname: '/shadowing-studio',
    params: hard ? { text: target, hard: '1', hint } : { text: target },
  });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { gap: space.lg },
  player: { backgroundColor: '#000' },
  videoWrap: { width: '100%', backgroundColor: '#000' },
  video: { flex: 1, backgroundColor: '#000' },
  sceneText: { color: '#fff', fontSize: 17, fontWeight: '600', lineHeight: 24, padding: space.lg },
  sceneHighlight: { color: colors.warning, fontWeight: '800' },
  sceneSource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  sceneSourceText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', flex: 1 },
  sceneNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    paddingBottom: space.md,
  },
  sceneCount: { color: '#fff', fontSize: 13, fontWeight: '700' },
  noScene: { alignItems: 'center', paddingBottom: space.lg },
  head: { paddingHorizontal: space.xl, gap: space.sm },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  meaning: { fontSize: 17, color: colors.muted },
  clipInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clipInfoText: { fontSize: 14, color: colors.teal, fontWeight: '700' },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    marginTop: space.sm,
  },
  practiceText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: space.sm,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  barBtn: {
    width: 52,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
});
