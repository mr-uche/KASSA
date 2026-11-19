import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useKassaDemo } from './store';
import { C } from './theme';

/** Compact connection status. A tap opens sync details, never a separate checkout. */
export function ConnectionStatusPill({ showQueue = false }: { showQueue?: boolean }) {
  const router = useRouter();
  const { offlineMode, catalogSource, syncingOfflineSales, offlineQueue } = useKassaDemo();
  const connecting = !offlineMode && catalogSource !== 'live';
  const syncing = !connecting && !offlineMode && syncingOfflineSales && (offlineQueue?.queued ?? 0) > 0;
  const label = offlineMode ? 'Offline' : connecting ? 'Checking' : syncing ? 'Syncing' : 'Online';
  const tint = offlineMode ? C.orange : connecting ? C.muted : syncing ? C.orange : C.green;
  const pending = offlineQueue?.queued ?? 0;
  const review = offlineQueue?.review ?? 0;
  const describe = offlineMode ? 'Connect internet to sync sales' :
    connecting ? 'Checking connection to KASSA' :
      syncing ? 'Automatically syncing saved sales' :
        pending || review ? 'Some sales still need syncing or review' :
          offlineQueue ? 'All sales synced' : 'Local sync status unavailable';

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label + '. ' + describe + '. View sales sync details'}
        onPress={() => router.push('/cashier/offline-sales')}
        style={styles.pill}
      >
        <SymbolView
          name={offlineMode
            ? { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' }
            : syncing
              ? { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' }
              : { ios: 'wifi', android: 'wifi', web: 'wifi' }}
          size={16}
          tintColor={tint}
        />
        <Text style={[styles.label, { color: tint }]}>{label}</Text>
      </Pressable>
      {showQueue && pending > 0 && (
        <Pressable accessibilityRole="button"
          accessibilityLabel={pending + ' sales waiting to sync. View details'}
          onPress={() => router.push('/cashier/offline-sales')} style={styles.countPill}>
          <Text style={styles.countText}>{pending} to sync</Text>
        </Pressable>
      )}
      {showQueue && review > 0 && (
        <Pressable accessibilityRole="button"
          accessibilityLabel={review + ' sales require review. View details'}
          onPress={() => router.push('/cashier/offline-sales')} style={styles.countPill}>
          <Text style={[styles.countText, { color: C.danger }]}>{review} to review</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.white, borderRadius: 19, paddingHorizontal: 12, paddingVertical: 6 },
  label: { fontSize: 12, fontWeight: '700' },
  countPill: { minHeight: 32, justifyContent: 'center', backgroundColor: C.mint,
    borderColor: C.mintBorder, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10 },
  countText: { color: C.greenDark, fontSize: 12, fontWeight: '700' },
});
