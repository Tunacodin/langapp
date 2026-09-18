// Uygulama geneli tema: Airbnb tarzi. Acik zemin, sicak mercan aksan,
// yuvarlak koseler, ince kenarlik ayraclar. Golge yok / cok hafif.
// Kimlik: Rausch mercan (#FF385C) + notr sicak griler + genis yuvarlaklik.

export const colors = {
  bg: '#FFFFFF', // ana zemin (canvas)
  surface: '#F7F7F7', // ikincil yuzey (bolum zemini / hafif kart)
  ink: '#222222', // ana metin (Airbnb near-black)
  muted: '#717171', // ikincil metin
  line: '#EBEBEB', // ince ayrac / hairline kenarlik
  lineStrong: '#DDDDDD', // belirgin kenarlik (input, buton dis cizgi)
  accent: '#FF385C', // Rausch: tek guclu vurgu (mercan/kirmizi)
  accentDark: '#E00B41', // basili/hover mercan
  accentSoft: '#FFE8EC', // mercanin soluk tonu (rozet zemini)
  success: '#008A05', // fiyat/onay yesili
  warning: '#FFB400', // uyari sarisi
  danger: '#C13515', // hata kirmizisi (Airbnb error)
  star: '#222222', // yildiz/derece ikonu
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Airbnb imzasi: genis yuvarlaklik. sm=kucuk oge, md=input/kart, lg/xl=gorsel, pill=filtre cipi.
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
} as const;

// Golge kurali: varsayilan golge YOK. Gerekince tek, cok hafif yukselti icin bu tokeni kullan.
// Ayrac icin once hairline kenarlik (colors.line) tercih et.
export const elevation = {
  none: {},
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3, // Android
  },
} as const;
