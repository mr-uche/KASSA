import { Stack } from 'expo-router';
import { KassaDemoProvider } from '@/components/kassa-demo/store';

export default function CashierPreviewLayout() {
  return <KassaDemoProvider><Stack screenOptions={{ headerShown: false }} /></KassaDemoProvider>;
}
