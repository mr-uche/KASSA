import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { products } from '@/components/kassa-demo/data';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen, KButton, KCard, SectionTitle } from '@/components/kassa-demo/ui';

export default function Receipt() {
  const store=useKassaDemo();
  const router=useRouter();
  return <KScreen title="Receipt preview" subtitle="A sample receipt based on the current demo cart." nav={false} back>
    <KCard style={{ backgroundColor: C.white }}>
      <Text style={s.heading}>KASSA</Text>
      <Text style={s.sub}>SAMPLE RECEIPT — NOT PROOF OF PAYMENT</Text>
      <Text style={s.sub}>{store.branch}</Text>
      <View style={s.divider} />
      <SectionTitle>Items</SectionTitle>
      {store.lines.length === 0 && <Text style={{ color: C.muted, paddingVertical: 14 }}>No demo items in this cart.</Text>}
      {store.lines.map(line => {
        const p=products.find(item=>item.id===line.id);
        return p ? <View key={line.id} style={s.row}><View style={{ flex: 1 }}><Text style={s.name}>{p.name}</Text><Text style={s.sub}>{naira(p.price)} × {line.quantity}</Text></View><Text style={s.name}>{naira(p.price*line.quantity)}</Text></View> : null;
      })}
      <View style={s.divider} />
      <View style={s.row}><Text style={s.total}>TOTAL</Text><Text style={s.total}>{naira(store.total)}</Text></View>
      <View style={s.row}><Text style={s.sub}>Method</Text><Text style={s.sub}>{store.paymentMethod}</Text></View>
      <View style={s.row}><Text style={s.sub}>Verification</Text><Text style={{ fontSize: 12, fontWeight: '800', color: C.orange }}>Not processed</Text></View>
      <Text style={[s.sub,{textAlign:'center', marginTop: 28}]}>Thank you for previewing KASSA.</Text>
    </KCard>
    <KButton text="Back to dashboard" onPress={()=>router.replace('/cashier')} />
  </KScreen>;
}
const s=StyleSheet.create({
  heading:{fontSize:22,color:C.green,fontWeight:'800',textAlign:'center',marginTop:8},
  sub:{color:C.muted,fontSize:11,marginTop:6},
  divider:{height:1,backgroundColor:C.border,marginVertical:17},
  row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:9},
  name:{fontSize:12,fontWeight:'700',color:C.title},total:{fontSize:18,fontWeight:'800',color:C.title},
});
