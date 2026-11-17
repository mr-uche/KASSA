import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SymbolView } from 'expo-symbols';
import { useKassaSession, type CatalogItem } from '@/components/kassa-demo/api';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen, KButton, KField } from '@/components/kassa-demo/ui';

export default function ScanProduct() {
  const router = useRouter();
  const session = useKassaSession();
  const store = useKassaDemo();
  const scope = session.scope;
  const [permission, askPermission] = useCameraPermissions();
  const [active, setActive] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [found, setFound] = useState<CatalogItem | null>(null);
  const [torch, setTorch] = useState(false);
  const inFlight = useRef(false);

  useFocusEffect(useCallback(() => {
    setActive(true);
    return () => { setActive(false); };
  }, []));

  const lookUp = useCallback(async (barcode: string) => {
    const code = barcode.trim();
    if (!scope || !session.user) {
      setError('Sign in and select your branch before scanning.');
      return;
    }
    if (store.pendingSale) {
      setError('A payment is pending. Finish it before adding more products.');
      return;
    }
    if (!code || code.length > 100 || inFlight.current) return;
    inFlight.current = true;
    setActive(false);
    setProcessing(true);
    setFound(null);
    setError('');
    try {
      const product = await session.request<CatalogItem>(
        'sales/lookup?businessId=' + encodeURIComponent(scope.businessId) +
        '&branchId=' + encodeURIComponent(scope.branchId) +
        '&code=' + encodeURIComponent(code)
      );
      const cached = store.catalog.find(item => item.id === product.id);
      if (product.stock < 1) {
        setError(product.name + ' is out of stock in this branch.');
      } else if (!cached) {
        await store.refreshCatalog();
        setError('The product was found. Your catalogue was refreshed; scan again to add it.');
      } else {
        const alreadySelected = store.lines.find(line => line.id === product.id)?.quantity ?? 0;
        if (alreadySelected >= product.stock) {
          setError('You already selected all available stock for ' + product.name + '.');
        } else {
          store.add(product.id);
          setFound(product);
          setManual('');
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Barcode lookup failed.');
    } finally {
      setProcessing(false);
      inFlight.current = false;
    }
  }, [scope?.businessId, scope?.branchId, session.user?.id, session.request,
      store.pendingSale, store.catalog, store.lines, store.add, store.refreshCatalog]);

  return <KScreen title="Scan product" subtitle="Scan a product barcode to add it to the current sale."
    showBrand={false} showPreviewLabel={false} back>
    <View style={s.frame}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          active={active && !processing && !found}
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'qr', 'datamatrix'] }}
          onBarcodeScanned={active && !processing && !found ? ({ data }) => { void lookUp(data); } : undefined}
          onMountError={() => setError('Camera unavailable. Use the manual barcode field instead.')}
        />
      ) : (
        <View style={s.emptyCamera}>
          <SymbolView name={{ ios: 'barcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' }}
            size={65} tintColor={C.green}/>
          <Text style={s.cameraMessage}>
            {permission === null ? 'Checking camera permission…' : 'Allow camera access to scan product barcodes.'}
          </Text>
          {!!permission && !permission.granted && (
            <Pressable onPress={() => { void askPermission(); }} style={s.allow}>
              <Text style={s.allowText}>Allow camera</Text>
            </Pressable>
          )}
        </View>
      )}
      <View pointerEvents="none" style={s.frameGuide}>
        <View style={s.cornerTL}/><View style={s.cornerTR}/>
        <View style={s.cornerBL}/><View style={s.cornerBR}/>
      </View>
      {processing && <View style={s.overlay}><Text style={s.overlayText}>Looking up product…</Text></View>}
    </View>

    {permission?.granted && !found && (
      <Pressable onPress={() => setTorch(value => !value)} style={s.torch}>
        <SymbolView name={{ ios: 'flashlight.on.fill', android: 'flashlight_on', web: 'flashlight_on' }}
          size={20} tintColor={C.green}/>
        <Text style={s.torchText}>{torch ? 'Torch off' : 'Torch on'}</Text>
      </Pressable>
    )}

    <Text style={s.manualTitle}>Enter barcode or SKU manually</Text>
    <KField label="Product code" value={manual} onChangeText={setManual}
      placeholder="Scan or enter a barcode" />
    <KButton text={processing ? 'Searching…' : 'Find and add product'}
      disabled={!manual.trim() || processing || !!store.pendingSale}
      onPress={() => { void lookUp(manual); }}/>

    {error ? <View style={s.messageBox}>
      <Text style={s.error}>{error}</Text>
      <Pressable onPress={() => { setError(''); setFound(null); setActive(true); }} style={s.retry}>
        <Text style={s.retryText}>Try again</Text>
      </Pressable>
    </View> : null}

    {found && <View style={s.foundCard}>
      <View style={s.foundTop}>
        <View style={s.check}>
          <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={22} tintColor={C.white}/>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.foundName}>{found.name}</Text>
          <Text style={s.foundMeta}>{naira(Number(found.price))} · In stock: {found.stock}</Text>
          <Text style={s.added}>Added to current sale</Text>
        </View>
      </View>
      <View style={s.row}>
        <Pressable style={s.secondary} onPress={() => { setFound(null); setError(''); setActive(true); }}>
          <Text style={s.secondaryText}>Scan another</Text>
        </Pressable>
        <Pressable style={s.primary} onPress={() => router.push('/cashier/new-sale')}>
          <Text style={s.primaryText}>View sale</Text>
        </Pressable>
      </View>
    </View>}
  </KScreen>;
}

