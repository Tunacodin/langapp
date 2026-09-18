# -*- coding: utf-8 -*-
# ZENGINLESTIRME HATTI (ingest.py'den SONRA calisir).
# Girdi (her id icin):
#   assets/lessons/<id>.json          (cumleler: text_en/text_tr/chunks; lexicon BOS)
#   assets/lessons/<id>.words.json    (duz kelime + zaman damgasi)
#   assets/lessons/<id>.glossary.json (opsiyonel; surface->TR anlam, cevrimdisi kaynak)
# Cikti (ayni dosyalara yazar):
#   <id>.json'a       -> lexicon + her cumleye occurrences + grammar (norm_pattern/span)
#   <id>.words.json'a -> her kelimeye lemma + pos
#
# Iki katman:
#   A KATMANI (spaCy, ZORUNLU): POS + lemma; yuksek-kesinlikli 9 kalip regex/POS ile,
#            span_start/span_end (text_en icinde karakter araligi) ile isaretlenir.
#   B KATMANI (LLM, OPSIYONEL): API anahtari VARSA yapisal kaliplar (Noun/Relative
#            Clause, Embedded WH, Conditional, Gerund/Inf, Causative) tespit edilip
#            grammar_topics enum'u ile SUZULUR; ayrica WSD (o baglamdaki sense_idx) ve
#            eksik TR anlamlar doldurulur. Anahtar YOKSA script cokmeden A ile biter.
#
# Kullanim:
#   python scripts/build_corpus.py            # tum dersler
#   python scripts/build_corpus.py lesson1    # tek id
#   ANTHROPIC_API_KEY=... python scripts/build_corpus.py   # B katmani da acik

import json
import os
import re
import sys

from grammar_topics import VALID, LAYER_B, label_of, cefr_of

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON_DIR = os.path.join(ROOT, "assets", "lessons")

_NLP = None


def nlp():
    """spaCy modelini bir kez yukle. Yoksa net kurulum mesaji ver ve cik."""
    global _NLP
    if _NLP is not None:
        return _NLP
    try:
        import spacy
    except ImportError:
        sys.exit(
            "spaCy gerekli (A katmani). Kur:\n"
            "  pip install spacy\n"
            "  python -m spacy download en_core_web_sm"
        )
    try:
        _NLP = spacy.load("en_core_web_sm")
    except OSError:
        sys.exit("Model yok. Kur: python -m spacy download en_core_web_sm")
    return _NLP


def clean(s):
    return re.sub(r"[^a-z']", "", s.lower())


# --------------------------------------------------------------------------
# A KATMANI: spaCy POS/lemma + yuksek-kesinlikli gramer kaliplari
# --------------------------------------------------------------------------
def _span(tokens):
    """Token listesinden (text_en icinde) karakter araligi."""
    a = min(t.idx for t in tokens)
    b = max(t.idx + len(t.text) for t in tokens)
    return a, b


