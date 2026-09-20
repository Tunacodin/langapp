# -*- coding: utf-8 -*-
"""Deterministik (Layer-A) gramer tespiti - YENI taksonomi (topics.json).
TEK KAYNAK: hem build_corpus.py hem retag_grammar.py buradan `detect_grammar_a`
kullanir. spaCy Doc alir, [(norm_pattern, span_start, span_end)] dondurur.
LLM'e (Layer-B) gerek yok; yapisal kaliplar bagimlilik ayristirmasiyla bulunur.
"""
from grammar_topics import VALID

MODALS_V1 = {"could", "would", "should", "can", "may", "might", "must"}
WH = {"what", "where", "when", "why", "how", "who", "whom", "whose", "which", "whether"}
# Rapor/zihinsel fiiller: bunlardan sonra gelen WH-yan cumle = embedded_wh_question.
REPORTING = {
    "know", "wonder", "ask", "tell", "understand", "remember", "see", "explain",
    "decide", "imagine", "realize", "realise", "forget", "guess", "figure", "learn",
    "notice", "show", "find", "say", "think", "mean", "care", "matter",
}
# Sozcuksel kumeler (Layer-A): miktar belirtec + siklik zarflari.
QUANT = {"some", "any", "much", "many", "several", "few", "little", "enough", "all", "most", "couple"}
FREQ = {"always", "usually", "often", "sometimes", "rarely", "seldom", "never",
        "frequently", "occasionally", "normally", "generally", "hardly", "regularly", "constantly"}


def _clean(t):
    return t.text.lower().strip("'").strip()


def _span(toks):
    toks = [t for t in toks if t is not None]
    a = min(t.idx for t in toks)
    b = max(t.idx + len(t.text) for t in toks)
    return a, b


