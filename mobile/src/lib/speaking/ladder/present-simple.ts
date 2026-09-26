import { BREAKFAST } from './routines/breakfast';
import { COFFEE } from './routines/coffee';
import { GET_DRESSED } from './routines/get-dressed';
import { GO_TO_WORK } from './routines/go-to-work';
import { GYM } from './routines/gym';
import { INSTAGRAM } from './routines/instagram';
import { SHOWER } from './routines/shower';
import { WAKE_UP } from './routines/wake-up';
import { WALK } from './routines/walk';
import { WORK_FROM_HOME } from './routines/work-from-home';
import type { LadderTheme } from './types';

// Present Simple: sabah rutinleri (docs/SPEAKING_RULES.md Bolum 2). Sira = acilma sirasi.
export const PRESENT_SIMPLE_THEMES: LadderTheme[] = [
  WAKE_UP,
  BREAKFAST,
  COFFEE,
  SHOWER,
  INSTAGRAM,
  GET_DRESSED,
  WALK,
  GYM,
  WORK_FROM_HOME,
  GO_TO_WORK,
];
