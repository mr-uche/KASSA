import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useKassaSession } from './api';
import { useKassaDemo } from './store';
import { getOfflineSaleQueueStatus, getOfflineSales, type OfflineCashRecord } from './offline-cash';
import { C, naira } from './theme';

type MenuItem = {
  label: string; route: Href; permission: string;
  symbol: React.ComponentProps<typeof SymbolView>['name'];
};
const menuItems: MenuItem[] = [
  { label: 'Home', route: '/cashier', permission: 'View dashboard', symbol: { ios: 'house', android: 'home', web: 'home' } },
  { label: 'Transactions', route: '/cashier/transactions', permission: 'Manage sales & transactions', symbol: { ios: 'list.bullet', android: 'receipt_long', web: 'receipt_long' } },
  { label: 'Reports & Analytics', route: '/cashier/reports', permission: 'View reports & analytics', symbol: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' } },
  { label: 'Products & Inventory', route: '/cashier/inventory', permission: 'Manage products & inventory', symbol: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' } },
  { label: 'Staff & Branches', route: '/cashier/staff-branches', permission: 'Owner', symbol: { ios: 'person.3', android: 'groups', web: 'groups' } },
  { label: 'Settings', route: '/cashier/settings', permission: 'Owner', symbol: { ios: 'gearshape', android: 'settings', web: 'settings' } },
];

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length > 1) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  const letters = Array.from(words[0]).filter(letter => /\p{L}/u.test(letter));
  if (letters.length <= 1) return (letters[0] ?? '?').toUpperCase();
  return (letters[0] + (letters.slice(1).find(letter => /[bcdfghjklmnpqrstvwxyz]/i.test(letter)) ?? letters[1])).toUpperCase();
}

