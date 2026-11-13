import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { C, naira } from '@/components/kassa-demo/theme';
import { transactions } from '@/components/kassa-demo/data';
import { KScreen, KCard, KButton, KLinkRow, SectionTitle } from '@/components/kassa-demo/ui';
import { useKassaDemo } from '@/components/kassa-demo/store';

const shortcuts = [
  { name: 'New sale', description: 'Start checkout', icon: '＋', route: '/cashier/new-sale' },
  { name: 'Scan product', description: 'Find an item by code', icon: '▣', route: '/cashier/scan-product' },
  { name: 'Transactions', description: 'View all activity', icon: '▤', route: '/cashier/sales' },
  { name: 'Products', description: 'Check stock', icon: '▦', route: '/cashier/products' },
  { name: 'Create account', description: 'Registration preview', icon: '♧', route: '/cashier/sign-up' },
  { name: 'Help', description: 'Support options', icon: '?', route: '/cashier/help' },
] as const;

export default function CashierHome() {
  const router = useRouter();
  const { branch, count } = useKassaDemo();
  const go = (path: string) => router.push(path as Href);
  return <KScreen title="Good morning, Cashier 👋" subtitle={`Here's what is happening at ${branch}.`}>
    <KCard style={{ backgroundColor: C.green, borderColor: C.green }}>
      <Text style={s.whiteMuted}>Today's sales  ·  SAMPLE</Text>
      <Text style={s.balance}>{naira(356500)}</Text>
      <View style={s.balanceRow}><Text style={s.whiteMuted}>28 transactions</Text><Text style={s.whiteMuted}>↗ +12.8%</Text></View>
    </KCard>
    <View style={s.grid}>
      <KCard style={s.stat}><Text style={s.statLabel}>Successful</Text><Text style={s.statNumber}>26</Text></KCard>
      <KCard style={s.stat}><Text style={s.statLabel}>Pending</Text><Text style={s.statNumber}>2</Text></KCard>
    </View>
    <SectionTitle>Quick actions</SectionTitle>
    <View style={s.grid}>
      {shortcuts.map(item => <Pressable key={item.route} style={s.quick} onPress={() => go(item.route)}>
        <Text style={s.quickIcon}>{item.icon}</Text>
        <Text style={s.quickName}>{item.name}</Text>
        <Text style={s.quickDesc}>{item.description}</Text>
      </Pressable>)}
    </View>
    <SectionTitle right={<Text onPress={() => go('/cashier/sales')} style={{ color: C.green, fontWeight: '700', fontSize: 12 }}>View all</Text>}>Recent transactions</SectionTitle>
    <KCard>{transactions.slice(0, 3).map((item, i) => <View key={item.id} style={[s.txRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
      <View style={{ flex: 1 }}><Text style={s.txName}>{item.name}</Text><Text style={s.txMeta}>{item.channel} • {item.time}</Text></View>
      <View style={{ alignItems: 'flex-end' }}><Text style={s.txName}>{naira(item.amount)}</Text><Text style={{ color: item.status === 'Success' ? C.green : C.danger, fontSize: 11 }}>{item.status}</Text></View>
    </View>)}</KCard>
    {count > 0 && <KButton text={`Resume current sale (${count} items)`} onPress={() => go('/cashier/new-sale')} />}
    <KLinkRow title="Switch branch" subtitle={branch} onPress={() => go('/cashier/switch-branch')} />
  </KScreen>;
}
const s = StyleSheet.create({
  whiteMuted: { color: '#DAF4E9', fontSize: 12, marginBottom: 8 },
  balance: { color: C.white, fontSize: 31, fontWeight: '800', marginBottom: 14 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  stat: { width: '48%', marginBottom: 18 }, statLabel: { color: C.muted, fontSize: 12 }, statNumber: { color: C.green, fontSize: 24, fontWeight: '800', marginTop: 6 },
  quick: { backgroundColor: C.white, width: '48%', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  quickIcon: { color: C.green, fontSize: 25, marginBottom: 7 }, quickName: { fontSize: 14, fontWeight: '800', color: C.title },
  quickDesc: { fontSize: 11, marginTop: 5, color: C.muted },
  txRow: { flexDirection: 'row', paddingVertical: 12 }, txName: { fontSize: 13, color: C.title, fontWeight: '700' }, txMeta: { marginTop: 4, color: C.muted, fontSize: 11 },
});
