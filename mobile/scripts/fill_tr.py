# -*- coding: utf-8 -*-
# Bos text_tr alanlarini ANAHTARSIZ, ucretsiz makine cevirisiyle doldurur.
# LLM (build_corpus B katmani) icin ANTHROPIC_API_KEY gerekiyordu; anahtar
# yoksa bu script devreye girer: sadece cumle cevirisi (text_tr) yazar,
# gramer/kelime alanlarina dokunmaz (onlari spaCy/LLM doldurur).
#
# Kullanim:
#   python scripts/fill_tr.py               # sources.json'daki her ders
#   python scripts/fill_tr.py oxford_self   # tek ders
#   python scripts/fill_tr.py --unit 1      # bir unite
#
# Saglayici sirasi: once MyMemory (anahtarsiz), 429/hata olursa Google'a dus.
import json, os, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON_DIR = os.path.join(ROOT, "assets", "lessons")
SOURCES = os.path.join(ROOT, "scripts", "sources.json")

from deep_translator import MyMemoryTranslator, GoogleTranslator

_mm = MyMemoryTranslator(source="en-GB", target="tr-TR")
_gg = GoogleTranslator(source="en", target="tr")
_cache = {}


def translate(text):
    text = text.strip()
    if not text:
        return ""
    if text in _cache:
        return _cache[text]
    out = ""
    for attempt in range(3):
        try:
            out = _mm.translate(text)
            break
        except Exception:
            try:
                out = _gg.translate(text)
                break
            except Exception:
                time.sleep(2 * (attempt + 1))  # geri cekil, tekrar dene
    _cache[text] = out or ""
    time.sleep(0.25)  # nazik hiz: saniyede ~4 istek
    return _cache[text]


def fill(vid):
    path = os.path.join(LESSON_DIR, f"{vid}.json")
    if not os.path.exists(path):
        print(f"[{vid}] ders yok, atlaniyor.")
        return
    with open(path, encoding="utf-8") as f:
        lesson = json.load(f)
    todo = [s for s in lesson["sentences"] if not s.get("text_tr")]
    if not todo:
        print(f"[{vid}] tum ceviriler zaten dolu ({len(lesson['sentences'])} cumle).")
        return
    print(f"[{vid}] {len(todo)}/{len(lesson['sentences'])} bos cumle cevriliyor...")
    done = 0
    for s in todo:
        s["text_tr"] = translate(s["text_en"])
        done += 1
        if done % 25 == 0:
            print(f"  ... {done}/{len(todo)}")
            with open(path, "w", encoding="utf-8") as f:  # ara kayit
                json.dump(lesson, f, ensure_ascii=False, indent=2)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(lesson, f, ensure_ascii=False, indent=2)
    filled = sum(1 for s in lesson["sentences"] if s.get("text_tr"))
    print(f"[{vid}] bitti: {filled}/{len(lesson['sentences'])} cumle Turkce dolu.")


def main():
    with open(SOURCES, encoding="utf-8") as f:
        srcs = json.load(f)
    args = sys.argv[1:]
    if "--unit" in args:
        u = int(args[args.index("--unit") + 1])
        ids = [s["id"] for s in srcs if s.get("unit") == u]
    else:
        pos = [a for a in args if not a.startswith("--")]
        ids = pos if pos else [s["id"] for s in srcs]
    for vid in ids:
        fill(vid)


if __name__ == "__main__":
    main()
