# reading_text — elle yapistirilan okuma metinleri

VOA (ve gerekirse BBC/BC) gibi govdesi otomatik cekilemeyen kaynaklar icin
metni buraya yapistir. Bir dosya = bir okuma parcasi.

## Nasil
1. `reading_sources.json` -> `items` icine `source: "paste"` bir kayit ekle
   (`id`, `page_url`, `title`, `cefr`, `topic`).
2. Bu klasore `<id>.txt` adiyla bir dosya ac ve makale GOVDE metnini yapistir.
   - Paragraflari BOS SATIRLA ayir.
   - Sadece govde; baslik/menu/altbilgi koyma.
3. Calistir:
   ```
   python scripts/ingest_reading.py <id> --align
   ```
   Ses (MP3) ve kapak gorseli `page_url`'den otomatik iner; `--align` ile
   Whisper kelime kelime zaman damgasi uretir (karaoke icin).

## Ornek
`voa_health_telefon.txt` <- reading_sources.json'daki ornek kayit.

## Not (telif)
VOA metinleri kamu malidir (bireysel kullanimda serbest). BBC / British
Council telifli; yalniz bireysel/yerel kullanim icin, dagitma.
