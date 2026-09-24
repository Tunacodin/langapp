# LangApp - Odak Kilitli (Focus-Locked) Mimari Kuralları

> Bu dosya, projenin YÖNETEN sözleşmesidir. Dinleme, Konuşma, Okuma, Yazma, Gramer,
> Kelime ile ilgili YAPILAN HER İŞ (yeni ekran, veri, pipeline, içerik) bu kurallara
> uygun mu diye Bölüm 10'daki kontrol listesine göre denetlenir. Uymuyorsa ya kurala
> uyarlanır ya da kuralın neden değiştiği bu dosyada gerekçesiyle yazılır.
>
> Dil: sade Türkçe. Uzun çizgi (—) yasak. Kaynak: Murphy (English in Use), Focus on
> Form (Long), Lexical Approach (Lewis), i+1 (Krashen), bilişsel yük (Sweller).

---

## 0. Amaç

Kullanıcı bir odak (bir gramer konusu = `norm_pattern`) seçer. O andan itibaren TÜM
beceri sekmeleri (Gramer, Kelime, Dinleme, Konuşma, Okuma, Yazma) yalnız o odağın
içeriğini gösterir. Kullanıcı tek konuya kilitlenir, dağılmaz; aynı anda başka bir
ileri yapıyla (ör. odak Past Simple iken `had V3`) karşılaşmaz. Öğrenme kompakt ve
eş zamanlı ilerler.

## 1. Temel İlke: Global Active Focus Node

- Aynı anda EN FAZLA bir aktif odak vardır (`getActiveFocus()` -> `{ key, label }`).
- `key` = `grammar_topics` KAPALI enum'undan bir `norm_pattern`. Serbest metin YASAK.
- Odak varken: her sekmenin üstünde sabit "Odak: X" rozeti (dokun -> o konunun modülü).
- Odak yokken: sekmeler serbest (rozet çizilmez), kullanıcı gezinir ama yönlendirilmez.
- Bir sekme odağa uygun içeriği bulamıyorsa: DÜRÜST boş durum ("X için henüz içerik
  yok"), asla sahte/alakasız içerik veya boş kilit gösterme.

## 2. Müfredat Matrisi (8 Ünite - Coursebook)

Üniteler gramer değil YAŞAM TEMASI etrafında kurulur; gramer/kelime/4 beceri altına
girer. Her ünite bir tema + bağlı `norm_pattern` odakları + kelime temaları taşır.

| # | Ünite | Ana Gramer Odakları (norm_pattern) | Kelime Teması |
|---|-------|-----------------------------------|---------------|
| 1 | Personal Identity & Relationships | present_simple, present_continuous, stative | personality, family |
| 2 | Daily Life, Routines & Habits | adverb_frequency, prepositions_time, used_to | routines, hobbies |
| 3 | Travel, Culture & Exploration | simple_past, past_continuous_was_ving, used_to | transport, travel |
| 4 | Food, Dining & Health | quantifier, countable_uncountable | food, health |
| 5 | Work, Career & Ambition | future_will, future_going_to, present_cont_future | jobs, workplace |
| 6 | Technology, Media & Innovation | present_perfect_have_v3, present_perfect_cont | tech, social media |
| 7 | Environment, Nature & Climate | if_type1, if_past_would, modal_obligation | environment, climate |
| 8 | Arts, Entertainment & Leisure | passive_voice, relative_clause | movies, music, books |

> Not: Bir odak birden çok ünitede geçebilir (ör. used_to hem 2 hem 3). Enum tek kaynak,
> ünite eşlemesi `db.ts` içindeki UNITS tablosundadır.

## 3. Sekme Bazlı Odak Kilidi Kuralları

Aktif odak = O. Her sekme SADECE O ile ilgili modülü gösterir. Seviye kilidi (i+1):
odağın CEFR'ından daha ileri yapı bu akışta ASLA görünmez.

- **Gramer:** O'nun kural formülü + fazlı öğrenme modülü (kavrama -> boşluk -> dizilim ->
  hata bulma). Elle yazılmış ders (grammarLessons.ts) + gerçek video kesiti.
- **Kelime:** O ile birlikte kullanılan KALIPLAR öğretilir (Lexical Approach). Ör. odak
  Past Simple ise: `yesterday, last night, ago, in 1990, back then, used to` gibi zaman
  çapaları ve eşdizimler. Tek fiil ezberi değil, "gramerleşmiş öbek". FSRS kartları O'nun
  kelime/kalıp havuzundan gelir.
