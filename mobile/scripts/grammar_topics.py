# -*- coding: utf-8 -*-
# KAPALI ENUM: gramer konu sozlugu. TEK KAYNAK = assets/grammar/topics.json
# (src/lib/grammar.ts ayni JSON'u okur). Hem A Katmani (regex/POS) hem B Katmani
# (LLM) tespit ettigi kalibin norm_pattern'ini bu listeden secmek zorundadir.
# 4 kategori: Tenses & Aspects / Modals & Modal Perfects / Conditionals & Wish /
# Subordinate Clauses.

import json
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_TOPICS_JSON = os.path.join(_HERE, "..", "assets", "grammar", "topics.json")

with open(_TOPICS_JSON, encoding="utf-8") as _f:
    _DATA = json.load(_f)

GRAMMAR_TOPICS = _DATA["topics"]
GRAMMAR_TOPICS_VERSION = _DATA.get("version")

BY_NORM = {t["norm_pattern"]: t for t in GRAMMAR_TOPICS}
VALID = set(BY_NORM)
LAYER_A = {t["norm_pattern"] for t in GRAMMAR_TOPICS if t.get("layer") == "A"}
LAYER_B = {t["norm_pattern"] for t in GRAMMAR_TOPICS if t.get("layer") == "B"}


def label_of(norm_pattern):
    t = BY_NORM.get(norm_pattern)
    # label = kitap adi (topic); TS tarafinda label_tr olarak seed edilir.
    return t["topic"] if t else norm_pattern


def cefr_of(norm_pattern):
    t = BY_NORM.get(norm_pattern)
    return t["cefr"] if t else None
