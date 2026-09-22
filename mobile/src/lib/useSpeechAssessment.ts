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
  // Son kaydin ham uri'si (gecici dosya). Ekran isterse kalici sakla (kayit
  // geri-dinleme icin); Azure ayarli olmasa BILE dolar.
  const [lastUri, setLastUri] = useState<string | null>(null);
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

  // Varsayilan mod = OYNATMA (allowsRecording:false). Kayit kategorisi (playAndRecord)
  // yalniz kayit aninda acilir; boylece video/TTS "Dinle" hoparlorden net calar ve
  // expo-video ile ses oturumu cakismaz. Izin bir kez istenir.
  useEffect(() => {
    (async () => {
      try {
        await requestRecordingPermissionsAsync();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch {}
    })();
  }, []);

  // Cumle degisince sonucu ve son kaydi sifirla.
  useEffect(() => {
    setResult(null);
    setError(null);
    setLastUri(null);
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
    try {
      // Kayit kategorisini KAYITTAN HEMEN ONCE ac (video oynaticiyla cakismayi onler).
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('recording');
    } catch (e: any) {
      // Ses oturumu acilamadi (or. OSStatus 561017449): oynatma moduna don, kullaniciya bildir.
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      setStatus('idle');
      setError('Mikrofon başlatılamadı. Videoyu durdurup tekrar dene.');
    }
  }, [recorder, player]);

  const stopRec = useCallback(async () => {
    await recorder.stop();
    // Kayit bitti: oynatma moduna don (Dinle/TTS net calsin, kategori serbest kalsin).
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    const uri = recorder.uri;
    if (!uri) {
      setStatus('idle');
      setError('Kayıt alınamadı.');
      return;
    }
    // Kaydi her durumda dista birak (kalici saklama/geri-dinleme icin).
    setLastUri(uri);
    if (!azure.configured) {
      setStatus('idle');
      setError('Azure ayarlı değil: kayıt alındı, puan yok.');
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
    setLastUri(null);
  }, [player]);

  // Ekrandan cikinca: TTS/video dur, kayit sururse durdur, durum sifirla.
  useFocusEffect(
    useCallback(() => {
      return () => {
        Speech.stop();
        try {
          player.pause();
        } catch {}
        if (statusRef.current === 'recording') {
          recorder.stop().catch(() => {});
          setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
        }
        setStatus('idle');
      };
    }, [recorder, player]),
  );

  // player + hasClip: ekran videoyu GORUNUR gostermek isterse (VideoView) kullanir.
  // Ayni player "Dinle" ile [start,end] klibini oynatir; ikinci bir oynatici gerekmez.
  // lastUri: son kaydin ham uri'si (ekran kalici saklamak isterse).
  return { status, result, error, listen, toggleRecord, reset, player, hasClip, lastUri };
}
