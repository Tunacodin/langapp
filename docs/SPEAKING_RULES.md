# Konuşma Kuralları (Speaking Rules)

Konuşma merdiveninin (Konuşma sekmesi) içerik ve akış kuralları. Her yeni rutin, her içerik değişikliği bu listeye göre denetlenir. Üst kural: `FOCUS_LOCKED_RULES.md` Bölüm 0.1 (gerçek hayatta kullanılan doğal İngilizce).

## 1. Amaç

- Bu bir okul müfredatı değil. Hedef: gerçek hayatta kullanılan cümleleri, beyin otomatik tamamlayana kadar sayısız kez kurmak.
- Her konu (örn. Present Simple) tek bir dil bilgisi kalıbına kilitlidir. Kalıp sabit, değişen: özne, sıklık kelimesi, olumlu/olumsuz/soru, bağlaç, cümle uzunluğu.

## 2. Yapı

- **Konu (track)** → **Rutinler** (gerçek günlük işler) → her rutin **en az 50 cümle**, **7 seviye**.
- Present Simple rutin sırası (sabah): 1 Uyanmak, 2 Kahvaltı yapmak, 3 Kahve yapmak, 4 Duş almak, 5 Instagram'da gezinmek, 6 Giyinmek, 7 Yürüyüşe çıkmak, 8 Spora gitmek, 9 Evden çalışmak, 10 İşe gitmek.
- Bir rutin, öncekinin tüm cümleleri geçilince açılır. Bir konu, öncekinin tüm rutinleri bitince açılır.

| Seviye | İçerik | Cümle | Sıklık kelimeleri |
|---|---|---|---|
| 1 Olumlu | tek cümle, farklı özneler | 8 | baştan açık |
| 2 Olumlu | aynı, yeni cümleler | 8 | gizli, ilk hatada açılır |
| 3 Olumsuz | don't / doesn't | 8 | hatada açılır |
| 4 Soru | Do/Does + wh- soruları (what time, how often, why) | 8 | hatada açılır |
| 5 Karışık | yeni özneler, üç biçim karışık | 6 | hatada açılır |
| 6 Bağlaçlar | and, but, because, so, or | 6 | hatada açılır |
| 7 Uzun cümleler | when, before, after, as soon as, until, even though, although | 6 | hatada açılır |

Sıklık kelimeleri: always (her zaman), usually (genelde), often (sık sık), sometimes (bazen), occasionally (ara sıra), rarely (nadiren), hardly ever (neredeyse hiç), never (asla).

## 3. Akış (ekran)

- Seviyenin cümleleri alt alta görünür. Sadece sıradaki satır açıktır; geçince bir sonraki açılır.
- Açık satırda yalnız ipucu görünür. Geçilen satırda İngilizce ve Türkçe görünür.
- Mikrofon otomatik dinler, otomatik değerlendirir. Ekstra buton ve "dokun / kontrol et" metni yok.
- **Kabul tam doğruluktur:** beklenen her kelime doğru, fazladan kelime yok (%100). Yarım doğru geçmez.
  - Kısaltmalar eşittir: don't = do not, doesn't = does not, I'm = I am.
  - İpucunda özne "o" ise he / she ikisi de kabul (his / her da).
  - Sayılar rakam ya da yazı olarak eşittir.
- **Zincir** konu seviyesindedir: geçilmiş TÜM rutinlerden rastgele cümleler art arda söylenir; her başarıda +2 cümle. Kamera kaydı tutulur.

## 4. İçerik kuralları

1. Önce doğal İngilizce yazılır, Türkçe ona uydurulur. Çeviri kokan cümle, zorla phrasal verb, argo yok.
2. Her cümle gerçek hayatta birinin gerçekten söyleyeceği bir cümle olmalı.
3. Rutinin ana fiili her cümlede geçer (bağlaçlı ve uzun cümlelerde ikinci yan cümle başka fiil olabilir).
4. Sıklık kelimesi fiilden önce gelir (olumsuzda don't'tan sonra: "I don't usually ...").
5. Özneler karışık: I, you, he, she, we, they, aile/arkadaş isimleri (my mom, my roommate).
6. Tek İngilizce cevap üretmeli: ipucu yoruma açık ise (in summer / in the summer) doğal alternatif `alts` içine yazılır (en fazla 2).
7. Türkçe tam imla ve doğal cümle (diakritikler şart). Em dash yok.

## 5. İpucu (cue) biçimi

- Parçalar " · " ile ayrılır, **İngilizce kelime sırasında** yazılır, Türkçe kavram olarak (ek yok).
- Özne: ben, sen, o, biz, siz, onlar, annem, babam...
- Olumsuz: özneden sonra `değil`. Soru: en başta `mi` (wh- sorusunda önce soru kelimesi, sonra `mi`).
- Sıklık: Türkçe karşılığı (genelde, her zaman, sık sık, bazen, ara sıra, nadiren, neredeyse hiç, asla).
- Saat: `saat 7`, `saat 7.30`.
- Bağlaç: `ve`, `ama`, `çünkü`, `bu yüzden`, `yoksa`.
- Yan cümle: `-dığında` (when), `-madan önce` (before), `-dıktan sonra` (after), `-ar -maz` (as soon as), `-ana kadar` (until), `-masına rağmen` (even though / although).

## 6. Denetim

- `python scripts/check_ladder.py` (mobile/ içinden): cümle sayısı, seviye sayısı, anahtar sırası, sıklık kelimesi, uzunluk.
- Tip denetimi: `node node_modules/typescript/bin/tsc --noEmit -p .`
