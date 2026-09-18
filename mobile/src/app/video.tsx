import { Asset } from 'expo-asset';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle, StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/screen';
import { StudyPlayer } from '@/components/study-player';
import { colors } from '@/constants/appTheme';
import { getMedia, getSentences, MediaRow, SentenceRow } from '@/lib/db';

// Ders id -> uygulamaya gomulu video dosyasi. Whisper transkripti bu dosyadan uretildi.
const VIDEO_MODULES: Record<string, number> = {
  lesson1: require('../../assets/videos/lesson1.mp4'),
};

export default function VideoScreen() {
  const [media, setMedia] = useState<MediaRow | null>(null);
  const [sentences, setSentences] = useState<SentenceRow[]>([]);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [videoErr, setVideoErr] = useState<string | null>(null);

  useEffect(() => {
    const m = getMedia()[0] ?? null;
    setMedia(m);
    if (m) setSentences(getSentences(m.id));
  }, []);

  // Gomulu videoyu bir kez cihaza indirip yerel file:// yolunu al (offline, range sorunsuz).
  useEffect(() => {
    if (!media) return;
    const mod = VIDEO_MODULES[media.youtube_id];
    if (mod == null) return;
    (async () => {
      try {
        const asset = Asset.fromModule(mod);
        await asset.downloadAsync();
        setLocalUri(asset.localUri ?? asset.uri);
      } catch (e: any) {
        setVideoErr(e?.message ?? 'Video hazırlanamadı');
      }
    })();
  }, [media]);

  // Bu ekranda statüs çubuğu açık renk (koyu video üstünde); odaktan çıkınca koyuya döner.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <Screen bleedTop>
      <StatusBar style="light" />
      {localUri && media ? (
        <StudyPlayer uri={localUri} sentences={sentences} mediaId={media.id} />
      ) : (
        <Text style={styles.muted}>
          {videoErr ? `Video hatası: ${videoErr}` : 'Video hazırlanıyor...'}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontSize: 14, color: colors.muted },
});