const s = StyleSheet.create({
  frame: { height: 295, borderRadius: 14, overflow: 'hidden', position: 'relative', backgroundColor: '#DDECE5' },
  emptyCamera: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  cameraMessage: { color: C.greenDark, textAlign: 'center', fontSize: 14, marginTop: 13 },
  allow: { backgroundColor: C.green, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 11, marginTop: 18 },
  allowText: { color: C.white, fontSize: 14, fontWeight: '800' },
  frameGuide: { position: 'absolute', left: 18, right: 18, top: 25, bottom: 25 },
  cornerTL: { position: 'absolute', left: 0, top: 0, width: 36, height: 36, borderLeftWidth: 5, borderTopWidth: 5, borderColor: C.green },
  cornerTR: { position: 'absolute', right: 0, top: 0, width: 36, height: 36, borderRightWidth: 5, borderTopWidth: 5, borderColor: C.green },
  cornerBL: { position: 'absolute', left: 0, bottom: 0, width: 36, height: 36, borderLeftWidth: 5, borderBottomWidth: 5, borderColor: C.green },
  cornerBR: { position: 'absolute', right: 0, bottom: 0, width: 36, height: 36, borderRightWidth: 5, borderBottomWidth: 5, borderColor: C.green },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  overlayText: { color: C.white, fontWeight: '800', fontSize: 16 },
  torch: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  torchText: { color: C.green, fontWeight: '800', fontSize: 14 },
  manualTitle: { fontSize: 20, fontWeight: '800', color: C.title, marginTop: 12, marginBottom: 13 },
  messageBox: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 10, marginTop: 16, padding: 13 },
  error: { color: C.danger, fontSize: 14, lineHeight: 21 },
  retry: { marginTop: 11, paddingVertical: 8 },
  retryText: { color: C.green, fontSize: 14, fontWeight: '800' },
  foundCard: { marginTop: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.green, borderRadius: 12, padding: 16 },
  foundTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { backgroundColor: C.green, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  foundName: { color: C.title, fontWeight: '800', fontSize: 17 },
  foundMeta: { color: C.muted, fontSize: 14, marginTop: 4 },
  added: { color: C.green, fontSize: 14, marginTop: 5, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 9, marginTop: 18 },
  secondary: { flex: 1, borderWidth: 1, borderColor: C.green, borderRadius: 8, padding: 12, alignItems: 'center' },
  secondaryText: { color: C.green, fontWeight: '800', fontSize: 14 },
  primary: { flex: 1, backgroundColor: C.green, borderRadius: 8, padding: 12, alignItems: 'center' },
  primaryText: { color: C.white, fontWeight: '800', fontSize: 14 },
});
