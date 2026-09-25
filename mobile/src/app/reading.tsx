import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/skeleton';
import { WordSheet } from '@/components/word-sheet';
import { colors, radius, space } from '@/constants/appTheme';
import {
  getArticle,
  ArticleFull,
  getPhraseForms,
  isArticleSaved,
  removeSavedByFront,
  saveArticleReview,
} from '@/lib/db';

// Okuma ekrani: bir makalenin tam metni. Ingilizce paragraflar + istege bagli
// Turkce ceviri (goster/gizle). Metrikler GERCEK (kelime say., okuma dk).
export default function ReadingScreen() {
  const p = useLocalSearchParams<{ id?: string }>();
  const [art, setArt] = useState<ArticleFull | null>(null);
  const [showTr, setShowTr] = useState(false);
  const [loading, setLoading] = useState(true); // ilk yukleme iskeleti
  const [saved, setSaved] = useState(false); // Tekrar'a kayitli mi
  const [wordSheet, setWordSheet] = useState<string | null>(null); // acik kelime sheet'i (yuzey)

  useEffect(() => {
    if (p.id) {
      setArt(getArticle(p.id));
      setSaved(isArticleSaved(p.id));
    }
    setLoading(false);
  }, [p.id]);

  function toggleSave() {
    if (!art) return;
    if (saved) {
      removeSavedByFront('article', art.id);
      setSaved(false);
    } else {
      saveArticleReview(art.id, art.title);
      setSaved(true);
    }
  }

  const paras = useMemo(() => {
    if (!art) return [] as { en: string; tr: string | null }[];
    const en = art.body_en.split(/\n\s*\n/);
    const tr = (art.body_tr ?? '').split(/\n\s*\n/);
    return en.map((e, i) => ({ en: e.trim(), tr: tr[i]?.trim() ?? null }));
  }, [art]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.topActions}>
          {art?.body_tr ? (
            <Pressable onPress={() => setShowTr((v) => !v)} style={[styles.trToggle, showTr && styles.trToggleOn]}>
              <Ionicons name="language" size={15} color={showTr ? '#fff' : colors.muted} />
              <Text style={[styles.trToggleText, showTr && { color: '#fff' }]}>Türkçe</Text>
            </Pressable>
          ) : null}
          {art ? (
            <Pressable onPress={toggleSave} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? colors.accent : colors.ink} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={[styles.content, { gap: space.sm }]}>
          <Skeleton width={120} height={12} />
          <Skeleton width="85%" height={26} />
          <Skeleton width="90%" height={26} />
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
            <Skeleton width={40} height={20} radius={radius.sm} />
            <Skeleton width={80} height={14} />
            <Skeleton width={60} height={14} />
          </View>
          <View style={styles.divider} />
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ gap: space.sm }}>
              <Skeleton width="100%" height={14} />
              <Skeleton width="97%" height={14} />
              <Skeleton width="70%" height={14} />
            </View>
          ))}
        </View>
      ) : art ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {art.image_url ? (
            <Image source={{ uri: art.image_url }} style={styles.cover} contentFit="cover" transition={200} />
          ) : null}
          <Text style={styles.kicker}>OKUMA · {art.source ?? 'Metin'}</Text>
          <Text style={styles.title}>{art.title}</Text>
          <View style={styles.metaRow}>
            {art.cefr ? (
              <View style={styles.cefrTag}>
                <Text style={styles.cefrText}>{art.cefr}</Text>
              </View>
            ) : null}
            <Meta icon="text-outline" text={`${art.word_count} kelime`} />
            <Dot />
            <Meta icon="time-outline" text={`${art.read_minutes} dk`} />
          </View>

          <View style={styles.divider} />

          {paras.map((pr, i) => (
            <View key={i} style={styles.para}>
              <TappableText text={pr.en} onWord={setWordSheet} />
              {showTr && pr.tr ? <Text style={styles.bodyTr}>{pr.tr}</Text> : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Metin bulunamadı.</Text>
        </View>
      )}

      {/* Kelime detay sheet'i: anlam + turler + farkli cumlelerdeki kullanim + Dinle + vocab kaydet. */}
      <WordSheet visible={wordSheet != null} onClose={() => setWordSheet(null)} surface={wordSheet} />
    </SafeAreaView>
  );
}

