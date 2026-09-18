import { IOSOutputFormat, RecordingOptions, RecordingPresets } from 'expo-audio';

// Azure telaffuz degerlendirmesi 16kHz mono WAV (PCM) ister.
// iOS'ta LINEARPCM ile bunu dogrudan kaydediyoruz. (Android WAV vermez; simdilik iOS.)
export const WAV_16K_MONO: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};
