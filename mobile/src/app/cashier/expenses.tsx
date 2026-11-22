import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useKassaSession } from '@/components/kassa-demo/api';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import {
  categoryColors, currentMonthKey, expenseCategories, expenseError, formattedDate,
  type Expense, type ExpenseList,
} from '@/components/kassa-demo/expenses-data';

type Tab = 'Overview' | 'All Expenses';
const icon = (name: React.ComponentProps<typeof SymbolView>['name'], size = 17, color: string = C.green) =>
  <SymbolView name={name} tintColor={color} size={size}/>;

function ExpenseRow({ item, onPress }: { item: Expense; onPress: () => void }) {
  const categoryIcon: React.ComponentProps<typeof SymbolView>['name'] = item.category === 'Rent'
    ? { ios: 'house', android: 'home', web: 'home' }
    : item.category === 'Utilities'
      ? { ios: 'bolt', android: 'bolt', web: 'bolt' }
      : { ios: 'creditcard', android: 'payments', web: 'payments' };
  return <Pressable accessibilityRole="button" accessibilityLabel={'View ' + item.description}
    style={s.expenseRow} onPress={onPress}>
    <View style={s.rowIcon}>{icon(categoryIcon, 19)}</View>
    <View style={s.rowBody}>
      <Text style={s.rowTitle} numberOfLines={1}>{item.description}</Text>
      <Text style={s.rowCaption} numberOfLines={1}>{item.category} · {formattedDate(item.spentAt)}</Text>
    </View>
    <View style={s.rowRight}>
      <Text style={s.rowAmount}>{naira(Number(item.amount))}</Text>
      <Text style={s.rowCaption}>{item.branchName}</Text>
    </View>
  </Pressable>;
}

