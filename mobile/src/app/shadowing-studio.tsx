import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { VideoView, type VideoSource } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { scoreColor } from '@/components/speak-practice';
import { colors, radius, space } from '@/constants/appTheme';
import {
  getMedia,
  getSentenceCefrCounts,
  getSentencesByCategory,
  getSentencesByCefr,
  getSentencesByMedia,
  getSentenceWords,
  getSetting,
  recordShadowAttempt,
  SentenceCefrCount,
  WordTiming,
} from '@/lib/db';
import type { PronunciationResult } from '@/lib/pronunciation';
import { setLastAssessment } from '@/lib/shadowingStore';
import { useSpeechAssessment } from '@/lib/useSpeechAssessment';
import { resolveVideoSource } from '@/lib/videoSource';

type Mode = 'echo' | 'blind' | 'fast';
const MODES: { key: Mode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'echo', label: 'Cümle', icon: 'chatbox-ellipses-outline' },
  { key: 'blind', label: 'Kör Dinleme', icon: 'eye-off-outline' },
  { key: 'fast', label: 'Hızlı Mod', icon: 'flash-outline' },
];

// start/end doluysa cumle bir videodan gelmis demektir -> Dinle videonun kendi
// sesini calar. Bos ise bizim ek pratik cumlemizdir -> varsayilan TTS sesi.
// mediaId/idx: ilerleme kaydi (shadow_progress) icin cumle kimligi; idx varsa deneme kaydedilir.
type Line = {
  en: string;
  tr: string;
  start?: number | null;
  end?: number | null;
  mediaId?: string;
  idx?: number | null;
  ytId?: string;
  videoUrl?: string | null;
};
const FALLBACK: Line = { en: 'Let me know if you need any help.', tr: 'Yardıma ihtiyacın olursa söyle.' };

// Karaoke hizalama: cumle metnini kelime/bosluk parcalarina bol, sirayla kelime
// zamanlariyla esle. Kasilma (contraction) ve noktalama icin gevsek eslesme.
type Tok = { text: string; start: number | null; end: number | null };
function alignWords(text: string, occ: { surface: string; start_ms: number; end_ms: number }[]): Tok[] {
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
  const parts = text.split(/(\s+)/);
  let oi = 0;
  return parts.map((part) => {
    if (part === '' || /^\s+$/.test(part)) return { text: part, start: null, end: null };
    const n = norm(part);
    if (n && oi < occ.length) {
      const c = norm(occ[oi].surface);
      if (c && (n === c || n.startsWith(c) || c.startsWith(n) || n.includes(c))) {
        const o = occ[oi++];
        return { text: part, start: o.start_ms, end: o.end_ms };
      }
    }
    return { text: part, start: null, end: null };
  });
}