- **Dinleme:** SADECE O'nun geçtiği video/şarkı kesitleri. Hedef yapı cümlede vurgulu
  (span kalın), altında Türkçesi. Mikro-klip (10-30 sn), tam video değil.
- **Konuşma (Shadowing):** O'nun kalıbıyla yönlendirmeli konuşma/tekrar. Hedef dışına
  çıkmayan pattern drill. `speaking_takes.focus_id` = O.
- **Okuma:** O'nun yapısıyla yazılmış/etiketlenmiş mikro metin. Tıklanabilir kelime/gramer
  etiketi. Kaynak: Bölüm 4.
- **Yazma:** Kelime + Zaman Çapası + Gramer birleşimiyle üretim (boşluk doldurma,
  sürükle-bırak cümle kurma). Sadece O'nun yapısı hedeflenir.

## 4. İçerik Katmanları ve Kaynaklar

Hibrit korpus (tek kaynak yetmez):

1. **Otantik video** (kendi barındırdığın, yt-dlp + Whisper) - sık yapılar için (present/
   past tenses, modal_v1, relative/noun clause, passive). Bunlar korpusta bol.
2. **Okuma metni** - seyrek yapıları ve okuma becerisini beslemek için:
   - **VOA Learning English** (KAMU MALI - öncelik): seviyeli haber/hikaye, kapak görseli
     + yavaş MP3 + transkript. Telif engeli yok, serbest çekilir.
   - **LibriVox + Project Gutenberg** (kamu malı): klasik roman sesi + metni.
   - British Council / BBC 6 Minute English: yapı referansı için; içerik telifli, sadece
     referans/kişisel.
3. **Şarkı mikro-klipleri** - motivasyon + otantik dinleme, seyrek yapılar için (used_to,
   should_have_v3, if_type2). 15-30 sn kesit, tam şarkı DEĞİL (bilişsel yük).

> TELİF KURALI: VOA/LibriVox/Gutenberg serbest. Popüler şarkılar (Adele, Bruno Mars vb.)
> ve BBC/British Council telifli; SADECE kişisel/cihaz-içi kullanım. Yayına çıkacak
> sürümde bunlar CDN'e konmaz; kamu malı kaynaklarla değiştirilir.

## 5. Veri Şeması Sözleşmeleri (join anahtarı = norm_pattern)

- `grammar_topics` (KAPALI enum): norm_pattern (PK), category, cefr, formula, renk.
- `grammar_patterns`: cümle bazlı tespit -> norm_pattern, span_start/end, media_id, idx.
- Okuma şeması: `reading_id, cefr_level, focus_tag(norm_pattern), media{cover,audio,
  duration}, content{raw_text, target_grammar_nodes[], target_vocab_ids[]}, timestamps[]`.
- Şarkı klip şeması: `clip_id, song_title, artist, media_url, timestamp_range[],
  focus_tag, norm_pattern, lyrics_data[]{time_start, text, target_word_index}`.
- `srs_cards`: front_type (vocab/pattern), norm_pattern/topic ile ilişkili. Kullanıcının
  zorlandığı kelime/kalıp otomatik buraya düşer.
- Her içerik parçası MUTLAKA bir `norm_pattern` (veya "etiketsiz") taşır. Etiketsiz içerik
  odak akışında GÖSTERİLMEZ.

## 6. Pipeline Kuralları

```
[kaynak: video/okuma/şarkı] -> [yt-dlp/çekme] -> [Whisper: kelime zaman damgası]
   -> [pattern tagging: norm_pattern + span] -> [DB: grammar_patterns/clips/reading]
   -> [Active Focus Node'a hazır]
```

- Mikro-kesitleme: şarkı/video için hedef cümlenin 10-30 sn'lik aralığı; tam medya değil.
- Kelime-ses eşleme (word alignment): karaoke efekti için milisaniye damgası zorunlu.
- Odak etiketleme otomatik (spaCy Layer A); Türkçe çeviri/anlam/chunk Layer B (LLM;
  anahtar yoksa ücretsiz MT ile en az çeviri doldurulur - fill_tr.py).
- YENİ ders app'e girmeden "kullanılabilir" SAYILMAZ (bkz. Bölüm 11 - seed).

## 7. İlerleme, Seviye ve Kilit

- Bir odak modülü bir sonrakine geçmek için USTALIK EŞİĞİ ister (ör. %80 gramer, %85
  kelime hatırlama). Eşik geçilmeden ileri yapı açılmaz (i+1 korunur).
- Odak rozeti her sekmede sabit; kullanıcı hangi sekmede olursa olsun aynı odağı besler.
- Serbest gezinti serbest ama her sekmenin ilk kartı "Mevcut odağın: X" ile hatırlatır.

