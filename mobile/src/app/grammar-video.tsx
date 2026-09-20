import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { setVideoCacheSizeAsync, useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { getGrammarLibrary, getGrammarUsagesByPattern, GrammarUsage } from '@/lib/db';
import {
  getGrammarLesson,
  VideoPracticeError,
  VideoPracticeGap,
  VideoPracticeScramble,
  VideoPracticeStage,
} from '@/lib/grammarLessons';
import { resolveVideoSource } from '@/lib/videoSource';

// Gramer yol haritasi ADIM 3: Video Kesitleri + 4 asamali pratik. TAM EKRAN.
// Video ve transkript GERCEK veriden (getGrammarUsagesByPattern); pratik ve ipucu
// grammarLessons.ts'ten (elle yazilmis). item.tsx'e / bottom-sheet'e YONLENDIRME YOK.

function speak(text: string, rate = 0.85) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate });
}

// Cumle icinde kalip vurgusunu (span) kalinlastir.
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

export default function GrammarVideoScreen() {
  const p = useLocalSearchParams<{ key?: string; title?: string }>();
  const insets = useSafeAreaInsets();

  const lesson = useMemo(() => getGrammarLesson(p.key), [p.key]);
  const row = useMemo(() => getGrammarLibrary().find((r) => r.norm_pattern === p.key) ?? null, [p.key]);
  const title = row?.label_tr ?? p.title ?? '';
  const scenes = useMemo(
    () => (p.key ? dedupe(getGrammarUsagesByPattern(p.key, undefined, 999)) : []),
    [p.key],
  );

  const [idx, setIdx] = useState(0);
  const sc = scenes[idx];

  return (
    <View style={styles.root}>
      <TopBar title={title} insets={insets} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}>
        {/* Video hero (gercek sahne) + klip secici */}
        {scenes.length > 0 ? (
          <View style={styles.card}>
            <ScenePlayer scenes={scenes} idx={idx} cefr={row?.cefr ?? null} minutes={lesson?.video?.minutes} />
            <View style={styles.cardPad}>
              <Text style={styles.h2}>Video Kesiti ile Doğal Kullanım</Text>
              {lesson?.video?.intro ? <Text style={styles.intro}>{lesson.video.intro}</Text> : null}
              {scenes.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                  {scenes.map((s, i) => {
                    const on = i === idx;
                    return (
                      <Pressable key={`${s.media_id}:${s.sentence_idx}`} style={[styles.pill, on && styles.pillOn]} onPress={() => setIdx(i)}>
                        <Text style={[styles.pillText, on && styles.pillTextOn]} numberOfLines={1}>
                          {i + 1}. {s.title || 'Kesit'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.noVideo}>
            <Ionicons name="videocam-off-outline" size={28} color={colors.muted} />
            <Text style={styles.noVideoText}>Bu kalıp için video kesiti bulunamadı.</Text>
          </View>
        )}

        {/* Transkript (gercek text_en + text_tr) */}
        {sc ? (
          <View style={styles.card}>
            <View style={styles.cardPad}>
              <View style={styles.transHead}>
                <View style={styles.transHeadLeft}>
                  <View style={styles.transTick} />
                  <Text style={styles.transKicker}>VİDEO TRANSKRİPTİ</Text>
                </View>
                <Pressable style={styles.roundBtn} onPress={() => speak(sc.text_en)} hitSlop={8}>
                  <Ionicons name="volume-high" size={18} color={colors.muted} />
                </Pressable>
              </View>
              <View style={styles.transBox}>
                <Text style={styles.transEn}>{highlightSpan(sc.text_en, sc.span_start, sc.span_end)}</Text>
                {sc.text_tr ? <Text style={styles.transTr}>{sc.text_tr}</Text> : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* 4 asamali pratik (elle yazilmis) */}
        {lesson?.video?.practice?.length ? (
          <View style={styles.section}>
            <View style={styles.secHead}>
              <Text style={styles.h3}>Kavrama Pratiği</Text>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>{lesson.video.practice.length} Adım</Text>
              </View>
            </View>
            {lesson.video.practice.map((stage, i) => (
              <Stage key={i} n={i + 1} stage={stage} />
            ))}
          </View>
        ) : null}

        {/* Ogrenme ipucu */}
        {lesson?.video?.tip ? (
          <View style={styles.tipBox}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb-outline" size={18} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{lesson.video.tip.title}</Text>
              <Text style={styles.tipText}>{lesson.video.tip.text}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Sabit alt: Adim 4 (okuma) varsa oraya gec, yoksa yol haritasina don */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + space.sm }]}>
        <Pressable
          style={styles.cta}
          onPress={() => {
            if (lesson?.reading) {
              router.replace(
                `/grammar-reading?key=${encodeURIComponent(p.key ?? '')}&title=${encodeURIComponent(title)}`,
              );
            } else {
              router.back();
            }
          }}>
          <Ionicons name={lesson?.reading ? 'arrow-forward' : 'checkmark-circle'} size={20} color="#fff" />
          <Text style={styles.ctaText}>
            {lesson?.reading ? 'İzledim · 04. Adıma geç' : "Adım 3'ü tamamladım · Yol haritasına dön"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- Gomulu sahne oynatici (gercek video, [start,end] araligi) ---
function ScenePlayer({
  scenes,
  idx,
  cefr,
  minutes,
}: {
  scenes: GrammarUsage[];
  idx: number;
  cefr: string | null;
  minutes?: number;
}) {
  const [source, setSource] = useState<VideoSource | null>(null);
  const [aspect, setAspect] = useState(16 / 9);
  const [playing, setPlaying] = useState(false);
  const loadedMedia = useRef<string | null>(null);
  const pendingStart = useRef<number | null>(null);
  const endRef = useRef(0);
  const sc = scenes[idx];

  useEffect(() => {
    setVideoCacheSizeAsync(512 * 1024 * 1024).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sc) return;
    endRef.current = sc.sent_end;
    pendingStart.current = sc.sent_start;
    if (loadedMedia.current === sc.media_id) {
      player.currentTime = sc.sent_start / 1000;
      player.play();
    } else {
      loadedMedia.current = sc.media_id;
      resolveVideoSource(sc.media_id, null).then((s) => setSource(s));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, sc?.media_id]);

  const player = useVideoPlayer(source, (pl) => {
    pl.timeUpdateEventInterval = 0.1;
  });

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
    const sub = player.addListener('playingChange', ({ isPlaying }) => setPlaying(isPlaying));
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    const sub = player.addListener('sourceLoad', ({ availableVideoTracks }) => {
      const s = availableVideoTracks?.[0]?.size;
      if (s && s.width > 0 && s.height > 0) setAspect(s.width / s.height);
    });
    return () => sub.remove();
  }, [player]);

  function toggle() {
    if (!sc) return;
    if (playing) {
      player.pause();
    } else {
      if (player.currentTime * 1000 >= endRef.current) player.currentTime = sc.sent_start / 1000;
      player.play();
    }
  }

  return (
    <View style={[styles.videoWrap, { aspectRatio: aspect }]}>
      {source ? <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} /> : null}
      <View style={styles.videoOverlay} pointerEvents="box-none">
        <View style={styles.videoTop}>
          <View style={styles.videoBadges}>
            {cefr ? (
              <View style={styles.vBadge}>
                <Text style={styles.vBadgeText}>{cefr}</Text>
              </View>
            ) : null}
            <View style={[styles.vBadge, styles.vBadgeRed]}>
              <Text style={[styles.vBadgeText, { color: '#fff' }]}>VİDEO KESİTİ</Text>
            </View>
          </View>
          {minutes ? (
            <View style={styles.vTime}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.vTimeText}>{minutes} dk</Text>
            </View>
          ) : null}
        </View>
        <Pressable style={styles.playBtn} onPress={toggle}>
          <Ionicons name={playing ? 'pause' : 'play'} size={30} color={colors.accent} style={{ marginLeft: playing ? 0 : 2 }} />
        </Pressable>
        <View style={styles.videoBottom}>
          <Text style={styles.videoSource} numberOfLines={1}>
            {sc?.title || ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

// --- Pratik asama karti ---
function Stage({ n, stage }: { n: number; stage: VideoPracticeStage }) {
  return (
    <View style={styles.stageCard}>
      <Text style={styles.stageLabel}>
        {n}. {stage.instruction}
      </Text>
      {stage.kind === 'gap' ? <GapStage s={stage} /> : null}
      {stage.kind === 'scramble' ? <ScrambleStage s={stage} /> : null}
      {stage.kind === 'error' ? <ErrorStage s={stage} /> : null}
    </View>
  );
}

function GapStage({ s }: { s: VideoPracticeGap }) {
  const [answered, setAnswered] = useState<null | boolean>(null);
  const [a, b] = s.prompt.split('{blank}');
  return (
    <>
      <Text style={styles.stagePrompt}>
        {a}
        <Text style={[styles.blank, answered === true && styles.blankOk]}> {answered ? s.answer : '______'} </Text>
        {b}
      </Text>
      <View style={styles.optRow}>
        {s.options.map((o) => {
          const correct = o === s.answer;
          const showOk = answered === true && correct;
          return (
            <Pressable
              key={o}
              disabled={answered === true}
              style={[styles.opt, showOk && styles.optOk]}
              onPress={() => {
                setAnswered(correct);
                if (correct) speak(s.prompt.replace('{blank}', s.answer));
              }}>
              <Text style={[styles.optText, showOk && styles.optTextOk]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
      {answered === true ? <Feedback ok text={s.feedback} /> : null}
      {answered === false ? <Feedback ok={false} text="Tekrar dene." /> : null}
    </>
  );
}

function ScrambleStage({ s }: { s: VideoPracticeScramble }) {
  const [picked, setPicked] = useState<number[]>([]);
  const done = picked.length === s.blocks.length;
  const assembled = picked.map((i) => s.blocks[i]);
  const correct = done && assembled.join(' ') === s.correct.join(' ');

  return (
    <>
      <Text style={styles.stageHint}>{s.hint}</Text>
      <View style={[styles.tray, done && (correct ? styles.trayOk : styles.trayNo)]}>
        {picked.length === 0 ? (
          <Text style={styles.trayPlaceholder}>Blokları buraya dizin...</Text>
        ) : (
          assembled.map((w, i) => (
            <View key={i} style={styles.trayChip}>
              <Text style={styles.trayChipText}>{w}</Text>
            </View>
          ))
        )}
      </View>
      <View style={styles.chips}>
        {s.blocks.map((w, i) => {
          const used = picked.includes(i);
          return (
            <Pressable
              key={i}
              disabled={used}
              style={[styles.chip, used && styles.chipUsed]}
              onPress={() => setPicked((prev) => [...prev, i])}>
              <Text style={[styles.chipText, used && styles.chipTextUsed]}>{w}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.scrambleFoot}>
        <Pressable style={styles.resetBtn} onPress={() => setPicked([])} hitSlop={6}>
          <Ionicons name="refresh" size={14} color={colors.muted} />
          <Text style={styles.resetText}>Sıfırla</Text>
        </Pressable>
      </View>
      {done ? <Feedback ok={correct} text={correct ? s.feedback : 'Sıralama hatalı, sıfırlayıp tekrar dene.'} /> : null}
    </>
  );
}

function ErrorStage({ s }: { s: VideoPracticeError }) {
  const [answered, setAnswered] = useState<null | boolean>(null);
  return (
    <>
      <Text style={styles.stagePrompt}>
        {s.before}
        <Text style={styles.errWord}>{s.wrong}</Text>
        {s.after}
      </Text>
      <View style={styles.optCol}>
        {s.options.map((o) => {
          const showOk = answered === true && o.correct;
          return (
            <Pressable
              key={o.label}
              disabled={answered === true}
              style={[styles.optWide, showOk && styles.optOk]}
              onPress={() => setAnswered(o.correct)}>
              <Text style={[styles.optText, showOk && styles.optTextOk]}>{o.label}</Text>
              {showOk ? <Ionicons name="checkmark-circle" size={18} color={colors.good} /> : null}
            </Pressable>
          );
        })}
      </View>
      {answered === true ? <Feedback ok text={s.feedback} /> : null}
      {answered === false ? <Feedback ok={false} text="Bu fiilin çekimi doğru. Diğerini kontrol et." /> : null}
    </>
  );
}

function Feedback({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={[styles.fb, ok ? styles.fbOk : styles.fbNo]}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={17} color={ok ? colors.good : colors.danger} />
      <Text style={styles.fbText}>{text}</Text>
    </View>
  );
}

function TopBar({ title, insets }: { title: string; insets: { top: number } }) {
  return (
    <View style={[styles.topbar, { paddingTop: insets.top + space.sm }]}>
      <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </Pressable>
      <View style={styles.topCenter}>
        <Text style={styles.topTitle}>03. Video Kesitleri</Text>
        <Text style={styles.topSub} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.iconBtn} />
    </View>
  );
}

function dedupe(list: GrammarUsage[]): GrammarUsage[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    const k = `${s.media_id}:${s.sentence_idx}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  topSub: { fontSize: 12, fontWeight: '500', color: colors.muted },

  scroll: { padding: space.lg, gap: space.md },

  card: { backgroundColor: colors.bg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  cardPad: { padding: space.lg, gap: space.sm },

  videoWrap: { width: '100%', backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFillObject },
  videoOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  videoTop: { position: 'absolute', top: space.sm, left: space.sm, right: space.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  videoBadges: { flexDirection: 'row', gap: 6 },
  vBadge: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  vBadgeRed: { backgroundColor: colors.accent },
  vBadgeText: { fontSize: 10, fontWeight: '800', color: colors.ink, letterSpacing: 0.4 },
  vTime: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  vTimeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  playBtn: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  videoBottom: { position: 'absolute', bottom: space.sm, left: space.sm, right: space.sm },
  videoSource: { color: '#fff', fontSize: 11, fontWeight: '600', opacity: 0.9 },

  h2: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  intro: { fontSize: 13, color: colors.muted, lineHeight: 20 },

  pills: { gap: space.sm, paddingTop: 4 },
  pill: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 200 },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  pillTextOn: { color: '#fff' },

  transHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  transHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  transTick: { width: 5, height: 14, borderRadius: radius.pill, backgroundColor: colors.accent },
  transKicker: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.6 },
  roundBtn: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  transBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, gap: 6 },
  transEn: { fontSize: 19, fontWeight: '600', color: colors.ink, lineHeight: 28 },
  transTr: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  hi: { color: colors.accent, fontWeight: '800' },

  noVideo: { alignItems: 'center', gap: space.sm, padding: space.xl, backgroundColor: colors.bg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
  noVideoText: { fontSize: 13, color: colors.muted },

  section: { gap: space.sm },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 4 },
  h3: { fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  stepPill: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  stepPillText: { fontSize: 11, fontWeight: '800', color: colors.accent },

  stageCard: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.md, gap: space.sm },
  stageLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  stagePrompt: { fontSize: 15, fontWeight: '600', color: colors.ink, lineHeight: 24 },
  stageHint: { fontSize: 13, color: colors.muted },
  blank: { color: colors.accent, fontWeight: '800' },
  blankOk: { color: colors.good },
  errWord: { color: colors.danger, fontWeight: '800', textDecorationLine: 'underline' },

  optRow: { flexDirection: 'row', gap: space.sm },
  optCol: { gap: space.sm },
  opt: { flex: 1, paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  optWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  optOk: { backgroundColor: colors.good, borderColor: colors.good },
  optText: { fontSize: 13, fontWeight: '800', color: colors.ink },
  optTextOk: { color: '#fff' },

  tray: { minHeight: 46, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  trayOk: { backgroundColor: '#ECFDF3', borderColor: '#ABEFC6' },
  trayNo: { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' },
  trayPlaceholder: { fontSize: 13, color: colors.muted, fontStyle: 'italic', paddingHorizontal: 4 },
  trayChip: { backgroundColor: colors.bg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 6 },
  trayChipText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: 12, paddingVertical: 8 },
  chipUsed: { opacity: 0.35 },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  chipTextUsed: { color: colors.muted },
  scrambleFoot: { flexDirection: 'row', justifyContent: 'flex-end' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetText: { fontSize: 12, color: colors.muted, fontWeight: '600' },

  fb: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.sm, padding: space.sm },
  fbOk: { backgroundColor: '#ECFDF3' },
  fbNo: { backgroundColor: '#FEF3F2' },
  fbText: { flex: 1, fontSize: 12.5, color: colors.ink, lineHeight: 18 },

  tipBox: { flexDirection: 'row', gap: space.md, backgroundColor: colors.tealSoft, borderRadius: radius.lg, padding: space.lg },
  tipIcon: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  tipText: { fontSize: 13, color: colors.muted, lineHeight: 20, marginTop: 2 },

  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.accent, borderRadius: radius.md, height: 52 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
