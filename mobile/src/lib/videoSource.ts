import { Asset } from 'expo-asset';
import type { VideoSource } from 'expo-video';

// Video kaynagi cozumu (uzak URL / gomulu asset). Player, item ve shadowing
// ekranlari AYNI mantigi paylasir; tek kaynak burasidir.
const BASE = process.env.EXPO_PUBLIC_VIDEO_BASE_URL?.replace(/\/$/, '') || null;

const VIDEO_MODULES: Record<string, number> = {
  lesson1: require('../../assets/videos/lesson1.mp4'),
  fireship_ai: require('../../assets/videos/fireship_ai.mp4'),
  mckinnon_day: require('../../assets/videos/mckinnon_day.mp4'),
  tifo_clubs_money: require('../../assets/videos/tifo_clubs_money.mp4'),
};

export async function resolveVideoSource(
  youtubeId: string,
  videoUrl: string | null,
): Promise<VideoSource | null> {
  const url = videoUrl || (BASE ? `${BASE}/${youtubeId}.mp4` : null);
  if (url) return { uri: url, useCaching: true };
  const mod = VIDEO_MODULES[youtubeId];
  if (mod == null) return null;
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}
