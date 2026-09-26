import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '@/constants/appTheme';
import {
  addSpeakingTake,
  getLadderState,
  recordLadderAttempt,
  saveLadderChain,
  updateSpeakingTakeMedia,
  type LadderState,
} from '@/lib/db';
import { getLadderTheme, PRODUCE_STAGE, type LadderSentence, type LadderTheme } from '@/lib/speaking/ladder';
import { persistTakeAudio, persistTakeVideo } from '@/lib/speaking/media';
import { bestMatch, useLiveSpeech } from '@/lib/useLiveSpeech';
import { alignWords, type WordStatus } from '@/lib/wordAlign';

// KONUSMA MERDIVENI (tek akis): grup ve basamak yok. Temanin cumleleri sirayla
// gelir; her cumlede yalniz kavram ipucu (cue) gorunur, ogrenci Ingilizcesini
// aklindan kurup soyler. Denemeden sonra renkli EN + TR acilir.
// Zincir: cumleler ipuclariyla ART ARDA soylenir; basarida +2 uzar.
// Degerlendirme otomatik (cihaz ici tanima + kelime hizalama); %80 ve ustu gecer.
const PASS = 80;
const CHAIN_PASS = 75;
const CHAIN_START = 3;

type Mode = 'say' | 'chain';

export default function SpeakingLadder() {
  const { theme: themeId } = useLocalSearchParams<{ theme?: string }>();
  const theme = useMemo(() => getLadderTheme(themeId), [themeId]);
  const [st, setSt] = useState<LadderState | null>(null);
  const [mode, setMode] = useState<Mode>('say');

  const refresh = useCallback(() => {
    if (!theme) return null;
    const s = getLadderState(theme.id);
    setSt(s);
    return s;
  }, [theme]);

  // Ilk acilista: tum cumleler gectiyse dogrudan zincir.
  useEffect(() => {
    const s = refresh();
    if (s && theme && theme.sentences.every((x) => s.passed[PRODUCE_STAGE]?.has(x.key))) setMode('chain');
  }, [refresh, theme]);

  if (!theme || !st) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.h1}>Tema bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  const passed = st.passed[PRODUCE_STAGE] ?? new Set<string>();
  const n = theme.sentences.length;
  const said = theme.sentences.filter((x) => passed.has(x.key)).length;
  const tabs: { k: Mode; label: string }[] = [
    { k: 'say', label: `Cümleler ${said}/${n}` },
    { k: 'chain', label: `Zincir ${Math.min(n, Math.max(st.chainLen, CHAIN_START))}/${n}` },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headTitle} numberOfLines={1}>
          {theme.title}
        </Text>
        <Pressable
          onPress={() => router.push(`/speaking-progress?focus=${encodeURIComponent(`ladder:${theme.id}`)}`)}
          hitSlop={8}>
          <Ionicons name="film-outline" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {tabs.map((t) => (
          <Pressable key={t.k} style={[styles.tab, mode === t.k && styles.tabOn]} onPress={() => setMode(t.k)}>
            <Text style={[styles.tabText, mode === t.k && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'chain' ? (
        <Chain key="chain" theme={theme} st={st} onSaved={refresh} />
      ) : (
        <Drill key="say" theme={theme} passed={passed} onSaved={refresh} onAllDone={() => setMode('chain')} />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Cumle cumle uretim: ipucu gorunur, Ingilizcesi soylenir, sonra EN + TR acilir.
function Drill({
  theme,
  passed,
  onSaved,
  onAllDone,
}: {
  theme: LadderTheme;
  passed: Set<string>;
  onSaved: () => void;
  onAllDone: () => void;
}) {
  const list = theme.sentences;
  const firstOpen = Math.max(0, list.findIndex((s) => !passed.has(s.key)));
  const [idx, setIdx] = useState(firstOpen);
  const [result, setResult] = useState<{ pct: number; pass: boolean } | null>(null);
  const [donePass, setDonePass] = useState<Set<string>>(
    () => new Set(list.filter((s) => passed.has(s.key)).map((s) => s.key)),
  );
  const [allDone, setAllDone] = useState(list.every((s) => passed.has(s.key)));
  const live = useLiveSpeech();
  const evaluating = useRef(false);

  const cur = list[idx];
  const candidates = useMemo(() => [cur.en, ...(cur.alts ?? [])], [cur]);
  const match = useMemo(() => bestMatch(candidates, live.transcript), [candidates, live.transcript]);

  useEffect(() => () => void Speech.stop(), []);

  const goNext = useCallback(
    (fromIdx: number, justPassed?: string) => {
      Speech.stop();
      setResult(null);
      live.reset();
      const done = new Set(donePass);
      if (justPassed) done.add(justPassed);
      setDonePass(done);
      if (done.size >= list.length) {
        setAllDone(true);
        return;
      }
      for (let k = 1; k <= list.length; k++) {
        const j = (fromIdx + k) % list.length;
        if (!done.has(list[j].key)) return setIdx(j);
      }
    },
    [list, donePass, live],
  );

  const evaluate = useCallback(async () => {
    if (evaluating.current) return;
    evaluating.current = true;
    if (live.listening) await live.stop();
    const pct = match.pct;
    const pass = pct >= PASS;
    recordLadderAttempt(theme.id, cur.key, PRODUCE_STAGE, pct, pass);
    setResult({ pct, pass });
    onSaved();
    evaluating.current = false;
    // Gecince dogru cumle + Turkcesi kisa bir sure gorunur, sonra sonraki cumle.
    if (pass) setTimeout(() => goNext(idx, cur.key), 1600);
  }, [live, match.pct, theme.id, cur.key, onSaved, goNext, idx]);

  // Cumlenin tum kelimeleri duyulunca kendiliginden bitir.
  useEffect(() => {
    if (live.listening && match.pct === 100) evaluate();
  }, [live.listening, match.pct, evaluate]);

  // Tanima kendi kapandiysa (sessizlik) ve bir sey duyulduysa degerlendir.
  useEffect(() => {
    if (!live.listening && live.transcript && !result) evaluate();
  }, [live.listening, live.transcript, result, evaluate]);

  const onMic = () => {
    if (live.listening) return evaluate();
    Speech.stop();
    live.reset();
    setResult(null);
    live.start();
  };

  if (allDone) {
    return (
      <View style={styles.center}>
        <View style={styles.doneMark}>
          <Ionicons name="checkmark" size={28} color="#fff" />
        </View>
        <Text style={styles.h1}>Bütün cümleler tamam</Text>
        <Text style={[styles.sub, { textAlign: 'center' }]}>Şimdi cümleleri art arda, zincir hâlinde anlat.</Text>
        <Pressable style={styles.primaryBtn} onPress={onAllDone}>
          <Text style={styles.primaryText}>Zincire geç</Text>
        </Pressable>
      </View>
    );
  }

  const words = result ? match.words : cur.en.split(/\s+/);
  const status: WordStatus[] = match.status;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.ticks}>
        {list.map((s, i) => (
          <View
            key={s.key}
            style={[styles.tick, donePass.has(s.key) && styles.tickDone, i === idx && styles.tickCur]}
          />
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.count}>
            {String(idx + 1).padStart(2, '0')} / {list.length}
          </Text>
          <View style={styles.cardIcons}>
            <Pressable
              hitSlop={10}
              onPress={() => Speech.speak(result ? match.text : cur.en, { language: 'en-US', rate: 0.85 })}>
              <Ionicons name="volume-high" size={22} color={colors.accent} />
            </Pressable>
            <Pressable hitSlop={10} onPress={() => goNext(idx)} disabled={live.listening}>
              <Ionicons name="play-skip-forward" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.cue}>{cur.cue ?? cur.tr}</Text>

        {result ? (
          <View style={styles.reveal}>
            <Text style={styles.en}>
              {words.map((w, i) => {
                const s = status[i];
                return (
                  <Text key={i} style={s === 'ok' ? styles.ok : s === 'wrong' ? styles.bad : undefined}>
                    {w}
                    {i < words.length - 1 ? ' ' : ''}
                  </Text>
                );
              })}
            </Text>
            <Text style={styles.tr}>{cur.tr}</Text>
          </View>
        ) : null}

        {live.listening && live.transcript ? <Text style={styles.heard}>{live.transcript}</Text> : null}
      </View>

      <View style={styles.micWrap}>
        <Pressable style={[styles.mic, live.listening && styles.micOn]} onPress={onMic}>
          <Ionicons name={live.listening ? 'stop' : 'mic'} size={30} color={live.listening ? '#fff' : colors.accent} />
        </Pressable>
        {result ? (
          <Text style={[styles.resultText, { color: result.pass ? colors.success : colors.danger }]}>
            %{result.pct}
          </Text>
        ) : null}
        {result && !result.pass && live.transcript ? <Text style={styles.heard}>Duyulan: {live.transcript}</Text> : null}
        {live.error ? <Text style={styles.err}>{live.error}</Text> : null}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Zincir: temanin ilk N cumlesi ipuclariyla art arda soylenir. On kamera sessiz
// video + tanima sesi kaydedilir; kayit Gelisim ekraninda izlenir.
function Chain({ theme, st, onSaved }: { theme: LadderTheme; st: LadderState; onSaved: () => void }) {
  const total = theme.sentences.length;
  const len = Math.min(total, Math.max(st.chainLen, CHAIN_START));
  const items = theme.sentences.slice(0, len);
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

  // Tum zincirin kelimeleri tek dizide; her cumlenin araligi ayri tutulur.
  const { words, ranges } = useMemo(() => {
    const w: string[] = [];
    const r: [number, number][] = [];
    for (const s of items) {
      const sw = s.en.split(/\s+/);
      r.push([w.length, w.length + sw.length]);
      w.push(...sw);
    }
    return { words: w, ranges: r };
  }, [items]);
  const status = useMemo(() => alignWords(words, live.transcript).status, [words, live.transcript]);
  const perSentence = ranges.map(([a, b]) => {
    const ok = status.slice(a, b).filter((s) => s === 'ok').length;
    return Math.round((ok / (b - a)) * 100);
  });
  const overall = words.length ? Math.round((status.filter((s) => s === 'ok').length / words.length) * 100) : 0;

  const start = async () => {
    setResult(null);
    const ok = await live.start({ persist: true });
    if (!ok) return;
    videoP.current =
      camPerm?.granted && camReady && camRef.current
        ? camRef.current
            .recordAsync({ maxDuration: 120 })
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
    const pct = overall;
    const pass = pct >= CHAIN_PASS;
    const nextLen = pass ? Math.min(total, len + 2) : len;
    saveLadderChain(theme.id, nextLen, pct);
    const focusId = `ladder:${theme.id}`;
    const id = addSpeakingTake({
      focus_id: focusId,
      variation_key: `chain-${len}`,
      text_en: items.map((s) => s.en).join(' '),
      score: pct,
    });
    const [aDest, vDest] = await Promise.all([
      aTmp ? persistTakeAudio(focusId, id, aTmp).catch(() => null) : null,
      vTmp ? persistTakeVideo(focusId, id, vTmp).catch(() => null) : null,
    ]);
    updateSpeakingTakeMedia(id, { audio_uri: aDest, video_uri: vDest });
    setResult({ pct, pass });
    setSaving(false);
    onSaved();
  };

  const listening = live.listening;
  const graded = listening || result != null;

  return (
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
          <Text style={styles.chainTitle}>
            {len} cümle art arda{len >= total ? ' · tüm tema' : ''}
          </Text>
          <Text style={styles.sub}>İpuçlarına bakarak İngilizcesini durmadan anlat.</Text>
          {graded ? <Text style={styles.resultInline}>%{result ? result.pct : overall}</Text> : null}
        </View>
      </View>

      <View style={styles.chainList}>
        {items.map((s, i) => (
          <ChainRow key={s.key} n={i + 1} s={s} pct={graded ? perSentence[i] : null} reveal={result != null} />
        ))}
      </View>

      <View style={styles.micWrap}>
        <Pressable
          style={[styles.mic, listening && styles.micOn]}
          onPress={listening ? finish : start}
          disabled={saving}>
          <Ionicons name={listening ? 'stop' : 'mic'} size={30} color={listening ? '#fff' : colors.accent} />
        </Pressable>
        {result ? (
          <Text style={[styles.sub, { color: result.pass ? colors.success : colors.danger }]}>
            {result.pass
              ? len >= total
                ? 'Temanın tamamını art arda söyledin.'
                : `Zincir uzadı: sıradaki tur ${Math.min(total, len + 2)} cümle.`
              : `Geçmek için en az %${CHAIN_PASS} gerekiyor.`}
          </Text>
        ) : null}
        {live.error ? <Text style={styles.err}>{live.error}</Text> : null}
      </View>
    </ScrollView>
  );
}

function ChainRow({ n, s, pct, reveal }: { n: number; s: LadderSentence; pct: number | null; reveal: boolean }) {
  const tone = pct == null ? null : pct >= PASS ? colors.success : pct > 0 ? colors.warning : null;
  return (
    <View style={styles.chainRow}>
      <View style={[styles.chainNumBox, { backgroundColor: tone ?? colors.ink }]}>
        <Text style={styles.chainNum}>{n}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.chainTr}>{s.cue ?? s.tr}</Text>
        {reveal ? <Text style={styles.chainEn}>{s.en}</Text> : null}
        {reveal ? <Text style={styles.chainEn}>{s.tr}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  headTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: 0.4, textTransform: 'uppercase' },

  // Ust sekmeler: kare, murekkep cizgili; secili olan dolu.
  tabs: { flexDirection: 'row', marginHorizontal: space.xl, marginTop: space.md, borderWidth: 2, borderColor: colors.ink },
  tab: { flex: 1, paddingVertical: space.sm, alignItems: 'center' },
  tabOn: { backgroundColor: colors.ink },
  tabText: { fontSize: 13, fontWeight: '800', color: colors.ink, letterSpacing: 0.3 },
  tabTextOn: { color: '#fff' },

  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },

  h1: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  sub: { fontSize: 13, color: colors.muted, lineHeight: 19 },

  // Ilerleme: kare cetvel cizgileri.
  ticks: { flexDirection: 'row', gap: 3 },
  tick: { flex: 1, height: 5, backgroundColor: colors.line },
  tickDone: { backgroundColor: colors.success },
  tickCur: { backgroundColor: colors.ink },

  // Kart: keskin kose, golgesiz, kalin murekkep cercevesi.
  card: { borderWidth: 2, borderColor: colors.ink, gap: space.md, paddingBottom: space.lg },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    backgroundColor: colors.accentSoft,
  },
  cardIcons: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  count: { fontSize: 13, fontWeight: '800', color: colors.ink, letterSpacing: 1 },
  cue: { fontSize: 24, fontWeight: '800', color: colors.ink, lineHeight: 32, paddingHorizontal: space.lg },
  reveal: {
    gap: space.xs,
    marginHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1.5,
    borderTopColor: colors.line,
  },
  en: { fontSize: 18, fontWeight: '700', color: colors.ink, lineHeight: 26 },
  tr: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  ok: { color: colors.success },
  bad: { color: colors.danger },
  heard: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: space.lg,
  },

  micWrap: { alignItems: 'center', gap: space.sm },
  // Mikrofon: yuvarlak degil, kalin kenarlikli kare.
  mic: {
    width: 84,
    height: 84,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  resultText: { fontSize: 22, fontWeight: '800' },
  err: { fontSize: 12, color: colors.danger, textAlign: 'center' },

  doneMark: {
    width: 56,
    height: 56,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  camRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  camBox: {
    width: 96,
    height: 128,
    borderWidth: 2,
    borderColor: colors.ink,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  resultInline: { fontSize: 20, fontWeight: '800', color: colors.accent },
  // Zincir listesi: tek cerceve, satirlar ince cizgiyle ayrilir.
  chainList: { borderWidth: 2, borderColor: colors.ink },
  chainRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  chainNumBox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  chainNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
  chainTr: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 21 },
  chainEn: { fontSize: 13, color: colors.muted, lineHeight: 18 },

  primaryBtn: {
    backgroundColor: colors.ink,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    marginTop: space.sm,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});
