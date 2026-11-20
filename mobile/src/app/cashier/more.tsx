import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { KScreen } from '@/components/kassa-demo/ui';
import { useKassaSession } from '@/components/kassa-demo/api';
import { canAccess } from '@/components/kassa-demo/access';
import { C } from '@/components/kassa-demo/theme';

type Item = { label: string; subtitle: string; route: Href;
  permission?: string; icon: React.ComponentProps<typeof SymbolView>['name'] };
const shortcuts: Item[] = [
  {
    label: 'Products & Inventory', subtitle: 'Catalogue, categories and stock',
    route: '/cashier/inventory', permission: 'Manage products & inventory',
    icon: { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' },
  },
  {
    label: 'Staff & Branches', subtitle: 'Team, branches and permitted roles',
    route: '/cashier/staff-branches', permission: 'Manage staff & branches',
    icon: { ios: 'person.3', android: 'groups', web: 'groups' },
  },
  {
    label: 'Reports & Analytics', subtitle: 'Sales reports and activity trends',
    route: '/cashier/reports', permission: 'View reports & analytics',
    icon: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
  },
  {
    label: 'Customers', subtitle: 'Customer-linked transaction records',
    route: '/cashier/customers', permission: 'Manage customers',
    icon: { ios: 'person.2', android: 'people', web: 'people' },
  },
  {
    label: 'Business settings', subtitle: 'Business configuration and preferences',
    route: '/cashier/settings', permission: 'Manage business settings',
    icon: { ios: 'gearshape', android: 'settings', web: 'settings' },
  },
  {
    label: 'Offline sales', subtitle: 'Review cash sales awaiting sync',
    route: '/cashier/offline-sales', permission: 'Manage sales',
    icon: { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' },
  },
  {
    label: 'Help & Support', subtitle: 'Get assistance with KASSA',
    route: '/cashier/help',
    icon: { ios: 'questionmark.circle', android: 'help_outline', web: 'help_outline' },
  },
];

export default function More() {
  const router = useRouter();
  const { scope } = useKassaSession();
  const available = shortcuts.filter(item => !item.permission || canAccess(scope, item.permission))
    .filter(item => item.route !== '/cashier/customers' ||
      canAccess(scope, 'View transactions'));

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <Text style={s.heading}>More</Text>
    <Text style={s.subtitle}>Choose an area you have permission to access.</Text>
    <View style={s.list}>
      {available.map(item => <Pressable key={item.label}
        accessibilityRole="button" accessibilityLabel={item.label}
        onPress={() => router.push(item.route)} style={s.row}>
        <View style={s.icon}>
          <SymbolView name={item.icon} size={21} tintColor={C.green}/>
        </View>
        <View style={s.copy}>
          <Text style={s.name}>{item.label}</Text>
          <Text style={s.detail}>{item.subtitle}</Text>
        </View>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={C.faint} size={17}/>
      </Pressable>)}
    </View>
  </KScreen>;
}

const s = StyleSheet.create({
  heading: { fontSize: 27, fontWeight: '800', color: C.title },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 6, marginBottom: 20 },
  list: { gap: 9 },
  row: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, minHeight: 68, paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.mint,
    justifyContent: 'center', alignItems: 'center' },
  copy: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '800', color: C.title },
  detail: { color: C.muted, fontSize: 11, marginTop: 4 },
});
