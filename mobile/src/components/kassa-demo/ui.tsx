import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';
import { SymbolView } from 'expo-symbols';
import KassaBackground from '@/components/KassaBackground';
import { KassaBusinessHeader } from './business-header';
import { useKassaSession } from './api';

export function KassaLogo({ compact = false }: { compact?: boolean }) {
  return <View style={s.brand}>
    <Image source={require('../../../assets/images/logo.png')} style={[s.logo, compact && { width: 31, height: 31 }]} resizeMode="contain" />
    <Text style={[s.brandText, compact && { fontSize: 23 }]}>KASSA</Text>
  </View>;
}

export function KScreen({ title, subtitle, children, nav = true, back = false, showBrand = true, showPreviewLabel = true }: { title?: string; subtitle?: string; children: React.ReactNode; nav?: boolean; back?: boolean; showBrand?: boolean; showPreviewLabel?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { scope } = useKassaSession();
  // Auth screens remain unchanged; business pages share one consistent header.
  const headerVisible = nav && !!scope && pathname.startsWith('/cashier') && pathname !== '/cashier/sign-up';
  const standaloneBrand = showBrand && !headerVisible;
  return <KassaBackground><View style={s.screen}>
    {headerVisible && <KassaBusinessHeader logo={<KassaLogo compact />}/>}
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: headerVisible ? 12 : Math.max(insets.top, 12) + 14, paddingBottom: 36, paddingHorizontal: 24, flexGrow: 1 }}>
      {back ? <Pressable onPress={() => router.back()} style={{ marginBottom: 20, alignSelf: 'flex-start' }}><Text style={{ color: C.green, fontWeight: '700' }}>‹  Back</Text></Pressable> : null}
      {standaloneBrand ? <KassaLogo compact /> : null}
      {title ? <Text style={s.title}>{title}</Text> : null}
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      <View style={{ marginTop: title ? 22 : standaloneBrand ? 28 : 0 }}>{children}</View>
      {showPreviewLabel ? <Text style={s.demoLabel}>KASSA SCREEN PREVIEW  ·  SAMPLE DATA ONLY</Text> : null}
    </ScrollView>
  </View></KassaBackground>;
}

export function KCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function KButton({ text, onPress, disabled = false, variant = 'primary' }: { text: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'outline' | 'subtle' }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, variant === 'outline' && s.outlineButton, variant === 'subtle' && s.subtleButton, disabled && { opacity: 0.45 }]}>
    <Text style={[s.buttonText, variant !== 'primary' && { color: C.green }]}>{text}</Text>
  </Pressable>;
}
export function KField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType }: { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string; secureTextEntry?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' }) {
  return <View style={{ marginBottom: 19 }}>
    <Text style={s.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.faint} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} style={s.field} />
  </View>;
}
export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><Text style={s.section}>{children}</Text>{right}</View>;
}
export function KTag({ text, selected = false, onPress }: { text: string; selected?: boolean; onPress?: () => void }) {
  return <Pressable onPress={onPress} disabled={!onPress} style={[s.tag, selected && s.tagSelected]}><Text style={[s.tagText, selected && { color: '#FFFFFF' }]}>{text}</Text></Pressable>;
}
export function KLinkRow({ title, subtitle, onPress, symbol = '›' }: { title: string; subtitle?: string; onPress: () => void; symbol?: string }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.linkRow}><View style={{ flex: 1 }}><Text style={s.linkTitle}>{title}</Text>{subtitle && <Text style={s.linkSubtitle}>{subtitle}</Text>}</View><Text style={{ fontSize: 24, color: C.green }}>{symbol}</Text></Pressable>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  logo: { width: 55, height: 55 }, brandText: { fontWeight: '800', color: C.green, fontSize: 28, letterSpacing: 0.5 },
  title: { fontSize: 30, fontWeight: '800', color: C.title, marginTop: 24 },
  subtitle: { fontSize: 14, color: C.muted, lineHeight: 22, marginTop: 6 },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 17, marginBottom: 14 },
  section: { fontSize: 20, color: C.title, fontWeight: '800' },
  label: { fontSize: 14, color: C.text, fontWeight: '700', marginBottom: 9 },
  field: { height: 51, borderRadius: 9, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: C.white, paddingHorizontal: 15, fontSize: 14, color: C.title },
  button: { borderRadius: 10, minHeight: 52, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: C.green, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  buttonText: { color: C.white, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  outlineButton: { backgroundColor: C.white, borderWidth: 1, borderColor: C.green },
  subtleButton: { backgroundColor: C.mint },
  tag: { borderRadius: 24, borderWidth: 1, borderColor: C.mintBorder, paddingVertical: 9, paddingHorizontal: 15, backgroundColor: C.white, marginRight: 7 },
  tagSelected: { backgroundColor: C.green, borderColor: C.green }, tagText: { fontSize: 14, color: C.text, fontWeight: '600' },
  linkRow: { borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkTitle: { fontSize: 14, fontWeight: '700', color: C.title }, linkSubtitle: { fontSize: 14, color: C.muted, paddingTop: 5 },
  demoLabel: { fontSize: 12, color: C.faint, marginTop: 42, textAlign: 'center', letterSpacing: 0.6 },
});
