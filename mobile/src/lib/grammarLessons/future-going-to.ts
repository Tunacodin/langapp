import { GrammarLesson } from './types';

// SEED: Future with "be going to" (Gelecek Zaman: plan ve kanita dayali tahmin). 6 adimin tamami.
export const FUTURE_GOING_TO: GrammarLesson = {
  minutes: 4,
  summary:
    'Konuşmadan önce karar verilmiş planları ve niyetleri anlatmak için kullanılır. Ayrıca şu an gördüğümüz bir işarete dayanarak yapılan tahminlerde de kullanılır: "Şu bulutlara bak, yağmur yağacak."',
  summaryStrong: 'Konuşmadan önce karar verilmiş planları',
  timeMarkers: [
    'tomorrow',
    'tonight',
    'this evening',
    'next weekend',
    'next year',
    'soon',
    'in two days',
  ],
  structures: [
    {
      key: 'positive',
      num: 1,
      title: 'Olumlu Cümle Yapısı',
      subtitle: 'Affirmative',
      metaTag: 'am / is / are + going to',
      formula: [
        { text: 'Subject (Özne)' },
        { text: 'am / is / are', style: 'accent' },
        { text: 'going to', style: 'accent' },
        { text: 'Fiil (V1 - Yalın Hal)', style: 'neutral' },
        { text: 'Nesne / Zaman', style: 'muted' },
      ],
      example: {
        text: "I'm going to visit my aunt next weekend.",
        highlight: ["'m going to visit"],
        spoken: "I'm going to visit my aunt next weekend.",
        translation: 'Gelecek hafta sonu teyzemi ziyaret edeceğim.',
      },
      tip: "am / is / are özneye göre değişir (I am, he is, they are); going to'dan sonra fiil her zaman yalın kalır. Dikkat: \"I'm going to school\" gibi going to + yer, \"okula gidiyorum\" demektir; bu bir hareket anlatır, gelecek zaman değildir.",
      tipTone: 'amber',
    },
    {
      key: 'negative',
      num: 2,
      title: 'Olumsuz Cümle Yapısı',
      subtitle: 'Negative',
      metaTag: "am not / isn't / aren't",
      formula: [
        { text: 'Subject (Özne)' },
        { text: "am not / isn't / aren't", style: 'accent' },
        { text: 'going to', style: 'accent' },
        { text: 'Fiil (V1 - Yalın Hal)', style: 'neutral' },
        { text: 'Nesne / Zaman', style: 'muted' },
      ],
      example: {
        text: "We aren't going to watch TV tonight.",
        highlight: ["aren't going to watch"],
        spoken: 'We are not going to watch TV tonight.',
        translation: 'Bu gece televizyon izlemeyeceğiz.',
      },
      tip: "Olumsuzluk \"not\" ile am/is/are'nin yanına gelir. \"don't going to\" veya \"doesn't going to\" YANLIŞTIR; doğrusu \"aren't going to\" ve \"isn't going to\".",
      tipTone: 'red',
    },
    {
      key: 'question',
      num: 3,
      title: 'Soru Cümlesi Yapısı',
      subtitle: 'Question / Interrogative',
      metaTag: 'Am / Is / Are başa gelir',
      formula: [
        { text: 'Am / Is / Are', style: 'accent' },
        { text: 'Subject (Özne)' },
        { text: 'going to', style: 'accent' },
        { text: 'Fiil (V1 - Yalın Hal)', style: 'neutral' },
        { text: 'Nesne / Zaman ?', style: 'muted' },
      ],
      example: {
        text: 'Are you going to study this evening?',
        highlight: ['Are', 'going to study'],
        spoken: 'Are you going to study this evening?',
        translation: 'Bu akşam ders çalışacak mısın?',
      },
      tip: "Soruda am/is/are öznenin önüne geçer. (Are you going to call? Doğru; Do you going to call? Yanlış!) Kısa cevap: Yes, I am / No, I'm not.",
      tipTone: 'amber',
    },
  ],
  quiz: {
    prompt: 'Look at those dark clouds! It {blank} (rain).',
    blankAnswer: 'is going to rain',
    translation: 'Şu kara bulutlara bak! Yağmur yağacak.',
    spoken: 'Look at those dark clouds! It is going to rain.',
    options: [
      { label: 'is going to rain', correct: true },
      { label: 'going to rain', correct: false },
      { label: 'is going to rains', correct: false },
    ],
    explainCorrect: 'Bulutları şu an görüyoruz; bu kanıta dayalı bir tahmin. "It" ile "is" gelir, fiil yalın kalır: "is going to rain".',
    explainWrong: '"is" eksik olamaz ve going to\'dan sonra fiil ek almaz. Doğrusu: "It is going to rain".',
  },
  examples: {
    minutes: 5,
    intro:
      'Planları, niyetleri ve kanıta dayalı tahminleri olumlu, olumsuz ve soru yapılarında doğal günlük örneklerle inceleyin.',
    tabs: [
      {
        key: 'positive',
        tabLabel: '+ Olumlu',
        groups: [
          {
            title: 'Önceden verilmiş planlar',
            tag: 'Plan / Niyet',
            color: 'red',
            cards: [
              {
                en: "I'm going to learn to swim this summer.",
                highlight: ["'m going to learn"],
                tr: 'Bu yaz yüzmeyi öğreneceğim.',
                badge: "I'm + going to + learn",
                meta: 'Zaman: this summer',
              },
              {
                en: 'My sister is going to open a small café next year.',
                highlight: ['is going to open'],
                tr: 'Kız kardeşim seneye küçük bir kafe açacak.',
                badge: 'is + going to + open',
                meta: 'Zaman: next year',
              },
            ],
          },
          {
            title: 'Kanıta dayalı tahminler',
            tag: 'Şu anki işaret',
            color: 'teal',
            cards: [
              {
                en: "Be careful! That glass is going to fall.",
                highlight: ['is going to fall'],
                tr: 'Dikkat et! O bardak düşecek.',
                badge: 'is + going to + fall',
                meta: 'Kanıt: bardak masanın kenarında',
              },
              {
                en: "The bus is very late. We're going to miss the film.",
                highlight: ["'re going to miss"],
                tr: 'Otobüs çok gecikti. Filmi kaçıracağız.',
                badge: "we're + going to + miss",
                meta: 'Kanıt: otobüs gecikti',
              },
            ],
          },
        ],
      },
      {
        key: 'negative',
        tabLabel: '- Olumsuz',
        groups: [
          {
            title: "Olumsuz kalıp: am not / isn't / aren't + going to",
            tag: 'Kritik kural',
            color: 'red',
            cards: [
              {
                en: "He isn't going to play football on Saturday.",
                highlight: ["isn't going to play"],
                tr: 'Cumartesi futbol oynamayacak.',
                badge: "isn't + going to + play",
                meta: "doesn't going to değil",
              },
              {
                en: "I'm not going to eat fast food this week.",
                highlight: ["'m not going to eat"],
                tr: 'Bu hafta hazır yemek yemeyeceğim.',
                badge: "I'm not + going to + eat",
                meta: 'Zaman: this week',
              },
            ],
          },
          {
            title: 'Günlük konuşma örnekleri',
            tag: 'Yaygın hatalar',
            color: 'teal',
            cards: [
              {
                en: "They aren't going to sell their old house.",
                highlight: ["aren't going to sell"],
                tr: 'Eski evlerini satmayacaklar.',
                badge: "aren't + going to + sell",
                meta: "don't going to değil",
              },
              {
                en: "Don't worry, the test isn't going to be difficult.",
                highlight: ["isn't going to be"],
                tr: 'Merak etme, sınav zor olmayacak.',
                badge: "isn't + going to + be",
                meta: 'going to be: olacak',
              },
            ],
          },
        ],
      },
      {
        key: 'question',
        tabLabel: '? Soru',
        groups: [
          {
            title: 'Genel soru: Am / Is / Are + özne + going to?',
            tag: 'Soru mantığı',
            color: 'red',
            cards: [
              {
                en: 'Are you going to call your mother tonight?',
                highlight: ['Are you going to call'],
                tr: 'Bu gece anneni arayacak mısın?',
                badge: 'Are + you + going to + call',
                meta: "Cevap: Yes, I am / No, I'm not",
              },
              {
                en: 'Is it going to snow tomorrow?',
                highlight: ['Is it going to snow'],
                tr: 'Yarın kar yağacak mı?',
                badge: 'Is + it + going to + snow',
                meta: "Cevap: Yes, it is / No, it isn't",
              },
            ],
          },
          {
            title: 'Soru sözcükleriyle (Wh- + am/is/are)',
            tag: 'Wh- soruları',
            color: 'teal',
            cards: [
              {
                en: 'What are you going to do this weekend?',
                highlight: ['are you going to do'],
                tr: 'Bu hafta sonu ne yapacaksın?',
                badge: 'What + are + you + going to + do',
                meta: 'Soru sözcüğü en başta',
              },
              {
                en: 'Where is she going to stay in London?',
                highlight: ['is she going to stay'],
                tr: "Londra'da nerede kalacak?",
                badge: 'Where + is + she + going to + stay',
                meta: 'stays değil, stay',
              },
            ],
          },
        ],
      },
    ],
    quiz: {
      prompt: 'We {blank} (visit) our grandparents next weekend. We bought the tickets yesterday.',
      blankAnswer: 'are going to visit',
      translation: 'Gelecek hafta sonu büyükanne ve büyükbabamızı ziyaret edeceğiz. Biletleri dün aldık.',
      spoken: 'We are going to visit our grandparents next weekend. We bought the tickets yesterday.',
      options: [
        { label: 'are going to visit', correct: true },
        { label: 'is going to visit', correct: false },
        { label: 'are going to visiting', correct: false },
      ],
      explainCorrect: 'Biletler önceden alınmış; bu hazır bir plan. "We" ile "are" gelir, fiil yalın kalır.',
      explainWrong: '"We" öznesiyle "are" kullanılır ve going to\'dan sonra fiil yalın olur: "are going to visit".',
    },
  },
  video: {
    minutes: 6,
    intro:
      '"going to" yapısının gerçek video kesitlerinde nasıl kullanıldığını izle, sonra 4 aşamalı pratikle pekiştir.',
    practice: [
      {
        kind: 'gap',
        instruction: 'Boşluk Doldurma · Yardımcı Fiil',
        prompt: 'She {blank} going to start a new job in May.',
        answer: 'is',
        options: ['is', 'are', 'does'],
        feedback: 'Doğru! "She" tekil bir öznedir; "is going to start" olur.',
      },
      {
        kind: 'scramble',
        instruction: 'Cümle Dizilimi · Sıralama',
        hint: 'Blokları doğru sırayla dizerek cümleyi kur:',
        blocks: ['a new car', 'going to', 'We', 'buy', 'are'],
        correct: ['We', 'are', 'going to', 'buy', 'a new car'],
        feedback: 'Doğru dizilim: özne + are + going to + yalın fiil (buy) + nesne.',
      },
      {
        kind: 'error',
        instruction: 'Hata Tespiti · Kural Analizi',
        before: 'He is going to ',
        wrong: 'moves',
        after: ' to a bigger flat next month.',
        options: [
          { label: 'moves (move olmalı)', correct: true },
          { label: 'is going to (doğru yapı)', correct: false },
        ],
        feedback: 'Doğru tespit! going to\'dan sonra fiil yalın kalır: "is going to move". "-s" eki gelmez.',
      },
      {
        kind: 'gap',
        instruction: 'Boşluk Doldurma · Olumsuz Yapı',
        prompt: "I {blank} going to tell anyone your secret.",
        answer: "'m not",
        options: ["'m not", "don't", "isn't"],
        feedback: 'Doğru! "I" ile olumsuz yapı "am not" olur: "I\'m not going to tell".',
      },
    ],
    tip: {
      title: 'İzleme İpucu: "gonna" Sesini Yakala',
      text: 'Günlük konuşmada "going to" çoğu zaman hızlıca "gonna" gibi söylenir: "I\'m gonna call you." Videoda bu sesi duyunca "going to" olduğunu hatırla. Yazarken ise resmi metinlerde "going to" kullan.',
    },
  },
  reading: {
    minutes: 7,
    storyTitle: 'A New House by the Sea',
    intro:
      '"going to" yapısının planları, niyetleri ve kanıta dayalı tahminleri bir hikaye akışı içinde nasıl anlattığını oku, anlam çıkar ve pekiştir.',
    paragraphs: [
      {
        section: 'Bölüm I • Karar',
        spoken:
          "Emma's family is going to move to a small town by the sea next month. Her parents have already found a house with a big garden. Emma is going to start a new school in September, and she feels a little nervous.",
        segments: [
          "Emma's family ",
          { verb: { base: 'move', v2: 'is going to move', type: 'Plan', tr: 'taşınacak', tone: 'red' } },
          ' to a small town by the sea next month. Her parents have already found a house with a big garden. Emma ',
          { verb: { base: 'start', v2: 'is going to start', type: 'Plan', tr: 'başlayacak', tone: 'red' } },
          ' a new school in September, and she feels a little nervous.',
        ],
      },
      {
        section: 'Bölüm II • Hazırlık',
        spoken:
          "This weekend, they're going to pack all the books and toys. Emma isn't going to take her old bike, because it is too small for her now. Instead, her father is going to buy her a new one.",
        segments: [
          'This weekend, they',
          { verb: { base: 'pack', v2: "'re going to pack", type: 'Plan', tr: 'toplayacaklar, paketleyecekler', tone: 'red' } },
          ' all the books and toys. Emma ',
          { verb: { base: 'take', v2: "isn't going to take", type: 'Olumsuz plan', tr: 'götürmeyecek', tone: 'green' } },
          ' her old bike, because it is too small for her now. Instead, her father ',
          { verb: { base: 'buy', v2: 'is going to buy', type: 'Niyet', tr: 'alacak', tone: 'red' } },
          ' her a new one.',
        ],
      },
      {
        section: 'Bölüm III • Yolculuk',
        spoken:
          'On moving day, dark clouds cover the sky. "Oh no, it\'s going to rain," Emma says. Her little brother points at the top of the car and shouts, "That box is going to fall!" Their mother smiles. "Don\'t worry. The trip isn\'t going to be long."',
        segments: [
          'On moving day, dark clouds cover the sky. "Oh no, it',
          { verb: { base: 'rain', v2: "'s going to rain", type: 'Kanıta dayalı tahmin', tr: 'yağmur yağacak', tone: 'teal' } },
          '," Emma says. Her little brother points at the top of the car and shouts, "That box ',
          { verb: { base: 'fall', v2: 'is going to fall', type: 'Kanıta dayalı tahmin', tr: 'düşecek', tone: 'teal' } },
          '!" Their mother smiles. "Don\'t worry. The trip ',
          { verb: { base: 'be', v2: "isn't going to be", type: 'Olumsuz tahmin', tr: 'olmayacak', tone: 'green' } },
          ' long."',
        ],
      },
      {
        section: 'Bölüm IV • Yeni Başlangıç',
        spoken:
          'That evening, Emma writes in her diary: "Tomorrow I\'m going to walk along the beach. I\'m going to make new friends here." Then she closes her eyes and smiles.',
        segments: [
          'That evening, Emma writes in her diary: "Tomorrow I',
          { verb: { base: 'walk', v2: "'m going to walk", type: 'Niyet', tr: 'yürüyeceğim', tone: 'red' } },
          ' along the beach. I',
          { verb: { base: 'make', v2: "'m going to make", type: 'Niyet', tr: 'edineceğim', tone: 'red' } },
          ' new friends here." Then she closes her eyes and smiles.',
        ],
      },
    ],
    highlights: [
      { from: 'move', to: 'is going to move', type: 'Plan', note: 'Önceden verilmiş karar', tone: 'red' },
      { from: 'pack', to: "'re going to pack", type: 'Plan', note: 'they are → they\'re kısaltması', tone: 'red' },
      { from: 'take', to: "isn't going to take", type: 'Olumsuz', note: 'is not → isn\'t, fiil yalın', tone: 'green' },
      { from: 'rain', to: "'s going to rain", type: 'Tahmin', note: 'Kanıt: kara bulutlar', tone: 'teal' },
      { from: 'fall', to: 'is going to fall', type: 'Tahmin', note: 'Kanıt: kutu arabanın üstünde', tone: 'teal' },
      { from: 'make', to: "'m going to make", type: 'Niyet', note: 'I am → I\'m kısaltması', tone: 'red' },
    ],
    quiz: {
      question: 'Metne göre Emma neden "it\'s going to rain" diyor?',
      questionEn: 'Why does Emma say "it\'s going to rain"?',
      options: [
        { label: 'Because dark clouds cover the sky.', correct: true },
        { label: 'Because she heard the weather report yesterday.', correct: false },
        { label: 'Because it always rains by the sea.', correct: false },
      ],
      notice: 'Doğru! 3. paragraftaki "dark clouds cover the sky" ifadesi, tahminin şu an görülen bir kanıta dayandığını gösteriyor.',
    },
    tip: {
      title: 'Öğrenme İpucu: going to mu, will mi?',
      text: 'Karar önceden verildiyse "going to" kullan: "I\'m going to buy a bike." (dün karar verdim). Karar konuşurken anında veriliyorsa "will" kullan: "It\'s cold. I\'ll close the window."',
    },
  },
  recording: {
    minutes: 5,
    intro:
      '"going to" yapısını konuşarak pekiştir. Cümleyi dinle, sonra mikrofona basıp kendi sesinle tekrarla; telaffuzun ölçülsün.',
    sentences: [
      {
        en: "I'm going to visit my aunt next weekend.",
        label: "1. I'm going to visit",
        highlight: ["going to visit"],
        tr: 'Gelecek hafta sonu teyzemi ziyaret edeceğim.',
        tip: '"I\'m" tek hece gibi okunur: "aym". "going to" günlük konuşmada hızlıca "gonna" gibi duyulur.',
      },
      {
        en: "Look at those clouds. It's going to rain.",
        label: '2. going to rain',
        highlight: ["It's going to rain"],
        tr: 'Şu bulutlara bak. Yağmur yağacak.',
        tip: '"It\'s" sonundaki "s" net duyulsun: "its". "going to rain" akıcı bir bütün gibi söylenir.',
      },
      {
        en: "We aren't going to stay at home tonight.",
        label: "3. aren't going to stay",
        highlight: ["aren't going to stay"],
        tr: 'Bu gece evde kalmayacağız.',
        tip: '"aren\'t" kelimesi "ant" gibi okunur; sondaki "t" hafif söylenir. Olumsuzda vurgu "aren\'t" üzerindedir.',
      },
      {
        en: 'Are you going to call her tomorrow?',
        label: '4. Are you going to call',
        highlight: ['Are', 'going to call'],
        tr: 'Onu yarın arayacak mısın?',
        tip: 'Evet/hayır sorusunda cümle sonunda ses yükselir. "Are you" hızlıca "ar-yu" gibi birleşir.',
      },
    ],
  },
  exam: {
    minutes: 6,
    passScore: 4,
    intro:
      'Kural mantığını, örnek cümleleri, video bağlamını ve telaffuz yapılarını bu karışık sınavla test et; sonra kartları FSRS hafıza havuzuna aktar.',
    stages: [
      {
        kind: 'choice',
        title: 'Anlam · Kanıta Dayalı Tahmin',
        question: 'Hangi cümle, şu an görülen bir işarete dayanan tahmindir?',
        options: [
          { label: "Look at that driver! He's going to crash.", correct: true },
          { label: "I'm going to school now.", correct: false },
          { label: 'I think I will have tea, please.', correct: false },
        ],
        explain: 'Sürücünün hareketini şu an görüyoruz; bu kanıta dayalı tahmindir. "going to school" ise gelecek değil, "okula gidiyorum" anlamında harekettir.',
      },
      {
        kind: 'gap',
        title: 'Boşluk Doldurma · Plan',
        prompt: 'My brother {blank} a new laptop next week.',
        answer: 'is going to buy',
        options: ['is going to buy', 'are going to buy', 'is going to bought'],
        rootHint: 'Hedef fiil kökü: [buy]',
        feedback: '"My brother" tekil öznedir: "is going to" + yalın fiil "buy".',
      },
      {
        kind: 'errorChoice',
        title: 'Hata Tespiti · Olumsuz Yapı',
        question: 'Hangi cümlede hata var?',
        options: [
          {
            label: "They don't going to come to the party.",
            note: 'going to ile "don\'t" kullanılmaz; doğrusu "They aren\'t going to come".',
            correct: true,
          },
          { label: "They aren't going to come to the party.", note: 'Doğru: are not + going to + yalın fiil.', correct: false },
          { label: "I'm not going to come to the party.", note: 'Doğru: I am not + going to.', correct: false },
        ],
      },
      {
        kind: 'choice',
        title: 'going to mu, will mi?',
        question: 'Telefon çalıyor ve sen anında karar veriyorsun. Hangisi doğru?',
        options: [
          { label: "I'll answer it!", correct: true },
          { label: "I'm going to answer it!", correct: false },
          { label: "I answering it!", correct: false },
        ],
        explain: 'Konuşurken anında verilen kararda "will" kullanılır. "going to" önceden düşünülmüş planlar içindir.',
      },
      {
        kind: 'scramble',
        title: 'Soru Cümlesi Dizilimi',
        targetTr: 'Bu akşam ne pişireceksin?',
        blocks: ['going to', 'you', 'cook', 'What', 'are', 'this evening'],
        correct: ['What', 'are', 'you', 'going to', 'cook', 'this evening'],
        feedback: 'Wh- soru dizilimi: soru sözcüğü + are + özne + going to + yalın fiil + zaman.',
      },
      {
        kind: 'gap',
        title: 'Soru · Yardımcı Fiil',
        prompt: '{blank} it going to be sunny tomorrow?',
        answer: 'Is',
        options: ['Is', 'Does', 'Are'],
        rootHint: 'going to sorusu',
        feedback: '"it" tekil öznedir; soruda "Is" başa gelir: "Is it going to be sunny?"',
      },
    ],
  },
};