export default function Expenses() {
  const router = useRouter();
  const session = useKassaSession();
  const scope = session.scope;
  const owner = scope?.myRole === 'Owner';
  const [data, setData] = useState<ExpenseList | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [period, setPeriod] = useState(currentMonthKey());
  const [monthMenu, setMonthMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      return {
        key: String(date.getFullYear()) + '-' + String(date.getMonth() + 1).padStart(2, '0'),
        label: date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }),
      };
    });
  }, []);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    if (!scope || scope.myRole !== 'Owner') return;
    if (isActive()) { setLoading(true); setError(''); }
    try {
      const result = await session.request<ExpenseList>(
        'expenses?businessId=' + encodeURIComponent(scope.businessId),
      );
      if (!result || !Array.isArray(result.items)) throw new Error('Invalid expenses response.');
      if (isActive()) setData(result);
    } catch (cause) {
      if (isActive()) { setData(null); setError(expenseError(cause, 'Unable to load expenses.')); }
    } finally { if (isActive()) setLoading(false); }
  }, [scope?.businessId, scope?.myRole, session.request]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void load(() => active);
    return () => { active = false; };
  }, [load]));

  const periodItems = useMemo(
    () => (data?.items ?? []).filter(item => period === 'all' || item.spentAt.startsWith(period)),
    [data?.items, period],
  );
  const matching = useMemo(() => periodItems.filter(item =>
    (category === 'All categories' || item.category === category) &&
    [item.description, item.category, item.branchName].join(' ')
      .toLowerCase().includes(search.trim().toLowerCase()),
  ), [periodItems, search, category]);

  const total = period === 'all'
    ? Number(data?.summary.allTime ?? 0)
    : period === currentMonthKey()
      ? Number(data?.summary.thisMonth ?? 0)
      : periodItems.reduce((sum, item) => sum + Number(item.amount), 0);

  const breakdown = useMemo(() => {
    const entries = new Map<string, number>();
    for (const item of periodItems) {
      entries.set(item.category, (entries.get(item.category) ?? 0) + Number(item.amount));
    }
    return [...entries].sort((a, b) => b[1] - a[1]);
  }, [periodItems]);
  const loadedTotal = breakdown.reduce((sum, [, amount]) => sum + amount, 0);
  const periodLabel = period === 'all' ? 'All time'
    : months.find(month => month.key === period)?.label ?? period;

  const showDetail = (item: Expense) =>
    router.push({ pathname: '/cashier/expense-detail', params: { id: item.id } });

  if (!owner) return <KScreen back showBrand={false} showPreviewLabel={false}>
    <Text style={s.title}>Expenses</Text>
    <Text style={s.error}>Only the business owner can access expenses.</Text>
  </KScreen>;

  return <KScreen back showBrand={false} showPreviewLabel={false}>
    <View style={s.heading}>
      <Text style={s.title}>Expenses</Text>
      <Text style={s.subtitle}>Keep track of your business running costs.</Text>
    </View>

    <View style={s.tabs}>
      {(['Overview', 'All Expenses'] as const).map(value =>
        <Pressable key={value} accessibilityRole="button"
          accessibilityState={{ selected: tab === value }}
          onPress={() => setTab(value)}
          style={[s.tab, tab === value && s.activeTab]}>
          <Text style={[s.tabText, tab === value && s.activeTabText]}>{value}</Text>
        </Pressable>)}
    </View>

    <Pressable accessibilityRole="button" accessibilityLabel="Select expense period"
      onPress={() => setMonthMenu(value => !value)} style={s.monthPicker}>
      {icon({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }, 18)}
      <Text style={s.monthValue}>{periodLabel}</Text>
      {icon({ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }, 17, C.muted)}
    </Pressable>
    {monthMenu && <View style={s.monthOptions}>
      {[{ key: 'all', label: 'All time' }, ...months].map(month =>
        <Pressable key={month.key} accessibilityRole="button"
          onPress={() => { setPeriod(month.key); setMonthMenu(false); }}
          style={s.monthOption}>
          <Text style={[s.monthOptionText, period === month.key && s.monthOptionActive]}>
            {month.label}
          </Text>
          {period === month.key && icon({ ios: 'checkmark', android: 'check', web: 'check' })}
        </Pressable>)}
    </View>}

    {!!error && <Text style={s.error}>{error}</Text>}

    <View style={s.totalCard}>
      <View style={s.totalIcon}>{icon({ ios: 'creditcard', android: 'payments', web: 'payments' }, 22)}</View>
      <View style={s.totalText}>
        <Text style={s.hint}>Total expenses · {periodLabel}</Text>
        <Text style={s.totalValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {naira(total)}
        </Text>
        <Text style={s.hint}>{period === 'all' ? data?.summary.count ?? 0 : period === currentMonthKey()
          ? data?.summary.monthCount ?? 0 : periodItems.length} recorded expenses</Text>
      </View>
    </View>

    {tab === 'Overview' ? <>
      <View style={s.chartCard}>
        <Text style={s.section}>Expenses by category</Text>
        <Text style={s.hint}>How your spending is distributed</Text>
        {breakdown.length ? <>
          <View style={s.stackedBar}>
            {breakdown.map(([name, amount], index) =>
              <View key={name} style={{ flex: amount, backgroundColor: categoryColors[index % categoryColors.length] }}/>)}
          </View>
          {breakdown.slice(0, 6).map(([name, amount], index) =>
            <View key={name} style={s.breakdownRow}>
              <View style={[s.legendDot, { backgroundColor: categoryColors[index % categoryColors.length] }]}/>
              <Text numberOfLines={1} style={s.breakdownName}>{name}</Text>
              <Text style={s.breakdownAmount}>{naira(amount)}</Text>
              <Text style={s.breakdownPercent}>
                {loadedTotal > 0 ? Math.round(amount * 100 / loadedTotal) : 0}%
              </Text>
            </View>)}
        </> : <Text style={s.emptyText}>No expenses for this period yet.</Text>}
      </View>

      <Pressable accessibilityRole="button" style={s.primary}
        onPress={() => router.push('/cashier/add-expense')}>
        {icon({ ios: 'plus', android: 'add', web: 'add' }, 19, C.white)}
        <Text style={s.primaryText}>Add Expense</Text>
      </Pressable>

      <View style={s.sectionRow}>
        <Text style={s.section}>Recent Expenses</Text>
        <Pressable onPress={() => setTab('All Expenses')} accessibilityRole="button">
          <Text style={s.actionText}>See All</Text>
        </Pressable>
      </View>
      {loading && !data && <Text style={s.emptyText}>Loading expenses…</Text>}
      {!loading && !error && !periodItems.length && <Text style={s.emptyText}>No expenses recorded yet.</Text>}
      {periodItems.slice(0, 4).map(item => <ExpenseRow key={item.id} item={item}
        onPress={() => showDetail(item)}/>)}
    </> : <>
      <View style={s.sectionRow}>
        <Text style={s.section}>All Expenses</Text>
        <Pressable onPress={() => { void load(); }} accessibilityRole="button">
          <Text style={s.actionText}>{loading ? 'Loading…' : 'Refresh'}</Text>
        </Pressable>
      </View>
      <TextInput value={search} onChangeText={setSearch} style={s.search}
        placeholder="Search expenses" placeholderTextColor={C.faint}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {['All categories', ...expenseCategories].map(value =>
          <Pressable key={value} accessibilityRole="button"
            accessibilityState={{ selected: category === value }}
            onPress={() => setCategory(value)}
            style={[s.filterChip, category === value && s.selectedChip]}>
            <Text style={[s.filterText, category === value && s.selectedFilterText]}>{value}</Text>
          </Pressable>)}
      </ScrollView>
      {!loading && !error && !matching.length && <Text style={s.emptyText}>No matching expenses.</Text>}
      {matching.map(item => <ExpenseRow key={item.id} item={item}
        onPress={() => showDetail(item)}/>)}
      <Pressable accessibilityRole="button" style={[s.primary, { marginTop: 16 }]}
        onPress={() => router.push('/cashier/add-expense')}>
        {icon({ ios: 'plus', android: 'add', web: 'add' }, 19, C.white)}
        <Text style={s.primaryText}>Add Expense</Text>
      </Pressable>
    </>}
    {(data?.items.length ?? 0) >= (data?.historyLimit ?? 500) &&
      <Text style={s.limit}>Showing the latest {data?.historyLimit ?? 500} expenses. Older records may not be listed.</Text>}
  </KScreen>;
}

