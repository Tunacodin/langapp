# -*- coding: utf-8 -*-
# Elle yazilan cumle-ici 'vocab' alanindan <id>.glossary.json uretir.
# build_corpus.py bu glossary'den lemma/surface -> Turkce anlam(lar) ceker.
# text_tr icindeki ';' ve ',' ayri anlamlara bolunur (1,2,3. anlam).
#
# Kullanim: python scripts/vocab_to_glossary.py fireship_ai mckinnon_day
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON_DIR = os.path.join(ROOT, "assets", "lessons")


def clean(s):
    return re.sub(r"[^a-z']", "", s.lower())


def split_senses(tr):
    parts = re.split(r"[;,]", tr)
    return [p.strip() for p in parts if p.strip()]


def process(lesson_id):
    lp = os.path.join(LESSON_DIR, f"{lesson_id}.json")
    if not os.path.exists(lp):
        print(f"[{lesson_id}] yok, atla")
        return
    lesson = json.load(open(lp, encoding="utf-8"))
    gloss = {}
    for s in lesson["sentences"]:
        for v in s.get("vocab", []) or []:
            for key in {clean(v.get("lemma", "")), clean(v.get("word", ""))}:
                if not key:
                    continue
                entry = gloss.setdefault(key, {"pos": v.get("pos", ""), "cefr": v.get("cefr", ""), "senses": []})
                for sense in split_senses(v.get("text_tr", "")):
                    if sense not in entry["senses"]:
                        entry["senses"].append(sense)
    out = os.path.join(LESSON_DIR, f"{lesson_id}.glossary.json")
    json.dump(gloss, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[{lesson_id}] glossary: {len(gloss)} girdi -> {out}")


def main():
    ids = sys.argv[1:] or ["fireship_ai", "mckinnon_day"]
    for i in ids:
        process(i)


if __name__ == "__main__":
    main()
