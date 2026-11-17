import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Print from 'expo-print';
import qrcode from 'qrcode-generator';
import { useKassaSession } from '@/components/kassa-demo/api';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { getOfflineSales, type OfflineCashRecord } from '@/components/kassa-demo/offline-cash';
import { C, naira, toKobo } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';

const date = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos',
});

function makeQr(record: OfflineCashRecord): string {
  const qr = qrcode(0, 'M');
  qr.addData([
    'KASSA LOCAL CASH RECORD',
    'REF:' + record.id,
    'NGN:' + record.total,
    'SYNC:' + record.status,
  ].join('\n'));
  qr.make();
  return qr.createDataURL(5, 5);
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, char => entities[char] ?? char);
}

export default function OfflineReceipt() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useKassaSession();
  const store = useKassaDemo();
  const [record, setRecord] = useState<OfflineCashRecord | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!id || !session.scope || !session.user) {
      setError('Sign in with the original cashier account to view this local cash record.');
      return;
    }
    try {
      const rows = await getOfflineSales({
        userId: session.user.id,
        businessId: session.scope.businessId,
        branchId: session.scope.branchId,
      });
      const found = rows.find(row => row.id === id);
      if (!found) throw new Error('Local cash record not found on this phone.');
      setRecord(found);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load local receipt.');
    }
  }, [id, session.user?.id, session.scope?.businessId, session.scope?.branchId]);

  useEffect(() => { void reload(); }, [reload]);
  const qr = useMemo(() => record ? makeQr(record) : null, [record]);
  const change = record
    ? (toKobo(Number(record.cashReceived)) - toKobo(Number(record.total))) / 100 : 0;

  const receiptText = record ? [
    'KASSA — LOCAL CASH RECORD (NOT A CLOUD RECEIPT)',
    'Reference: ' + record.id,
    'Business: ' + (session.scope?.businessName ?? 'KASSA'),
    'Branch: ' + (session.scope?.branchName ?? 'Branch'),
    'Collected: ' + date.format(new Date(record.recordedAt)),
    ...record.items.map(item => item.name + '  ' + item.quantity + ' x ' +
      naira(Number(item.unitPrice))),
    'Total: ' + naira(Number(record.total)),
    'Cash collected: ' + naira(Number(record.cashReceived)),
    'Change: ' + naira(change),
    'Sync status: ' + record.status,
    'Verify this transaction with the merchant after synchronization.',
  ].join('\n') : '';

  const print = async () => {
    if (!record || !qr || busy) return;
    setBusy(true);
    setError('');
    try {
      const rows = record.items.map(item =>
        '<tr><td>' + escapeHtml(item.name) + ' (' + item.quantity + ' x ' +
          naira(Number(item.unitPrice)) + ')</td><td>' +
          naira(toKobo(Number(item.unitPrice)) * item.quantity / 100) + '</td></tr>'
      ).join('');
      const html = '<!doctype html><html><head><meta charset="utf-8">' +
        '<style>body{font-family:Arial,sans-serif;max-width:390px;margin:20px auto;color:#172923}' +
        'h2,p{text-align:center}table{width:100%;border-collapse:collapse}' +
        'td{padding:8px 0;border-bottom:1px dashed #ddd}td:last-child{text-align:right}' +
        '.qr{text-align:center;margin-top:20px}.qr img{width:170px;height:170px}' +
        '.notice{color:#995918;font-weight:bold;text-align:center;font-size:12px}' +
        '</style></head><body><h2>' + escapeHtml(session.scope?.businessName ?? 'KASSA') +
        '</h2><p>' + escapeHtml(session.scope?.branchName ?? '') + '</p>' +
        '<p class="notice">LOCAL CASH RECORD — ' + escapeHtml(record.status) + '</p>' +
        '<p>Ref: ' + escapeHtml(record.id) + '</p>' +
        '<p>' + escapeHtml(date.format(new Date(record.recordedAt))) + '</p>' +
        '<table>' + rows +
        '<tr><td><strong>Total</strong></td><td><strong>' + naira(Number(record.total)) + '</strong></td></tr>' +
        '<tr><td>Cash collected</td><td>' + naira(Number(record.cashReceived)) + '</td></tr>' +
        '<tr><td>Change</td><td>' + naira(change) + '</td></tr></table>' +
        '<div class="qr"><img alt="Local receipt QR" src="' + qr + '"/></div>' +
        '<p class="notice">Stored on device. Not an independently verified payment receipt.</p>' +
        '</body></html>';
      await Print.printAsync({ html });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not print the local record.');
    } finally { setBusy(false); }
  };

  return <KScreen title="Local cash receipt" subtitle="Saved on this phone"
    showBrand={false} showPreviewLabel={false} back>
    {error ? <View style={s.notice}><Text style={s.error}>{error}</Text>
      <Pressable onPress={() => { void reload(); }}><Text style={s.link}>Retry</Text></Pressable>
    </View> : null}
    {record ? <View style={s.paper}>
      <Text style={s.merchant}>{session.scope?.businessName ?? 'KASSA'}</Text>
      <Text style={s.muted}>{session.scope?.branchName ?? 'Branch'}</Text>
      <View style={s.statusBadge}>
        <Text style={s.statusText}>{record.status === 'SYNCED' ? 'SYNCED TO KASSA'
          : record.status === 'REVIEW' ? 'NEEDS OWNER REVIEW' : 'AWAITING SYNC'}</Text>
      </View>
      <Text style={s.muted}>LOCAL REF #{record.id.slice(0, 8).toUpperCase()}</Text>
      <Text style={s.muted}>{date.format(new Date(record.recordedAt))}</Text>
      <View style={s.line}/>
      {record.items.map((item, i) => <View key={item.productId + i} style={s.itemRow}>
        <Text style={s.itemName}>{item.name} × {item.quantity}</Text>
        <Text style={s.itemAmount}>{naira(toKobo(Number(item.unitPrice)) * item.quantity / 100)}</Text>
      </View>)}
      <View style={s.line}/>
      <View style={s.row}><Text style={s.label}>Total</Text><Text style={s.amount}>{naira(Number(record.total))}</Text></View>
      <View style={s.row}><Text style={s.label}>Cash received</Text><Text style={s.value}>{naira(Number(record.cashReceived))}</Text></View>
      <View style={s.row}><Text style={s.label}>Change</Text><Text style={s.value}>{naira(change)}</Text></View>
      {qr && <Image source={{ uri: qr }} accessibilityLabel="Local cash transaction QR code" style={s.qr} contentFit="contain"/>}
      <Text style={s.footer}>Scan for local transaction details. This does not independently verify payment with KASSA.</Text>
      <Text style={s.footer}>Thank you for shopping with us!</Text>
    </View> : null}
    {record && <View style={s.buttons}>
      <Pressable disabled={busy} onPress={() => { void print(); }} style={s.primary}>
        <Text style={s.primaryText}>{busy ? 'Working…' : 'Print local receipt'}</Text>
      </Pressable>
      <Pressable onPress={() => { void Share.share({ message: receiptText }); }} style={s.secondary}>
        <Text style={s.secondaryText}>Share</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/cashier/offline-sales')} style={s.secondary}>
        <Text style={s.secondaryText}>View sync queue</Text>
      </Pressable>
      <Pressable onPress={() => {
        store.beginNewSale();
        router.replace('/cashier/new-sale');
      }} style={s.secondary}>
        <Text style={s.secondaryText}>New sale</Text>
      </Pressable>
    </View>}
  </KScreen>;
}

