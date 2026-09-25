# -*- coding: utf-8 -*-
# Okuma sozlugunu birlestirir -> assets/articles/_reading_lexicon.json
#   lexemes : eksik kelime kokleri (scripts/reading_dict_src/lexemes.json) + kelime
#             gruplari (phrases.json, pos = PHRASE)
#   examples: her kok/grup icin ornek cumleler (owner_key = "lemma|POS")
#   forms   : yuzey -> "lemma|POS" (build_reading_dict.py ciktisi + grup yuzeyleri)
# Kaynaklar elle/ajanla yazildi; bu script yalniz birlestirir ve dogrular.
#   python scripts/build_reading_dict.py   (once: yuzeyler + eksik liste)
#   python scripts/merge_reading_dict.py
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", "reading_dict_src")
FORMS = os.path.join(ROOT, "assets", "articles", "_reading_forms.json")
OUT = os.path.join(ROOT, "assets", "articles", "_reading_lexicon.json")


def main():
    lex_src = json.load(open(os.path.join(SRC, "lexemes.json"), encoding="utf-8"))
    phr_src = json.load(open(os.path.join(SRC, "phrases.json"), encoding="utf-8"))
    forms = json.load(open(FORMS, encoding="utf-8"))

    lexemes, examples = [], []
    for x in lex_src:
        lexemes.append({"lemma": x["lemma"], "pos": x["pos"], "cefr": x.get("cefr"), "domain": None, "senses": x["senses"]})
        for e in x.get("examples", []):
            examples.append({"owner_type": "lexeme", "owner_key": f"{x['lemma']}|{x['pos']}", "text_en": e["en"], "text_tr": e["tr"], "cefr": x.get("cefr")})

    # Ek liste: spaCy'nin ozel isim sandigi gercek kelimeler (extra.json; skip = gercek ozel isim).
    extra_path = os.path.join(SRC, "extra.json")
    if os.path.exists(extra_path):
        have = {f"{x['lemma']}|{x['pos']}" for x in lexemes}
        base = {f"{x['lemma'].lower()}|{x['pos']}" for x in json.load(open(os.path.join(ROOT, "assets", "lessons", "_lexicon.json"), encoding="utf-8"))}
        for x in json.load(open(extra_path, encoding="utf-8")):
            if x.get("skip"):
                continue
            key = f"{x['lemma']}|{x['pos']}"
            forms[x["surface"]] = key
            if key in have or key in base:
                continue
            have.add(key)
            lexemes.append({"lemma": x["lemma"], "pos": x["pos"], "cefr": x.get("cefr"), "domain": None, "senses": x["senses"]})
            for e in x.get("examples", []):
                examples.append({"owner_type": "lexeme", "owner_key": key, "text_en": e["en"], "text_tr": e["tr"], "cefr": x.get("cefr")})

    for p in phr_src:
        key = f"{p['phrase']}|PHRASE"
        lexemes.append({
            "lemma": p["phrase"], "pos": "PHRASE", "cefr": p.get("cefr"), "domain": None,
            "senses": [{"sense_idx": i, "gloss_tr": g} for i, g in enumerate(p["tr"])],
        })
        for e in p.get("examples", []):
            examples.append({"owner_type": "lexeme", "owner_key": key, "text_en": e["en"], "text_tr": e["tr"], "cefr": p.get("cefr")})
        for s in set(p["surfaces"]) | {p["phrase"]}:
            forms[" ".join(s.lower().replace("’", "'").split())] = key

    bad = [t for t in json.dumps([lexemes, examples], ensure_ascii=False) if t == "—"]
    assert not bad, "uzun cizgi var"
    json.dump({"lexemes": lexemes, "examples": examples, "forms": forms}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"lexemes={len(lexemes)} (grup {len(phr_src)}) examples={len(examples)} forms={len(forms)}")


if __name__ == "__main__":
    main()
