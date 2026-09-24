# -*- coding: utf-8 -*-
# Sarki verisi (metin + ZAMAN + Turkce) lrclib.net'ten. Whisper YERINE bunu kullan:
# lrclib senkron sozleri ([mm:ss.xx] satir zaman damgasi) ucretsiz/anahtarsiz verir,
# metin dogru (whisper sozu yanlis duyuyordu), Turkce cevirisi de kolay.
#
# Ses (m4a) ve kapak (jpg) ayrica indirilir (bkz. ingest_songs.py). Bu script yalniz
# sozleri + zamani + ceviriyi uretir: assets/lessons/<id>.song.json
#
# Kullanim:
#   python scripts/fetch_lyrics.py               # songs.json'daki hepsi
#   python scripts/fetch_lyrics.py gotye_used_to # tek sarki
#   python scripts/fetch_lyrics.py --no-tr       # ceviriyi atla (offline/hizli)
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON_DIR = os.path.join(ROOT, "assets", "lessons")
SONGS = os.path.join(ROOT, "scripts", "songs.json")

LRC_LINE = re.compile(r"\[(\d+):(\d+)(?:\.(\d+))?\]\s*(.*)")


def norm(s):
    # Kasilmalari ac (should've -> should have) ki hem eslesme hem cloze tutarli olsun.
    s = s.lower()
    s = s.replace("'ve", " have").replace("'re", " are").replace("'d", " would")
    s = s.replace("'ll", " will").replace("n't", " not").replace("'m", " am")
    return re.sub(r"[^a-z0-9 ]", " ", s).replace("  ", " ").strip()


