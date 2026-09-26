import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import {
  addSpeakingTake,
  getLadderState,
  recordLadderAttempt,
  saveLadderChain,
  updateSpeakingTakeMedia,
} from '@/lib/db';
import {
  chainKey,
  getLadderTheme,
  getLadderTrack,
  PRODUCE_STAGE,
  themeLevels,
  type LadderLevel,
  type LadderSentence,
  type LadderTheme,
  type LadderTrack,
} from '@/lib/speaking/ladder';
import { persistTakeAudio, persistTakeVideo } from '@/lib/speaking/media';
import { bestMatch, useLiveSpeech } from '@/lib/useLiveSpeech';
import { alignWords, exactMatch, normTokens } from '@/lib/wordAlign';

// KONUSMA MERDIVENI. Kurallar: docs/SPEAKING_RULES.md.
// ?theme=<id>  : rutin; seviyeler alt alta, cumleler alt alta, sirayla acilir.
// ?chain=<id>  : konu zinciri; gecilmis tum rutinlerden rastgele cumleler art arda.
// Kabul TAM dogruluktur (kisaltma / rakam / he-she normallestirilir).
const CHAIN_START = 3;
const CHAIN_MAX = 30;

const BANK: [string, string][] = [
  ['always', 'her zaman'],
  ['usually', 'genelde'],
  ['often', 'sık sık'],
  ['sometimes', 'bazen'],
  ['occasionally', 'ara sıra'],
  ['rarely', 'nadiren'],
  ['hardly ever', 'neredeyse hiç'],
  ['never', 'asla'],
];

// Ipucunda ozne "o" ise he/she (his/her) esit sayilir.
const heSheOf = (s: LadderSentence) => (s.cue ?? '').split(' · ').includes('o');
const candOf = (s: LadderSentence) => [s.en, ...(s.alts ?? [])];

