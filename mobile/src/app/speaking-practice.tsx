import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { azure } from '@/lib/azure';
import { addSpeakingTake, updateSpeakingTakeMedia } from '@/lib/db';
import { assessPronunciation, type PronunciationResult } from '@/lib/pronunciation';
import { getSpeakingFocus } from '@/lib/speaking';
import { persistTakeAudio, persistTakeVideo } from '@/lib/speaking/media';
import { alignWords } from '@/lib/wordAlign';

type Phase = 'idle' | 'recording' | 'saving';

// KONUSMA PRATIGI (v2 - video + canli): bir odagin varyasyonlarini tek tek calis.
// Akis: Dinle (TTS) -> kayit tusu: on kamera SESSIZ video + cihaz ici konusma tanima
// AYNI ANDA baslar. Tanima sesi hem yaziya doker (kelimeler canli yesil/kirmizi)
// hem WAV olarak saklar (persist). Durunca: video + ses kalici klasore kopyalanir,
// take DB'ye yazilir, ses Azure'a gider (ayarliysa) ve puan ayni take'e yazilir.
// Mikrofonu tek bir motor (tanima) tutar; kamera mute oldugu icin ses oturumu cakismaz.
// Kamera izni yoksa ayni akis yalniz sesle calisir.
export default function SpeakingPractice() {
  const { focus: focusId } = useLocalSearchParams<{ focus?: string }>();
  const focus = useMemo(() => getSpeakingFocus(focusId), [focusId]);

  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [takes, setTakes] = useState(0);
  const cur = focus?.variations[idx];

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [camReady, setCamReady] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState('');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Kayit parcalari iki ayri kaynaktan gelir (kamera promise'i + tanima audioend);
  // ikisi de gelince tek take olarak saklanir.
  const videoP = useRef<Promise<string | null> | null>(null);
  const audioUri = useRef<string | null>(null);
  const audioWait = useRef<((u: string | null) => void) | null>(null);
  const recRef = useRef(false);

  useEffect(() => {
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) requestCamPerm();
  }, [camPerm, requestCamPerm]);

  useSpeechRecognitionEvent('result', (e) => {
    if (recRef.current) setHeard(e.results?.[0]?.transcript ?? '');
  });
  useSpeechRecognitionEvent('audioend', (e) => {
    audioUri.current = e.uri ?? null;
    audioWait.current?.(audioUri.current);
    audioWait.current = null;
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (e.error !== 'no-speech' && e.error !== 'aborted') setError('Ses tanınamadı, tekrar dene.');
  });

  // Ekrandan cikinca her seyi durdur.
  useFocusEffect(
    useCallback(() => {
      return () => {
        recRef.current = false;
        Speech.stop();
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {}
        try {
          camRef.current?.stopRecording();
        } catch {}
      };
    }, []),
  );

  const words = useMemo(() => (cur ? cur.en.split(/\s+/) : []), [cur]);
  const live = useMemo(() => alignWords(words, heard), [words, heard]);
  const useCam = !!camPerm?.granted;

  const listen = useCallback(() => {
    if (!cur || phase !== 'idle') return;
    Speech.stop();
    Speech.speak(cur.en, { language: 'en-US', rate: 0.85 });
  }, [cur, phase]);

  const start = useCallback(async () => {
    if (!cur) return;
    setError(null);
    setResult(null);
    setHeard('');
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Mikrofon ve konuşma tanıma izni gerekiyor.');
        return;
      }
    } catch {}
    Speech.stop();
    audioUri.current = null;
    videoP.current =
      useCam && camReady && camRef.current
        ? camRef.current
            .recordAsync({ maxDuration: 30 })
            .then((r) => r?.uri ?? null)
            .catch(() => null)
        : null;
    recRef.current = true;
    setPhase('recording');
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
        recordingOptions: { persist: true },
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          mode: 'measurement',
        },
      });
    } catch {
      recRef.current = false;
      setPhase('idle');
      setError('Kayıt başlatılamadı.');
    }
  }, [cur, useCam, camReady]);

  const stop = useCallback(async () => {
    if (!focus || !cur) return;
    recRef.current = false;
    setPhase('saving');
    const audioReady = new Promise<string | null>((res) => {
      if (audioUri.current) return res(audioUri.current);
      audioWait.current = res;
      setTimeout(() => res(audioUri.current), 4000);
    });
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
    try {
      camRef.current?.stopRecording();
    } catch {}

    const [aTmp, vTmp] = await Promise.all([audioReady, videoP.current ?? Promise.resolve(null)]);
    videoP.current = null;

    const id = addSpeakingTake({ focus_id: focus.id, variation_key: cur.key, text_en: cur.en, score: null });
    setTakes((t) => t + 1);
    const [aDest, vDest] = await Promise.all([
      aTmp ? persistTakeAudio(focus.id, id, aTmp).catch(() => null) : null,
      vTmp ? persistTakeVideo(focus.id, id, vTmp).catch(() => null) : null,
    ]);
    updateSpeakingTakeMedia(id, { audio_uri: aDest, video_uri: vDest });
    setPhase('idle');

    // Puan: Azure ayarliysa telaffuz puani, degilse canli eslesme orani.
    if (aDest && azure.configured) {
      try {
        const r = await assessPronunciation(aDest, cur.en);
        setResult(r);
        updateSpeakingTakeMedia(id, { score: Math.round(r.pron) });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Puan alınamadı.');
      }
    }
  }, [focus, cur]);

  if (!focus || !cur) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errTitle}>Odak bulunamadı</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryText}>Geri dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const total = focus.variations.length;
  const last = idx >= total - 1;
  const okCount = live.status.filter((s) => s === 'ok').length;
  const livePct = words.length ? Math.round((okCount / words.length) * 100) : 0;

  function advance() {
    setResult(null);
    setHeard('');
    setError(null);
    if (last) setDone(true);
    else setIdx((i) => i + 1);
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          <Text style={styles.doneTitle}>Pratik tamam</Text>
          <Text style={styles.doneSub}>
            {focus.title} · bu turda {takes} kayıt aldın
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace(`/speaking-progress?focus=${encodeURIComponent(focus.id)}`)}>
            <Text style={styles.primaryText}>Kayıtları gör</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Bitir</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const recording = phase === 'recording';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headCount}>
          {idx + 1} / {total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${(idx / total) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hedef cumle: konustukca kelimeler canli boyanir */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.typeLabel}>
              {focus.focusEn} · {cur.typeLabel}
            </Text>
            <Pressable onPress={listen} hitSlop={10} disabled={phase !== 'idle'}>
              <Ionicons name="volume-high" size={22} color={phase === 'idle' ? colors.accent : colors.muted} />
            </Pressable>
          </View>
          <Text style={styles.targetEn}>
            {words.map((w, i) => {
              const s = live.status[i];
              return (
                <Text
                  key={i}
                  style={s === 'ok' ? styles.wOk : s === 'wrong' ? styles.wBad : undefined}>
                  {w}
                  {i < words.length - 1 ? ' ' : ''}
                </Text>
              );
            })}
          </Text>
          <Text style={styles.targetTr}>{cur.tr}</Text>
          {cur.tip ? <Text style={styles.tip}>{cur.tip}</Text> : null}
        </View>

        {/* On kamera: kendini gorerek konus; kayit tusu kameranin ustunde */}
        <View style={styles.camWrap}>
          {useCam ? (
            <CameraView
              ref={camRef}
              style={StyleSheet.absoluteFill}
              facing="front"
              mode="video"
              mute
              onCameraReady={() => setCamReady(true)}
            />
          ) : (
            <View style={styles.noCam}>
              <Ionicons name="videocam-off-outline" size={28} color={colors.muted} />
              <Text style={styles.noCamText}>Kamera izni yok, yalnız ses kaydedilir.</Text>
            </View>
          )}
          {recording ? (
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>%{livePct}</Text>
            </View>
          ) : null}
          <Pressable
            style={[styles.recBtn, recording && styles.recBtnOn]}
            onPress={recording ? stop : start}
            disabled={phase === 'saving'}>
            <View style={recording ? styles.recStop : styles.recInner} />
          </Pressable>
        </View>

        {heard && !recording ? (
          <Text style={styles.heard} numberOfLines={2}>
            Duyulan: {heard}
          </Text>
        ) : null}

        {result ? (
          <View style={styles.scoreRow}>
            <ScorePill label="Telaffuz" value={Math.round(result.pron)} tint={colors.accent} />
            <ScorePill label="Doğruluk" value={Math.round(result.accuracy)} tint={colors.teal} />
            <ScorePill label="Eşleşme" value={result.matchPct} tint={colors.success} />
          </View>
        ) : null}

        {error ? <Text style={styles.errText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.footBtn} onPress={advance} disabled={phase !== 'idle'}>
          <Text style={styles.footBtnText}>{last ? 'Bitir' : 'Sıradaki'}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ScorePill({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <View style={styles.scorePill}>
      <Text style={[styles.scoreValue, { color: tint }]}>%{value}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },

  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.md },
  headCount: { fontSize: 13, fontWeight: '800', color: colors.muted },
  track: { height: 3, backgroundColor: colors.surface, marginTop: space.md },
  trackFill: { height: 3, backgroundColor: colors.accent },

  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },

  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeLabel: { fontSize: 12, fontWeight: '800', color: colors.accent },
  targetEn: { fontSize: 22, fontWeight: '800', color: colors.ink, lineHeight: 30, letterSpacing: -0.3 },
  wOk: { color: colors.success },
  wBad: { color: colors.danger },
  targetTr: { fontSize: 15, color: colors.muted },
  tip: { fontSize: 12, color: colors.muted, lineHeight: 17 },

  camWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  noCam: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.xl },
  noCamText: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  recBadge: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  recText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  recBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  recBtnOn: { borderColor: colors.danger },
  recInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.danger },
  recStop: { width: 26, height: 26, borderRadius: 4, backgroundColor: colors.danger },

  heard: { fontSize: 12, color: colors.muted, fontStyle: 'italic', textAlign: 'center' },

  scoreRow: { flexDirection: 'row', gap: space.sm },
  scorePill: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, paddingVertical: space.sm, gap: 2 },
  scoreValue: { fontSize: 20, fontWeight: '800' },
  scoreLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },

  errText: { fontSize: 12, color: colors.danger, textAlign: 'center' },

  footer: { padding: space.xl, borderTopWidth: 1, borderTopColor: colors.line },
  footBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.lg,
  },
  footBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  errTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  doneSub: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.xl, marginTop: space.sm },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryBtn: { paddingVertical: space.sm, paddingHorizontal: space.xl },
  secondaryText: { color: colors.muted, fontWeight: '700', fontSize: 14 },
});
