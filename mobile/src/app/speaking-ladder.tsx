import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Segmented } from '@/components/segmented';
import { colors, radius, space } from '@/constants/appTheme';
import {
  addSpeakingTake,
  getLadderState,
  recordLadderAttempt,
  saveLadderChain,
  updateSpeakingTakeMedia,
  type LadderState,
} from '@/lib/db';
import { getLadderTheme, type LadderSentence, type LadderTheme } from '@/lib/speaking/ladder';
import { persistTakeAudio, persistTakeVideo } from '@/lib/speaking/media';
import { bestMatch, useLiveSpeech } from '@/lib/useLiveSpeech';
import { alignWords, type WordStatus } from '@/lib/wordAlign';

// KONUSMA MERDIVENI: bir temanin cumleleri (bir konusma akisi) uc basamakta calisilir.
// 1 Dinle: cumle calinir, EN+TR gorerek soylersin.
// 2 Turkceden: yalniz TR gorunur, EN'yi aklindan soylersin (alternatifler de kabul).
// 3 Zincir: TR ipuclariyla cumleleri ART ARDA soylersin; her basarili zincirde +2 uzar.
// Degerlendirme otomatik (cihaz ici tanima + kelime hizalama); %80 ve ustu gecer.
// Bir basamagin tum cumleleri gecilmeden sonraki acilmaz.
const PASS = 80;
const CHAIN_PASS = 75;
const CHAIN_START = 3;