export default function SpeakingLadder() {
  const { theme: themeId, chain } = useLocalSearchParams<{ theme?: string; chain?: string }>();
  const theme = useMemo(() => getLadderTheme(themeId), [themeId]);
  const track = useMemo(() => getLadderTrack(chain), [chain]);

  const title = track ? 'Zincir' : theme?.title;
  const focusId = track ? `ladder:${chainKey(track.id)}` : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headTitle} numberOfLines={1}>
          {title ?? ''}
        </Text>
        {focusId ? (
          <Pressable
            onPress={() => router.push(`/speaking-progress?focus=${encodeURIComponent(focusId)}`)}
            hitSlop={8}>
            <Ionicons name="film-outline" size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {track ? <Chain track={track} /> : theme ? <Routine theme={theme} /> : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Rutin: seviyeler alt alta. Acik seviyenin cumleleri alt alta; yalniz siradaki
// satir aktif. Gecilen satirda EN + TR gorunur.
function Routine({ theme }: { theme: LadderTheme }) {
  const levels = useMemo(() => themeLevels(theme), [theme]);
  const [passed, setPassed] = useState<Set<string>>(
    () => getLadderState(theme.id).passed[PRODUCE_STAGE] ?? new Set<string>(),
  );
  const levelDone = (l: LadderLevel) => l.sentences.every((s) => passed.has(s.key));
  const curLevel = levels.findIndex((l) => !levelDone(l));
  const [open, setOpen] = useState<number>(Math.max(0, curLevel));
  const [erred, setErred] = useState<Set<string>>(new Set());
  const [fails, setFails] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const live = useLiveSpeech();
  const busy = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const rowY = useRef<Record<string, number>>({});
  const levelY = useRef<Record<number, number>>({});

  const cur = curLevel >= 0 ? levels[curLevel].sentences.find((s) => !passed.has(s.key)) ?? null : null;
  const heShe = cur ? heSheOf(cur) : false;
  const cands = useMemo(() => (cur ? candOf(cur) : []), [cur]);

  useEffect(() => () => void Speech.stop(), []);

  // Seviye bitince bir sonrakine gec (acik seviye hep aktif seviyeyi izler).
  useEffect(() => {
    if (curLevel >= 0) setOpen(curLevel);
  }, [curLevel]);

  // Aktif satiri gorunur tut.
  useEffect(() => {
    if (!cur) return;
    const y = (levelY.current[curLevel] ?? 0) + (rowY.current[cur.key] ?? 0);
    const t = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, y - 120), animated: true }), 120);
    return () => clearTimeout(t);
  }, [cur, curLevel]);

  const judge = useCallback(
    async (text: string) => {
      if (!cur || busy.current) return;
      busy.current = true;
      if (live.listening) await live.stop();
      const ok = exactMatch(cands, text, heShe);
      recordLadderAttempt(theme.id, cur.key, PRODUCE_STAGE, ok ? 100 : bestMatch(cands, text).pct, ok);
      if (ok) {
        setPassed((p) => new Set(p).add(cur.key));
        setFails(0);
        setHeard(null);
        live.reset();
        // Sonraki cumle icin mikrofon kendiliginden acilir.
        setTimeout(() => {
          busy.current = false;
          live.start();
        }, 700);
        return;
      }
      setFails((f) => f + 1);
      setHeard(text);
      setErred((e) => new Set(e).add(levels[curLevel].id));
      busy.current = false;
    },
    [cur, cands, heShe, live, theme.id, levels, curLevel],
  );

  // Dogru cumle duyulur duyulmaz gec.
  useEffect(() => {
    if (live.listening && live.transcript && exactMatch(cands, live.transcript, heShe)) judge(live.transcript);
  }, [live.listening, live.transcript, cands, heShe, judge]);

  // Tanima sessizlikle kapandiysa degerlendir.
  useEffect(() => {
    if (!live.listening && live.transcript && heard == null && !busy.current) judge(live.transcript);
  }, [live.listening, live.transcript, heard, judge]);

  const onMic = () => {
    if (live.listening) return void live.stop();
    Speech.stop();
    live.reset();
    setHeard(null);
    live.start();
  };

  // Yeni cumleye gecince hata durumunu sifirla.
  useEffect(() => {
    setFails(0);
    setHeard(null);
  }, [cur?.key]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {levels.map((l, li) => {
          const locked = curLevel >= 0 && li > curLevel;
          const done = levelDone(l);
          const said = l.sentences.filter((s) => passed.has(s.key)).length;
          const isOpen = open === li && !locked;
          const showBank = l.bank === 'show' || (l.bank === 'onError' && erred.has(l.id));
          return (
            <View
              key={l.id}
              style={[styles.level, locked && styles.dim]}
              onLayout={(e) => (levelY.current[li] = e.nativeEvent.layout.y)}>
              <Pressable style={styles.levelHead} disabled={locked} onPress={() => setOpen(isOpen ? -1 : li)}>
                <View style={[styles.levelNum, done && styles.levelNumDone]}>
                  {done ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : locked ? (
                    <Ionicons name="lock-closed" size={12} color="#fff" />
                  ) : (
                    <Text style={styles.levelNumText}>{li + 1}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.levelTitle}>{l.title}</Text>
                  {l.note ? <Text style={styles.levelNote}>{l.note}</Text> : null}
                </View>
                <Text style={styles.levelCount}>
                  {said}/{l.sentences.length}
                </Text>
              </Pressable>

              {isOpen ? (
                <View>
                  {showBank && li === curLevel ? (
                    <View style={styles.bank}>
                      {BANK.map(([en, tr]) => (
                        <Text key={en} style={styles.bankItem}>
                          <Text style={styles.bankEn}>{en}</Text> {tr}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {l.sentences.map((s, si) => (
                    <View key={s.key} onLayout={(e) => (rowY.current[s.key] = e.nativeEvent.layout.y)}>
                      <Row
                        n={si + 1}
                        s={s}
                        state={passed.has(s.key) ? 'done' : cur?.key === s.key ? 'active' : 'locked'}
                        heard={cur?.key === s.key ? heard : null}
                        fails={cur?.key === s.key ? fails : 0}
                        live={cur?.key === s.key && live.listening ? live.transcript : ''}
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        {curLevel < 0 ? (
          <View style={styles.finish}>
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            <Text style={styles.finishText}>Rutinin tüm cümleleri tamam.</Text>
          </View>
        ) : null}
      </ScrollView>

      {cur ? (
        <View style={styles.micBar}>
          <Pressable style={[styles.mic, live.listening && styles.micOn]} onPress={onMic}>
            <Ionicons name={live.listening ? 'stop' : 'mic'} size={28} color="#fff" />
          </Pressable>
          {live.error ? <Text style={styles.err}>{live.error}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

// Satir: kilitli (soluk ipucu) / aktif (ipucu + hata geri bildirimi) / gecildi (EN + TR).
// Hatada: dogru soylenen kelimeler acilir, eksikler bos kalir; ikinci hatadan sonra
// dogru cumle tamamen gorunur.
function Row({
  n,
  s,
  state,
  heard,
  fails,
  live,
}: {
  n: number;
  s: LadderSentence;
  state: 'done' | 'active' | 'locked';
  heard: string | null;
  fails: number;
  live: string;
}) {
  const fb = useMemo(() => (heard != null ? bestMatch(candOf(s), heard) : null), [s, heard]);
  return (
    <View style={[styles.row, state === 'active' && styles.rowActive]}>
      <Text style={[styles.rowNum, state === 'done' && { color: colors.success }]}>{n}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowCue, state === 'locked' && styles.rowCueLocked, state === 'active' && styles.rowCueActive]}>
          {s.cue ?? s.tr}
        </Text>
        {state === 'done' ? (
          <>
            <Text style={styles.rowEn}>{s.en}</Text>
            <Text style={styles.rowTr}>{s.tr}</Text>
          </>
        ) : null}
        {state === 'active' && live ? <Text style={styles.heard}>{live}</Text> : null}
        {state === 'active' && fb ? (
          <>
            <Text style={styles.rowEn}>
              {fb.words.map((w, i) => {
                const ok = fb.status[i] === 'ok';
                const show = ok || fails >= 2;
                return (
                  <Text key={i} style={ok ? styles.ok : show ? styles.bad : styles.gap}>
                    {show ? w : '_'.repeat(Math.max(3, w.length))}
                    {i < fb.words.length - 1 ? ' ' : ''}
                  </Text>
                );
              })}
            </Text>
            <Text style={styles.heard}>Duyulan: {heard}</Text>
            {fails >= 2 ? (
              <Pressable hitSlop={10} onPress={() => Speech.speak(s.en, { language: 'en-US', rate: 0.85 })}>
                <Ionicons name="volume-high" size={20} color={colors.accent} />
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Konu zinciri: gecilmis tum rutin cumlelerinden rastgele N tanesi art arda.
// Her cumlenin tum kelimeleri dogru olmali. Basarida +2. On kamera kaydi tutulur.
function Chain({ track }: { track: LadderTrack }) {
  const key = chainKey(track.id);
  const pool = useMemo(() => {
    const out: LadderSentence[] = [];
    for (const t of track.themes) {
      const p = getLadderState(t.id).passed[PRODUCE_STAGE];
      if (p) out.push(...t.sentences.filter((s) => p.has(s.key)));
    }
    return out;
  }, [track]);
  const [len, setLen] = useState(() => getLadderState(key).chainLen);
  const n = Math.min(pool.length, CHAIN_MAX, Math.max(len, CHAIN_START));
  const [seed, setSeed] = useState(0);
  const items = useMemo(() => {
    const a = [...pool];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
    // seed: her turda yeni cekilis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, n, seed]);

  const live = useLiveSpeech();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [camReady, setCamReady] = useState(false);
  const videoP = useRef<Promise<string | null> | null>(null);
  const [result, setResult] = useState<{ pct: number; pass: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) requestCamPerm();
  }, [camPerm, requestCamPerm]);

  // Normallestirilmis kelimeler tek dizide; her cumlenin araligi ayri.
  const { words, ranges } = useMemo(() => {
    const w: string[] = [];
    const r: [number, number][] = [];
    for (const s of items) {
      const sw = normTokens(s.en, heSheOf(s));
      r.push([w.length, w.length + sw.length]);
      w.push(...sw);
    }
    return { words: w, ranges: r };
  }, [items]);
  const heardNorm = useMemo(() => normTokens(live.transcript, true).join(' '), [live.transcript]);
  // he/she her iki tarafta ayni bicime iner (zincirde tek tek ozne ayrimi yok).
  const wordsHS = useMemo(() => words.map((w) => (w === 'she' ? 'he' : w === 'her' ? 'his' : w)), [words]);
  const status = useMemo(() => alignWords(wordsHS, heardNorm).status, [wordsHS, heardNorm]);
  const perOk = ranges.map(([a, b]) => status.slice(a, b).every((x) => x === 'ok'));
  const perPct = ranges.map(([a, b]) => Math.round((status.slice(a, b).filter((x) => x === 'ok').length / (b - a)) * 100));
  const overall = words.length ? Math.round((status.filter((x) => x === 'ok').length / words.length) * 100) : 0;

  if (pool.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.finishText}>Zincir için önce bir rutinde cümle geç.</Text>
      </View>
    );
  }

  const start = async () => {
    if (result) {
      setResult(null);
      setSeed((x) => x + 1);
      live.reset();
      return;
    }
    const ok = await live.start({ persist: true });
    if (!ok) return;
    videoP.current =
      camPerm?.granted && camReady && camRef.current
        ? camRef.current
            .recordAsync({ maxDuration: 180 })
            .then((r) => r?.uri ?? null)
            .catch(() => null)
        : null;
  };

  const finish = async () => {
    setSaving(true);
    try {
      camRef.current?.stopRecording();
    } catch {}
    const [aTmp, vTmp] = await Promise.all([live.stop(), videoP.current ?? Promise.resolve(null)]);
    videoP.current = null;
    const pass = perOk.every(Boolean);
    const nextLen = pass ? Math.min(CHAIN_MAX, n + 2) : n;
    saveLadderChain(key, nextLen, overall);
    setLen((l) => Math.max(l, nextLen));
    const focusId = `ladder:${key}`;
    const id = addSpeakingTake({
      focus_id: focusId,
      variation_key: `chain-${n}`,
      text_en: items.map((s) => s.en).join(' '),
      score: overall,
    });
    const [aDest, vDest] = await Promise.all([
      aTmp ? persistTakeAudio(focusId, id, aTmp).catch(() => null) : null,
      vTmp ? persistTakeVideo(focusId, id, vTmp).catch(() => null) : null,
    ]);
    updateSpeakingTakeMedia(id, { audio_uri: aDest, video_uri: vDest });
    setResult({ pct: overall, pass });
    setSaving(false);
  };

  const listening = live.listening;
  const graded = listening || result != null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.camRow}>
          <View style={styles.camBox}>
            {camPerm?.granted ? (
              <CameraView
                ref={camRef}
                style={StyleSheet.absoluteFill}
                facing="front"
                mode="video"
                mute
                onCameraReady={() => setCamReady(true)}
              />
            ) : (
              <Ionicons name="videocam-off-outline" size={24} color={colors.muted} />
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.chainTitle}>{n} cümle art arda</Text>
            <Text style={styles.levelNote}>{pool.length} geçilmiş cümleden rastgele</Text>
            {graded ? <Text style={styles.resultInline}>%{result ? result.pct : overall}</Text> : null}
          </View>
        </View>

        <View>
          {items.map((s, i) => (
            <View key={`${seed}-${s.key}-${s.en}`} style={styles.row}>
              <Text
                style={[
                  styles.rowNum,
                  graded && perOk[i] ? { color: colors.success } : null,
                  result && !perOk[i] ? { color: colors.danger } : null,
                ]}>
                {i + 1}
              </Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowCue}>{s.cue ?? s.tr}</Text>
                {result ? <Text style={styles.rowEn}>{s.en}</Text> : null}
                {result && !perOk[i] ? <Text style={styles.heard}>%{perPct[i]}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.micBar}>
        <Pressable
          style={[styles.mic, listening && styles.micOn]}
          onPress={listening ? finish : start}
          disabled={saving}>
          <Ionicons name={listening ? 'stop' : result ? 'refresh' : 'mic'} size={28} color="#fff" />
        </Pressable>
        {result ? (
          <Text style={[styles.levelNote, { color: result.pass ? colors.success : colors.danger }]}>
            {result.pass ? `Zincir uzadı: sıradaki tur ${Math.min(pool.length, CHAIN_MAX, n + 2)} cümle.` : 'Her cümle tam doğru olmalı.'}
          </Text>
        ) : null}
        {live.error ? <Text style={styles.err}>{live.error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },

  content: { padding: space.xl, gap: space.md, paddingBottom: 140 },

  // Uygulama geneli kart dili: yuvarlak kose, ince kenarlik, golge yok.
  level: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, overflow: 'hidden' },
  dim: { opacity: 0.45 },
  levelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
  },
  levelNum: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumDone: { backgroundColor: colors.success },
  levelNumText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  levelTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  levelNote: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  levelCount: { fontSize: 13, fontWeight: '700', color: colors.muted },

  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space.md,
    rowGap: 4,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  bankItem: { fontSize: 12, color: colors.muted },
  bankEn: { fontWeight: '800', color: colors.accent },

  row: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowActive: { backgroundColor: colors.surface },
  rowNum: { width: 20, fontSize: 13, fontWeight: '800', color: colors.muted, paddingTop: 2 },
  rowCue: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 21 },
  rowCueLocked: { color: colors.muted, fontWeight: '500' },
  rowCueActive: { fontSize: 19, lineHeight: 26, fontWeight: '800' },
  rowEn: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 22 },
  rowTr: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  ok: { color: colors.success },
  bad: { color: colors.danger },
  gap: { color: colors.line },
  heard: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },

  micBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: space.xs,
    paddingTop: space.md,
    paddingBottom: space.xl,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  mic: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOn: { backgroundColor: colors.danger },
  err: { fontSize: 12, color: colors.danger, textAlign: 'center' },

  finish: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  finishText: { fontSize: 15, fontWeight: '700', color: colors.ink, textAlign: 'center' },

  camRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  camBox: {
    width: 96,
    height: 128,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  resultInline: { fontSize: 20, fontWeight: '800', color: colors.accent },
});
