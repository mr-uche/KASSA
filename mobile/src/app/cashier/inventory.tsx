import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useKassaSession } from '@/components/kassa-demo/api';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { KScreen, KCard, KField } from '@/components/kassa-demo/ui';
import { C } from '@/components/kassa-demo/theme';
import { DropdownFilter } from '@/components/kassa-demo/dropdown-filter';
import {
  ScreenHeading, SegmentedTabs, MetricGrid, ListHeading, RecordRow, SmallAction,
  InlineNotice, money,
} from '@/components/kassa-demo/business-ui';

type Tab = 'Catalogue' | 'Categories' | 'Low Stock';
type Product = {
  id: string; name: string; sku: string; categoryId: string | null; category: string;
  price: string; stock: number; lowStockThreshold: number;
  status: 'In stock' | 'Low stock' | 'Out of stock';
};
type Category = {
  id: string; name: string; description: string | null; products: number;
  stockValue: string; status: 'Active' | 'Inactive';
};
const tabs: Tab[] = ['Catalogue', 'Categories', 'Low Stock'];
const stockOptions = ['All stock', 'In stock', 'Low stock', 'Out of stock'] as const;
type Sort = 'Sort' | 'Name A–Z' | 'Name Z–A' | 'Lowest stock';
const sorts: Sort[] = ['Sort', 'Name A–Z', 'Name Z–A', 'Lowest stock'];
function stockState(product: Product) {
  return product.stock <= 0 ? 'Out of stock' :
    product.stock <= product.lowStockThreshold ? 'Low stock' : 'In stock';
}

