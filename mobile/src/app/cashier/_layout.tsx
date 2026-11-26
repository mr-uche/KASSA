import { Stack } from 'expo-router';
import { KassaDemoProvider } from '@/components/kassa-demo/store';

// Retain internal route handling and offline-sale state, but no connection
// popup: a Wi-Fi / slashed Wi-Fi status icon is now in the KASSA header.
export default function CashierLayout() {
  return <KassaDemoProvider>
    <Stack screenOptions={{ headerShown: false }}/>
  </KassaDemoProvider>;
}