def detect_grammar_a(doc):
    """spaCy Doc -> [(norm_pattern, span_start, span_end)] (A katmani, kesin olanlar)."""
    out = []
    seen = set()

    def add(norm, toks):
        toks = [t for t in toks if t is not None]
        if not toks:
            return
        a, b = _span(toks)
        key = (norm, a, b)
        if key in seen:
            return
        seen.add(key)
        out.append((norm, a, b))

    for tok in doc:
        tag = tok.tag_
        lemma = tok.lemma_.lower()

        # PHRASAL_VERB: fiil + particle (dep=prt)
        if tok.dep_ == "prt" and tok.head.pos_ in ("VERB", "AUX"):
            add("PHRASAL_VERB", [tok.head, tok])

        # MODAL_VERB / FUTURE_FORM: modal (MD)
        if tag == "MD":
            head = tok.head if tok.head.pos_ == "VERB" else None
            if tok.text.lower() in ("will", "'ll", "wo"):  # wo(n't)
                add("FUTURE_FORM", [tok, head])
            else:
                add("MODAL_VERB", [tok, head])

        # FUTURE_FORM: going to + VB
        if lemma == "go" and tag == "VBG":
            nxt = doc[tok.i + 1] if tok.i + 1 < len(doc) else None
            if nxt is not None and nxt.text.lower() == "to":
                vb = doc[tok.i + 2] if tok.i + 2 < len(doc) else None
                add("FUTURE_FORM", [tok, nxt, vb if (vb is not None and vb.tag_ == "VB") else None])

        # be/have yardimci fiiller uzerinden bilesik zamanlar
        if tok.pos_ == "AUX" or lemma in ("be", "have"):
            vb = tok.head if tok.head is not tok else None
            if vb is None:
                continue
            low = tok.text.lower()
            if lemma == "be" and vb.tag_ == "VBG":
                if low in ("is", "am", "are", "'s", "'m", "'re"):
                    add("PRESENT_CONTINUOUS", [tok, vb])
                elif low in ("was", "were"):
                    add("PAST_CONTINUOUS", [tok, vb])
            if lemma == "have" and vb.tag_ == "VBN" and low in ("have", "has", "'ve", "'s"):
                add("PRESENT_PERFECT", [tok, vb])
            if lemma == "be" and vb.tag_ == "VBN":
                add("PASSIVE_VOICE", [tok, vb])

    # PASSIVE_VOICE (dep tabanli yedek): nsubjpass/auxpass
    for tok in doc:
        if tok.dep_ in ("nsubjpass", "auxpass"):
            head = tok.head
            aux = [t for t in head.children if t.dep_ == "auxpass"]
            add("PASSIVE_VOICE", [head] + aux)

    # Basit zamanlar: bilesik yapilara girmemis kok fiiller
    covered = {(a, b) for _, a, b in out}
    for tok in doc:
        if tok.pos_ != "VERB":
            continue
        a, b = tok.idx, tok.idx + len(tok.text)
        if any(a >= s and b <= e for s, e in covered):
            continue
        if tok.tag_ == "VBD":
            add("PAST_SIMPLE", [tok])
        elif tok.tag_ in ("VBZ", "VBP"):
            add("PRESENT_SIMPLE", [tok])

    return out


def align_timing(sent_words, doc):
    """spaCy alpha token'larini words.json zaman damgalariyla sirayla eslestir.
    Donen: token.i -> (start_ms, end_ms). Eslesmezse yok."""
    timing = {}
    j = 0
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
# B KATMANI: LLM (opsiyonel, graceful fallback)
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


