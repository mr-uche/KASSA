import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useKassaSession, type CheckoutSale } from '@/components/kassa-demo/api';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen, KCard, KTag, SectionTitle } from '@/components/kassa-demo/ui';

const filters = ['All', 'Success', 'Pending'] as const;
export default function Sales() {
  const session = useKassaSession();
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const [sales, setSales] = useState<CheckoutSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!session.scope) {
      setSales([]); setError('Sign in and select your branch to view transactions.');
      return;
    }
    setLoading(true); setError('');
    try {
      const list = await session.request<CheckoutSale[]>(
        'sales?businessId=' + encodeURIComponent(session.scope.businessId) +
        '&branchId=' + encodeURIComponent(session.scope.branchId)
      );
      if (!Array.isArray(list)) throw new Error('Invalid sales response.');
      setSales(list);
    } catch (e) {
      setSales([]);
      setError(e instanceof Error ? e.message : 'Unable to load sales.');
    } finally { setLoading(false); }
  }, [session.scope?.businessId, session.scope?.branchId, session.request]);

  useEffect(() => { void refresh(); }, [refresh]);

  const visible = useMemo(() => sales.filter(sale =>
    filter === 'All' || (filter === 'Success' && sale.status === 'PAID') ||
    (filter === 'Pending' && sale.status === 'PENDING_PAYMENT')
  ), [sales, filter]);

  const paid = sales.filter(sale => sale.status === 'PAID');
  const total = paid.reduce((sum, sale) => sum + Number(sale.total), 0);

  return <KScreen title="Sales" subtitle="Sales and verified payment status for your selected branch." showPreviewLabel={false}>
    <View style={s.stats}>
      <KCard style={s.summary}><Text style={s.muted}>Amount received</Text><Text style={s.amount}>{naira(total)}</Text></KCard>
      <KCard style={s.summary}><Text style={s.muted}>Completed sales</Text><Text style={s.amount}>{paid.length}</Text></KCard>
    </View>
    <View style={s.headerRow}>
      <SectionTitle>Transaction history</SectionTitle>
      <Pressable accessibilityRole="button" onPress={() => { void refresh(); }}>
        <Text style={s.refresh}>Refresh</Text>
      </Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
      {filters.map(item => <KTag key={item} text={item} onPress={() => setFilter(item)} selected={filter === item} />)}
    </ScrollView>
    {loading && <Text style={s.muted}>Loading sales…</Text>}
    {error ? <Text style={s.error}>{error}</Text> : null}
    <KCard>
      {visible.length === 0 && !loading && <Text style={s.muted}>No transactions found.</Text>}
      {visible.map((sale, index) => (
        <View key={sale.id} style={[s.transaction, index > 0 && s.border]}>
          <View style={s.avatar}><Text style={s.avatarText}>TX</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{sale.reference}</Text>
            <Text style={s.muted}>{sale.items.reduce((sum, line) => sum + line.quantity, 0)} items • {sale.payments[0]?.channel?.replaceAll('_', ' ') ?? 'Unknown'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.name}>{naira(Number(sale.total))}</Text>
            <Text style={[s.status, { color: sale.status === 'PAID' ? C.green : C.orange }]}>
              {sale.status === 'PAID' ? 'Paid' : sale.status === 'PENDING_PAYMENT' ? 'Pending' : sale.status}
            </Text>
          </View>
        </View>
      ))}
    </KCard>
  </KScreen>;
}

const s = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10 },
  summary: { flex: 1, padding: 15 },
  muted: { color: C.muted, fontSize: 11, marginTop: 5 },
  amount: { color: C.title, fontWeight: '800', fontSize: 19, marginTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refresh: { color: C.green, fontSize: 12, fontWeight: '800', paddingVertical: 8 },
  transaction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 9 },
  border: { borderTopWidth: 1, borderTopColor: C.border },
  avatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: C.mint, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '800', color: C.green, fontSize: 10 },
  name: { fontWeight: '700', fontSize: 12, color: C.title },
  status: { fontSize: 11, marginTop: 6, fontWeight: '700' },
  error: { color: C.danger, fontSize: 11, marginBottom: 12 },
});
