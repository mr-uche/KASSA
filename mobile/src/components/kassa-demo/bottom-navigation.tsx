import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useKassaSession } from './api';
import { canAccess } from './access';
import { C } from './theme';

type NavEntry = {
  label: string;
  route: Href;
  active: boolean;
  icon: React.ComponentProps<typeof SymbolView>['name'];
};

/** Primary KASSA navigation. Hidden on authentication and active checkout steps. */
export function KassaBottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { scope } = useKassaSession();
  const insets = useSafeAreaInsets();
  if (!scope) return null;

  const mainScreens = [
    '/cashier', '/cashier/new-sale', '/cashier/sales', '/cashier/transactions',
    '/cashier/more', '/cashier/profile', '/cashier/reports', '/cashier/inventory',
    '/cashier/staff-branches', '/cashier/settings', '/cashier/customers',
    '/cashier/help', '/cashier/offline-sales',
  ];
  if (!mainScreens.includes(pathname)) return null;

  const canSell = canAccess(scope, 'Manage sales');
  const canSeeTransactions = canAccess(scope, 'View transactions');
  const moreSelected = [
    '/cashier/more', '/cashier/reports', '/cashier/inventory',
    '/cashier/staff-branches', '/cashier/settings', '/cashier/customers',
    '/cashier/help', '/cashier/offline-sales',
  ].includes(pathname);
  const entries: NavEntry[] = [];
  if (canAccess(scope, 'View dashboard')) entries.push({
    label: 'Home', route: '/cashier', active: pathname === '/cashier',
    icon: { ios: 'house', android: 'home', web: 'home' },
  });
  if (canSell) entries.push({
    label: 'New sale', route: '/cashier/new-sale',
    active: pathname === '/cashier/new-sale',
    icon: { ios: 'plus.circle', android: 'add_circle', web: 'add_circle' },
  });
  if (canSeeTransactions) entries.push({
    label: 'Transactions', route: '/cashier/transactions',
    active: pathname === '/cashier/transactions',
    icon: { ios: 'list.bullet.rectangle', android: 'receipt_long', web: 'receipt_long' },
  });
  else if (canSell) entries.push({
    label: 'My sales', route: '/cashier/sales',
    active: pathname === '/cashier/sales',
    icon: { ios: 'list.bullet', android: 'receipt', web: 'receipt' },
  });
  entries.push({
    label: 'More', route: '/cashier/more', active: moreSelected,
    icon: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' },
  }, {
    label: 'Profile', route: '/cashier/profile', active: pathname === '/cashier/profile',
    icon: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  });

  return <View accessibilityRole="tablist"
    style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
    {entries.map(item => <Pressable key={item.label} accessibilityRole="tab"
      accessibilityLabel={item.label} accessibilityState={{ selected: item.active }}
      onPress={() => { if (!item.active) router.replace(item.route); }}
      style={s.item}>
      <View style={[s.iconWrap, item.active && s.activeIcon]}>
        <SymbolView name={item.icon} size={20}
          tintColor={item.active ? C.green : C.muted}/>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}
        style={[s.label, item.active && s.activeLabel]}>{item.label}</Text>
    </Pressable>)}
  </View>;
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 63,
    paddingTop: 7, paddingHorizontal: 9, backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border },
  item: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center',
    minHeight: 50, gap: 2 },
  iconWrap: { width: 39, height: 29, alignItems: 'center', justifyContent: 'center',
    borderRadius: 16 },
  activeIcon: { backgroundColor: C.mint },
  label: { fontSize: 10, color: C.muted, fontWeight: '600' },
  activeLabel: { color: C.green, fontWeight: '800' },
});