def detect_grammar_a(doc):
    """[(norm_pattern, span_start, span_end)] - yeni taksonomi."""
    out, seen = [], set()

    def add(norm, toks):
        toks = [t for t in toks if t is not None]
        if not toks or norm not in VALID:
            return
        a, b = _span(toks)
        if (norm, a, b) in seen:
            return
        seen.add((norm, a, b))
        out.append((norm, a, b))

    covered = []  # (a,b) - basit gecmis geri dusumunu bastirmak icin

    # --- 1) Fiil kumeleri: (modal)-perfect / past-perfect / past-continuous
    for tok in doc:
        if tok.tag_ == "VBN" and tok.pos_ in ("VERB", "AUX"):
            auxes = [c for c in tok.children if c.dep_ in ("aux", "auxpass")]
            texts = {_clean(c) for c in auxes}
            lemmas = {c.lemma_.lower() for c in auxes}
            has_be = "be" in lemmas  # be + V3 = passive -> yeni taksonomide YOK
            modal = None
            for c in auxes:
                if c.tag_ == "MD" and _clean(c) in ("should", "could", "would"):
                    modal = _clean(c)
            has_have = ("have" in lemmas) or ("ve" in texts)
            had = any(c.lemma_ == "have" and _clean(c) in ("had", "d") for c in auxes)

            if modal and has_have:
                norm = {"should": "should_have_v3", "could": "could_have_v3",
                        "would": "would_have_v3"}[modal]
                add(norm, auxes + [tok])
                covered.append(_span(auxes + [tok]))
                continue
            if had:
                add("past_perfect_had_v3", auxes + [tok])
                covered.append(_span(auxes + [tok]))
                continue
            if has_have and not has_be:
                add("present_perfect_have_v3", auxes + [tok])
                covered.append(_span(auxes + [tok]))
                continue
            if has_be:  # be + V3 = edilgen cati
                add("passive_voice", auxes + [tok])
                covered.append(_span(auxes + [tok]))
                continue

        if tok.tag_ == "VBG" and tok.pos_ in ("VERB", "AUX"):
            auxes = [c for c in tok.children if c.dep_ in ("aux", "auxpass")]
            be_now = any(c.lemma_ == "be" and _clean(c) in ("is", "am", "are", "s", "m", "re") for c in auxes)
            be_past = any(c.lemma_ == "be" and _clean(c) in ("was", "were") for c in auxes)
            nxt = doc[tok.i + 1] if tok.i + 1 < len(doc) else None
            nxt2 = doc[tok.i + 2] if tok.i + 2 < len(doc) else None
            # "going to + V1" = future_going_to (present_continuous'tan ONCE)
            if tok.lemma_ == "go" and nxt is not None and _clean(nxt) == "to" and nxt2 is not None and nxt2.tag_ == "VB":
                toks = auxes + [tok, nxt, nxt2]
                add("future_going_to", toks)
                covered.append(_span(toks))
            elif be_past:
                add("past_continuous_was_ving", auxes + [tok])
                covered.append(_span(auxes + [tok]))
            elif be_now:
                add("present_continuous", auxes + [tok])
                covered.append(_span(auxes + [tok]))

    # --- 2) modal_v1: could/would/should/can/may/might/must + YALIN fiil (VB)
    # Yalniz bare-infinitive baglar; "I could." (fiilsiz) ve modal-perfect (VBN) haric.
    for tok in doc:
        if tok.tag_ == "MD" and _clean(tok) in MODALS_V1:
            head = tok.head if tok.head.pos_ in ("VERB", "AUX") else None
            if head is None or head.tag_ != "VB":
                continue
            add("modal_v1", [tok, head])

    # --- 2b) future_will: will / 'll + YALIN fiil (VB)
    for tok in doc:
        if tok.tag_ == "MD" and _clean(tok) in ("will", "ll", "wo"):
            head = tok.head if tok.head.pos_ in ("VERB", "AUX") else None
            if head is None or head.tag_ != "VB":
                continue
            add("future_will", [tok, head])

    # --- 2c) used_to: used + to + V1 (edilgen "be used to" degil)
    for tok in doc:
        if _clean(tok) == "used" and tok.tag_ in ("VBD", "VBN"):
            nxt = doc[tok.i + 1] if tok.i + 1 < len(doc) else None
            nxt2 = doc[tok.i + 2] if tok.i + 2 < len(doc) else None
            prev = doc[tok.i - 1] if tok.i > 0 else None
            if (nxt is not None and _clean(nxt) == "to" and nxt2 is not None and nxt2.tag_ == "VB"
                    and not (prev is not None and prev.lemma_ == "be")):
                add("used_to", [tok, nxt, nxt2])
                covered.append(_span([tok, nxt, nxt2]))  # 'used' tekrar simple_past sayilmasin

    # --- 3) Kosul cumleleri (if) + wish
    for tok in doc:
        if tok.lemma_.lower() == "if" and tok.dep_ == "mark":
            cond_verb = tok.head
            # GERCEK kosul yalniz advcl (zarf cumleligi). "I don't know if..." gibi
            # ccomp (= whether) yapilarini kosul SAYMA -> yanlis pozitif azalir.
            if cond_verb.dep_ != "advcl":
                continue
            cond_sub = list(cond_verb.subtree)
            cond_ids = {t.i for t in cond_sub}
            rest = [t for t in doc if t.i not in cond_ids]
            cond_had_v3 = cond_verb.tag_ == "VBN" and any(
                _clean(c) in ("had", "d") for c in cond_verb.children)
            cond_past = cond_verb.tag_ == "VBD" or cond_had_v3
            cond_present = cond_verb.tag_ in ("VBZ", "VBP", "VB")
            main_would = any(t.tag_ == "MD" and _clean(t) == "would" for t in rest)
            main_will = any(t.tag_ == "MD" and _clean(t) in ("will", "ll", "wo") for t in rest)
            main_would_have = main_would and any(t.tag_ == "VBN" for t in rest)
            if cond_had_v3 or main_would_have:
                norm = "if_had_v3_would_have_v3"
            elif cond_past and main_would:
                norm = "if_past_would"
            elif cond_present and main_will:
                norm = "if_type1"
            elif cond_present and not main_will and not main_would:
                norm = "if_type0"  # genel gercek: present / present
            else:
                continue  # belirsiz kalip -> yanlis etiketleme yerine atla
            add(norm, [tok] + cond_sub)

        if tok.lemma_.lower() == "wish" and tok.pos_ == "VERB":
            add("wish_past", list(tok.subtree))

    # --- 4) Yan cumlecikler
    # relative_clause: ACIK ilgi zamiri sart (who/which/that/whom/whose/where/when).
    # Indirgenmis/participial relative'ler (zamir yok) SAYILMAZ -> yanlis pozitif azalir.
    rel_tags = ("WDT", "WP", "WP$", "WRB")
    rel_words = {"who", "whom", "whose", "which", "that", "where", "when"}
    for tok in doc:
        if tok.dep_ == "relcl":
            sub = list(tok.subtree)
            if any(c.tag_ in rel_tags and _clean(c) in rel_words for c in sub):
                add("relative_clause", sub)

    # noun/embedded WH: YALNIZ ccomp (gercek cumlecik nesnesi) + one cekilmis WH.
    # Adverbial when/where/why (advcl) ve relative kullanimlar elenir.
    for tok in doc:
        if tok.tag_ not in ("WP", "WDT", "WRB") or _clean(tok) not in WH:
            continue
        cv = tok.head
        guard = 0
        while cv.pos_ not in ("VERB", "AUX") and cv.head is not cv and guard < 8:
            cv = cv.head
            guard += 1
        if cv.dep_ != "ccomp":
            continue
        sub = list(cv.subtree)
        if not sub or (tok.i - sub[0].i) > 2:
            continue  # WH cumlecigin basinda degilse (fronted degil) atla
        matrix = cv.head
        if matrix.pos_ not in ("VERB", "AUX"):
            continue
        if matrix.lemma_.lower() in REPORTING:
            add("embedded_wh_question", sub)
        else:
            add("noun_clause_wh", sub)

    # --- 5) Basit gecmis (simple_past): kapsanmamis VBD fiiller
    for tok in doc:
        if tok.pos_ != "VERB" or tok.tag_ != "VBD":
            continue
        a, b = tok.idx, tok.idx + len(tok.text)
        if any(a >= s and b <= e for s, e in covered):
            continue
        add("simple_past", [tok])

    # --- 6) present_simple: kapsanmamis VBZ/VBP ana fiiller (kopula 'is/are' AUX -> haric)
    for tok in doc:
        if tok.pos_ != "VERB" or tok.tag_ not in ("VBZ", "VBP"):
            continue
        a, b = tok.idx, tok.idx + len(tok.text)
        if any(a >= s and b <= e for s, e in covered):
            continue
        add("present_simple", [tok])

    # --- 7) Sozcuksel: quantifier + adverb_frequency
    for tok in doc:
        lem = tok.lemma_.lower()
        # quantifier: yalniz bir ismi niteleyen miktar belirteci (bare "all/most" degil).
        if lem in QUANT and tok.pos_ in ("DET", "ADJ", "NUM") and tok.head.pos_ in ("NOUN", "PROPN"):
            add("quantifier", [tok])
        elif lem in FREQ and tok.pos_ == "ADV":
            add("adverb_frequency", [tok])

    return out