export default function SpeakingLadder() {
  const { theme: themeId } = useLocalSearchParams<{ theme?: string }>();
  const theme = useMemo(() => getLadderTheme(themeId), [themeId]);
  const [st, setSt] = useState<LadderState | null>(null);
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  const refresh = useCallback(() => {
    if (!theme) return null;
    const s = getLadderState(theme.id);
    setSt(s);
    return s;
  }, [theme]);

  // Ilk acilista: tamamlanmamis ilk basamaktan basla.
  useEffect(() => {
    const s = refresh();
    if (!s || !theme) return;
    const n = theme.sentences.length;
    setStage(s.passed1.size < n ? 1 : s.passed2.size < n ? 2 : 3);
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

  const n = theme.sentences.length;
  const open2 = st.passed1.size >= n;
  const open3 = st.passed2.size >= n;

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

      <View style={styles.seg}>
        <Segmented
          options={[
            { key: '1', label: `Dinle ${st.passed1.size}/${n}` },
            { key: '2', label: open2 ? `Türkçeden ${st.passed2.size}/${n}` : 'Türkçeden' },
            { key: '3', label: open3 ? `Zincir ${Math.max(st.chainLen, CHAIN_START)}` : 'Zincir' },
          ]}
          disabled={[...(open2 ? [] : ['2']), ...(open3 ? [] : ['3'])]}
          value={String(stage)}
          onChange={(k) => setStage(Number(k) as 1 | 2 | 3)}
        />
      </View>

      {stage === 3 ? (
        <Chain key="chain" theme={theme} st={st} onSaved={refresh} />
      ) : (
        <Drill
          key={`drill${stage}`}
          theme={theme}
          stage={stage}
          passed={stage === 1 ? st.passed1 : st.passed2}
          onSaved={refresh}
          onStageDone={() => setStage((stage + 1) as 2 | 3)}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Basamak 1 ve 2: cumle cumle.
function Drill({
  theme,
  stage,
  passed,
  onSaved,
  onStageDone,
}: {
  theme: LadderTheme;
  stage: 1 | 2;
  passed: Set<string>;
  onSaved: () => void;
  onStageDone: () => void;
}) {
  const list = theme.sentences;
  const firstOpen = Math.max(0, list.findIndex((s) => !passed.has(s.key)));
  const [idx, setIdx] = useState(firstOpen);
  const [result, setResult] = useState<{ pct: number; pass: boolean } | null>(null);
  const [allDone, setAllDone] = useState(passed.size >= list.length);
  const live = useLiveSpeech();
  const evaluating = useRef(false);

  const cur = list[idx];
  const candidates = useMemo(() => [cur.en, ...(cur.alts ?? [])], [cur]);
  const match = useMemo(() => bestMatch(candidates, live.transcript), [candidates, live.transcript]);

  // Dinle basamaginda cumle acilinca kendiliginden calinir.
  useEffect(() => {
    if (stage !== 1 || allDone) return;
    const t = setTimeout(() => Speech.speak(cur.en, { language: 'en-US', rate: 0.85 }), 350);
    return () => {
      clearTimeout(t);
      Speech.stop();
    };
  }, [cur, stage, allDone]);

  const goNext = useCallback(
    (fromIdx: number, justPassed?: string) => {
      setResult(null);
      live.reset();
      const done = new Set(passed);
      if (justPassed) done.add(justPassed);
      if (done.size >= list.length) {
        setAllDone(true);
        return;
      }
      for (let k = 1; k <= list.length; k++) {
        const j = (fromIdx + k) % list.length;
        if (!done.has(list[j].key)) return setIdx(j);
      }
    },
    [list, passed, live],
  );

  const evaluate = useCallback(async () => {
    if (evaluating.current) return;
    evaluating.current = true;
    if (live.listening) await live.stop();
    const pct = match.pct;
    const pass = pct >= PASS;
    recordLadderAttempt(theme.id, cur.key, stage, pct, pass);
    setResult({ pct, pass });
    onSaved();
    evaluating.current = false;
    if (pass) setTimeout(() => goNext(idx, cur.key), 1100);
  }, [live, match.pct, theme.id, cur.key, stage, onSaved, goNext, idx]);

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
        <Ionicons name="checkmark-circle" size={56} color={colors.success} />
        <Text style={styles.h1}>{stage === 1 ? 'Dinle basamağı tamam' : 'Türkçeden söyleme tamam'}</Text>
        <Text style={styles.sub}>
          {stage === 1
            ? 'Şimdi aynı cümleleri yalnız Türkçesine bakarak söyle.'
            : 'Şimdi cümleleri art arda, zincir hâlinde söyle.'}
        </Text>
        <Pressable style={styles.primaryBtn} onPress={onStageDone}>
          <Text style={styles.primaryText}>Sonraki basamak</Text>
        </Pressable>
      </View>
    );
  }

  const showEn = stage === 1 || result != null;
  const shownWords = result ? match.words : cur.en.split(/\s+/);
  const shownStatus: WordStatus[] = stage === 1 || result ? match.status : [];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.dots}>
        {list.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.dot,
              passed.has(s.key) && styles.dotDone,
              i === idx && styles.dotCur,
            ]}
          />
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.count}>
            {idx + 1} / {list.length}
          </Text>
          <View style={styles.cardIcons}>
            {stage === 1 || result ? (
              <Pressable
                hitSlop={10}
                onPress={() => Speech.speak(result ? match.text : cur.en, { language: 'en-US', rate: 0.85 })}>
                <Ionicons name="volume-high" size={22} color={colors.accent} />
              </Pressable>
            ) : null}
            <Pressable hitSlop={10} onPress={() => goNext(idx)} disabled={live.listening}>
              <Ionicons name="play-skip-forward" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {stage === 2 ? <Text style={styles.trBig}>{cur.tr}</Text> : null}

        {showEn ? (
          <Text style={stage === 1 ? styles.enBig : styles.en}>
            {shownWords.map((w, i) => (
              <Text
                key={i}
                style={shownStatus[i] === 'ok' ? styles.ok : shownStatus[i] === 'wrong' ? styles.bad : undefined}>
                {w}
                {i < shownWords.length - 1 ? ' ' : ''}
              </Text>
            ))}
          </Text>
        ) : null}

        {stage === 1 ? <Text style={styles.tr}>{cur.tr}</Text> : null}

        {stage === 2 && live.listening && live.transcript ? (
          <Text style={styles.heard}>{live.transcript}</Text>
        ) : null}
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
        {result && !result.pass && live.transcript ? (
          <Text style={styles.heard}>Duyulan: {live.transcript}</Text>
        ) : null}
        {live.error ? <Text style={styles.err}>{live.error}</Text> : null}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Basamak 3: zincir. Ilk N cumle TR ipucuyla art arda soylenir. On kamera sessiz
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
          <Text style={styles.sub}>Türkçelere bakarak İngilizcesini durmadan söyle.</Text>
          {graded ? <Text style={styles.resultInline}>%{result ? result.pct : overall}</Text> : null}
        </View>
      </View>

      {items.map((s, i) => (
        <ChainRow key={s.key} n={i + 1} s={s} pct={graded ? perSentence[i] : null} reveal={result != null} />
      ))}

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
  const tone = pct == null ? colors.line : pct >= PASS ? colors.success : pct > 0 ? colors.warning : colors.line;
  return (
    <View style={[styles.chainRow, { borderLeftColor: tone }]}>
      <Text style={styles.chainNum}>{n}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.chainTr}>{s.tr}</Text>
        {reveal ? <Text style={styles.chainEn}>{s.en}</Text> : null}
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
  },
  headTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.ink },
  seg: { paddingHorizontal: space.xl, paddingTop: space.md },
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },

  h1: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  sub: { fontSize: 13, color: colors.muted, lineHeight: 19 },

  dots: { flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  dotDone: { backgroundColor: colors.success },
  dotCur: { backgroundColor: colors.accent },

  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIcons: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  count: { fontSize: 12, fontWeight: '800', color: colors.muted },
  enBig: { fontSize: 22, fontWeight: '800', color: colors.ink, lineHeight: 30 },
  en: { fontSize: 18, fontWeight: '700', color: colors.ink, lineHeight: 26 },
  trBig: { fontSize: 22, fontWeight: '800', color: colors.ink, lineHeight: 30 },
  tr: { fontSize: 15, color: colors.muted },
  ok: { color: colors.success },
  bad: { color: colors.danger },
  heard: { fontSize: 13, color: colors.muted, fontStyle: 'italic', textAlign: 'center' },

  micWrap: { alignItems: 'center', gap: space.sm },
  mic: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  resultText: { fontSize: 22, fontWeight: '800' },
  err: { fontSize: 12, color: colors.danger, textAlign: 'center' },

  camRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  camBox: {
    width: 96,
    height: 128,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  resultInline: { fontSize: 20, fontWeight: '800', color: colors.accent },
  chainRow: {
    flexDirection: 'row',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    padding: space.md,
  },
  chainNum: { fontSize: 13, fontWeight: '800', color: colors.muted, width: 18 },
  chainTr: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 21 },
  chainEn: { fontSize: 13, color: colors.muted, lineHeight: 18 },

  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    marginTop: space.sm,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
