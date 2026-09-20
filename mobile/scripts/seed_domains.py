# -*- coding: utf-8 -*-
# Mevcut global sozlukteki (anlami olan) kokleri tema (domain) ile etiketler.
# Bu, elle yapilan EN-IYI-UYUM siniflandirmasinin denetlenebilir kaydidir:
# her anahtar "lemma|pos", degeri vocab_domains.VALID icinden BIR tema.
# _lexicon.json'a yalnizca "domain" alanini ekler; anlam/CEFR'e DOKUNMAZ.
#
# Kullanim:  python scripts/seed_domains.py
#
# Yeni kelimeler (bu haritada olmayan, anlami olan) icin build_corpus.py'nin
# B4 (llm_domains) adimi calisinca otomatik atanir; anahtar yoksa GENERAL sayilir.

import json
import os
import sys

from vocab_domains import VALID

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLOBAL_LEX = os.path.join(ROOT, "assets", "lessons", "_lexicon.json")

# lemma|pos -> tema (kelime ANLAMINA gore en uygun birincil kategori).
DOMAINS = {
    "ability|NOUN": "GENERAL",
    "accuracy|NOUN": "GENERAL",
    "acquire|VERB": "BUSINESS",
    "additional|ADJ": "GENERAL",
    "anywhere|ADV": "GENERAL",
    "appear|VERB": "GENERAL",
    "appearance|NOUN": "GENERAL",
    "approachable|ADJ": "SOCIAL",
    "area|NOUN": "TRAVEL",
    "assign|VERB": "BUSINESS",
    "attention|NOUN": "GENERAL",
    "awesome|ADJ": "EMOTIONS",
    "benefit|NOUN": "BUSINESS",
    "bottom|NOUN": "GENERAL",
    "broadcaster|NOUN": "MEDIA",
    "busy|ADJ": "GENERAL",
    "capital|NOUN": "TRAVEL",
    "champion|NOUN": "SPORTS",
    "classification|NOUN": "TECH",
    "classify|VERB": "TECH",
    "coin|VERB": "GENERAL",
    "cold|ADJ": "EMOTIONS",
    "collect|VERB": "GENERAL",
    "comment|NOUN": "MEDIA",
    "commit|VERB": "BUSINESS",
    "compare|VERB": "GENERAL",
    "completely|ADV": "GENERAL",
    "condition|NOUN": "GENERAL",
    "constantly|ADV": "GENERAL",
    "contain|VERB": "GENERAL",
    "cosmopolitan|ADJ": "TRAVEL",
    "couch|NOUN": "HOME",
    "create|VERB": "MEDIA",
    "creator|NOUN": "MEDIA",
    "culture|NOUN": "SOCIAL",
    "deal|NOUN": "FINANCE",
    "dependent|ADJ": "GENERAL",
    "deploy|VERB": "TECH",
    "describe|VERB": "GENERAL",
    "deserve|VERB": "GENERAL",
    "develop|VERB": "TECH",
    "device|NOUN": "TECH",
    "diverse|ADJ": "SOCIAL",
    "diversity|NOUN": "SOCIAL",
    "divide|VERB": "GENERAL",
    "domestic|ADJ": "TRAVEL",
    "dominance|NOUN": "SPORTS",
    "dynamic|ADJ": "GENERAL",
    "earn|VERB": "FINANCE",
    "effort|NOUN": "GENERAL",
    "ego|NOUN": "EMOTIONS",
    "embed|VERB": "TECH",
    "environment|NOUN": "NATURE",
    "equal|ADJ": "SOCIAL",
    "equally|ADV": "GENERAL",
    "estimate|VERB": "GENERAL",
    "ethnic|ADJ": "SOCIAL",
    "expect|VERB": "GENERAL",
    "expectation|NOUN": "GENERAL",
    "experience|NOUN": "GENERAL",
    "experienced|ADJ": "BUSINESS",
    "explicitly|ADV": "GENERAL",
    "fair|ADJ": "SOCIAL",
    "fake|ADJ": "MEDIA",
    "fee|NOUN": "FINANCE",
    "feed|VERB": "FOOD",
    "financial|ADJ": "FINANCE",
    "fluctuate|VERB": "FINANCE",
    "friendly|ADJ": "SOCIAL",
    "frightened|ADJ": "EMOTIONS",
    "fund|NOUN": "FINANCE",
    "fundamental|ADJ": "GENERAL",
    "further|ADJ": "GENERAL",
    "garbage|NOUN": "HOME",
    "garbage|VERB": "HOME",
    "genuinely|ADV": "GENERAL",
    "glut|NOUN": "FINANCE",
    "grab|VERB": "GENERAL",
    "gradually|ADV": "GENERAL",
    "guarantee|VERB": "BUSINESS",
    "half|NOUN": "GENERAL",
    "history|NOUN": "EDUCATION",
    "hopeful|ADJ": "EMOTIONS",
    "horrible|ADJ": "EMOTIONS",
    "immediately|ADV": "GENERAL",
    "impressive|ADJ": "EMOTIONS",
    "improve|VERB": "GENERAL",
    "inbox|NOUN": "MEDIA",
    "income|NOUN": "FINANCE",
    "increase|NOUN": "GENERAL",
    "incredible|ADJ": "EMOTIONS",
    "interested|ADJ": "EMOTIONS",
    "interesting|ADJ": "EMOTIONS",
    "intimidate|VERB": "EMOTIONS",
    "introduce|VERB": "GREETINGS",
    "invite|VERB": "GREETINGS",
    "journey|NOUN": "TRAVEL",
    "key|ADJ": "GENERAL",
    "late|ADJ": "GENERAL",
    "least|ADJ": "GENERAL",
    "loaf|NOUN": "FOOD",
    "local|ADJ": "TRAVEL",
    "manual|ADJ": "GENERAL",
    "market|NOUN": "FINANCE",
    "massive|ADJ": "GENERAL",
    "merit|NOUN": "BUSINESS",
    "minimize|VERB": "GENERAL",
    "minimum|NOUN": "GENERAL",
    "mistrust|VERB": "EMOTIONS",
    "multicultural|NOUN": "SOCIAL",
    "museum|NOUN": "TRAVEL",
    "northwest|NOUN": "TRAVEL",
    "nowhere|ADV": "GENERAL",
    "optimize|VERB": "TECH",
    "option|NOUN": "GENERAL",
    "order|VERB": "FOOD",
    "originally|ADV": "GENERAL",
    "outcome|NOUN": "GENERAL",
    "outgoing|ADJ": "SOCIAL",
    "overrated|ADJ": "EMOTIONS",
    "overseas|ADJ": "TRAVEL",
    "parameter|NOUN": "TECH",
    "patient|NOUN": "HEALTH",
    "perform|VERB": "BUSINESS",
    "period|NOUN": "GENERAL",
    "personally|ADV": "GENERAL",
    "poor|ADJ": "GENERAL",
    "position|NOUN": "GENERAL",
    "prediction|NOUN": "TECH",
    "predictive|ADJ": "TECH",
    "previous|ADJ": "GENERAL",
    "process|NOUN": "GENERAL",
    "promise|VERB": "SOCIAL",
    "racism|NOUN": "SOCIAL",
    "ratio|NOUN": "FINANCE",
    "raw|ADJ": "FOOD",
    "receive|VERB": "GENERAL",
    "recommend|VERB": "MEDIA",
    "record|ADJ": "SPORTS",
    "record|NOUN": "SPORTS",
    "recover|VERB": "HEALTH",
    "reliance|NOUN": "GENERAL",
    "reliant|ADJ": "GENERAL",
    "remain|VERB": "GENERAL",
    "reminder|NOUN": "TECH",
    "renegotiation|NOUN": "BUSINESS",
    "represent|VERB": "GENERAL",
    "resource|NOUN": "BUSINESS",
    "respect|VERB": "SOCIAL",
    "revenue|NOUN": "FINANCE",
    "rival|NOUN": "SPORTS",
    "roughly|ADV": "GENERAL",
    "round|NOUN": "SPORTS",
    "rude|ADJ": "SOCIAL",
    "separate|VERB": "GENERAL",
    "share|NOUN": "FINANCE",
    "share|VERB": "MEDIA",
    "shop|NOUN": "HOME",
    "similar|ADJ": "GENERAL",
    "southwest|NOUN": "TRAVEL",
    "spending|NOUN": "FINANCE",
    "staggering|ADJ": "EMOTIONS",
    "stock|NOUN": "FINANCE",
    "structure|NOUN": "GENERAL",
    "subscribe|VERB": "MEDIA",
    "subscriber|NOUN": "MEDIA",
    "suck|VERB": "EMOTIONS",
    "surgery|NOUN": "HEALTH",
    "sweater|NOUN": "HOME",
    "task|NOUN": "BUSINESS",
    "text|VERB": "MEDIA",
    "title|NOUN": "SPORTS",
    "touristy|NOUN": "TRAVEL",
    "train|VERB": "EDUCATION",
    "training|NOUN": "EDUCATION",
    "transfer|NOUN": "SPORTS",
    "transform|VERB": "GENERAL",
    "underlie|VERB": "GENERAL",
    "upstate|ADJ": "TRAVEL",
    "validate|VERB": "TECH",
    "valuable|ADJ": "GENERAL",
    "varied|ADJ": "GENERAL",
    "virtually|ADV": "GENERAL",
    "weather|NOUN": "NATURE",
    "weight|NOUN": "GENERAL",
    "weird|ADJ": "EMOTIONS",
    "welcoming|ADJ": "GREETINGS",
    "windfall|NOUN": "FINANCE",
    "worth|ADJ": "FINANCE",
}


def main():
    # enum dogrulama: haritadaki her tema gecerli olmali.
    bad = {v for v in DOMAINS.values() if v not in VALID}
    if bad:
        sys.exit(f"Gecersiz tema(lar): {bad}")

    with open(GLOBAL_LEX, encoding="utf-8") as f:
        data = json.load(f)

    applied, missing = 0, []
    for e in data:
        key = f"{e['lemma']}|{e['pos']}"
        dom = DOMAINS.get(key)
        if dom:
            e["domain"] = dom
            applied += 1
        elif e.get("senses"):
            # anlami var ama haritada yok -> simdilik null (pipeline/LLM doldurur).
            e.setdefault("domain", None)
            missing.append(key)
        else:
            e.setdefault("domain", None)

    with open(GLOBAL_LEX, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"domain atandi: {applied} kok.")
    if missing:
        print(f"anlami olup temasiz kalan {len(missing)} kok (LLM doldurabilir): {missing[:20]}...")


if __name__ == "__main__":
    main()
