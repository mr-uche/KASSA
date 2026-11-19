import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, naira } from './theme';
import { KCard } from './ui';

export const money = (value: string | number | null | undefined) =>
  value == null ? '—' : naira(Number(value));

export function ScreenHeading({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <View style={styles.headingRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {right}
  </View>;
}

export function Tabs<T extends string>({ options, value, onChange }: {
  options: readonly T[]; value: T; onChange(next: T): void;
}) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false}
    style={styles.tabs} contentContainerStyle={styles.tabContent}>
    {options.map(item => <Pressable key={item} accessibilityRole="button"
      accessibilityState={{ selected: item === value }}
      onPress={() => onChange(item)} style={[styles.tab, item === value && styles.tabActive]}>
      <Text style={[styles.tabText, item === value && styles.tabTextActive]}>{item}</Text>
    </Pressable>)}
  </ScrollView>;
}

export function SearchBox({ value, onChangeText, placeholder }: {
  value: string; onChangeText(text: string): void; placeholder: string;
}) {
  return <TextInput autoCapitalize="none" autoCorrect={false}
    accessibilityLabel={placeholder} value={value} onChangeText={onChangeText}
    placeholder={placeholder} placeholderTextColor={C.faint} style={styles.search}/>;
}

export function MetricGrid({ items }: {
  items: { label: string; value: string; note?: string; alert?: boolean }[];
}) {
  return <View style={styles.metrics}>
    {items.map((item, index) => <KCard key={item.label + index} style={styles.metric}>
      <Text style={styles.metricLabel}>{item.label}</Text>
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.65}
        style={[styles.metricValue, item.alert && { color: C.danger }]}>{item.value}</Text>
      {item.note ? <Text style={styles.metricNote}>{item.note}</Text> : null}
    </KCard>)}
  </View>;
}

export function ListHeading({ title, onPress, action = 'View all' }: {
  title: string; onPress?: () => void; action?: string;
}) {
  return <View style={styles.listHeading}>
    <Text style={styles.section}>{title}</Text>
    {onPress && <Pressable accessibilityRole="button" onPress={onPress}>
      <Text style={styles.action}>{action}</Text>
    </Pressable>}
  </View>;
}

export function StatusChip({ label, color = 'green' }: {
  label: string; color?: 'green' | 'orange' | 'red' | 'gray';
}) {
  const colors = color === 'green' ? { bg: C.mint, fg: C.green } :
    color === 'orange' ? { bg: '#FFF2DC', fg: C.orange } :
      color === 'red' ? { bg: '#FDEBEC', fg: C.danger } : { bg: '#F3F4F6', fg: C.muted };
  return <View style={[styles.status, { backgroundColor: colors.bg }]}>
    <Text style={[styles.statusText, { color: colors.fg }]}>{label}</Text>
  </View>;
}

export function RecordRow({ title, subtitle, amount, status, tone, detail, onPress }: {
  title: string; subtitle: string; amount?: string; status?: string; tone?: 'green' | 'orange' | 'red' | 'gray';
  detail?: string; onPress?: () => void;
}) {
  const body = <View style={styles.recordRow}>
    <View style={styles.avatar}><Text style={styles.avatarText}>
      {title.trim().split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || 'KS'}
    </Text></View>
    <View style={styles.recordText}>
      <Text numberOfLines={1} style={styles.recordTitle}>{title}</Text>
      <Text numberOfLines={2} style={styles.recordSubtitle}>{subtitle}</Text>
      {detail ? <Text numberOfLines={1} style={styles.recordDetail}>{detail}</Text> : null}
    </View>
    {(amount !== undefined || status) && <View style={styles.recordRight}>
      {amount !== undefined && <Text style={styles.recordAmount} numberOfLines={1}>{amount}</Text>}
      {!!status && <StatusChip label={status} color={tone}/>}
    </View>}
  </View>;
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.recordPress}>{body}</Pressable>
    : <View style={styles.recordPress}>{body}</View>;
}

export function InlineNotice({ text, warning = false }: { text: string; warning?: boolean }) {
  return <View style={[styles.notice, warning && { borderColor: '#F4D3A4', backgroundColor: '#FFFAEE' }]}>
    <Text style={[styles.noticeText, warning && { color: C.orange }]}>{text}</Text>
  </View>;
}

export function SmallAction({ label, onPress, disabled, secondary }: {
  label: string; onPress(): void; disabled?: boolean; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[styles.smallAction, secondary && styles.secondaryAction, disabled && { opacity: 0.45 }]}>
    <Text style={[styles.smallActionText, secondary && { color: C.green }]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 17 },
  title: { color: C.title, fontSize: 25, fontWeight: '800' },
  subtitle: { color: C.muted, fontSize: 14, marginTop: 5, lineHeight: 20 },
  tabs: { marginBottom: 18 },
  tabContent: { gap: 10, borderBottomWidth: 1, borderBottomColor: C.border, paddingRight: 20 },
  tab: { paddingHorizontal: 10, paddingVertical: 13, minHeight: 42 },
  tabActive: { borderBottomColor: C.green, borderBottomWidth: 2 },
  tabText: { color: C.muted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: C.green },
  search: { minHeight: 44, borderWidth: 1, borderColor: C.border, borderRadius: 9,
    paddingHorizontal: 13, color: C.title, backgroundColor: C.white, fontSize: 14, marginBottom: 14 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metric: { width: '47%', flexGrow: 1, minHeight: 101, padding: 12, marginBottom: 0 },
  metricLabel: { fontSize: 12, color: C.muted },
  metricValue: { fontSize: 21, color: C.title, fontWeight: '800', marginTop: 9 },
  metricNote: { color: C.muted, fontSize: 11, marginTop: 6 },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8,
    alignItems: 'center', marginBottom: 12, marginTop: 9 },
  section: { fontSize: 17, fontWeight: '800', color: C.title },
  action: { fontSize: 13, color: C.green, fontWeight: '800' },
  status: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 15, alignSelf: 'flex-end' },
  statusText: { fontSize: 11, fontWeight: '800' },
  recordPress: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 11, marginBottom: 9 },
  recordRow: { flexDirection: 'row', gap: 10, padding: 12, alignItems: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.mint,
    justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: C.green, fontSize: 11, fontWeight: '800' },
  recordText: { flex: 1, minWidth: 0 },
  recordTitle: { color: C.title, fontSize: 14, fontWeight: '800' },
  recordSubtitle: { color: C.muted, fontSize: 12, marginTop: 4 },
  recordDetail: { color: C.muted, fontSize: 11, marginTop: 3 },
  recordRight: { alignItems: 'flex-end', maxWidth: 105, gap: 7 },
  recordAmount: { color: C.title, fontSize: 13, fontWeight: '800' },
  notice: { borderRadius: 9, borderWidth: 1, borderColor: C.mintBorder,
    backgroundColor: C.mint, padding: 12, marginBottom: 13 },
  noticeText: { fontSize: 13, color: C.greenDark, lineHeight: 19 },
  smallAction: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, minHeight: 40,
    backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  smallActionText: { fontSize: 13, color: C.white, fontWeight: '800' },
  secondaryAction: { backgroundColor: C.white, borderWidth: 1, borderColor: C.mintBorder },
});
