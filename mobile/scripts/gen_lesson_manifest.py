# -*- coding: utf-8 -*-
# assets/lessons klasorunu tarar; TUM gercek dersleri app'e sokacak manifest'i uretir.
# Metro require STATIK olmali; bu yuzden dinamik tarama yerine bir kez tarayip
# statik require satirlari olan .ts dosyalari YAZARIZ. Yeni ders eklenince tekrar calistir:
#   python scripts/gen_lesson_manifest.py
#
# Uretilenler:
#   src/lib/lessonManifest.ts  -> ALL_LESSONS (her ders json'u) + UNIT_BY_MEDIA
#   src/lib/lessonAssets.ts    -> LESSON_WORDS + LESSON_GLOSSARY (var olan dosyalar icin)
#
# Kural: .song.json ve _ ile baslayanlar HARIC. Sadece {sentences, video_id} sekilli dersler.
import json, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDIR = os.path.join(ROOT, "assets", "lessons")
SRC = os.path.join(ROOT, "src", "lib")
SOURCES = os.path.join(ROOT, "scripts", "sources.json")

unit_by_media = {}
try:
    for s in json.load(open(SOURCES, encoding="utf-8")):
        if s.get("unit"):
            unit_by_media[s["id"]] = int(s["unit"])
except Exception:
    pass
# sources.json'dan once eklenmis (orada kaydi olmayan) videolarin unitesi: konu +
# baskin gramer odagina gore elle secildi.
UNIT_OVERRIDES = {
    "ted_procrast": 2,       # erteleme aliskanligi -> Gunluk yasam & aliskanliklar
    "neistat_vlog": 3,       # ada gezisi vlogu -> Seyahat
    "tifo_clubs_money": 5,   # kulup ekonomisi -> Is & kariyer (BUSINESS/FINANCE)
    "lesson1": 7,            # Duck and Cover: kurallar, must -> Cevre & zorunluluk
    "hitc_risefall": 8,      # kulup hikayesi, cok passive/relative -> Eglence
    "skysports_micd": 8,     # futbolcu eglence videosu -> Eglence
}
for k, v in UNIT_OVERRIDES.items():
    unit_by_media.setdefault(k, v)

lessons, words, gloss, skipped = [], [], [], []
for p in sorted(glob.glob(os.path.join(LDIR, "*.json"))):
    b = os.path.basename(p)
    if b.startswith("_"):
        continue
    vid = b[:-5]  # ".json"
    if vid.endswith(".song") or vid.endswith(".words") or vid.endswith(".glossary"):
        continue
    try:
        data = json.load(open(p, encoding="utf-8"))
    except Exception as e:
        skipped.append((vid, f"okunamadi: {e}"))
        continue
    if not isinstance(data, dict) or "sentences" not in data or not isinstance(data["sentences"], list):
        skipped.append((vid, "sentences yok"))
        continue
    if not data.get("video_id"):
        skipped.append((vid, "video_id yok"))
        continue
    lessons.append(vid)
    if os.path.exists(os.path.join(LDIR, f"{vid}.words.json")):
        words.append(vid)
    if os.path.exists(os.path.join(LDIR, f"{vid}.glossary.json")):
        gloss.append(vid)

# unite -> id sirasi (okunurluk), unite yoksa sona
lessons.sort(key=lambda v: (unit_by_media.get(v, 99), v))

def req(vid, kind):
    suf = {"json": "", "words": ".words", "gloss": ".glossary"}[kind]
    return f"require('../../assets/lessons/{vid}{suf}.json')"

# --- lessonManifest.ts ---
mlines = [
    "// UYARI: OTOMATIK URETILDI (scripts/gen_lesson_manifest.py). ELLE DUZENLEME.",
    "// assets/lessons taranarak uretilir; yeni ders ekleyince generator'i tekrar calistir.",
    "import type { Lesson } from './db';",
    "",
    "// Tum dersler (cumle bazli gramer/kelime app veritabanina buradan girer).",
    "export const ALL_LESSONS: Lesson[] = [",
]
for vid in lessons:
    mlines.append(f"  {req(vid,'json')} as Lesson,")
mlines.append("];")
mlines.append("")
mlines.append("// media_id -> unite no (sources.json'dan). Topic/unite gruplamasi icin.")
mlines.append("export const UNIT_BY_MEDIA: Record<string, number> = {")
for vid in lessons:
    if vid in unit_by_media:
        mlines.append(f"  {vid}: {unit_by_media[vid]},")
mlines.append("};")
mlines.append("")
# Gomulu videolar (LOCAL): assets/videos'taki her mp4 -> require. videoSource bunu kullanir.
vids = sorted(os.path.basename(p)[:-4] for p in glob.glob(os.path.join(ROOT, "assets", "videos", "*.mp4")))
mlines.append("// LOCAL gomulu videolar. Dev'de Metro servis eder; standalone build'de boyut buyur.")
mlines.append("export const VIDEO_MODULES: Record<string, number> = {")
for vid in vids:
    mlines.append(f"  {vid}: require('../../assets/videos/{vid}.mp4'),")
mlines.append("};")
mlines.append("")
open(os.path.join(SRC, "lessonManifest.ts"), "w", encoding="utf-8").write("\n".join(mlines))

# --- lessonAssets.ts (yeniden uret) ---
alines = [
    "// UYARI: OTOMATIK URETILDI (scripts/gen_lesson_manifest.py). ELLE DUZENLEME.",
    "// Ders basina STATIK varliklar: kelime zaman damgalari (words) + sozluk (glossary).",
    "// Glossary yalniz LLM (Layer B) calisan derslerde vardir; digerleri icin yoktur (opsiyonel).",
    "",
    "export type TWord = { w: string; start_ms: number; end_ms: number; lemma?: string; pos?: string };",
    "export type Gloss = { pos: string; cefr: string; senses: string[] };",
    "",
    "export const LESSON_WORDS: Record<string, TWord[]> = {",
]
for vid in words:
    alines.append(f"  {vid}: {req(vid,'words')},")
alines.append("};")
alines.append("")
alines.append("export const LESSON_GLOSSARY: Record<string, Record<string, Gloss>> = {")
for vid in gloss:
    alines.append(f"  {vid}: {req(vid,'gloss')},")
alines.append("};")
alines.append("")
open(os.path.join(SRC, "lessonAssets.ts"), "w", encoding="utf-8").write("\n".join(alines))

print(f"dersler: {len(lessons)} | words: {len(words)} | glossary: {len(gloss)}")
print("dersler:", ", ".join(lessons))
if skipped:
    print("atlananlar:")
    for v, r in skipped:
        print(f"  {v}: {r}")
