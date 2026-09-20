import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppSheet } from '@/components/app-sheet';
import { colors, radius, space } from '@/constants/appTheme';
import {
  addSrsCard,
  getCrossVideoOccurrencesByLemma,
  getLexemeExamples,
  getLexemeFormsByLemma,
  lookupLexeme,
  type CrossOccurrence,
  type ExampleRow,
  type Lexeme,
  type LexemeForm,
} from '@/lib/db';

// POS (kelime turu) -> Turkce etiket. Bilinmeyen kod oldugu gibi gosterilir.
const POS_TR: Record<string, string> = {
  NOUN: 'İsim',
  VERB: 'Fiil',
  ADJ: 'Sıfat',
  ADV: 'Zarf',
  PRON: 'Zamir',
  PROPN: 'Özel İsim',
  ADP: 'Edat',
  DET: 'Belirteç',
  CCONJ: 'Bağlaç',
  SCONJ: 'Bağlaç',
  NUM: 'Sayı',
  PART: 'Edat',
  INTJ: 'Ünlem',
  AUX: 'Yardımcı Fiil',
};
const posLabel = (pos: string) => POS_TR[pos] ?? pos;

// Bir POS turu icin: kuratorlu ornekler (examples tablosu) + gercek video cumleleri.
type FormBlock = {
  form: LexemeForm;
  curated: ExampleRow[]; // examples tablosundan (bos olabilir)
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Dokunulan sozcuk (yuzey bicimi). */
  surface: string | null;
  /** Baglam: o cumledeki anlami dogru cozmek icin. */
  ctx?: { mediaId: string; sentenceIdx: number };
};

/**
 * Kelimeye dokununca acilan bottom sheet:
 * - Baslik + okunus (TTS "Dinle").
 * - Turleri (isim/sifat/fiil...) ve her tur icin anlamlar.
 * - Her tur icin ornek cumleler: once kuratorlu (examples tablosu), yoksa
 *   videolardaki GERCEK kullanimlar. Hepsi Turkce cevirisiyle. Uydurma YOK.
 */
