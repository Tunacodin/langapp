# -*- coding: utf-8 -*-
# Sarki MEDYA hatti: songs.json'daki her sarki icin SES (m4a) + KAPAK (jpg) indir.
# Sozler/zaman/Turkce ARTIK BURADA URETILMEZ: onu fetch_lyrics.py yapar (lrclib'ten
# senkron soz + dogru metin + ceviri). Whisper bu akistan cikarildi (sozu yanlis
# duyuyordu; lrclib hem metni hem satir zamanini dogru veriyor).
#
# Kullanim:
#   python scripts/ingest_songs.py                 # hepsi (ses + kapak)
#   python scripts/ingest_songs.py gotye_used_to   # tek sarki
#   python scripts/ingest_songs.py --thumbs        # yalniz kapak
#
# Uretilenler: assets/songs/<id>.m4a  ve  assets/posters/<id>.jpg
# Sonraki adim: python scripts/fetch_lyrics.py  -> assets/lessons/<id>.song.json
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONG_DIR = os.path.join(ROOT, "assets", "songs")
POSTER_DIR = os.path.join(ROOT, "assets", "posters")
SONGS = os.path.join(ROOT, "scripts", "songs.json")

os.makedirs(SONG_DIR, exist_ok=True)
os.makedirs(POSTER_DIR, exist_ok=True)


def download(src):
    out = os.path.join(SONG_DIR, f"{src['id']}.m4a")
    if os.path.exists(out):
        print(f"  [atla] ses zaten var: {out}")
        return out
    # Sadece ses (m4a): dil calismasi icin goruntu gereksiz, disk/bant tasarrufu.
    # ytsearch1: ilk sonucu al; --remote-components ejs: imza cozumu (403'u onler).
    query = f"ytsearch1:{src['query']}"
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--js-runtimes", "node", "--remote-components", "ejs:github",
        "-f", "bestaudio[ext=m4a]/bestaudio/best",
        "-x", "--audio-format", "m4a",
        "-o", os.path.join(SONG_DIR, f"{src['id']}.%(ext)s"),
        query,
    ]
    print(f"  [indir] {src['query']}")
    subprocess.run(cmd, check=True)
    return out


def fetch_thumb(src):
    # Klip gorseli = sarkinin kapak resmi (YouTube kucuk resmi). ffmpeg ile jpg'e
    # cevrilir, assets/posters/<id>.jpg olarak gomulur (getPoster ile ayni desen).
    out = os.path.join(POSTER_DIR, f"{src['id']}.jpg")
    if os.path.exists(out):
        print(f"  [atla] kapak zaten var: {out}")
        return out
    query = f"ytsearch1:{src['query']}"
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--js-runtimes", "node", "--remote-components", "ejs:github",
        "--skip-download", "--write-thumbnail", "--convert-thumbnails", "jpg",
        "-o", os.path.join(POSTER_DIR, f"{src['id']}.%(ext)s"),
        query,
    ]
    print(f"  [kapak] {src['query']}")
    subprocess.run(cmd, check=True)
    return out


def main():
    with open(SONGS, encoding="utf-8") as f:
        songs = json.load(f)
    thumbs_only = "--thumbs" in sys.argv
    pos = [a for a in sys.argv[1:] if not a.startswith("--")]
    if pos:
        songs = [s for s in songs if s["id"] in pos]
    for src in songs:
        print(f"[{src['id']}] {src['artist']} - {src['title']}")
        try:
            if not thumbs_only:
                download(src)
            fetch_thumb(src)
        except subprocess.CalledProcessError as e:
            print(f"  [HATA] indirme basarisiz: {e}")
        except Exception as e:
            print(f"  [HATA] {e}")
    print("\nSonraki: python scripts/fetch_lyrics.py  (sozler + zaman + Turkce)")


if __name__ == "__main__":
    main()
