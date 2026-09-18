# -*- coding: utf-8 -*-
import json

p = "assets/lessons/lesson1.glossary.json"
g = json.load(open(p, encoding="utf-8"))
add = {
    "accidents": {"pos": "noun", "cefr": "A2", "senses": ["kazalar"]},
    "archer": {"pos": "noun", "cefr": "A1", "senses": ["Archer (ozel isim; okcu)"]},
    "around": {"pos": "preposition", "cefr": "A2", "senses": ["etrafinda, cevrede", "yaklasik"]},
    "as": {"pos": "conjunction", "cefr": "A2", "senses": ["gibi", "-digi icin", "-ken"]},
    "automobiles": {"pos": "noun", "cefr": "B1", "senses": ["otomobiller, arabalar"]},
    "bad": {"pos": "adjective", "cefr": "A1", "senses": ["kotu", "fena"]},
    "blame": {"pos": "verb", "cefr": "B1", "senses": ["suclamak", "(isim) suc, kabahat"]},
    "by": {"pos": "preposition", "cefr": "A1", "senses": ["-in tarafindan", "yaninda", "ile"]},
    "can't": {"pos": "contraction", "cefr": "A1", "senses": ["cannot: -emez, -amaz"]},
    "cause": {"pos": "verb", "cefr": "B1", "senses": ["-e yol acmak, neden olmak", "(isim) neden, sebep"]},
    "come": {"pos": "verb", "cefr": "A1", "senses": ["gelmek"]},
    "could": {"pos": "modal", "cefr": "A2", "senses": ["-ebilirdi, olabilir", "(kibar) -ebilir miyim"]},
    "dangers": {"pos": "noun", "cefr": "A2", "senses": ["tehlikeler"]},
    "did": {"pos": "verb", "cefr": "A1", "senses": ["yapti (do gecmisi)", "(soru/olumsuz) gecmis yardimci fiil"]},
    "fires": {"pos": "noun", "cefr": "A1", "senses": ["yanginlar, atesler"]},
    "hey": {"pos": "interjection", "cefr": "A1", "senses": ["hey, baksana"]},
    "incorporated": {"pos": "adjective", "cefr": "B2", "senses": ["anonim sirket (Inc.)", "birlestirilmis"]},
    "just": {"pos": "adverb", "cefr": "A2", "senses": ["sadece, yalnizca", "az once", "tam"]},
    "like": {"pos": "preposition", "cefr": "A1", "senses": ["gibi", "(fiil) hoslanmak, sevmek"]},
    "looks": {"pos": "verb", "cefr": "A1", "senses": ["gorunur, bakar", "(look like) -e benzer"]},
    "many": {"pos": "determiner", "cefr": "A1", "senses": ["bircok, cok"]},
    "meet": {"pos": "verb", "cefr": "A1", "senses": ["tanismak, bulusmak", "karsilamak"]},
    "new": {"pos": "adjective", "cefr": "A1", "senses": ["yeni"]},
    "nice": {"pos": "adjective", "cefr": "A1", "senses": ["hos, iyi, guzel"]},
    "not": {"pos": "adverb", "cefr": "A1", "senses": ["degil, -me/-ma (olumsuzluk)"]},
    "now": {"pos": "adverb", "cefr": "A1", "senses": ["simdi", "artik"]},
    "on": {"pos": "preposition", "cefr": "A1", "senses": ["ustunde, -de", "acik (durum)"]},
    "other": {"pos": "adjective", "cefr": "A1", "senses": ["diger, oteki, baska"]},
    "please": {"pos": "interjection", "cefr": "A1", "senses": ["lutfen", "(fiil) memnun etmek"]},
    "produced": {"pos": "verb", "cefr": "B1", "senses": ["uretildi/uretti (produce)", "yapimini ustlendi"]},
    "productions": {"pos": "noun", "cefr": "B1", "senses": ["yapimlar, uretim(ler)"]},
    "really": {"pos": "adverb", "cefr": "A1", "senses": ["gercekten, cidden"]},
    "right": {"pos": "adjective", "cefr": "A1", "senses": ["dogru", "sag", "(all right) peki, tamam"]},
    "something": {"pos": "pronoun", "cefr": "A1", "senses": ["bir sey"]},
    "they": {"pos": "pronoun", "cefr": "A1", "senses": ["onlar"]},
    "time": {"pos": "noun", "cefr": "A1", "senses": ["zaman", "kez, defa", "(all the time) her zaman"]},
    "too": {"pos": "adverb", "cefr": "A1", "senses": ["de/da, ayrica", "cok, fazla"]},
    "were": {"pos": "verb", "cefr": "A1", "senses": ["-di/idi (be cogul/2. gecmis)"]},
    "will": {"pos": "modal", "cefr": "A1", "senses": ["-ecek (gelecek zaman)", "(isim) irade, vasiyet"]},
}
g.update(add)
json.dump(dict(sorted(g.items())), open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("sozluk toplam:", len(g))
