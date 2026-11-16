import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { C } from '@/components/kassa-demo/theme';
import { KScreen } from '@/components/kassa-demo/ui';
import { callSupport, emailSupport, supportHours, whatsAppSupport } from '@/components/kassa-demo/support-contact';

const topics = [
  {
    title: 'How to make a new sale',
    subtitle: 'Add items, apply discounts, take payment',
    icon: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
    answer: 'Open New sale, select the products, tap Continue to payment, review quantities, and choose a payment method. Check the total before completing payment.',
  },
  {
    title: 'Refund or void a sale',
    subtitle: 'Reverse a wrong or cancelled transaction',
    icon: { ios: 'arrow.uturn.backward', android: 'history', web: 'history' },
    answer: 'Refunds and voids are not available from the cashier mobile screen yet. Contact your business manager with the sale reference before taking further action.',
  },
  {
    title: 'Receipt printer not working',
    subtitle: 'Reconnect Bluetooth and reprint receipts',
    icon: { ios: 'printer', android: 'print', web: 'print' },
    answer: 'Check that the printer is switched on, has paper, and is paired with the phone. You can also use the system Print receipt option on a confirmed sale.',
  },
  {
    title: 'Syncing & offline mode',
    subtitle: 'Keep selling when the network drops',
    icon: { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' },
    answer: 'Mobile offline checkout is not enabled yet. Check your internet connection and refresh Products or Sales. Avoid retrying a pending payment without verifying it.',
  },
] as const;

const channels = [
  { title: 'Call us', caption: 'Talk to an agent', icon: { ios: 'phone', android: 'call', web: 'call' }, action: callSupport },
  { title: 'WhatsApp', caption: 'Chat with us', icon: { ios: 'bubble.left', android: 'chat', web: 'chat' }, action: whatsAppSupport },
  { title: 'Email', caption: 'Send a message', icon: { ios: 'envelope', android: 'email', web: 'email' }, action: () => emailSupport() },
] as const;

export default function Help() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  return <KScreen showBrand={false} showPreviewLabel={false}>
    <Text style={s.title}>Profile</Text>
    <Text style={s.subtitle}>Account &amp; Settings</Text>
    <Text style={s.groupLabel}>HELP &amp; SUPPORT</Text>

    <View style={s.channels}>
      {channels.map(ch => <Pressable accessibilityRole="button" key={ch.title} style={s.channel} onPress={ch.action}>
        <View style={s.channelIcon}><SymbolView name={ch.icon} size={21} tintColor={C.green}/></View>
        <Text style={s.channelTitle}>{ch.title}</Text>
        <Text style={s.channelCaption}>{ch.caption}</Text>
      </Pressable>)}
    </View>

    <Text style={s.groupLabel}>FREQUENTLY ASKED</Text>
    <View style={s.faqList}>
      {topics.map(topic => {
        const open = expanded === topic.title;
        return <View key={topic.title} style={s.faqCard}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
            onPress={() => setExpanded(open ? null : topic.title)}
            style={s.faqRow}>
            <View style={s.faqIcon}><SymbolView name={topic.icon} tintColor={C.green} size={19} /></View>
            <View style={s.faqText}>
              <Text style={s.faqTitle}>{topic.title}</Text>
              <Text style={s.faqSubtitle}>{topic.subtitle}</Text>
            </View>
            <SymbolView name={open
              ? { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }
              : { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={C.faint} size={17} />
          </Pressable>
          {open && <Text style={s.answer}>{topic.answer}</Text>}
        </View>;
      })}
    </View>

    <View style={s.hours}>
      <View style={s.statusDot} />
      <View style={{ flex: 1 }}>
        <Text style={s.hoursTitle}>Support information</Text>
        <Text style={s.hoursCaption}>{supportHours || 'Support hours have not been configured'}</Text>
      </View>
    </View>

    <Pressable accessibilityRole="button" style={s.report} onPress={() => emailSupport('KASSA problem report')}>
      <SymbolView name={{ ios: 'exclamationmark.triangle', android: 'report_problem', web: 'report_problem' }} tintColor="#C77721" size={22} />
      <View style={{ flex: 1 }}>
        <Text style={s.reportTitle}>Report a problem</Text>
        <Text style={s.reportCaption}>Describe what happened and request help</Text>
      </View>
      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={17} tintColor={C.faint} />
    </Pressable>

    <Pressable accessibilityRole="button" style={s.chatButton} onPress={() => router.push('/cashier/chat')}>
      <Text style={s.chatButtonText}>Chat with support</Text>
    </Pressable>
    <Text style={s.footer}>Chat opens an automated local support preview.</Text>
  </KScreen>;
}

const s = StyleSheet.create({
  title: { fontSize: 26, color: C.title, fontWeight: '800' },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
  groupLabel: { color: C.muted, fontSize: 20, fontWeight: '800', marginTop: 28, marginBottom: 11 },
  channels: { flexDirection: 'row', gap: 10 },
  channel: { flex: 1, backgroundColor: C.white, borderColor: C.border, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 3, minHeight: 116 },
  channelIcon: { width: 35, height: 35, borderRadius: 18, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  channelTitle: { fontSize: 14, color: C.title, fontWeight: '800' },
  channelCaption: { fontSize: 14, color: C.faint, textAlign: 'center', marginTop: 4 },
  faqList: { gap: 7 },
  faqCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 9 },
  faqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12 },
  faqIcon: { width: 31, height: 31, borderRadius: 16, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  faqText: { flex: 1, minWidth: 0 },
  faqTitle: { color: C.title, fontWeight: '800', fontSize: 14 },
  faqSubtitle: { color: C.muted, fontSize: 14, marginTop: 3 },
  answer: { color: C.text, fontSize: 14, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 13 },
  hours: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.mint, borderWidth: 1, borderColor: C.mintBorder, borderRadius: 10, padding: 15, marginTop: 19 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  hoursTitle: { color: C.title, fontSize: 14, fontWeight: '800' },
  hoursCaption: { color: C.muted, fontSize: 14, marginTop: 3 },
  report: { backgroundColor: C.white, borderColor: C.border, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 13 },
  reportTitle: { fontSize: 14, fontWeight: '800', color: C.title },
  reportCaption: { fontSize: 14, color: C.muted, marginTop: 3 },
  chatButton: { borderRadius: 9, marginTop: 18, backgroundColor: C.green, paddingVertical: 16, alignItems: 'center' },
  chatButtonText: { color: C.white, fontSize: 14, fontWeight: '800' },
  footer: { textAlign: 'center', color: C.faint, fontSize: 14, marginTop: 18 },
});
