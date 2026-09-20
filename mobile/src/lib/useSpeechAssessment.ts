import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { useVideoPlayer, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';

import { azure } from '@/lib/azure';
import { assessPronunciation, PronunciationResult } from '@/lib/pronunciation';
import { WAV_16K_MONO } from '@/lib/recording';

export type RecStatus = 'idle' | 'recording' | 'assessing';

// Dinlerken kaynak: video cumlesiyse videonun kendi sesi (source + [start,end]),
// bizim ekledigimiz ek pratik cumleyse klip yok -> varsayilan TTS sesi kullanilir.
export type ListenClip = {
  source: VideoSource | null;
  start: number | null;
  end: number | null;
};

// Bir cumle icin kayit + Azure telaffuz degerlendirmesi. UI'dan bagimsiz:
// hem Shadowing studyosu hem baska ekranlar kullanabilir. Blur'da otomatik durur.
// clip verilirse "Dinle" videonun kendi sesini calar; yoksa TTS'e duser.
export function useSpeechAssessment(text: string, clip?: ListenClip) {
  const recorder = useAudioRecorder(WAV_16K_MONO);
  const [status, setStatus] = useState<RecStatus>('idle');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef<RecStatus>('idle');

  // Video sesi oynatici (gorunmez; sadece ses). Kaynak yoksa null -> hicbir sey yuklemez.
  const hasClip = !!(clip?.source && clip.start != null && clip.end != null);
  const player = useVideoPlayer(clip?.source ?? null, (p) => {
    p.timeUpdateEventInterval = 0.1;
    p.muted = false;
  });
  const previewEndRef = useRef<number | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Klip sonuna gelince durdur.
  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (previewEndRef.current != null && currentTime * 1000 >= previewEndRef.current) {
        player.pause();
        previewEndRef.current = null;
      }
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    (async () => {
      await requestRecordingPermissionsAsync();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
  }, []);

  // Cumle degisince sonucu sifirla.
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [text]);

  const listen = useCallback(
    (rate = 0.95) => {
      Speech.stop();
      // Video cumlesi: videonun kendi sesini [start,end] araliginda cal.
      if (hasClip) {
        try {
          player.playbackRate = rate; // Yavas Dinle icin video da yavaslar
          previewEndRef.current = clip!.end!;
          player.currentTime = clip!.start! / 1000;
          player.play();
          return;
        } catch {}
      }
      // Ek pratik cumlesi (klip yok): varsayilan TTS sesi.
      Speech.speak(text, { language: 'en-US', rate });
    },
    [hasClip, player, clip?.start, clip?.end, text],
  );

  const startRec = useCallback(async () => {
    Speech.stop();
    try {
      player.pause();
    } catch {}
    setError(null);
    setResult(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatus('recording');
  }, [recorder, player]);

  const stopRec = useCallback(async () => {
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) {
      setStatus('idle');
      setError('Kayıt alınamadı.');
      return;
    }
    if (!azure.configured) {
      setStatus('idle');
      setError('Azure ayarlı değil: sadece dinle-tekrarla modu.');
      return;
    }
    setStatus('assessing');
    try {
      setResult(await assessPronunciation(uri, text));
    } catch (e: any) {
      setError(e?.message ?? 'Değerlendirme başarısız.');
    } finally {
      setStatus('idle');
    }
  }, [recorder, text]);

  const toggleRecord = useCallback(() => {
    if (statusRef.current === 'recording') stopRec();
    else startRec();
  }, [startRec, stopRec]);

  const reset = useCallback(() => {
    Speech.stop();
    try {
      player.pause();
    } catch {}
    previewEndRef.current = null;
    setStatus('idle');
    setResult(null);
    setError(null);
  }, [player]);

  // Ekrandan cikinca: TTS/video dur, kayit sururse durdur, durum sifirla.
  useFocusEffect(
    useCallback(() => {
      return () => {
        Speech.stop();
        try {
          player.pause();
        } catch {}
        if (statusRef.current === 'recording') recorder.stop().catch(() => {});
        setStatus('idle');
      };
    }, [recorder, player]),
  );

  // player + hasClip: ekran videoyu GORUNUR gostermek isterse (VideoView) kullanir.
  // Ayni player "Dinle" ile [start,end] klibini oynatir; ikinci bir oynatici gerekmez.
  return { status, result, error, listen, toggleRecord, reset, player, hasClip };
}
