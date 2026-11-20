import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import { useKassaSession } from '@/components/kassa-demo/api';
import { KScreen } from '@/components/kassa-demo/ui';
import { C, naira } from '@/components/kassa-demo/theme';

type Expense = {
  id: string;
  branchName: string;
  category: string;
  description: string;
  amount: string;
  spentAt: string;
  hasReceipt: boolean;
  receiptName: string | null;
  receiptMime: string | null;
};
type ExpenseList = {
  items: Expense[];
  summary: {
    allTime: string; thisMonth: string; count: number; monthCount: number;
    byCategory: { category: string; amount: string }[];
  };
};

const categories = [
  'Rent', 'Utilities', 'Salaries', 'Transport', 'Marketing',
  'Maintenance', 'Office supplies', 'Professional fees', 'Other',
] as const;

function localDate(): string {
  const today = new Date();
  return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') +
    '-' + String(today.getDate()).padStart(2, '0');
}
function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}
function detailPath(businessId: string, expenseId: string): string {
  return 'expenses/' + encodeURIComponent(expenseId) + '/receipt?businessId=' + encodeURIComponent(businessId);
}

export default function Expenses() {
  const session = useKassaSession();
  const scope = session.scope;
  const owner = scope?.myRole === 'Owner';

  const [data, setData] = useState<ExpenseList | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('Utilities');
  const [description, setDescription] = useState('');
  const [spentAt, setSpentAt] = useState(localDate());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All categories');

  const reload = useCallback(async (isActive: () => boolean = () => true) => {
    if (!scope || scope.myRole !== 'Owner') return;
    if (isActive()) { setLoading(true); setError(''); }
    try {
      const result = await session.request<ExpenseList>(
        'expenses?businessId=' + encodeURIComponent(scope.businessId),
      );
      if (!result || !Array.isArray(result.items)) throw new Error('Invalid expenses response.');
      if (isActive()) setData(result);
    } catch (cause) {
      if (isActive()) { setData(null); setError(message(cause, 'Unable to load expenses.')); }
    } finally { if (isActive()) setLoading(false); }
  }, [scope?.businessId, scope?.myRole, session.request]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void reload(() => active);
    return () => { active = false; };
  }, [reload]));

  const chooseReceipt = async (): Promise<File | null> => {
    try {
      const selected = await File.pickFileAsync({
        mimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
      });
      if (selected.canceled) return null;
      const chosen = selected.result;
      if (chosen.size == null || chosen.size > 2 * 1024 * 1024 || chosen.size < 1) {
        setError('Receipts must be no larger than 2 MB.');
        return null;
      }
      return chosen;
    } catch (cause) {
      setError(message(cause, 'Could not select a receipt.'));
      return null;
    }
  };

  const save = async () => {
    if (!scope || !owner || saving) return;
    setError(''); setNotice('');
    const cleanedAmount = amount.trim();
    if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(cleanedAmount) ||
        Number(cleanedAmount) <= 0) {
      setError('Enter a valid amount in naira, greater than zero.');
      return;
    }
    if (!description.trim()) { setError('Enter what this money was spent on.'); return; }
    const date = new Date(spentAt + 'T00:00:00.000Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentAt) || Number.isNaN(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== spentAt) {
      setError('Use a valid date in YYYY-MM-DD format.');
      return;
    }
    setSaving(true);
    try {
      const created = await session.request<{ id: string }>('expenses', {
        businessId: scope.businessId, branchId: scope.branchId,
        amount: Number(cleanedAmount).toFixed(2), category,
        description: description.trim(), spentAt,
      }, 'POST');
      let attachmentProblem = '';
      if (receipt) {
        try {
          await session.uploadReceipt(detailPath(scope.businessId, created.id), receipt);
        } catch (cause) {
          attachmentProblem = message(cause, 'Receipt upload failed.');
        }
      }
      setAmount(''); setDescription(''); setReceipt(null); setSpentAt(localDate());
      setFormOpen(false);
      setNotice(attachmentProblem ?
        'Expense recorded, but its receipt did not upload. Use Attach receipt on the saved record to try again.' :
        'Expense recorded successfully.');
      await reload();
    } catch (cause) {
      setError(message(cause, 'Could not record expense.'));
    } finally { setSaving(false); }
  };

  const attachReceipt = async (item: Expense) => {
    if (!scope || !owner || busyId) return;
    setError(''); setNotice('');
    const selected = await chooseReceipt();
    if (!selected) return;
    setBusyId(item.id);
    try {
      await session.uploadReceipt(detailPath(scope.businessId, item.id), selected);
      setNotice('Receipt attached to ' + item.description + '.');
      await reload();
    } catch (cause) {
      setError(message(cause, 'Could not attach receipt.'));
    } finally { setBusyId(''); }
  };

  const openReceipt = async (item: Expense) => {
    if (!scope || !owner || busyId) return;
    setError('');
    setBusyId(item.id);
    try {
      const bytes = await session.downloadReceipt(detailPath(scope.businessId, item.id));
      const ext = item.receiptMime === 'application/pdf' ? 'pdf' :
        item.receiptMime === 'image/png' ? 'png' :
        item.receiptMime === 'image/webp' ? 'webp' : 'jpg';
      const file = new File(Paths.cache, 'kassa-expense-' + item.id + '.' + ext);
      await file.write(bytes);
      await file.preview({ title: item.receiptName || 'Expense receipt' });
    } catch (cause) {
      setError(message(cause, 'Unable to open receipt on this device.'));
    } finally { setBusyId(''); }
  };

  if (!owner) {
    return <KScreen back showBrand={false} showPreviewLabel={false}>
      <Text style={s.title}>Expenses</Text>
      <Text style={s.error}>This feature is available only to the business owner.</Text>
    </KScreen>;
  }

  const filtered = (data?.items ?? []).filter(item => {
    return (filter === 'All categories' || item.category === filter) &&
      [item.description, item.category, item.branchName].join(' ')
        .toLowerCase().includes(search.trim().toLowerCase());
  });

  return <KScreen back showBrand={false} showPreviewLabel={false}>
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Expenses</Text>
        <Text style={s.subtitle}>Track the running costs of your business.</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => { setError(''); setFormOpen(v => !v); }}
        style={s.newButton}><Text style={s.newText}>{formOpen ? 'Cancel' : '+ Add'}</Text></Pressable>
    </View>

    <View style={s.metrics}>
      <View style={s.metric}><Text style={s.muted}>Spent this month</Text>
        <Text style={s.metricValue}>{naira(Number(data?.summary.thisMonth ?? 0))}</Text>
        <Text style={s.muted}>{data?.summary.monthCount ?? 0} entries</Text>
      </View>
      <View style={s.metric}><Text style={s.muted}>Total recorded</Text>
        <Text style={s.metricValue}>{naira(Number(data?.summary.allTime ?? 0))}</Text>
        <Text style={s.muted}>{data?.summary.count ?? 0} expenses</Text>
      </View>
    </View>

    {!!error && <Text style={s.error}>{error}</Text>}
    {!!notice && <Text style={s.notice}>{notice}</Text>}

    {formOpen && <View style={s.panel}>
      <Text style={s.section}>Record an expense</Text>
      <Text style={s.hint}>For {scope?.branchName}. Inventory purchases are recorded separately.</Text>

      <Text style={s.label}>Amount (₦) *</Text>
      <TextInput style={s.input} keyboardType="decimal-pad" value={amount}
        placeholder="e.g. 2500" placeholderTextColor={C.faint} onChangeText={setAmount}/>

      <Text style={s.label}>Expense category *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map(item => <Pressable key={item} onPress={() => setCategory(item)}
          accessibilityRole="button" accessibilityState={{ selected: item === category }}
          style={[s.chip, item === category && s.chipSelected]}>
          <Text style={[s.chipText, item === category && s.chipSelectedText]}>{item}</Text>
        </Pressable>)}
      </ScrollView>

      <Text style={s.label}>What was this expense for? *</Text>
      <TextInput style={[s.input, s.multiline]} multiline value={description}
        maxLength={500} placeholder="e.g. Electricity bill for November"
        placeholderTextColor={C.faint} onChangeText={setDescription}/>

      <Text style={s.label}>Date (YYYY-MM-DD) *</Text>
      <TextInput style={s.input} value={spentAt} onChangeText={setSpentAt}
        placeholder="2026-11-20" autoCapitalize="none" placeholderTextColor={C.faint}/>

      <Text style={s.label}>Receipt (optional)</Text>
      <Pressable accessibilityRole="button" style={s.attachment}
        onPress={async () => {
          setError('');
          const chosen = await chooseReceipt();
          if (chosen) setReceipt(chosen);
        }}>
        <Text style={s.attachText}>{receipt ? receipt.name : '+ Upload a receipt (PDF or image)'}</Text>
      </Pressable>
      {receipt && <Pressable onPress={() => setReceipt(null)}><Text style={s.remove}>Remove selected receipt</Text></Pressable>}
      <Text style={s.hint}>PDF, PNG, JPEG or WebP, maximum 2 MB. Only the owner can access receipts.</Text>

      <Pressable accessibilityRole="button" disabled={saving} style={[s.save, saving && s.disabled]}
        onPress={() => { void save(); }}><Text style={s.saveText}>{saving ? 'Saving…' : 'Save expense'}</Text></Pressable>
    </View>}

    <View style={s.listTitle}>
      <Text style={s.section}>Expense history</Text>
      <Pressable accessibilityRole="button" disabled={loading} onPress={() => { void reload(); }}>
        <Text style={s.refresh}>{loading ? 'Loading…' : 'Refresh'}</Text>
      </Pressable>
    </View>
    <TextInput value={search} onChangeText={setSearch} placeholder="Search expenses"
      placeholderTextColor={C.faint} style={s.input}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginBottom: 12 }}>
      {['All categories', ...categories].map(item => <Pressable key={item} onPress={() => setFilter(item)}
        accessibilityRole="button" style={[s.chip, filter === item && s.chipSelected]}>
        <Text style={[s.chipText, filter === item && s.chipSelectedText]}>{item}</Text>
      </Pressable>)}
    </ScrollView>
    {loading && !data && <Text style={s.hint}>Loading recorded expenses…</Text>}
    {!loading && !error && filtered.length === 0 && <Text style={s.empty}>No matching expenses yet.</Text>}
    {filtered.map(item => <View key={item.id} style={s.record}>
      <View style={s.recordTop}>
        <Text style={s.recordDescription} numberOfLines={2}>{item.description}</Text>
        <Text style={s.recordAmount}>{naira(Number(item.amount))}</Text>
      </View>
      <Text style={s.recordMeta}>{item.category} · {item.branchName} · {item.spentAt}</Text>
      <Pressable disabled={!!busyId} onPress={() => { void (item.hasReceipt ? openReceipt(item) : attachReceipt(item)); }}
        accessibilityRole="button" style={s.receiptAction}>
        <Text style={s.receiptActionText}>{busyId === item.id ? 'Please wait…' :
          item.hasReceipt ? 'View receipt' : '+ Attach receipt'}</Text>
      </Pressable>
    </View>)}
    {(data?.items.length ?? 0) >= 500 && <Text style={s.hint}>Showing the latest 500 records.</Text>}
  </KScreen>;
}

