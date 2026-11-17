import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAudioPlayer } from 'expo-audio';
import { SymbolView } from 'expo-symbols';
import { useKassaSession, type CatalogItem } from '@/components/kassa-demo/api';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira, toKobo } from '@/components/kassa-demo/theme';
import { KScreen, KButton, KField } from '@/components/kassa-demo/ui';

const SCANNER_DARK = '#0C1423';
const SCANNER_MINT = '#6AEBC2';
// Small visual barcode guide. CameraView beneath it still scans the real camera feed.
const guideBars = [2, 1, 3, 1, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2];

export default function ScanProduct() {
  const router = useRouter();
  const session = useKassaSession();
  const store = useKassaDemo();
  const scope = session.scope;
  const { height } = useWindowDimensions();
  const [permission, askPermission] = useCameraPermissions();
  const [active, setActive] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [found, setFound] = useState<CatalogItem | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [torch, setTorch] = useState(false);
  const inFlight = useRef(false);
  const scanBeep = useAudioPlayer(require('../../../assets/sounds/scan-success.wav'));

  // Sound is optional feedback: playback failures must never block product lookup.
  const playScanBeep = useCallback(() => {
    try {
      void scanBeep.seekTo(0).then(() => scanBeep.play()).catch(() => undefined);
    } catch {
      // The product can still be sold with the device muted or audio unavailable.
    }
  }, [scanBeep]);

  useFocusEffect(useCallback(() => {
    setActive(true);
    return () => { setActive(false); setTorch(false); };
  }, []));

  const resumeScan = () => {
    if (processing) return;
    setError('');
    setFound(null);
    setAdded(false);
    setSelectedQty(1);
    setManual('');
    setActive(true);
  };

  const lookUp = useCallback(async (barcode: string, fromCamera = false) => {
    const code = barcode.trim();
    if (!scope || !session.user) {
      setError('Sign in and select your branch before scanning.');
      return;
    }
    if (store.pendingSale) {
      setError('A payment is pending. Finish it before scanning more products.');
      return;
    }
    if (!code || code.length > 100 || inFlight.current) return;

    inFlight.current = true;
    setActive(false);
    setProcessing(true);
    setFound(null);
    setAdded(false);
    setSelectedQty(1);
    setError('');
    try {
      if (store.offlineMode) {
        if (!store.catalogSavedAt || Date.now() - store.catalogSavedAt > 48 * 60 * 60 * 1000) {
          throw new Error('Offline stock is missing or older than 48 hours. Reconnect and refresh your catalogue.');
        }
        const normalized = code.toLowerCase();
        const codes = [normalized];
        if (/^[0-9]{12}$/.test(normalized)) codes.push('0' + normalized);
        if (/^0[0-9]{12}$/.test(normalized)) codes.push(normalized.slice(1));
        const matches = store.catalog.filter(item =>
          item.sku?.toLowerCase() === normalized ||
          (item.barcode && codes.includes(item.barcode.toLowerCase())));
        if (matches.length !== 1) {
          throw new Error(matches.length
            ? 'Duplicate barcode in saved stock. Resolve this online before selling.'
            : 'Barcode not in your saved products. Reconnect to refresh your catalogue.');
        }
        const cached = matches[0];
        const inCart = store.lines.find(line => line.id === cached.id)?.quantity ?? 0;
        if (cached.stock <= inCart) throw new Error('No more stock is available for ' + cached.name + '.');
        setFound({
          id: cached.id, name: cached.name, sku: cached.sku ?? '',
          barcode: cached.barcode ?? null, category: cached.category,
          price: cached.price.toFixed(2), stock: cached.stock,
          lowStockThreshold: cached.lowStockThreshold ?? 0,
        });
        if (fromCamera) playScanBeep();
        setManual('');
        return;
      }

      const product = await session.request<CatalogItem>(
        'sales/lookup?businessId=' + encodeURIComponent(scope.businessId) +
        '&branchId=' + encodeURIComponent(scope.branchId) +
        '&code=' + encodeURIComponent(code)
      );
      const cached = store.catalog.find(item => item.id === product.id);
      if (!cached || toKobo(cached.price) !== toKobo(Number(product.price)) ||
          cached.stock > product.stock) {
        await store.refreshCatalog();
        throw new Error('Stock or prices changed. Your catalogue was refreshed; scan again.');
      }
      const inCart = store.lines.find(line => line.id === product.id)?.quantity ?? 0;
      if (Math.min(cached.stock, product.stock) <= inCart) {
        throw new Error('No more stock is available for ' + product.name + '.');
      }
      setFound(product);
      if (fromCamera) playScanBeep();
      setManual('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Barcode lookup failed. Please retry.');
    } finally {
      setProcessing(false);
      inFlight.current = false;
    }
  }, [scope?.businessId, scope?.branchId, session.user?.id, session.request,
    store.pendingSale, store.catalog, store.lines, store.refreshCatalog,
    store.offlineMode, store.catalogSavedAt, playScanBeep]);

  const cartLines = store.lines.flatMap(line => {
    const product = store.catalog.find(item => item.id === line.id);
    return product ? [{ line, product }] : [];
  });
  const inCart = found ? (store.lines.find(line => line.id === found.id)?.quantity ?? 0) : 0;
  const cachedFound = found ? store.catalog.find(item => item.id === found.id) : null;
  const available = found ? Math.max(0, Math.min(found.stock, cachedFound?.stock ?? 0) - inCart) : 0;
  const canAdd = !!found && !added && !processing && !store.pendingSale &&
    selectedQty >= 1 && selectedQty <= available;
  const productTotal = found ? toKobo(Number(found.price)) * selectedQty / 100 : 0;
  const scannerHeight = Math.min(395, Math.max(265, height * 0.39));

  const addSelected = () => {
    if (!found || !canAdd) return;
    for (let i = 0; i < selectedQty; i += 1) store.add(found.id);
    setAdded(true);
    setActive(false);
    setError('');
  };

  return <KScreen showBrand={false} showPreviewLabel={false} back={false} nav={false}>
    <View style={s.header}>
      <Text style={s.title}>Scan Product</Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/cashier')}
        accessibilityLabel="Back to cashier home" style={s.backHome}>
        <Text style={s.backText}>‹ Back to home</Text>
      </Pressable>
    </View>

    {store.offlineMode && <View style={s.offlineNotice}>
      <Text style={s.offlineNoticeTitle}>OFFLINE SCANNING</Text>
      <Text style={s.offlineNoticeText}>Barcodes are matched to products saved on this phone. Cash sales will sync when online.</Text>
    </View>}

    <View style={[s.cameraFrame, { height: scannerHeight }]}>
      {permission?.granted ? <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        active={active && !processing && !found && !store.pendingSale}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'qr', 'datamatrix'],
        }}
        onBarcodeScanned={active && !processing && !found && !store.pendingSale
          ? ({ data }) => { void lookUp(data, true); } : undefined}
        onMountError={() => setError('Camera unavailable. Use the manual barcode field below.')}
      /> : <View style={s.noCamera}>
        <SymbolView name={{ ios: 'barcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' }}
          size={52} tintColor={SCANNER_MINT} />
        <Text style={s.noCameraText}>{permission === null
          ? 'Checking camera permissions…'
          : 'Allow camera access to scan products.'}</Text>
        {!!permission && !permission.granted && <Pressable accessibilityRole="button"
          onPress={() => { void askPermission(); }} style={s.allowCamera}>
          <Text style={s.allowText}>Allow camera</Text>
        </Pressable>}
      </View>}
      <View pointerEvents="none" style={s.cameraShade}/>
      <View pointerEvents="none" style={s.frameGuide}>
        <View style={s.cornerTL}/><View style={s.cornerTR}/>
        <View style={s.cornerBL}/><View style={s.cornerBR}/>
        {!found && <View style={s.guideCenter}>
          <View style={s.barcodeGuide}>
            {guideBars.map((bar, i) => <View key={i} style={{
              width: bar, height: i % 5 === 0 ? 47 : 41, backgroundColor: '#FFFFFF',
              opacity: 0.7, marginHorizontal: 1,
            }}/>)}
          </View>
          <View style={s.laserLine}/>
        </View>}
        <View style={s.guideCaption}>
          <Text style={s.guideText}>
            {processing ? 'Looking up product…' : found ? 'Product identified' : 'Position the barcode within the frame'}
          </Text>
          <Text style={s.guideSubtext}>
            {found ? 'Adjust the quantity below' : 'Scanning happens automatically'}
          </Text>
        </View>
      </View>
    </View>

    <View style={s.cameraActions}>
      <Pressable accessibilityRole="button" accessibilityLabel={torch ? 'Turn off flashlight' : 'Turn on flashlight'}
        disabled={!permission?.granted} onPress={() => setTorch(on => !on)}
        style={[s.roundAction, torch && s.roundActionActive, !permission?.granted && s.inactive]}>
        <SymbolView name={{ ios: 'bolt.fill', android: 'flash_on', web: 'flash_on' }}
          size={20} tintColor={torch ? SCANNER_DARK : '#D2DBE6'}/>
      </Pressable>
      <View style={s.scanningStatus}>
        <SymbolView name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }}
          size={20} tintColor={SCANNER_MINT}/>
        <Text style={s.scanningStatusText}>{processing ? 'Searching' : found ? 'Found' : 'Scanning'}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Scan another product"
        onPress={resumeScan} disabled={processing} style={s.roundAction}>
        <SymbolView name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
          size={20} tintColor="#D2DBE6"/>
      </Pressable>
    </View>

    {error ? <View style={s.messageBox}>
      <Text style={s.errorText}>{error}</Text>
      <Pressable accessibilityRole="button" onPress={resumeScan} style={s.retry}>
        <Text style={s.retryText}>Try scanning again</Text>
      </Pressable>
    </View> : null}

    {found && <View style={s.foundCard}>
      <View style={s.foundBanner}>
        <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
          size={19} tintColor={C.green}/>
        <Text style={s.foundBannerText}>PRODUCT FOUND</Text>
      </View>
      <View style={s.foundBody}>
        <View style={s.productPhoto}>
          <SymbolView name={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }}
            size={24} tintColor={C.green}/>
        </View>
        <View style={s.foundDetails}>
          <Text style={s.foundName} numberOfLines={2}>{found.name}</Text>
          <Text style={s.sku} numberOfLines={1}>SKU: {found.sku || '—'}</Text>
          <Text style={s.foundPrice}>{naira(Number(found.price))}</Text>
          {available <= 5 && <Text style={s.stockAlert}>{available} left in stock</Text>}
        </View>
        <View style={s.qtyBox}>
          <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity"
            onPress={() => setSelectedQty(q => Math.max(1, q - 1))}
            disabled={added || selectedQty <= 1} style={[s.qtyButton, (added || selectedQty <= 1) && s.qtyDisabled]}>
            <Text style={s.qtySymbol}>−</Text>
          </Pressable>
          <Text style={s.qtyNumber}>{selectedQty}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity"
            onPress={() => setSelectedQty(q => Math.min(available, q + 1))}
            disabled={added || selectedQty >= available} style={[s.qtyButton, s.qtyPlus, (added || selectedQty >= available) && s.qtyDisabled]}>
            <Text style={s.qtyPlusSymbol}>+</Text>
          </Pressable>
        </View>
      </View>
      <Pressable accessibilityRole="button"
        accessibilityLabel={added ? 'Product added to sale' : 'Add selected product to sale'}
        disabled={!canAdd} onPress={addSelected}
        style={[s.addButton, !canAdd && s.addDisabled]}>
        <Text style={s.addButtonText}>
          {added ? 'Added to sale' : 'Add to sale — ' + naira(productTotal)}
        </Text>
      </Pressable>
    </View>}

    <View style={s.saleCard}>
      <View style={s.saleHeading}>
        <Text style={s.saleTitle}>Current sale</Text>
        <Text style={s.saleItemCount}>{store.count} {store.count === 1 ? 'item' : 'items'}</Text>
      </View>
      {cartLines.length ? cartLines.map(({ line, product }) => <View key={line.id} style={s.saleLine}>
        <Text style={s.saleProduct} numberOfLines={2}>{product.name} × {line.quantity}</Text>
        <Text style={s.lineAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {naira(toKobo(product.price) * line.quantity / 100)}
        </Text>
      </View>) : <Text style={s.emptyCart}>No items added yet. Scan a barcode to begin.</Text>}
      <View style={s.saleDivider}/>
      <View style={s.saleTotalRow}>
        <Text style={s.saleTotalLabel}>Sale total</Text>
        <Text style={s.saleTotalAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}
          accessibilityLabel={'Current sale total ' + naira(store.total)}>{naira(store.total)}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Proceed to payment"
        disabled={!store.count}
        onPress={() => router.push('/cashier/payment')}
        style={[s.proceedButton, !store.count && s.proceedDisabled]}>
        <Text style={s.proceedText}>Proceed to payment</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={processing} onPress={resumeScan} style={s.scanAnother}>
        <Text style={s.scanAnotherText}>Scan another item</Text>
      </Pressable>
    </View>

    <View style={s.manualSection}>
      <Text style={s.manualTitle}>Enter barcode or SKU manually</Text>
      <KField label="Product code" value={manual} onChangeText={setManual}
        placeholder="Enter product barcode or SKU"/>
      <KButton text={processing ? 'Searching…' : 'Find product'}
        disabled={!manual.trim() || processing || !!store.pendingSale}
        onPress={() => { void lookUp(manual); }}/>
    </View>
  </KScreen>;
}

