# -*- coding: utf-8 -*-
# ZENGINLESTIRME HATTI (ingest.py'den SONRA calisir) - GLOBAL SOZLUK MODELI.
#
# Sozluk TEK yerde: assets/lessons/_lexicon.json (tum videolarda paylasilir).
# Bir lemma'nin (kok) TR anlamlari BIR KEZ hesaplanir; ayni kelime 20 videoda
# gecse de tekrar cevrilmez ve her yerde AYNI karsiligi gorur.
# Video basina uretilen: sadece occurrence (gecis) + o cumledeki sense_idx (WSD)
# + gramer. Bu sayede LLM maliyeti lemma sayisiyla sinirli kalir (cumle degil).
#
# Girdi (her id): <id>.json (cumleler), <id>.words.json, <id>.glossary.json (ops.)
# Cikti: _lexicon.json (global) guncellenir; <id>.json'a occurrences+grammar;
#        <id>.words.json'a lemma/pos.
#
# Iki katman:
#   A (spaCy, ZORUNLU): POS/lemma + occurrences (yalniz icerik kelimeleri) +
#      9 yuksek-kesinlikli gramer kalibi (span'li).
#   B (LLM, OPSIYONEL, ANAHTAR VARSA): (1) global sozlukte anlami eksik lemmalar
#      icin TR anlam (toplu istek), (2) her cumlede WSD ile occurrence.sense_idx,
#      (3) yapisal gramer (clause/gerund/conditional/causative), enum ile suzulur.
#      Anahtar yoksa script cokmeden A ile biter.
#
# Kullanim:
#   python scripts/build_corpus.py                       # tum dersler (A; anahtar varsa B)
#   ANTHROPIC_API_KEY=... python scripts/build_corpus.py fireship_ai mckinnon_day
#   python scripts/build_corpus.py --reclean [id...]     # spaCy'siz: eski per-ders
#                                                        # lexicon'u global modele goc et

import json
import os
import re
import sys

from grammar_topics import VALID, LAYER_B, label_of, cefr_of
from grammar_detect import detect_grammar_a  # Layer-A tespit (tek kaynak)
from vocab_domains import VALID as DOMAIN_VALID

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON_DIR = os.path.join(ROOT, "assets", "lessons")
GLOBAL_LEX = os.path.join(LESSON_DIR, "_lexicon.json")
GLOBAL_EX = os.path.join(LESSON_DIR, "_examples.json")  # transfer ornekleri (global)
EXAMPLES_PER_ITEM = 5

# Sozluge yalnizca ICERIK kelimeleri girer (isim/fiil/sifat/zarf). Fonksiyon
# kelimeleri, zamirler, ozel isimler, noktalama, sayilar occurrence/lexicon'a
# alinmaz: bunlarin "anlam karti" ogretici degil, gurultu.
CONTENT_POS = {"NOUN", "VERB", "ADJ", "ADV"}

# spaCy'nin asiri-koklestirdigi bariz durumlar (ogrenci yuzey kelimeyi bekler).
LEMMA_FIX = {"datum": "data"}

_NLP = None


def nlp():
    global _NLP
    if _NLP is not None:
        return _NLP
    try:
        import spacy
    except ImportError:
        sys.exit("spaCy gerekli (A). Kur: pip install spacy && python -m spacy download en_core_web_sm")
    try:
        _NLP = spacy.load("en_core_web_sm")
    except OSError:
        sys.exit("Model yok. Kur: python -m spacy download en_core_web_sm")
    return _NLP


def clean(s):
    return re.sub(r"[^a-z']", "", s.lower())


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# --------------------------------------------------------------------------
# GLOBAL SOZLUK yardimcilari. lexmap: (lemma,pos) -> {cefr, senses:[gloss...]}
# --------------------------------------------------------------------------
def load_lexmap():
    data = load_json(GLOBAL_LEX, []) or []
    lexmap = {}
    for e in data:
        lexmap[(e["lemma"], e["pos"])] = {
            "cefr": e.get("cefr"),
            "domain": e.get("domain"),  # tema (VOCAB_DOMAINS); yoksa None
            "senses": [s["gloss_tr"] for s in (e.get("senses") or [])],
        }
    return lexmap


