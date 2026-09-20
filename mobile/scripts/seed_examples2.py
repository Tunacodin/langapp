# -*- coding: utf-8 -*-
# Ornek cumleler 2. parti: seed_examples.py'deki 54 kokun DISINDA kalan koklere
# elle yazilmis 3'er ornek. Ayni append/idempotent mantik. Anahtar 'lemma|pos'.
#   python scripts/seed_examples2.py

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON_DIR = os.path.join(ROOT, "assets", "lessons")
GLOBAL_LEX = os.path.join(LESSON_DIR, "_lexicon.json")
GLOBAL_EX = os.path.join(LESSON_DIR, "_examples.json")

EX = {
    "accuracy|NOUN": [
        ("The report checks the accuracy of the data.", "Rapor verilerin doğruluğunu kontrol eder.", "B2"),
        ("We need more accuracy in the measurements.", "Ölçümlerde daha fazla isabet gerekiyor.", "B2"),
        ("The tool improves the accuracy of results.", "Araç sonuçların doğruluğunu artırır.", "B2"),
    ],
    "acquire|VERB": [
        ("The company acquired a smaller startup.", "Şirket daha küçük bir girişimi satın aldı.", "B2"),
        ("She acquired new skills at work.", "İşte yeni beceriler edindi.", "B1"),
        ("It's hard to acquire good habits.", "İyi alışkanlıklar edinmek zordur.", "B1"),
    ],
    "additional|ADJ": [
        ("There is an additional fee for luggage.", "Bagaj için ek bir ücret var.", "B1"),
        ("We hired additional staff for summer.", "Yaz için ilave personel aldık.", "B1"),
        ("Do you need any additional help?", "Ek yardıma ihtiyacın var mı?", "A2"),
    ],
    "anywhere|ADV": [
        ("I can't find my keys anywhere.", "Anahtarlarımı hiçbir yerde bulamıyorum.", "A2"),
        ("You can work from anywhere.", "Her yerden çalışabilirsin.", "A2"),
        ("Is there a pharmacy anywhere near here?", "Buralarda bir yerde eczane var mı?", "B1"),
    ],
    "appear|VERB": [
        ("A rainbow appeared after the rain.", "Yağmurdan sonra bir gökkuşağı göründü.", "B1"),
        ("He appears calm, but he is nervous.", "Sakin görünüyor ama gergin.", "B1"),
        ("New problems appeared during the test.", "Test sırasında yeni sorunlar çıktı.", "B1"),
    ],
    "appearance|NOUN": [
        ("She cares a lot about her appearance.", "Görünümüne çok önem veriyor.", "B1"),
        ("He made a short appearance on the show.", "Programda kısa bir boy gösterdi.", "B2"),
        ("The garden's appearance changed in spring.", "Bahçenin görünümü ilkbaharda değişti.", "B2"),
    ],
    "approachable|ADJ": [
        ("The new teacher is very approachable.", "Yeni öğretmen çok ulaşılabilir biri.", "B2"),
        ("A good manager should be approachable.", "İyi bir yönetici ulaşılabilir olmalı.", "B2"),
        ("He seems friendly and approachable.", "Cana yakın ve ulaşılabilir görünüyor.", "B2"),
    ],
    "area|NOUN": [
        ("This area is famous for its cafes.", "Bu bölge kafeleriyle ünlü.", "A2"),
        ("We live in a quiet area.", "Sakin bir bölgede yaşıyoruz.", "A2"),
        ("Please wait in the seating area.", "Lütfen oturma alanında bekleyin.", "B1"),
    ],
    "assign|VERB": [
        ("The teacher assigned us homework.", "Öğretmen bize ödev verdi.", "B1"),
        ("They assigned her to a new project.", "Onu yeni bir projeye atadılar.", "B2"),
        ("Each task is assigned to one person.", "Her görev bir kişiye atanır.", "B2"),
    ],
    "attention|NOUN": [
        ("Please pay attention to the road.", "Lütfen yola dikkat et.", "A2"),
        ("The ad caught my attention.", "Reklam dikkatimi çekti.", "B1"),
        ("She needs more attention from her team.", "Ekibinden daha fazla ilgi bekliyor.", "B1"),
    ],
    "bottom|NOUN": [
        ("The keys are at the bottom of my bag.", "Anahtarlar çantamın dibinde.", "A2"),
        ("They finished at the bottom of the league.", "Ligin sonuncusu olarak bitirdiler.", "B1"),
        ("Read the note at the bottom of the page.", "Sayfanın altındaki notu oku.", "A2"),
    ],
    "broadcaster|NOUN": [
        ("The broadcaster showed the match live.", "Yayıncı maçı canlı gösterdi.", "B2"),
        ("She works for a national broadcaster.", "Ulusal bir yayıncıda çalışıyor.", "B2"),
        ("The broadcaster lost the TV rights.", "Yayıncı TV haklarını kaybetti.", "B2"),
    ],
    "busy|ADJ": [
        ("I'm too busy to talk right now.", "Şu an konuşamayacak kadar meşgulüm.", "A2"),
        ("The streets are busy in the morning.", "Sokaklar sabahları yoğun.", "A2"),
        ("She had a busy week at work.", "İşte yoğun bir hafta geçirdi.", "A2"),
    ],
    "capital|NOUN": [
        ("Paris is the capital of France.", "Paris, Fransa'nın başkentidir.", "A2"),
        ("Ankara is the capital of Turkey.", "Ankara, Türkiye'nin başkentidir.", "A2"),
        ("The capital has many museums.", "Başkentte birçok müze var.", "A2"),
    ],
    "champion|NOUN": [
        ("She is the world champion.", "O, dünya şampiyonu.", "A2"),
        ("Our team became champions this year.", "Takımımız bu yıl şampiyon oldu.", "A2"),
        ("The champion thanked his fans.", "Şampiyon taraftarlarına teşekkür etti.", "B1"),
    ],
    "classification|NOUN": [
        ("The library uses a simple classification.", "Kütüphane basit bir sınıflandırma kullanır.", "B2"),
        ("This classification groups animals by type.", "Bu sınıflandırma hayvanları türüne göre gruplar.", "B2"),
        ("The model's classification was correct.", "Modelin sınıflandırması doğruydu.", "B2"),
    ],
    "classify|VERB": [
        ("We classify emails as spam or safe.", "E-postaları spam veya güvenli olarak sınıflandırırız.", "B2"),
        ("Scientists classify plants into families.", "Bilim insanları bitkileri ailelere ayırır.", "B2"),
        ("The app classifies photos by date.", "Uygulama fotoğrafları tarihe göre sınıflandırır.", "B2"),
    ],
    "coin|VERB": [
        ("He coined a new word for the idea.", "Fikir için yeni bir terim türetti.", "C1"),
        ("The term was coined in the 1990s.", "Terim 1990'larda ortaya atıldı.", "C1"),
        ("She coined a catchy slogan.", "Akılda kalıcı bir slogan türetti.", "C1"),
    ],
    "cold|ADJ": [
        ("He gave me a cold look.", "Bana soğuk bir bakış attı.", "B1"),
        ("Her reply was short and cold.", "Cevabı kısa ve soğuktu.", "B1"),
        ("They were cold toward the new guy.", "Yeni gelene karşı mesafeliydiler.", "B2"),
    ],
    "collect|VERB": [
        ("She collects old coins.", "Eski para toplar.", "A2"),
        ("I'll collect the kids from school.", "Çocukları okuldan alacağım.", "B1"),
        ("They collect data from users.", "Kullanıcılardan veri toplarlar.", "B1"),
    ],
    "commit|VERB": [
        ("She is fully committed to her studies.", "Kendini tamamen çalışmalarına adadı.", "B2"),
        ("We committed to a greener office.", "Daha yeşil bir ofise kendimizi adadık.", "B2"),
        ("He won't commit to a clear answer.", "Net bir cevaba bağlanmıyor.", "B2"),
    ],
    "completely|ADV": [
        ("I completely forgot the meeting.", "Toplantıyı tamamen unuttum.", "B1"),
        ("The plan is completely different now.", "Plan artık bambaşka.", "B1"),
        ("She was completely honest with me.", "Bana karşı tamamen dürüsttü.", "B1"),
    ],
    "condition|NOUN": [
        ("The car is in good condition.", "Araba iyi durumda.", "B1"),
        ("There is one condition to the deal.", "Anlaşmanın bir şartı var.", "B1"),
        ("Weather conditions were bad.", "Hava koşulları kötüydü.", "B1"),
    ],
    "constantly|ADV": [
        ("He constantly checks his phone.", "Sürekli telefonunu kontrol ediyor.", "B2"),
        ("Prices are constantly changing.", "Fiyatlar durmadan değişiyor.", "B2"),
        ("She is constantly learning new things.", "Sürekli yeni şeyler öğreniyor.", "B2"),
    ],
    "contain|VERB": [
        ("This drink contains no sugar.", "Bu içecek şeker içermez.", "B1"),
        ("The box contains old photos.", "Kutu eski fotoğraflar içeriyor.", "B1"),
        ("The report contains useful data.", "Rapor faydalı veriler içerir.", "B1"),
    ],
    "cosmopolitan|ADJ": [
        ("London is a cosmopolitan city.", "Londra kozmopolit bir şehir.", "C1"),
        ("She has a cosmopolitan taste in food.", "Yemekte kozmopolit bir zevki var.", "C1"),
        ("The area feels young and cosmopolitan.", "Bölge genç ve çok kültürlü hissettiriyor.", "C1"),
    ],
    "couch|NOUN": [
        ("We watched a film on the couch.", "Kanepede film izledik.", "A2"),
        ("The cat sleeps on the couch.", "Kedi kanepede uyur.", "A2"),
        ("He fell asleep on the couch.", "Kanepede uyuyakaldı.", "A2"),
    ],
    "creator|NOUN": [
        ("She is a popular video creator.", "Popüler bir video üreticisidir.", "B1"),
        ("The app pays its creators.", "Uygulama üreticilerine ödeme yapar.", "B1"),
        ("He is the creator of the game.", "Oyunun yaratıcısı odur.", "B1"),
    ],
    "dependent|ADJ": [
        ("Success is dependent on hard work.", "Başarı sıkı çalışmaya bağlıdır.", "B2"),
        ("Children are dependent on their parents.", "Çocuklar ailelerine bağımlıdır.", "B2"),
        ("The plan is dependent on the weather.", "Plan havaya bağlı.", "B1"),
    ],
    "deploy|VERB": [
        ("We deployed the update last night.", "Güncellemeyi dün gece devreye aldık.", "C1"),
        ("The team deployed the new server.", "Ekip yeni sunucuyu devreye aldı.", "C1"),
        ("They deploy staff where needed.", "Personeli gereken yere konuşlandırırlar.", "C1"),
    ],
    "deserve|VERB": [
        ("You deserve a break.", "Bir molayı hak ediyorsun.", "B1"),
        ("She deserves the award.", "Ödülü hak ediyor.", "B1"),
        ("They deserved to win.", "Kazanmayı hak ettiler.", "B1"),
    ],
    "diverse|ADJ": [
        ("The class is very diverse.", "Sınıf çok çeşitli.", "B2"),
        ("We offer a diverse menu.", "Çeşitli bir menü sunuyoruz.", "B2"),
        ("The city has a diverse population.", "Şehrin çeşitli bir nüfusu var.", "B2"),
    ],
    "divide|VERB": [
        ("Divide the cake into eight pieces.", "Pastayı sekiz parçaya böl.", "B1"),
        ("We divided the work between us.", "İşi aramızda paylaştırdık.", "B1"),
        ("The river divides the town.", "Nehir kasabayı ikiye böler.", "B1"),
    ],
    "domestic|ADJ": [
        ("Domestic flights are cheaper.", "Yurt içi uçuşlar daha ucuz.", "B2"),
        ("They sell in the domestic market.", "Yurt içi pazarda satış yaparlar.", "B2"),
        ("Domestic sales rose last year.", "Yurt içi satışlar geçen yıl arttı.", "B2"),
    ],
    "dominance|NOUN": [
        ("The team showed clear dominance.", "Takım net bir üstünlük gösterdi.", "B2"),
        ("Their dominance in the market is strong.", "Pazardaki hakimiyetleri güçlü.", "B2"),
        ("The champion's dominance lasted years.", "Şampiyonun üstünlüğü yıllarca sürdü.", "B2"),
    ],
    "dynamic|ADJ": [
        ("She is a dynamic leader.", "Dinamik bir lider.", "B2"),
        ("It's a dynamic and busy office.", "Hareketli ve yoğun bir ofis.", "B2"),
        ("The market is very dynamic.", "Pazar çok dinamik.", "B2"),
    ],
    "effort|NOUN": [
        ("It took a lot of effort.", "Çok çaba gerektirdi.", "B1"),
        ("Thanks for your effort.", "Emeğin için teşekkürler.", "B1"),
        ("She made an effort to be kind.", "Nazik olmak için çaba gösterdi.", "B1"),
    ],
    "ego|NOUN": [
        ("He has a big ego.", "Büyük bir egosu var.", "B2"),
        ("Leave your ego at the door.", "Egonu kapıda bırak.", "B2"),
        ("Her ego was hurt by the loss.", "Kaybetmek egosunu incitti.", "B2"),
    ],
    "embed|VERB": [
        ("You can embed the video on your site.", "Videoyu sitene gömebilirsin.", "B2"),
        ("The chip is embedded in the card.", "Çip kartın içine gömülüdür.", "B2"),
        ("They embedded a link in the text.", "Metnin içine bir bağlantı gömdüler.", "B2"),
    ],
    "equal|ADJ": [
        ("Everyone gets an equal share.", "Herkes eşit pay alır.", "A2"),
        ("Men and women should have equal rights.", "Kadın ve erkek eşit haklara sahip olmalı.", "B1"),
        ("Cut the rope into two equal parts.", "İpi iki eşit parçaya kes.", "A2"),
    ],
    "equally|ADV": [
        ("We split the bill equally.", "Hesabı eşit olarak böldük.", "B1"),
        ("Both plans are equally good.", "İki plan da eşit derecede iyi.", "B1"),
        ("Treat all students equally.", "Tüm öğrencilere eşit davran.", "B1"),
    ],
    "ethnic|ADJ": [
        ("The city has many ethnic groups.", "Şehirde birçok etnik grup var.", "B2"),
        ("We enjoy ethnic food.", "Etnik yemekleri severiz.", "B2"),
        ("The festival celebrates ethnic diversity.", "Festival etnik çeşitliliği kutlar.", "B2"),
    ],
    "expect|VERB": [
        ("I expect good news soon.", "Yakında iyi haber bekliyorum.", "B1"),
        ("We didn't expect so many people.", "Bu kadar çok insan beklemiyorduk.", "B1"),
        ("She expects to finish today.", "Bugün bitirmeyi bekliyor.", "B1"),
    ],
    "expectation|NOUN": [
        ("The film met my expectations.", "Film beklentilerimi karşıladı.", "B1"),
        ("High expectations can cause stress.", "Yüksek beklentiler strese neden olabilir.", "B2"),
        ("Set clear expectations for the team.", "Ekip için net beklentiler belirle.", "B2"),
    ],
    "experienced|ADJ": [
        ("She is an experienced nurse.", "Deneyimli bir hemşiredir.", "B1"),
        ("We need an experienced driver.", "Deneyimli bir sürücüye ihtiyacımız var.", "B1"),
        ("He is experienced in sales.", "Satışta deneyimlidir.", "B1"),
    ],
    "explicitly|ADV": [
        ("The rules explicitly ban phones.", "Kurallar telefonları açıkça yasaklıyor.", "C1"),
        ("She explicitly asked for help.", "Açıkça yardım istedi.", "C1"),
        ("The contract explicitly says so.", "Sözleşme bunu açıkça söylüyor.", "C1"),
    ],
    "fee|NOUN": [
        ("There is a small entry fee.", "Küçük bir giriş ücreti var.", "B1"),
        ("The bank charges a monthly fee.", "Banka aylık ücret alır.", "B1"),
        ("The transfer fee was huge.", "Transfer ücreti çok yüksekti.", "B2"),
    ],
    "fluctuate|VERB": [
        ("Prices fluctuate every day.", "Fiyatlar her gün dalgalanır.", "C1"),
        ("Her mood fluctuates a lot.", "Ruh hali çok değişir.", "C1"),
        ("Temperatures fluctuate in spring.", "İlkbaharda sıcaklıklar dalgalanır.", "C1"),
    ],
    "frightened|ADJ": [
        ("The child was frightened by the dog.", "Çocuk köpekten korktu.", "B1"),
        ("She looked frightened.", "Korkmuş görünüyordu.", "B1"),
        ("Don't be frightened; it's safe.", "Korkma, güvenli.", "B1"),
    ],
    "fund|NOUN": [
        ("The charity needs more funds.", "Yardım kuruluşunun daha çok fona ihtiyacı var.", "B2"),
        ("They set up a fund for students.", "Öğrenciler için bir fon kurdular.", "B2"),
        ("The project ran out of funds.", "Projenin kaynakları tükendi.", "B2"),
    ],
    "fundamental|ADJ": [
        ("Trust is fundamental to teamwork.", "Güven, takım çalışmasının temelidir.", "B2"),
        ("These are the fundamental rules.", "Bunlar temel kurallar.", "B2"),
        ("There is a fundamental difference.", "Temel bir fark var.", "B2"),
    ],
    "further|ADJ": [
        ("For further details, call us.", "Daha fazla ayrıntı için bizi arayın.", "B1"),
        ("We need further information.", "Ek bilgiye ihtiyacımız var.", "B1"),
        ("No further action is needed.", "Başka bir işlem gerekmiyor.", "B2"),
    ],
    "garbage|NOUN": [
        ("Please take out the garbage.", "Lütfen çöpü çıkar.", "A2"),
        ("The garbage smells bad.", "Çöp kötü kokuyor.", "A2"),
        ("This app is full of garbage ads.", "Bu uygulama işe yaramaz reklamlarla dolu.", "B1"),
    ],
    "garbage|VERB": [
        ("Old files just garbage up your drive.", "Eski dosyalar diskini gereksiz yükle doldurur.", "B2"),
        ("Too many pop-ups garbage the page.", "Çok fazla açılır pencere sayfayı çöpe çevirir.", "B2"),
        ("Don't let ads garbage the site.", "Reklamların siteyi çöpe çevirmesine izin verme.", "B2"),
    ],
    "genuinely|ADV": [
        ("I'm genuinely happy for you.", "Senin adına içtenlikle mutluyum.", "B2"),
        ("She genuinely cares about her students.", "Öğrencilerini içtenlikle önemser.", "B2"),
        ("He was genuinely surprised.", "Gerçekten şaşırmıştı.", "B2"),
    ],
    "glut|NOUN": [
        ("There is a glut of cheap phones.", "Piyasada ucuz telefon bolluğu var.", "C2"),
        ("A glut of oil pushed prices down.", "Aşırı petrol bolluğu fiyatları düşürdü.", "C2"),
        ("The market has a glut of houses.", "Piyasada aşırı ev fazlalığı var.", "C2"),
    ],
    "grab|VERB": [
        ("Grab your coat; it's cold.", "Montunu kap, hava soğuk.", "A2"),
        ("Let's grab a coffee.", "Hadi bir kahve içelim.", "A2"),
        ("She grabbed my hand.", "Elimi kaptı.", "A2"),
    ],
    "gradually|ADV": [
        ("The pain went away gradually.", "Ağrı giderek geçti.", "B2"),
        ("He gradually got better.", "Yavaş yavaş iyileşti.", "B2"),
        ("Add the sugar gradually.", "Şekeri yavaş yavaş ekle.", "B2"),
    ],
    "half|NOUN": [
        ("I'll take half of the cake.", "Pastanın yarısını alırım.", "A1"),
        ("Half of the team was late.", "Takımın yarısı geç kaldı.", "A2"),
        ("Cut the apple in half.", "Elmayı ortadan ikiye böl.", "A1"),
    ],
    "hopeful|ADJ": [
        ("We are hopeful about the results.", "Sonuçlar konusunda umutluyuz.", "B1"),
        ("She stayed hopeful during hard times.", "Zor zamanlarda umutlu kaldı.", "B1"),
        ("They are hopeful for a deal.", "Bir anlaşma için umutlular.", "B1"),
    ],
    "horrible|ADJ": [
        ("The weather is horrible today.", "Bugün hava berbat.", "A2"),
        ("It was a horrible accident.", "Korkunç bir kazaydı.", "A2"),
        ("The food tasted horrible.", "Yemeğin tadı berbattı.", "A2"),
    ],
    "immediately|ADV": [
        ("Call me immediately if there's a problem.", "Bir sorun olursa beni hemen ara.", "B1"),
        ("She left immediately after the call.", "Aramadan hemen sonra çıktı.", "B1"),
        ("The medicine works immediately.", "İlaç anında etki eder.", "B1"),
    ],
    "impressive|ADJ": [
        ("That was an impressive speech.", "Etkileyici bir konuşmaydı.", "B2"),
        ("The view is really impressive.", "Manzara gerçekten etkileyici.", "B2"),
        ("She has an impressive record.", "Etkileyici bir geçmişi var.", "B2"),
    ],
    "inbox|NOUN": [
        ("My inbox is full of emails.", "Gelen kutum e-postalarla dolu.", "B1"),
        ("Check your inbox for the code.", "Kod için gelen kutunu kontrol et.", "B1"),
        ("I clean my inbox every morning.", "Her sabah gelen kutumu temizlerim.", "B1"),
    ],
    "interested|ADJ": [
        ("I'm interested in art.", "Sanata ilgiliyim.", "A2"),
        ("Are you interested in the job?", "İşe ilgili misin?", "A2"),
        ("She seemed interested in the topic.", "Konuya meraklı görünüyordu.", "B1"),
    ],
    "intimidate|VERB": [
        ("Big crowds intimidate him.", "Kalabalıklar onu ürkütür.", "C1"),
        ("Don't let the test intimidate you.", "Sınavın gözünü korkutmasına izin verme.", "C1"),
        ("Her confidence can intimidate people.", "Özgüveni insanların gözünü korkutabilir.", "C1"),
    ],
    "key|ADJ": [
        ("This is a key point.", "Bu temel bir nokta.", "B1"),
        ("She played a key role.", "Anahtar bir rol oynadı.", "B1"),
        ("Timing is a key factor.", "Zamanlama anahtar bir etken.", "B2"),
    ],
    "late|ADJ": [
        ("The late updates fixed the bug.", "En son güncellemeler hatayı düzeltti.", "B2"),
        ("Have you seen the late results?", "En son sonuçları gördün mü?", "B2"),
        ("These are the late models.", "Bunlar en güncel modeller.", "B2"),
    ],
    "least|ADJ": [
        ("That's the least of my worries.", "Bu, endişelerimin en küçüğü.", "B2"),
        ("He chose the least expensive option.", "En ucuz seçeneği seçti.", "B1"),
        ("It took the least amount of time.", "En az zamanı aldı.", "B1"),
    ],
    "loaf|NOUN": [
        ("I bought a loaf of bread.", "Bir somun ekmek aldım.", "B1"),
        ("She baked a fresh loaf.", "Taze bir somun pişirdi.", "B1"),
        ("Cut the loaf into slices.", "Somunu dilimlere ayır.", "B1"),
    ],
    "manual|ADJ": [
        ("This is a manual process.", "Bu, elle yapılan bir işlem.", "B2"),
        ("The car has a manual gearbox.", "Arabanın vitesi manuel.", "B2"),
        ("Manual work can be tiring.", "El işi yorucu olabilir.", "B2"),
    ],
    "massive|ADJ": [
        ("They live in a massive house.", "Kocaman bir evde yaşıyorlar.", "B1"),
        ("It was a massive success.", "Devasa bir başarıydı.", "B1"),
        ("There was a massive crowd.", "Kocaman bir kalabalık vardı.", "B1"),
    ],
    "merit|NOUN": [
        ("She was hired on merit.", "Liyakatle işe alındı.", "C1"),
        ("The plan has real merit.", "Planın gerçek bir değeri var.", "C1"),
        ("Awards should be based on merit.", "Ödüller liyakate dayanmalı.", "C1"),
    ],
    "minimize|VERB": [
        ("We try to minimize costs.", "Maliyetleri en aza indirmeye çalışırız.", "B2"),
        ("Minimize the window to see the desktop.", "Masaüstünü görmek için pencereyi küçült.", "B2"),
        ("Good planning minimizes risk.", "İyi planlama riski en aza indirir.", "B2"),
    ],
    "minimum|NOUN": [
        ("Keep noise to a minimum.", "Gürültüyü asgaride tut.", "B1"),
        ("The minimum is ten people.", "En az on kişi gerekir.", "B1"),
        ("Spend a minimum of one hour.", "En az bir saat harca.", "B1"),
    ],
    "mistrust|VERB": [
        ("People mistrust fake news.", "İnsanlar sahte habere güvenmez.", "C1"),
        ("She mistrusts strangers.", "Yabancılara güvenmez.", "C1"),
        ("Voters mistrust empty promises.", "Seçmenler boş sözlere güvenmez.", "C1"),
    ],
    "multicultural|NOUN": [
        ("London is a multicultural city.", "Londra çok kültürlü bir şehir.", "B2"),
        ("We live in a multicultural area.", "Çok kültürlü bir bölgede yaşıyoruz.", "B2"),
        ("The school is proud of its multicultural students.", "Okul çok kültürlü öğrencileriyle gurur duyar.", "B2"),
    ],
    "museum|NOUN": [
        ("We visited a science museum.", "Bir bilim müzesi ziyaret ettik.", "A2"),
        ("The museum is free on Sundays.", "Müze pazar günleri ücretsiz.", "A2"),
        ("This museum has famous paintings.", "Bu müzede ünlü tablolar var.", "A2"),
    ],
    "northwest|NOUN": [
        ("They live in the northwest of the country.", "Ülkenin kuzeybatısında yaşarlar.", "B1"),
        ("The wind comes from the northwest.", "Rüzgar kuzeybatıdan geliyor.", "B1"),
        ("The town is in the northwest.", "Kasaba kuzeybatıda.", "A2"),
    ],
    "nowhere|ADV": [
        ("The keys were nowhere to be found.", "Anahtarlar hiçbir yerde bulunamadı.", "B1"),
        ("We are nowhere near ready.", "Hazır olmaya daha çok var.", "B2"),
        ("This road leads nowhere.", "Bu yol hiçbir yere çıkmıyor.", "B1"),
    ],
    "optimize|VERB": [
        ("We optimized the site for speed.", "Siteyi hız için optimize ettik.", "C1"),
        ("Optimize your photos before upload.", "Yüklemeden önce fotoğraflarını optimize et.", "C1"),
        ("They optimized the delivery route.", "Teslimat rotasını en iyi hale getirdiler.", "C1"),
    ],
    "originally|ADV": [
        ("She is originally from Izmir.", "Aslen İzmirli.", "B1"),
        ("The plan was originally different.", "Plan başlangıçta farklıydı.", "B1"),
        ("This word originally meant something else.", "Bu kelime aslen başka bir anlama geliyordu.", "B2"),
    ],
    "outcome|NOUN": [
        ("We are happy with the outcome.", "Sonuçtan memnunuz.", "B2"),
        ("The outcome was a surprise.", "Sonuç bir sürprizdi.", "B2"),
        ("Nobody knows the outcome yet.", "Sonucu henüz kimse bilmiyor.", "B2"),
    ],
    "outgoing|ADJ": [
        ("She has an outgoing personality.", "Dışa dönük bir kişiliği var.", "B2"),
        ("He is friendly and outgoing.", "Cana yakın ve dışa dönük.", "B2"),
        ("Outgoing people enjoy parties.", "Dışa dönük insanlar partilerden hoşlanır.", "B2"),
    ],
    "overrated|ADJ": [
        ("I think that film is overrated.", "Bence o film abartılıyor.", "B2"),
        ("The restaurant is overrated.", "Restoran fazla abartılıyor.", "B2"),
        ("Some say the phone is overrated.", "Bazıları telefonun abartıldığını söylüyor.", "B2"),
    ],
    "overseas|ADJ": [
        ("She has an overseas job offer.", "Yurt dışından bir iş teklifi var.", "B2"),
        ("They run overseas offices.", "Yurt dışı ofisler işletiyorlar.", "B2"),
        ("Overseas sales are growing.", "Yurt dışı satışlar büyüyor.", "B2"),
    ],
    "parameter|NOUN": [
        ("Set the parameters before you start.", "Başlamadan önce parametreleri ayarla.", "C1"),
        ("The function takes two parameters.", "Fonksiyon iki parametre alır.", "C1"),
        ("We work within tight parameters.", "Dar ölçütler içinde çalışıyoruz.", "C1"),
    ],
    "period|NOUN": [
        ("It rained for a long period.", "Uzun bir dönem yağmur yağdı.", "B1"),
        ("This was a happy period in my life.", "Bu, hayatımda mutlu bir dönemdi.", "B1"),
        ("Sales rose over a short period.", "Satışlar kısa bir dönemde arttı.", "B1"),
    ],
    "personally|ADV": [
        ("Personally, I prefer tea.", "Şahsen ben çayı tercih ederim.", "B1"),
        ("She thanked me personally.", "Bana bizzat teşekkür etti.", "B1"),
        ("I'll handle it personally.", "Bununla bizzat ilgileneceğim.", "B1"),
    ],
    "poor|ADJ": [
        ("The signal is poor here.", "Burada sinyal zayıf.", "B1"),
        ("They grew up poor.", "Yoksul büyüdüler.", "A2"),
        ("It was a poor decision.", "Kötü bir karardı.", "B1"),
    ],
    "position|NOUN": [
        ("She got a new position at work.", "İşte yeni bir konum aldı.", "B1"),
        ("Put the chair in this position.", "Sandalyeyi bu konuma koy.", "A2"),
        ("He is in first position.", "Birinci sırada.", "A2"),
    ],
    "prediction|NOUN": [
        ("Her prediction was correct.", "Tahmini doğruydu.", "B2"),
        ("The weather prediction says rain.", "Hava tahmini yağmur diyor.", "B1"),
        ("Nobody trusts his predictions.", "Kimse onun tahminlerine güvenmiyor.", "B2"),
    ],
    "predictive|ADJ": [
        ("The app uses predictive text.", "Uygulama tahmine dayalı metin kullanır.", "C1"),
        ("They built a predictive model.", "Öngören bir model kurdular.", "C1"),
        ("Predictive tools guess your needs.", "Öngören araçlar ihtiyaçlarını tahmin eder.", "C1"),
    ],
    "previous|ADJ": [
        ("In the previous lesson we learned verbs.", "Önceki derste fiilleri öğrendik.", "B1"),
        ("My previous phone was slow.", "Önceki telefonum yavaştı.", "B1"),
        ("See the previous page.", "Önceki sayfaya bak.", "A2"),
    ],
    "racism|NOUN": [
        ("The campaign fights racism.", "Kampanya ırkçılıkla mücadele eder.", "B2"),
        ("Racism has no place in sport.", "Sporda ırkçılığa yer yok.", "B2"),
        ("They spoke out against racism.", "Irkçılığa karşı seslerini yükselttiler.", "B2"),
    ],
    "ratio|NOUN": [
        ("The ratio of boys to girls is equal.", "Erkeklerin kızlara oranı eşit.", "B2"),
        ("Mix them in a two to one ratio.", "İkiye bir oranında karıştır.", "B2"),
        ("The staff to student ratio is low.", "Personel öğrenci oranı düşük.", "B2"),
    ],
    "raw|ADJ": [
        ("I don't eat raw fish.", "Çiğ balık yemem.", "B1"),
        ("The data is still raw.", "Veri henüz ham.", "B2"),
        ("Raw materials got expensive.", "Ham maddeler pahalandı.", "B2"),
    ],
    "record|ADJ": [
        ("Sales hit a record high.", "Satışlar rekor seviyeye ulaştı.", "B2"),
        ("It was a record year for tourism.", "Turizm için rekor bir yıldı.", "B2"),
        ("They signed him for a record fee.", "Onu rekor bir ücretle transfer ettiler.", "B2"),
    ],
    "reliance|NOUN": [
        ("Our reliance on cars is high.", "Arabalara bağımlılığımız yüksek.", "C1"),
        ("Reduce your reliance on sugar.", "Şekere olan bağımlılığını azalt.", "C1"),
        ("There is heavy reliance on imports.", "İthalata büyük bağımlılık var.", "C1"),
    ],
    "reliant|ADJ": [
        ("We are too reliant on one supplier.", "Tek bir tedarikçiye fazla bağımlıyız.", "C1"),
        ("Kids are reliant on their phones.", "Çocuklar telefonlarına bağımlı.", "C1"),
        ("The town is reliant on tourism.", "Kasaba turizme bağımlı.", "C1"),
    ],
    "remain|VERB": [
        ("Few tickets remain.", "Az sayıda bilet kaldı.", "B2"),
        ("Please remain seated.", "Lütfen oturmaya devam edin.", "B2"),
        ("She remained calm.", "Sakin kaldı.", "B2"),
    ],
    "reminder|NOUN": [
        ("Set a reminder for the meeting.", "Toplantı için bir hatırlatıcı kur.", "B1"),
        ("This is a friendly reminder.", "Bu, nazik bir hatırlatmadır.", "B1"),
        ("The app sends daily reminders.", "Uygulama günlük hatırlatmalar gönderir.", "B1"),
    ],
    "renegotiation|NOUN": [
        ("The deal needs renegotiation.", "Anlaşmanın yeniden müzakereye ihtiyacı var.", "C1"),
        ("They asked for a renegotiation of the price.", "Fiyatın yeniden müzakeresini istediler.", "C1"),
        ("Renegotiation of the contract took weeks.", "Sözleşmenin yeniden müzakeresi haftalar aldı.", "C1"),
    ],
    "represent|VERB": [
        ("She represents her country.", "Ülkesini temsil eder.", "B1"),
        ("This chart represents our sales.", "Bu grafik satışlarımızı temsil eder.", "B2"),
        ("He represented the team at the event.", "Etkinlikte takımı temsil etti.", "B2"),
    ],
    "resource|NOUN": [
        ("Water is a precious resource.", "Su, değerli bir kaynaktır.", "B1"),
        ("We lack the resources for it.", "Bunun için kaynağımız yok.", "B2"),
        ("The site is a great learning resource.", "Site harika bir öğrenme kaynağı.", "B1"),
    ],
    "rival|NOUN": [
        ("They beat their biggest rival.", "En büyük rakiplerini yendiler.", "B1"),
        ("The two rivals shook hands.", "İki rakip el sıkıştı.", "B1"),
        ("She has no real rival.", "Gerçek bir rakibi yok.", "B1"),
    ],
    "roughly|ADV": [
        ("It costs roughly ten dollars.", "Kabaca on dolar tutuyor.", "B2"),
        ("There were roughly fifty people.", "Yaklaşık elli kişi vardı.", "B2"),
        ("The trip takes roughly two hours.", "Yolculuk kabaca iki saat sürer.", "B2"),
    ],
    "round|NOUN": [
        ("She won the first round.", "İlk turu kazandı.", "B1"),
        ("Let's play one more round.", "Bir tur daha oynayalım.", "B1"),
        ("He reached the final round.", "Son aşamaya ulaştı.", "B1"),
    ],
    "separate|VERB": [
        ("Separate the eggs from the flour.", "Yumurtaları undan ayır.", "B1"),
        ("Please separate the trash.", "Lütfen çöpü ayır.", "B1"),
        ("A fence separates the gardens.", "Bir çit bahçeleri ayırır.", "B1"),
    ],
    "share|NOUN": [
        ("I sold my share of the company.", "Şirketteki payımı sattım.", "B2"),
        ("Everyone did their fair share.", "Herkes üstüne düşen payı yaptı.", "B2"),
        ("Their market share grew.", "Pazar payları büyüdü.", "B2"),
    ],
    "shop|NOUN": [
        ("There is a coffee shop nearby.", "Yakında bir kahve dükkanı var.", "A1"),
        ("The shop opens at nine.", "Dükkan dokuzda açılır.", "A1"),
        ("She works in a shoe shop.", "Bir ayakkabı dükkanında çalışıyor.", "A2"),
    ],
    "similar|ADJ": [
        ("Our tastes are similar.", "Zevklerimiz benzer.", "A2"),
        ("The two phones look similar.", "İki telefon benzer görünüyor.", "A2"),
        ("We had a similar problem.", "Benzer bir sorunumuz vardı.", "A2"),
    ],
    "southwest|NOUN": [
        ("They drove to the southwest.", "Güneybatıya doğru sürdüler.", "B1"),
        ("The city is in the southwest.", "Şehir güneybatıda.", "A2"),
        ("Warm winds blow from the southwest.", "Ilık rüzgarlar güneybatıdan eser.", "B1"),
    ],
    "spending|NOUN": [
        ("We cut our spending this month.", "Bu ay harcamalarımızı kıstık.", "B1"),
        ("Holiday spending is high.", "Tatil harcaması yüksek.", "B1"),
        ("Track your daily spending.", "Günlük harcamanı takip et.", "B1"),
    ],
    "staggering|ADJ": [
        ("The cost was staggering.", "Maliyet hayret vericiydi.", "C1"),
        ("They made a staggering profit.", "Şaşırtıcı bir kar elde ettiler.", "C1"),
        ("The view was staggering.", "Manzara hayret vericiydi.", "C1"),
    ],
    "stock|NOUN": [
        ("The item is out of stock.", "Ürün stokta yok.", "B1"),
        ("He bought stock in the company.", "Şirketten hisse senedi aldı.", "B2"),
        ("We keep a small stock of parts.", "Az sayıda parça stoğu tutarız.", "B2"),
    ],
    "subscriber|NOUN": [
        ("The channel has a million subscribers.", "Kanalın bir milyon abonesi var.", "B1"),
        ("New subscribers get a discount.", "Yeni aboneler indirim alır.", "B1"),
        ("She is a loyal subscriber.", "Sadık bir abonedir.", "B1"),
    ],
    "suck|VERB": [
        ("This weather sucks.", "Bu hava berbat.", "B2"),
        ("The movie really sucked.", "Film gerçekten berbattı.", "B2"),
        ("It sucks to lose like that.", "Böyle kaybetmek berbat.", "B2"),
    ],
    "sweater|NOUN": [
        ("Wear a warm sweater.", "Sıcak bir kazak giy.", "A2"),
        ("She knitted a blue sweater.", "Mavi bir kazak ördü.", "A2"),
        ("This sweater is too small.", "Bu kazak çok küçük.", "A2"),
    ],
    "text|VERB": [
        ("Text me when you arrive.", "Vardığında bana mesaj at.", "A2"),
        ("She texted me the address.", "Bana adresi mesaj attı.", "A2"),
        ("He texts his mom every day.", "Her gün annesine mesaj atar.", "A2"),
    ],
    "title|NOUN": [
        ("The team won the title.", "Takım şampiyonluğu kazandı.", "B1"),
        ("What's the title of the book?", "Kitabın başlığı ne?", "A2"),
        ("She earned the title of champion.", "Şampiyon unvanını kazandı.", "B1"),
    ],
    "touristy|NOUN": [
        ("The area is too touristy for me.", "Bölge bana göre fazla turistik.", "B2"),
        ("We avoided the touristy spots.", "Turistik yerlerden kaçındık.", "B2"),
        ("It's a touristy but pretty town.", "Turistik ama güzel bir kasaba.", "B2"),
    ],
    "training|NOUN": [
        ("She is in training for a race.", "Bir yarış için antrenman yapıyor.", "A2"),
        ("New staff get a week of training.", "Yeni personel bir hafta eğitim alır.", "B1"),
        ("The training was very useful.", "Eğitim çok faydalıydı.", "A2"),
    ],
    "transfer|NOUN": [
        ("The player's transfer cost millions.", "Oyuncunun transferi milyonlara mal oldu.", "B2"),
        ("I made a bank transfer.", "Banka havalesi yaptım.", "B2"),
        ("The transfer to the new office is done.", "Yeni ofise geçiş tamamlandı.", "B2"),
    ],
    "transform|VERB": [
        ("The app transformed how we work.", "Uygulama çalışma şeklimizi dönüştürdü.", "B2"),
        ("Paint can transform a room.", "Boya bir odayı dönüştürebilir.", "B2"),
        ("She transformed the old house.", "Eski evi baştan aşağı dönüştürdü.", "B2"),
    ],
    "underlie|VERB": [
        ("Trust underlies every good team.", "Güven, her iyi takımın temelinde yatar.", "C1"),
        ("Simple rules underlie the game.", "Oyunun temelinde basit kurallar yatar.", "C1"),
        ("Fear often underlies anger.", "Öfkenin altında çoğu zaman korku yatar.", "C1"),
    ],
    "upstate|ADJ": [
        ("They have an upstate cabin.", "Eyaletin kuzeyinde bir kulübeleri var.", "C1"),
        ("She grew up in an upstate town.", "Eyaletin iç kesimindeki bir kasabada büyüdü.", "C1"),
        ("We drove to the upstate lakes.", "Eyaletin kuzeyindeki göllere gittik.", "C1"),
    ],
    "validate|VERB": [
        ("Please validate your email.", "Lütfen e-postanı doğrula.", "C1"),
        ("The test validates the results.", "Test sonuçları doğrular.", "C1"),
        ("We need data to validate the idea.", "Fikri doğrulamak için veriye ihtiyacımız var.", "C1"),
    ],
    "valuable|ADJ": [
        ("Your time is valuable.", "Zamanın değerli.", "B1"),
        ("She gave me valuable advice.", "Bana değerli bir tavsiye verdi.", "B1"),
        ("The ring is very valuable.", "Yüzük çok değerli.", "B1"),
    ],
    "varied|ADJ": [
        ("The menu is varied.", "Menü çeşitli.", "B2"),
        ("She has varied interests.", "Çeşitli ilgi alanları var.", "B2"),
        ("The work is varied and fun.", "İş çeşitli ve eğlenceli.", "B2"),
    ],
    "virtually|ADV": [
        ("The room was virtually empty.", "Oda neredeyse boştu.", "C1"),
        ("It's virtually the same thing.", "Neredeyse aynı şey.", "C1"),
        ("We're virtually done.", "Neredeyse bitirdik.", "C1"),
    ],
    "weight|NOUN": [
        ("The bag's weight is too much.", "Çantanın ağırlığı çok fazla.", "A2"),
        ("He lifts weights at the gym.", "Spor salonunda ağırlık kaldırır.", "B1"),
        ("Watch the weight of your luggage.", "Bagajının ağırlığına dikkat et.", "B1"),
    ],
    "welcoming|ADJ": [
        ("The hosts were very welcoming.", "Ev sahipleri çok sıcakkanlıydı.", "B1"),
        ("It's a warm, welcoming cafe.", "Sıcak, misafirperver bir kafe.", "B1"),
        ("The town felt welcoming.", "Kasaba misafirperver hissettirdi.", "B2"),
    ],
    "windfall|NOUN": [
        ("The bonus was a nice windfall.", "İkramiye güzel bir beklenmedik gelirdi.", "C1"),
        ("They spent the windfall wisely.", "Talih kuşunu akıllıca harcadılar.", "C1"),
        ("A tax windfall helped the budget.", "Beklenmedik bir vergi geliri bütçeye yardım etti.", "C1"),
    ],
    "worth|ADJ": [
        ("The trip was worth the money.", "Gezi parasına değdi.", "B1"),
        ("This book is worth reading.", "Bu kitap okunmaya değer.", "B1"),
        ("Is it worth the wait?", "Beklemeye değer mi?", "B1"),
    ],
}


def main():
    lex = json.load(open(GLOBAL_LEX, encoding="utf-8"))
    valid = {f"{e['lemma']}|{e['pos']}" for e in lex}
    data = json.load(open(GLOBAL_EX, encoding="utf-8")) if os.path.exists(GLOBAL_EX) else []
    have = {(e["owner_type"], e["owner_key"]) for e in data}

    added, bad_key, dup = 0, [], 0
    for key, rows in EX.items():
        if key not in valid:
            bad_key.append(key)
            continue
        if ("lexeme", key) in have:
            dup += 1
            continue
        for en, tr, cefr in rows:
            data.append({"owner_type": "lexeme", "owner_key": key, "text_en": en, "text_tr": tr, "cefr": cefr})
            added += 1

    json.dump(data, open(GLOBAL_EX, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"eklendi: {added} ornek cumle ({len([k for k in EX if k in valid])} kok).")
    if bad_key:
        print(f"sozlukte olmayan anahtar (atlandi): {bad_key}")
    if dup:
        print(f"zaten var (atlandi): {dup} kok.")


if __name__ == "__main__":
    main()