const s = StyleSheet.create({
  header: { marginBottom: 18 },
  title: { color: C.title, fontWeight: '800', fontSize: 22 },
  backHome: { paddingVertical: 8, alignSelf: 'flex-start' },
  backText: { color: C.green, fontSize: 14, fontWeight: '800' },
  offlineNotice: { backgroundColor: C.mint, borderColor: C.mintBorder, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 13 },
  offlineNoticeTitle: { color: C.greenDark, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  offlineNoticeText: { color: C.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  cameraFrame: { marginHorizontal: -24, overflow: 'hidden', position: 'relative', backgroundColor: SCANNER_DARK },
  cameraShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,35,0.48)' },
  noCamera: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 25 },
  noCameraText: { color: '#DCE7ED', textAlign: 'center', fontSize: 14, marginTop: 12, maxWidth: 240 },
  allowCamera: { backgroundColor: C.green, borderRadius: 7, paddingHorizontal: 18, paddingVertical: 10, marginTop: 17 },
  allowText: { color: C.white, fontWeight: '800', fontSize: 14 },
  frameGuide: { position: 'absolute', left: 27, right: 27, top: 22, bottom: 22 },
  cornerTL: { position: 'absolute', left: 0, top: 0, width: 37, height: 37, borderLeftWidth: 3, borderTopWidth: 3, borderColor: SCANNER_MINT, borderTopLeftRadius: 9 },
  cornerTR: { position: 'absolute', right: 0, top: 0, width: 37, height: 37, borderRightWidth: 3, borderTopWidth: 3, borderColor: SCANNER_MINT, borderTopRightRadius: 9 },
  cornerBL: { position: 'absolute', left: 0, bottom: 0, width: 37, height: 37, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: SCANNER_MINT, borderBottomLeftRadius: 9 },
  cornerBR: { position: 'absolute', right: 0, bottom: 0, width: 37, height: 37, borderRightWidth: 3, borderBottomWidth: 3, borderColor: SCANNER_MINT, borderBottomRightRadius: 9 },
  guideCenter: { alignItems: 'center', justifyContent: 'center', position: 'absolute', top: '35%', width: '100%' },
  barcodeGuide: { height: 48, flexDirection: 'row', alignItems: 'center', opacity: 0.65 },
  laserLine: { height: 2, backgroundColor: SCANNER_MINT, width: '83%', marginTop: -21 },
  guideCaption: { alignItems: 'center', position: 'absolute', bottom: 4, width: '100%', gap: 4 },
  guideText: { color: '#EEF3F6', fontSize: 13, textAlign: 'center', fontWeight: '700' },
  guideSubtext: { color: '#ABB9C7', fontSize: 12, textAlign: 'center' },
  cameraActions: { backgroundColor: SCANNER_DARK, marginHorizontal: -24, paddingTop: 18, paddingBottom: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28 },
  roundAction: { height: 45, width: 45, borderRadius: 23, backgroundColor: '#252F43', justifyContent: 'center', alignItems: 'center' },
  roundActionActive: { backgroundColor: SCANNER_MINT },
  inactive: { opacity: 0.45 },
  scanningStatus: { alignItems: 'center', justifyContent: 'center', gap: 4, width: 90 },
  scanningStatusText: { fontSize: 11, color: '#BDC9D4' },
  messageBox: { borderRadius: 9, backgroundColor: '#FFF3ED', borderWidth: 1, borderColor: '#F8D1BF', padding: 12, marginTop: 14 },
  errorText: { color: C.danger, fontSize: 13, lineHeight: 19 },
  retry: { alignSelf: 'flex-start', marginTop: 9, paddingVertical: 5 },
  retryText: { color: C.green, fontWeight: '800', fontSize: 13 },
  foundCard: { marginTop: 18, borderWidth: 1.5, borderColor: C.green, borderRadius: 12, overflow: 'hidden', backgroundColor: C.white },
  foundBanner: { backgroundColor: '#DDF6EE', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 10, gap: 7 },
  foundBannerText: { fontSize: 12, color: C.greenDark, fontWeight: '800', letterSpacing: 0.3 },
  foundBody: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  productPhoto: { width: 52, height: 56, borderRadius: 9, backgroundColor: C.mint, borderWidth: 1, borderColor: C.mintBorder, alignItems: 'center', justifyContent: 'center' },
  foundDetails: { flex: 1, minWidth: 0 },
  foundName: { color: C.title, fontWeight: '800', fontSize: 14 },
  sku: { color: C.muted, fontSize: 11, marginTop: 4 },
  foundPrice: { color: C.green, fontSize: 17, fontWeight: '800', marginTop: 3 },
  stockAlert: { color: C.orange, backgroundColor: '#FFF0D7', alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, marginTop: 5 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  qtyButton: { backgroundColor: '#EDF1F2', minWidth: 29, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  qtyDisabled: { opacity: 0.45 },
  qtySymbol: { fontSize: 20, fontWeight: '700', color: C.green },
  qtyNumber: { minWidth: 18, textAlign: 'center', fontWeight: '800', color: C.title, fontSize: 14 },
  qtyPlus: { backgroundColor: C.green },
  qtyPlusSymbol: { fontSize: 19, fontWeight: '800', color: C.white },
  addButton: { backgroundColor: C.green, marginHorizontal: 13, marginBottom: 13, borderRadius: 7, paddingVertical: 13, paddingHorizontal: 12, alignItems: 'center' },
  addDisabled: { opacity: 0.6 },
  addButtonText: { fontSize: 14, fontWeight: '800', color: C.white },
  saleCard: { marginTop: 19, padding: 16, backgroundColor: C.white, borderColor: C.border, borderWidth: 1, borderRadius: 12 },
  saleHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 },
  saleTitle: { fontWeight: '800', color: C.title, fontSize: 17 },
  saleItemCount: { fontWeight: '800', color: C.green, fontSize: 13 },
  saleLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 7 },
  saleProduct: { color: C.text, fontSize: 13, flex: 1, minWidth: 0 },
  lineAmount: { color: C.title, fontSize: 13, fontWeight: '800', maxWidth: '48%', textAlign: 'right', flexShrink: 1 },
  emptyCart: { color: C.muted, fontSize: 13, marginBottom: 6 },
  saleDivider: { borderTopWidth: 1, borderColor: C.border, marginTop: 10, marginBottom: 10 },
  saleTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 13 },
  saleTotalLabel: { color: C.title, fontSize: 14, fontWeight: '800' },
  saleTotalAmount: { color: C.green, fontSize: 21, fontWeight: '800', maxWidth: '69%', textAlign: 'right', flexShrink: 1 },
  proceedButton: { borderRadius: 8, backgroundColor: C.green, paddingVertical: 14, alignItems: 'center' },
  proceedDisabled: { opacity: 0.4 },
  proceedText: { fontSize: 14, fontWeight: '800', color: C.white },
  scanAnother: { alignSelf: 'center', paddingVertical: 13 },
  scanAnotherText: { color: C.green, fontSize: 13, fontWeight: '800' },
  manualSection: { marginTop: 8, marginBottom: 16 },
  manualTitle: { fontSize: 16, fontWeight: '800', color: C.title, marginBottom: 14 },
});
