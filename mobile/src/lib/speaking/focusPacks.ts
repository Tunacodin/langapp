import type { SpeakingFocus } from './types';

// Konusma pratigi SEED icerigi (elle yazilmis, pedagojik ESL). Her odak, tek bir
// yapiyi olumlu/olumsuz/soru/farkli-kelime varyasyonlariyla calistirir.
// Yeni odak = bu diziye yeni bir nesne. Turkce metinler TDK yazimina uyar.
export const SPEAKING_FOCUS: SpeakingFocus[] = [
  {
    id: 'present-perfect-experience',
    title: 'Deneyimlerini anlat',
    focusEn: 'Present Perfect',
    goalTr: 'Geçmişte yaşanan ama zamanı önemli olmayan deneyimleri anlatmak.',
    cefr: 'B1',
    base: { en: 'I have visited three countries.', tr: 'Üç ülke gezdim.' },
    variations: [
      { key: 'aff', type: 'affirmative', typeLabel: 'Olumlu', en: 'I have finished my homework.', tr: 'Ödevimi bitirdim.', tip: '“have” + fiilin 3. hali (finished).' },
      { key: 'neg', type: 'negative', typeLabel: 'Olumsuz', en: "I haven't seen that movie yet.", tr: 'O filmi henüz görmedim.', tip: '“haven’t” + 3. hal; sonda “yet” sık kullanılır.' },
      { key: 'q', type: 'question', typeLabel: 'Soru', en: 'Have you ever tried Turkish coffee?', tr: 'Hiç Türk kahvesi denedin mi?', tip: '“Have you ever …?” deneyim sorar.' },
      { key: 'lex1', type: 'lexical', typeLabel: 'Farklı kelimeler', en: 'She has lived in Istanbul for five years.', tr: 'Beş yıldır İstanbul’da yaşıyor.', tip: 'Tekil özne için “has”.' },
      { key: 'lex2', type: 'lexical', typeLabel: 'Farklı kelimeler', en: 'We have already eaten dinner.', tr: 'Akşam yemeğini çoktan yedik.', tip: '“already” olumlu cümlede vurguyu güçlendirir.' },
    ],
  },
  {
    id: 'past-simple-story',
    title: 'Dün ne yaptın',
    focusEn: 'Past Simple',
    goalTr: 'Belirli bir geçmiş zamanda biten olayları anlatmak.',
    cefr: 'A2',
    base: { en: 'I watched a good film last night.', tr: 'Dün gece güzel bir film izledim.' },
    variations: [
      { key: 'aff', type: 'affirmative', typeLabel: 'Olumlu', en: 'They travelled to Ankara yesterday.', tr: 'Dün Ankara’ya gittiler.', tip: 'Düzenli fiile “-ed” eklenir.' },
      { key: 'neg', type: 'negative', typeLabel: 'Olumsuz', en: "I didn't sleep well last night.", tr: 'Dün gece iyi uyuyamadım.', tip: '“didn’t” + fiilin yalın hali (sleep).' },
      { key: 'q', type: 'question', typeLabel: 'Soru', en: 'Did you call your friend?', tr: 'Arkadaşını aradın mı?', tip: '“Did” + özne + yalın fiil.' },
      { key: 'lex1', type: 'lexical', typeLabel: 'Farklı kelimeler', en: 'He bought a new phone last week.', tr: 'Geçen hafta yeni bir telefon aldı.', tip: '“buy” düzensizdir: bought.' },
      { key: 'lex2', type: 'lexical', typeLabel: 'Farklı kelimeler', en: 'We met at the station in the morning.', tr: 'Sabah istasyonda buluştuk.', tip: '“meet” düzensizdir: met.' },
    ],
  },
  {
    id: 'going-to-plans',
    title: 'Planlarını söyle',
    focusEn: 'be going to (gelecek)',
    goalTr: 'Önceden düşünülmüş planları ve niyetleri ifade etmek.',
    cefr: 'A2',
    base: { en: 'I am going to start a new course.', tr: 'Yeni bir kursa başlayacağım.' },
    variations: [
      { key: 'aff', type: 'affirmative', typeLabel: 'Olumlu', en: 'We are going to visit my grandmother.', tr: 'Büyükannemi ziyaret edeceğiz.', tip: '“be (am/is/are) going to” + yalın fiil.' },
      { key: 'neg', type: 'negative', typeLabel: 'Olumsuz', en: "I am not going to work this weekend.", tr: 'Bu hafta sonu çalışmayacağım.', tip: 'Olumsuzu “be” fiiline “not” ekleyerek yaparsın.' },
      { key: 'q', type: 'question', typeLabel: 'Soru', en: 'Are you going to join the meeting?', tr: 'Toplantıya katılacak mısın?', tip: '“be” fiilini başa al: Are you going to …?' },
      { key: 'lex1', type: 'lexical', typeLabel: 'Farklı kelimeler', en: 'She is going to learn how to drive.', tr: 'Araba kullanmayı öğrenecek.', tip: 'Tekil özne için “is”.' },
      { key: 'lex2', type: 'lexical', typeLabel: 'Farklı kelimeler', en: 'They are going to move to a new city.', tr: 'Yeni bir şehre taşınacaklar.', tip: 'Çoğul özne için “are”.' },
    ],
  },
  {
    id: 'should-advice',
    title: 'Tavsiye ver',
    focusEn: 'should (modal)',
    goalTr: 'Öneri ve tavsiye vermek, doğru olanı söylemek.',
    cefr: 'A2',
    base: { en: 'You should drink more water.', tr: 'Daha çok su içmelisin.' },
    variations: [
      { key: 'aff', type: 'affirmative', typeLabel: 'Olumlu', en: 'You should take a short break.', tr: 'Kısa bir ara vermelisin.', tip: '“should” + yalın fiil (take).' },
      { key: 'neg', type: 'negative', typeLabel: 'Olumsuz', en: "You shouldn't skip breakfast.", tr: 'Kahvaltıyı atlamamalısın.', tip: '“shouldn’t” + yalın fiil.' },
      { key: 'q', type: 'question', typeLabel: 'Soru', en: 'Should I call a doctor?', tr: 'Doktoru aramalı mıyım?', tip: '“Should” + özne + yalın fiil.' },
      { key: 'lex1', type: 'lexical', typeLabel: 'Farklı kelimeler', en: 'We should leave a little earlier.', tr: 'Biraz daha erken çıkmalıyız.' },
      { key: 'lex2', type: 'lexical', typeLabel: 'Farklı kelimeler', en: 'He should practise every day.', tr: 'Her gün pratik yapmalı.', tip: '“should” her öznede aynı kalır.' },
    ],
  },
  {
    id: 'first-conditional',
    title: 'Koşul kur',
    focusEn: 'First Conditional',
    goalTr: 'Gerçekleşmesi olası koşul ve sonuçları anlatmak.',
    cefr: 'B1',
    base: { en: 'If it rains, I will stay home.', tr: 'Yağmur yağarsa evde kalırım.' },
    variations: [
      { key: 'aff', type: 'affirmative', typeLabel: 'Olumlu', en: 'If you study, you will pass the exam.', tr: 'Çalışırsan sınavı geçersin.', tip: 'If + geniş zaman, ana cümlede “will”.' },
      { key: 'neg', type: 'negative', typeLabel: 'Olumsuz', en: "If we don't hurry, we will miss the bus.", tr: 'Acele etmezsek otobüsü kaçırırız.', tip: 'Koşul kısmında “don’t” ile olumsuz.' },
      { key: 'q', type: 'question', typeLabel: 'Soru', en: 'What will you do if she says no?', tr: 'Hayır derse ne yapacaksın?', tip: 'Soru ana cümlede: What will you do …?' },
      { key: 'lex1', type: 'lexical', typeLabel: 'Farklı kelimeler', en: 'If I have time, I will help you.', tr: 'Vaktim olursa sana yardım ederim.' },
      { key: 'lex2', type: 'lexical', typeLabel: 'Farklı kelimeler', en: 'If the weather is nice, we will go for a walk.', tr: 'Hava güzel olursa yürüyüşe çıkarız.' },
    ],
  },
];
