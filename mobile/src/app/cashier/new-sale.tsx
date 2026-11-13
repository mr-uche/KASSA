import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { products } from '@/components/kassa-demo/data';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira } from '@/components/kassa-demo/theme';
import { KButton, KCard, KScreen, KTag, SectionTitle } from '@/components/kassa-demo/ui';

const categories = ['All', 'Beverages', 'Groceries', 'Other'];
export default function NewSale() {
  const router = useRouter();
  const store = useKassaDemo();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const items = useMemo(() => products.filter(item => (category === 'All' || item.category === category) && `${item.name} ${item.id}`.toLowerCase().includes(query.trim().toLowerCase())), [query, category]);
  return <KScreen title="New Sale" subtitle="Search or select products to build a customer's order.">
    <View style={s.searchRow}>
      <TextInput placeholder="Search products or SKU" placeholderTextColor={C.faint} value={query} onChangeText={setQuery} style={s.search} />
      <Pressable onPress={() => router.push('/cashier/scan-product')} style={s.scan}><Text style={{ color: C.white, fontWeight: '700' }}>Scan</Text></Pressable>
    </View>
    <SectionTitle>Categories</SectionTitle>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22 }}>
      {categories.map(item => <KTag key={item} text={item} selected={item === category} onPress={() => setCategory(item)} />)}
    </ScrollView>
    <SectionTitle right={<Text style={{ color: C.muted, fontSize: 11 }}>{items.length} items</Text>}>Products</SectionTitle>
    <View style={s.grid}>
      {items.map(item => <KCard key={item.id} style={s.productCard}>
        <View style={s.productIcon}><Text style={{ fontSize: 27 }}>{item.icon}</Text></View>
        <Text style={s.productName}>{item.name}</Text>
        <Text style={s.productMeta}>{naira(item.price)} • Stock: {item.stock}</Text>
        <Pressable accessibilityRole="button" onPress={() => store.add(item.id)} style={s.addButton}><Text style={{ color: C.white, fontWeight: '800' }}>＋ Add</Text></Pressable>
      </KCard>)}
    </View>
    <KCard>
      <SectionTitle>Current sale</SectionTitle>
      {store.lines.length === 0 && <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>No items selected yet.</Text>}
      {store.lines.map(line => {
        const item = products.find(product => product.id === line.id);
        if (!item) return null;
        return <View key={line.id} style={s.cartRow}>
          <View style={{ flex: 1 }}><Text style={{ color: C.title, fontWeight: '700', fontSize: 12 }}>{item.name}</Text><Text style={{ color: C.muted, fontSize: 11 }}>{naira(item.price)} × {line.quantity}</Text></View>
          <Pressable onPress={() => store.subtract(item.id)} style={s.stepper}><Text style={s.stepperText}>−</Text></Pressable>
          <Text style={{ paddingHorizontal: 8 }}>{line.quantity}</Text>
          <Pressable onPress={() => store.add(item.id)} style={s.stepper}><Text style={s.stepperText}>+</Text></Pressable>
        </View>;
      })}
      <View style={s.totalRow}><Text style={{ fontWeight: '700', color: C.text }}>Total ({store.count} items)</Text><Text style={{ fontWeight: '800', color: C.title, fontSize: 21 }}>{naira(store.total)}</Text></View>
      <KButton text="Continue to payment" disabled={store.count === 0} onPress={() => store.count ? router.push('/cashier/payment') : Alert.alert('Empty sale', 'Add at least one item.')} />
      {store.count > 0 && <KButton text="Clear current sale" variant="subtle" onPress={() => Alert.alert('Clear sale?', 'This removes the selected items.', [{ text: 'Cancel' }, { text: 'Clear', style: 'destructive', onPress: store.clear }])} />}
    </KCard>
  </KScreen>;
}
const s = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  search: { flex: 1, backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, height: 48, paddingHorizontal: 15 },
  scan: { paddingVertical: 15, paddingHorizontal: 15, borderRadius: 10, backgroundColor: C.green },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: { width: '48%', minHeight: 171, padding: 11 },
  productIcon: { backgroundColor: C.mint, borderRadius: 10, height: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 12, color: C.title, fontWeight: '800' }, productMeta: { fontSize: 10, marginVertical: 6, color: C.muted },
  addButton: { backgroundColor: C.green, alignItems: 'center', borderRadius: 8, paddingVertical: 8, marginTop: 'auto' },
  cartRow: { flexDirection: 'row', gap: 4, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 12 },
  stepper: { width: 25, height: 25, borderRadius: 5, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }, stepperText: { color: C.green, fontWeight: '800', fontSize: 17 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 9 },
});
