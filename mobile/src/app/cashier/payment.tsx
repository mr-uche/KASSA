import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen, KButton, KCard, SectionTitle } from '@/components/kassa-demo/ui';
import { useKassaDemo } from '@/components/kassa-demo/store';

const methods = ['Cash', 'Bank transfer', 'POS terminal'];
export default function Payment() {
  const router=useRouter();
  const store=useKassaDemo();
  return <KScreen title="Payment" subtitle="Choose a payment method to preview checkout." back>
    <KCard style={{ backgroundColor: C.mint, borderColor: C.mintBorder }}>
      <Text style={{ color: C.greenDark, fontWeight: '700', fontSize: 12 }}>Simulation only</Text>
      <Text style={{ color: C.greenDark, fontSize: 12, marginTop: 5 }}>This screen does not process or verify real payments.</Text>
    </KCard>
    <KCard><Text style={{ color: C.muted, fontSize: 12 }}>Amount due</Text><Text style={{ color: C.title, fontSize: 34, fontWeight: '800', marginTop: 5 }}>{naira(store.total)}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 7 }}>{store.count} items in current sale</Text></KCard>
    <SectionTitle>Select payment method</SectionTitle>
    <KCard>{methods.map(method=><Pressable key={method} onPress={()=>store.setPaymentMethod(method)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: method !== methods[methods.length-1] ? 1 : 0, borderColor: C.border }}>
      <View style={{ height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: C.green, marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>{method===store.paymentMethod&&<View style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: C.green }}/>}</View>
      <Text style={{ flex: 1, color: C.title, fontWeight: '700' }}>{method}</Text>
    </Pressable>)}</KCard>
    <KButton disabled={store.count === 0} text="Preview completed sale (demo)" onPress={()=>Alert.alert('Demo payment', 'No payment will be charged and no sale will be recorded in the backend.', [{ text: 'Cancel' }, { text: 'Continue preview', onPress: ()=>router.push('/cashier/complete') }])} />
  </KScreen>;
}
