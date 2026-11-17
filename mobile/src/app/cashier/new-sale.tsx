import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';


function ProductIcon({ category }: { category: string }) {
  return (
    <View style={s.productIconCircle}>
      <SymbolView
        name={category === 'Beverages'
          ? { ios: 'cup.and.saucer', android: 'local_drink', web: 'local_drink' }
          : { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }}
        tintColor={C.green}
        size={26}
      />
    </View>
  );
}

export default function NewSale() {
  const router = useRouter();
  const store = useKassaDemo();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 420 || fontScale > 1.1;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = useMemo(() => ['All', ...Array.from(new Set(store.catalog.map(p => p.category)))], [store.catalog]);
  const [showItems, setShowItems] = useState(false);

  const items = useMemo(
    () => store.catalog.filter(item =>
      (category === 'All' || item.category === category) &&
      `${item.name} ${item.sku ?? ''} ${item.barcode ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())
    ),
    [query, category, store.catalog]
  );

  return (
    <KScreen showBrand={false} showPreviewLabel={false}>
      {store.offlineMode && <View style={s.offlineBanner}>
        <Text style={s.offlineTitle}>OFFLINE MODE · Cash sales only</Text>
        <Text style={s.offlineDesc}>
          Products, barcode scanning and totals use saved branch data. Completed cash sales will sync after reconnecting.
          {!store.catalogSavedAt ? ' Connect online once to save the catalogue.' : ''}
        </Text>
        {store.catalogSavedAt && Date.now() - store.catalogSavedAt > 48 * 60 * 60 * 1000 &&
          <Text style={s.offlineError}>Stock is over 48 hours old. Refresh online before accepting cash.</Text>}
      </View>}
      <View style={s.searchRow}>
        <SymbolView
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          tintColor={C.muted}
          size={18}
        />
        <TextInput
          style={s.searchInput}
          placeholder="Search products or scan barcode"
          placeholderTextColor={C.faint}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          accessibilityLabel="Search products"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan barcode"
          onPress={() => router.push('/cashier/scan-product')}
          style={s.scanAction}
        >
          <SymbolView
            name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }}
            tintColor={C.green}
            size={21}
          />
        </Pressable>
      </View>

      <Text style={s.categoryTitle}>Categories</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.categoryScroll}
        contentContainerStyle={s.categoryRow}
      >
        {categories.map(cat => (
          <Pressable
            key={cat}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${cat}`}
            accessibilityState={{ selected: category === cat }}
            onPress={() => setCategory(cat)}
            style={[s.categoryPill, category === cat && s.categorySelected]}
          >
            <Text style={[s.categoryText, category === cat && s.categoryTextSelected]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={s.productsHeading}>
        <Text style={s.sectionTitle}>Products</Text>
        <Text style={s.itemCount}>{items.length} items</Text>
      </View>
      {store.loadingCatalog ? <Text style={s.emptyText}>Loading products…</Text> : null}
      {store.catalogError ? <Pressable onPress={() => { void store.refreshCatalog(); }} style={s.emptyResults}><Text style={s.emptyText}>{store.catalogError} • Tap to retry.</Text></Pressable> : null}
      {!store.loadingCatalog && items.length === 0 ? (
        <View style={s.emptyResults}><Text style={s.emptyText}>No products match your search.</Text></View>
      ) : (
        <View style={s.productsGrid}>
          {items.map(item => {
            const quantity = store.lines.find(line => line.id === item.id)?.quantity ?? 0;
            return (
              <View key={item.id} style={[s.productCard, quantity > 0 && s.productCardSelected]}>
                {quantity > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name} from current sale`}
                    accessibilityHint="Removes all selected quantities of this product"
                    disabled={!!store.pendingSale}
                    onPress={() => store.remove(item.id)}
                    style={[s.removeCircle, store.pendingSale && { opacity: 0.4 }]}
                  >
                    <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={C.muted} />
                  </Pressable>
                )}
                <View style={s.productImage}>
                  <ProductIcon category={item.category} />
                  {quantity > 0 && (
                    <View style={s.selectedCount}>
                      <Text style={s.selectedCountText}>{quantity} selected</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={2} style={s.productName}>{item.name}</Text>
                <View style={s.productInfoRow}>
                  <View style={s.productDetails}>
                    <Text style={[s.productMeta, { color: C.green, fontWeight: '800' }]}>{naira(item.price)}</Text>
                    <Text style={s.productMeta}>In stock: {item.stock}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={quantity > 0 ? `Add another ${item.name}; ${quantity} in sale` : `Add ${item.name} to sale`}
                    onPress={() => store.add(item.id)}
                    disabled={!!store.pendingSale || item.stock <= quantity}
                    style={[s.addCircle, quantity > 0 && s.addedCircle, (store.pendingSale || item.stock <= quantity) && { opacity: 0.35 }]}
                  >
                    <SymbolView
                      name={quantity > 0
                        ? { ios: 'checkmark', android: 'check', web: 'check' }
                        : { ios: 'plus', android: 'add', web: 'add' }}
                      size={17}
                      tintColor={C.white}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {store.pendingSale && (
        <Text style={s.lockNotice}>This sale is awaiting payment. Finish or verify payment before changing its items.</Text>
      )}
      <View style={s.cartCard}>
        <View style={[s.cartSummary, compact && s.cartSummaryCompact]}>
          <View style={s.cartHeading}>
            <View style={s.cartIconCircle}>
              <SymbolView name={{ ios: 'basket', android: 'shopping_basket', web: 'shopping_basket' }} size={22} tintColor={C.green} />
            </View>
            <View style={s.cartInfo}>
              <Text style={s.cartTitle}>Current sale</Text>
              <Text style={s.cartCount}>{store.count} {store.count === 1 ? 'item' : 'items'} selected</Text>
            </View>
          </View>
          <View style={[s.cartAmountWrap, compact && s.cartAmountWrapCompact]}>
            <Text style={s.cartTotal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
              accessibilityLabel={'Sale total ' + naira(store.total)}>{naira(store.total)}</Text>
          </View>
        </View>

        <View style={s.cartActions}>
          {store.count > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowItems(value => !value)}
              style={s.editButton}
            >
              <Text style={s.editText}>{showItems ? 'Hide items' : 'Edit items'}</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue to payment"
            disabled={store.count === 0}
            onPress={() => router.push('/cashier/review-sale')}
            style={[s.paymentButton, store.count === 0 && s.paymentDisabled]}
          >
            <Text style={[s.paymentText, store.count === 0 && s.paymentDisabledText]}>Continue to payment</Text>
          </Pressable>
        </View>

        {showItems && store.count > 0 && (
          <View style={s.cartDetails}>
            {store.lines.map(line => {
              const item = store.catalog.find(product => product.id === line.id);
              if (!item) return null;
              return (
                <View key={line.id} style={s.cartLine}>
                  <View style={s.cartLineName}>
                    <Text style={s.lineName}>{item.name}</Text>
                    <Text style={s.lineMeta}>{naira(item.price)} each</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${item.name}`} disabled={!!store.pendingSale} onPress={() => store.subtract(item.id)} style={s.quantityButton}>
                    <Text style={s.quantityText}>−</Text>
                  </Pressable>
                  <Text style={s.quantityCount}>{line.quantity}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${item.name}`} disabled={!!store.pendingSale || line.quantity >= item.stock} onPress={() => store.add(item.id)} style={s.quantityButton}>
                    <Text style={s.quantityText}>+</Text>
                  </Pressable>
                </View>
              );
            })}
            <Pressable
              disabled={!!store.pendingSale}
              onPress={() => Alert.alert('Clear current sale?', 'All selected items will be removed.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear sale', style: 'destructive', onPress: () => { store.clear(); setShowItems(false); } },
              ])}
              style={s.clearButton}
            >
              <Text style={s.clearText}>Clear current sale</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KScreen>
  );
}

const s = StyleSheet.create({
  offlineBanner: { padding: 13, borderWidth: 1, borderColor: C.mintBorder, borderRadius: 9, backgroundColor: C.mint, marginBottom: 16 },
  offlineTitle: { color: C.greenDark, fontSize: 14, fontWeight: '800' },
  offlineDesc: { color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 5 },
  offlineError: { color: C.danger, fontSize: 13, marginTop: 6 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', height: 49,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
    borderRadius: 10, paddingLeft: 13, paddingRight: 7,
  },
  searchInput: { flex: 1, minWidth: 0, height: 48, paddingHorizontal: 9, fontSize: 14, color: C.title },
  scanAction: { width: 34, height: 34, borderRadius: 7, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  categoryTitle: { color: C.title, fontWeight: '800', fontSize: 20, marginTop: 23, marginBottom: 13 },
  categoryScroll: { flexGrow: 0 },
  categoryRow: { gap: 9, paddingRight: 5 },
  categoryPill: {
    borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
    borderRadius: 22, minHeight: 40, minWidth: 68,
    paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center',
  },
  categorySelected: { backgroundColor: C.green, borderColor: C.green },
  categoryText: { color: C.muted, fontSize: 14, fontWeight: '600' },
  categoryTextSelected: { color: C.white },
  productsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 46, marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: C.title },
  itemCount: { color: C.faint, fontSize: 14 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  productCard: {
    width: '48.4%', backgroundColor: C.white, borderWidth: 1,
    borderColor: C.border, borderRadius: 12, padding: 10, minHeight: 196, position: 'relative',
  },
  productCardSelected: { borderColor: C.green, borderWidth: 1.5 },
  removeCircle: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: '#F0F1F3', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  productImage: { height: 75, backgroundColor: C.mint, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  selectedCount: { position: 'absolute', bottom: 3, left: 5, borderRadius: 10, backgroundColor: C.white, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: C.mintBorder },
  selectedCountText: { color: C.green, fontSize: 11, fontWeight: '800' },
  productIconCircle: { width: 43, height: 43, backgroundColor: '#D7EBE4', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  productName: { color: C.title, fontWeight: '800', fontSize: 14 },
  productInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 3 },
  productDetails: { flex: 1, minWidth: 0 },
  productMeta: { color: C.muted, fontSize: 14 },
  addCircle: { width: 33, height: 33, borderRadius: 17, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  addedCircle: { backgroundColor: '#08765B' },
  emptyResults: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 20, backgroundColor: C.white },
  emptyText: { color: C.muted, fontSize: 14 },
  lockNotice: { color: C.orange, fontSize: 14, marginTop: 14, lineHeight: 20 },
  cartCard: { marginTop: 22, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 13 },
  cartSummary: { flexDirection: 'row', alignItems: 'center', width: '100%', minWidth: 0 },
  cartSummaryCompact: { flexDirection: 'column', alignItems: 'stretch' },
  cartHeading: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  cartAmountWrap: { maxWidth: '48%', flexShrink: 1, minWidth: 0, alignItems: 'flex-end', marginLeft: 8 },
  cartAmountWrapCompact: { maxWidth: '100%', marginLeft: 0, alignSelf: 'stretch', marginTop: 8 },
  cartIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cartInfo: { flex: 1, minWidth: 0, flexShrink: 1 },
  cartTitle: { fontSize: 20, fontWeight: '800', color: C.title },
  cartCount: { color: C.faint, fontSize: 14, marginTop: 5 },
  cartTotal: { fontSize: 20, fontWeight: '800', color: C.title, textAlign: 'right', flexShrink: 1 },
  cartActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 13, gap: 10 },
  editButton: { paddingHorizontal: 6, paddingVertical: 7 },
  editText: { color: C.green, fontSize: 14, fontWeight: '700' },
  paymentButton: { borderRadius: 7, backgroundColor: C.green, minHeight: 45, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  paymentDisabled: { backgroundColor: '#E5E7EB' },
  paymentText: { color: C.white, fontWeight: '800', fontSize: 14 },
  paymentDisabledText: { color: C.faint },
  cartDetails: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 14, paddingTop: 6 },
  cartLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 6 },
  cartLineName: { flex: 1 },
  lineName: { fontSize: 14, fontWeight: '700', color: C.title },
  lineMeta: { color: C.muted, fontSize: 14, marginTop: 3 },
  quantityButton: { width: 27, height: 27, borderRadius: 7, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  quantityText: { color: C.green, fontSize: 20, fontWeight: '800' },
  quantityCount: { color: C.title, fontWeight: '700', fontSize: 14, minWidth: 16, textAlign: 'center' },
  clearButton: { alignSelf: 'flex-end', paddingVertical: 9, paddingHorizontal: 5 },
  clearText: { color: C.danger, fontSize: 14, fontWeight: '700' },
});
