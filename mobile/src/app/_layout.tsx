import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { KassaSessionProvider } from '@/components/kassa-demo/api';

// Keep Expo Router for screen routing but remove the starter Expo tabs,
// demo navigation, and the old animated Expo-logo overlay.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => { void SplashScreen.hideAsync(); }, []);
  return <KassaSessionProvider>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAF9' } }}/>
  </KassaSessionProvider>;
}
