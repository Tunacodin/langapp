// Konusma pratigi icerik registry'si. Ekranlar bu getter'lari kullanir.
import { SPEAKING_FOCUS } from './focusPacks';
import type { SpeakingFocus } from './types';

export * from './types';
export { SPEAKING_FOCUS };

export function getSpeakingFocus(id: string | null | undefined): SpeakingFocus | null {
  if (!id) return null;
  return SPEAKING_FOCUS.find((f) => f.id === id) ?? null;
}
