import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SheetStepper } from '@/components/sheet-stepper';
import { Screen } from '@/components/screen';
import { H1, Lead, SectionLabel } from '@/components/ui';
import { colors, radius, space } from '@/constants/appTheme';

type Step = {
  href: '/video' | '/shadowing' | '/practice';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
};

// Belgedeki günlük döngü: girdi -> üretim -> tekrar.
const steps: Step[] = [
  {
    href: '/video',
    icon: 'play-circle-outline',
    title: 'Girdi: Video izle',
    desc: 'Seviyenin bir tık üstü içerik izle, bilmediğin öbekleri yakala.',
  },
  {
    href: '/shadowing',
    icon: 'mic-outline',
    title: 'Üretim: Shadowing',
    desc: 'Cümleyi dinle, yüksek sesle tekrarla, telaffuz puanını gör.',
  },
  {
    href: '/practice',
    icon: 'albums-outline',
    title: 'Tekrar: Öbek kartları',
    desc: 'Yakaladığın öbekler tam unutmadan önce karşına gelir.',
  },
];

export default function TodayScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <SectionLabel>Bugün</SectionLabel>
        <H1>Günlük döngü</H1>
        <Lead>Girdi, üretim ve tekrar. Üçünü de bugün bir tur yap.</Lead>
      </View>

      <Pressable style={styles.howBtn} onPress={() => setSheetOpen(true)}>
        <Ionicons name="help-circle-outline" size={18} color={colors.accent} />
        <Text style={styles.howBtnText}>Bu döngü nasıl çalışır?</Text>
      </Pressable>

      <View style={{ gap: space.md }}>
        {steps.map((s, i) => (
          <Link key={s.href} href={s.href} asChild>
            <Pressable style={styles.step}>
              <View style={styles.num}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <View style={styles.stepBody}>
                <View style={styles.stepHead}>
                  <Ionicons name={s.icon} size={18} color={colors.ink} />
                  <Text style={styles.stepTitle}>{s.title}</Text>
                </View>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          </Link>
        ))}
      </View>

      <SheetStepper
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onDone={() => setSheetOpen(false)}
        doneLabel="Anladım"
        steps={[
          {
            title: '1. Girdi',
            content: (
              <Text style={styles.sheetText}>
                Seviyenin bir tık üstü bir video izle. Bilmediğin öbekleri yakala; anlamak
                için her kelimeyi bilmen gerekmez.
              </Text>
            ),
          },
          {
            title: '2. Üretim',
            content: (
              <Text style={styles.sheetText}>
                Cümleleri yüksek sesle tekrar et (shadowing). Telaffuzunu duy, geri bildirim
                al. Konuşma kası ancak konuşarak gelişir.
              </Text>
            ),
          },
          {
            title: '3. Tekrar',
            content: (
              <Text style={styles.sheetText}>
                Yakaladığın öbekleri kartlarla tazele. Amaç hız değil süreklilik: kısa ama
                her gün.
              </Text>
            ),
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  howBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
  },
  howBtnText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  num: {
    width: 28,
    height: 28,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  sheetBtn: {
    marginTop: space.sm,
    backgroundColor: colors.accent,
    paddingVertical: space.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  sheetBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  numText: {
    color: '#fff',
    fontWeight: '800',
  },
  stepBody: {
    flex: 1,
    gap: space.xs,
  },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
});
