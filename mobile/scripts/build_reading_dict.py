# -*- coding: utf-8 -*-
# Okuma metinleri icin sozluk kapsami. Video sozlugu (_lexicon.json) yalniz videolarda
# gecen yuzeyleri tanir; makalelerdeki kelimelerin yarisi bos cikiyordu.
# 1) spaCy ile her makale kelimesinin (yuzey -> lemma|pos) eslemesini cikarir.
# 2) Bitisik phrasal verb'leri (fiil + parcacik, orn. "woke up") yakalar.
# 3) Sozlukte olmayan lemma|pos listesini ve bulunan kelime gruplarini yazar
#    (anlamlar sonra elle/ajanla doldurulur: scripts/out/reading_missing.json).
# Cikti: assets/articles/_reading_forms.json  {surface: "lemma|POS"}  (uygulama seed'i)
#   python scripts/build_reading_dict.py
import json, os, re, collections
import spacy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "assets", "articles", "_articles.json")
LEX = os.path.join(ROOT, "assets", "lessons", "_lexicon.json")
OUT_FORMS = os.path.join(ROOT, "assets", "articles", "_reading_forms.json")
OUT_MISS = os.path.join(ROOT, "scripts", "out", "reading_missing.json")

POS_KEEP = {"NOUN", "VERB", "ADJ", "ADV", "PRON", "PROPN", "ADP", "DET", "CCONJ", "SCONJ", "NUM", "PART", "INTJ", "AUX"}


def main():
    nlp = spacy.load("en_core_web_sm")
    arts = json.load(open(ART, encoding="utf-8"))
    lex = json.load(open(LEX, encoding="utf-8"))
    have = {f"{x['lemma'].lower()}|{x['pos']}" for x in lex}
    have_lemma = {}
    for x in lex:
        have_lemma.setdefault(x["lemma"].lower(), x["pos"])

    forms = {}
    need = collections.OrderedDict()  # lemma|pos -> ornek cumle
    phrases = collections.OrderedDict()  # "grow up" -> {surfaces, example}
    for a in arts:
        doc = nlp(a["body_en"].replace("’", "'"))
        for t in doc:
            if not re.match(r"^[A-Za-z][A-Za-z'-]*$", t.text) or t.pos_ not in POS_KEEP:
                continue
            surf = t.text.lower()
            lemma = t.lemma_.lower()
            pos = "PROPN" if t.pos_ == "PROPN" else t.pos_
            key = f"{lemma}|{pos}"
            # Sozlukte ayni lemma baska POS ile varsa onu kullan (orn. spaCy ADJ/VERB kararsizligi).
            if key not in have and lemma in have_lemma and pos != "PROPN":
                key = f"{lemma}|{have_lemma[lemma]}"
            forms.setdefault(surf, key)
            if key not in have and pos != "PROPN" and key not in need:
                need[key] = t.sent.text.strip()
            if t.dep_ == "prt" and t.head.pos_ == "VERB" and t.i == t.head.i + 1:
                ph = f"{t.head.lemma_.lower()} {surf}"
                s = f"{t.head.text.lower()} {surf}"
                e = phrases.setdefault(ph, {"surfaces": [], "example": t.sent.text.strip()})
                if s not in e["surfaces"]:
                    e["surfaces"].append(s)

    json.dump(forms, open(OUT_FORMS, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    os.makedirs(os.path.dirname(OUT_MISS), exist_ok=True)
    json.dump(
        {"lexemes": [{"key": k, "context": v} for k, v in need.items()], "phrases": phrases},
        open(OUT_MISS, "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=1,
    )
    print(f"forms={len(forms)} missing_lexemes={len(need)} phrases={len(phrases)}")


if __name__ == "__main__":
    main()
