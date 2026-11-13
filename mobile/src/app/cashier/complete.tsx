import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen, KButton, KCard } from '@/components/kassa-demo/ui';
import { useKassaDemo } from '@/components/kassa-demo/store';

export default function CompletedSale() {
  const router=useRouter();
  const store=useKassaDemo();
  return <KScreen title="Sale preview complete" subtitle="This example illustrates the completion screen in Figma." nav={false} back>
    <View style={s.check}><Text style={{ color: C.white, fontSize: 46 }}>✓</Text></View>
    <Text style={s.title}>Checkout simulated</Text>
    <Text style={s.desc}>No actual transaction has been submitted or paid.</Text>
    <KCard>
      <View style={s.row}><Text style={s.label}>Total</Text><Text style={s.bold}>{naira(store.total)}</Text></View>
      <View style={s.row}><Text style={s.label}>Payment method</Text><Text style={s.bold}>{store.paymentMethod}</Text></View>
      <View style={s.row}><Text style={s.label}>Items</Text><Text style={s.bold}>{store.count}</Text></View>
      <View style={s.row}><Text style={s.label}>Status</Text><Text style={{ color: C.orange, fontWeight: '800' }}>Demo / unverified</Text></View>
    </KCard>
    <KButton text="View sample receipt" onPress={()=>router.push('/cashier/receipt')} />
    <KButton variant="outline" text="New sale" onPress={()=>{store.clear();router.replace('/cashier/new-sale');}} />
    <KButton variant="subtle" text="Back to dashboard" onPress={()=>router.replace('/cashier')} />
  </KScreen>;
}
const s = StyleSheet.create({
  check: { height: 86, width: 86, borderRadius: 43, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 25 },
  title: { textAlign: 'center', fontSize: 22, color: C.title, fontWeight: '800', marginBottom: 8 },
  desc: { fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomColor: C.border, borderBottomWidth: 1 },
  label: { color: C.muted, fontSize: 12 }, bold: { color: C.title, fontWeight: '800', fontSize: 12 },
});
