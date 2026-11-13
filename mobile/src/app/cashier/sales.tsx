import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { transactions } from '@/components/kassa-demo/data';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen, KCard, KTag, SectionTitle } from '@/components/kassa-demo/ui';

const filters = ['All', 'Success', 'Failed'];
export default function Sales() {
  const [filter, setFilter] = useState('All');
  const visible = useMemo(() => transactions.filter(item => filter === 'All' || item.status === filter), [filter]);
  return <KScreen title="Sales" subtitle="A sample view of cashier transactions and payment status.">
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <KCard style={s.summary}><Text style={s.muted}>Today's sales</Text><Text style={s.total}>{naira(356500)}</Text></KCard>
      <KCard style={s.summary}><Text style={s.muted}>Transactions</Text><Text style={s.total}>28</Text></KCard>
    </View>
    <SectionTitle>Transaction history</SectionTitle>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
      {filters.map(item => <KTag key={item} text={item} onPress={() => setFilter(item)} selected={filter === item} />)}
    </ScrollView>
    <KCard>{visible.map((item, index) => <View key={item.id} style={[s.transaction, index > 0 && s.border]}>
      <View style={s.avatar}><Text style={{ fontWeight: '800', color: C.green }}>{item.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</Text></View>
      <View style={{ flex: 1 }}><Text style={s.name}>{item.name}</Text><Text style={s.muted}>{item.channel} • {item.time}</Text><Text style={s.muted}>{item.id}</Text></View>
      <View style={{ alignItems: 'flex-end' }}><Text style={s.name}>{naira(item.amount)}</Text><Text style={{ fontSize: 11, color: item.status === 'Success' ? C.green : C.danger, marginTop: 6 }}>{item.status}</Text></View>
    </View>)}</KCard>
  </KScreen>;
}
const s = StyleSheet.create({
  summary: { flex: 1, padding: 15 }, muted: { color: C.muted, fontSize: 11, marginTop: 5 }, total: { color: C.title, fontWeight: '800', fontSize: 21, marginTop: 7 },
  transaction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 9 }, border: { borderTopWidth: 1, borderTopColor: C.border },
  avatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: C.mint, justifyContent: 'center', alignItems: 'center' }, name: { fontWeight: '700', fontSize: 12, color: C.title },
});