def lrclib_get(artist, title):
    q = urllib.parse.urlencode({"artist_name": artist, "track_name": title})
    req = urllib.request.Request(
        "https://lrclib.net/api/get?" + q,
        headers={"User-Agent": "langapp-dev/0.1 (personal study)"},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def parse_lrc(synced):
    # [(ms, text)] - musik notasi / bos satirlari at.
    out = []
    for line in synced.splitlines():
        m = LRC_LINE.match(line)
        if not m:
            continue
        mm, ss, cs, text = m.groups()
        text = (text or "").strip().replace("♪", "").strip()
        if not text:
            continue
        ms = int(mm) * 60000 + int(ss) * 1000 + int((cs or "0").ljust(3, "0")[:3])
        out.append((ms, text))
    return out


# --- Turkce ceviri: once YEREL sozluk (lyrics_tr.json, elle yazilmis, dogru TDK),
# yoksa ag cevirisi (fill_tr.py ile ayni saglayici sirasi). Yerel sozluk her zaman
# oncelikli; ag sadece bilinmeyen satir icin yedek. --no-tr agi kapatir.
_LOCAL_TR = {}
_lt = os.path.join(ROOT, "scripts", "lyrics_tr.json")
if os.path.exists(_lt):
    with open(_lt, encoding="utf-8") as _f:
        _LOCAL_TR = json.load(_f)

_tr_cache = {}
_mm = _gg = None


def translate(text, enabled):
    if not text.strip():
        return ""
    if text in _LOCAL_TR:
        return _LOCAL_TR[text]
    if not enabled:
        return ""
    if text in _tr_cache:
        return _tr_cache[text]
    global _mm, _gg
    if _mm is None:
        from deep_translator import GoogleTranslator, MyMemoryTranslator
        _mm = MyMemoryTranslator(source="en-GB", target="tr-TR")
        _gg = GoogleTranslator(source="en", target="tr")
    out = ""
    for attempt in range(3):
        try:
            out = _mm.translate(text)
            break
        except Exception:
            try:
                out = _gg.translate(text)
                break
            except Exception:
                time.sleep(1.5 * (attempt + 1))
    _tr_cache[text] = out or ""
    time.sleep(0.2)
    return _tr_cache[text]


def find_target(lines, target_line):
    # Hedef satiri sec: once en yuksek kapsama (target token'larinin kaci var),
    # esitlikte hedefe en YAKIN uzunluktaki (en temiz) satir, sonra en ERKEN.
    # Boylece tekrar eden/parantezli uzun satirlar yerine temiz ilk satir secilir.
    tgt = norm(target_line).split()
    tgt_set = set(tgt)
    best_i, best_key = 0, None
    for i, (_, text) in enumerate(lines):
        toks = norm(text).split()
        if not toks:
            continue
        cover = sum(1 for t in tgt_set if t in toks) / max(len(tgt_set), 1)
        key = (round(cover, 3), -abs(len(toks) - len(tgt)), -i)
        if best_key is None or key > best_key:
            best_key, best_i = key, i
    cover = best_key[0] if best_key else 0.0
    return best_i, cover


def build(src, tr_enabled):
    d = lrclib_get(src["artist"], src["title"])
    synced = d.get("syncedLyrics") or ""
    if not synced:
        raise RuntimeError("senkron soz yok (yalniz plainLyrics)")
    lines = parse_lrc(synced)
    if not lines:
        raise RuntimeError("LRC parse edilemedi")

    i, conf = find_target(lines, src["target_line"])
    target_ms, target_text = lines[i]
    dur_ms = int((d.get("duration") or 0) * 1000)

    # TUM sarki (kesme YOK): her satir zaman damgasiyla saklanir; uygulama calarken
    # aktif satiri/kelimeyi takip eder. end_ms = bir sonraki satirin baslangici.
    lyrics_data = []
    for j, (ms, text) in enumerate(lines):
        end_ms = lines[j + 1][0] if j + 1 < len(lines) else (dur_ms or ms + 4000)
        lyrics_data.append({
            "time_start_ms": ms,
            "end_ms": end_ms,
            "text": text,
            "text_tr": translate(text, tr_enabled),
            "is_target": j == i,
        })
    next_ms = lyrics_data[i]["end_ms"]

    return {
        "clip_id": src["id"],
        "song_title": src["title"],
        "artist": src["artist"],
        "media_file": f"songs/{src['id']}.m4a",
        "focus_tag": src["focus_tag"],
        "norm_pattern": src["norm_pattern"],
        "cefr": src["cefr"],
        "exercise": src.get("exercise", "cloze"),
        "duration_ms": dur_ms,
        "target_line": target_text,           # GERCEK sung satir (lrclib)
        "target_line_tr": translate(target_text, tr_enabled),
        "cloze_answer": src["cloze_answer"],
        "hint_tr": src["hint_tr"],
        "target_index": i,                    # lyrics_data icindeki hedef satir
        "line_start_ms": target_ms,
        "line_end_ms": next_ms,
        "match_confidence": round(conf, 2),
        "lyrics_data": lyrics_data,
        "source": "lrclib",
        "lrclib_id": d.get("id"),
    }


def main():
    with open(SONGS, encoding="utf-8") as f:
        songs = json.load(f)
    tr_enabled = "--no-tr" not in sys.argv
    pos = [a for a in sys.argv[1:] if not a.startswith("--")]
    if pos:
        songs = [s for s in songs if s["id"] in pos]
    for src in songs:
        print(f"[{src['id']}] {src['artist']} - {src['title']}")
        try:
            clip = build(src, tr_enabled)
            flag = "" if clip["match_confidence"] >= 0.6 else " [GOZDEN GECIR]"
            print(f"  [ok] hedef='{clip['target_line']}' guven={clip['match_confidence']}"
                  f" satir={len(clip['lyrics_data'])} sure={clip['duration_ms']}ms{flag}")
            out = os.path.join(LESSON_DIR, f"{src['id']}.song.json")
            with open(out, "w", encoding="utf-8") as f:
                json.dump(clip, f, ensure_ascii=False, indent=2)
            print(f"  [yaz] {out}")
        except Exception as e:
            print(f"  [HATA] {e}")


if __name__ == "__main__":
    main()
