import { Asset } from 'expo-asset';
import type { VideoSource } from 'expo-video';

import { VIDEO_MODULES } from './lessonManifest';

// Video kaynagi cozumu (uzak URL / gomulu asset). Player, item ve shadowing
// ekranlari AYNI mantigi paylasir; tek kaynak burasidir.
// VIDEO_MODULES (gomulu videolar) manifest'ten gelir; yeni video eklemek =
// python scripts/gen_lesson_manifest.py.
const BASE = process.env.EXPO_PUBLIC_VIDEO_BASE_URL?.replace(/\/$/, '') || null;

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
