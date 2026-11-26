import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useKassaSession } from './api';
import { useKassaConnectivity } from './connectivity';
import { useKassaDemo } from './store';
import { getOfflineSaleQueueStatus, getOfflineSales, type OfflineCashRecord } from './offline-cash';
import { C, naira } from './theme';

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length > 1) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  const letters = Array.from(words[0]).filter(letter => /\p{L}/u.test(letter));
  if (letters.length <= 1) return (letters[0] ?? '?').toUpperCase();
  return (letters[0] + (letters.slice(1).find(letter => /[bcdfghjklmnpqrstvwxyz]/i.test(letter)) ?? letters[1])).toUpperCase();
}

export function KassaBusinessHeader({ logo }: { logo: React.ReactNode }) {
  const { user, scope } = useKassaSession();
  return <BusinessHeaderContent key={JSON.stringify([user?.id, scope?.businessId, scope?.branchId])} logo={logo}/>;
}

function BusinessHeaderContent({ logo }: { logo: React.ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, scope } = useKassaSession();
  const { offlineQueue, syncingOfflineSales, offlineMode } = useKassaDemo();
  const { disconnected, connected } = useKassaConnectivity();
  const isOffline = disconnected || offlineMode;
  const [bellOpen, setBellOpen] = useState(false);
  const [alerts, setAlerts] = useState(0);
  const [recent, setRecent] = useState<OfflineCashRecord[]>([]);
  const [notificationError, setNotificationError] = useState('');
  const name = user?.fullName?.trim() || 'Staff member';

  const refresh = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!user || !scope) return;
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
  }, [user, scope]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void refresh(() => active);
    return () => { active = false; };
  }, [refresh]));
  // Recheck the real local queue after an offline cash sale or sync event.
  useEffect(() => {
    let active = true;
    void refresh(() => active);
    return () => { active = false; };
  }, [refresh, offlineQueue?.waiting, syncingOfflineSales]);

  const navigate = (route: Href) => {
    setBellOpen(false);
    router.push(route);
  };

  return <>
    <View style={[s.header, { paddingTop: Math.max(insets.top, 10) + 5 }]}>
      <View style={s.brand}>{logo}</View>
      <View accessible accessibilityLabel={isOffline
        ? 'Offline: no internet or KASSA is using its offline catalogue'
        : connected ? 'Network connected. KASSA server status may differ.'
          : 'Checking internet connection'}
        style={s.networkIcon}>
        <SymbolView name={isOffline
          ? { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' }
          : { ios: 'wifi', android: 'wifi', web: 'wifi' }}
          size={21} tintColor={isOffline ? C.orange : connected ? C.green : C.muted}/>
      </View>
      <Pressable accessibilityRole="button"
        accessibilityLabel={alerts ? 'Notifications, ' + alerts + ' unsynced offline sales' : 'Notifications'}
        accessibilityState={{ expanded: bellOpen }}
        onPress={() => { void refresh(); setBellOpen(true); }}
        style={s.bell}>
        <SymbolView name={{ ios: 'bell', android: 'notifications_none', web: 'notifications_none' }} size={21} tintColor={C.muted}/>
        {alerts > 0 && <View style={s.alertDot}/>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={'Open profile for ' + name}
        onPress={() => navigate('/cashier/profile')} style={s.avatar}>
        <Text style={s.avatarText} numberOfLines={1}>{initials(name)}</Text>
      </Pressable>
    </View>

    <Modal visible={bellOpen} transparent animationType="fade" statusBarTranslucent
      onRequestClose={() => setBellOpen(false)}>
      <View style={s.notificationOverlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button"
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
  brand: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  networkIcon: { width: 35, height: 35, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center' },
  bell: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#F8F9FA',
    justifyContent: 'center', alignItems: 'center' },
  alertDot: { position: 'absolute', right: 6, top: 5, height: 9, width: 9,
    borderRadius: 5, borderWidth: 1, borderColor: C.white, backgroundColor: '#E54848' },
  avatar: { height: 35, width: 35, borderRadius: 18, backgroundColor: '#006045',
    justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#E5F5F0', fontSize: 12, fontWeight: '800' },
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