def save_lexmap(lexmap):
    out = []
    for (lemma, pos), v in sorted(lexmap.items()):
        out.append({
            "lemma": lemma, "pos": pos, "cefr": v.get("cefr"), "domain": v.get("domain"),
            "senses": [{"sense_idx": i, "gloss_tr": g} for i, g in enumerate(v["senses"])],
        })
    with open(GLOBAL_LEX, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    return out


def sense_index(lexmap, lemma, pos, gloss):
    """gloss'un global sozlukteki sense_idx'i; yoksa ekleyip idx dondur."""
    e = lexmap.setdefault((lemma, pos), {"cefr": None, "senses": []})
    if gloss and gloss not in e["senses"]:
        e["senses"].append(gloss)
    return e["senses"].index(gloss) if gloss in e["senses"] else None


# --------------------------------------------------------------------------
# A KATMANI: gramer kaliplari (spaCy)
# --------------------------------------------------------------------------
def _span(tokens):
    a = min(t.idx for t in tokens)
    b = max(t.idx + len(t.text) for t in tokens)
    return a, b


# detect_grammar_a: grammar_detect.py'ye tasindi (yeni taksonomi, tek kaynak).


def align_timing(sent_words, doc):
    timing, j = {}, 0
    for t in doc:
        if not (t.is_alpha or "'" in t.text):
            continue
        ct = clean(t.text)
        if not ct:
            continue
        k = j
        while k < len(sent_words) and clean(sent_words[k]["w"]) != ct:
            k += 1
        if k < len(sent_words):
            timing[t.i] = (sent_words[k]["start_ms"], sent_words[k]["end_ms"])
            j = k + 1
    return timing


# --------------------------------------------------------------------------
# B KATMANI: LLM (opsiyonel, graceful)
# --------------------------------------------------------------------------
def llm_client():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        import anthropic
    except ImportError:
        print("  [B] anthropic paketi yok, LLM atlaniyor (pip install anthropic).")
        return None
    return anthropic.Anthropic(api_key=key)


LLM_MODEL = os.environ.get("CORPUS_LLM_MODEL", "claude-haiku-4-5-20251001")
_LAYER_B_LIST = ", ".join(sorted(LAYER_B))


def _llm_json(client, prompt, max_tokens=1200):
    try:
        msg = client.messages.create(
            model=LLM_MODEL, max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()
        raw = re.sub(r"^```(?:json)?|```$", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        print(f"  [B] atlandi ({type(e).__name__})")
        return None


def llm_senses(client, items):
    """items: [(lemma,pos)]. Toplu TR anlam + CEFR. Doner:
    {'lemma|pos': {"tr": [anlam...], "cefr": "B1"}}."""
    if not items:
        return {}
    listing = "\n".join(f"- {lemma} ({pos})" for lemma, pos in items)
    prompt = (
        "You are building a bilingual dictionary for Turkish learners of English.\n"
        "For EACH lemma below give: (1) its 1-3 most common Turkish meanings (short, "
        "1-4 words each, ordered by frequency); (2) its CEFR level (A1/A2/B1/B2/C1/C2).\n"
        f"{listing}\n\n"
        'Return ONLY minified JSON: {"lemma|pos": {"tr": ["anlam1","anlam2"], "cefr": "B1"}, ...} '
        "using the exact lemma and POS tag given. No prose, no code fences."
    )
    data = _llm_json(client, prompt, max_tokens=2500)
    return data or {}


_DOMAIN_LIST = ", ".join(sorted(DOMAIN_VALID))


def llm_domains(client, items):
    """items: [(lemma,pos,[gloss...])]. Her koke KAPALI listeden TAM BIR tema atar.
    Doner: {'lemma|pos': 'DOMAIN'}. Enum disi/eksik degerler cagiran tarafta elenir."""
    if not items:
        return {}
    listing = "\n".join(
        f"- {lemma} ({pos}): {', '.join(gs[:3])}" for lemma, pos, gs in items
    )
    prompt = (
        "You classify English vocabulary into ONE semantic domain each, for a "
        "Turkish learning app. Choose the single best-fit domain from this closed "
        f"list ONLY: [{_DOMAIN_LIST}]. Use GENERAL for abstract/functional words "
        "that fit no concrete theme.\n"
        "Each item is 'lemma (POS): turkish meanings'.\n"
        f"{listing}\n\n"
        'Return ONLY minified JSON: {"lemma|pos": "DOMAIN", ...} using the exact '
        "lemma and POS given and a domain from the list. No prose, no code fences."
    )
    data = _llm_json(client, prompt, max_tokens=2000)
    return data or {}


def llm_examples(client, items):
    """items: [(owner_key, hint)] hint = kelime ya da 'gramer: <ad>'. Her oge icin
    FARKLI baglamlarda EXAMPLES_PER_ITEM ornek cumle + TR + CEFR.
    Doner: {owner_key: [{"en","tr","cefr"}, ...]}."""
    if not items:
        return {}
    listing = "\n".join(f"- [{k}] {hint}" for k, hint in items)
    prompt = (
        "You write example sentences for a Turkish learner of English.\n"
        f"For EACH item below, write {EXAMPLES_PER_ITEM} natural example sentences that "
        "use it, each in a DIFFERENT everyday context (not copied from each other). "
        "Give a short Turkish translation and a CEFR level for each sentence.\n"
        f"{listing}\n\n"
        'Return ONLY minified JSON: {"<key>": [{"en":"...","tr":"...","cefr":"B1"}, ...], ...} '
        "using the exact [key] shown. No prose, no code fences."
    )
    data = _llm_json(client, prompt, max_tokens=3000)
    return data or {}


def llm_wsd(client, text_en, lemma_senses):
    """lemma_senses: {lemma: [gloss...]}. Doner: {lemma: sense_idx} + yapisal gramer.
    Cikti: {'senseidx': {lemma:int}, 'grammar':[{norm_pattern,span_start,span_end}]}"""
    if not lemma_senses:
        opts = "{}"
    else:
        opts = json.dumps(
            {lm: [f"{i}:{g}" for i, g in enumerate(gs)] for lm, gs in lemma_senses.items()},
            ensure_ascii=False,
        )
    prompt = (
        "Analyze ONE English sentence for a Turkish learning app.\n"
        f'Sentence: "{text_en}"\n'
        f"For each lemma, its candidate senses as index:gloss -> {opts}\n\n"
        "Return ONLY minified JSON with keys:\n"
        '  "senseidx": object mapping each lemma to the integer index of the sense '
        "used IN THIS sentence (choose the best fit).\n"
        '  "grammar": array of {"norm_pattern","span_start","span_end"} where '
        f"norm_pattern is one of [{_LAYER_B_LIST}]; character offsets into the sentence. "
        "Only patterns truly present.\n"
        "No prose, no code fences."
    )
    return _llm_json(client, prompt) or {}


# --------------------------------------------------------------------------
# Ders isleme (tek video)
# --------------------------------------------------------------------------
def sentence_words(words_flat, start_ms, next_start):
    return [w for w in words_flat
            if start_ms <= (w["start_ms"] + w["end_ms"]) / 2 and
            (next_start is None or (w["start_ms"] + w["end_ms"]) / 2 < next_start)]


def process(lesson_id, client):
    base = os.path.join(LESSON_DIR, lesson_id)
    lesson = load_json(base + ".json")
    words_flat = load_json(base + ".words.json", []) or []
    glossary = load_json(base + ".glossary.json", {}) or {}
    if lesson is None:
        print(f"[{lesson_id}] {base}.json yok, atlaniyor.")
        return
    print(f"[{lesson_id}] {len(lesson['sentences'])} cumle (B: {'acik' if client else 'kapali'})")

    model = nlp()
    lexmap = load_lexmap()
    sents = sorted(lesson["sentences"], key=lambda s: s["start_ms"])

    # --- A: occurrences (icerik kelimeleri) + gramer; cevrimdisi anlamlari doldur ---
    for si, s in enumerate(sents):
        next_start = sents[si + 1]["start_ms"] if si + 1 < len(sents) else None
        sw = sentence_words(words_flat, s["start_ms"], next_start)
        doc = model(s["text_en"])
        timing = align_timing(sw, doc)

        occurrences = []
        for t in doc:
            if t.pos_ not in CONTENT_POS or not (t.is_alpha or "'" in t.text):
                continue
            surface = clean(t.text)
            if not surface:
                continue
            lemma = t.lemma_.lower() if t.lemma_ not in ("-PRON-", "") else surface
            lemma = LEMMA_FIX.get(lemma, lemma)
            pos = t.pos_
            entry = lexmap.setdefault((lemma, pos), {"cefr": None, "senses": []})
            g = glossary.get(surface) or glossary.get(lemma)
            if g:
                if g.get("cefr") and not entry["cefr"]:
                    entry["cefr"] = g["cefr"]
                for gl in g.get("senses", []):
                    if gl not in entry["senses"]:
                        entry["senses"].append(gl)
            st, en = timing.get(t.i, (s["start_ms"], s["end_ms"]))
            occurrences.append({
                "surface": surface, "lemma": lemma, "pos": pos,
                "sense_idx": None, "start_ms": st, "end_ms": en,
            })
            if t.i in timing:
                for w in sw:
                    if clean(w["w"]) == surface and "lemma" not in w:
                        w["lemma"], w["pos"] = lemma, pos
                        break

        # Idempotent: onceki pipeline tespitlerini (norm_pattern'li) at, curated notu koru.
        grammar = [g for g in (s.get("grammar") or []) if not g.get("norm_pattern")]
        for norm, a, b in detect_grammar_a(doc):
            grammar.append({
                "pattern": s["text_en"][a:b], "note_tr": label_of(norm),
                "cefr": cefr_of(norm), "norm_pattern": norm, "span_start": a, "span_end": b,
            })
        s["occurrences"] = occurrences
        s["grammar"] = grammar

    # --- B1: global sozlukte anlami EKSIK lemmalar icin toplu TR anlam ---
    if client:
        need = [k for k, v in lexmap.items() if not v["senses"]
                and any(o["lemma"] == k[0] and o["pos"] == k[1]
                        for s in sents for o in s["occurrences"])]
        for i in range(0, len(need), 40):  # 40'lik gruplar
            batch = need[i:i + 40]
            got = llm_senses(client, batch)
            for (lemma, pos) in batch:
                info = got.get(f"{lemma}|{pos}")
                # Yeni sekil {"tr":[...],"cefr":".."}; eski sekil sadece [..] da kabul.
                trs = info.get("tr", []) if isinstance(info, dict) else (info or [])
                cefr = info.get("cefr") if isinstance(info, dict) else None
                for gl in trs:
                    if gl and gl not in lexmap[(lemma, pos)]["senses"]:
                        lexmap[(lemma, pos)]["senses"].append(gl)
                if cefr and not lexmap[(lemma, pos)]["cefr"]:
                    lexmap[(lemma, pos)]["cefr"] = cefr
        print(f"  [B1] {len(need)} eksik lemma icin anlam + CEFR istendi.")

    # --- B4: anlami olup temasi (domain) EKSIK lemmalar icin tema siniflandirma ---
    if client:
        seen_here = {(o["lemma"], o["pos"]) for s in sents for o in s["occurrences"]}
        need_dom = [(lm, ps, v["senses"]) for (lm, ps), v in lexmap.items()
                    if v["senses"] and not v.get("domain") and (lm, ps) in seen_here]
        for i in range(0, len(need_dom), 40):
            batch = need_dom[i:i + 40]
            got = llm_domains(client, batch)
            for (lemma, pos, _gs) in batch:
                dom = got.get(f"{lemma}|{pos}")
                if dom in DOMAIN_VALID:
                    lexmap[(lemma, pos)]["domain"] = dom
        print(f"  [B4] {len(need_dom)} lemma icin tema istendi.")

    # --- B2: her cumlede WSD (sense_idx) + yapisal gramer ---
    if client:
        for s in sents:
            lemma_senses = {}
            for o in s["occurrences"]:
                gs = lexmap.get((o["lemma"], o["pos"]), {}).get("senses", [])
                if gs:
                    lemma_senses[o["lemma"]] = gs
            data = llm_wsd(client, s["text_en"], lemma_senses)
            idxmap = data.get("senseidx", {}) or {}
            for o in s["occurrences"]:
                v = idxmap.get(o["lemma"])
                if isinstance(v, int):
                    gs = lexmap.get((o["lemma"], o["pos"]), {}).get("senses", [])
                    o["sense_idx"] = v if 0 <= v < len(gs) else None
            for gi in data.get("grammar", []):
                norm = gi.get("norm_pattern")
                if norm in VALID and norm in LAYER_B:
                    a, b = gi.get("span_start"), gi.get("span_end")
                    frag = s["text_en"][a:b] if isinstance(a, int) and isinstance(b, int) else norm
                    s["grammar"].append({
                        "pattern": frag or norm, "note_tr": label_of(norm),
                        "cefr": cefr_of(norm), "norm_pattern": norm, "span_start": a, "span_end": b,
                    })

    # --- B3: transfer ornekleri (>=5 farkli baglam) - global, bir kez uret ---
    if client:
        generate_examples(client, sents, lexmap)

    # per-ders lexicon alanini birak (global'e tasindi)
    lesson.pop("lexicon", None)
    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump(lesson, f, ensure_ascii=False, indent=2)
    with open(base + ".words.json", "w", encoding="utf-8") as f:
        json.dump(words_flat, f, ensure_ascii=False, indent=2)
    out = save_lexmap(lexmap)
    n_sense = sum(len(e["senses"]) for e in out)
    print(f"  -> global sozluk {len(out)} kok / {n_sense} anlam; ders occurrences+grammar yazildi.")


def load_examples():
    """_examples.json'u {owner_key: [rows]} + var olan anahtar kumesi olarak yukle."""
    data = load_json(GLOBAL_EX, []) or []
    have = set()
    for e in data:
        have.add((e["owner_type"], e["owner_key"]))
    return data, have


def generate_examples(client, sents, lexmap):
    """Bu derste gecen ogeler (anlami olan kelimeler + gramer kaliplari) icin, henuz
    ornegi olmayanlara EXAMPLES_PER_ITEM ornek uret. Global _examples.json'a ekler."""
    data, have = load_examples()

    # Aday ogeler: anlami olan kelimeler (lexeme) + gorulen norm_pattern'lar (grammar).
    wanted = []  # (owner_type, owner_key, hint)
    seen_local = set()
    for s in sents:
        for o in s["occurrences"]:
            key = f"{o['lemma']}|{o['pos']}"
            if lexmap.get((o["lemma"], o["pos"]), {}).get("senses") and \
               ("lexeme", key) not in have and ("lexeme", key) not in seen_local:
                seen_local.add(("lexeme", key))
                wanted.append(("lexeme", key, o["lemma"]))
        for g in s.get("grammar") or []:
            norm = g.get("norm_pattern")
            if norm and ("grammar", norm) not in have and ("grammar", norm) not in seen_local:
                seen_local.add(("grammar", norm))
                wanted.append(("grammar", norm, f"gramer: {label_of(norm)}"))

    if not wanted:
        print("  [B3] yeni ornek gerekmiyor.")
        return

    made = 0
    for i in range(0, len(wanted), 10):  # 10'lu gruplar
        batch = wanted[i:i + 10]
        got = llm_examples(client, [(k, hint) for (_t, k, hint) in batch])
        for (otype, key, _hint) in batch:
            for ex in (got.get(key) or [])[:EXAMPLES_PER_ITEM]:
                en = (ex.get("en") or "").strip()
                if not en:
                    continue
                data.append({
                    "owner_type": otype, "owner_key": key, "text_en": en,
                    "text_tr": (ex.get("tr") or "").strip() or None,
                    "cefr": ex.get("cefr"),
                })
                made += 1

    with open(GLOBAL_EX, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  [B3] {len(wanted)} oge icin {made} ornek uretildi (_examples.json).")


# --------------------------------------------------------------------------
# reclean: spaCy'siz goc (eski per-ders lexicon -> global model)
# --------------------------------------------------------------------------
def reclean(lesson_id, lexmap):
    base = os.path.join(LESSON_DIR, lesson_id)
    L = load_json(base + ".json")
    if not L:
        print(f"[{lesson_id}] json yok.")
        return
    # eski per-ders lexicon'u global'e katr (icerik + LEMMA_FIX + anlam birlestir)
    for x in (L.get("lexicon") or []):
        pos = x.get("pos")
        if pos not in CONTENT_POS:
            continue
        lemma = LEMMA_FIX.get(x["lemma"], x["lemma"])
        e = lexmap.setdefault((lemma, pos), {"cefr": x.get("cefr"), "senses": []})
        if not e["cefr"] and x.get("cefr"):
            e["cefr"] = x.get("cefr")
        for s in x.get("senses") or []:
            if s["gloss_tr"] not in e["senses"]:
                e["senses"].append(s["gloss_tr"])
    # Lemma -> aday pos'lar (anlami olan pos'u tercih ederek tek pos sec). Eski
    # occurrence'larda pos yok; global sozlukten (lemma,pos) geri atanir.
    by_lemma = {}
    for (lemma, pos), v in lexmap.items():
        by_lemma.setdefault(lemma, []).append((pos, len(v["senses"])))

    def pick_pos(lemma):
        cands = by_lemma.get(lemma)
        if not cands:
            return None
        return sorted(cands, key=lambda x: -x[1])[0][0]  # en cok anlamli pos

    # occurrence'lari icerik + LEMMA_FIX'e gore suz; pos ata; sense_idx'i null'a al.
    kept = 0
    for s in L["sentences"]:
        new = []
        for o in s.get("occurrences") or []:
            lemma = LEMMA_FIX.get(o["lemma"], o["lemma"])
            pos = o.get("pos") or pick_pos(lemma)
            if pos is None or pos not in CONTENT_POS:
                continue
            o["lemma"], o["pos"], o["sense_idx"] = lemma, pos, None
            new.append(o)
        s["occurrences"] = new
        kept += len(new)
    L.pop("lexicon", None)
    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump(L, f, ensure_ascii=False, indent=2)
    print(f"[{lesson_id}] reclean -> occ {kept} (icerik).")


def all_ids():
    return [f[:-5] for f in os.listdir(LESSON_DIR)
            if f.endswith(".json") and not f.endswith(".words.json")
            and not f.endswith(".glossary.json") and not f.startswith("_")]


def main():
    ids = sys.argv[1:]
    if ids and ids[0] == "--reclean":
        lexmap = load_lexmap()
        for lid in (ids[1:] or all_ids()):
            reclean(lid, lexmap)
        out = save_lexmap(lexmap)
        print(f"global sozluk yazildi: {len(out)} kok.")
        return
    client = llm_client()
    for lid in (ids or all_ids()):
        process(lid, client)


if __name__ == "__main__":
    main()
