import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { useKassaSession, type KassaScope } from '@/components/kassa-demo/api';
import { C } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';

function keyOf(item: KassaScope | null): string {
  return item ? item.businessId + ':' + item.branchId : '';
}
export default function SwitchBranch() {
  const router = useRouter();
  const session = useKassaSession();
  const store = useKassaDemo();
  const [selected, setSelected] = useState(keyOf(session.scope));
  useEffect(() => { setSelected(keyOf(session.scope)); }, [session.scope?.businessId, session.scope?.branchId]);

  const save = () => {
    const choice = session.scopes.find(item => keyOf(item) === selected);
    if (!choice) { Alert.alert('Select branch', 'Choose an assigned branch first.'); return; }
    if (keyOf(session.scope) === selected) { router.replace('/cashier/profile'); return; }
    if (store.pendingSale) {
      Alert.alert('Pending payment', 'Please resolve the pending payment before switching branches.');
      return;
    }
    const apply = () => { session.selectScope(choice); router.replace('/cashier/profile'); };
    if (store.count > 0) {
      Alert.alert('Switch branch?', 'Switching will clear your current unsaved sale.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: apply },
      ]);
    } else apply();
  };

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <Text style={s.title}>Profile</Text>
    <Text style={s.subtitle}>Account &amp; Settings</Text>
    <Text style={s.label}>SELECT BRANCH</Text>
    <View style={s.list}>
      {session.scopes.length === 0 && <Text style={s.empty}>Sign in to see assigned branches.</Text>}
      {session.scopes.map(item => {
        const active = keyOf(item) === selected;
        return <Pressable accessibilityRole="radio"
          accessibilityState={{ checked: active }}
          accessibilityLabel={item.branchName}
          key={keyOf(item)}
          onPress={() => setSelected(keyOf(item))}
          style={[s.branch, active && s.selectedBranch]}
        >
          <View style={[s.radio, active && s.selectedRadio]}>{active && <View style={s.radioDot}/>}</View>
          <View style={s.branchInfo}>
            <Text style={s.branchName}>{item.branchName}</Text>
            <Text style={s.address} numberOfLines={2}>{item.branchAddress || item.businessName}</Text>
          </View>
        </Pressable>;
      })}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Save selected branch" disabled={!selected}
      onPress={save} style={[s.button, !selected && { opacity: 0.5 }]}>
      <Text style={s.buttonText}>Save</Text>
    </Pressable>
  </KScreen>;
}

const s = StyleSheet.create({
  title: { color: C.title, fontSize: 19, fontWeight: '800' },
  subtitle: { color: C.muted, fontSize: 11, marginTop: 4 },
  label: { color: C.muted, fontSize: 10, fontWeight: '800', marginTop: 29, marginBottom: 14 },
  list: { gap: 10 },
  branch: { flexDirection: 'row', alignItems: 'center', minHeight: 68, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 10, padding: 13 },
  selectedBranch: { backgroundColor: C.mint, borderColor: C.green },
  radio: { width: 18, height: 18, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5D1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  selectedRadio: { borderColor: C.green, borderWidth: 2 },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.green },
  branchInfo: { flex: 1 },
  branchName: { fontSize: 12, fontWeight: '800', color: C.title },
  address: { color: C.muted, fontSize: 10, marginTop: 4 },
  empty: { fontSize: 12, color: C.muted, padding: 12 },
  button: { backgroundColor: C.green, borderRadius: 9, marginTop: 20, alignItems: 'center', padding: 16 },
  buttonText: { color: C.white, fontSize: 13, fontWeight: '800' },
});
