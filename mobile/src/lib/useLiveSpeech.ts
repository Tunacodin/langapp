import { useFocusEffect } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';

import { alignWords, type WordStatus } from './wordAlign';

// Cihaz ici canli konusma tanima (tek motor). start() dinlemeyi acar, transcript
// konustukca dolar; stop() kapatir ve (persist acildiysa) kaydin WAV yolunu doner.
// Ekrandan cikinca otomatik iptal. Konusma merdiveni ekranlari ortak kullanir.
export function useLiveSpeech() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(false);
  const audioUri = useRef<string | null>(null);
  const audioWait = useRef<((u: string | null) => void) | null>(null);

  useSpeechRecognitionEvent('result', (e) => {
    if (activeRef.current) setTranscript(e.results?.[0]?.transcript ?? '');
  });
  useSpeechRecognitionEvent('end', () => {
    activeRef.current = false;
    setListening(false);
  });
  useSpeechRecognitionEvent('audioend', (e) => {
    audioUri.current = e.uri ?? null;
    audioWait.current?.(audioUri.current);
    audioWait.current = null;
  });
  useSpeechRecognitionEvent('error', (e) => {
    activeRef.current = false;
    setListening(false);
    if (e.error !== 'no-speech' && e.error !== 'aborted') setError('Ses tanınamadı, tekrar dene.');
  });

  useFocusEffect(
    useCallback(() => {
      return () => {
        activeRef.current = false;
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {}
      };
    }, []),
  );

  const start = useCallback(async (opts?: { persist?: boolean }) => {
    setError(null);
    setTranscript('');
    audioUri.current = null;
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Mikrofon ve konuşma tanıma izni gerekiyor.');
        return false;
      }
    } catch {}
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
        recordingOptions: opts?.persist ? { persist: true } : undefined,
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          mode: 'measurement',
        },
      });
      activeRef.current = true;
      setListening(true);
      return true;
    } catch {
      setError('Kayıt başlatılamadı.');
      return false;
    }
  }, []);

  // Dinlemeyi kapat; persist acildiysa kaydin gecici WAV yolunu don (yoksa null).
  const stop = useCallback((): Promise<string | null> => {
    activeRef.current = false;
    const ready = new Promise<string | null>((res) => {
      if (audioUri.current) return res(audioUri.current);
      audioWait.current = res;
      setTimeout(() => res(audioUri.current), 3000);
    });
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
    setListening(false);
    return ready;
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return { listening, transcript, error, start, stop, reset };
}

// Soylenen metni bir cumlenin kabul edilen bicimleriyle (asil + alternatifler)
// karsilastir; en iyi eslesen bicimi ve oranini (0-100) don.

export function bestMatch(candidates: string[], heard: string) {
  let best = { text: candidates[0], words: candidates[0].split(/\s+/), status: [] as WordStatus[], pct: 0 };
  for (const c of candidates) {
    const words = c.split(/\s+/);
    const { status } = alignWords(words, heard);
    const ok = status.filter((s) => s === 'ok').length;
    const pct = words.length ? Math.round((ok / words.length) * 100) : 0;
    if (pct > best.pct || best.status.length === 0) best = { text: c, words, status, pct };
  }
  return best;
}
