# -*- coding: utf-8 -*-
# Toplu hat: sources.json'daki her video icin indir -> (mantiksal) bol -> desifre.
# "Bolme" fiziksel kesme degil; whisper cumle + kelime zaman damgasi uretir,
# uygulama start_ms/end_ms ile ayni dosyada atlar (800 klip yerine 1 dosya + zaman).
#
# Kullanim:
#   python scripts/ingest.py                 # sources.json'daki hepsini isle
#   python scripts/ingest.py foster_matchday # sadece bir id
#
# Urettikleri (her id icin):
#   assets/videos/<id>.mp4              (<=480p, hafif)
#   assets/lessons/<id>.words.json      (duz kelime listesi, mutlak zamanli)
#   assets/lessons/<id>.json            (cumle iskeleti; text_tr/chunks/grammar/vocab BOS)
# Sonraki adim: LLM cikarimi bu bos alanlari doldurur (ayri script).
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO_DIR = os.path.join(ROOT, "assets", "videos")
LESSON_DIR = os.path.join(ROOT, "assets", "lessons")
SOURCES = os.path.join(ROOT, "scripts", "sources.json")

os.makedirs(VIDEO_DIR, exist_ok=True)
os.makedirs(LESSON_DIR, exist_ok=True)


def ensure_h264(path):
    # yt-dlp'nin yedek formatlari AV1/VP9 getirebilir; iPhone'larin cogu bunlari
    # cozemez (ses var goruntu yok). H.264 degilse yerinde H.264'e cevir.
    codec = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=codec_name", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    if codec == "h264":
        return
    print(f"  [cevir] {codec} -> h264: {path}")
    tmp = path + ".h264.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-i", path,
        "-map", "0:v:0", "-map", "0:a:0",
        "-c:v", "libx264", "-preset", "medium", "-crf", "25",
        "-maxrate", "1000k", "-bufsize", "2000k",
        "-profile:v", "main", "-level", "3.1", "-pix_fmt", "yuv420p",
        "-c:a", "copy", "-movflags", "+faststart", tmp,
    ], check=True)
    os.replace(tmp, path)


def download(src):
    out = os.path.join(VIDEO_DIR, f"{src['id']}.mp4")
    if os.path.exists(out):
        print(f"  [atla] video zaten var: {out}")
        ensure_h264(out)
        return out
    # <=480p mp4: dil calismasi icin fazlasi gereksiz, disk/bant tasarrufu.
    # H.264 (avc1) ZORUNLU: AV1 codec'ini telefon oynaticilari cozemez (ses var
    # goruntu yok). Once avc1 dene, yoksa mp4'e dus; dusulen format ensure_h264
    # ile cevrilir.
    fmt = (
        "bv*[height<=480][vcodec^=avc1]+ba[ext=m4a]/"
        "b[height<=480][vcodec^=avc1]/"
        "bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480]/b"
    )
    cmd = [
        sys.executable, "-m", "yt_dlp",
        # YouTube artik JS imzali format istiyor; node calistiricisi 403'u onler.
        "--js-runtimes", "node",
        "-f", fmt, "--merge-output-format", "mp4",
        "-o", out, src["url"],
    ]
    print(f"  [indir] {src['url']}")
    subprocess.run(cmd, check=True)
    ensure_h264(out)
    return out


def transcribe(src, media_path):
    from faster_whisper import WhisperModel  # ilk cagride yuklensin

    global _MODEL
    try:
        _MODEL
    except NameError:
        _MODEL = WhisperModel("base.en", device="cpu", compute_type="int8")

    def run(vad):
        segs, _ = _MODEL.transcribe(
            media_path, language="en", vad_filter=vad, word_timestamps=True
        )
        return list(segs)

    # VAD bazi dosyalarda tum sesi yanlislikla kesiyor; 0 donerse VAD'siz tekrar dene.
    segments = run(True)
    if not segments:
        print("  [uyari] VAD 0 segment verdi, VAD'siz yeniden deneniyor")
        segments = run(False)

    sentences, flat_words = [], []
    for i, s in enumerate(segments):
        text = s.text.strip()
        if not text:
            continue
        sentences.append({
            "idx": i,
            "start_ms": int(s.start * 1000),
            "end_ms": int(s.end * 1000),
            "text_en": text,
            "text_tr": "",
            "cefr": src.get("cefr", ""),
            "chunks": [], "grammar": [], "vocab": [],
        })
        for w in (s.words or []):
            ww = w.word.strip()
            if ww:
                flat_words.append({
                    "w": ww,
                    "start_ms": int(w.start * 1000),
                    "end_ms": int(w.end * 1000),
                })

    lesson = {
        "video_id": src["id"],
        "title": src.get("title") or src.get("query") or src["id"],
        "topic": src.get("topic", ""),
        "license": src.get("license", ""),
        "cefr": src.get("cefr", ""),
        "sentences": sentences,
    }
    with open(os.path.join(LESSON_DIR, f"{src['id']}.json"), "w", encoding="utf-8") as f:
        json.dump(lesson, f, ensure_ascii=False, indent=2)
    with open(os.path.join(LESSON_DIR, f"{src['id']}.words.json"), "w", encoding="utf-8") as f:
        json.dump(flat_words, f, ensure_ascii=False, indent=2)
    return len(sentences), len(flat_words)


def enrich(src_id):
    # Transkript sonrasi: spaCy lemma/POS + gramer (A) + opsiyonel LLM (B).
    # build_corpus kendi icinde graceful; spaCy yoksa net mesajla cikar.
    try:
        import build_corpus
    except Exception as e:
        print(f"  [enrich atlandi] build_corpus yuklenemedi: {e}")
        return
    build_corpus.process(src_id, build_corpus.llm_client())


def main():
    with open(SOURCES, encoding="utf-8") as f:
        srcs = json.load(f)
    pos = [a for a in sys.argv[1:] if not a.startswith("--")]
    only = pos[0] if pos else None
    if only:
        srcs = [s for s in srcs if s["id"] == only]

    force = "--force" in sys.argv
    for src in srcs:
        if "REPLACE_ME" in src["url"]:
            print(f"[{src['id']}] URL bos (REPLACE_ME), atlaniyor.")
            continue
        lj = os.path.join(LESSON_DIR, f"{src['id']}.json")
        wj = os.path.join(LESSON_DIR, f"{src['id']}.words.json")
        if not force and os.path.exists(lj) and os.path.exists(wj):
            print(f"[{src['id']}] transkript zaten var, atlaniyor (--force ile yenile).")
            continue
        print(f"[{src['id']}] {src.get('title') or src.get('query') or src['id']}")
        try:
            path = download(src)
            nc, nw = transcribe(src, path)
            print(f"  [ok] cumle: {nc} | kelime: {nw}")
            enrich(src["id"])
        except subprocess.CalledProcessError as e:
            print(f"  [HATA] indirme basarisiz: {e}")
        except Exception as e:
            print(f"  [HATA] {e}")


if __name__ == "__main__":
    main()
