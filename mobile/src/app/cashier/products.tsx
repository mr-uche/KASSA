import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { products } from '@/components/kassa-demo/data';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen, KCard, KButton, KTag, SectionTitle } from '@/components/kassa-demo/ui';
const categories = ['All', 'Beverages', 'Groceries', 'Other'];
export default function Products() {
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => products.filter(item => (filter === 'All' || filter === item.category) && item.name.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  return <KScreen title="Products" subtitle="Browse sample stock and find products quickly.">
    <TextInput style={s.search} placeholder="Search products" placeholderTextColor={C.faint} value={query} onChangeText={setQuery} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 21 }}>
      {categories.map(cat => <KTag key={cat} text={cat} selected={filter === cat} onPress={() => setFilter(cat)} />)}
    </ScrollView>
    <SectionTitle right={<Text style={{ color: C.muted, fontSize: 11 }}>{filtered.length} items</Text>}>Inventory</SectionTitle>
    <KCard>{filtered.map((product, i) => <View key={product.id} style={[s.product, i > 0 && { borderTopWidth: 1, borderColor: C.border }]}>
      <View style={s.icon}><Text style={{ fontSize: 26 }}>{product.icon}</Text></View>
      <View style={{ flex: 1 }}><Text style={s.name}>{product.name}</Text><Text style={s.meta}>{product.id} • {product.category}</Text><Text style={s.meta}>In stock: {product.stock}</Text></View>
      <Text style={{ color: C.green, fontWeight: '800', fontSize: 12 }}>{naira(product.price)}</Text>
    </View>)}</KCard>
    <KButton text="Start a new sale" onPress={() => router.push('/cashier/new-sale')} />
  </KScreen>;
}
const s=StyleSheet.create({
  search: { borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 9, paddingHorizontal: 14, height: 48, marginBottom: 16 },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }, icon: { height: 54, width: 54, borderRadius: 10, backgroundColor: C.mint, justifyContent: 'center', alignItems: 'center' },
  name: { color: C.title, fontSize: 13, fontWeight: '800' }, meta: { color: C.muted, fontSize: 11, marginTop: 5 },
});
