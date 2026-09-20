# -*- coding: utf-8 -*-
# Elle yazilmis ornek cumleler (owner_type='lexeme'). Kelime kartina dokununca
# acilan pratik sheet'inde, video kullanimlarinin YANI SIRA gosterilir. Videosuz
# okundugu icin TTS ile seslendirilir. Anahtar 'lemma|pos' (global sozluge uyar).
#
# Kullanim:  python scripts/seed_examples.py
#
# Not: Tam kapsama (189 kok x 5) icin build_corpus.py'nin B3 (llm_examples) adimi
# ANTHROPIC_API_KEY ile calistirilinca otomatik doldurur. Bu dosya anahtarsiz da
# calisan, elle kuratorlu bir cekirdek settir. Ayni owner_key icin tekrar yazilmaz.

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON_DIR = os.path.join(ROOT, "assets", "lessons")
GLOBAL_LEX = os.path.join(LESSON_DIR, "_lexicon.json")
GLOBAL_EX = os.path.join(LESSON_DIR, "_examples.json")

# lemma|pos -> [(en, tr, cefr), ...]  (her biri FARKLI baglam)
EX = {
    "ability|NOUN": [
        ("She has the ability to stay calm under pressure.", "Baskı altında sakin kalma yeteneği var.", "B1"),
        ("Learning a language takes time, but everyone has the ability.", "Dil öğrenmek zaman alır ama herkeste bu kabiliyet var.", "B1"),
        ("His ability to explain hard ideas simply is rare.", "Zor fikirleri basitçe anlatma yeteneği nadirdir.", "B2"),
    ],
    "benefit|NOUN": [
        ("One benefit of remote work is saving travel time.", "Uzaktan çalışmanın bir faydası yol süresinden tasarruftur.", "B1"),
        ("Regular exercise has a clear benefit for your health.", "Düzenli egzersizin sağlığa net bir faydası vardır.", "B1"),
        ("They weighed the costs and benefits before deciding.", "Karar vermeden önce maliyet ve faydaları tarttılar.", "B2"),
    ],
    "improve|VERB": [
        ("I want to improve my English before the trip.", "Geziden önce İngilizcemi geliştirmek istiyorum.", "A2"),
        ("Small daily habits can improve your focus.", "Küçük günlük alışkanlıklar odağını iyileştirebilir.", "B1"),
        ("The team worked hard to improve the product.", "Ekip ürünü geliştirmek için çok çalıştı.", "B1"),
    ],
    "develop|VERB": [
        ("It took two years to develop the app.", "Uygulamayı geliştirmek iki yıl sürdü.", "B1"),
        ("Children develop language skills very quickly.", "Çocuklar dil becerilerini çok hızlı geliştirir.", "B1"),
        ("We need to develop a clearer plan.", "Daha net bir plan geliştirmemiz gerekiyor.", "B1"),
    ],
    "experience|NOUN": [
        ("Living abroad was an amazing experience.", "Yurt dışında yaşamak harika bir deneyimdi.", "B1"),
        ("She has ten years of experience in design.", "Tasarımda on yıllık deneyimi var.", "B1"),
        ("The job needs no previous experience.", "İş önceden deneyim gerektirmiyor.", "A2"),
    ],
    "create|VERB": [
        ("He wants to create videos about science.", "Bilim hakkında videolar üretmek istiyor.", "A2"),
        ("They created a small team to test the idea.", "Fikri denemek için küçük bir ekip kurdular.", "B1"),
        ("Good tools help you create faster.", "İyi araçlar daha hızlı üretmene yardım eder.", "B1"),
    ],
    "describe|VERB": [
        ("Can you describe the man you saw?", "Gördüğün adamı tarif edebilir misin?", "A2"),
        ("It is hard to describe how I felt.", "Nasıl hissettiğimi anlatmak zor.", "B1"),
        ("The report describes the main problems.", "Rapor ana sorunları tanımlıyor.", "B1"),
    ],
    "receive|VERB": [
        ("Did you receive my message?", "Mesajımı aldın mı?", "A2"),
        ("She received an award for her work.", "Çalışması için bir ödül aldı.", "B1"),
        ("We receive many emails every day.", "Her gün çok e-posta alıyoruz.", "B1"),
    ],
    "recommend|VERB": [
        ("I recommend this restaurant to everyone.", "Bu restoranı herkese tavsiye ederim.", "A2"),
        ("The doctor recommended more rest.", "Doktor daha çok dinlenme önerdi.", "B1"),
        ("Which book would you recommend?", "Hangi kitabı önerirsin?", "B1"),
    ],
    "respect|VERB": [
        ("I respect her honest opinion.", "Onun dürüst fikrine saygı duyarım.", "B1"),
        ("We should respect other cultures.", "Diğer kültürlere saygı göstermeliyiz.", "B1"),
        ("They respect each other's time.", "Birbirlerinin zamanına saygı duyarlar.", "B1"),
    ],
    "compare|VERB": [
        ("Let's compare the two phones.", "İki telefonu karşılaştıralım.", "A2"),
        ("It is unfair to compare them.", "Onları karşılaştırmak haksızlık.", "B1"),
        ("Compare the prices before you buy.", "Almadan önce fiyatları karşılaştır.", "B1"),
    ],
    "increase|NOUN": [
        ("There was a big increase in sales.", "Satışlarda büyük bir artış oldu.", "B1"),
        ("We saw an increase in visitors this year.", "Bu yıl ziyaretçilerde bir artış gördük.", "B1"),
        ("A small increase in price can hurt demand.", "Fiyatta küçük bir artış talebi düşürebilir.", "B2"),
    ],
    "process|NOUN": [
        ("Learning is a slow process.", "Öğrenme yavaş bir süreçtir.", "B1"),
        ("The hiring process took three weeks.", "İşe alım süreci üç hafta sürdü.", "B1"),
        ("We improved the whole process.", "Tüm süreci iyileştirdik.", "B1"),
    ],
    "share|VERB": [
        ("Please share this post with friends.", "Lütfen bu gönderiyi arkadaşlarınla paylaş.", "A2"),
        ("She shared her screen in the meeting.", "Toplantıda ekranını paylaştı.", "B1"),
        ("They share a small office.", "Küçük bir ofisi paylaşıyorlar.", "B1"),
    ],
    "earn|VERB": [
        ("How much do teachers earn here?", "Buradaki öğretmenler ne kadar kazanıyor?", "B1"),
        ("You earn trust by being honest.", "Dürüst olarak güven kazanırsın.", "B2"),
        ("She earns extra money on weekends.", "Hafta sonları ekstra para kazanıyor.", "B1"),
    ],
    "deal|NOUN": [
        ("They made a deal with the supplier.", "Tedarikçiyle bir anlaşma yaptılar.", "B1"),
        ("That's a great deal for the price.", "Bu fiyata harika bir anlaşma.", "B1"),
        ("The deal fell through at the last minute.", "Anlaşma son dakikada bozuldu.", "B2"),
    ],
    "market|NOUN": [
        ("The phone market is very competitive.", "Telefon pazarı çok rekabetçi.", "B1"),
        ("We buy fruit at the local market.", "Meyveyi yerel pazardan alırız.", "A2"),
        ("They entered a new market last year.", "Geçen yıl yeni bir pazara girdiler.", "B2"),
    ],
    "income|NOUN": [
        ("Rent takes half of my income.", "Kira gelirimin yarısını alıyor.", "B1"),
        ("They live on a low income.", "Düşük gelirle geçiniyorlar.", "B1"),
        ("Ads are the site's main income.", "Reklamlar sitenin ana geliri.", "B2"),
    ],
    "revenue|NOUN": [
        ("The company's revenue grew last quarter.", "Şirketin geliri geçen çeyrek büyüdü.", "B2"),
        ("Most revenue comes from subscriptions.", "Gelirin çoğu aboneliklerden geliyor.", "B2"),
        ("They reported record revenue this year.", "Bu yıl rekor gelir açıkladılar.", "B2"),
    ],
    "financial|ADJ": [
        ("She gave me good financial advice.", "Bana iyi bir mali tavsiye verdi.", "B1"),
        ("The company is in financial trouble.", "Şirket mali sıkıntıda.", "B2"),
        ("We set clear financial goals.", "Net finansal hedefler koyduk.", "B2"),
    ],
    "task|NOUN": [
        ("I finished the first task quickly.", "İlk görevi çabuk bitirdim.", "A2"),
        ("This task is harder than it looks.", "Bu görev göründüğünden zor.", "B1"),
        ("She split the work into small tasks.", "İşi küçük görevlere böldü.", "B1"),
    ],
    "device|NOUN": [
        ("This device saves a lot of time.", "Bu cihaz çok zaman kazandırır.", "A2"),
        ("Turn off your devices during the film.", "Film sırasında cihazlarını kapat.", "A2"),
        ("The app works on any device.", "Uygulama her cihazda çalışır.", "B1"),
    ],
    "culture|NOUN": [
        ("I love learning about other cultures.", "Başka kültürleri öğrenmeyi çok severim.", "B1"),
        ("Food is a big part of culture.", "Yemek kültürün büyük bir parçası.", "B1"),
        ("The company has a friendly culture.", "Şirketin cana yakın bir kültürü var.", "B2"),
    ],
    "diversity|NOUN": [
        ("The city is famous for its diversity.", "Şehir çeşitliliğiyle ünlü.", "B2"),
        ("Diversity makes the team stronger.", "Çeşitlilik ekibi güçlendirir.", "B2"),
        ("We value diversity in our school.", "Okulumuzda çeşitliliğe değer veririz.", "B2"),
    ],
    "friendly|ADJ": [
        ("The staff here are very friendly.", "Buradaki personel çok cana yakın.", "A2"),
        ("She gave me a friendly smile.", "Bana dostça bir gülümseme verdi.", "A2"),
        ("It's a small, friendly town.", "Küçük, sıcakkanlı bir kasaba.", "B1"),
    ],
    "rude|ADJ": [
        ("It's rude to interrupt people.", "İnsanların sözünü kesmek kabalıktır.", "B1"),
        ("He was rude to the waiter.", "Garsona kaba davrandı.", "B1"),
        ("Sorry, I didn't mean to be rude.", "Pardon, kaba olmak istemedim.", "B1"),
    ],
    "weird|ADJ": [
        ("That's a weird smell.", "Bu tuhaf bir koku.", "B1"),
        ("It felt weird to be back home.", "Eve dönmek tuhaf hissettirdi.", "B1"),
        ("He has a weird sense of humor.", "Tuhaf bir mizah anlayışı var.", "B1"),
    ],
    "awesome|ADJ": [
        ("The concert was awesome.", "Konser harikaydı.", "B1"),
        ("You did an awesome job.", "Muhteşem bir iş çıkardın.", "B1"),
        ("What an awesome view!", "Ne muhteşem bir manzara!", "B1"),
    ],
    "incredible|ADJ": [
        ("The food here is incredible.", "Buradaki yemek inanılmaz.", "B1"),
        ("She showed incredible patience.", "İnanılmaz bir sabır gösterdi.", "B2"),
        ("It was an incredible story.", "İnanılmaz bir hikayeydi.", "B1"),
    ],
    "interesting|ADJ": [
        ("That's an interesting question.", "İlginç bir soru.", "A2"),
        ("The book gets more interesting later.", "Kitap ilerledikçe daha ilginç oluyor.", "B1"),
        ("I met an interesting person today.", "Bugün ilginç biriyle tanıştım.", "A2"),
    ],
    "journey|NOUN": [
        ("It was a long journey home.", "Eve dönüş uzun bir yolculuktu.", "B1"),
        ("Learning is a journey, not a race.", "Öğrenmek bir yolculuktur, yarış değil.", "B2"),
        ("They shared photos from the journey.", "Yolculuktan fotoğraflar paylaştılar.", "B1"),
    ],
    "local|ADJ": [
        ("We ate at a local restaurant.", "Yerel bir restoranda yedik.", "A2"),
        ("Ask a local for directions.", "Yol için bir yerliye sor.", "B1"),
        ("The local news covered the event.", "Yerel haberler olayı işledi.", "B1"),
    ],
    "patient|NOUN": [
        ("The doctor saw ten patients today.", "Doktor bugün on hasta baktı.", "A2"),
        ("The patient is feeling better now.", "Hasta şimdi daha iyi hissediyor.", "A2"),
        ("Nurses care for many patients.", "Hemşireler birçok hastaya bakar.", "B1"),
    ],
    "surgery|NOUN": [
        ("She needs surgery on her knee.", "Dizinden ameliyat olması gerekiyor.", "B1"),
        ("The surgery went well.", "Ameliyat iyi geçti.", "B1"),
        ("He is resting after surgery.", "Ameliyattan sonra dinleniyor.", "B1"),
    ],
    "recover|VERB": [
        ("It took a week to recover from the flu.", "Gripten iyileşmek bir hafta sürdü.", "B1"),
        ("The team recovered after a slow start.", "Ekip yavaş bir başlangıçtan sonra toparlandı.", "B2"),
        ("She is recovering well.", "İyi iyileşiyor.", "B1"),
    ],
    "weather|NOUN": [
        ("The weather is nice today.", "Bugün hava güzel.", "A1"),
        ("Bad weather delayed the flight.", "Kötü hava uçuşu geciktirdi.", "B1"),
        ("What's the weather like there?", "Orada hava nasıl?", "A1"),
    ],
    "environment|NOUN": [
        ("We must protect the environment.", "Çevreyi korumalıyız.", "B1"),
        ("A calm environment helps me study.", "Sakin bir ortam çalışmama yardım eder.", "B1"),
        ("The office is a friendly environment.", "Ofis cana yakın bir ortam.", "B2"),
    ],
    "train|VERB": [
        ("She trains every morning.", "Her sabah antrenman yapar.", "A2"),
        ("They train new staff for a week.", "Yeni personeli bir hafta eğitirler.", "B1"),
        ("You can train your brain to focus.", "Beynini odaklanmak için eğitebilirsin.", "B2"),
    ],
    "history|NOUN": [
        ("I love reading about history.", "Tarih hakkında okumayı çok severim.", "A2"),
        ("The city has a long history.", "Şehrin uzun bir tarihi var.", "A2"),
        ("History repeats itself, they say.", "Tarih tekerrür eder derler.", "B2"),
    ],
    "introduce|VERB": [
        ("Let me introduce my friend.", "Arkadaşımı tanıştırayım.", "A2"),
        ("They introduced a new rule.", "Yeni bir kural getirdiler.", "B1"),
        ("She introduced herself politely.", "Kendini kibarca tanıttı.", "A2"),
    ],
    "invite|VERB": [
        ("They invited us to dinner.", "Bizi akşam yemeğine davet ettiler.", "A2"),
        ("I'll invite a few friends.", "Birkaç arkadaş davet edeceğim.", "A2"),
        ("She was invited to speak at the event.", "Etkinlikte konuşmaya davet edildi.", "B1"),
    ],
    "promise|VERB": [
        ("I promise to call you tonight.", "Bu gece seni arayacağıma söz veriyorum.", "A2"),
        ("He promised to help us move.", "Taşınmamıza yardım edeceğine söz verdi.", "B1"),
        ("Don't promise what you can't do.", "Yapamayacağın şeye söz verme.", "B1"),
    ],
    "order|VERB": [
        ("I'd like to order a coffee.", "Bir kahve sipariş etmek istiyorum.", "A2"),
        ("She ordered a book online.", "İnternetten bir kitap sipariş etti.", "A2"),
        ("We ordered too much food.", "Fazla yemek sipariş ettik.", "A2"),
    ],
    "feed|VERB": [
        ("Don't forget to feed the cat.", "Kediyi beslemeyi unutma.", "A2"),
        ("They feed the data into the system.", "Verileri sisteme verirler.", "B2"),
        ("She feeds the baby every three hours.", "Bebeği her üç saatte bir besler.", "B1"),
    ],
    "comment|NOUN": [
        ("She left a kind comment on my post.", "Gönderime nazik bir yorum bıraktı.", "A2"),
        ("Any comments on the plan?", "Plan hakkında yorumunuz var mı?", "B1"),
        ("The comment section was full of tips.", "Yorum bölümü ipuçlarıyla doluydu.", "B1"),
    ],
    "subscribe|VERB": [
        ("Subscribe to get weekly updates.", "Haftalık güncellemeler için abone ol.", "A2"),
        ("I subscribed to her channel.", "Kanalına abone oldum.", "A2"),
        ("You can subscribe for free.", "Ücretsiz abone olabilirsin.", "A2"),
    ],
    "record|NOUN": [
        ("He set a new world record.", "Yeni bir dünya rekoru kırdı.", "B1"),
        ("Keep a record of your spending.", "Harcamalarının kaydını tut.", "B1"),
        ("The team has a strong record this year.", "Takımın bu yıl güçlü bir sicili var.", "B2"),
    ],
    "estimate|VERB": [
        ("They estimate the trip will take five hours.", "Yolculuğun beş saat süreceğini tahmin ediyorlar.", "B2"),
        ("Can you estimate the cost?", "Maliyeti tahmin edebilir misin?", "B1"),
        ("Experts estimate a slow recovery.", "Uzmanlar yavaş bir toparlanma öngörüyor.", "B2"),
    ],
    "guarantee|VERB": [
        ("We guarantee delivery in two days.", "İki günde teslimatı garanti ediyoruz.", "B2"),
        ("Hard work doesn't guarantee success.", "Sıkı çalışma başarıyı garanti etmez.", "B2"),
        ("The phone comes with a guarantee.", "Telefon garantiyle geliyor.", "B1"),
    ],
    "perform|VERB": [
        ("The band performed for two hours.", "Grup iki saat sahne aldı.", "B1"),
        ("She performs well under pressure.", "Baskı altında iyi iş çıkarır.", "B2"),
        ("The car performs better on the highway.", "Araba otoyolda daha iyi performans gösterir.", "B2"),
    ],
    "fair|ADJ": [
        ("That doesn't seem fair to me.", "Bu bana adil görünmüyor.", "B1"),
        ("We want a fair price.", "Adil bir fiyat istiyoruz.", "B1"),
        ("The referee made a fair call.", "Hakem adil bir karar verdi.", "B2"),
    ],
    "fake|ADJ": [
        ("Be careful of fake reviews.", "Sahte yorumlara dikkat et.", "B1"),
        ("The bag was a cheap fake.", "Çanta ucuz bir sahteydi.", "B1"),
        ("They spread fake news online.", "İnternette sahte haber yaydılar.", "B2"),
    ],
    "option|NOUN": [
        ("You have two options here.", "Burada iki seçeneğin var.", "A2"),
        ("Staying home is not an option.", "Evde kalmak bir seçenek değil.", "B1"),
        ("We chose the cheaper option.", "Daha ucuz seçeneği tercih ettik.", "B1"),
    ],
    "structure|NOUN": [
        ("The essay needs a clearer structure.", "Denemenin daha net bir yapıya ihtiyacı var.", "B1"),
        ("They changed the team structure.", "Ekip yapısını değiştirdiler.", "B2"),
        ("The building has a simple structure.", "Binanın basit bir yapısı var.", "B1"),
    ],
}


def main():
    lex = json.load(open(GLOBAL_LEX, encoding="utf-8"))
    valid = {f"{e['lemma']}|{e['pos']}" for e in lex}

    data = json.load(open(GLOBAL_EX, encoding="utf-8")) if os.path.exists(GLOBAL_EX) else []
    have = {(e["owner_type"], e["owner_key"]) for e in data}

    added, skipped_key, skipped_dup = 0, [], 0
    for key, rows in EX.items():
        if "|" not in key or not rows:
            continue
        if key not in valid:
            skipped_key.append(key)
            continue
        if ("lexeme", key) in have:
            skipped_dup += 1
            continue
        for en, tr, cefr in rows:
            data.append({"owner_type": "lexeme", "owner_key": key, "text_en": en, "text_tr": tr, "cefr": cefr})
            added += 1

    json.dump(data, open(GLOBAL_EX, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"eklendi: {added} ornek cumle ({sum(1 for k,v in EX.items() if '|' in k and v)} kok).")
    if skipped_key:
        print(f"sozlukte olmayan anahtar (atlandi): {skipped_key}")
    if skipped_dup:
        print(f"zaten var (atlandi): {skipped_dup} kok.")


if __name__ == "__main__":
    main()
