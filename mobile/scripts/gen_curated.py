# -*- coding: utf-8 -*-
# ZAYIF gramer odaklari icin elle yazilmis graded cumleler (olumlu/olumsuz/soru).
# Otantik videoda seyrek gecen yapilar (modal perfect, kurgusal kosul, wish, used to)
# icin Murphy's In Use mantiginda ornek cumleler. Sentetik "ders" olarak seed'e girer;
# grammar_patterns -> Dinleme odak akisinda gorunur. Video yok; app TTS ile seslendirir.
#
# NOT: text_tr ve note_tr KULLANICIYA GORUNUR -> dogru Turkce imla (diakritik) ZORUNLU.
# text_en ve hedef kalip Ingilizce (ASCII) kalir.
#
# Kullanim: python scripts/gen_curated.py  (sonra gen_lesson_manifest.py + SEED_VERSION artir)
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDIR = os.path.join(ROOT, "assets", "lessons")

# key: (baslik, cefr, note_tr, [ (en, tr, hedef_kalip), ... ])
DATA = {
    "used_to": ("Used to (geçmiş alışkanlık)", "A2",
                "Geçmişte olan ama artık sürmeyen alışkanlık veya durum.", [
        ("I used to live in Istanbul.", "Eskiden İstanbul'da yaşardım.", "used to live"),
        ("She used to play the piano every day.", "O eskiden her gün piyano çalardı.", "used to play"),
        ("We used to be very close friends.", "Eskiden çok yakın arkadaştık.", "used to be"),
        ("My brother used to hate vegetables.", "Kardeşim eskiden sebzeden nefret ederdi.", "used to hate"),
        ("We used to go to the beach every summer.", "Her yaz sahile giderdik.", "used to go"),
        ("He didn't use to like coffee.", "O eskiden kahve sevmezdi.", "didn't use to like"),
        ("I didn't use to wake up early.", "Eskiden erken kalkmazdım.", "didn't use to wake"),
        ("They didn't use to have a car.", "Eskiden arabaları yoktu.", "didn't use to have"),
        ("Did you use to smoke?", "Eskiden sigara içer miydin?", "Did you use to smoke"),
        ("Did she use to work here?", "O eskiden burada mı çalışırdı?", "Did she use to work"),
        ("Where did you use to live?", "Eskiden nerede yaşardın?", "did you use to live"),
        ("I used to read a lot when I was a child.", "Çocukken çok kitap okurdum.", "used to read"),
    ]),
    "should_have_v3": ("Should have V3 (geçmiş pişmanlık/tavsiye)", "B1",
                       "Geçmişte yapılması gereken ama yapılmayan şey; pişmanlık veya eleştiri.", [
        ("I should have studied harder.", "Daha çok çalışmalıydım.", "should have studied"),
        ("You should have told me the truth.", "Bana gerçeği söylemeliydin.", "should have told"),
        ("She should have called before coming.", "Gelmeden önce aramalıydı.", "should have called"),
        ("I should have listened to your advice.", "Tavsiyene kulak vermeliydim.", "should have listened"),
        ("He should have apologized.", "Özür dilemeliydi.", "should have apologized"),
        ("We shouldn't have waited so long.", "Bu kadar uzun beklememeliydik.", "shouldn't have waited"),
        ("He shouldn't have said that.", "Bunu söylememeliydi.", "shouldn't have said"),
        ("You shouldn't have spent all your money.", "Bütün paranı harcamamalıydın.", "shouldn't have spent"),
        ("They shouldn't have left early.", "Erken ayrılmamalıydılar.", "shouldn't have left"),
        ("Should I have booked the tickets earlier?", "Biletleri daha erken mi almalıydım?", "Should I have booked"),
        ("Should we have brought a gift?", "Hediye mi getirmeliydik?", "Should we have brought"),
        ("What should I have done differently?", "Neyi farklı yapmalıydım?", "should I have done"),
    ]),
    "could_have_v3": ("Could have V3 (geçmiş ihtimal/kaçan fırsat)", "B1",
                      "Geçmişte mümkün olan ama gerçekleşmeyen şey.", [
        ("I could have won the race.", "Yarışı kazanabilirdim.", "could have won"),
        ("You could have helped me.", "Bana yardım edebilirdin.", "could have helped"),
        ("She could have been a doctor.", "O bir doktor olabilirdi.", "could have been"),
        ("We could have taken a taxi.", "Taksiye binebilirdik.", "could have taken"),
        ("He could have told us the truth.", "Bize gerçeği söyleyebilirdi.", "could have told"),
        ("We couldn't have finished on time.", "Zamanında bitiremezdik.", "couldn't have finished"),
        ("He couldn't have known the answer.", "Cevabı bilmiş olamaz.", "couldn't have known"),
        ("They couldn't have arrived earlier.", "Daha erken varamazlardı.", "couldn't have arrived"),
        ("Could I have done anything to help?", "Yardım için bir şey yapabilir miydim?", "Could I have done"),
        ("Could she have missed the train?", "Treni kaçırmış olabilir mi?", "Could she have missed"),
        ("You could have called me last night.", "Dün gece beni arayabilirdin.", "could have called"),
        ("This could have been a big mistake.", "Bu büyük bir hata olabilirdi.", "could have been"),
    ]),
    "would_have_v3": ("Would have V3 (gerçekleşmemiş geçmiş sonuç)", "B2",
                      "Geçmişte koşul sağlansaydı ortaya çıkacak sonuç.", [
        ("I would have helped you.", "Sana yardım ederdim.", "would have helped"),
        ("We would have won the game.", "Maçı kazanırdık.", "would have won"),
        ("Life would have been easier.", "Hayat daha kolay olurdu.", "would have been"),
        ("He would have called if he knew.", "Bilseydi arardı.", "would have called"),
        ("He wouldn't have said that.", "Bunu söylemezdi.", "wouldn't have said"),
        ("They wouldn't have agreed.", "Kabul etmezlerdi.", "wouldn't have agreed"),
        ("I wouldn't have believed it.", "Buna inanmazdım.", "wouldn't have believed"),
        ("We wouldn't have missed the flight.", "Uçağı kaçırmazdık.", "wouldn't have missed"),
        ("Would you have done the same thing?", "Sen de aynı şeyi yapar mıydın?", "Would you have done"),
        ("Would she have accepted the offer?", "Teklifi kabul eder miydi?", "Would she have accepted"),
        ("What would you have said?", "Sen ne derdin?", "would you have said"),
        ("She would have come if she had time.", "Vakti olsaydı gelirdi.", "would have come"),
    ]),
    "if_type1": ("If (Tip 1 - gerçek koşul)", "B1",
                 "Gerçekleşmesi muhtemel koşul: If + present, will + V1.", [
        ("If it rains, we will stay home.", "Yağmur yağarsa evde kalırız.", "If it rains, we will stay"),
        ("If you study, you will pass the exam.", "Çalışırsan sınavı geçersin.", "If you study, you will pass"),
        ("If she calls, I will answer.", "Ararsa cevap veririm.", "If she calls, I will answer"),
        ("If I have time, I will call you.", "Vaktim olursa seni ararım.", "If I have time, I will call"),
        ("If they win, they will celebrate.", "Kazanırlarsa kutlama yaparlar.", "If they win, they will celebrate"),
        ("If we hurry, we won't be late.", "Acele edersek geç kalmayız.", "If we hurry, we won't be late"),
        ("If he doesn't come, we will start without him.", "Gelmezse onsuz başlarız.", "If he doesn't come, we will start"),
        ("If you don't hurry, you will miss the bus.", "Acele etmezsen otobüsü kaçırırsın.", "If you don't hurry, you will miss"),
        ("You will feel better if you sleep.", "Uyursan daha iyi hissedersin.", "You will feel better if you sleep"),
        ("We will go out if the weather is good.", "Hava güzel olursa dışarı çıkarız.", "We will go out if the weather is good"),
        ("What will you do if it snows?", "Kar yağarsa ne yapacaksın?", "What will you do if it snows"),
        ("Will you help me if I ask?", "İstersem bana yardım eder misin?", "Will you help me if I ask"),
    ]),
    "if_past_would": ("If (Tip 2 - şimdiki gerçekleşmemiş koşul)", "B1",
                      "Şu an gerçek olmayan varsayım: If + past, would + V1.", [
        ("If I were rich, I would travel the world.", "Zengin olsam dünyayı gezerdim.", "If I were rich, I would travel"),
        ("If I had time, I would help you.", "Vaktim olsa sana yardım ederdim.", "If I had time, I would help"),
        ("If she knew the answer, she would tell us.", "Cevabı bilse bize söylerdi.", "If she knew the answer, she would tell"),
        ("If we lived closer, we would visit more.", "Daha yakın yaşasak daha çok ziyaret ederdik.", "If we lived closer, we would visit"),
        ("If he were here, he would understand.", "Burada olsa anlardı.", "If he were here, he would understand"),
        ("If I spoke French, I would live in Paris.", "Fransızca bilsem Paris'te yaşardım.", "If I spoke French, I would live"),
        ("If they had more money, they would buy a house.", "Daha çok paraları olsa ev alırlardı.", "If they had more money, they would buy"),
        ("I wouldn't do that if I were you.", "Yerinde olsam bunu yapmazdım.", "I wouldn't do that if I were you"),
        ("She would be happier if she changed jobs.", "İş değiştirse daha mutlu olurdu.", "She would be happier if she changed"),
        ("If it weren't so late, we would stay.", "Bu kadar geç olmasa kalırdık.", "If it weren't so late, we would stay"),
        ("What would you do if you won the lottery?", "Piyangoyu kazansan ne yapardın?", "What would you do if you won"),
        ("Where would you go if you had a week off?", "Bir hafta iznin olsa nereye giderdin?", "Where would you go if you had"),
    ]),
    "if_had_v3_would_have_v3": ("If (Tip 3 - geçmiş gerçekleşmemiş koşul)", "B2",
                                "Geçmişte olmayan varsayım: If + had V3, would have V3.", [
        ("If I had studied, I would have passed.", "Çalışsaydım geçerdim.", "If I had studied, I would have passed"),
        ("If we had known, we would have helped.", "Bilseydik yardım ederdik.", "If we had known, we would have helped"),
        ("If he had asked, I would have said yes.", "Sorsaydı evet derdim.", "If he had asked, I would have said"),
        ("If you had told me, I would have understood.", "Bana söyleseydin anlardım.", "If you had told me, I would have understood"),
        ("If I had had more time, I would have finished.", "Daha çok vaktim olsaydı bitirirdim.", "If I had had more time, I would have finished"),
        ("If she had left earlier, she would have caught the train.", "Daha erken çıksaydı treni yakalardı.", "If she had left earlier, she would have caught"),
        ("If they had listened, this wouldn't have happened.", "Dinleselerdi bu olmazdı.", "If they had listened, this wouldn't have happened"),
        ("If it hadn't rained, we would have gone out.", "Yağmur yağmasaydı dışarı çıkardık.", "If it hadn't rained, we would have gone out"),
        ("If he had driven carefully, he wouldn't have crashed.", "Dikkatli sürseydi kaza yapmazdı.", "If he had driven carefully, he wouldn't have crashed"),
        ("We would have won if we had practiced more.", "Daha çok çalışsaydık kazanırdık.", "We would have won if we had practiced more"),
        ("What would you have done if you had been there?", "Orada olsaydın ne yapardın?", "What would you have done if you had been"),
        ("Would she have come if we had invited her?", "Onu davet etseydik gelir miydi?", "Would she have come if we had invited"),
    ]),
    "wish_past": ("Wish (geçmişe/şu ana dair dilek)", "B2",
                  "Şu an ya da geçmişte olmasını istediğimiz ama olmayan durum.", [
        ("I wish I knew the answer.", "Keşke cevabı bilsem.", "wish I knew"),
        ("I wish I had more free time.", "Keşke daha çok boş vaktim olsa.", "wish I had more free time"),
        ("She wishes she could speak English.", "Keşke İngilizce konuşabilse.", "wishes she could speak"),
        ("I wish you were here.", "Keşke burada olsan.", "wish you were here"),
        ("They wish they lived by the sea.", "Keşke deniz kenarında yaşasalar.", "wish they lived"),
        ("I wish I had studied medicine.", "Keşke tıp okusaydım.", "wish I had studied"),
        ("He wishes he hadn't sold his car.", "Keşke arabasını satmasaydı.", "wishes he hadn't sold"),
        ("We wish we had booked earlier.", "Keşke daha erken rezervasyon yapsaydık.", "wish we had booked"),
        ("I wish I hadn't said that.", "Keşke bunu söylemeseydim.", "wish I hadn't said"),
        ("She wishes she had learned to swim.", "Keşke yüzmeyi öğrenseydi.", "wishes she had learned"),
        ("I wish it would stop raining.", "Keşke yağmur dursa.", "wish it would stop"),
        ("Do you ever wish you had a different job?", "Hiç keşke farklı bir işin olsa dediğin oluyor mu?", "wish you had a different job"),
    ]),
    # --- Kitap unitelerinde olup videoda seyrek/karisik gecen yapilar (topics v4) ---
    "present_cont_future": ("Present Continuous (gelecek plan)", "A2",
                            "Kesinleşmiş, ayarlanmış gelecek planı: randevu, program, bilet.", [
        ("I'm meeting Elif for coffee tomorrow.", "Yarın Elif'le kahve içmeye buluşuyorum.", "I'm meeting"),
        ("We're flying to Izmir on Friday.", "Cuma günü İzmir'e uçuyoruz.", "We're flying"),
        ("She's starting her new job next week.", "Gelecek hafta yeni işine başlıyor.", "She's starting"),
        ("I'm seeing the dentist at ten tomorrow.", "Yarın saat onda dişçiye gidiyorum.", "I'm seeing"),
        ("They're getting married in June.", "Haziranda evleniyorlar.", "They're getting married"),
        ("My parents are visiting us next month.", "Annemle babam gelecek ay bize geliyor.", "are visiting"),
        ("He's playing football with his friends tomorrow.", "Yarın arkadaşlarıyla futbol oynuyor.", "He's playing"),
        ("I'm not working on Monday.", "Pazartesi çalışmıyorum.", "I'm not working"),
        ("We aren't going out this weekend.", "Bu hafta sonu dışarı çıkmıyoruz.", "We aren't going out"),
        ("What are you doing tonight?", "Bu akşam ne yapıyorsun?", "are you doing"),
        ("Are you coming to the party on Saturday?", "Cumartesi partiye geliyor musun?", "Are you coming"),
        ("When are you leaving for Ankara?", "Ankara'ya ne zaman gidiyorsun?", "are you leaving"),
    ]),
    "present_perfect_cont": ("Present Perfect Continuous", "B1",
                             "Geçmişte başlayıp hâlâ süren ya da yeni bitmiş, etkisi görünen eylem.", [
        ("I've been learning English for two years.", "İki yıldır İngilizce öğreniyorum.", "I've been learning"),
        ("She has been working here since 2020.", "2020'den beri burada çalışıyor.", "has been working"),
        ("We've been waiting for the bus for twenty minutes.", "Yirmi dakikadır otobüs bekliyoruz.", "We've been waiting"),
        ("It has been raining all morning.", "Sabahtan beri yağmur yağıyor.", "has been raining"),
        ("I'm tired because I've been running.", "Yorgunum çünkü koşuyordum.", "I've been running"),
        ("They've been living in Istanbul since last year.", "Geçen yıldan beri İstanbul'da yaşıyorlar.", "They've been living"),
        ("My phone has been ringing all afternoon.", "Telefonum öğleden beri çalıp duruyor.", "has been ringing"),
        ("I haven't been sleeping well lately.", "Son zamanlarda iyi uyuyamıyorum.", "haven't been sleeping"),
        ("He hasn't been feeling well this week.", "Bu hafta kendini iyi hissetmiyor.", "hasn't been feeling"),
        ("How long have you been studying?", "Ne zamandır ders çalışıyorsun?", "have you been studying"),
        ("What have you been doing all day?", "Bütün gün ne yapıyordun?", "have you been doing"),
        ("Have you been waiting long?", "Çok bekledin mi?", "Have you been waiting"),
    ]),
    "past_perfect_had_v3": ("Past Perfect (had V3)", "B1",
                            "Geçmişteki başka bir olaydan önce tamamlanmış eylem.", [
        ("When I arrived, the film had already started.", "Vardığımda film çoktan başlamıştı.", "had already started"),
        ("She had left before I called her.", "Ben onu aramadan önce çıkmıştı.", "had left"),
        ("We had eaten dinner, so we weren't hungry.", "Akşam yemeğini yemiştik, bu yüzden aç değildik.", "had eaten"),
        ("I had never seen the sea before that trip.", "O geziden önce denizi hiç görmemiştim.", "had never seen"),
        ("He was tired because he had worked all night.", "Bütün gece çalışmıştı, bu yüzden yorgundu.", "had worked"),
        ("The bus had gone when we got to the stop.", "Durağa vardığımızda otobüs gitmişti.", "had gone"),
        ("I realized I had forgotten my keys.", "Anahtarlarımı unuttuğumu fark ettim.", "had forgotten"),
        ("I hadn't finished my homework, so I stayed home.", "Ödevimi bitirmemiştim, bu yüzden evde kaldım.", "hadn't finished"),
        ("They hadn't met before the wedding.", "Düğünden önce hiç tanışmamışlardı.", "hadn't met"),
        ("She hadn't eaten anything since breakfast.", "Kahvaltıdan beri hiçbir şey yememişti.", "hadn't eaten"),
        ("Had you ever been to Paris before?", "Daha önce hiç Paris'e gitmiş miydin?", "Had you ever been"),
        ("Had they already left when you arrived?", "Sen vardığında onlar çoktan gitmiş miydi?", "Had they already left"),
    ]),
    "countable_uncountable": ("Countable / Uncountable", "A2",
                              "Sayılabilen isimle many / a few, sayılamayanla much / a little kullanılır.", [
        ("How many apples do we need?", "Kaç tane elmaya ihtiyacımız var?", "How many apples"),
        ("How much water do you drink every day?", "Her gün ne kadar su içiyorsun?", "How much water"),
        ("There isn't much milk in the fridge.", "Buzdolabında pek süt yok.", "much milk"),
        ("There aren't many people in the park today.", "Bugün parkta pek insan yok.", "many people"),
        ("I have a few friends in Ankara.", "Ankara'da birkaç arkadaşım var.", "a few friends"),
        ("Can I have a little sugar in my tea?", "Çayıma biraz şeker alabilir miyim?", "a little sugar"),
        ("She bought a loaf of bread and two bottles of water.", "Bir somun ekmek ve iki şişe su aldı.", "a loaf of bread"),
        ("Let me give you a piece of advice.", "Sana bir tavsiye vereyim.", "a piece of advice"),
        ("We don't have much time.", "Fazla vaktimiz yok.", "much time"),
        ("I drink a glass of milk before bed.", "Yatmadan önce bir bardak süt içerim.", "a glass of milk"),
        ("There are only a few eggs left.", "Sadece birkaç yumurta kaldı.", "a few eggs"),
        ("I need some information about the trip.", "Gezi hakkında biraz bilgiye ihtiyacım var.", "some information"),
    ]),
    "modal_obligation": ("Must / Have to (zorunluluk)", "A2",
                         "Zorunluluk: must / have to. mustn't = yasak, don't have to = gerek yok.", [
        ("I have to get up early tomorrow.", "Yarın erken kalkmam lazım.", "have to get up"),
        ("You must wear a seat belt in the car.", "Arabada emniyet kemeri takmak zorundasın.", "must wear"),
        ("She has to work on Saturdays.", "Cumartesileri çalışmak zorunda.", "has to work"),
        ("We need to buy some bread.", "Biraz ekmek almamız gerek.", "need to buy"),
        ("I had to wait an hour at the doctor's.", "Doktorda bir saat beklemek zorunda kaldım.", "had to wait"),
        ("You must try this soup, it's delicious.", "Bu çorbayı mutlaka denemelisin, çok lezzetli.", "must try"),
        ("You mustn't smoke in the hospital.", "Hastanede sigara içmemelisin.", "mustn't smoke"),
        ("We mustn't be late for the meeting.", "Toplantıya geç kalmamalıyız.", "mustn't be"),
        ("You don't have to come if you're busy.", "Meşgulsen gelmek zorunda değilsin.", "don't have to come"),
        ("He doesn't have to wear a suit at work.", "İşte takım elbise giymek zorunda değil.", "doesn't have to wear"),
        ("Do I have to pay now?", "Şimdi ödemem gerekiyor mu?", "Do I have to pay"),
        ("Does she have to take the exam again?", "Sınava tekrar girmesi gerekiyor mu?", "Does she have to take"),
    ]),
}