// Shadowing Stüdyosu: mod cipleri + hedef cumle + dinle/yavas dinle + kayit +
// hizli skor + "Detaylar". Kaynak: (a) tek cumle (player mic), (b) bir ders/video
// (kutuphaneden `lesson`), (c) CEFR havuzu (params yok). Her deneme kaydedilir.
export default function ShadowingStudio() {
  const params = useLocalSearchParams<{
    text?: string;
    hint?: string;
    mediaId?: string;
    idx?: string; // cumle idx (shadow_progress kaydi icin; Kesfet kesiti)
    start?: string;
    end?: string;
    lesson?: string; // bir videonun tum cumleleriyle calis
    pack?: string; // bir kategori paketinin cumleleriyle calis (4 videodan)
    title?: string; // paket/ders basligi (gosterim)
  }>();
  const [mode, setMode] = useState<Mode>('echo');
  const [lines, setLines] = useState<Line[]>([FALLBACK]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showTr, setShowTr] = useState(false);
  const [source, setSource] = useState<VideoSource | null>(null); // aktif satirin ses kaynagi
  const [counts, setCounts] = useState<SentenceCefrCount[]>([]);
  const [cefr, setCefr] = useState<string | null>(null); // null = Tumu
  const [loading, setLoading] = useState(true); // ilk yukleme iskeleti (bos-durum flash'ini onler)
  const srcCache = useRef<Map<string, VideoSource>>(new Map());
  const level = getSetting('level');

  // Mod: player mikrofonundan tek cumle mi (param) yoksa paket/ders/havuz mu?
  const single = typeof params.text === 'string' && !!params.text;
  const pack = !single && typeof params.pack === 'string' && !!params.pack;
  const lesson = !single && !pack && typeof params.lesson === 'string' && !!params.lesson;
  const pool = !single && !pack && !lesson; // CEFR havuzu (chip'li)

  // Havuz modunda: CEFR sayimlarini yukle + varsayilan seviyeyi ata (bir kez).
  useEffect(() => {
    if (!pool) return;
    const c = getSentenceCefrCounts();
    setCounts(c);
    const lv = getSetting('level');
    if (lv && c.some((x) => x.cefr === lv)) setCefr(lv);
  }, [pool]);

  // Tek cumle modu (player mic): parametreden.
  useEffect(() => {
    if (!single) return;
    const start = params.start ? Number(params.start) : null;
    const end = params.end ? Number(params.end) : null;
    let ytId: string | undefined;
    let videoUrl: string | null | undefined;
    if (params.mediaId) {
      const m = getMedia().find((x) => x.id === params.mediaId);
      if (m) {
        ytId = m.youtube_id;
        videoUrl = m.video_url;
      }
    }
    const sentIdx = params.idx != null && params.idx !== '' ? Number(params.idx) : null;
    setLines([
      { en: params.text!, tr: params.hint ?? '', start, end, mediaId: params.mediaId, idx: sentIdx, ytId, videoUrl },
    ]);
    setIdx(0);
  }, [single, params.text, params.hint, params.mediaId, params.idx, params.start, params.end]);

  // Ders modu: bir videonun tum cumleleri (idx sirali).
  useEffect(() => {
    if (!lesson) return;
    const ss = getSentencesByMedia(params.lesson!).map((s) => ({
      en: s.text_en,
      tr: s.text_tr ?? '',
      start: s.start_ms,
      end: s.end_ms,
      mediaId: s.media_id,
      idx: s.idx,
      ytId: s.youtube_id,
      videoUrl: s.video_url,
    }));
    setLines(ss.length ? ss : [FALLBACK]);
    setIdx(0);
  }, [lesson, params.lesson]);

  // Paket modu: bir kategorinin tum cumleleri (4 videodan toplanir).
  useEffect(() => {
    if (!pack) return;
    const ss = getSentencesByCategory(params.pack!).map((s) => ({
      en: s.text_en,
      tr: s.text_tr ?? '',
      start: s.start_ms,
      end: s.end_ms,
      mediaId: s.media_id,
      idx: s.idx,
      ytId: s.youtube_id,
      videoUrl: s.video_url,
    }));
    setLines(ss.length ? ss : [FALLBACK]);
    setIdx(0);
  }, [pack, params.pack]);

  // Havuz modu: secili CEFR'e gore cumle havuzu (tum videolardan).
  useEffect(() => {
    if (!pool) return;
    const ss = getSentencesByCefr(cefr).map((s) => ({
      en: s.text_en,
      tr: s.text_tr ?? '',
      start: s.start_ms,
      end: s.end_ms,
      mediaId: s.media_id,
      idx: s.idx,
      ytId: s.youtube_id,
      videoUrl: s.video_url,
    }));
    setLines(ss.length ? ss : [FALLBACK]);
    setIdx(0);
  }, [pool, cefr]);

  const line = lines[idx] ?? FALLBACK;

  // Aktif satirin ses kaynagini coz (video degisince). Cozulenler onbellekte.
  useEffect(() => {
    if (!line.mediaId || line.start == null || !line.ytId) {
      setSource(null);
      return;
    }
    const key = line.mediaId;
    const cached = srcCache.current.get(key);
    if (cached) {
      setSource(cached);
      return;
    }
    let alive = true;
    resolveVideoSource(line.ytId, line.videoUrl ?? null).then((s) => {
      if (!alive) return;
      srcCache.current.set(key, s);
      setSource(s);
    });
    return () => {
      alive = false;
    };
  }, [line.mediaId, line.ytId, line.videoUrl, line.start]);
  const clip = useMemo(
    () => ({ source, start: line.start ?? null, end: line.end ?? null }),
    [source, line.start, line.end],
  );
  const { status, result, error, listen, toggleRecord, reset, player, hasClip } = useSpeechAssessment(line.en, clip);

  // Videonun en-boy orani (kaynak yuklenince guncellenir; varsayilan 16:9).
  const [aspect, setAspect] = useState(16 / 9);
  const startRef = useRef<number | null>(null);
  startRef.current = line.start ?? null; // aktif cumlenin klip baslangici (seek icin)
  useEffect(() => {
    const sub = player.addListener('sourceLoad', ({ availableVideoTracks }) => {
      const s = availableVideoTracks?.[0]?.size;
      if (s && s.width > 0 && s.height > 0) setAspect(s.width / s.height);
      // Yuklenince ilk kareyi cumlenin baslangicina getir (alakali karpaj gorunsun).
      if (startRef.current != null) {
        try {
          player.currentTime = startRef.current / 1000;
        } catch {}
      }
    });
    return () => sub.remove();
  }, [player]);

  // Ayni video icinde sonraki cumleye gecince: oynatilmiyorsa dogru kareye sar.
  useEffect(() => {
    if (line.start == null || status === 'recording') return;
    try {
      player.currentTime = line.start / 1000;
    } catch {}
  }, [player, line.start, status]);

  // --- Karaoke: video sesi ile cumle kelimeleri senkron ---
  // Aktif cumlenin kelime zamanlarini yukle (mediaId+idx bilinen cumleler).
  const [words, setWords] = useState<WordTiming[]>([]);
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    if (line.mediaId != null && line.idx != null) setWords(getSentenceWords(line.mediaId, line.idx));
    else setWords([]);
    setNowMs(null); // cumle degisti -> vurgu sifir
  }, [line.mediaId, line.idx]);

  // Oynatma ilerledikce mevcut video zamanini takip et (kelime vurgusu icin).
  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => setNowMs(currentTime * 1000));
    return () => sub.remove();
  }, [player]);

  // Cumle metnini kelime zamanlariyla hizala (token = kelime/bosluk + varsa [start,end]).
  const tokens = useMemo(() => alignWords(line.en, words), [line.en, words]);
  // Aktif kelime: [start,end] araligi simdiki zamani iceren; yoksa gecilmis son kelime.
  const activeKey = useMemo(() => {
    if (nowMs == null) return -1;
    let k = -1;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.start == null) continue;
      if (nowMs >= t.start && (t.end == null || nowMs < t.end)) return i;
      if (nowMs >= t.start) k = i;
    }
    return k;
  }, [tokens, nowMs]);

  // Her yeni degerlendirme sonucunu ilerleme tablosuna yaz (idx bilinen cumleler).
  // Ayni result nesnesi icin tek kez; her deneme sayilir, en iyi skor saklanir.
  const lastResultRef = useRef<PronunciationResult | null>(null);
  useEffect(() => {
    if (!result || result === lastResultRef.current) return;
    lastResultRef.current = result;
    if (line.mediaId != null && line.idx != null) recordShadowAttempt(line.mediaId, line.idx, result.pron);
  }, [result, line.mediaId, line.idx]);

  // Cumle/mod/seviye degisince goster-gizle sifirla.
  useEffect(() => {
    setRevealed(false);
    setShowTr(false);
    reset();
  }, [idx, mode, cefr, reset]);

  const total = useMemo(() => counts.reduce((a, c) => a + c.c, 0), [counts]);
  const chips = useMemo(
    () =>
      [{ key: null as string | null, label: 'Tümü', c: total }].concat(
        counts.filter((c) => c.cefr).map((c) => ({ key: c.cefr as string, label: c.cefr as string, c: c.c })),
      ),
    [counts, total],
  );

  const hideText = mode !== 'echo' && !revealed; // blind + fast: metni gizle
  const promptTr = mode === 'fast'; // hizli mod: Turkce'den uret

  function openDetail() {
    if (!result) return;
    setLastAssessment({ sentence: line.en, tr: line.tr, result });
    router.push('/analysis');
  }

  const focused = pack || lesson; // baslikli + geri butonlu odak modu
  const headerTitle = focused ? (params.title ?? line.en) : 'Shadowing Stüdyosu';
  const headerEyebrow = pack
    ? 'PAKET PRATİĞİ'
    : lesson
      ? 'DERS PRATİĞİ'
      : level
        ? `SEVİYE ${level}`
        : 'AKUSTİK PRATİK';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Baslik */}
        <View style={styles.head}>
          <View style={styles.headLeft}>
            {focused ? (
              <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={colors.ink} />
              </Pressable>
            ) : null}
            <View style={styles.headTexts}>
              <Text style={styles.eyebrow}>{headerEyebrow}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {headerTitle}
              </Text>
            </View>
          </View>
          <Pressable style={styles.avatar} onPress={() => router.navigate('/profile')}>
            <Ionicons name="person" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Seviye (CEFR) kategorileri - yalniz havuz modunda */}
        {pool && chips.length > 1 ? (
          <View style={styles.levelBlock}>
            <Text style={styles.levelLabel}>SEVİYE HAVUZU</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsRow}>
              {chips.map((c) => {
                const on = c.key === cefr;
                return (
                  <Pressable
                    key={c.key ?? 'all'}
                    style={[styles.levelChip, on && styles.levelChipOn]}
                    onPress={() => setCefr(c.key)}>
                    <Text style={[styles.levelChipText, on && styles.levelChipTextOn]}>
                      {c.label} ({c.c})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Mod cipleri */}
        <View style={styles.modes}>
          {MODES.map((m) => {
            const on = m.key === mode;
            return (
              <Pressable key={m.key} style={[styles.modeChip, on && styles.modeChipOn]} onPress={() => setMode(m.key)}>
                <Ionicons name={m.icon} size={15} color={on ? '#fff' : colors.muted} />
                <Text style={[styles.modeText, on && styles.modeTextOn]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Kaynak video: cumlenin [start,end] klibini oynatir. Dokun -> tekrar oynat.
            Kor/hizli modda gizli (once sese odaklan, sonra Goster ile acilir). */}
        {hasClip && !hideText ? (
          <Pressable style={[styles.videoWrap, { aspectRatio: aspect }]} onPress={() => listen(0.95)}>
            <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
            <View style={styles.videoTapHint}>
              <Ionicons name="play" size={16} color="#fff" />
            </View>
          </Pressable>
        ) : null}

        {/* Hedef cumle karti */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardHeadLabel}>{promptTr ? 'TÜRKÇEDEN ÜRET' : 'HEDEF CÜMLE'}</Text>
            <View style={styles.cardHeadRight}>
              {lines.length > 1 ? (
                <Text style={styles.counter}>
                  {idx + 1}/{lines.length}
                </Text>
              ) : null}
              {line.tr && !focused ? (
                <Pressable onPress={() => setShowTr((v) => !v)} hitSlop={6}>
                  <Text style={styles.trToggle}>Çeviri</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {promptTr ? (
            <Text style={styles.sentence}>{line.tr || line.en}</Text>
          ) : hideText ? (
            <Text style={styles.hidden}>Metin gizli. Sadece sese odaklan ve tekrar et.</Text>
          ) : tokens.some((t) => t.start != null) ? (
            <Text style={styles.sentence}>
              {tokens.map((t, i) => (
                <Text key={i} style={i === activeKey ? styles.wordActive : undefined}>
                  {t.text}
                </Text>
              ))}
            </Text>
          ) : (
            <Text style={styles.sentence}>{line.en}</Text>
          )}

          {(showTr || focused) && !promptTr && line.tr ? <Text style={styles.trText}>{line.tr}</Text> : null}

          {/* Dinle / Yavas dinle / (gerekiyorsa) Goster */}
          <View style={styles.listenRow}>
            <Pressable style={styles.listenBtn} onPress={() => listen(0.95)}>
              <Ionicons name="volume-high-outline" size={17} color={colors.accent} />
              <Text style={styles.listenText}>Dinle</Text>
            </Pressable>
            <Pressable style={styles.listenBtn} onPress={() => listen(0.6)}>
              <Ionicons name="hourglass-outline" size={16} color={colors.muted} />
              <Text style={[styles.listenText, { color: colors.muted }]}>Yavaş Dinle</Text>
            </Pressable>
            {hideText ? (
              <Pressable style={styles.listenBtn} onPress={() => setRevealed(true)}>
                <Ionicons name="eye-outline" size={16} color={colors.muted} />
                <Text style={[styles.listenText, { color: colors.muted }]}>Göster</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Kayit */}
        <View style={styles.recWrap}>
          <PressableScale
            style={[styles.recBtn, status === 'recording' && styles.recActive]}
            haptic="medium"
            onPress={toggleRecord}
            disabled={status === 'assessing'}>
            <Ionicons name={status === 'recording' ? 'stop' : 'mic'} size={28} color="#fff" />
          </PressableScale>
          <Text style={styles.recHint}>
            {status === 'recording' ? 'Dinliyorum... bitince dokun' : 'Kaydetmek için dokun'}
          </Text>
        </View>

        {status === 'assessing' ? (
          <View style={styles.assessing}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.muted}>Akustik analiz yapılıyor...</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.errText}>{error}</Text> : null}

        {/* Hizli skor + Detaylar */}
        {result ? (
          <Pressable style={styles.scoreCard} onPress={openDetail}>
            <View style={styles.scoreLeft}>
              <Ionicons name="checkmark-circle" size={20} color={scoreColor(result.pron)} />
              <View>
                <Text style={styles.scoreTitle}>%{result.pron} Doğruluk</Text>
                <Text style={styles.scoreSub}>
                  Doğruluk %{result.accuracy} · Akıcılık %{result.fluency} · Eşleşme %{result.matchPct}
                </Text>
              </View>
            </View>
            <View style={styles.detailBtn}>
              <Text style={styles.detailText}>Detaylar</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.ink} />
            </View>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },

  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  headTexts: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  levelBlock: { gap: space.sm },
  levelLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsRow: { gap: space.sm, paddingRight: space.xl, alignItems: 'center' },
  levelChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  levelChipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  levelChipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  levelChipTextOn: { color: '#fff' },

  modes: { flexDirection: 'row', gap: space.sm },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
  },
  modeChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  modeText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  modeTextOn: { color: '#fff' },

  videoWrap: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTapHint: {
    position: 'absolute',
    bottom: space.sm,
    right: space.sm,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.lg, gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeadLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  cardHeadRight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  counter: { fontSize: 12, fontWeight: '700', color: colors.muted },
  trToggle: { fontSize: 12, fontWeight: '700', color: colors.teal },
  sentence: { fontSize: 22, fontWeight: '700', color: colors.ink, lineHeight: 30 },
  wordActive: { color: colors.accent, backgroundColor: colors.accentSoft },
  hidden: { fontSize: 15, color: colors.muted, fontStyle: 'italic', lineHeight: 22 },
  trText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  listenRow: { flexDirection: 'row', gap: space.xl, flexWrap: 'wrap' },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  listenText: { color: colors.accent, fontWeight: '700', fontSize: 14 },

  recWrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  recBtn: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recActive: { backgroundColor: colors.ink },
  recHint: { fontSize: 13, color: colors.muted },

  assessing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  muted: { color: colors.muted, fontSize: 13 },
  errText: { fontSize: 13, color: colors.danger, textAlign: 'center' },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.lg,
  },
  scoreLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 },
  scoreTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  scoreSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailText: { fontSize: 13, fontWeight: '700', color: colors.ink },
});
