import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '@/components/kassa-demo/theme';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { useKassaSession, type KassaScope } from '@/components/kassa-demo/api';
import { KScreen, KCard } from '@/components/kassa-demo/ui';

export default function SwitchBranch() {
  const router = useRouter();
  const store = useKassaDemo();
  const session = useKassaSession();

  const choose = (choice: KassaScope) => {
    if (store.pendingSale) {
      Alert.alert('Sale awaiting payment', 'Verify or resolve the pending payment before switching branches.');
      return;
    }
    const switchNow = () => {
      session.selectScope(choice);
      router.replace('/cashier');
    };
    if (store.count > 0) {
      Alert.alert('Switch branch?', 'Your current unsaved cart will be cleared.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch branch', onPress: switchNow },
      ]);
    } else switchNow();
  };

  return <KScreen title="Switch branch" subtitle="Choose a branch assigned to your cashier account." back nav={false} showPreviewLabel={false}>
    <KCard>
      {session.scopes.length === 0 && <Text style={{ color: C.muted }}>Sign in to view your assigned branches.</Text>}
      {session.scopes.map(choice => {
        const selected = session.scope?.businessId === choice.businessId &&
          session.scope?.branchId === choice.branchId;
        return <Pressable key={choice.businessId + ':' + choice.branchId}
          accessibilityRole="button"
          onPress={() => choose(choice)}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 17, borderBottomWidth: 1, borderColor: C.border }}>
          <View style={{
            height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: C.green,
            alignItems: 'center', justifyContent: 'center', marginRight: 14,
          }}>
            {selected && <View style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: C.green }} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.title, fontWeight: '700', fontSize: 13 }}>{choice.branchName}</Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{choice.businessName}</Text>
          </View>
          {selected && <Text style={{ color: C.green, fontSize: 11 }}>Selected</Text>}
        </Pressable>;
      })}
    </KCard>
  </KScreen>;
}
