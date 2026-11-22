import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { File } from 'expo-file-system';
import { SymbolView } from 'expo-symbols';
import { useKassaSession } from '@/components/kassa-demo/api';
import { C } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import {
  expenseCategories, expenseError, expenseReceiptPath, localDate, type ExpenseCategory,
} from '@/components/kassa-demo/expenses-data';

const icon = (name: React.ComponentProps<typeof SymbolView>['name'], size = 18, color: string = C.green) =>
  <SymbolView name={name} size={size} tintColor={color}/>;

export default function AddExpense() {
  const router = useRouter();
  const session = useKassaSession();
  const scope = session.scope;
  const owner = scope?.myRole === 'Owner';
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Utilities');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [spentAt, setSpentAt] = useState(localDate());
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function pickReceipt() {
    setError('');
    try {
      const selected = await File.pickFileAsync({
        mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      });
      if (selected.canceled) return;
      const chosen = selected.result;
      if (chosen.size == null || chosen.size < 1 || chosen.size > 2 * 1024 * 1024) {
        setError('Select a PDF or image under 2 MB.');
        return;
      }
      setReceipt(chosen);
    } catch (cause) {
      setError(expenseError(cause, 'Could not select the receipt.'));
    }
  }

  async function save() {
    if (!scope || !owner || saving) return;
    setError('');
    const amountText = amount.trim().replace(/,/g, '');
    const value = Number(amountText);
    if (!/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(amountText) ||
        !Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount greater than zero, with up to two decimal places.');
      return;
    }
    if (!title.trim()) {
      setError('Enter an expense title.');
      return;
    }
    const description = title.trim() + (notes.trim() ? '\n\n' + notes.trim() : '');
    if (description.length > 500) {
      setError('Keep the expense title and notes within 500 characters.');
      return;
    }
    const date = new Date(spentAt + 'T00:00:00.000Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentAt) || Number.isNaN(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== spentAt) {
      setError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }
    setSaving(true);
    try {
      const result = await session.request<{ id: string }>('expenses', {
        businessId: scope.businessId,
        branchId: scope.branchId,
        category,
        amount: value.toFixed(2),
        description,
        spentAt,
      }, 'POST');
      let uploadError = '';
      if (receipt) {
        try {
          await session.uploadReceipt(expenseReceiptPath(scope.businessId, result.id), receipt);
        } catch (cause) {
          uploadError = expenseError(cause, 'Receipt upload failed.');
        }
      }
      if (uploadError) {
        Alert.alert('Expense saved', 'The expense was recorded, but its receipt was not attached. ' +
          uploadError + '\n\nOpen the saved expense to attach the receipt again.');
      }
      router.replace('/cashier/expenses');
    } catch (cause) {
      setError(expenseError(cause, 'Unable to save this expense.'));
    } finally {
      setSaving(false);
    }
  }

  if (!owner) return <KScreen back showBrand={false} showPreviewLabel={false}>
    <Text style={s.error}>Only business owners can record expenses.</Text>
  </KScreen>;

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Expenses"
        onPress={() => router.back()} style={s.back}>
        {icon({ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }, 20, C.title)}
      </Pressable>
      <Text style={s.heading}>Add Expenses</Text>
    </View>
    <Text style={s.subtitle}>Record operating costs for {scope?.branchName}.</Text>

    <Text style={s.label}>Expense Title <Text style={s.required}>*</Text></Text>
    <TextInput style={s.field} value={title} onChangeText={setTitle}
      maxLength={180} placeholder="e.g. Electricity bill" placeholderTextColor={C.faint}/>

    <Text style={s.label}>Category <Text style={s.required}>*</Text></Text>
    <Pressable accessibilityRole="button" onPress={() => setCategoryOpen(value => !value)}
      style={s.dropdown} accessibilityLabel={'Expense category: ' + category}>
      <View style={s.selectedIcon}>
        {icon({ ios: 'creditcard', android: 'payments', web: 'payments' }, 18)}
      </View>
      <Text style={s.dropdownValue}>{category}</Text>
      {icon({ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }, 17, C.muted)}
    </Pressable>
    {categoryOpen && <View style={s.options}>
      {expenseCategories.map(item =>
        <Pressable accessibilityRole="button" key={item}
          onPress={() => { setCategory(item); setCategoryOpen(false); }}
          style={s.option}>
          <Text style={[s.optionText, item === category && { color: C.green, fontWeight: '800' }]}>{item}</Text>
          {item === category && icon({ ios: 'checkmark', android: 'check', web: 'check' }, 16)}
        </Pressable>)}
    </View>}

    <Text style={s.label}>Amount <Text style={s.required}>*</Text></Text>
    <View style={s.amountWrap}>
      <View style={s.currency}><Text style={s.currencyText}>₦</Text></View>
      <TextInput style={s.amountInput} keyboardType="decimal-pad" value={amount}
        onChangeText={setAmount} placeholder="0.00" placeholderTextColor={C.faint}/>
    </View>

    <Text style={s.label}>Date <Text style={s.required}>*</Text></Text>
    <View style={s.dateWrap}>
      {icon({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' })}
      <TextInput style={s.dateInput} value={spentAt} onChangeText={setSpentAt}
        placeholder="YYYY-MM-DD" placeholderTextColor={C.faint} autoCapitalize="none"/>
    </View>
    <Text style={s.help}>Format: YYYY-MM-DD</Text>

    <Text style={s.label}>Notes (Optional)</Text>
    <TextInput style={[s.field, s.notes]} value={notes} onChangeText={setNotes}
      maxLength={320} multiline textAlignVertical="top"
      placeholder="Add details about this expense…" placeholderTextColor={C.faint}/>
    <Text style={s.counter}>{notes.length} / 320</Text>

    <Text style={s.label}>Receipt (Optional)</Text>
    {receipt && <View style={s.attached}>
      {icon({ ios: 'doc', android: 'description', web: 'description' }, 23)}
      <View style={{ flex: 1 }}>
        <Text style={s.fileName} numberOfLines={1}>{receipt.name}</Text>
        <Text style={s.help}>{receipt.size == null ? '' : (receipt.size / 1024 / 1024).toFixed(2) + ' MB'}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Remove selected receipt"
        onPress={() => setReceipt(null)}>
        {icon({ ios: 'xmark', android: 'close', web: 'close' }, 19, C.muted)}
      </Pressable>
    </View>}
    <Pressable accessibilityRole="button" onPress={() => { void pickReceipt(); }} style={s.upload}>
      {icon({ ios: 'arrow.up.doc', android: 'upload_file', web: 'upload_file' }, 22)}
      <Text style={s.uploadTitle}>{receipt ? 'Change receipt' : 'Upload Receipt'}</Text>
      <Text style={s.uploadHint}>JPG, PNG, WebP or PDF · Max 2 MB</Text>
    </Pressable>

    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}

    <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(); }}
      style={[s.save, saving && { opacity: 0.5 }]}>
      <Text style={s.saveText}>{saving ? 'Saving expense…' : 'Save Expense'}</Text>
    </Pressable>
  </KScreen>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  back: { width: 27, height: 35, alignItems: 'flex-start', justifyContent: 'center' },
  heading: { fontSize: 26, fontWeight: '800', color: C.title },
  subtitle: { color: C.muted, fontSize: 14, marginBottom: 12 },
  label: { color: C.title, fontSize: 14, fontWeight: '800', marginTop: 17, marginBottom: 8 },
  required: { color: C.danger },
  field: { borderRadius: 10, borderColor: C.border, borderWidth: 1, backgroundColor: C.white,
    minHeight: 48, paddingHorizontal: 13, fontSize: 14, color: C.title },
  dropdown: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderColor: C.border,
    borderWidth: 1, minHeight: 49, paddingHorizontal: 11, gap: 10, backgroundColor: C.white },
  selectedIcon: { width: 31, height: 31, borderRadius: 16, backgroundColor: C.mint,
    alignItems: 'center', justifyContent: 'center' },
  dropdownValue: { fontSize: 14, color: C.title, flex: 1, fontWeight: '700' },
  options: { borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
    borderRadius: 10, marginTop: 4, padding: 6 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  optionText: { fontSize: 14, color: C.text },
  amountWrap: { flexDirection: 'row', minHeight: 48, backgroundColor: C.white,
    borderRadius: 10, borderColor: C.border, borderWidth: 1, overflow: 'hidden' },
  currency: { minWidth: 50, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  currencyText: { color: C.green, fontSize: 18, fontWeight: '800' },
  amountInput: { flex: 1, paddingHorizontal: 13, fontSize: 14, color: C.title },
  dateWrap: { minHeight: 48, borderColor: C.border, borderWidth: 1, borderRadius: 10,
    backgroundColor: C.white, flexDirection: 'row', gap: 9, alignItems: 'center', paddingHorizontal: 13 },
  dateInput: { flex: 1, height: 46, fontSize: 14, color: C.title },
  help: { fontSize: 12, color: C.muted, marginTop: 5 },
  notes: { minHeight: 102, paddingTop: 12, paddingBottom: 12 },
  counter: { color: C.faint, fontSize: 12, alignSelf: 'flex-end', marginTop: 5 },
  attached: { flexDirection: 'row', backgroundColor: C.white, borderColor: C.border,
    borderWidth: 1, borderRadius: 10, padding: 11, alignItems: 'center', gap: 10, marginBottom: 9 },
  fileName: { fontSize: 14, color: C.title, fontWeight: '700' },
  upload: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#8AC7B0', borderRadius: 10,
    backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', padding: 19, gap: 3 },
  uploadTitle: { color: C.green, fontWeight: '800', fontSize: 14 },
  uploadHint: { color: C.muted, fontSize: 12 },
  error: { color: C.danger, fontSize: 14, marginTop: 14, lineHeight: 20 },
  save: { backgroundColor: C.green, borderRadius: 10, minHeight: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveText: { color: C.white, fontSize: 14, fontWeight: '800' },
});