// Bir paragrafi tiklanabilir parcalara boler. Once KELIME GRUPLARI (grew up, a lot of,
// depend on...) tek parca alinir ve noktali alt cizgiyle gosterilir; hangi kelimesine
// dokunulursa grubun tamami acilir (tek kelimeyi yanlis ogrenmeyi onler). Kalan
// kelimeler tek tek, kelime disi parcalar (bosluk, noktalama) oldugu gibi akar.
let PHRASE_RE: RegExp | null = null;
function phraseRe(): RegExp | null {
  if (PHRASE_RE) return PHRASE_RE;
  const forms = getPhraseForms();
  if (!forms.length) return null;
  const esc = forms.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
  PHRASE_RE = new RegExp(`\\b(?:${esc.join('|')})\\b`, 'gi');
  return PHRASE_RE;
}

type Piece = { t: string; kind: 'phrase' | 'word' | 'other' };
function splitPieces(text: string): Piece[] {
  const out: Piece[] = [];
  const pushWords = (chunk: string) => {
    for (const tok of chunk.split(/(\s+|[^A-Za-z'’-]+)/)) {
      if (tok) out.push({ t: tok, kind: /[A-Za-z]/.test(tok) ? 'word' : 'other' });
    }
  };
  const re = phraseRe();
  if (!re) {
    pushWords(text);
    return out;
  }
  const norm = text.replace(/’/g, "'"); // ayni uzunluk: indeksler orijinalde de gecerli
  let last = 0;
  re.lastIndex = 0;
  for (let m = re.exec(norm); m; m = re.exec(norm)) {
    if (m.index > last) pushWords(text.slice(last, m.index));
    out.push({ t: text.slice(m.index, m.index + m[0].length), kind: 'phrase' });
    last = m.index + m[0].length;
  }
  if (last < text.length) pushWords(text.slice(last));
  return out;
}

function TappableText({ text, onWord }: { text: string; onWord: (w: string) => void }) {
  const pieces = useMemo(() => splitPieces(text), [text]);
  return (
    <Text style={styles.body}>
      {pieces.map((p, i) =>
        p.kind === 'other' ? (
          <Text key={i}>{p.t}</Text>
        ) : (
          <Text
            key={i}
            style={p.kind === 'phrase' ? styles.phrase : styles.word}
            onPress={() => onWord(p.t)}
            suppressHighlighting>
            {p.t}
          </Text>
        ),
      )}
    </Text>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={colors.muted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}
function Dot() {
  return <View style={styles.metaDot} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  trToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  trToggleOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  trToggleText: { fontSize: 12, fontWeight: '700', color: colors.muted },

  content: { padding: space.xl, paddingBottom: space.xxl },
  cover: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.line, marginBottom: space.lg },
  kicker: { fontSize: 11, fontWeight: '800', color: colors.teal, letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, lineHeight: 32, letterSpacing: -0.5, marginTop: space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  cefrTag: { backgroundColor: colors.tealSoft, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  cefrText: { fontSize: 11, fontWeight: '800', color: colors.teal },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  metaDot: { width: 3, height: 3, borderRadius: radius.pill, backgroundColor: colors.lineStrong },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.lg },

  para: { marginBottom: space.lg },
  body: { fontSize: 17, color: colors.ink, lineHeight: 28 },
  word: { color: colors.ink },
  phrase: {
    color: colors.ink,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: colors.accent,
  },
  bodyTr: { fontSize: 15, color: colors.muted, lineHeight: 24, marginTop: space.sm, fontStyle: 'italic' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: colors.muted },
});
