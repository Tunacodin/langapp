# -*- coding: utf-8 -*-
# KAPALI ENUM: kelime anlam-alani (tema) sozlugu. src/lib/db.ts icindeki
# VOCAB_DOMAINS ile BIREBIR AYNIDIR (tek kaynak). Her icerik kokune (lemma)
# TAM BIR tema atanir (birincil kategori). B Katmani (LLM) siniflandirmasi ve
# elle seed (seed_domains.py) bu listeden secmek ZORUNDADIR (enum ile suzme).

VOCAB_DOMAINS = [
    {"key": "GREETINGS", "label_tr": "Selamlaşma & Nezaket"},
    {"key": "SOCIAL",    "label_tr": "Sosyal & İlişkiler"},
    {"key": "EMOTIONS",  "label_tr": "Duygular & Karakter"},
    {"key": "HEALTH",    "label_tr": "Sağlık & Beden"},
    {"key": "BUSINESS",  "label_tr": "İş & Kariyer"},
    {"key": "FINANCE",   "label_tr": "Para & Ekonomi"},
    {"key": "TECH",      "label_tr": "Teknoloji & Yazılım"},
    {"key": "MEDIA",     "label_tr": "Medya & İletişim"},
    {"key": "FOOD",      "label_tr": "Yemek & İçecek"},
    {"key": "TRAVEL",    "label_tr": "Seyahat & Yer"},
    {"key": "HOME",      "label_tr": "Ev & Günlük Yaşam"},
    {"key": "SPORTS",    "label_tr": "Spor & Rekabet"},
    {"key": "NATURE",    "label_tr": "Doğa & Çevre"},
    {"key": "EDUCATION", "label_tr": "Eğitim & Öğrenme"},
    {"key": "ARTS",      "label_tr": "Sanat & Eğlence"},
    {"key": "GENERAL",   "label_tr": "Genel & Soyut"},
]

VALID = {d["key"] for d in VOCAB_DOMAINS}
_LABEL = {d["key"]: d["label_tr"] for d in VOCAB_DOMAINS}


def label_of(key):
    return _LABEL.get(key, key)
