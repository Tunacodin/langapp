# -*- coding: utf-8 -*-
# Bos text_tr alanlarini anahtarsiz Google ucu (translate.googleapis.com, client=gtx)
# ile doldurur. Cumleler satir satir birlestirilip 30'arli paketlerle cevrilir
# (fill_tr.py'deki MyMemory/deep_translator gunluk kotaya takiliyordu).
# Satir sayisi tutmazsa paket tek tek cevrilir. Yalniz text_tr yazar.
#   python scripts/fill_tr_gtx.py            # tum dersler
#   python scripts/fill_tr_gtx.py davella_sugar
import glob, json, os, sys, time, urllib.parse
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDIR = os.path.join(ROOT, "assets", "lessons")
BATCH = 30


def gtx(text):
    for attempt in range(4):
        try:
            r = requests.post(
                "https://translate.googleapis.com/translate_a/single",
                params={"client": "gtx", "sl": "en", "tl": "tr", "dt": "t"},
                data={"q": text},
                timeout=30,
            )
            r.raise_for_status()
            return "".join(seg[0] for seg in r.json()[0] if seg and seg[0])
        except Exception:
            time.sleep(3 * (attempt + 1))
    return None


def translate_batch(lines):
    out = gtx("\n".join(lines))
    if out is not None:
        parts = [p.strip() for p in out.split("\n")]
        if len(parts) == len(lines):
            return parts
    return [(gtx(l) or "").strip() for l in lines]


def main():
    only = set(sys.argv[1:])
    total = 0
    for p in sorted(glob.glob(os.path.join(LDIR, "*.json"))):
        b = os.path.basename(p)
        if b.startswith("_") or b.count(".") > 1:
            continue
        mid = b[:-5]
        if only and mid not in only:
            continue
        L = json.load(open(p, encoding="utf-8"))
        todo = [s for s in L.get("sentences", []) if s.get("text_en", "").strip() and not s.get("text_tr")]
        if not todo:
            continue
        for i in range(0, len(todo), BATCH):
            chunk = todo[i : i + BATCH]
            res = translate_batch([s["text_en"].replace("\n", " ").strip() for s in chunk])
            for s, tr in zip(chunk, res):
                if tr:
                    s["text_tr"] = tr
            time.sleep(1)
        json.dump(L, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        done = sum(1 for s in todo if s.get("text_tr"))
        total += done
        print(f"{mid}: {done}/{len(todo)}", flush=True)
    print("TOPLAM", total)


if __name__ == "__main__":
    main()