const s = StyleSheet.create({
  heading: { marginBottom: 17 },
  title: { fontSize: 26, fontWeight: '800', color: C.title },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: '#EDF2EF', borderRadius: 10, padding: 4, marginBottom: 16 },
  tab: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: C.green },
  tabText: { color: C.muted, fontSize: 14, fontWeight: '700' },
  activeTabText: { color: C.white },
  monthPicker: { flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: C.border,
    borderWidth: 1, borderRadius: 10, backgroundColor: C.white, paddingHorizontal: 13, height: 49, marginBottom: 16 },
  monthValue: { fontSize: 14, color: C.title, flex: 1, fontWeight: '700' },
  monthOptions: { backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    padding: 6, marginTop: -9, marginBottom: 16 },
  monthOption: { padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthOptionText: { fontSize: 14, color: C.text },
  monthOptionActive: { color: C.green, fontWeight: '800' },
  totalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 1,
    borderColor: C.border, borderRadius: 14, padding: 16, gap: 13, marginBottom: 16 },
  totalIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.mint,
    alignItems: 'center', justifyContent: 'center' },
  totalText: { flex: 1, minWidth: 0 },
  hint: { fontSize: 13, color: C.muted, marginBottom: 4 },
  totalValue: { fontSize: 26, fontWeight: '800', color: C.title, marginVertical: 4 },
  chartCard: { padding: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
    borderRadius: 13, marginBottom: 15 },
  section: { color: C.title, fontSize: 20, fontWeight: '800' },
  stackedBar: { flexDirection: 'row', height: 16, overflow: 'hidden', borderRadius: 8, marginVertical: 17 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  breakdownName: { flex: 1, minWidth: 0, color: C.text, fontSize: 13 },
  breakdownAmount: { color: C.title, fontSize: 13, fontWeight: '700' },
  breakdownPercent: { width: 36, textAlign: 'right', fontSize: 12, color: C.muted },
  primary: { backgroundColor: C.green, borderRadius: 9, minHeight: 49, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 9, marginBottom: 22 },
  primaryText: { color: C.white, fontSize: 14, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  actionText: { color: C.green, fontSize: 14, fontWeight: '800' },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomColor: C.border,
    borderBottomWidth: 1, paddingVertical: 14 },
  rowIcon: { height: 39, width: 39, borderRadius: 20, backgroundColor: C.mint,
    alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, color: C.title, fontWeight: '800' },
  rowCaption: { fontSize: 12, color: C.muted, marginTop: 4 },
  rowRight: { alignItems: 'flex-end', maxWidth: '42%' },
  rowAmount: { fontSize: 14, fontWeight: '800', color: C.title },
  emptyText: { color: C.muted, fontSize: 14, paddingVertical: 16 },
  error: { color: C.danger, fontSize: 14, marginBottom: 12 },
  filterScroll: { marginBottom: 15, flexGrow: 0 },
  filterContent: { alignItems: 'center', gap: 7 },
  filterChip: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12,
    paddingVertical: 8, backgroundColor: C.white },
  selectedChip: { backgroundColor: C.green, borderColor: C.green },
  filterText: { fontSize: 13, color: C.text },
  selectedFilterText: { color: C.white, fontWeight: '700' },
  search: { borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 13,
    height: 46, backgroundColor: C.white, fontSize: 14, color: C.title, marginBottom: 12 },
  limit: { color: C.muted, fontSize: 12, marginTop: 20, lineHeight: 18 },
});
