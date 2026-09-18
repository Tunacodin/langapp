# -*- coding: utf-8 -*-
# Yerel video/ses dosyasini faster-whisper ile cumle+zaman damgasina cevirir.
# Kullanim: python scripts/transcribe.py assets/videos/lesson1.mp4
import json
import sys

from faster_whisper import WhisperModel

path = sys.argv[1] if len(sys.argv) > 1 else "assets/videos/lesson1.mp4"

# base.en: Ingilizce, hizli, ~145MB. int8: CPU'da hafif.
model = WhisperModel("base.en", device="cpu", compute_type="int8")
segments, info = model.transcribe(path, language="en", vad_filter=True, word_timestamps=True)

out = []
flat_words = []  # tum kelimeler, mutlak zamanli (idx bagimsiz)
for i, s in enumerate(segments):
    text = s.text.strip()
    if not text:
        continue
    out.append({"idx": i, "start_ms": int(s.start * 1000), "end_ms": int(s.end * 1000), "text_en": text})
    for w in (s.words or []):
        ww = w.word.strip()
        if ww:
            flat_words.append({"w": ww, "start_ms": int(w.start * 1000), "end_ms": int(w.end * 1000)})

with open("scripts/out/lesson1_transcript.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
with open("assets/lessons/lesson1.words.json", "w", encoding="utf-8") as f:
    json.dump(flat_words, f, ensure_ascii=False, indent=2)

print(f"cumle: {len(out)} | toplam kelime: {len(flat_words)}")
print("ilk 10 kelime:", flat_words[:10])
print("yazildi: transcript + assets/lessons/lesson1.words.json (flat)")
