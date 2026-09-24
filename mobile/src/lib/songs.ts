import { Asset } from 'expo-asset';

// Sarki verisi + video kaynagi cozumu. TAM sarki oynar (kesme yok); lyrics_data
// tum sozler zaman damgaliyla saklanir, uygulama calarken aktif satiri/kelimeyi
// takip eder. norm_pattern aktif odaga baglar. CDN yok, gomulu asset.

export type SongLyricLine = {
  time_start_ms: number;
  end_ms: number;
  text: string;
  text_tr: string;
  is_target: boolean;
};

export type SongClip = {
  clip_id: string;
  song_title: string;
  artist: string;
  media_file: string; // "songs/<id>.m4a"
  focus_tag: string;
  norm_pattern: string;
  cefr: string;
  exercise: 'cloze';
  duration_ms: number;
  target_line: string; // gercek sung satir (lrclib)
  target_line_tr: string;
  cloze_answer: string;
  hint_tr: string;
  target_index: number; // lyrics_data icindeki hedef satir
  line_start_ms: number;
  line_end_ms: number;
  match_confidence: number;
  lyrics_data: SongLyricLine[]; // TUM sarki, zaman damgali (aktif takip)
  source: string;
  lrclib_id?: number;
};

// Gomulu klip verisi (ingest_songs.py uretir). Yeni sarki eklenince buraya bir
// satir eklenir: clip JSON + ses modulu.
const SONGS: SongClip[] = [
  require('../../assets/lessons/gotye_used_to.song.json'),
  require('../../assets/lessons/adele_someone.song.json'),
  require('../../assets/lessons/queen_champions.song.json'),
  require('../../assets/lessons/bruno_yourman.song.json'),
  require('../../assets/lessons/beyonce_ifiwere.song.json'),
  require('../../assets/lessons/greenday_september.song.json'),
];

const VIDEO_MODULES: Record<string, number> = {
  gotye_used_to: require('../../assets/songs/gotye_used_to.mp4'),
  adele_someone: require('../../assets/songs/adele_someone.mp4'),
  queen_champions: require('../../assets/songs/queen_champions.mp4'),
  bruno_yourman: require('../../assets/songs/bruno_yourman.mp4'),
  beyonce_ifiwere: require('../../assets/songs/beyonce_ifiwere.mp4'),
  greenday_september: require('../../assets/songs/greenday_september.mp4'),
};

export function getSongs(): SongClip[] {
  return SONGS;
}

export function getSong(id?: string | null): SongClip | null {
  if (!id) return null;
  return SONGS.find((s) => s.clip_id === id) ?? null;
}

// Aktif odaga (norm_pattern) uyan sarkilari getir; yoksa hepsini don.
export function getSongsForFocus(normPattern?: string | null): SongClip[] {
  if (!normPattern) return SONGS;
  const hit = SONGS.filter((s) => s.norm_pattern === normPattern);
  return hit.length ? hit : SONGS;
}

export async function resolveSongVideo(id: string): Promise<string | null> {
  const mod = VIDEO_MODULES[id];
  if (mod == null) return null;
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}
