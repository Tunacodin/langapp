import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space } from '@/constants/appTheme';
import { Gloss } from '@/lib/glossary';

type Props = {
  visible: boolean;
  onClose: () => void;
  word: string | null;
  gloss: Gloss | null;
  example: string; // kelimenin gectigi cumle
  onAddSrs: () => void;
  onListen: () => void; // videonun kendi sesinden kelimeyi calar
};

/**
 * Kelimeye dokununca alttan acilan panel: kelime + tur/CEFR + 1/2/3 anlam + ornek +
 * Dinle (TTS) + SRS'e ekle. Sade RN Modal (native sheet surprizleri yok).
 */
export function WordSheet({ visible, onClose, word, gloss, example, onAddSrs, onListen }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {word && gloss ? (
          <>
            <View style={styles.head}>
              <Text style={styles.word}>{word}</Text>
              <Text style={styles.meta}>
                {gloss.pos} · {gloss.cefr}
              </Text>
            </View>

            <View style={{ gap: space.xs }}>
              {gloss.senses.map((s, i) => (
                <Text key={i} style={styles.sense}>
                  <Text style={styles.senseNum}>{i + 1}. </Text>
                  {s}
                </Text>
              ))}
            </View>

            <Text style={styles.example}>“{example}”</Text>

            <View style={styles.actions}>
              <Pressable style={styles.actionGhost} onPress={onListen}>
                <Text style={styles.actionGhostText}>Dinle</Text>
              </Pressable>
              <Pressable style={styles.actionFilled} onPress={onAddSrs}>
                <Text style={styles.actionFilledText}>SRS'e ekle</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.notFound}>Bu kelimenin sözlük karşılığı yok.</Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.lineStrong,
  },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  word: { fontSize: 24, fontWeight: '800', color: colors.ink },
  meta: { fontSize: 13, color: colors.muted },
  sense: { fontSize: 16, color: colors.ink, lineHeight: 22 },
  senseNum: { color: colors.accent, fontWeight: '800' },
  example: { fontSize: 14, color: colors.muted, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  actionGhost: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  actionGhostText: { color: colors.ink, fontWeight: '700' },
  actionFilled: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  actionFilledText: { color: '#fff', fontWeight: '800' },
  notFound: { fontSize: 14, color: colors.muted },
});
