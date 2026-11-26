import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKassaSession } from '@/components/kassa-demo/api';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';

type Category = { id: string; name: string; status: string };
type ProductResult = { id: string; name: string; message?: string };

export default function AddProduct() {
  const router = useRouter();
  const session = useKassaSession();
  const store = useKassaDemo();
  const scope = session.scope;
  const allowed = !!scope && (scope.myRole === 'Owner' || scope.myPermissions?.includes('*') ||
    scope.myPermissions?.includes('Manage products & inventory'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [categoryNew, setCategoryNew] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('0');
  const [threshold, setThreshold] = useState('5');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const businessId = scope?.businessId;
  const branchId = scope?.branchId;
  const request = session.request;
  useEffect(() => {
    if (!businessId || !branchId || !allowed) return;
    let active = true;
    void request<Category[]>('inventory/categories?businessId=' +
      encodeURIComponent(businessId) + '&branchId=' + encodeURIComponent(branchId))
      .then(result => {
        if (!active) return;
        const list = result.filter(item => item.status === 'Active');
        setCategories(list);
        setCategoryId(current => list.some(item => item.id === current) ? current : list[0]?.id ?? '');
      }).catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load inventory categories.');
      });
    return () => { active = false; };
  }, [businessId, branchId, allowed, request]);

  const createCategory = async () => {
    if (!scope || !allowed || !categoryNew.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const result = await session.request<Category>('inventory/categories', {
        businessId: scope.businessId, name: categoryNew.trim(),
      });
      setCategoryNew('');
      setCategories(previous => [...previous, { id: result.id, name: result.name, status: 'Active' }]);
      setCategoryId(result.id);
      setCreatingCategory(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create category.');
    } finally { setBusy(false); }
  };

  const save = async () => {
    if (!scope || !allowed || busy) return;
    if (!name.trim() || !sku.trim() || !categoryId) {
      setError('Product name, SKU and category are required.');
      return;
    }
    const currency = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
    if (!currency.test(price.trim()) || (cost.trim() && !currency.test(cost.trim()))) {
      setError('Enter valid prices in naira, with no more than two decimal places.');
      return;
    }
    const maxStock = 100000000;
    const quantity = Number(stock);
    const lowStockThreshold = Number(threshold);
    if (!/^\d+$/.test(stock) || !/^\d+$/.test(threshold) ||
        !Number.isSafeInteger(quantity) || !Number.isSafeInteger(lowStockThreshold) ||
        quantity > maxStock || lowStockThreshold > maxStock) {
      setError('Stock and low-stock threshold must be whole numbers between 0 and 100,000,000.');
      return;
    }
    setBusy(true); setError('');
    try {
      await session.request<ProductResult>('inventory/products', {
        businessId: scope.businessId, branchId: scope.branchId,
        name: name.trim(), sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        categoryId,
        sellingPrice: price.trim(), costPrice: cost.trim() || undefined,
        currentStock: quantity, lowStockThreshold,
      });
      await store.refreshCatalog();
      Alert.alert('Product added', name.trim() + ' was saved to inventory.', [
        { text: 'View products', onPress: () => router.replace('/cashier/inventory') },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save product.');
    } finally { setBusy(false); }
  };

  if (!allowed) {
    return <KScreen title="Add product" showBrand={false} showPreviewLabel={false} back>
      <Text style={s.error}>You need inventory management permission to add products.</Text>
    </KScreen>;
  }

  return <KScreen showBrand={false} showPreviewLabel={false} back>
    <Text style={s.title}>Add product</Text>
    <Text style={s.subtitle}>Add a product to {scope?.branchName} inventory.</Text>

    <Text style={s.label}>Product name</Text>
    <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Orange Juice" placeholderTextColor={C.faint}/>

    <Text style={s.label}>SKU / Product code</Text>
    <TextInput style={s.input} value={sku} onChangeText={setSku} autoCapitalize="characters" placeholder="e.g. OJ-250" placeholderTextColor={C.faint}/>

    <Text style={s.label}>Barcode (optional)</Text>
    <TextInput style={s.input} value={barcode} onChangeText={setBarcode} autoCapitalize="none" placeholder="Packaging barcode" placeholderTextColor={C.faint}/>
    <Text style={s.hint}>Keep leading zeroes on barcodes.</Text>

    <Text style={s.label}>Category</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
      <View style={s.categories}>
        {categories.map(item => <Pressable key={item.id}
          accessibilityRole="button" accessibilityState={{ selected: item.id === categoryId }}
          onPress={() => setCategoryId(item.id)}
          style={[s.category, item.id === categoryId && s.categoryActive]}>
          <Text style={[s.categoryText, item.id === categoryId && s.categoryTextActive]}>{item.name}</Text>
        </Pressable>)}
      </View>
    </ScrollView>
    <Pressable style={s.link} onPress={() => setCreatingCategory(value => !value)}>
      <Text style={s.linkText}>{creatingCategory ? 'Cancel new category' : '+ Create new category'}</Text>
    </Pressable>
    {creatingCategory && <View style={s.categoryCreate}>
      <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={categoryNew}
        onChangeText={setCategoryNew} placeholder="New category" placeholderTextColor={C.faint}/>
      <Pressable disabled={busy} onPress={() => { void createCategory(); }} style={s.createButton}>
        <Text style={s.createText}>Add</Text>
      </Pressable>
    </View>}
    {!categories.length && <Text style={s.hint}>Create a category before adding the product.</Text>}

    <Text style={s.label}>Selling price (₦)</Text>
    <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="2500.00" placeholderTextColor={C.faint}/>
    <Text style={s.label}>Cost price (₦) — optional</Text>
    <TextInput style={s.input} value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="1800.00" placeholderTextColor={C.faint}/>
    <Text style={s.label}>Current stock</Text>
    <TextInput style={s.input} value={stock} onChangeText={setStock} keyboardType="number-pad"/>
    <Text style={s.label}>Low-stock alert at</Text>
    <TextInput style={s.input} value={threshold} onChangeText={setThreshold} keyboardType="number-pad"/>

    {error ? <Text style={s.error}>{error}</Text> : null}
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void save(); }}
      style={[s.saveButton, busy && { opacity: 0.6 }]}>
      <Text style={s.saveText}>{busy ? 'Saving…' : 'Save product'}</Text>
    </Pressable>
  </KScreen>;
}

const s = StyleSheet.create({
  title: { fontSize: 27, fontWeight: '800', color: C.title, marginBottom: 4 },
  subtitle: { color: C.muted, fontSize: 14, marginBottom: 22 },
  label: { color: C.title, fontSize: 14, fontWeight: '800', marginTop: 13, marginBottom: 8 },
  input: { minHeight: 51, backgroundColor: C.white, borderColor: C.border, borderWidth: 1, borderRadius: 9, paddingHorizontal: 13, fontSize: 14, color: C.title, marginBottom: 5 },
  hint: { color: C.muted, fontSize: 14, marginBottom: 7 },
  categories: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
  category: { borderColor: C.border, borderWidth: 1, borderRadius: 19, paddingVertical: 10, paddingHorizontal: 13, backgroundColor: C.white },
  categoryActive: { backgroundColor: C.green, borderColor: C.green },
  categoryText: { color: C.muted, fontWeight: '700', fontSize: 14 },
  categoryTextActive: { color: C.white },
  link: { paddingVertical: 12 },
  linkText: { color: C.green, fontSize: 14, fontWeight: '800' },
  categoryCreate: { flexDirection: 'row', gap: 9, alignItems: 'center', marginBottom: 9 },
  createButton: { borderRadius: 9, backgroundColor: C.green, paddingHorizontal: 18, minHeight: 51, justifyContent: 'center' },
  createText: { color: C.white, fontWeight: '800', fontSize: 14 },
  saveButton: { backgroundColor: C.green, borderRadius: 9, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 21 },
  saveText: { color: C.white, fontWeight: '800', fontSize: 14 },
  error: { color: C.danger, fontSize: 14, lineHeight: 21, marginVertical: 13 },
});