## 8. Anti-Halüsinasyon / Veri Dürüstlüğü

- Uydurma metrik/örnek yok. Çeviri makine ise "MT" kalitesinde olduğu bilinir.
- Boş alan boş bırakılır, sahte doldurulmaz. Kaynak yoksa "içerik yok" denir.
- norm_pattern enum dışına çıkılmaz; yeni yapı gerekirse önce enum'a eklenir.

## 9. Bu Kuralların Önceliği

Bu dosya, Focus-Locked işleri için proje içi en yüksek referanstır. Çakışma olursa
buradaki somut değerler kazanır. Değişiklik gerekirse bu dosyada gerekçesiyle güncellenir
(append; eski karar silinmez, "değişti çünkü ..." notu düşülür).

## 10. UYGUNLUK KONTROL LİSTESİ (her işte çalıştır)

Bir iş bitince şu soruların HEPSİ "evet" olmalı:

- [ ] İçerik bir `norm_pattern`'a bağlı mı? (etiketsizse odak akışında gizli mi?)
- [ ] Aktif odak varken sekme SADECE o odağı mı gösteriyor?
- [ ] Seviye kilidi korunuyor mu? (odaktan ileri yapı sızmıyor mu?)
- [ ] Hedef yapı kullanıcıya görünür mü? (vurgu/etiket/"ne öğreneceksin")
- [ ] Kelime, tek fiil değil KALIP/zaman çapası olarak mı veriliyor?
- [ ] Medya mikro-klip mi (tam video/şarkı değil)?
- [ ] Kelime-ses zaman damgası var mı (karaoke)?
- [ ] Boş durum dürüst mü (sahte içerik yok)?
- [ ] Telif: kaynak kamu malı mı, değilse kişisel/cihaz-içi mi?
- [ ] Ders/okuma/şarkı app veritabanına GERÇEKTEN girdi mi (seed)?
- [ ] Türkçe metinler doğru imla (diakritik) + uzun çizgi yok mu?

## 11. Mevcut Durum vs Hedef (dürüst boşluk)

Bu bölüm gerçeği hayalle karıştırmamak içindir; her aşamada güncellenir.

| Alan | Hedef | Şu an (2026-09-22) |
|------|-------|--------------------|
| App'e yüklü ders | 26 video + okuma + şarkı | 32 ders seed'e girer (manifest); reload/reseed gerekir |
| İndir + deşifre | 26/26 | 26/26 + 4 eski (toplam 32 ders) |
| Videolar local | 26 | 32 require haritasında (manifest) |
| Otomatik seed manifest | 1 dosya, hepsi girsin | KURULDU (scripts/gen_lesson_manifest.py -> lessonManifest.ts) |
| Cümle bazlı gramer ayrımı | tam | KURULDU (grammar_patterns, 16 bol / 8 zayıf odak) |
| Dinleme odak kilidi | tam | KURULDU (index.tsx, vurgu + kapak) |
| Konuşma odak kilidi | tam | YOK (shadowing odağa bağlı değil) |
| Okuma odak kilidi | tam | KURULDU (article_patterns + getArticles(focus) + okuma.tsx); ama sadece 3 örnek metin var, VOA/Gutenberg içeriği çekilmeli |
| Yazma odak kilidi | tam | YOK |
| Kelime = kalıp/çapa | tam | KISMEN (Layer B anahtarsız; glossary sadece 5 derste) |
| Şarkı mikro-klip | tam | KISMEN (songs.ts başlangıç) |

### İçerik yoğunluğu (2026-09-22, curated sonrası)
Eski 8 zayıf odak, elle yazılmış graded cümlelerle dolduruldu (scripts/gen_curated.py,
96 cümle / 8 konu, olumlu-olumsuz-soru). Artık HER gramer odağı >=12 kesit; 12'nin altında
konu YOK. Curated cümleler videosuz; Dinleme kartında TTS (cihaz sesli okuma) ile çalar.
Sayımlar: should_have_v3(14), could_have_v3(18), would_have_v3(18), if_type1(25),
if_past_would(15), if_had_v3_would_have_v3(14), wish_past(14), used_to(28).

### Sıradaki en yüksek değerli adımlar
1. Konuşma (shadowing) sekmesini odağa bağla (speaking_takes.focus_id).
2. Okuma hattı: VOA (kamu malı) çek -> Whisper hizala -> norm_pattern etiketle.
3. Zayıf 8 odak için şarkı mikro-klip + VOA metniyle boşluk doldur.
