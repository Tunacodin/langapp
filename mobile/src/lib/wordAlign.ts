// Konusulan metni beklenen cumleyle kelime kelime hizala (sarki + konusma pratigi
// ortak). Her beklenen kelime icin: ok (dogru soylendi) / wrong (atlandi, yanlis)
// / pending (henuz gelmedi). note = o kelime yerine duyulan (varsa).
// Kesme isareti silinir ("I've" -> "ive"); tanima motoru da kisaltmayi cogu zaman
// oldugu gibi yazar, boylece iki taraf ayni bicime iner.
export type WordStatus = 'ok' | 'wrong' | 'pending';

function tok(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

// Tanima motoru sayilari rakamla yazar ("7", "8:00"); cumlelerde yaziyla. Karsilastirmadan
// once rakamlari Ingilizce yaziya cevir (0-99) ve "8:00" -> "eight o'clock".
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function numWord(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  return String(n);
}
export function spellNumbers(text: string): string {
  return text
    .replace(/\b(\d{1,2}):00\b/g, (_, h) => `${numWord(Number(h))} o'clock`)
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => `${numWord(Number(h))} ${numWord(Number(m))}`)
    .replace(/\b\d{1,2}\b/g, (d) => numWord(Number(d)));
}

export function alignWords(expected: string[], heardText: string): { status: WordStatus[]; note: string[] } {
  const heard = spellNumbers(heardText).split(/\s+/).map(tok).filter(Boolean);
  const exp = expected.map(tok);
  const m = exp.length;
  const n = heard.length;
  const status: WordStatus[] = new Array(m).fill('pending');
  const note: string[] = new Array(m).fill('');
  if (n === 0) return { status, note };

  const matched = new Array(m).fill(false);
  let i = 0;
  let j = 0;
  let extra = '';
  while (i < m && j < n) {
    if (exp[i] === heard[j]) {
      matched[i] = true;
      i++;
      j++;
      extra = '';
    } else {
      // Ileriye bakip beklenen kelime yakinda geliyor mu (fazladan/yanlis soylendi).
      const ahead = heard.indexOf(exp[i], j);
      if (ahead >= 0 && ahead - j <= 2) {
        extra = heard[j];
        j++;
      } else {
        if (extra) note[i] = extra;
        extra = '';
        i++;
      }
    }
  }
  let last = -1;
  for (let k = 0; k < m; k++) if (matched[k]) last = k;
  for (let k = 0; k < m; k++) {
    if (matched[k]) status[k] = 'ok';
    else if (k <= last) status[k] = 'wrong';
  }
  return { status, note };
}