const s = StyleSheet.create({
  paper: { backgroundColor: C.white, borderColor: C.border, borderWidth: 1, borderRadius: 11, padding: 17, alignItems: 'stretch' },
  merchant: { color: C.greenDark, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  muted: { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 6 },
  statusBadge: { backgroundColor: '#FFF1D9', borderRadius: 8, alignItems: 'center', padding: 10, marginTop: 17, marginBottom: 10 },
  statusText: { color: C.orange, fontSize: 13, fontWeight: '800' },
  line: { borderTopWidth: 1, borderColor: C.border, marginVertical: 17, borderStyle: 'dashed' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8 },
  itemName: { flex: 1, color: C.title, fontSize: 14 },
  itemAmount: { color: C.title, fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 15 },
  label: { color: C.muted, fontSize: 14 },
  value: { color: C.title, fontWeight: '700', fontSize: 14 },
  amount: { color: C.green, fontWeight: '800', fontSize: 21 },
  qr: { width: 176, height: 176, alignSelf: 'center', marginTop: 18 },
  footer: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18 },
  primary: { backgroundColor: C.green, padding: 14, borderRadius: 9, minWidth: '100%', alignItems: 'center' },
  primaryText: { color: C.white, fontWeight: '800', fontSize: 14 },
  secondary: { borderColor: C.green, borderWidth: 1, padding: 13, borderRadius: 9, flexGrow: 1, alignItems: 'center' },
  secondaryText: { color: C.green, fontWeight: '700', fontSize: 14 },
  notice: { padding: 12, backgroundColor: C.white, borderColor: C.border, borderWidth: 1, borderRadius: 9 },
  error: { color: C.danger, fontSize: 14, marginBottom: 10 },
  link: { color: C.green, fontWeight: '800', fontSize: 14 },
});
