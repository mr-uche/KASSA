import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { useKassaSession, type CheckoutSale } from '@/components/kassa-demo/api';
import { getOfflineSales } from '@/components/kassa-demo/offline-cash';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';

const accountLinks = [
  { title: 'Switch branch', route: '/cashier/switch-branch', icon: { ios: 'building.2', android: 'store', web: 'store' } },
  { title: 'Change Password', route: '/cashier/change-password', icon: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' } },
  { title: 'Transactions', route: '/cashier/transactions', icon: { ios: 'list.bullet', android: 'receipt_long', web: 'receipt_long' } },
  { title: 'Reports & Analytics', route: '/cashier/reports', icon: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' } },
  { title: 'Products & Inventory', route: '/cashier/inventory', icon: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' } },
  { title: 'Staff & Branches', route: '/cashier/staff-branches', icon: { ios: 'person.3', android: 'groups', web: 'groups' } },
] as const;

export default function Profile() {
  const router = useRouter();
  const session = useKassaSession();
  const store = useKassaDemo();
  const [notifications, setNotifications] = useState(false);
  const [today, setToday] = useState<{ amount: number; count: number } | null>(null);
  const [salesError, setSalesError] = useState('');

  const refresh = useCallback(async () => {
    if (!session.scope) { setToday(null); return; }
    setSalesError('');
    try {
      const sales = await session.request<CheckoutSale[]>(
        'sales?businessId=' + encodeURIComponent(session.scope.businessId) +
        '&branchId=' + encodeURIComponent(session.scope.branchId)
      );
      const date = new Date().toDateString();
      const todaysPaid = sales.filter(s => s.status === 'PAID' && s.createdAt &&
        new Date(s.createdAt).toDateString() === date);
      setToday({ count: todaysPaid.length, amount: todaysPaid.reduce((sum, s) => sum + Number(s.total), 0) });
    } catch {
      setToday(null);
      setSalesError('Sales summary unavailable');
    }
  }, [session.scope?.businessId, session.scope?.branchId, session.request]);

  useEffect(() => { void refresh(); }, [refresh]);

  const userName = session.user?.fullName || 'Cashier';
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('');
  const logout = async () => {
    const complete = () => {
      store.beginNewSale();
      void session.signOut().finally(() => router.replace('/login'));
    };
    let warning = store.pendingSale
      ? 'A payment is pending. Recover or verify it after signing in again.'
      : 'You will need to sign in online again to continue.';
    if (session.user && session.scope) {
      try {
        const local = await getOfflineSales({
          userId: session.user.id,
          businessId: session.scope.businessId,
          branchId: session.scope.branchId,
        });
        const unsynced = local.filter(sale => sale.status !== 'SYNCED');
        if (unsynced.length) {
          warning = unsynced.length + ' offline cash sale(s) are NOT synced. They remain on this phone. ' +
            'Sign in again with the same account to recover them. Do not uninstall or clear app data.';
        }
      } catch {
        warning += ' KASSA could not check the offline sale queue on this phone.';
      }
    }
    Alert.alert('Log out?', warning, [
      { text: 'Stay signed in', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: complete },
    ]);
  };

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <Text style={s.heading}>Profile</Text>
    <Text style={s.subtitle}>Account &amp; Settings</Text>

    <View style={s.profileCard}>
      <View style={s.profileRow}>
        <View style={s.avatar}><Text style={s.initials}>{initials}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{userName}</Text>
          <Text style={s.role}>{session.scope?.myRole ?? 'Account'} • {session.scope?.branchName ?? 'No branch selected'}</Text>
          <Text style={s.activeText}>● Signed in</Text>
        </View>
      </View>
      {today && <Text style={s.summary}>Today: {naira(today.amount)} across {today.count} recorded sales</Text>}
      {salesError && <Text style={s.summary}>{salesError}</Text>}
    </View>

    <Text style={s.groupLabel}>ACCOUNT</Text>
    <View style={s.group}>
      {accountLinks.map(item => <Pressable
        accessibilityRole="button" key={item.route} style={s.row}
        onPress={() => router.push(item.route)}
      >
        <View style={s.iconBubble}><SymbolView name={item.icon} tintColor={C.green} size={18} /></View>
        <Text style={s.rowText}>{item.title}</Text>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={17} tintColor={C.faint} />
      </Pressable>)}
      <View style={s.row}>
        <View style={s.iconBubble}>
          <SymbolView name={{ ios: 'bell', android: 'notifications', web: 'notifications' }} size={18} tintColor={C.green} />
        </View>
        <Text style={s.rowText}>Notifications</Text>
        <Switch value={notifications} onValueChange={value => {
          setNotifications(value);
          Alert.alert('Notification preference', 'This is a local UI preference. Push notifications are not connected yet.');
        }} trackColor={{ false: C.border, true: '#9CCAB8' }} thumbColor={notifications ? C.green : '#FFFFFF'} />
      </View>
    </View>

    <Text style={s.groupLabel}>SUPPORT</Text>
    <Pressable accessibilityRole="button" style={s.row} onPress={() => router.push('/cashier/help')}>
      <View style={s.iconBubble}><SymbolView name={{ ios: 'questionmark.circle', android: 'help_outline', web: 'help_outline' }} size={18} tintColor={C.green} /></View>
      <Text style={s.rowText}>Help &amp; support</Text>
      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={17} tintColor={C.faint} />
    </Pressable>

    <Pressable accessibilityRole="button" onPress={logout} style={s.logout}>
      <View style={s.logoutIcon}><SymbolView name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }} size={18} tintColor={C.danger} /></View>
      <Text style={s.logoutText}>Log out</Text>
    </Pressable>
    <Text style={s.footer}>Kassa Business App</Text>
  </KScreen>;
}

const s = StyleSheet.create({
  heading: { color: C.title, fontSize: 26, fontWeight: '800' },
  subtitle: { color: C.muted, fontSize: 14, marginTop: 5 },
  profileCard: { backgroundColor: C.green, borderRadius: 12, padding: 18, marginTop: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 57, height: 57, borderRadius: 29, backgroundColor: '#39947F', alignItems: 'center', justifyContent: 'center' },
  initials: { color: C.white, fontSize: 20, fontWeight: '800' },
  name: { color: C.white, fontSize: 20, fontWeight: '800' },
  role: { color: '#DBF0E9', fontSize: 14, marginTop: 4 },
  activeText: { color: '#CEF0E5', fontSize: 14, marginTop: 8 },
  summary: { color: '#E0F4EC', fontSize: 14, marginTop: 12 },
  groupLabel: { fontSize: 20, color: C.muted, fontWeight: '700', marginTop: 28, marginBottom: 9 },
  group: { gap: 7 },
  row: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 9, minHeight: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 7, gap: 10 },
  iconBubble: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  rowText: { color: C.title, fontSize: 14, fontWeight: '700', flex: 1 },
  logout: { marginTop: 27, borderWidth: 1, borderColor: '#F3CBCE', borderRadius: 9, backgroundColor: '#FDEBEC', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoutIcon: { width: 29, height: 29, borderRadius: 15, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: C.danger, fontWeight: '800', fontSize: 14 },
  footer: { color: C.faint, textAlign: 'center', fontSize: 14, marginTop: 34 },
});
