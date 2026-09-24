import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { addSrsCard } from '@/lib/db';
import { alignWords, type WordStatus } from '@/lib/wordAlign';
import {
  getSong,
  resolveSongVideo,
  type SongClip,
  type SongLyricLine,
} from '@/lib/songs';

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/'ve/g, ' have')
    .replace(/'re/g, ' are')
    .replace(/'d/g, ' would')
    .replace(/'ll/g, ' will')
    .replace(/n't/g, ' not')
    .replace(/'m/g, ' am')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function SongScreen() {
  const p = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const clip = useMemo(() => getSong(p.id), [p.id]);

  const [source, setSource] = useState<VideoSource | null>(null);
  useEffect(() => {
    if (clip) resolveSongVideo(clip.clip_id).then((uri) => uri && setSource({ uri }));
  }, [clip]);

  const player = useVideoPlayer(source, (pl) => {
    pl.timeUpdateEventInterval = 0.1;
  });

  const [tMs, setTMs] = useState(0);
  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => setTMs(currentTime * 1000));
    return () => sub.remove();
  }, [player]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          player.pause();
        } catch {}
      };
    }, [player]),
  );

  const [showTr, setShowTr] = useState(false);
  const [practice, setPractice] = useState(false);

  if (!clip) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.noText}>Şarkı bulunamadı.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text style={styles.barTitle} numberOfLines={1}>
          {clip.artist} · {clip.song_title}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {source ? (
        <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
      ) : (
        <View style={[styles.video, styles.videoLoading]}>
          <Ionicons name="musical-notes" size={26} color={colors.muted} />
        </View>
      )}

      <View style={styles.options}>
        <Toggle label="Türkçe" on={showTr} onPress={() => setShowTr((v) => !v)} />
        <Toggle label="Pratik" on={practice} onPress={() => setPractice((v) => !v)} />
      </View>

      <Lyrics
        clip={clip}
        tMs={tMs}
        showTr={showTr}
        practice={practice}
        bottom={insets.bottom}
        onSeekLine={(ms) => {
          player.currentTime = ms / 1000;
          player.play();
        }}
        onVoiceStart={() => {
          try {
            player.pause();
          } catch {}
        }}
      />
    </View>
  );
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.toggle, on && styles.toggleOn]} onPress={onPress} hitSlop={6}>
      <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Lyrics({
  clip,
  tMs,
  showTr,
  practice,
  bottom,
  onSeekLine,
  onVoiceStart,
}: {
  clip: SongClip;
  tMs: number;
  showTr: boolean;
  practice: boolean;
  bottom: number;
  onSeekLine: (ms: number) => void;
  onVoiceStart: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const yRef = useRef<number[]>([]);
  const lastActive = useRef(-1);

  // Ses pratigi: secili satir (dokununca) + kayit + canli duyulan metin.
  const [selected, setSelected] = useState(-1);
  const [recording, setRecording] = useState(false);
  const [heard, setHeard] = useState('');
  const recRef = useRef(false);

  useSpeechRecognitionEvent('result', (e) => {
    if (recRef.current) setHeard(e.results?.[0]?.transcript ?? '');
  });
  useSpeechRecognitionEvent('end', () => {
    recRef.current = false;
    setRecording(false);
  });
  useSpeechRecognitionEvent('error', () => {
    recRef.current = false;
    setRecording(false);
  });

  const stopVoice = useCallback(() => {
    recRef.current = false;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
    setRecording(false);
  }, []);

  const startVoice = useCallback(
    async (i: number) => {
      try {
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm.granted) return;
      } catch {}
      onVoiceStart();
      setSelected(i);
      setHeard('');
      recRef.current = true;
      setRecording(true);
      try {
        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
        });
      } catch {
        recRef.current = false;
        setRecording(false);
      }
    },
    [onVoiceStart],
  );

  // Ekrandan cikinca kaydi durdur.
  useFocusEffect(
    useCallback(() => {
      return () => {
        recRef.current = false;
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {}
      };
    }, []),
  );

  const active = useMemo(() => {
    const ld = clip.lyrics_data;
    let idx = -1;
    for (let i = 0; i < ld.length; i++) {
      if (ld[i].time_start_ms <= tMs) idx = i;
      else break;
    }
    return idx;
  }, [clip.lyrics_data, tMs]);

  useEffect(() => {
    if (active < 0 || active === lastActive.current) return;
    lastActive.current = active;
    const y = yRef.current[active];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 140), animated: true });
  }, [active]);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={[styles.lyrics, { paddingBottom: bottom + 32 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {clip.lyrics_data.map((l, i) => (
        <Line
          key={i}
          line={l}
          state={i === active ? 'active' : i < active ? 'past' : 'future'}
          tMs={tMs}
          showTr={showTr}
          practice={practice}
          clip={clip}
          selected={practice && selected === i}
          recording={practice && selected === i && recording}
          heard={heard}
          onLayout={(y) => (yRef.current[i] = y)}
          onPress={() => {
            if (practice) {
              if (recording) stopVoice();
              setSelected(i);
            } else {
              onSeekLine(l.time_start_ms);
            }
          }}
          onMic={() => (recording ? stopVoice() : startVoice(i))}
        />
      ))}
    </ScrollView>
  );
}

function Line({
  line,
  state,
  tMs,
  showTr,
  practice,
  clip,
  selected,
  recording,
  heard,
  onLayout,
  onPress,
  onMic,
}: {
  line: SongLyricLine;
  state: 'active' | 'past' | 'future';
  tMs: number;
  showTr: boolean;
  practice: boolean;
  clip: SongClip;
  selected: boolean;
  recording: boolean;
  heard: string;
  onLayout: (y: number) => void;
  onPress: () => void;
  onMic: () => void;
}) {
  const blanked = practice && line.is_target && !selected;

  return (
    <Pressable onLayout={(e) => onLayout(e.nativeEvent.layout.y)} onPress={onPress} style={styles.row}>
      <View style={styles.lineRow}>
        <View style={{ flex: 1 }}>
          {recording ? (
            <MatchWords text={line.text} heard={heard} />
          ) : blanked ? (
            <BlankLine clip={clip} />
          ) : state === 'active' ? (
            <ActiveWords line={line} tMs={tMs} />
          ) : (
            <Text style={[styles.text, state === 'past' ? styles.past : styles.future]}>{line.text}</Text>
          )}
        </View>
        {selected ? (
          <Pressable onPress={onMic} hitSlop={10} style={styles.mic}>
            <Ionicons
              name={recording ? 'stop-circle' : 'mic-outline'}
              size={20}
              color={recording ? colors.accent : colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {showTr && line.text_tr ? <Text style={styles.tr}>{line.text_tr}</Text> : null}
    </Pressable>
  );
}

// Karaoke: aktif satirda kelimeler soylendikce ilerler (yaklasik, satir suresine gore).
function ActiveWords({ line, tMs }: { line: SongLyricLine; tMs: number }) {
  const words = line.text.split(' ');
  const dur = Math.max(1, line.end_ms - line.time_start_ms);
  const p = Math.min(1, Math.max(0, (tMs - line.time_start_ms) / dur));
  const total = line.text.length || 1;
  let acc = 0;
  return (
    <Text style={styles.text}>
      {words.map((w, i) => {
        const frac = (acc + w.length / 2) / total;
        acc += w.length + 1;
        return (
          <Text key={i} style={frac <= p ? styles.on : styles.off}>
            {w + (i < words.length - 1 ? ' ' : '')}
          </Text>
        );
      })}
    </Text>
  );
}

// Ses pratigi: konustukca her kelime yesil (dogru) / kirmizi (yanlis). Yanlis
// kelimenin ustunde kucuk absolute not (duyulan kelime).
function MatchWords({ text, heard }: { text: string; heard: string }) {
  const words = text.split(' ');
  const { status, note } = alignWords(words, heard);
  return (
    <View style={styles.matchWrap}>
      {words.map((w, i) => (
        <View key={i} style={styles.wordWrap}>
          {status[i] === 'wrong' && note[i] ? <Text style={styles.wrongNote}>{note[i]}</Text> : null}
          <Text
            style={[
              styles.mWord,
              status[i] === 'ok' && styles.mOk,
              status[i] === 'wrong' && styles.mWrong,
            ]}>
            {w}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Boşluk doldurma: hedef satirda odak kelime satir ici bosluk. Dogru yazilinca
// otomatik yesile doner, tekrar havuzuna sessizce eklenir. Buton yok.
function BlankLine({ clip }: { clip: SongClip }) {
  const [value, setValue] = useState('');
  const [ok, setOk] = useState(false);
  const i = clip.target_line.toLowerCase().indexOf(clip.cloze_answer.toLowerCase());
  const before = i < 0 ? clip.target_line + ' ' : clip.target_line.slice(0, i);
  const after = i < 0 ? '' : clip.target_line.slice(i + clip.cloze_answer.length);

  return (
    <Text style={styles.text}>
      {before}
      {ok ? (
        <Text style={styles.filled}>{clip.cloze_answer}</Text>
      ) : (
        <TextInput
          value={value}
          onChangeText={(t) => {
            setValue(t);
            if (norm(t) === norm(clip.cloze_answer)) {
              setOk(true);
              addSrsCard({
                front_type: 'song_cloze',
                front_en: clip.target_line.replace(clip.cloze_answer, '____'),
                back_tr: `${clip.cloze_answer} - ${clip.hint_tr}`,
                media_id: clip.clip_id,
                source: 'grammar',
              });
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.blank}
        />
      )}
      {after}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  noText: { fontSize: 15, color: colors.muted },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: colors.ink },

  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  videoLoading: { alignItems: 'center', justifyContent: 'center' },

  options: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  toggle: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  toggleOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  toggleText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  toggleTextOn: { color: '#fff' },

  lyrics: { padding: space.lg, gap: 4 },
  row: { paddingVertical: 7 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  mic: { paddingTop: 2 },
  text: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: colors.ink },
  past: { color: colors.muted },
  future: { color: colors.lineStrong },
  tr: { fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 18 },
  on: { color: colors.accent, fontWeight: '800' },
  off: { color: colors.ink, fontWeight: '700' },

  // Ses eslesme
  matchWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  wordWrap: { position: 'relative', marginRight: 6 },
  wrongNote: {
    position: 'absolute',
    top: -11,
    left: 0,
    fontSize: 9,
    fontWeight: '700',
    color: colors.danger,
  },
  mWord: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: colors.ink },
  mOk: { color: colors.good },
  mWrong: { color: colors.danger, textDecorationLine: 'underline' },

  blank: {
    minWidth: 90,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    color: colors.accent,
    fontSize: 18,
    fontWeight: '800',
    padding: 0,
    textAlign: 'center',
  },
  filled: { color: colors.good, fontWeight: '800' },
});
