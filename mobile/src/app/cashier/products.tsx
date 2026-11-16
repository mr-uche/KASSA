import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';

export default function Products() {
  const store = useKassaDemo();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const categories = useMemo(() => ['All', ...Array.from(new Set(store.catalog.map(item => item.category)))], [store.catalog]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return store.catalog.filter(item =>
      (filter === 'All' || item.category === filter) &&
      [item.name, item.sku, item.barcode].some(value => (value || '').toLowerCase().includes(term))
    );
  }, [store.catalog, filter, query]);

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <Text style={s.title}>Products</Text>
    <Text style={s.subtitle}>Browse catalogue to add to sale</Text>

    <View style={s.searchRow}>
      <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} tintColor={C.faint}/>
      <TextInput
        style={s.searchInput} value={query} onChangeText={setQuery}
        placeholder="Search by name, SKU, or barcode" placeholderTextColor={C.faint}
        accessibilityLabel="Search products" autoCapitalize="none"
      />
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryList} contentContainerStyle={s.categoryContent}>
      {categories.map(cat => {
        const selected = cat === filter;
        return <Pressable key={cat} accessibilityRole="button" accessibilityState={{ selected }}
          onPress={() => setFilter(cat)}
          style={[s.category, selected && s.categoryActive]}>
          <Text style={[s.categoryName, selected && s.categoryActiveName]}>{cat}</Text>
        </Pressable>;
      })}
    </ScrollView>

    <Text style={s.groupTitle}>ALL PRODUCTS</Text>
    {store.loadingCatalog && <Text style={s.info}>Loading products…</Text>}
    {store.catalogError && <Pressable accessibilityRole="button" onPress={() => { void store.refreshCatalog(); }}>
      <Text style={s.error}>{store.catalogError} • Tap to retry</Text>
    </Pressable>}
    <View style={s.products}>
      {visible.map(item => {
        const quantity = store.lines.find(line => line.id === item.id)?.quantity ?? 0;
        const outOfStock = item.stock <= quantity;
        const lowStock = item.lowStockThreshold !== undefined &&
          item.stock > 0 && item.stock <= item.lowStockThreshold;
        return <View key={item.id} style={s.card}>
          <View style={s.productIcon}>
            <SymbolView name={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }} size={25} tintColor={C.green}/>
          </View>
          <View style={s.details}>
            <Text numberOfLines={1} style={s.name}>{item.name}</Text>
            <Text numberOfLines={1} style={s.meta}>{item.sku || 'No SKU'} • {item.stock} in stock</Text>
            {lowStock && <Text style={s.lowStock}>Low stock</Text>}
            {item.stock === 0 && <Text style={s.lowStock}>Out of stock</Text>}
            {quantity > 0 && <Text style={s.inCart}>{quantity} added to sale</Text>}
          </View>
          <Text style={s.price}>{naira(item.price)}</Text>
          <Pressable accessibilityRole="button"
            accessibilityLabel={'Add ' + item.name + ' to sale'}
            disabled={outOfStock}
            onPress={() => store.add(item.id)}
            style={[s.add, outOfStock && s.addDisabled]}>
            <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor={C.white} size={19}/>
          </Pressable>
        </View>;
      })}
      {!store.loadingCatalog && !store.catalogError && visible.length === 0 &&
        <Text style={s.info}>No products match your search.</Text>}
    </View>
    <Text style={s.footer}>Tap + to add an item to the current sale.</Text>
  </KScreen>;
}

const s = StyleSheet.create({
  title: { fontSize: 26, color: C.title, fontWeight: '800' },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingLeft: 12, marginTop: 22, height: 48 },
  searchInput: { flex: 1, minWidth: 0, paddingHorizontal: 10, height: 46, fontSize: 14, color: C.title },
  categoryList: { marginTop: 14, flexGrow: 0 },
  categoryContent: { gap: 8, paddingRight: 10 },
  category: { borderWidth: 1, borderColor: C.border, borderRadius: 20, minHeight: 33, paddingHorizontal: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: C.white },
  categoryActive: { backgroundColor: C.green, borderColor: C.green },
  categoryName: { color: C.muted, fontSize: 14, fontWeight: '600' },
  categoryActiveName: { color: C.white },
  groupTitle: { color: C.muted, fontSize: 20, fontWeight: '800', marginTop: 30, marginBottom: 12 },
  products: { gap: 12 },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 94 },
  productIcon: { width: 54, height: 60, borderRadius: 10, backgroundColor: C.mint, justifyContent: 'center', alignItems: 'center' },
  details: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, color: C.title, fontWeight: '800' },
  meta: { fontSize: 14, color: C.muted, marginTop: 4 },
  price: { color: C.title, fontSize: 14, fontWeight: '800' },
  add: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  addDisabled: { opacity: 0.4 },
  lowStock: { color: C.orange, fontSize: 14, marginTop: 3, fontWeight: '700' },
  inCart: { color: C.green, fontSize: 14, marginTop: 4, fontWeight: '700' },
  info: { color: C.muted, fontSize: 14, paddingVertical: 15 },
  error: { color: C.danger, fontSize: 14, marginBottom: 12 },
  footer: { textAlign: 'center', color: C.faint, fontSize: 14, marginTop: 24 },
});
