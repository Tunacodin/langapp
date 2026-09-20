import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Onboarding } from '@/components/onboarding';
import { getSetting, setupDb } from '@/lib/db';

SplashScreen.preventAutoHideAsync();

// Kok navigator = Stack. Icinde (tabs) grubu (5 sekme) ilk ekran; tum detay
// ekranlari (player, item, grammar-*, analysis, notifications, vocabulary,
// reading, shadowing-studio) bu Stack'e PUSH edilir. Boylece her detay/sheet'ten
// router.back() gercek bir stack pop olur ve onceki yapiya donulur.
// Tasarim kurali: koyu tema yok. app.json userInterfaceStyle=light ile sabit acik tema.
export default function RootLayout() {
  // null = henuz okunmadi, true/false = onboarding tamam mi.
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // Yerel veritabanini kur + ders verisini seed et (idempotent), sonra onboarding durumu.
  useEffect(() => {
    setupDb();
    setOnboarded(getSetting('onboarded') === '1');
  }, []);

  // GestureHandlerRootView: alttan acilan sheet'lerin kaydirma (swipe) hareketi icin sart.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      {onboarded === false ? (
        <View style={styles.overlay}>
          <Onboarding onDone={() => setOnboarded(true)} />
        </View>
      ) : null}
      <AnimatedSplashOverlay />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF', zIndex: 500 },
});
