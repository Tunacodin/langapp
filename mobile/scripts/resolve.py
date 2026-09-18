# -*- coding: utf-8 -*-
# sources.json'daki her 'query' icin YouTube'da arar, uygun bir videoyu secer
# ve 'url' alanini doldurur. INDIRME YOK; sadece meta (sure/kanal) toplar.
# Secim kurali: 90sn <= sure <= 25dk (shorts ve uzun yayinlari eler), ilk uygun.
#
# Kullanim: python scripts/resolve.py
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = os.path.join(ROOT, "scripts", "sources.json")

MIN_S, MAX_S = 90, 25 * 60


def search(query, n=6):
    cmd = [
        sys.executable, "-m", "yt_dlp",
        f"ytsearch{n}:{query}",
        "--skip-download", "--no-warnings", "--ignore-errors",
        "--print", "%(id)s\t%(duration)s\t%(title)s\t%(channel)s",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    rows = []
    for line in (r.stdout or "").splitlines():
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        vid, dur, title, channel = parts[0], parts[1], parts[2], parts[3]
        try:
            dur = int(float(dur))
        except (ValueError, TypeError):
            dur = 0
        rows.append({"id": vid, "dur": dur, "title": title, "channel": channel})
    return rows


def pick(rows):
    for r in rows:
        if MIN_S <= r["dur"] <= MAX_S:
            return r
    return rows[0] if rows else None


def main():
    with open(SOURCES, encoding="utf-8") as f:
        srcs = json.load(f)

    for s in srcs:
        if s.get("url") and "REPLACE_ME" not in s["url"]:
            print(f"[{s['id']}] URL zaten var, atlaniyor.")
            continue
        rows = search(s["query"])
        chosen = pick(rows)
        if not chosen:
            print(f"[{s['id']}] SONUC YOK: {s['query']}")
            continue
        s["url"] = f"https://www.youtube.com/watch?v={chosen['id']}"
        mm, ss = divmod(chosen["dur"], 60)
        print(f"[{s['id']}] {mm}:{ss:02d}  {chosen['channel']}  |  {chosen['title'][:60]}")

    with open(SOURCES, "w", encoding="utf-8") as f:
        json.dump(srcs, f, ensure_ascii=False, indent=2)
    print("\nsources.json guncellendi (url alanlari dolduruldu).")


if __name__ == "__main__":
    main()