export function KassaBusinessHeader({ logo }: { logo: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, scope } = useKassaSession();
  const { offlineQueue, syncingOfflineSales } = useKassaDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [alerts, setAlerts] = useState(0);
  const [recent, setRecent] = useState<OfflineCashRecord[]>([]);
  const [notificationError, setNotificationError] = useState('');
  const name = user?.fullName?.trim() || 'Staff member';
  const role = scope?.myRole || 'Staff';
  const permissions = scope?.myPermissions || [];
  const menu = menuItems.filter(item => item.permission === 'Owner'
    ? role === 'Owner'
    : role === 'Owner' || permissions.includes('*') || permissions.includes(item.permission));

  const refresh = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!user || !scope) { if (isCurrent()) { setAlerts(0); setRecent([]); } return; }
    try {
      const key = { userId: user.id, businessId: scope.businessId, branchId: scope.branchId };
      const [queue, rows] = await Promise.all([getOfflineSaleQueueStatus(key), getOfflineSales(key)]);
      if (isCurrent()) {
        setAlerts(queue.waiting);
        setRecent(rows.filter(row => row.status !== 'SYNCED').slice(0, 5));
        setNotificationError('');
      }
    } catch {
      if (isCurrent()) {
        setAlerts(0); setRecent([]);
        setNotificationError('Local sale sync notifications are unavailable on this device.');
      }
    }
  }, [user?.id, scope?.businessId, scope?.branchId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void refresh(() => active);
    return () => { active = false; };
  }, [refresh]));
  // Recheck the real local queue after an offline cash sale or sync event.
  useEffect(() => { void refresh(); }, [refresh, offlineQueue?.waiting, syncingOfflineSales]);

  const navigate = (route: Href) => {
    setMenuOpen(false);
    setBellOpen(false);
    router.push(route);
  };

  return <>
    <View style={[s.header, { paddingTop: Math.max(insets.top, 10) + 5 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open navigation menu"
        accessibilityState={{ expanded: menuOpen }}
        onPress={() => { setBellOpen(false); setMenuOpen(true); }} style={s.headerAction}>
        <SymbolView name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }} size={22} tintColor={C.text}/>
      </Pressable>
      <View style={s.brand}>{logo}</View>
      <Pressable accessibilityRole="button"
        accessibilityLabel={alerts ? 'Notifications, ' + alerts + ' unsynced offline sales' : 'Notifications'}
        accessibilityState={{ expanded: bellOpen }}
        onPress={() => { setMenuOpen(false); void refresh(); setBellOpen(true); }}
        style={s.bell}>
        <SymbolView name={{ ios: 'bell', android: 'notifications_none', web: 'notifications_none' }} size={21} tintColor={C.muted}/>
        {alerts > 0 && <View style={s.alertDot}/>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={'Open profile for ' + name}
        onPress={() => navigate('/cashier/profile')} style={s.avatar}>
        <Text style={s.avatarText} numberOfLines={1}>{initials(name)}</Text>
      </Pressable>
    </View>

    <Modal visible={menuOpen} transparent animationType="slide" statusBarTranslucent
      onRequestClose={() => setMenuOpen(false)}>
      <View style={[s.drawer, { paddingTop: Math.max(insets.top, 10) + 8, paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close navigation menu"
          onPress={() => setMenuOpen(false)} style={s.close}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={23} tintColor={C.text}/>
        </Pressable>
        <ScrollView contentContainerStyle={s.drawerContents}>
          <Pressable accessibilityRole="button" onPress={() => navigate('/cashier/profile')}
            style={s.profileCard}>
            <View style={s.profileAvatar}><Text style={s.profileAvatarText}>{initials(name)}</Text></View>
            <View style={s.profileBody}>
              <Text numberOfLines={1} style={s.profileName}>{name}</Text>
              <Text style={s.profileRole}>{role === 'Owner' ? 'Business Owner' : role}</Text>
              {!!scope?.businessName && <Text style={s.profileBusiness} numberOfLines={1}>{scope.businessName}</Text>}
            </View>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={17} tintColor={C.faint}/>
          </Pressable>
          <View style={s.links}>
            {menu.map(item => <Pressable key={item.label} accessibilityRole="button"
              accessibilityLabel={item.label} accessibilityState={{ selected: pathname === item.route }}
              onPress={() => navigate(item.route)} style={[s.link, pathname === item.route && s.linkActive]}>
              <View style={s.linkIcon}><SymbolView name={item.symbol} size={18} tintColor={C.greenDark}/></View>
              <Text style={[s.linkLabel, pathname === item.route && s.linkLabelActive]}>{item.label}</Text>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={C.faint}/>
            </Pressable>)}
          </View>
        </ScrollView>
      </View>
    </Modal>

    <Modal visible={bellOpen} transparent animationType="fade" statusBarTranslucent
      onRequestClose={() => setBellOpen(false)}>
      <View style={s.notificationOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} accessibilityRole="button"
          accessibilityLabel="Close notifications" onPress={() => setBellOpen(false)}/>
        <View style={[s.notificationPanel, { top: Math.max(insets.top, 10) + 55 }]}>
          <View style={s.notificationHeading}>
            <Text style={s.notificationTitle}>Notifications</Text>
            {alerts > 0 && <Text style={s.alertCount}>{alerts} unsynced</Text>}
          </View>
          <Text style={s.notificationSubtitle}>Sales recorded on this device</Text>
          <ScrollView nestedScrollEnabled style={s.notificationList}>
            {!!notificationError && <Text style={s.warning}>{notificationError}</Text>}
            {!notificationError && !recent.length &&
              <Text style={s.notificationEmpty}>No local sync notifications.</Text>}
            {recent.map(sale => <View key={sale.id} style={s.notificationRow}>
              <SymbolView name={sale.status === 'REVIEW'
                ? { ios: 'exclamationmark.circle', android: 'error_outline', web: 'error_outline' }
                : { ios: 'clock', android: 'schedule', web: 'schedule' }}
                size={19} tintColor={sale.status === 'REVIEW' ? C.danger : C.orange}/>
              <View style={{ flex: 1 }}>
                <Text style={s.notificationItemTitle}>{sale.status === 'REVIEW' ? 'Sale needs attention' : 'Cash sale pending sync'}</Text>
                <Text style={s.notificationItemAmount}>{naira(Number(sale.total))}</Text>
                <Text style={s.notificationItemDate}>{new Date(sale.recordedAt).toLocaleString('en-NG')}</Text>
              </View>
            </View>)}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={() => navigate('/cashier/offline-sales')}
            style={s.notificationsAction}>
            <Text style={s.notificationsActionText}>View local transactions</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17,
    paddingBottom: 11, gap: 8, backgroundColor: 'transparent', minHeight: 62 },
  headerAction: { width: 29, height: 36, justifyContent: 'center', alignItems: 'center' },
  brand: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  bell: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#F8F9FA',
    justifyContent: 'center', alignItems: 'center' },
  alertDot: { position: 'absolute', right: 6, top: 5, height: 9, width: 9,
    borderRadius: 5, borderWidth: 1, borderColor: C.white, backgroundColor: '#E54848' },
  avatar: { height: 35, width: 35, borderRadius: 18, backgroundColor: '#006045',
    justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#E5F5F0', fontSize: 12, fontWeight: '800' },
  drawer: { flex: 1, backgroundColor: '#F6F7F8', paddingHorizontal: 17 },
  close: { height: 38, width: 34, justifyContent: 'center', alignItems: 'flex-start', marginBottom: 12 },
  drawerContents: { paddingBottom: 24 },
  profileCard: { minHeight: 79, backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, padding: 12, flexDirection: 'row',
    alignItems: 'center', gap: 12, marginBottom: 16 },
  profileAvatar: { width: 49, height: 49, borderRadius: 25, backgroundColor: C.mint,
    justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { color: C.green, fontWeight: '800', fontSize: 16 },
  profileBody: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 15, fontWeight: '800', color: C.title },
  profileRole: { marginTop: 4, fontSize: 12, color: C.muted },
  profileBusiness: { marginTop: 3, fontSize: 11, color: C.muted },
  links: { gap: 9 },
  link: { minHeight: 57, flexDirection: 'row', gap: 12, paddingHorizontal: 13,
    alignItems: 'center', backgroundColor: C.white, borderColor: C.border,
    borderWidth: 1, borderRadius: 11 },
  linkActive: { backgroundColor: '#F2FAF7', borderColor: C.mintBorder },
  linkIcon: { backgroundColor: C.mint, borderRadius: 16, height: 31, width: 31,
    justifyContent: 'center', alignItems: 'center' },
  linkLabel: { flex: 1, color: C.title, fontWeight: '700', fontSize: 14 },
  linkLabelActive: { color: C.greenDark },
  notificationOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.14)' },
  notificationPanel: { position: 'absolute', left: 15, right: 15, backgroundColor: C.white,
    borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 17,
    maxHeight: 405, elevation: 9 },
  notificationHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notificationTitle: { color: C.title, fontSize: 16, fontWeight: '800' },
  alertCount: { color: C.orange, backgroundColor: '#FFF2DC', fontWeight: '700',
    fontSize: 11, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  notificationSubtitle: { color: C.muted, fontSize: 12, marginTop: 5, marginBottom: 12 },
  notificationList: { maxHeight: 270 },
  notificationRow: { flexDirection: 'row', gap: 9, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: C.border },
  notificationItemTitle: { color: C.title, fontWeight: '800', fontSize: 13 },
  notificationItemAmount: { color: C.text, fontSize: 12, marginTop: 4 },
  notificationItemDate: { color: C.muted, fontSize: 11, marginTop: 3 },
  notificationEmpty: { color: C.muted, fontSize: 13, paddingVertical: 17, textAlign: 'center' },
  warning: { color: C.danger, fontSize: 12, paddingVertical: 12 },
  notificationsAction: { marginTop: 14, borderRadius: 9, backgroundColor: C.green,
    minHeight: 41, justifyContent: 'center', alignItems: 'center' },
  notificationsActionText: { color: C.white, fontSize: 13, fontWeight: '800' },
});
