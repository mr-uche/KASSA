import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { C, naira } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import { useKassaDemo } from '@/components/kassa-demo/store';

// Placeholder figures based on the cashier Figma screen; not backend sales data.
const recentSales = [
  { id: '1048', items: 2, time: '10:42 AM', amount: 12500 },
  { id: '1047', items: 1, time: '10:31 AM', amount: 4800 },
] as const;

const quickActions = [
  { label: 'Scan product', route: '/cashier/scan-product', icon: { ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' } },
  { label: 'Find product', route: '/cashier/products', icon: { ios: 'magnifyingglass', android: 'search', web: 'search' } },
  { label: 'My sales', route: '/cashier/sales', icon: { ios: 'list.bullet', android: 'receipt_long', web: 'receipt_long' } },
] as const;

export default function CashierHome() {
  const router = useRouter();
  const { branch, count } = useKassaDemo();
  const go = (path: string) => router.push(path as Href);

  return (
    <KScreen showBrand={false} showPreviewLabel={false}>
      <Text style={s.greeting}>Good morning, Ifeoma</Text>
      <Text style={s.intro}>Ready to make today's sales quick and easy.</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start a new sale"
        onPress={() => go('/cashier/new-sale')}
        style={s.saleBanner}
      >
        <View style={s.bannerCopy}>
          <Text style={s.bannerEyebrow}>POINT OF SALE</Text>
          <Text style={s.bannerTitle}>Start a new sale</Text>
          <Text style={s.bannerDescription}>Scan products and checkout customers.</Text>
        </View>
        <View style={s.bannerAdd}>
          <SymbolView
            name={{ ios: 'plus', android: 'add', web: 'add' }}
            size={27}
            tintColor={C.green}
          />
        </View>
      </Pressable>

      <View style={s.sectionHeading}>
        <Text style={s.sectionTitle}>Today's Activity</Text>
        <Text style={s.sampleTag}>Sample data</Text>
      </View>
      <View style={s.activityRow}>
        <View style={s.activityCard}>
          <Text style={s.cardLabel}>My sales</Text>
          <View style={s.activityValueRow}>
            <Text style={s.activityNumber}>24</Text>
            <Text style={s.cardNote}>transactions</Text>
          </View>
        </View>
        <View style={s.activityCard}>
          <Text style={s.cardLabel}>Amount received</Text>
          <Text style={s.activityNumber}>{naira(186500)}</Text>
          <Text style={s.today}>Today</Text>
        </View>
      </View>

      <Text style={[s.sectionTitle, s.actionsHeading]}>Quick Actions</Text>
      <View style={s.actionsRow}>
        {quickActions.map(action => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={s.quickAction}
            onPress={() => go(action.route)}
          >
            <View style={s.actionIcon}>
              <SymbolView name={action.icon} size={19} tintColor={C.green} />
            </View>
            <Text style={s.actionText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[s.sectionHeading, s.recentHeading]}>
        <Text style={s.sectionTitle}>Recent Sales</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all sales"
          onPress={() => go('/cashier/sales')}
        >
          <Text style={s.viewAll}>View all</Text>
        </Pressable>
      </View>

      {recentSales.map(sale => (
        <View key={sale.id} style={s.recentCard}>
          <View style={s.saleBadge}>
            <Text style={s.saleBadgeText}>TX</Text>
          </View>
          <View style={s.recentDetails}>
            <Text style={s.recentName}>Sale #{sale.id}</Text>
            <Text style={s.recentMeta}>
              {sale.items} {sale.items === 1 ? 'item' : 'items'} • {sale.time}
            </Text>
          </View>
          <View style={s.recentAmountColumn}>
            <Text style={s.recentAmount}>{naira(sale.amount)}</Text>
            <Text style={s.paid}>Paid</Text>
          </View>
        </View>
      ))}

      {count > 0 && (
        <Pressable onPress={() => go('/cashier/new-sale')} style={s.resumeSale}>
          <Text style={s.resumeText}>Resume current sale ({count} items)</Text>
          <Text style={s.resumeArrow}>›</Text>
        </Pressable>
      )}

      <Pressable onPress={() => go('/cashier/switch-branch')} style={s.branchLink}>
        <Text style={s.branchText}>Current branch: {branch}</Text>
        <Text style={s.branchAction}>Switch ›</Text>
      </Pressable>
    </KScreen>
  );
}

const s = StyleSheet.create({
  greeting: { color: C.title, fontSize: 28, fontWeight: '800', letterSpacing: -0.45 },
  intro: { color: C.muted, fontSize: 14, marginTop: 5, marginBottom: 22 },
  saleBanner: {
    backgroundColor: C.green, borderRadius: 13, paddingHorizontal: 20, paddingVertical: 19,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  bannerCopy: { flex: 1, paddingRight: 8 },
  bannerEyebrow: { color: '#D4F1E7', fontSize: 14, fontWeight: '800', letterSpacing: 0.6 },
  bannerTitle: { color: C.white, fontSize: 25, fontWeight: '800', marginTop: 6 },
  bannerDescription: { color: '#D4F1E7', fontSize: 14, marginTop: 5 },
  bannerAdd: {
    width: 49, height: 49, borderRadius: 25, backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionHeading: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 24, marginBottom: 13,
  },
  sectionTitle: { color: C.title, fontSize: 20, fontWeight: '800' },
  sampleTag: { color: C.faint, fontSize: 14 },
  activityRow: { flexDirection: 'row', gap: 12 },
  activityCard: {
    flex: 1, backgroundColor: C.white, borderColor: C.border,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 18, minHeight: 94, justifyContent: 'center',
  },
  cardLabel: { color: C.muted, fontSize: 14 },
  activityValueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 5, marginTop: 9 },
  activityNumber: { color: C.title, fontSize: 24, fontWeight: '800', marginTop: 8 },
  cardNote: { color: C.muted, fontSize: 14 },
  today: { color: C.green, fontSize: 14, marginTop: 6 },
  actionsHeading: { marginTop: 24, marginBottom: 13 },
  actionsRow: { flexDirection: 'row', gap: 9 },
  quickAction: {
    flex: 1, minHeight: 103, backgroundColor: C.white, borderColor: C.border,
    borderWidth: 1, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  actionIcon: {
    width: 37, height: 37, borderRadius: 19, backgroundColor: C.mint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  actionText: { color: C.title, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  recentHeading: { marginTop: 31 },
  viewAll: { color: C.green, fontSize: 14, fontWeight: '700' },
  recentCard: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border,
    backgroundColor: C.white, borderRadius: 11, paddingVertical: 16,
    paddingHorizontal: 11, marginBottom: 9,
  },
  saleBadge: { backgroundColor: C.mint, borderRadius: 23, width: 35, height: 35, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  saleBadgeText: { color: C.green, fontSize: 14, fontWeight: '800' },
  recentDetails: { flex: 1 },
  recentName: { color: C.title, fontWeight: '800', fontSize: 14 },
  recentMeta: { color: C.faint, fontSize: 14, marginTop: 4 },
  recentAmountColumn: { alignItems: 'flex-end' },
  recentAmount: { color: C.title, fontSize: 14, fontWeight: '800' },
  paid: { color: C.green, fontSize: 14, marginTop: 3 },
  resumeSale: { marginTop: 13, borderWidth: 1, borderColor: C.mintBorder, borderRadius: 11, backgroundColor: C.mint, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resumeText: { color: C.green, fontSize: 14, fontWeight: '800' },
  resumeArrow: { color: C.green, fontSize: 24 },
  branchLink: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingVertical: 12 },
  branchText: { color: C.muted, fontSize: 14 },
  branchAction: { color: C.green, fontSize: 14, fontWeight: '700' },
});
