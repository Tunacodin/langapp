# -*- coding: utf-8 -*-
# Zenginlestirilmis lesson JSON'larindan capraz-video grafini kurar.
# Dugumler: chunk (norm_key) ve kelime (lemma). Kenar: ayni anahtarin
# gectigi (video, zaman, cumle) kayitlari. Obsidian benzeri capraz baglanti.
#
# Kullanim:
#   python scripts/graph.py                 # ozet + capraz/tekrar eden anahtarlar
#   python scripts/graph.py "reach out"     # bir anahtarin tum gecisleri (oynatici verisi)
import json
import os
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON_DIR = os.path.join(ROOT, "assets", "lessons")


def load_enriched():
    lessons = []
    for s in json.load(open(os.path.join(ROOT, "scripts", "sources.json"), encoding="utf-8")):
        p = os.path.join(LESSON_DIR, f"{s['id']}.json")
        if not os.path.exists(p):
            continue
        d = json.load(open(p, encoding="utf-8"))
        if any(x.get("text_tr") for x in d.get("sentences", [])):
            lessons.append(d)
    return lessons


def build_index(lessons):
    # anahtar -> [ {vid, topic, idx, start_ms, end_ms, text, surface, tr} ]
    chunks = defaultdict(list)
    lemmas = defaultdict(list)
    for d in lessons:
        vid, topic = d["video_id"], d.get("topic", "")
        for s in d["sentences"]:
            base = {"vid": vid, "topic": topic, "idx": s["idx"],
                    "start_ms": s["start_ms"], "end_ms": s["end_ms"], "text": s["text_en"]}
            for c in s.get("chunks", []):
                k = (c.get("norm_key") or c["text_en"]).lower().strip()
                chunks[k].append({**base, "surface": c["text_en"], "tr": c.get("text_tr", "")})
            for v in s.get("vocab", []):
                k = (v.get("lemma") or v["word"]).lower().strip()
                lemmas[k].append({**base, "surface": v["word"], "tr": v.get("text_tr", "")})
    return chunks, lemmas


def summary(lessons, chunks, lemmas):
    print(f"Zenginlestirilmis video: {len(lessons)}  ({', '.join(d['video_id'] for d in lessons)})")
    print(f"Chunk dugumu (essiz norm_key): {len(chunks)}  |  Kelime dugumu (essiz lemma): {len(lemmas)}")
    print()

    def cross(index, isim):
        # Birden fazla FARKLI videoda gecen anahtarlar = capraz-video koprusu.
        rows = []
        for k, occ in index.items():
            vids = sorted(set(o["vid"] for o in occ))
            if len(vids) > 1:
                rows.append((len(vids), len(occ), k, vids))
        rows.sort(reverse=True)
        print(f"== Capraz-video {isim} koprusu: {len(rows)} anahtar birden fazla videoda ==")
        for nv, no, k, vids in rows[:15]:
            print(f"  '{k}'  -> {nv} video ({', '.join(vids)}), toplam {no} gecis")
        print()

    def repeated(index, isim):
        rows = [(len(o), k, o) for k, o in index.items() if len(o) > 1]
        rows.sort(reverse=True)
        print(f"== En cok tekrar eden {isim} (video ici + arasi): ==")
        for n, k, occ in rows[:10]:
            vids = ", ".join(sorted(set(o["vid"] for o in occ)))
            print(f"  '{k}'  x{n}  ({vids})")
        print()

    cross(chunks, "chunk")
    cross(lemmas, "kelime")
    repeated(chunks, "chunk")


def query(index_chunks, index_lemmas, key):
    k = key.lower().strip()
    occ = index_chunks.get(k) or index_lemmas.get(k)
    if not occ:
        print(f"'{key}' icin kayit yok. (Ipucu: norm_key ya da lemma yaz, or. 'reach out', 'subscribe')")
        return
    print(f"'{key}' -> {len(occ)} gecis, {len(set(o['vid'] for o in occ))} video:\n")
    for o in sorted(occ, key=lambda x: (x["vid"], x["start_ms"])):
        t = o["start_ms"] / 1000
        mm, ss = int(t // 60), int(t % 60)
        ctx = o["text"] if len(o["text"]) <= 90 else o["text"][:87] + "..."
        print(f"  [{o['vid']:16} {mm:02d}:{ss:02d}] ({o['topic']}) \"{o['surface']}\"  {o.get('tr','')}")
        print(f"       cumle: {ctx}")


def main():
    lessons = load_enriched()
    if not lessons:
        print("Zenginlestirilmis video yok.")
        return
    chunks, lemmas = build_index(lessons)
    if len(sys.argv) > 1:
        query(chunks, lemmas, " ".join(sys.argv[1:]))
    else:
        summary(lessons, chunks, lemmas)


if __name__ == "__main__":
    main()
