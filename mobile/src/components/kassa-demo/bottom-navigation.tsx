import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useKassaSession } from './api';
import { canAccess } from './access';
import { C } from './theme';

type TabItem = {
  key: 'home' | 'sales' | 'new-sale' | 'products' | 'profile';
  label: string;
  route: Href;
  allowed: boolean;
  active: boolean;
  symbol: React.ComponentProps<typeof SymbolView>['name'];
};

/**
 * KASSA's five-item mobile navigation.
 * The large, raised New Sale action stays in the centre on every main screen.
 * Business/administrative links live in the Profile screen, not a drawer.
 */
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

  const maySell = canAccess(scope, 'Manage sales');
  const mayViewTransactions = canAccess(scope, 'View transactions');
  const mayManageProducts = canAccess(scope, 'Manage products & inventory');

  const tabs: TabItem[] = [
    {
      key: 'home', label: 'Home', route: '/cashier',
      allowed: canAccess(scope, 'View dashboard'),
      active: pathname === '/cashier',
      symbol: { ios: 'house', android: 'home', web: 'home' },
    },
    {
      key: 'sales', label: 'Sales',
      // Cashiers see their own activity; history-only staff can use Transactions.
      route: maySell ? '/cashier/sales' : '/cashier/transactions',
      allowed: maySell || mayViewTransactions,
      active: pathname === '/cashier/sales' || pathname === '/cashier/transactions',
      symbol: { ios: 'list.bullet.rectangle', android: 'receipt_long', web: 'receipt_long' },
    },
    {
      key: 'new-sale', label: 'New sale', route: '/cashier/new-sale',
      allowed: maySell, active: pathname === '/cashier/new-sale',
      symbol: { ios: 'plus', android: 'add', web: 'add' },
    },
    {
      key: 'products', label: 'Products', route: '/cashier/inventory',
      allowed: mayManageProducts, active: pathname === '/cashier/inventory',
      symbol: { ios: 'square.on.square', android: 'inventory_2', web: 'inventory_2' },
    },
    {
      key: 'profile', label: 'Profile', route: '/cashier/profile',
      allowed: true,
      active: ![
        '/cashier', '/cashier/sales', '/cashier/transactions',
        '/cashier/new-sale', '/cashier/inventory',
      ].includes(pathname),
      symbol: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
    },
  ];

  return <View accessibilityRole="tablist"
    style={[s.bar, { height: 83 + Math.max(insets.bottom, 8),
      paddingBottom: Math.max(insets.bottom, 8) }]}>
    {tabs.map(tab => {
      const central = tab.key === 'new-sale';
      return <Pressable key={tab.key} accessibilityRole="tab"
        accessibilityLabel={tab.label + (!tab.allowed ? ', not permitted for this role' : '')}
        accessibilityState={{ selected: tab.active, disabled: !tab.allowed }}
        disabled={!tab.allowed}
        onPress={() => {
          if (!tab.active) router.replace(tab.route);
        }}
        style={[s.item, !central && tab.active && s.selectedItem,
          !tab.allowed && s.disabledItem]}>
        {central ? (
          <View style={s.centerContent}>
            <View style={s.addCircle}>
              <SymbolView name={tab.symbol} size={38} tintColor={C.white}/>
            </View>
            <Text numberOfLines={1} style={s.centerLabel}>{tab.label}</Text>
          </View>
        ) : (
          <>
            <SymbolView name={tab.symbol} size={30}
              tintColor={tab.active ? C.green : C.muted}/>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
              style={[s.label, tab.active && s.selectedLabel]}>{tab.label}</Text>
          </>
        )}
      </Pressable>;
    })}
  </View>;
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingHorizontal: 11, paddingTop: 5, alignItems: 'center',
    overflow: 'visible',
  },
  item: {
    flex: 1, minWidth: 0, minHeight: 74, alignItems: 'center',
    justifyContent: 'center', gap: 7, borderRadius: 17,
  },
  selectedItem: { backgroundColor: '#E8F3EF' },
  disabledItem: { opacity: 0.45 },
  label: { color: C.muted, fontSize: 12, fontWeight: '500', textAlign: 'center' },
  selectedLabel: { color: C.green, fontWeight: '800' },
  centerContent: {
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', top: -17, minWidth: 72,
  },
  addCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.green,
    justifyContent: 'center', alignItems: 'center',
  },
  centerLabel: { color: C.muted, fontSize: 12, marginTop: 5, textAlign: 'center' },
});
