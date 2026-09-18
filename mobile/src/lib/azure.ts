// Azure Speech ayarlari. Anahtar mobile/.env icinden gelir (EXPO_PUBLIC_ onekli).
// Not: EXPO_PUBLIC_ degiskenleri uygulama paketine gomulur; kisisel kullanim icin uygun.

const key = process.env.EXPO_PUBLIC_AZURE_SPEECH_KEY;
const region = process.env.EXPO_PUBLIC_AZURE_SPEECH_REGION;

export const azure = {
  key,
  region,
  // Anahtar + region varsa telaffuz puani calisir; yoksa uygulama "dinle-tekrarla"ya duser.
  configured: Boolean(key && region),
  // Telaffuz degerlendirme, Speech STT REST ucundan yapilir.
  sttEndpoint: region
    ? `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`
    : undefined,
};
