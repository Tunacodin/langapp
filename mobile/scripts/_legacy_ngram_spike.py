# -*- coding: utf-8 -*-
"""
Tek video icin calisma materyali cikarma HATTI (spike).
Adimlar: transkript cek -> cumleye yeniden bol (zaman damgasi korunur)
         -> kelime (vocab) + aday chunk (n-gram) cikar -> JSON yaz.

NOT: chunk/kelime cikarimi burada DETERMINISTIK (n-gram + frekans) yapiliyor;
gramer kaliplari ve deyimler icin kalite LLM ile gelir (ayri adim, API anahtari ister).
Bu spike LLM'siz calisir, mekanizmayi kanitlar.
"""
import json
import re
import sys
from collections import Counter

from youtube_transcript_api import YouTubeTranscriptApi

STOP = set(
    "the a an and or but if of to in on at for with from by as is are was were be been being "
    "this that these those it its i you he she we they me him her us them my your his our their "
    "do does did done have has had having will would can could shall should may might must not no "
    "so then than too very just also about into over under out up down off then there here what "
    "which who whom whose when where why how all any some more most other into".split()
)


def fetch_sentences(video_id):
    api = YouTubeTranscriptApi()
    # Manuel altyaziyi tercih et, yoksa otomatik.
    try:
        tlist = api.list(video_id)
        try:
            t = tlist.find_manually_created_transcript(["en"])
            generated = False
        except Exception:
            t = tlist.find_transcript(["en"])
            generated = getattr(t, "is_generated", True)
        raw = t.fetch().to_raw_data()
    except Exception:
        raw = api.fetch(video_id, languages=["en"]).to_raw_data()
        generated = True

    # Satirlari cumleye yeniden bol: noktalama sonuna gelince cumleyi kapat.
    sentences = []
    buf, s_start, s_end = "", None, None
    for line in raw:
        txt = line["text"].replace("\n", " ").strip()
        if not txt:
            continue
        if s_start is None:
            s_start = line["start"]
        s_end = line["start"] + line["duration"]
        buf = (buf + " " + txt).strip()
        if re.search(r"[.!?]$", txt):
            sentences.append({"start_ms": int(s_start * 1000), "end_ms": int(s_end * 1000), "text_en": buf})
            buf, s_start, s_end = "", None, None
    if buf:
        sentences.append({"start_ms": int((s_start or 0) * 1000), "end_ms": int((s_end or 0) * 1000), "text_en": buf})
    return sentences, generated


def tokenize(text):
    return re.findall(r"[a-zA-Z']+", text.lower())


def extract_vocab(sentences, top=25):
    c = Counter()
    for s in sentences:
        for w in tokenize(s["text_en"]):
            if len(w) > 2 and w not in STOP:
                c[w] += 1
    return c.most_common(top)


def extract_chunks(sentences, top=20):
    # 2-4 gram frekansi; icinde en az bir icerik kelimesi olanlari say.
    grams = Counter()
    for s in sentences:
        toks = tokenize(s["text_en"])
        for n in (2, 3, 4):
            for i in range(len(toks) - n + 1):
                g = toks[i : i + n]
                if all(w in STOP for w in g):
                    continue
                if len(g[0]) < 2 or len(g[-1]) < 2:
                    continue
                grams[" ".join(g)] += 1
    # En az 2 kez gecen ve tek kelime olmayanlari al.
    return [(g, n) for g, n in grams.most_common(200) if n >= 2][:top]


def main():
    vid = sys.argv[1] if len(sys.argv) > 1 else "arj7oStGLkU"
    sents, generated = fetch_sentences(vid)
    vocab = extract_vocab(sents)
    chunks = extract_chunks(sents)

    out = {
        "video_id": vid,
        "caption_generated": generated,
        "sentence_count": len(sents),
        "sentences": sents,
        "vocab_top": [{"word": w, "count": n} for w, n in vocab],
        "chunk_candidates": [{"chunk": g, "count": n} for g, n in chunks],
    }
    import os

    os.makedirs("scripts/out", exist_ok=True)
    path = f"scripts/out/{vid}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"video: {vid} | otomatik altyazi: {generated} | cumle: {len(sents)}")
    print("\n--- ilk 3 cumle (ms) ---")
    for s in sents[:3]:
        print(f"  [{s['start_ms']}-{s['end_ms']}] {s['text_en'][:70]}")
    print("\n--- top kelime ---")
    print("  " + ", ".join(f"{w}({n})" for w, n in vocab[:12]))
    print("\n--- aday chunk ---")
    for g, n in chunks[:12]:
        print(f"  {n}x  {g}")
    print(f"\nyazildi: {path}")


if __name__ == "__main__":
    main()