def main():
    total = 0
    problems = []
    for key, (title, cefr, note_tr, rows) in DATA.items():
        sents = []
        for i, (en, tr, target) in enumerate(rows):
            a = en.find(target)
            if a < 0:
                problems.append((key, en, target))
                span_a, span_b = None, None
            else:
                span_a, span_b = a, a + len(target)
            sents.append({
                "idx": i, "start_ms": 0, "end_ms": 0,
                "text_en": en, "text_tr": tr, "cefr": cefr,
                "chunks": [],
                "grammar": [{
                    "pattern": target, "note_tr": note_tr, "cefr": cefr,
                    "norm_pattern": key, "span_start": span_a, "span_end": span_b,
                }],
                "vocab": [], "occurrences": [],
            })
        lesson = {
            "video_id": f"curated_{key}",
            "title": title, "license": "curated", "cefr": cefr,
            "topic": "grammar", "sentences": sents,
        }
        out = os.path.join(LDIR, f"curated_{key}.json")
        json.dump(lesson, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        total += len(sents)
        print(f"curated_{key:26} {len(sents):2} cumle")
    print(f"\ntoplam {total} cumle, {len(DATA)} konu.")
    if problems:
        print("HEDEF BULUNAMADI:")
        for k, en, t in problems:
            print(f"  {k}: '{t}' -> {en}")


if __name__ == "__main__":
    main()