export default function Inventory() {
  const router = useRouter();
  const session = useKassaSession();
  const store = useKassaDemo();
  const scope = session.scope;
  const [tab, setTab] = useState<Tab>('Catalogue');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [stockFilter, setStockFilter] = useState('All stock');
  const [sort, setSort] = useState<Sort>('Sort');
  const [showAll, setShowAll] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryForm, setCategoryForm] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockQty, setRestockQty] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (alive: () => boolean = () => true) => {
    if (!scope) return;
    if (alive()) { setLoading(true); setError(''); }
    const q = '?businessId=' + encodeURIComponent(scope.businessId) +
      '&branchId=' + encodeURIComponent(scope.branchId);
    try {
      const [p, c] = await Promise.all([
        session.request<Product[]>('inventory/products' + q),
        session.request<Category[]>('inventory/categories' + q),
      ]);
      if (!Array.isArray(p) || !Array.isArray(c)) throw new Error('Inventory data was invalid.');
      if (alive()) { setProducts(p); setCategories(c); }
    } catch (cause) {
      if (alive()) { setProducts([]); setCategories([]); setError(cause instanceof Error ? cause.message : 'Cannot load inventory.'); }
    } finally { if (alive()) setLoading(false); }
  }, [scope?.businessId, scope?.branchId, session.request]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void load(() => active);
    return () => { active = false; };
  }, [load]));

  const filtered = useMemo(() => products.filter(item => {
    const matches = (item.name + ' ' + item.sku + ' ' + item.category).toLowerCase()
      .includes(query.trim().toLowerCase());
    const status = stockState(item);
    return matches && (category === 'All categories' || item.category === category) &&
      (stockFilter === 'All stock' || status === stockFilter) &&
      (tab !== 'Low Stock' || status !== 'In stock');
  }).sort((a, b) => sort === 'Lowest stock' ? a.stock - b.stock
    : sort === 'Name Z–A' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)), [products, tab, query, category, stockFilter, sort]);
  const categoryList = useMemo(() => categories.filter(item =>
    (item.name + ' ' + (item.description ?? '')).toLowerCase().includes(query.trim().toLowerCase())
  ), [categories, query]);
  const low = products.filter(item => item.stock > 0 && item.stock <= item.lowStockThreshold).length;
  const out = products.filter(item => item.stock <= 0).length;
  // Always choose from the entire branch catalogue, never just low-stock results.
  const restockChoices = products.map(item => item.name + ' · SKU: ' + item.sku);
  const selectedRestockProduct = products.find(item => item.id === restockProduct?.id) ?? null;

  async function addCategory() {
    if (!scope || busy) return;
    const name = newCategory.trim();
    if (!name || name.length > 120) return setError('Enter a category name of up to 120 characters.');
    setBusy(true); setError('');
    try {
      await session.request('inventory/categories', { businessId: scope.businessId, name });
      setNewCategory(''); setCategoryForm(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to add category.'); }
    finally { setBusy(false); }
  }
  async function restock() {
    if (!scope || !selectedRestockProduct || busy) return;
    const qty = Number(restockQty);
    if (!/^\d+$/.test(restockQty) || !Number.isSafeInteger(qty) || qty < 1 || qty > 100000000) {
      setError('Enter a whole restock quantity between 1 and 100,000,000.');
      return;
    }
    setBusy(true); setError('');
    try {
      await session.request('inventory/products/' + encodeURIComponent(selectedRestockProduct.id) + '/restock', {
        businessId: scope.businessId, branchId: scope.branchId, quantity: qty,
      });
      setRestockProduct(null); setRestockQty(''); setRestockOpen(false);
      await load(); await store.refreshCatalog();
      Alert.alert('Stock updated', 'The branch stock balance was increased.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to restock product.'); }
    finally { setBusy(false); }
  }

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <ScreenHeading title="Products & Inventory" subtitle={scope?.branchName ?? 'Select a branch'}/>
    <SegmentedTabs options={tabs} value={tab} onChange={value => {
      setTab(value);
      setQuery('');
      setShowAll(false);
      setCategory('All categories');
      setStockFilter('All stock');
      setSort('Sort');
    }}/>
    {tab !== 'Categories' && <View style={s.filterRow}>
      <DropdownFilter label="Category" value={category}
        options={['All categories', ...new Set(categories.map(item => item.name))]}
        onChange={setCategory}/>
      {tab === 'Catalogue' && <DropdownFilter label="Stock" value={stockFilter}
        options={stockOptions} onChange={setStockFilter}/>}
      <DropdownFilter label="Sort products" value={sort}
        options={sorts} onChange={value => setSort(value as Sort)}/>
    </View>}
    <View style={s.searchActionRow}>
      <TextInput
        accessibilityLabel={tab === 'Categories' ? 'Search categories' : 'Search products'}
        autoCapitalize="none"
        autoCorrect={false}
        value={query}
        onChangeText={setQuery}
        placeholder={tab === 'Categories' ? 'Search categories' : 'Search products by name or code'}
        placeholderTextColor={C.faint}
        style={s.searchInput}
      />
      {tab === 'Catalogue' && <SmallAction label="+ Add product" onPress={() => router.push('/cashier/add-product')}/>}
      {tab === 'Categories' && <SmallAction label="+ Add category" onPress={() => setCategoryForm(value => !value)}/>}
    </View>
    <View style={s.refreshRow}>
      {tab !== 'Categories' && <SmallAction label="Restock products"
        disabled={!products.length || busy}
        onPress={() => { setRestockProduct(null); setRestockQty(''); setRestockOpen(v => !v); }}/>}
      <SmallAction label="Refresh" secondary disabled={loading} onPress={() => { void load(); }}/>
    </View>
    {categoryForm && tab === 'Categories' && <KCard>
      <KField label="Category name" value={newCategory} onChangeText={setNewCategory} placeholder="Enter category name"/>
      <SmallAction label={busy ? 'Saving…' : 'Save category'} disabled={busy} onPress={() => { void addCategory(); }}/>
    </KCard>}
    {restockOpen && tab !== 'Categories' && <KCard>
      <Text style={s.section}>Restock product</Text>
      <Text style={s.muted}>Select any product from your catalogue, regardless of its current stock.</Text>
      <DropdownFilter label="Choose product" value={selectedRestockProduct
        ? selectedRestockProduct.name + ' · SKU: ' + selectedRestockProduct.sku : 'Select product'}
        options={restockChoices}
        onChange={value => {
          setRestockProduct(products.find(item => item.name + ' · SKU: ' + item.sku === value) ?? null);
          setRestockQty('');
        }}/>
      {!!selectedRestockProduct && <Text style={s.stockInfo}>
        Current branch stock: {selectedRestockProduct.stock} units
      </Text>}
      <KField label="Quantity to add" value={restockQty} keyboardType="numeric"
        onChangeText={v => setRestockQty(v.replace(/\D/g, '').slice(0, 9))} placeholder="e.g. 24"/>
      <View style={s.actionRow}>
        <SmallAction label="Cancel" secondary onPress={() => {
          setRestockProduct(null); setRestockQty(''); setRestockOpen(false);
        }}/>
        <SmallAction label={busy ? 'Saving…' : 'Confirm restock'} disabled={busy || !selectedRestockProduct}
          onPress={() => { void restock(); }}/>
      </View>
    </KCard>
    {!!error && <InlineNotice warning text={error}/>}
    {loading && <Text style={s.muted}>Loading inventory…</Text>}
    {tab === 'Catalogue' && <MetricGrid items={[
      { label: 'Total products', value: String(products.length), note: 'In this business' },
      { label: 'Categories', value: String(categories.length), note: 'Available categories' },
      { label: 'Low stock items', value: String(low), note: 'Needs attention', alert: low > 0 },
    ]}/>}
    {tab === 'Categories' && <MetricGrid items={[
      { label: 'Total categories', value: String(categories.length), note: 'In your business' },
      { label: 'Products assigned', value: String(products.filter(item => item.categoryId).length) },
      { label: 'Uncategorised', value: String(products.filter(item => !item.categoryId).length),
        note: 'Products needing a category' },
    ]}/>}
    {tab === 'Low Stock' && <MetricGrid items={[
      { label: 'Low-stock products', value: String(low), alert: low > 0 },
      { label: 'Out of stock', value: String(out), alert: out > 0 },
      { label: 'Needs attention', value: low || out ? 'Restock' : 'All clear', note: 'Review stock quantities' },
    ]}/>}
    <ListHeading title={tab === 'Categories' ? 'Categories' : 'Products'}
      action={showAll ? 'Show less' : 'View all'} onPress={() => setShowAll(v => !v)}/>
    {tab === 'Categories'
      ? (showAll ? categoryList : categoryList.slice(0, 8)).map(item => <RecordRow key={item.id}
        title={item.name} subtitle={item.products + ' products'}
        detail={item.description || 'Category in your catalogue'}
        amount={money(item.stockValue)} status={item.status} tone={item.status === 'Active' ? 'green' : 'gray'}/>)
      : (showAll ? filtered : filtered.slice(0, 12)).map(item => {
        const status = stockState(item);
        return <View key={item.id}>
          <RecordRow title={item.name}
            subtitle={'SKU: ' + item.sku + ' · ' + item.stock + ' units · ' + item.category}
            amount={money(item.price)} status={status}
            tone={status === 'In stock' ? 'green' : status === 'Low stock' ? 'orange' : 'red'}/>
          {tab === 'Low Stock' && <View style={s.restockLink}>
            <SmallAction label={'Restock ' + item.name} secondary
              onPress={() => { setRestockProduct(item); setRestockQty(''); setRestockOpen(true); }} />
          </View>}
        </View>;
      })}
    {!loading && !error && (tab === 'Categories' ? !categoryList.length : !filtered.length) &&
      <InlineNotice text="No records match these filters."/>}
    <Text style={s.footer}>Inventory updates use your business's saved branch stock records.</Text>
  </KScreen>;
}

const s = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 7, marginBottom: 14, alignItems: 'center' },
  searchActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.white, borderRadius: 9, color: C.title, fontSize: 13, paddingHorizontal: 12 },
  refreshRow: { alignSelf: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  stockInfo: { color: C.text, fontSize: 13, marginTop: 12, marginBottom: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 16, alignItems: 'center' },
  muted: { color: C.muted, fontSize: 13, marginBottom: 14 },
  section: { color: C.title, fontWeight: '800', fontSize: 17, marginBottom: 8 },
  restockLink: { alignSelf: 'flex-end', marginTop: -1, marginBottom: 10 },
  footer: { marginTop: 20, color: C.muted, fontSize: 12, lineHeight: 17 },
});
