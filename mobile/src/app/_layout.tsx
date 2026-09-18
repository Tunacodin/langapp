import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { setupDb } from '@/lib/db';

SplashScreen.preventAutoHideAsync();

// Tasarım kuralı: koyu tema yok. app.json userInterfaceStyle=light ile sabit acik tema.
export default function RootLayout() {
  // Yerel veritabanini kur + ders verisini seed et (idempotent).
  useEffect(() => {
    setupDb();
  }, []);

  // GestureHandlerRootView: alttan acilan sheet'lerin kaydirma (swipe) hareketi icin sart.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </GestureHandlerRootView>
  );
}
