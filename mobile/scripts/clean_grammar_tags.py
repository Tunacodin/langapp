# -*- coding: utf-8 -*-
# Otomatik gramer etiketlerindeki bilinen yanlis pozitifleri temizler (deterministik).
# future_going_to: "for/start/and ... going to sleep" gibi ISIM-FIIL (gerund) kullanimi
#   gelecek zaman degildir; kalip "going" ile basliyor VE onceki kelime bir baglam
#   edati/fiilse etiket silinir.
# used_to: "be/get used to" (alismak) ve "is used to + fiil" (edilgen: -mak icin
#   kullanilir) gecmis aliskanlik degildir; onceki kelime be/get bicimiyse silinir.
#   python scripts/clean_grammar_tags.py
import glob, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GERUND_PREV = {"for", "start", "started", "and", "of", "about", "before", "after", "from",
               "by", "without", "like", "love", "hate", "stop", "keep", "when", "while", "avoid"}
BE_GET = {"am", "is", "are", "was", "were", "be", "been", "being", "get", "gets", "got",
          "getting", "'s", "'re", "'m", "s", "re", "m", "resources"}


def prev_word(text, start):
    w = re.findall(r"[A-Za-z']+", text[: start or 0])
    return w[-1].lower() if w else ""


removed = 0
for p in glob.glob(os.path.join(ROOT, "assets", "lessons", "*.json")):
    b = os.path.basename(p)
    if b.startswith("_") or b.count(".") > 1:
        continue
    L = json.load(open(p, encoding="utf-8"))
    changed = False
    for s in L.get("sentences", []):
        keep = []
        for g in s.get("grammar") or []:
            np, pat = g.get("norm_pattern"), (g.get("pattern") or "").lower()
            pw = prev_word(s.get("text_en", ""), g.get("span_start"))
            bad = (np == "future_going_to" and pat.startswith("going") and pw in GERUND_PREV) or (
                np == "used_to" and pat.startswith("used") and pw in BE_GET
            )
            if bad:
                removed += 1
                changed = True
                print(f"  - {b} [{np}] {s['text_en'][:70]}")
            else:
                keep.append(g)
        if s.get("grammar") is not None:
            s["grammar"] = keep
    if changed:
        json.dump(L, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("silinen etiket:", removed)
