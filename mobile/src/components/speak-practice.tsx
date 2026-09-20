import { Ionicons } from '@expo/vector-icons';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Appear } from '@/components/motion';
import { PressableScale } from '@/components/pressable-scale';
import { azure } from '@/lib/azure';
import { assessPronunciation, PronunciationResult, WordScore } from '@/lib/pronunciation';
import { WAV_16K_MONO } from '@/lib/recording';
import { colors, space } from '@/constants/appTheme';

type Status = 'idle' | 'recording' | 'assessing';

export function scoreColor(v: number) {
  if (v >= 80) return colors.success;
  if (v >= 60) return colors.warning;
  return colors.danger;
}

type Props = {
  text: string; // hedef cumle
  uri?: string; // videonun kendi sesi (varsa) - araligi calmak icin
  start?: number;
  end?: number;
  hard?: boolean; // zor mod: cumle gizli, TR ipucu
  hint?: string; // zor modda gosterilecek TR ipucu
};

// Bir cumle icin: dinle (video sesi ya da TTS) + kaydet + telaffuz skoru.
export function SpeakPractice({ text, uri, start, end, hard = false, hint }: Props) {
  const recorder = useAudioRecorder(WAV_16K_MONO);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const hasClip = !!(uri && start != null && end != null);
  const player = useVideoPlayer(hasClip ? uri! : null, (p) => {
    p.timeUpdateEventInterval = 0.1;
    p.muted = false;
  });
  const previewEndRef = useRef<number | null>(null);
  const statusRef = useRef<Status>('idle');
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Ekrandan cikinca (blur) veya bilesen sokulunce: TTS/video/kayit dur + state sifirla.
  useFocusEffect(
    useCallback(() => {
      return () => {
        Speech.stop();
        try {
          player.pause();
        } catch {}
        if (statusRef.current === 'recording') recorder.stop().catch(() => {});
        setStatus('idle');
        setResult(null);
        setError(null);
        setRevealed(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [player]),
  );

  useEffect(() => {
    (async () => {
      await requestRecordingPermissionsAsync();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
  }, []);

  // Cumle degisince sifirla.
  useEffect(() => {
    setResult(null);
    setError(null);
    setRevealed(false);
  }, [text]);

  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (previewEndRef.current != null && currentTime * 1000 >= previewEndRef.current) {
        player.pause();
        previewEndRef.current = null;
      }
    });
    return () => sub.remove();
  }, [player]);

  function listen() {
    if (hasClip) {
      previewEndRef.current = end!;
      player.currentTime = start! / 1000;
      player.play();
      return;
    }
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: 0.95 });
  }

  async function startRec() {
    setError(null);
    setResult(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatus('recording');
  }

  async function stopRec() {
    await recorder.stop();
    const rUri = recorder.uri;
    if (!rUri) {
      setStatus('idle');
      setError('Kaydı alınamadı.');
      return;
    }
    if (!azure.configured) {
      setStatus('idle');
      setError('Azure ayarlı değil: sadece dinle-tekrarla modu.');
      return;
    }
    setStatus('assessing');
    try {
      setResult(await assessPronunciation(rUri, text));
    } catch (e: any) {
      setError(e?.message ?? 'Değerlendirme başarısız.');
    } finally {
      setStatus('idle');
    }
  }

  const showText = !hard || revealed;

  return (
    <View style={{ gap: space.lg }}>
      {showText ? (
        <Text style={styles.sentence}>{text}</Text>
      ) : (
        <View style={{ gap: space.sm }}>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <Text style={styles.hardNote}>Cümleyi hatırla ve yüksek sesle söyle.</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <PressableScale style={styles.listen} onPress={listen}>
          <Ionicons name="volume-high-outline" size={18} color={colors.accent} />
          <Text style={styles.listenText}>Dinle</Text>
        </PressableScale>
        {hard && !revealed ? (
          <PressableScale style={styles.listen} onPress={() => setRevealed(true)}>
            <Ionicons name="eye-outline" size={18} color={colors.muted} />
            <Text style={[styles.listenText, { color: colors.muted }]}>Cümleyi göster</Text>
          </PressableScale>
        ) : null}
      </View>

      <PressableScale
        style={[styles.recBtn, status === 'recording' && styles.recBtnActive]}
        haptic="medium"
        onPress={status === 'recording' ? stopRec : startRec}
        disabled={status === 'assessing'}>
        <Ionicons name={status === 'recording' ? 'stop' : 'mic'} size={22} color="#fff" />
        <Text style={styles.recText}>{status === 'recording' ? 'Durdur' : 'Kaydet'}</Text>
      </PressableScale>

      {status === 'assessing' && (
        <View style={styles.assessing}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Değerlendiriliyor...</Text>
        </View>
      )}

      {error && <Text style={styles.errText}>{error}</Text>}

      {result && (
        <Appear>
          <ResultView result={result} />
        </Appear>
      )}
    </View>
  );
}

function ResultView({ result }: { result: PronunciationResult }) {
  const didNotRead = result.matchPct < 60;
  return (
    <View style={{ gap: space.md }}>
      {didNotRead && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Söylediğin, hedef cümleyle yeterince eşleşmedi (%{result.matchPct}). Cümleye bakıp
            yüksek sesle tekrar dene.
          </Text>
        </View>
      )}
      <View style={styles.scoreRow}>
        <ScoreCell label="Genel" value={result.pron} />
        <ScoreCell label="Doğruluk" value={result.accuracy} />
        <ScoreCell label="Akıcılık" value={result.fluency} />
        <ScoreCell label="Eşleşme" value={result.matchPct} />
      </View>
      <View style={{ gap: space.sm }}>
        <Text style={styles.wordsLabel}>Kelime kelime</Text>
        <View style={styles.words}>
          {result.words.map((w: WordScore, i: number) => (
            <Text key={`${w.word}-${i}`} style={[styles.word, { color: scoreColor(w.accuracy) }]}>
              {w.word}
              {w.errorType !== 'None' ? ' *' : ''}
            </Text>
          ))}
        </View>
        {!!result.recognized && <Text style={styles.muted}>Duyulan: {result.recognized}</Text>}
      </View>
    </View>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.cellValue, { color: scoreColor(value) }]}>{value}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sentence: { fontSize: 22, fontWeight: '700', color: colors.ink, lineHeight: 30 },
  hint: { fontSize: 18, color: colors.ink, fontWeight: '600' },
  hardNote: { fontSize: 13, color: colors.muted },
  actionRow: { flexDirection: 'row', gap: space.xl },
  listen: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start' },
  listenText: { color: colors.accent, fontWeight: '700' },
  recBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.ink,
    paddingVertical: space.lg,
  },
  recBtnActive: { backgroundColor: colors.accent },
  recText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  assessing: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  muted: { color: colors.muted, fontSize: 13 },
  errText: { fontSize: 13, color: colors.danger },
  scoreRow: { flexDirection: 'row', borderWidth: 1, borderColor: colors.line },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    gap: 2,
  },
  cellValue: { fontSize: 22, fontWeight: '800' },
  cellLabel: { fontSize: 11, color: colors.muted },
  warn: { borderWidth: 1, borderColor: colors.danger, backgroundColor: '#FDECEA', padding: space.md },
  warnText: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  wordsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  word: { fontSize: 18, fontWeight: '600' },
});
