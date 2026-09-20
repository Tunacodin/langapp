import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { setStatusBarStyle, StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { WordSheet } from '@/components/word-sheet';
import { getPoster } from '@/lib/posters';
import {
  addSrsCard,
  getChunksForSentence,
  getGrammarForSentence,
  getMedia,
  getSentences,
  getWatchPosition,
  GrammarRow,
  LessonChunk,
  saveWatchProgress,
  SentenceRow,
} from '@/lib/db';
import { resolveVideoSource } from '@/lib/videoSource';
import { getSentenceWords, TWord } from '@/lib/words';

export default function PlayerScreen() {
  const p = useLocalSearchParams<{ id?: string; start?: string }>();
  const insets = useSafeAreaInsets();

  const [mediaId, setMediaId] = useState<string | null>(null);
  const [sentences, setSentences] = useState<SentenceRow[]>([]);
  const [source, setSource] = useState<VideoSource | null>(null);
  const [poster, setPoster] = useState<number | null>(null);
  const [resumeMs, setResumeMs] = useState(0);

  useEffect(() => {
    if (!p.id) return;
    const m = getMedia().find((x) => x.id === p.id);
    if (!m) return;
    setMediaId(m.id);
    setSentences(getSentences(m.id));
    setPoster(getPoster(m.youtube_id));
    // start verilmisse (Kesfet kesiti) o ana git; yoksa kaldigi yerden devam.
    setResumeMs(p.start ? Number(p.start) : getWatchPosition(m.id));
    resolveVideoSource(m.youtube_id, m.video_url).then(setSource);
  }, [p.id, p.start]);

  return (
    <View style={styles.root}>
      <StatusBarLight />
      {mediaId && source ? (
        <CardPlayer
          mediaId={mediaId}
          sentences={sentences}
          source={source}
          poster={poster}
          resumeMs={resumeMs}
          topInset={insets.top}
        />
      ) : (
        // Kaynak cozulurken siyah yerine posteri goster; uzerinde hazirlaniyor notu.
        <View style={[styles.loadWrap, { marginTop: insets.top }]}>
          {poster ? <Image source={poster} style={styles.posterFill} resizeMode="cover" /> : null}
          <View style={styles.loadOverlay}>
            <Text style={styles.loadingText}>Video hazırlanıyor...</Text>
          </View>
        </View>
      )}
      <Pressable style={[styles.back, { top: insets.top + 8 }]} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

// Onceki hali: video ustte, altta TEK aktif cumle karti (kelime + TR + obek pill + ok gecisleri).
function CardPlayer({
  mediaId,
  sentences,
  source,
  poster,
  resumeMs,
  topInset,
}: {
  mediaId: string;
  sentences: SentenceRow[];
  source: VideoSource;
  poster: number | null;
  resumeMs: number;
  topInset: number;
}) {
  // Ilk acilista otomatik oyna; ilk kare gelene kadar poster overlay'i durur.
  const player = useVideoPlayer(source, (pl) => {
    pl.timeUpdateEventInterval = 0.2;
    pl.play();
  });
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [auto, setAuto] = useState(true);
  const autoRef = useRef(true);
  const [aspect, setAspect] = useState(16 / 9);
  const [ms, setMs] = useState(0);
  const [started, setStarted] = useState(false); // ilk kare oynadi mi (poster'i kaldir)
  const [wordSheet, setWordSheet] = useState<string | null>(null); // acik kelime sheet'i (yuzey)
  const resumedRef = useRef(false); // kaldigi konuma bir kez sarildi mi
  const lastSaveRef = useRef(0); // ilerlemeyi en son ne zaman diske yazdik (throttle)

  function setActiveIdx(i: number) {
    activeRef.current = i;
    setActive(i);
  }

  // Ekrandan cikinca (blur/unmount): videoyu durdur ve konumu basa al.
  useFocusEffect(
    useCallback(() => {
      return () => {
        Speech.stop();
        // Ekrandan cikarken son konumu diske yaz (kaldigi yerden devam icin).
        try {
          const posMs = (player.currentTime ?? 0) * 1000;
          const durMs = (player.duration ?? 0) * 1000;
          if (posMs > 0) saveWatchProgress(mediaId, posMs, durMs);
        } catch {}
        try {
          player.pause();
        } catch {}
        activeRef.current = 0;
        setActive(0);
        setMs(0);
      };
    }, [player, mediaId]),
  );

  useEffect(() => {
    const sub = player.addListener('sourceLoad', ({ availableVideoTracks }) => {
      const s = availableVideoTracks?.[0]?.size;
      if (s && s.width > 0 && s.height > 0) setAspect(s.width / s.height);
      // Kaydedilmis konum varsa (Continue Watching) oraya bir kez sar.
      if (!resumedRef.current && resumeMs > 1000) {
        resumedRef.current = true;
        try {
          player.currentTime = resumeMs / 1000;
        } catch {}
      }
    });
    return () => sub.remove();
  }, [player, resumeMs]);

  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      const t = currentTime * 1000;
      setMs(t);
      if (t > 0) setStarted(true); // gercek kare geldi: poster overlay'i kaldir
      // Ilerlemeyi ~5 sn'de bir diske yaz (Continue Watching icin, throttle).
      const now = Date.now();
      if (t > 0 && now - lastSaveRef.current > 5000) {
        lastSaveRef.current = now;
        try {
          saveWatchProgress(mediaId, t, (player.duration ?? 0) * 1000);
        } catch {}
      }
      const cur = sentences[activeRef.current];
      if (!autoRef.current && cur && t >= cur.end_ms) {
        player.pause();
        return;
      }
      let idx = -1;
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].start_ms <= t) idx = i;
        else break;
      }
      if (idx >= 0 && idx !== activeRef.current) setActiveIdx(idx);
    });
    return () => sub.remove();
  }, [player, sentences, mediaId]);

  const current = sentences[active] ?? null;
  const chunks: LessonChunk[] = useMemo(
    () => (current ? getChunksForSentence(mediaId, current.idx) : []),
    [current, mediaId],
  );
  const grammar: GrammarRow[] = useMemo(
    () => (current ? getGrammarForSentence(mediaId, current.idx).filter((g) => g.norm_pattern) : []),
    [current, mediaId],
  );
  const words: TWord[] = useMemo(() => {
    if (!current) return [];
    const next = sentences[active + 1]?.start_ms ?? null;
    return getSentenceWords(mediaId, current.start_ms, next);
  }, [current, active, sentences, mediaId]);
  const activeWord = useMemo(() => {
    let awi = -1;
    for (let i = 0; i < words.length; i++) {
      if (words[i].start_ms <= ms) awi = i;
      else break;
    }
    return awi;
  }, [words, ms]);

  function go(delta: number) {
    const ni = Math.max(0, Math.min(sentences.length - 1, active + delta));
    setActiveIdx(ni);
    player.currentTime = sentences[ni].start_ms / 1000;
    player.play();
  }
  function toggleAuto() {
    const n = !auto;
    setAuto(n);
    autoRef.current = n;
  }
  function openWord(token: string) {
    // Kelimeye dokununca video dursun, bottom sheet acilsin (anlam + turler + ornekler).
    try {
      player.pause();
    } catch {}
    setWordSheet(token);
  }
  function openGrammar(g: GrammarRow) {
    if (!g.norm_pattern) return;
    router.push(
      `/item?type=grammar&key=${encodeURIComponent(g.norm_pattern)}&title=${encodeURIComponent(g.label_tr ?? g.pattern)}`,
    );
  }
  function addChunk(c: LessonChunk) {
    if (!current) return;
    addSrsCard({
      front_type: 'chunk',
      front_en: c.text_en,
      back_tr: c.text_tr,
      media_id: mediaId,
      sentence_idx: current.idx,
    });
  }
  return (
    <View style={{ flex: 1 }}>
      {/* Oynatici blogu */}
      <View style={[styles.playerBlock, { paddingTop: topInset }]}>
        <View style={[styles.videoWrap, { aspectRatio: aspect }]}>
          <VideoView player={player} style={styles.video} contentFit="cover" nativeControls />
          {/* Video ilk kareyi verene kadar siyah yerine poster goster. */}
          {!started && poster ? (
            <Image source={poster} style={styles.posterFill} resizeMode="cover" />
          ) : null}
        </View>
      </View>

      {/* Tek aktif cumle karti */}
      <View style={styles.cardWrap}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.counter}>
              {active + 1} / {sentences.length}
            </Text>
            {/* Otomatik gecme (beklemeden bir sonraki cumleye) - kart ustunde, akista. */}
            <Pressable onPress={toggleAuto} hitSlop={8} style={[styles.autoBtn, auto && styles.autoBtnOn]}>
              <Ionicons
                name={auto ? 'play-forward' : 'play-forward-outline'}
                size={18}
                color={auto ? '#fff' : colors.muted}
              />
            </Pressable>
          </View>

          <View style={styles.cardBody}>
            {current ? (
              <>
                <View style={styles.words}>
                  {words.length > 0
                    ? words.map((wd, i) => {
                        const on = i === activeWord;
                        return (
                          <Pressable key={i} onPress={() => openWord(wd.w)} hitSlop={4}>
                            <Text style={[styles.word, on && styles.wordActive]}>{wd.w}</Text>
                          </Pressable>
                        );
                      })
                    : current.text_en.split(/\s+/).map((tok, i) => (
                        <Pressable key={i} onPress={() => openWord(tok)} hitSlop={4}>
                          <Text style={styles.word}>{tok}</Text>
                        </Pressable>
                      ))}
                </View>
                <Text style={styles.tr}>{current.text_tr}</Text>

                {(chunks.length > 0 || grammar.length > 0) && (
                  <View style={styles.pills}>
                    {grammar.map((g, i) => (
                      <Pressable key={`g${i}`} style={[styles.pill, styles.pillGrammar]} onPress={() => openGrammar(g)}>
                        <Text style={[styles.pillText, { color: colors.teal }]}>{g.label_tr ?? g.pattern}</Text>
                      </Pressable>
                    ))}
                    {chunks.map((c, i) => (
                      <Pressable key={`c${i}`} style={[styles.pill, styles.pillChunk]} onPress={() => addChunk(c)}>
                        <Text style={[styles.pillText, { color: colors.accent }]}>{c.text_en} +</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.tr}>Videoyu oynat.</Text>
            )}
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.navBtn} onPress={() => go(-1)} disabled={active === 0} hitSlop={6}>
              <Ionicons name="chevron-back" size={22} color={active === 0 ? colors.line : colors.ink} />
            </Pressable>
            <Pressable
              style={styles.navBtn}
              onPress={() => go(1)}
              disabled={active >= sentences.length - 1}
              hitSlop={6}>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={active >= sentences.length - 1 ? colors.line : colors.ink}
              />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Kelime detay sheet'i: anlam + turler + ornek cumleler (TR). */}
      <WordSheet
        visible={wordSheet != null}
        onClose={() => setWordSheet(null)}
        surface={wordSheet}
        ctx={current ? { mediaId, sentenceIdx: current.idx } : undefined}
      />
    </View>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loadWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.ink },
  loadOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  loadingText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  posterFill: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  back: { position: 'absolute', left: space.md, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  playerBlock: { backgroundColor: '#000' },
  videoWrap: { width: '100%', backgroundColor: '#000' },
  video: { flex: 1, backgroundColor: '#000' },

  cardWrap: { flex: 1, padding: space.xl },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.lg,
    backgroundColor: colors.bg,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  autoBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  cardBody: { flex: 1, gap: space.md, marginTop: space.md },
  words: { flexDirection: 'row', flexWrap: 'wrap' },
  word: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    lineHeight: 30,
    paddingHorizontal: 5,
    marginRight: 3,
    borderRadius: 4,
  },
  wordActive: { color: '#fff', backgroundColor: colors.accent },
  tr: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  pill: { borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: space.sm },
  pillChunk: { backgroundColor: colors.accentSoft },
  pillGrammar: { backgroundColor: colors.tealSoft },
  pillText: { fontWeight: '700', fontSize: 12 },
  navRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  navBtn: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: space.md,
  },
});
