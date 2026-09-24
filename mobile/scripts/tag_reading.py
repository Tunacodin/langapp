# -*- coding: utf-8 -*-
# Okuma metinlerini gramer yapisina gore etiketler (Focus-Locked icin).
# _articles.json'daki her metnin body_en'i Layer-A (spaCy, grammar_detect) ile taranir;
# icinde gecen norm_pattern'lar 'norm_patterns' alanina yazilir. Boylece Okuma sekmesi
# aktif odaga gore metin suzebilir. Ses/gorsel/ceviri hattina DOKUNMAZ.
#
# Kullanim: python scripts/tag_reading.py
import json, os
from grammar_detect import detect_grammar_a
import spacy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES = os.path.join(ROOT, "assets", "articles", "_articles.json")
TOPICS = os.path.join(ROOT, "assets", "grammar", "topics.json")

enum = {t["norm_pattern"] for t in json.load(open(TOPICS, encoding="utf-8"))["topics"]}
nlp = spacy.load("en_core_web_sm")
arts = json.load(open(ARTICLES, encoding="utf-8"))

for a in arts:
    body = a.get("body_en") or ""
    doc = nlp(body)
    pats = sorted({norm for norm, s, e in detect_grammar_a(doc) if norm in enum})
    a["norm_patterns"] = pats
    # Mojibake temizligi: bozuk "source" degerini duzelt.
    src = a.get("source") or ""
    if "�" in src or "rnek Metin" in src:
        a["source"] = "Ornek Metin"
    print(f"{a['id']:24} {len(pats):2} yapi: {', '.join(pats[:8])}")

json.dump(arts, open(ARTICLES, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"\n{len(arts)} metin etiketlendi -> {ARTICLES}")
