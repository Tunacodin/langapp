// Konusma merdiveni registry'si. Bir "track" = bir gramer konusu (norm_pattern)
// ve o konunun temalari. Yeni konu = yeni icerik dosyasi + buraya bir satir.
import { PRESENT_SIMPLE_THEMES } from './present-simple';
import type { LadderTheme } from './types';

export * from './types';

export type LadderTrack = { id: string; title: string; subtitle: string; themes: LadderTheme[] };

export const LADDER_TRACKS: LadderTrack[] = [
  {
    id: 'present_simple',
    title: 'Present Simple ile konuş',
    subtitle: 'Her temada önce dinle, sonra Türkçesinden söyle, en sonunda cümleleri art arda anlat.',
    themes: PRESENT_SIMPLE_THEMES,
  },
];

export function getLadderTheme(id: string | null | undefined): LadderTheme | null {
  if (!id) return null;
  for (const t of LADDER_TRACKS) {
    const hit = t.themes.find((x) => x.id === id);
    if (hit) return hit;
  }
  return null;
}
