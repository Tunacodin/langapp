# -*- coding: utf-8 -*-
# Whisper ~5sn'lik parcalari gramer cumlesinin ortasindan boluyor.
# Bu script <id>.words.json'daki kelime zamanlarindan cumleleri noktalamaya
# gore YENIDEN kurar (dogru start/end ile) ve <id>.json'daki 'sentences'i tazeler.
# chunks/grammar/vocab/text_tr bos birakilir (Faz 2 cikarimi doldurur).
#
# Kullanim:
#   python scripts/segment.py            # tum lesson'lar
#   python scripts/segment.py fireship_ai
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON_DIR = os.path.join(ROOT, "assets", "lessons")

# Nokta iceren ama cumle bitirmeyen kisaltmalar (yanlis bolmeyi onler).
ABBREV = {
    "mr.", "mrs.", "ms.", "dr.", "st.", "vs.", "etc.", "inc.", "ltd.",
    "jr.", "sr.", "no.", "u.s.", "u.k.", "a.m.", "p.m.", "e.g.", "i.e.",
}


def is_sentence_end(word):
    if not word or word[-1] not in ".?!":
        return False
    low = word.lower()
    if low in ABBREV:
        return False
    # Tek harf + nokta (bas harf kisaltmasi: "A." "B.") -> bolme.
    core = word.rstrip(".?!")
    if len(core) == 1 and core.isalpha():
        return False
    return True


# Bazi videolarda whisper noktalama koymuyor -> dev cumle. Duraklama (kelimeler
# arasi bosluk) ve azami sure ile de bol ki satirlar dogal/kisa kalsin.
PAUSE_MS = 650   # bu kadar sessizlik = cumle/oge siniri
MAX_MS = 11000   # bir satir en fazla bu kadar (noktalama/duraklama yoksa zorla bol)


def build_sentences(words, cefr):
    sentences = []
    cur = []
    for i, w in enumerate(words):
        cur.append(w)
        end_punct = is_sentence_end(w["w"])
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt["start_ms"] - w["end_ms"]) if nxt else 0
        dur = w["end_ms"] - cur[0]["start_ms"]
        # Bol: cumle sonu isareti VEYA uzun duraklama VEYA azami sure asildi.
        if end_punct or (nxt and gap >= PAUSE_MS) or dur >= MAX_MS:
            sentences.append(cur)
            cur = []
    if cur:
        sentences.append(cur)

    out = []
    for i, grp in enumerate(sentences):
        text = " ".join(x["w"] for x in grp)
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            continue
        out.append({
            "idx": len(out),
            "start_ms": grp[0]["start_ms"],
            "end_ms": grp[-1]["end_ms"],
            "text_en": text,
            "text_tr": "",
            "cefr": cefr,
            "chunks": [], "grammar": [], "vocab": [],
        })
    return out


def process(lesson_id):
    lp = os.path.join(LESSON_DIR, f"{lesson_id}.json")
    wp = os.path.join(LESSON_DIR, f"{lesson_id}.words.json")
    if not (os.path.exists(lp) and os.path.exists(wp)):
        print(f"[{lesson_id}] dosya eksik, atlaniyor")
        return
    lesson = json.load(open(lp, encoding="utf-8"))
    words = json.load(open(wp, encoding="utf-8"))
    if not words:
        print(f"[{lesson_id}] kelime yok, atlaniyor")
        return
    # Zaten zenginlestirilmis (text_tr dolu) dosyalari koru, yeniden bolme.
    if any(s.get("text_tr") for s in lesson.get("sentences", [])):
        print(f"[{lesson_id}] zenginlestirilmis, korunuyor (atla)")
        return
    before = len(lesson.get("sentences", []))
    lesson["sentences"] = build_sentences(words, lesson.get("cefr", ""))
    json.dump(lesson, open(lp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[{lesson_id}] {before} -> {len(lesson['sentences'])} cumle")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if only:
        process(only)
        return
    ids = [s["id"] for s in json.load(open(os.path.join(ROOT, "scripts", "sources.json"), encoding="utf-8"))]
    for i in ids:
        process(i)


if __name__ == "__main__":
    main()