export function WordSheet({ visible, onClose, surface, ctx }: Props) {
  const [lex, setLex] = useState<Lexeme | null>(null);
  const [blocks, setBlocks] = useState<FormBlock[]>([]);
  const [occ, setOcc] = useState<CrossOccurrence[]>([]);

  const display = (lex?.lemma ?? surface ?? '').trim();

  useEffect(() => {
    if (!visible || !surface) return;
    const l = lookupLexeme(surface, ctx);
    setLex(l);
    if (l) {
      const forms = getLexemeFormsByLemma(l.lemma);
      // lookupLexeme kok bulur ama forms bos donerse (nadiren), en azindan kendisini goster.
      const list = forms.length > 0 ? forms : [];
      setBlocks(
        list.map((form) => ({ form, curated: getLexemeExamples(form.lemma, form.pos).slice(0, 5) })),
      );
      setOcc(dedupeOcc(getCrossVideoOccurrencesByLemma(l.lemma)).slice(0, 5));
    } else {
      setBlocks([]);
      setOcc([]);
    }
  }, [visible, surface, ctx?.mediaId, ctx?.sentenceIdx]);

  const speak = () => {
    if (display) Speech.speak(display, { language: 'en-US', rate: 0.9 });
  };

  const save = () => {
    if (!lex) return;
    addSrsCard({
      front_type: 'vocab',
      front_en: lex.lemma,
      back_tr: lex.senses.map((s) => s.gloss_tr).join('; '),
      lexicon_id: lex.lexicon_id,
    });
  };

  const cefr = useMemo(() => blocks.find((b) => b.form.cefr)?.form.cefr ?? null, [blocks]);

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      height="half"
      scrollable
      footer={
        lex ? (
          <Pressable style={styles.saveBtn} onPress={save}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.saveText}>Kelimeyi Kaydet</Text>
          </Pressable>
        ) : undefined
      }>
      {/* Baslik + okunus */}
      <View style={styles.headRow}>
        <View style={styles.headLeft}>
          <Text style={styles.word}>{display || '—'}</Text>
          {cefr ? <Text style={styles.cefr}>{cefr}</Text> : null}
        </View>
        <Pressable style={styles.speakBtn} onPress={speak} hitSlop={8}>
          <Ionicons name="volume-high" size={22} color={colors.accent} />
        </Pressable>
      </View>

      {!lex ? (
        <Text style={styles.empty}>
          Bu kelime sözlükte kayıtlı değil. Okunuşu için “Dinle” simgesine dokun.
        </Text>
      ) : null}

      {/* Turler + anlamlar + ornekler */}
      {blocks.map((b) => (
        <View key={`${b.form.pos}-${b.form.lexicon_id}`} style={styles.formBlock}>
          <View style={styles.posRow}>
            <View style={styles.posBadge}>
              <Text style={styles.posText}>{posLabel(b.form.pos)}</Text>
            </View>
            {b.form.cefr ? <Text style={styles.posCefr}>{b.form.cefr}</Text> : null}
          </View>

          {/* Anlamlar */}
          {b.form.senses.length > 0 ? (
            <View style={styles.senses}>
              {b.form.senses.map((s, i) => (
                <View key={i} style={styles.senseRow}>
                  <Text style={styles.senseNum}>{i + 1}</Text>
                  <Text style={styles.senseText}>{s.gloss_tr}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noSense}>Anlam kaydı yok.</Text>
          )}

          {/* Bu tur icin kuratorlu ornekler (varsa) */}
          {b.curated.length > 0 ? (
            <View style={styles.examples}>
              <Text style={styles.exLabel}>Örnek cümleler</Text>
              {b.curated.map((ex, i) => (
                <ExampleItem key={i} en={ex.text_en} tr={ex.text_tr} />
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {/* Videolardaki gercek kullanimlar (kuratorlu ornek yoksa asil kaynak) */}
      {occ.length > 0 ? (
        <View style={styles.examples}>
          <Text style={styles.exLabel}>Videolardaki kullanımlar</Text>
          {occ.map((o, i) => (
            <ExampleItem key={i} en={o.text_en} tr={o.text_tr} />
          ))}
        </View>
      ) : lex ? (
        <Text style={styles.noSense}>Bu kelime için örnek cümle henüz yok.</Text>
      ) : null}
    </AppSheet>
  );
}

function ExampleItem({ en, tr }: { en: string; tr: string | null }) {
  return (
    <View style={styles.exItem}>
      <Text style={styles.exEn}>{en}</Text>
      {tr ? <Text style={styles.exTr}>{tr}</Text> : null}
    </View>
  );
}

function dedupeOcc(list: CrossOccurrence[]): CrossOccurrence[] {
  const seen = new Set<string>();
  return list.filter((o) => {
    const k = o.text_en.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headLeft: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  word: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  cefr: { fontSize: 13, fontWeight: '700', color: colors.muted },
  speakBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { fontSize: 14, color: colors.muted, lineHeight: 20 },

  formBlock: {
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  posRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  posBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  posText: { fontSize: 12, fontWeight: '800', color: colors.accent },
  posCefr: { fontSize: 12, fontWeight: '700', color: colors.muted },

  senses: { gap: 4 },
  senseRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  senseNum: { fontSize: 13, fontWeight: '800', color: colors.teal, minWidth: 14 },
  senseText: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 21 },
  noSense: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },

  examples: { gap: space.sm, marginTop: space.xs },
  exLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  exItem: {
    gap: 2,
    borderLeftWidth: 2,
    borderLeftColor: colors.line,
    paddingLeft: space.sm,
  },
  exEn: { fontSize: 15, color: colors.ink, lineHeight: 21, fontWeight: '600' },
  exTr: { fontSize: 13, color: colors.muted, lineHeight: 19 },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
