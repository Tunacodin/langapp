// langapp marka ikonlarini uretir (SVG -> PNG). Calistir: node scripts/gen-icons.mjs
// Kimlik: Airbnb "Rausch" #FF385C zemin + beyaz glyph (play + altyazi cubuklari):
// videodan / altyazidan dil ogrenme. Duz, keskin, ayirt edici.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ACCENT = '#FF385C';
const IMG = fileURLToPath(new URL('../assets/images', import.meta.url));
mkdirSync(IMG, { recursive: true });

// Glyph: sag-yonlu play ucgeni + altinda iki altyazi cubugu. Renk parametreli.
function glyph(fill, faint) {
  return `
    <path d="M406 250 L742 470 L406 690 Z" fill="${fill}"/>
    <rect x="330" y="762" width="364" height="46" rx="0" fill="${fill}"/>
    <rect x="330" y="828" width="224" height="46" rx="0" fill="${fill}" opacity="${faint}"/>
  `;
}

// Tam kenar ikon: accent zemin + beyaz glyph (iOS koseleri kendi maskeler).
const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="${ACCENT}"/>
  ${glyph('#FFFFFF', '0.7')}
</svg>`;

// Splash / seffaf: beyaz zeminde gosterilecek accent glyph (seffaf arka plan).
const splashSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${glyph(ACCENT, '0.6')}
</svg>`;

async function png(svg, out, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`${IMG}/${out}`);
  console.log('yazildi:', out, size);
}

await png(iconSvg, 'icon.png', 1024);
await png(splashSvg, 'splash-icon.png', 1024);
await png(iconSvg, 'favicon.png', 196);
// Android adaptive foreground (iOS'ta kullanilmaz ama app.json referansi bozulmasin):
await png(splashSvg, 'android-icon-foreground.png', 1024);
console.log('bitti.');
