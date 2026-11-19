import { Stack } from 'expo-router';
import { View } from 'react-native';
import { KassaConnectionToast } from '@/components/kassa-demo/connection-toast';
import { KassaDemoProvider } from '@/components/kassa-demo/store';

export default function CashierPreviewLayout() {
  return <KassaDemoProvider>
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}/>
      <KassaConnectionToast/>
    </View>
  </KassaDemoProvider>;
}
