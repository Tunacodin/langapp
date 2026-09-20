# -*- coding: utf-8 -*-
"""Ders JSON'larindaki gramer tespitlerini YENI taksonomiye (topics.json)
gore yeniden etiketler. Yalniz Layer-A (spaCy/regex, deterministik) tespit yapar;
LLM (Layer-B) burada calismaz. Kurate edilmis (norm_pattern'siz) gramer notlarina
dokunmaz. Idempotent: onceki pipeline tespitlerini (norm_pattern'li) atar, yeniden uretir.

Kullanim:  python scripts/retag_grammar.py
"""
import glob
import json
import os

import spacy

from grammar_topics import label_of, cefr_of
from grammar_detect import detect_grammar_a as detect

HERE = os.path.dirname(os.path.abspath(__file__))
LESSONS = os.path.join(HERE, "..", "assets", "lessons")


def main():
    nlp = spacy.load("en_core_web_sm")
    files = sorted(glob.glob(os.path.join(LESSONS, "*.json")))
    files = [f for f in files
             if not os.path.basename(f).startswith("_")
             and ".words" not in f and ".glossary" not in f]

    totals = {}
    for path in files:
        with open(path, encoding="utf-8") as f:
            lesson = json.load(f)
        n = 0
        for s in lesson.get("sentences", []):
            text = s.get("text_en") or ""
            # Kurate (norm_pattern'siz) notlari koru; pipeline tespitlerini at.
            grammar = [g for g in (s.get("grammar") or []) if not g.get("norm_pattern")]
            doc = nlp(text)
            for norm, a, b in detect(doc):
                grammar.append({
                    "pattern": text[a:b], "note_tr": label_of(norm),
                    "cefr": cefr_of(norm), "norm_pattern": norm,
                    "span_start": a, "span_end": b,
                })
                totals[norm] = totals.get(norm, 0) + 1
                n += 1
            s["grammar"] = grammar
        with open(path, "w", encoding="utf-8") as f:
            json.dump(lesson, f, ensure_ascii=False, indent=2)
        print(f"  {os.path.basename(path):32s} -> {n} tespit")

    print("\n=== TOPLAM (norm_pattern basina) ===")
    for norm in sorted(totals, key=lambda k: -totals[k]):
        print(f"  {totals[norm]:4d}  {norm}")
    print(f"  toplam = {sum(totals.values())}")


if __name__ == "__main__":
    main()
