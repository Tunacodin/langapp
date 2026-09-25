# -*- coding: utf-8 -*-
# Konusma merdiveni icerik denetimi (src/lib/speaking/ladder/*.ts).
# - her tema 12 cumle, anahtarlar s1..s12, tema id'leri benzersiz
# - uzun cizgi (U+2014) yok, Ingilizce cumle <= 13 kelime
# - hedef yapi cumlede var mi (grammar_detect ile; soru/olumsuzda detektor
#   kacirabilir, bu yuzden tema basina 3'ten fazla eksik = incele)
# - i+1: konu sirasinda SONRA gelen bir yapi erken kullanilmis mi
# - Turkce: diakritiksiz uzun satir (ASCII'lestirilmis Turkce supheli)
#   python scripts/check_ladder.py
import glob, os, re, sys, collections

import spacy

from grammar_detect import detect_grammar_a as detect

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDIR = os.path.join(ROOT, "src", "lib", "speaking", "ladder")

# dosya -> hedef norm'lar (index.ts'deki LADDER_TRACKS sirasi)
ORDER = [
    ("present-simple", {"present_simple"}),
    ("present-continuous", {"present_continuous"}),
    ("past-simple", {"simple_past"}),
    ("past-continuous", {"past_continuous_was_ving"}),
    ("used-to", {"used_to"}),
    ("countable-uncountable", {"countable_uncountable", "quantifier"}),
    ("going-to", {"future_going_to"}),
    ("will", {"future_will"}),
    ("present-continuous-future", {"present_cont_future"}),
    ("present-perfect", {"present_perfect_have_v3"}),
    ("present-perfect-continuous", {"present_perfect_cont"}),
    ("must-have-to", {"modal_obligation"}),
    ("if-type1", {"if_type1", "if_type0"}),
    ("if-type2", {"if_past_would"}),
    ("passive", {"passive_voice"}),
    ("relative-clauses", {"relative_clause"}),
]
RANK = {}
for i, (_, norms) in enumerate(ORDER):
    for n in norms:
        RANK.setdefault(n, i)
# Kaliba ozel olmayan/zayif sinyaller i+1 denetimine girmez.
IGNORE_LATER = {"present_simple", "stative_verbs", "prepositions_time", "adverb_frequency", "quantifier",
                "countable_uncountable"}

STR = r"(\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')"
SENT = re.compile(r"\{\s*key:\s*'(s\d+)',\s*en:\s*" + STR + r",\s*tr:\s*" + STR)
THEME = re.compile(r"id:\s*'([^']+)'")
FOLD = str.maketrans("çğıöşüÇĞİÖŞÜâîû", "cgiosuCGIOSUaiu")


def tr_vocab():
    """Projedeki tum Turkce metinlerden kelime -> diakritiksiz bicim haritasi."""
    import json
    words = collections.Counter()
    for p in glob.glob(os.path.join(ROOT, "assets", "lessons", "*.json")):
        try:
            L = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        for s in (L.get("sentences") or []) if isinstance(L, dict) else []:
            for w in re.findall(r"[^\W\d_]+", (s.get("text_tr") or "").lower()):
                words[w] += 1
    folded = collections.defaultdict(set)
    for w in words:
        folded[w.translate(FOLD)].add(w)
    return words, folded


def ascii_suspects(tr, words, folded):
    """Diakritiksiz yazilmis ama korpusta yalniz diakritikli gecen kelimeler."""
    out = []
    for w in re.findall(r"[^\W\d_]+", tr.lower()):
        if w.translate(FOLD) != w or w in words:
            continue
        alt = folded.get(w)
        if alt:
            out.append(f"{w}->{sorted(alt)[0]}")
    return out


def main():
    nlp = spacy.load("en_core_web_sm")
    words, folded = tr_vocab()
    ids = collections.Counter()
    problems = 0
    for fname, target in ORDER:
        path = os.path.join(LDIR, fname + ".ts")
        if not os.path.exists(path):
            print(f"!! {fname}.ts YOK")
            problems += 1
            continue
        src = open(path, encoding="utf-8").read()
        if "—" in src:
            print(f"!! {fname}: uzun cizgi var")
            problems += 1
        rank = [i for i, (f, _) in enumerate(ORDER) if f == fname][0]
        # temalari id sirasiyla bol
        parts = re.split(r"(?=\n  \{\n    id:)", src)
        themes = [p for p in parts if THEME.search(p)]
        print(f"== {fname}: {len(themes)} tema")
        for th in themes:
            tid = THEME.search(th).group(1)
            ids[tid] += 1
            rows = SENT.findall(th)
            keys = [k for k, _, _ in rows]
            if keys != [f"s{i}" for i in range(1, 13)]:
                print(f"   !! {tid}: anahtarlar {keys}")
                problems += 1
            miss, notes = 0, []
            for k, en, tr in rows:
                en, tr = en[1:-1], tr[1:-1]
                if len(en.split()) > 13:
                    notes.append(f"{k} uzun ({len(en.split())} kelime): {en}")
                sus = ascii_suspects(tr, words, folded)
                if sus:
                    notes.append(f"{k} TR diakritik eksik? {sus}: {tr}")
                found = {n for n, _, _ in detect(nlp(en))}
                if not found & target:
                    miss += 1
                    if "-v" in sys.argv:
                        notes.append(f"{k} hedef yok: {en}")
                later = sorted(n for n in found if RANK.get(n, -1) > rank and n not in IGNORE_LATER)
                if later:
                    notes.append(f"{k} sonraki yapi {later}: {en}")
            flag = "!!" if miss > 3 or notes else "ok"
            if miss > 3 or notes:
                problems += 1
            print(f"   {flag} {tid}: hedef eksik {miss}/12")
            for n in notes:
                print(f"       - {n}")
    dup = [k for k, v in ids.items() if v > 1]
    if dup:
        print("!! tekrar eden tema id:", dup)
        problems += 1
    print(f"\nincelenecek: {problems}")


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main()
