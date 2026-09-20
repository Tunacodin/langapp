#!/usr/bin/env bash
# Video kartlari icin onizleme (poster) uretir: her assets/videos/*.mp4 dosyasinin
# acilis karesinden kucuk bir JPG cikarir -> assets/posters/<id>.jpg.
# Kart bileseni bunu siyah placeholder yerine gosterir (src/lib/posters.ts).
# Yeni video ekledikten sonra bu scripti calistir, sonra posters.ts'e satir ekle.
#
# Kullanim:  bash scripts/make_posters.sh
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p assets/posters

for v in assets/videos/*.mp4; do
  id="$(basename "$v" .mp4)"
  out="assets/posters/$id.jpg"
  # 1.2s'ten kare al (acilis karartmasini atla), 480px genislige kucult.
  ffmpeg -y -loglevel error -ss 1.2 -i "$v" -frames:v 1 -vf "scale=480:-2" -q:v 4 "$out" </dev/null

  # Cok kucuk cikti = siyah/tekduze kare. Temsili kare secen filtreyle yenile.
  if [ "$(stat -c%s "$out" 2>/dev/null || stat -f%z "$out")" -lt 3000 ]; then
    ffmpeg -y -loglevel error -ss 5 -i "$v" -frames:v 1 -vf "thumbnail=n=200,scale=480:-2" -q:v 4 "$out" </dev/null
  fi
  echo "poster: $id"
done
