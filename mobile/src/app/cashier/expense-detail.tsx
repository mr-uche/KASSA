import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import { SymbolView } from 'expo-symbols';
import { useKassaSession } from '@/components/kassa-demo/api';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import {
  expenseError, expenseReceiptPath, formattedDate, type Expense, type ExpenseList,
} from '@/components/kassa-demo/expenses-data';

const icon = (name: React.ComponentProps<typeof SymbolView>['name'], size = 19, color: string = C.green) =>
  <SymbolView name={name} size={size} tintColor={color}/>;

export default function ExpenseDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useKassaSession();
  const scope = session.scope;
  const owner = scope?.myRole === 'Owner';
  const [expense, setExpense] = useState<Expense | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    if (!scope || !owner || !id) return;
    if (isActive()) { setLoading(true); setError(''); setImageUri(null); }
    try {
      const result = await session.request<ExpenseList>(
        'expenses?businessId=' + encodeURIComponent(scope.businessId),
      );
      const found = result.items.find(item => item.id === id);
      if (!found) throw new Error('Expense not found among the latest recorded entries.');
      if (isActive()) setExpense(found);
      if (found.hasReceipt && found.receiptMime?.startsWith('image/')) {
        try {
          const bytes = await session.downloadReceipt(expenseReceiptPath(scope.businessId, found.id));
          const ext = found.receiptMime === 'image/png' ? 'png'
            : found.receiptMime === 'image/webp' ? 'webp' : 'jpg';
          const local = new File(Paths.cache, 'kassa-expense-' + found.id + '.' + ext);
          await local.write(bytes);
          if (isActive()) setImageUri(local.uri);
        } catch {
          // The record must remain readable even when its attachment cannot load.
        }
      }
    } catch (cause) {
      if (isActive()) setError(expenseError(cause, 'Unable to load the expense.'));
    } finally { if (isActive()) setLoading(false); }
  }, [scope, owner, id, session]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void load(() => active);
    return () => { active = false; };
  }, [load]));

  async function openReceipt() {
    if (!scope || !owner || !expense || busy || !expense.hasReceipt) return;
    setBusy(true);
    setError('');
    try {
      const bytes = await session.downloadReceipt(expenseReceiptPath(scope.businessId, expense.id));
      const ext = expense.receiptMime === 'application/pdf' ? 'pdf'
        : expense.receiptMime === 'image/png' ? 'png'
          : expense.receiptMime === 'image/webp' ? 'webp' : 'jpg';
      const local = new File(Paths.cache, 'kassa-expense-' + expense.id + '.' + ext);
      await local.write(bytes);
      await local.preview({ title: expense.receiptName || 'Expense receipt' });
    } catch (cause) {
      setError(expenseError(cause, 'Could not open the receipt on this device.'));
    } finally { setBusy(false); }
  }

  async function attachReceipt() {
    if (!scope || !owner || !expense || busy) return;
    setError('');
    try {
      const selected = await File.pickFileAsync({
        mimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
      });
      if (selected.canceled) return;
      const file = selected.result;
      if (file.size == null || file.size < 1 || file.size > 2 * 1024 * 1024) {
        setError('Select a receipt of no more than 2 MB.');
        return;
      }
      setBusy(true);
      await session.uploadReceipt(expenseReceiptPath(scope.businessId, expense.id), file);
      await load();
    } catch (cause) {
      setError(expenseError(cause, 'Receipt upload failed.'));
    } finally { setBusy(false); }
  }

  if (!owner) return <KScreen back showBrand={false} showPreviewLabel={false}>
    <Text style={s.error}>Only business owners can view expense details.</Text>
  </KScreen>;

  const parts = expense?.description.split('\n\n') ?? [];
  const title = parts[0] ?? '';
  const notes = parts.slice(1).join('\n\n');
  return <KScreen showBrand={false} showPreviewLabel={false}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Expenses"
        style={s.back} onPress={() => router.back()}>
        {icon({ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }, 20, C.title)}
      </Pressable>
      <Text style={s.heading}>Expense Details</Text>
    </View>

    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {loading && !expense && <Text style={s.hint}>Loading expense…</Text>}
    {expense && <>
      <View style={s.summaryCard}>
        <View style={s.summaryIcon}>{icon({ ios: 'creditcard', android: 'payments', web: 'payments' }, 24)}</View>
        <View style={s.summaryText}>
          <Text style={s.title} numberOfLines={2}>{title}</Text>
          <Text style={s.caption}>{expense.category}</Text>
        </View>
        <Text style={s.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {naira(Number(expense.amount))}
        </Text>
      </View>

      <View style={s.details}>
        <View style={s.detailRow}>
          {icon({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' })}
          <View style={s.detailText}>
            <Text style={s.detailLabel}>Date</Text>
            <Text style={s.detailValue}>{formattedDate(expense.spentAt)}</Text>
          </View>
        </View>
        <View style={s.detailRow}>
          {icon({ ios: 'building.2', android: 'store', web: 'store' })}
          <View style={s.detailText}>
            <Text style={s.detailLabel}>Branch</Text>
            <Text style={s.detailValue}>{expense.branchName}</Text>
          </View>
        </View>
        <View style={s.detailRow}>
          {icon({ ios: 'text.bubble', android: 'notes', web: 'notes' })}
          <View style={s.detailText}>
            <Text style={s.detailLabel}>Notes</Text>
            <Text style={s.detailValue}>{notes || 'No additional notes'}</Text>
          </View>
        </View>
      </View>

      <Text style={s.section}>Receipt</Text>
      {expense.hasReceipt ? <View style={s.receiptCard}>
        {imageUri ? <Image accessibilityLabel="Attached expense receipt" source={{ uri: imageUri }}
          resizeMode="contain" style={s.receiptImage}/> :
          <View style={s.receiptPlaceholder}>
            {icon({ ios: 'doc', android: 'description', web: 'description' }, 45)}
            <Text style={s.hint}>{expense.receiptName || 'Attached receipt'}</Text>
          </View>}
        <Text numberOfLines={1} style={s.receiptName}>{expense.receiptName || 'Receipt'}</Text>
        <Pressable accessibilityRole="button" style={s.receiptAction} disabled={busy}
          onPress={() => { void openReceipt(); }}>
          {icon({ ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' }, 18)}
          <Text style={s.receiptActionText}>{busy ? 'Opening…' : 'Open full receipt'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void attachReceipt(); }}>
          <Text style={s.secondaryAction}>Replace receipt</Text>
        </Pressable>
      </View> : <Pressable accessibilityRole="button" style={s.emptyReceipt}
        disabled={busy} onPress={() => { void attachReceipt(); }}>
        {icon({ ios: 'arrow.up.doc', android: 'upload_file', web: 'upload_file' }, 28)}
        <Text style={s.receiptActionText}>{busy ? 'Uploading…' : 'Attach a receipt'}</Text>
        <Text style={s.hint}>PDF, JPG, PNG or WebP · Maximum 2 MB</Text>
      </Pressable>}
    </>}
  </KScreen>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 25 },
  back: { width: 27, height: 35, justifyContent: 'center' },
  heading: { fontSize: 26, fontWeight: '800', color: C.title },
  summaryCard: { backgroundColor: C.white, borderColor: C.border, borderWidth: 1,
    borderRadius: 13, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIcon: { backgroundColor: C.mint, height: 43, width: 43,
    borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  summaryText: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, color: C.title, fontWeight: '800' },
  caption: { color: C.muted, fontSize: 13, marginTop: 4 },
  amount: { maxWidth: '38%', color: C.green, fontWeight: '800', fontSize: 16 },
  details: { marginTop: 18, marginBottom: 26, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13,
    paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: C.border },
  detailText: { flex: 1 },
  detailLabel: { fontWeight: '800', color: C.title, fontSize: 14 },
  detailValue: { fontSize: 14, color: C.text, marginTop: 6, lineHeight: 20 },
  section: { fontWeight: '800', fontSize: 20, color: C.title, marginBottom: 12 },
  receiptCard: { borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
    borderRadius: 12, padding: 13, alignItems: 'center', marginBottom: 20 },
  receiptImage: { width: '100%', height: 295, backgroundColor: C.background, borderRadius: 7 },
  receiptPlaceholder: { width: '100%', height: 190, backgroundColor: C.mint,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 12 },
  receiptName: { fontSize: 13, color: C.muted, marginTop: 12 },
  receiptAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, borderWidth: 1, borderColor: C.green, borderRadius: 9,
    padding: 12, marginTop: 12, width: '100%' },
  receiptActionText: { color: C.green, fontSize: 14, fontWeight: '800' },
  secondaryAction: { fontSize: 13, color: C.muted, fontWeight: '700', paddingVertical: 13 },
  emptyReceipt: { backgroundColor: C.mint, borderColor: C.mintBorder, borderWidth: 1,
    borderStyle: 'dashed', borderRadius: 11, padding: 24,
    alignItems: 'center', justifyContent: 'center', gap: 8 },
  hint: { color: C.muted, fontSize: 13 },
  error: { color: C.danger, fontSize: 14, marginBottom: 15 },
});
