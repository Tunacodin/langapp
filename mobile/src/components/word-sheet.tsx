import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppSheet } from '@/components/app-sheet';
import { colors, radius, space } from '@/constants/appTheme';
import {
  enrollExampleReview,
  getCrossVideoOccurrencesByLemma,
  getLexemeExamples,
  getLexemeFormsByLemma,
  isVocabSaved,
  lookupLexeme,
  removeVocabSaved,
  saveVocabReview,
  type Lexeme,
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
  PHRASE: 'Kelime grubu',
};
const posLabel = (pos: string) => POS_TR[pos] ?? pos;

type Ex = { en: string; tr: string | null };
// Bir POS turu icin: etiket + anlamlar + ornek cumleler (kuratorlu + video kullanimlari).
type Block = {
  pos: string;
  cefr: string | null;
  senses: string[]; // gloss_tr listesi
  examples: Ex[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Dokunulan sozcuk (yuzey bicimi). */
  surface: string | null;
  /** Baglam: o cumledeki anlami dogru cozmek icin. */
  ctx?: { mediaId: string; sentenceIdx: number };
};

// text_en'e gore tekiller (kucuk harf).
function dedupe(list: Ex[]): Ex[] {
  const seen = new Set<string>();
  return list.filter((e) => {
    const k = e.en.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Kelimeye dokununca acilan bottom sheet (izle ekrani):
 * - Baslik + okunus (TTS "Dinle").
 * - Farkli sozcuk turleri (isim/fiil/sifat...) arasinda STEPPER.
 * - Aktif tur icin ornek cumleler LISTE halinde (kuratorlu + videolardaki GERCEK
 *   kullanimlar; uydurma yok). Satira dokun -> Turkce hali akordeon acilir.
 * - Her satirin saginda: Dinle (TTS) + "+" (cumleyi Tekrar havuzuna tasi).
 * Icerik kadar yukseklik (auto), kaydirmaya zorlamaz; turler stepper'la bolunur.
 */
export function WordSheet({ visible, onClose, surface, ctx }: Props) {
  const [lex, setLex] = useState<Lexeme | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pos, setPos] = useState(0); // aktif tur (stepper)
  const [openKey, setOpenKey] = useState<string | null>(null); // acik akordeon
  const [added, setAdded] = useState<Set<string>>(new Set()); // tekrara eklenen cumleler
  const [saved, setSaved] = useState(false); // kelime Tekrar'a (vocab) kayitli mi

  const display = (lex?.lemma ?? surface ?? '').trim();

  useEffect(() => {
    if (!visible || !surface) return;
    setPos(0);
    setOpenKey(null);
    setAdded(new Set());
    const l = lookupLexeme(surface, ctx);
    setLex(l);
    setSaved(l ? isVocabSaved(l.lexicon_id) : false);
    if (!l) {
      setBlocks([]);
      return;
    }
    const forms = getLexemeFormsByLemma(l.lemma);
    const vids: Ex[] = getCrossVideoOccurrencesByLemma(l.lemma).map((o) => ({ en: o.text_en, tr: o.text_tr }));
    const next: Block[] = forms.map((f) => {
      const curated: Ex[] = getLexemeExamples(f.lemma, f.pos).map((e) => ({ en: e.text_en, tr: e.text_tr }));
      return {
        pos: f.pos,
        cefr: f.cefr,
        senses: f.senses.map((s) => s.gloss_tr).filter(Boolean),
        examples: dedupe([...curated, ...vids]).slice(0, 6),
      };
    });
    setBlocks(next);
  }, [visible, surface, ctx?.mediaId, ctx?.sentenceIdx]);

  const cefr = useMemo(() => blocks.find((b) => b.cefr)?.cefr ?? null, [blocks]);
  const active = blocks[pos] ?? null;

  const speakWord = () => {
    if (display) Speech.speak(display, { language: 'en-US', rate: 0.9 });
  };
  const speak = (en: string) => Speech.speak(en, { language: 'en-US', rate: 0.95 });
  const add = (e: Ex) => {
    enrollExampleReview(e.en, e.tr);
    setAdded((prev) => new Set(prev).add(e.en.trim().toLowerCase()));
  };
  // Kelimeyi Tekrar havuzuna vocab olarak ekle/kaldir.
  const toggleSave = () => {
    if (!lex) return;
    if (saved) {
      removeVocabSaved(lex.lexicon_id);
      setSaved(false);
    } else {
      const meaning = active?.senses[0] ?? lex.senses[0]?.gloss_tr ?? null;
      saveVocabReview(lex.lexicon_id, lex.lemma, meaning);
      setSaved(true);
    }
  };

  return (
    <AppSheet visible={visible} onClose={onClose} height="auto" dragAnywhere>
      {/* Baslik + okunus */}
      <View style={styles.headRow}>
        <View style={styles.headLeft}>
          <Text style={styles.word}>{display || '—'}</Text>
          {cefr ? <Text style={styles.cefr}>{cefr}</Text> : null}
        </View>
        <View style={styles.headActions}>
          {lex ? (
            <Pressable style={[styles.saveBtn, saved && styles.saveBtnOn]} onPress={toggleSave} hitSlop={8}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? '#fff' : colors.accent} />
              <Text style={[styles.saveText, saved && styles.saveTextOn]}>{saved ? 'Kayıtlı' : 'Kaydet'}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.speakBtn} onPress={speakWord} hitSlop={8}>
            <Ionicons name="volume-high" size={22} color={colors.accent} />
          </Pressable>
        </View>
      </View>

      {!lex ? (
        <Text style={styles.empty}>
          {/^[A-Z]/.test((surface ?? '').trim())
            ? 'Özel isim (kişi, yer ya da kurum adı). Türkçe karşılığı yoktur.'
            : 'Bu kelime henüz sözlükte yok.'}
        </Text>
      ) : active ? (
        <>
          {/* Aktif tur: etiket + anlamlar */}
          <View style={styles.posRow}>
            <View style={styles.posBadge}>
              <Text style={styles.posText}>{posLabel(active.pos)}</Text>
            </View>
            {active.cefr ? <Text style={styles.posCefr}>{active.cefr}</Text> : null}
          </View>
          {active.senses.length > 0 ? (
            <Text style={styles.senseText}>{active.senses.slice(0, 3).join(' · ')}</Text>
          ) : (
            <Text style={styles.noSense}>Anlam kaydı yok.</Text>
          )}

          {/* Ornek cumleler: liste + akordeon + dinle/ekle */}
          {active.examples.length > 0 ? (
            <View style={styles.list}>
              {active.examples.map((e, i) => {
                const key = `${pos}:${i}`;
                const open = openKey === key;
                const isAdded = added.has(e.en.trim().toLowerCase());
                return (
                  <View key={key} style={styles.item}>
                    <View style={styles.itemRow}>
                      <Pressable
                        style={styles.itemTextWrap}
                        onPress={() => setOpenKey(open ? null : key)}
                        hitSlop={4}>
                        <Text style={styles.itemEn}>{e.en}</Text>
                        <Ionicons
                          name={open ? 'chevron-up' : 'chevron-down'}
                          size={15}
                          color={colors.muted}
                        />
                      </Pressable>
                      <Pressable style={styles.itemBtn} onPress={() => speak(e.en)} hitSlop={6}>
                        <Ionicons name="volume-high-outline" size={19} color={colors.accent} />
                      </Pressable>
                      <Pressable style={styles.itemBtn} onPress={() => add(e)} hitSlop={6} disabled={isAdded}>
                        <Ionicons
                          name={isAdded ? 'checkmark-circle' : 'add-circle-outline'}
                          size={20}
                          color={isAdded ? colors.good : colors.ink}
                        />
                      </Pressable>
                    </View>
                    {open ? (
                      <Text style={e.tr ? styles.itemTr : styles.itemTrEmpty}>
                        {e.tr ?? 'Çeviri yok.'}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noSense}>Bu tür için örnek cümle henüz yok.</Text>
          )}

          {/* Turler arasi stepper */}
          {blocks.length > 1 ? (
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepBtn, pos === 0 && styles.stepBtnOff]}
                disabled={pos === 0}
                onPress={() => {
                  setPos((p) => Math.max(0, p - 1));
                  setOpenKey(null);
                }}>
                <Ionicons name="chevron-back" size={18} color={pos === 0 ? colors.muted : colors.ink} />
                <Text style={[styles.stepText, pos === 0 && styles.stepTextOff]}>Geri</Text>
              </Pressable>
              <Text style={styles.stepCount}>
                {pos + 1} / {blocks.length} · {posLabel(active.pos)}
              </Text>
              <Pressable
                style={[styles.stepBtn, pos === blocks.length - 1 && styles.stepBtnOff]}
                disabled={pos === blocks.length - 1}
                onPress={() => {
                  setPos((p) => Math.min(blocks.length - 1, p + 1));
                  setOpenKey(null);
                }}>
                <Text style={[styles.stepText, pos === blocks.length - 1 && styles.stepTextOff]}>İleri</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={pos === blocks.length - 1 ? colors.muted : colors.ink}
                />
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.noSense}>Bu kelime için tür kaydı yok.</Text>
      )}
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headLeft: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexShrink: 1 },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  word: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  cefr: { fontSize: 13, fontWeight: '700', color: colors.muted },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveBtnOn: { backgroundColor: colors.accent },
  saveText: { fontSize: 13, fontWeight: '800', color: colors.accent },
  saveTextOn: { color: '#fff' },
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

  posRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  posBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  posText: { fontSize: 12, fontWeight: '800', color: colors.accent },
  posCefr: { fontSize: 12, fontWeight: '700', color: colors.muted },
  senseText: { fontSize: 15, color: colors.ink, lineHeight: 21, marginTop: -space.xs },
  noSense: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },

  list: { gap: space.xs },
  item: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    gap: space.xs,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  itemTextWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  itemEn: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 21, fontWeight: '600' },
  itemBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  itemTr: { fontSize: 13, color: colors.muted, lineHeight: 19, paddingLeft: 2 },
  itemTrEmpty: { fontSize: 13, color: colors.muted, fontStyle: 'italic', paddingLeft: 2 },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  stepBtnOff: { opacity: 0.4 },
  stepText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  stepTextOff: { color: colors.muted },
  stepCount: { fontSize: 12, fontWeight: '800', color: colors.muted, flexShrink: 1, textAlign: 'center' },
});
