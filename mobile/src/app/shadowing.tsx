import { Ionicons } from '@expo/vector-icons';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useVideoPlayer } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Badge, Card, H1, Lead, SectionLabel } from '@/components/ui';
import { azure } from '@/lib/azure';
import { getMedia, getSentences } from '@/lib/db';
import { assessPronunciation, PronunciationResult, WordScore } from '@/lib/pronunciation';
import { WAV_16K_MONO } from '@/lib/recording';
import { colors, space } from '@/constants/appTheme';

// Video ekranindan "Seslendir" ile gelen cumle; yoksa dersin ilk cumlesi.
const FALLBACK = 'Let me know if you need any help.';

type Status = 'idle' | 'recording' | 'assessing';

function scoreColor(v: number) {
  if (v >= 80) return colors.success;
  if (v >= 60) return colors.warning;
  return colors.danger;
}

export default function ShadowingScreen() {
  const params = useLocalSearchParams<{ text?: string; uri?: string; start?: string; end?: string }>();
  const recorder = useAudioRecorder(WAV_16K_MONO);
  const [sentence, setSentence] = useState<string>(FALLBACK);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Videonun kendi sesini calmak icin (varsa) gizli oynatici.
  const hasClip = !!(params.uri && params.start && params.end);
  const player = useVideoPlayer(hasClip ? params.uri! : null, (p) => {
    p.timeUpdateEventInterval = 0.1;
    p.muted = false;
  });
  const previewEndRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      await requestRecordingPermissionsAsync();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
  }, []);

  // Segment sonunda durdur (videonun kendi sesini cumle araliginda calarken).
  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (previewEndRef.current != null && currentTime * 1000 >= previewEndRef.current) {
        player.pause();
        previewEndRef.current = null;
      }
    });
    return () => sub.remove();
  }, [player]);

  // Cumleyi belirle: once route param (videodan), yoksa dersin ilk cumlesi.
  useEffect(() => {
    if (typeof params.text === 'string' && params.text) {
      setSentence(params.text);
      setResult(null);
      return;
    }
    const m = getMedia()[0];
    if (m) {
      const first = getSentences(m.id)[0];
      if (first) setSentence(first.text_en);
    }
  }, [params.text]);

  function listen() {
    // Videonun kendi sesi varsa onu cal; yoksa TTS'e dus.
    if (hasClip) {
      const s = Number(params.start);
      const e = Number(params.end);
      previewEndRef.current = e;
      player.currentTime = s / 1000;
      player.play();
      return;
    }
    Speech.stop();
    Speech.speak(sentence, { language: 'en-US', rate: 0.95 });
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
    const uri = recorder.uri;
    if (!uri) {
      setStatus('idle');
      setError('Kayit alinamadi.');
      return;
    }
    if (!azure.configured) {
      setStatus('idle');
      setError('Azure ayarli degil: sadece dinle-tekrarla modu.');
      return;
    }
    setStatus('assessing');
    try {
      const r = await assessPronunciation(uri, sentence);
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? 'Degerlendirme basarisiz.');
    } finally {
      setStatus('idle');
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <SectionLabel>Uretim</SectionLabel>
        <H1>Shadowing</H1>
        <Lead>Cumleyi dinle, yuksek sesle tekrar et, telaffuz puanini gor.</Lead>
      </View>

      <Card>
        <Text style={styles.sentence}>{sentence}</Text>
        <Pressable style={styles.listen} onPress={listen}>
          <Ionicons name="volume-high-outline" size={18} color={colors.accent} />
          <Text style={styles.listenText}>Dinle</Text>
        </Pressable>
      </Card>

      <Pressable
        style={[styles.recBtn, status === 'recording' && styles.recBtnActive]}
        onPress={status === 'recording' ? stopRec : startRec}
        disabled={status === 'assessing'}>
        <Ionicons
          name={status === 'recording' ? 'stop' : 'mic'}
          size={22}
          color="#fff"
        />
        <Text style={styles.recText}>
          {status === 'recording' ? 'Durdur' : 'Kaydet'}
        </Text>
      </Pressable>

      {status === 'assessing' && (
        <View style={styles.assessing}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Degerlendiriliyor...</Text>
        </View>
      )}

      {error && (
        <Card>
          <Badge>Not</Badge>
          <Lead>{error}</Lead>
        </Card>
      )}

      {result && <ResultView result={result} />}
    </Screen>
  );
}

function ResultView({ result }: { result: PronunciationResult }) {
  // Eslesme dusukse kullanici hedef cumleyi soylememis demektir.
  const didNotRead = result.matchPct < 60;
  return (
    <View style={{ gap: space.md }}>
      {didNotRead && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Söylediğin, hedef cümleyle yeterince eşleşmedi (%{result.matchPct}). Cümleye
            bakıp yüksek sesle tekrar dene.
          </Text>
        </View>
      )}

      <View style={styles.scoreRow}>
        <ScoreCell label="Genel" value={result.pron} />
        <ScoreCell label="Dogruluk" value={result.accuracy} />
        <ScoreCell label="Akicilik" value={result.fluency} />
        <ScoreCell label="Eşleşme" value={result.matchPct} />
      </View>

      <Card>
        <SectionLabel>Kelime kelime</SectionLabel>
        <View style={styles.words}>
          {result.words.map((w: WordScore, i: number) => (
            <Text key={`${w.word}-${i}`} style={[styles.word, { color: scoreColor(w.accuracy) }]}>
              {w.word}
              {w.errorType !== 'None' ? ' *' : ''}
            </Text>
          ))}
        </View>
        {!!result.recognized && (
          <Text style={styles.muted}>Duyulan: {result.recognized}</Text>
        )}
      </Card>

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
  sentence: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 28,
  },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
  },
  listenText: {
    color: colors.accent,
    fontWeight: '700',
  },
  recBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.ink,
    paddingVertical: space.lg,
  },
  recBtnActive: {
    backgroundColor: colors.accent,
  },
  recText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  assessing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
  scoreRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.line,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    gap: 2,
  },
  cellValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  cellLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  warn: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: '#FDECEA',
    padding: space.md,
  },
  warnText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  words: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  word: {
    fontSize: 18,
    fontWeight: '600',
  },
});