const s = StyleSheet.create({
  title: { color: C.title, fontSize: 26, fontWeight: '800' },
  subtitle: { color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  newButton: { backgroundColor: C.green, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 9 },
  newText: { color: C.white, fontSize: 13, fontWeight: '800' },
  metrics: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 24 },
  metric: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 13, minHeight: 105 },
  muted: { color: C.muted, fontSize: 12, marginBottom: 6 },
  metricValue: { fontSize: 17, fontWeight: '800', color: C.green, marginBottom: 4 },
  section: { fontSize: 18, fontWeight: '800', color: C.title },
  panel: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 25 },
  label: { fontSize: 13, fontWeight: '700', color: C.text, marginTop: 17, marginBottom: 8 },
  hint: { fontSize: 12, lineHeight: 19, color: C.muted, marginTop: 5 },
  input: { borderColor: C.border, borderWidth: 1, borderRadius: 8, backgroundColor: C.white,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.title, minHeight: 46 },
  multiline: { minHeight: 86, textAlignVertical: 'top' },
  chip: { borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, marginRight: 7 },
  chipSelected: { backgroundColor: C.green, borderColor: C.green },
  chipText: { color: C.text, fontSize: 12, fontWeight: '600' },
  chipSelectedText: { color: C.white },
  attachment: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.green, borderRadius: 9,
    padding: 13, backgroundColor: C.mint },
  attachText: { color: C.green, fontSize: 13, fontWeight: '700' },
  remove: { color: C.danger, fontWeight: '700', marginTop: 8 },
  save: { backgroundColor: C.green, alignItems: 'center', justifyContent: 'center',
    padding: 15, borderRadius: 9, marginTop: 20 },
  disabled: { opacity: 0.5 },
  saveText: { color: C.white, fontSize: 14, fontWeight: '800' },
  error: { color: C.danger, fontSize: 13, marginVertical: 10 },
  notice: { color: C.green, fontSize: 13, marginVertical: 10 },
  listTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  refresh: { color: C.green, fontSize: 13, fontWeight: '700' },
  empty: { backgroundColor: C.white, borderRadius: 10, padding: 23, color: C.muted, textAlign: 'center' },
  record: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 11, padding: 14, marginBottom: 12 },
  recordTop: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' },
  recordDescription: { color: C.title, fontSize: 14, fontWeight: '700', flex: 1 },
  recordAmount: { color: C.title, fontSize: 14, fontWeight: '800' },
  recordMeta: { color: C.muted, fontSize: 12, marginTop: 8 },
  receiptAction: { alignSelf: 'flex-start', marginTop: 11, paddingVertical: 4 },
  receiptActionText: { color: C.green, fontSize: 13, fontWeight: '700' },
});
