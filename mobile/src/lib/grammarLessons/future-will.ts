import { GrammarLesson } from './types';

// SEED: Future Simple with "will" (future_will, A2) full lesson module. All 6 steps.
export const FUTURE_WILL: GrammarLesson = {
  minutes: 4,
  summary:
    'Gelecekle ilgili o an verilen kararları, tahminleri, sözleri, teklifleri ve ricaları anlatmak için kullanılır. "will" her özneyle aynı kalır ve arkasından fiilin yalın hali (V1) gelir.',
  summaryStrong: 'o an verilen kararları',
  timeMarkers: [
    'tomorrow',
    'next week',
    'soon',
    'tonight',
    'in 2030',
    'probably',
    'I think...',
    'one day',
  ],
  structures: [
    {
      key: 'positive',
      num: 1,
      title: 'Olumlu Cümle Yapısı',
      subtitle: 'Affirmative',
      metaTag: "will / 'll + V1",
      formula: [
        { text: 'Subject (Özne)' },
        { text: "will ('ll)", style: 'accent' },
        { text: 'Fiil (V1 - Yalın Hal)', style: 'neutral' },
        { text: 'Nesne / Zaman', style: 'muted' },
      ],
      example: {
        text: 'I will call you tomorrow.',
        highlight: ['will call'],
        spoken: 'I will call you tomorrow.',
        translation: 'Seni yarın arayacağım.',
      },
      tip: "Bütün öznelerde (I, You, He, She, It, We, They) \"will\" aynı kalır. Konuşmada genelde kısaltılır: I'll, you'll, he'll, we'll, they'll. Önceden yapılmış bir plan için ise \"be going to\" daha doğaldır.",
      tipTone: 'amber',
    },
    {
      key: 'negative',
      num: 2,
      title: 'Olumsuz Cümle Yapısı',
      subtitle: 'Negative',
      metaTag: "won't + V1",
      formula: [
        { text: 'Subject (Özne)' },
        { text: "won't (will not)", style: 'accent' },
        { text: 'Fiil (V1 - Yalın Hal)', style: 'neutral' },
        { text: 'Nesne / Zaman', style: 'muted' },
      ],
      example: {
        text: "I won't be late tomorrow.",
        highlight: ["won't be"],
        spoken: 'I will not be late tomorrow.',
        translation: 'Yarın geç kalmayacağım.',
      },
      tip: "\"won't\", \"will not\" demektir. Arkasından fiil hep yalın gelir: won't go (won't goes değil). \"won't\" ile \"want\" (istemek) kelimesini karıştırma!",
      tipTone: 'red',
    },
    {
      key: 'question',
      num: 3,
      title: 'Soru Cümlesi Yapısı',
      subtitle: 'Question / Interrogative',
      metaTag: 'Will başa gelir',
      formula: [
        { text: 'Will', style: 'accent' },
        { text: 'Subject (Özne)' },
        { text: 'Fiil (V1 - Yalın Hal)', style: 'neutral' },
        { text: 'Nesne / Zaman ?', style: 'muted' },
      ],
      example: {
        text: 'Will you help me tomorrow?',
        highlight: ['Will', 'help'],
        spoken: 'Will you help me tomorrow?',
        translation: 'Yarın bana yardım eder misin?',
      },
      tip: "Soruda \"Will\" başa gelir, fiil yalın kalır. Kısa cevap: Yes, I will / No, I won't. \"Will you...?\" aynı zamanda kibar bir rica kalıbıdır.",
      tipTone: 'amber',
    },
  ],
  quiz: {
    prompt: 'The bags look heavy. I {blank} (help) you!',
    blankAnswer: 'will help',
    translation: 'Çantalar ağır görünüyor. Sana yardım edeyim!',
    spoken: 'The bags look heavy. I will help you!',
    options: [
      { label: 'will help', correct: true },
      { label: 'will helps', correct: false },
      { label: 'helped', correct: false },
    ],
    explainCorrect: 'O an verilen bir karar ve teklif: will + yalın fiil (help).',
    explainWrong: '"will" sonrasında fiil hiçbir ek almaz. Doğrusu "will help".',
  },
  examples: {
    minutes: 5,
    intro:
      '"will" yapısının günlük dilde olumlu, olumsuz ve soru cümlelerinde nasıl kullanıldığını doğal örneklerle incele.',
    tabs: [
      {
        key: 'positive',
        tabLabel: '+ Olumlu',
        groups: [
          {
            title: 'Anlık karar ve teklif',
            tag: 'Konuşma anında',
            color: 'red',
            cards: [
              {
                en: "I'm hungry. I'll make a sandwich.",
                highlight: ["I'll make"],
                tr: 'Acıktım. Bir sandviç yapayım.',
                badge: "I'll + make (V1)",
                meta: 'Karar şu an verildi',
              },
              {
                en: "That box looks heavy. I'll carry it for you.",
                highlight: ["I'll carry"],
                tr: 'O kutu ağır görünüyor. Senin için ben taşırım.',
                badge: "I'll + carry (teklif)",
                meta: 'Yardım teklifi',
              },
            ],
          },
          {
            title: 'Tahmin ve söz',
            tag: 'Görüş ve söz',
            color: 'teal',
            cards: [
              {
                en: 'I think our team will win the match.',
                highlight: ['will win'],
                tr: 'Bence takımımız maçı kazanacak.',
                badge: 'I think + will win',
                meta: 'Kişisel tahmin',
              },
              {
                en: "I promise I'll call you every day.",
                highlight: ["I'll call"],
                tr: 'Söz veriyorum, seni her gün arayacağım.',
                badge: "promise + I'll call",
                meta: 'Söz verme',
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
            title: "Olumsuz kalıp: won't + yalın fiil (V1)",
            tag: 'Kritik kural',
            color: 'red',
            cards: [
              {
                en: "She won't come to the party tonight.",
                highlight: ["won't come"],
                tr: 'Bu gece partiye gelmeyecek.',
                badge: "won't + come (V1)",
                meta: 'Zaman: tonight',
              },
              {
                en: "Don't worry, I won't tell anyone.",
                highlight: ["won't tell"],
                tr: 'Merak etme, kimseye söylemeyeceğim.',
                badge: "won't + tell (söz)",
                meta: 'Olumsuz söz',
              },
            ],
          },
          {
            title: 'Günlük konuşma örnekleri',
            tag: 'Doğal kullanım',
            color: 'teal',
            cards: [
              {
                en: "I don't think it will rain tomorrow.",
                highlight: ['will rain'],
                tr: 'Yarın yağmur yağacağını sanmıyorum.',
                badge: "I don't think + will",
                meta: 'Olumsuzluk "think" üzerinde',
              },
              {
                en: "My old car won't start this morning.",
                highlight: ["won't start"],
                tr: 'Eski arabam bu sabah bir türlü çalışmıyor.',
                badge: "won't + start",
                meta: 'Bir şey "çalışmayı reddediyor"',
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
            title: 'Genel soru: Will + özne + yalın fiil?',
            tag: 'Soru mantığı',
            color: 'red',
            cards: [
              {
                en: 'Will you be at home tonight?',
                highlight: ['Will you be'],
                tr: 'Bu akşam evde olacak mısın?',
                badge: 'Will + be (V1)',
                meta: "Cevap: Yes, I will / No, I won't",
              },
              {
                en: 'Will you open the window, please?',
                highlight: ['Will you open'],
                tr: 'Pencereyi açar mısın, lütfen?',
                badge: 'Will you + open',
                meta: 'Kibar rica',
              },
            ],
          },
          {
            title: 'Soru sözcükleriyle (Wh- + will)',
            tag: 'Wh- soruları',
            color: 'teal',
            cards: [
              {
                en: 'What will you do after school?',
                highlight: ['will you do'],
                tr: 'Okuldan sonra ne yapacaksın?',
                badge: 'What will + do',
                meta: 'Soru sözcüğü en başta',
              },
              {
                en: 'When will the train arrive?',
                highlight: ['will the train arrive'],
                tr: 'Tren ne zaman varacak?',
                badge: 'When will + arrive',
                meta: 'arrives değil, arrive',
              },
            ],
          },
        ],
      },
    ],
    quiz: {
      prompt: 'I think it {blank} (be) sunny tomorrow.',
      blankAnswer: 'will be',
      translation: 'Bence yarın hava güneşli olacak.',
      spoken: 'I think it will be sunny tomorrow.',
      options: [
        { label: 'will be', correct: true },
        { label: 'will is', correct: false },
        { label: 'was', correct: false },
      ],
      explainCorrect: '"I think" ile bir tahmin yapılıyor: will + yalın fiil (be).',
      explainWrong: '"will" sonrasında fiil yalın gelir: "will be" ("will is" olmaz). "was" ise geçmiş zamandır.',
    },
  },
  video: {
    minutes: 6,
    intro:
      '"will" ve kısaltması "\'ll" gerçek video kesitlerinde nasıl duyuluyor, izle; sonra 4 aşamalı pratikle pekiştir.',
    practice: [
      {
        kind: 'gap',
        instruction: 'Boşluk Doldurma · Anlık Karar',
        prompt: "It's cold in here. I {blank} (close) the window.",
        answer: "'ll close",
        options: ["'ll close", 'closed', 'will closing'],
        feedback: "Doğru! O an verilen bir karar: I'll close (I will close).",
      },
      {
        kind: 'scramble',
        instruction: 'Cümle Dizilimi · Sıralama',
        hint: 'Blokları doğru sırayla dizerek cümleyi kur:',
        blocks: ['you', "I'll", 'with your bags', 'help'],
        correct: ["I'll", 'help', 'you', 'with your bags'],
        feedback: "Doğru dizilim: özne + 'll + yalın fiil (help) + nesne.",
      },
      {
        kind: 'error',
        instruction: 'Hata Tespiti · Kural Analizi',
        before: 'She ',
        wrong: 'will goes',
        after: ' to the doctor tomorrow.',
        options: [
          { label: 'will goes (will go olmalı)', correct: true },
          { label: 'tomorrow (doğru zaman ifadesi)', correct: false },
        ],
        feedback: 'Doğru tespit! "will" sonrasında fiil ek almaz; "she" olsa bile "will go" denir.',
      },
      {
        kind: 'gap',
        instruction: 'Boşluk Doldurma · Olumsuz Söz',
        prompt: "Don't worry, I {blank} (not / tell) anyone your secret.",
        answer: "won't tell",
        options: ["won't tell", "don't tell", "won't to tell"],
        feedback: "Doğru! Olumsuz söz: won't + yalın fiil (tell). Arada \"to\" olmaz.",
      },
    ],
    tip: {
      title: 'İzleme İpucu: Kısaltmayı Yakala',
      text: '"will" konuşmada çoğu zaman tam söylenmez, "\'ll" olarak duyulur: I\'ll, we\'ll, it\'ll. Videoyu izlerken bu küçük "l" sesine odaklan; "won\'t" ise her zaman net ve vurgulu söylenir.',
    },
  },
  reading: {
    minutes: 7,
    storyTitle: 'Moving Day',
    intro:
      '"will" yapısının bir taşınma hikayesinde kararlar, tahminler, sözler ve tekliflerle nasıl kullanıldığını oku, anlam çıkar ve pekiştir.',
    paragraphs: [
      {
        section: 'Bölüm I • Karar',
        spoken:
          "My sister Deniz is moving to a new flat next Saturday. Last night she called me and asked for help. I made a quick decision on the phone: I'll bring my car, and I'll carry the heavy boxes. Her flat is on the fourth floor, so I think we will need one more person.",
        segments: [
          'My sister Deniz is moving to a new flat next Saturday. Last night she called me and asked for help. I made a quick decision on the phone: I',
          { verb: { base: 'bring', v2: "'ll bring", type: 'Anlık karar', tr: 'getireceğim', tone: 'red' } },
          ' my car, and I',
          { verb: { base: 'carry', v2: "'ll carry", type: 'Anlık karar', tr: 'taşıyacağım', tone: 'red' } },
          ' the heavy boxes. Her flat is on the fourth floor, so I think we ',
          { verb: { base: 'need', v2: 'will need', type: 'Tahmin', tr: 'ihtiyacımız olacak', tone: 'teal' } },
          ' one more person.',
        ],
      },
      {
        section: 'Bölüm II • Teklif',
        spoken:
          "I texted my friend Emre, and he answered in a minute: Don't worry, I'll help you! Will you buy me lunch after the move? I promised him a big pizza. Emre is very strong, so he won't get tired easily.",
        segments: [
          "I texted my friend Emre, and he answered in a minute: Don't worry, I",
          { verb: { base: 'help', v2: "'ll help", type: 'Teklif', tr: 'yardım ederim', tone: 'teal' } },
          ' you! ',
          { verb: { base: 'buy', v2: 'Will you buy', type: 'Rica (Will you...?)', tr: 'alır mısın?', tone: 'red' } },
          ' me lunch after the move? I promised him a big pizza. Emre is very strong, so he ',
          { verb: { base: 'get tired', v2: "won't get", type: "Olumsuz (won't)", tr: 'yorulmayacak', tone: 'green' } },
          ' tired easily.',
        ],
      },
      {
        section: 'Bölüm III • Taşınma Günü',
        spoken:
          "On Saturday morning, the sky was dark and grey. Deniz looked worried and said: It will probably rain, and my books will get wet! I gave her a promise: I won't let anything happen to your books. We covered every box with plastic bags.",
        segments: [
          'On Saturday morning, the sky was dark and grey. Deniz looked worried and said: It ',
          { verb: { base: 'rain', v2: 'will probably rain', type: 'Tahmin', tr: 'muhtemelen yağmur yağacak', tone: 'teal' } },
          ', and my books ',
          { verb: { base: 'get wet', v2: 'will get', type: 'Tahmin', tr: 'ıslanacak', tone: 'teal' } },
          ' wet! I gave her a promise: I ',
          { verb: { base: 'let', v2: "won't let", type: "Söz (won't)", tr: 'izin vermeyeceğim', tone: 'green' } },
          ' anything happen to your books. We covered every box with plastic bags.',
        ],
      },
      {
        section: 'Bölüm IV • Yeni Ev',
        spoken:
          "In the evening, the new flat was full of boxes, but everyone was happy. Deniz hugged us and said: I'll never forget this day. The sun will set in an hour, so I'll make some tea for everyone.",
        segments: [
          'In the evening, the new flat was full of boxes, but everyone was happy. Deniz hugged us and said: I',
          { verb: { base: 'forget', v2: "'ll never forget", type: 'Söz', tr: 'asla unutmayacağım', tone: 'green' } },
          ' this day. The sun ',
          { verb: { base: 'set', v2: 'will set', type: 'Gelecek gerçeği', tr: 'batacak', tone: 'teal' } },
          ' in an hour, so I',
          { verb: { base: 'make', v2: "'ll make", type: 'Anlık karar', tr: 'yapayım', tone: 'red' } },
          ' some tea for everyone.',
        ],
      },
    ],
    highlights: [
      { from: 'bring', to: "'ll bring", type: 'Anlık karar', note: 'Telefonda o an verilen karar', tone: 'red' },
      { from: 'need', to: 'will need', type: 'Tahmin', note: '"I think" ile kişisel görüş', tone: 'teal' },
      { from: 'help', to: "'ll help", type: 'Teklif', note: 'Yardım önerisi', tone: 'teal' },
      { from: 'buy', to: 'Will you buy', type: 'Rica', note: '"Will you...?" ile kibar istek', tone: 'red' },
      { from: 'get tired', to: "won't get", type: 'Olumsuz', note: "won't = will not", tone: 'green' },
      { from: 'set', to: 'will set', type: 'Gelecek gerçeği', note: 'Kesin olacak bir olay', tone: 'teal' },
    ],
    quiz: {
      question: 'Metne göre Emre, taşınmaya yardım etmek için karşılığında ne istiyor?',
      questionEn: 'What does Emre ask for after the move?',
      options: [
        { label: 'He asks for lunch after the move.', correct: true },
        { label: 'He asks for money for his help.', correct: false },
        { label: 'He asks to stay in the new flat.', correct: false },
      ],
      notice: 'Doğru! 2. paragraftaki "Will you buy me lunch after the move?" ifadesi bu yanıtı doğruluyor.',
    },
    tip: {
      title: 'Öğrenme İpucu: will mi, going to mu?',
      text: 'Önceden planladığın işler için "be going to" kullan (I\'m going to visit my aunt on Sunday). Konuşma anında verdiğin kararlar, sözler ve teklifler için "will" kullan (The phone is ringing. I\'ll answer it!).',
    },
  },
  recording: {
    minutes: 5,
    intro:
      '"will" yapısını konuşarak pekiştir. Cümleyi dinle, sonra mikrofona basıp kendi sesinle tekrarla; telaffuzun ölçülsün.',
    sentences: [
      {
        en: "I'll call you tomorrow.",
        label: "1. I'll call",
        highlight: ["I'll call"],
        tr: 'Seni yarın arayacağım.',
        tip: '"I\'ll" tek hecedir: /aɪl/ ("ayl"). "I will" diye iki ayrı kelime söylemek zorunda değilsin.',
      },
      {
        en: 'I think it will rain tonight.',
        label: '2. will rain',
        highlight: ['will rain'],
        tr: 'Bence bu gece yağmur yağacak.',
        tip: '"will" kısa okunur: /wɪl/. Sondaki "l" sesinde dil ucu üst dişlerin arkasına değer.',
      },
      {
        en: "Don't worry, I won't forget your birthday.",
        label: "3. won't forget",
        highlight: ["won't forget"],
        tr: 'Merak etme, doğum gününü unutmayacağım.',
        tip: '"won\'t" /woʊnt/ ("vount") okunur; "want" /wɒnt/ ("vont") ile karıştırma. "won\'t" içindeki "o" uzun ve yuvarlaktır.',
      },
      {
        en: 'Will you help me with my homework?',
        label: '4. Will you help',
        highlight: ['Will', 'help'],
        tr: 'Ödevimde bana yardım eder misin?',
        tip: '"Will" vurgulu başlar, cümlenin sonunda ses hafifçe yükselir; bu, kibar bir rica tonudur.',
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
        title: 'Zaman Zarfı Seçimi',
        question: 'Aşağıdaki zaman zarflarından hangisi "will" ile kullanılır?',
        options: [
          { label: 'tomorrow', correct: true },
          { label: 'yesterday', correct: false },
          { label: 'last week', correct: false },
        ],
        explain: '"will" geleceği anlatır: tomorrow, next week, soon... "yesterday" ve "last week" geçmiştir.',
      },
      {
        kind: 'gap',
        title: 'Boşluk Doldurma · Tahmin',
        prompt: 'I think she {blank} (pass) the exam.',
        answer: 'will pass',
        options: ['will pass', 'will passes', 'passed'],
        rootHint: 'Hedef fiil kökü: [pass]',
        feedback: '"I think" ile yapılan bir tahmin: will + yalın fiil (pass). "will passes" diye bir yapı yoktur.',
      },
      {
        kind: 'errorChoice',
        title: 'Kural Hatası · will + V1',
        question: 'Hangi cümlede hata var?',
        options: [
          {
            label: 'He will comes to the party.',
            note: '"will" sonrasında fiil ek almaz: "He will come" olmalı.',
            correct: true,
          },
          { label: 'He will come to the party.', note: 'Doğru: will + yalın fiil.', correct: false },
          { label: "They won't be late.", note: "Doğru: won't + yalın fiil (be).", correct: false },
        ],
      },
      {
        kind: 'choice',
        title: 'Durum · Anlık Karar',
        question: 'Telefon çalıyor ve sen hemen açmaya karar veriyorsun. Hangisini söylersin?',
        options: [
          { label: "I'll get it!", correct: true },
          { label: 'I got it yesterday!', correct: false },
          { label: 'I will to get it!', correct: false },
        ],
        explain: 'Konuşma anında verilen karar için "will" kullanılır: "I\'ll get it!" ("will" sonrasında "to" gelmez).',
      },
      {
        kind: 'scramble',
        title: 'Olumsuz Cümle Dizilimi',
        targetTr: 'Yarın geç kalmayacağım.',
        blocks: ['late', 'I', "won't", 'tomorrow', 'be'],
        correct: ['I', "won't", 'be', 'late', 'tomorrow'],
        feedback: "Olumsuz dizilim: özne + won't + yalın fiil (be) + sıfat + zaman.",
      },
      {
        kind: 'gap',
        title: 'Soru · Kibar Rica',
        prompt: '{blank} you open the window, please?',
        answer: 'Will',
        options: ['Will', 'Do', 'Are'],
        rootHint: 'Rica sorusu',
        feedback: 'Kibar ricada "Will" başa gelir, ardından özne ve yalın fiil (open) gelir.',
      },
    ],
  },
};