def llm_enrich_sentence(client, text_en, lemmas):
    """Bir cumle icin yapisal gramer + WSD + eksik TR anlam iste. Hata olursa None."""
    prompt = (
        "You analyze one English sentence for a Turkish language-learning app.\n"
        f'Sentence: "{text_en}"\n'
        f"Lemmas present: {lemmas}\n\n"
        "Return ONLY minified JSON with keys:\n"
        '  "grammar": array of {"norm_pattern","span_start","span_end"} where '
        f"norm_pattern is one of [{_LAYER_B_LIST}] and span_* are character offsets "
        "into the sentence for the structure. Only include patterns truly present.\n"
        '  "senses": object mapping each lemma to a short Turkish gloss (1-4 words) '
        "for its meaning IN THIS sentence.\n"
        "No prose, no code fences."
    )
    try:
        msg = client.messages.create(
            model=LLM_MODEL,
            max_tokens=700,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()
        raw = re.sub(r"^```(?:json)?|```$", "", raw).strip()
        return json.loads(raw)
    except Exception as e:  # anahtar var ama cagri/parse patladi: cumleyi atla, surme.
        print(f"  [B] atlandi ({type(e).__name__})")
        return None


# --------------------------------------------------------------------------
# Ders isleme
# --------------------------------------------------------------------------
def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def sentence_words(words_flat, start_ms, next_start):
    """Cumleye ait duz kelimeler (orta-nokta kurali)."""
    res = []
    for w in words_flat:
        mid = (w["start_ms"] + w["end_ms"]) / 2
        if mid >= start_ms and (next_start is None or mid < next_start):
            res.append(w)
    return res


def process(lesson_id, client):
    base = os.path.join(LESSON_DIR, lesson_id)
    lesson = load_json(base + ".json")
    words_flat = load_json(base + ".words.json", [])
    glossary = load_json(base + ".glossary.json", {}) or {}
    if lesson is None:
        print(f"[{lesson_id}] {base}.json yok, atlaniyor.")
        return
    print(f"[{lesson_id}] {len(lesson['sentences'])} cumle "
          f"(B katmani: {'acik' if client else 'kapali'})")

    model = nlp()
    sents = sorted(lesson["sentences"], key=lambda s: s["start_ms"])

    # lexicon: (lemma,pos) -> {cefr, senses: {gloss_tr: sense_idx}}
    lex = {}

    def ensure(lemma, pos):
        k = (lemma, pos)
        if k not in lex:
            lex[k] = {"cefr": None, "senses": {}}
        return lex[k]

    def add_sense(lemma, pos, gloss_tr):
        e = ensure(lemma, pos)
        if gloss_tr and gloss_tr not in e["senses"]:
            e["senses"][gloss_tr] = len(e["senses"])
        return e["senses"].get(gloss_tr) if gloss_tr else None

    for si, s in enumerate(sents):
        next_start = sents[si + 1]["start_ms"] if si + 1 < len(sents) else None
        sw = sentence_words(words_flat, s["start_ms"], next_start)
        doc = model(s["text_en"])
        timing = align_timing(sw, doc)

        # --- A: lemma/pos + occurrences + cevrimdisi TR anlam ---
        occurrences = []
        lemmas_here = []
        for t in doc:
            if not (t.is_alpha or "'" in t.text):
                continue
            surface = clean(t.text)
            if not surface:
                continue
            lemma = t.lemma_.lower() if t.lemma_ not in ("-PRON-", "") else surface
            pos = t.pos_
            lemmas_here.append(lemma)
            e = ensure(lemma, pos)
            g = glossary.get(surface) or glossary.get(lemma)
            if g:
                if g.get("cefr") and not e["cefr"]:
                    e["cefr"] = g["cefr"]
                for gl in g.get("senses", []):
                    add_sense(lemma, pos, gl)
            st, en = timing.get(t.i, (s["start_ms"], s["end_ms"]))
            occurrences.append({
                "surface": surface, "lemma": lemma, "_pos": pos,
                "sense_idx": None, "start_ms": st, "end_ms": en,
            })
            if t.i in timing:
                for w in sw:
                    if clean(w["w"]) == surface and "lemma" not in w:
                        w["lemma"], w["pos"] = lemma, pos
                        break

        # --- A: gramer kaliplari ---
        grammar = list(s.get("grammar") or [])  # curated notlari koru
        for norm, a, b in detect_grammar_a(doc):
            grammar.append({
                "pattern": s["text_en"][a:b],
                "note_tr": label_of(norm),
                "cefr": cefr_of(norm),
                "norm_pattern": norm,
                "span_start": a, "span_end": b,
            })

        # --- B: LLM (opsiyonel) ---
        if client:
            data = llm_enrich_sentence(client, s["text_en"], sorted(set(lemmas_here)))
            if data:
                for gi in data.get("grammar", []):
                    norm = gi.get("norm_pattern")
                    if norm in VALID and norm in LAYER_B:
                        a = gi.get("span_start")
                        b = gi.get("span_end")
                        frag = s["text_en"][a:b] if isinstance(a, int) and isinstance(b, int) else norm
                        grammar.append({
                            "pattern": frag or norm, "note_tr": label_of(norm),
                            "cefr": cefr_of(norm), "norm_pattern": norm,
                            "span_start": a, "span_end": b,
                        })
                senses_map = data.get("senses", {}) or {}
                for occ in occurrences:
                    gl = senses_map.get(occ["lemma"])
                    if gl:
                        occ["sense_idx"] = add_sense(occ["lemma"], occ["_pos"], gl)

        for occ in occurrences:
            occ.pop("_pos", None)
        s["occurrences"] = occurrences
        s["grammar"] = grammar

    # lexicon'u derse yaz
    lexicon_out = []
    for (lemma, pos), v in sorted(lex.items()):
        senses = [{"sense_idx": i, "gloss_tr": g}
                  for g, i in sorted(v["senses"].items(), key=lambda kv: kv[1])]
        lexicon_out.append({"lemma": lemma, "pos": pos, "cefr": v["cefr"], "senses": senses})
    lesson["lexicon"] = lexicon_out

    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump(lesson, f, ensure_ascii=False, indent=2)
    with open(base + ".words.json", "w", encoding="utf-8") as f:
        json.dump(words_flat, f, ensure_ascii=False, indent=2)

    n_sense = sum(len(e["senses"]) for e in lexicon_out)
    print(f"  -> lexicon {len(lexicon_out)} kok, {n_sense} anlam; words.json guncellendi.")


def main():
    ids = sys.argv[1:]
    if not ids:
        ids = [f[:-5] for f in os.listdir(LESSON_DIR)
               if f.endswith(".json")
               and not f.endswith(".words.json")
               and not f.endswith(".glossary.json")]
    client = llm_client()
    for lid in ids:
        process(lid, client)


if __name__ == "__main__":
    main()
