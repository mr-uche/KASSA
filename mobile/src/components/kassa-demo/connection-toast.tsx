import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useKassaSession } from './api';
import { useKassaConnectivity } from './connectivity';
import { useKassaDemo } from './store';
import { C } from './theme';

type ConnectionState = 'online' | 'offline';
type ConnectionNotice = { state: ConnectionState; title: string; detail: string };

/** Transient in-app notification rather than a persistent connection-status row. */
export function KassaConnectionToast() {
  const { scope } = useKassaSession();
  const { disconnected } = useKassaConnectivity();
  const { offlineMode, catalogSource, offlineQueue } = useKassaDemo();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<ConnectionNotice | null>(null);
  const last = useRef<{ scope: string; state: ConnectionState | null } | null>(null);

  // A live catalogue demonstrates that Kassa's API was reachable. Merely
  // having a network signal does not justify an "Online" notification.
  const state: ConnectionState | null = disconnected || offlineMode ? 'offline' :
    catalogSource === 'live' ? 'online' : null;
  const key = scope ? scope.businessId + ':' + scope.branchId : '';

  useEffect(() => {
    if (!scope) {
      last.current = null;
      setNotice(null);
      return;
    }
    if (!last.current || last.current.scope !== key) {
      last.current = { scope: key, state: null };
      setNotice(null);
    }
    if (!state || last.current.state === state) return;
    const wasOffline = last.current.state === 'offline';
    last.current.state = state;
    setNotice(state === 'offline'
      ? {
          state,
          title: 'Kassa is offline',
          detail: 'Saved cash sales will sync when connected. Check that cached stock is current before selling.',
        }
      : {
          state,
          title: wasOffline ? 'Back online' : 'Kassa is online',
          detail: 'Connected to Kassa.' +
            ((offlineQueue?.waiting ?? 0) > 0
              ? ' Some saved sales still need syncing or review; check the notification bell.'
              : ''),
        });
  }, [key, scope, state]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), notice.state === 'offline' ? 5500 : 3800);
    return () => clearTimeout(timeout);
  }, [notice]);

  if (!scope || !notice) return null;

  return <View pointerEvents="box-none" style={[s.host, { top: Math.max(insets.top, 10) + 68 }]}>
    <View style={[s.toast, notice.state === 'offline' && s.offline]}>
      <View style={s.iconBox}>
        <SymbolView name={notice.state === 'offline'
          ? { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' }
          : { ios: 'wifi', android: 'wifi', web: 'wifi' }}
          size={20} tintColor={notice.state === 'offline' ? C.orange : C.green}/>
      </View>
      <View style={s.content}>
        <Text style={s.title}>{notice.title}</Text>
        <Text style={s.detail}>{notice.detail}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss connection notification"
        onPress={() => setNotice(null)} style={s.dismiss}>
        <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }}
          size={17} tintColor={C.muted}/>
      </Pressable>
    </View>
  </View>;
}

const s = StyleSheet.create({
  host: { position: 'absolute', left: 14, right: 14, zIndex: 60, elevation: 20 },
  toast: { flexDirection: 'row', alignItems: 'flex-start', gap: 11,
    borderWidth: 1, borderColor: C.mintBorder, borderLeftWidth: 4, borderLeftColor: C.green,
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 11,
    backgroundColor: C.white, elevation: 9 },
  offline: { borderLeftColor: C.orange, borderColor: '#F4D3A4' },
  iconBox: { paddingTop: 2, width: 24 },
  content: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '800', color: C.title },
  detail: { marginTop: 4, color: C.muted, fontSize: 12, lineHeight: 17 },
  dismiss: { padding: 4 },
});
