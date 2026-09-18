import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

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

  return (
    <>
      <AnimatedSplashOverlay />
      <AppTabs />
    </>
  );
}
