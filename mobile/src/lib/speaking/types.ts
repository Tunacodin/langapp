// Konusma pratigi ICERIK tipleri (statik SEED; kullanici verisi degil).
// Bir "odak" (focus) = ogretilmek istenen tek bir yapi/nokta. Her odagin temel
// bir cumlesi ve o yapiyi farkli bicimlerde calistiran VARYASYONLARI vardir:
// olumlu / olumsuz / soru / farkli kelimeler. Boylece kullanici tek cumleyi
// ezberlemek yerine ayni odagi cok yonlu sesletir.
// Kayitlar (ses/video) DB'de (speaking_takes); burasi yalnizca ne calisilacagi.

export type VariationType = 'affirmative' | 'negative' | 'question' | 'lexical';

export type SpeakingVariation = {
  key: string; // odak icinde benzersiz (kayit eslestirme icin)
  type: VariationType;
  typeLabel: string; // TR etiket: "Olumlu" / "Olumsuz" / "Soru" / "Farklı kelimeler"
  en: string; // hedef cumle (sesletilecek)
  tr: string; // Turkce karsiligi
  tip?: string; // bu cumleye ozel kisa ipucu (telaffuz/yapi)
};

export type SpeakingFocus = {
  id: string; // rota/DB anahtari (kebab-case)
  title: string; // TR baslik ("Deneyimlerini anlat")
  focusEn: string; // hedef yapi adi ("Present Perfect")
  goalTr: string; // ne ogretiyor (tek cumle)
  cefr: string;
  base: { en: string; tr: string }; // temel ornek cumle
  variations: SpeakingVariation[];
};
