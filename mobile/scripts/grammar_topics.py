# -*- coding: utf-8 -*-
# KAPALI ENUM: gramer konu sozlugu. src/lib/db.ts icindeki GRAMMAR_TOPICS ile
# BIREBIR AYNIDIR (tek kaynak). Hem A Katmani (regex/POS) hem B Katmani (LLM)
# tespit ettigi kalibin norm_pattern'ini bu listeden secmek zorundadir.
# 4 kategori: TENSE_ASPECT, MODAL_VOICE, VERB_PATTERN, CLAUSE.

GRAMMAR_TOPICS = [
    # 1) Zaman / Gorunus
    {"norm_pattern": "PRESENT_SIMPLE",     "category": "TENSE_ASPECT", "label_tr": "Geniş Zaman",                 "cefr": "A1", "layer": "A"},
    {"norm_pattern": "PRESENT_CONTINUOUS", "category": "TENSE_ASPECT", "label_tr": "Şimdiki Zaman",               "cefr": "A1", "layer": "A"},
    {"norm_pattern": "PRESENT_PERFECT",    "category": "TENSE_ASPECT", "label_tr": "Yakın Geçmiş (have+V3)",      "cefr": "B1", "layer": "A"},
    {"norm_pattern": "PAST_SIMPLE",        "category": "TENSE_ASPECT", "label_tr": "Geçmiş Zaman",                "cefr": "A2", "layer": "A"},
    {"norm_pattern": "PAST_CONTINUOUS",    "category": "TENSE_ASPECT", "label_tr": "Geçmişte Sürekli (was+V-ing)","cefr": "B1", "layer": "A"},
    {"norm_pattern": "FUTURE_FORM",        "category": "TENSE_ASPECT", "label_tr": "Gelecek (will / going to)",   "cefr": "A2", "layer": "A"},
    # 2) Kiplik / Cati
    {"norm_pattern": "MODAL_VERB",         "category": "MODAL_VOICE",  "label_tr": "Kip Fiili (can/must/should...)", "cefr": "A2", "layer": "A"},
    {"norm_pattern": "PASSIVE_VOICE",      "category": "MODAL_VOICE",  "label_tr": "Edilgen Çatı (be+V3)",        "cefr": "B1", "layer": "A"},
    # 3) Fiil Kaliplari
    {"norm_pattern": "PHRASAL_VERB",       "category": "VERB_PATTERN", "label_tr": "Öbek Fiil (verb+particle)",   "cefr": "B1", "layer": "A"},
    {"norm_pattern": "GERUND_INFINITIVE",  "category": "VERB_PATTERN", "label_tr": "Fiil + -ing / to",            "cefr": "B1", "layer": "B"},
    {"norm_pattern": "CAUSATIVE",          "category": "VERB_PATTERN", "label_tr": "Ettirgen (make/let/have + do)","cefr": "B2", "layer": "B"},
    # 4) Cumle Yapisi
    {"norm_pattern": "RELATIVE_CLAUSE",    "category": "CLAUSE",       "label_tr": "Sıfat Cümleciği (who/which/that)", "cefr": "B1", "layer": "B"},
    {"norm_pattern": "NOUN_CLAUSE",        "category": "CLAUSE",       "label_tr": "İsim Cümleciği (that-clause)", "cefr": "B2", "layer": "B"},
    {"norm_pattern": "EMBEDDED_WH",        "category": "CLAUSE",       "label_tr": "Gömülü Soru (I know where...)","cefr": "B2", "layer": "B"},
    {"norm_pattern": "CONDITIONAL",        "category": "CLAUSE",       "label_tr": "Koşul Cümlesi (if...)",        "cefr": "B1", "layer": "B"},
]

BY_NORM = {t["norm_pattern"]: t for t in GRAMMAR_TOPICS}
VALID = set(BY_NORM)
LAYER_A = {t["norm_pattern"] for t in GRAMMAR_TOPICS if t["layer"] == "A"}
LAYER_B = {t["norm_pattern"] for t in GRAMMAR_TOPICS if t["layer"] == "B"}


def label_of(norm_pattern):
    t = BY_NORM.get(norm_pattern)
    return t["label_tr"] if t else norm_pattern


def cefr_of(norm_pattern):
    t = BY_NORM.get(norm_pattern)
    return t["cefr"] if t else None
