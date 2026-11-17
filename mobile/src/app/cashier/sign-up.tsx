import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '@/components/kassa-demo/theme';
import { KButton, KField, KScreen } from '@/components/kassa-demo/ui';
import {
  useKassaSession, registerMerchantUser, onboardMerchantBusiness,
  type MerchantRegistration,
} from '@/components/kassa-demo/api';

const businessTypes = ['Retail store', 'Pharmacy', 'Restaurant / Food', 'Services', 'Other'] as const;

export default function SignUp() {
  const router = useRouter();
  const session = useKassaSession();
  const registered = useRef<Pick<MerchantRegistration, 'email' | 'password'> | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<string>('Retail store');
  const [branchName, setBranchName] = useState('Main Branch');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async () => {
    if (busy) return;
    const details: MerchantRegistration = {
      fullName, email: registered.current?.email ?? email,
      password: registered.current?.password ?? password,
      phone, businessName, businessType, branchName,
      bankName, bankAccountNumber, bankAccountName,
    };
    if (!businessName.trim() || businessName.trim().length > 150 ||
        !branchName.trim() || branchName.trim().length > 120 ||
        !fullName.trim() || fullName.trim().length > 120 ||
        !/^\S+@\S+\.\S+$/.test(details.email.trim()) ||
        details.password.length < 12 || details.password.length > 128 ||
        (!registered.current && details.password !== confirmation)) {
      setError('Enter your business, branch, name, valid email and matching password of at least 12 characters.');
      return;
    }
    if ((bankName.trim() || bankAccountNumber.trim() || bankAccountName.trim()) &&
        (!bankName.trim() || !/^\d{10}$/.test(bankAccountNumber) || !bankAccountName.trim())) {
      setError('For bank setup, enter the bank name, 10-digit number and account holder name, or leave all three blank.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!registered.current) {
        await registerMerchantUser(details);
        registered.current = { email: details.email, password: details.password };
      }
      await onboardMerchantBusiness(details);
      const scopes = await session.signIn(details.email, details.password);
      if (scopes.length === 1) router.replace('/cashier');
      else router.replace('/login');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not complete account setup.';
      setError(message);
      if (registered.current) {
        setNotice('Your account was created. Business setup was not completed; tap Retry setup. Do not register again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return <KScreen title="Create your account" subtitle="Set up your business to start using KASSA."
    showBrand={false} showPreviewLabel={false} nav={false} back>
    <View style={s.banner}>
      <Text style={s.bannerText}>Your business account will be connected to the same KASSA backend used by the website.</Text>
    </View>
    <KField label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="e.g. Adebola Pharmacy"/>
    <Text style={s.label}>Business type</Text>
    <View style={s.types}>
      {businessTypes.map(item => <Pressable key={item} accessibilityRole="button"
        accessibilityState={{ selected: item === businessType }} onPress={() => setBusinessType(item)}
        style={[s.type, item === businessType && s.typeSelected]}>
        <Text style={[s.typeText, item === businessType && s.typeTextSelected]}>{item}</Text>
      </Pressable>)}
    </View>
    <KField label="First branch name" value={branchName} onChangeText={setBranchName} placeholder="Main Branch"/>
    <Text style={s.label}>Business receiving account (optional)</Text>
    <Text style={[s.helper, { textAlign: 'left', marginTop: 0, marginBottom: 12 }]}>
      Customers pay your bank directly. You can also add accounts later in Owner Settings on the web.
    </Text>
    <KField label="Bank name" value={bankName} onChangeText={setBankName} placeholder="Any Nigerian bank"/>
    <KField label="Account number" value={bankAccountNumber}
      onChangeText={v => setBankAccountNumber(v.replace(/\D/g, '').slice(0, 10))}
      keyboardType="number-pad" placeholder="10-digit account number"/>
    <KField label="Account holder name" value={bankAccountName}
      onChangeText={setBankAccountName} placeholder="Name on the receiving account"/>
    <Text style={[s.helper, { textAlign: 'left', marginTop: 0, marginBottom: 18 }]}>
      Account name is owner-supplied, not bank-verified. No funds pass through KASSA.
    </Text>
    <KField label="Your full name" value={fullName} onChangeText={setFullName} placeholder="Enter your full name"/>
    <KField label="Phone number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+234..."/>
    <KField label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com"/>
    <KField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!visible} placeholder="Minimum 12 characters"/>
    <KField label="Confirm password" value={confirmation} onChangeText={setConfirmation} secureTextEntry={!visible} placeholder="Re-enter password"/>
    <Pressable accessibilityRole="button" onPress={() => setVisible(value => !value)} style={s.toggle}>
      <Text style={s.link}>{visible ? 'Hide passwords' : 'Show passwords'}</Text>
    </Pressable>
    {notice ? <Text style={s.notice}>{notice}</Text> : null}
    {error ? <Text style={s.error}>{error}</Text> : null}
    <KButton text={busy ? 'Setting up…' : registered.current ? 'Retry setup' : 'Create account'}
      disabled={busy} onPress={() => { void submit(); }}/>
    <Text style={s.helper}>Registration uses email and password. Google and Apple sign-up are not enabled.</Text>
    <Pressable onPress={() => router.replace('/login')} style={s.login} accessibilityRole="button">
      <Text style={s.loginText}>Already have an account? <Text style={s.link}>Log in</Text></Text>
    </Pressable>
  </KScreen>;
}

const s = StyleSheet.create({
  banner: { backgroundColor: C.mint, borderColor: C.mintBorder, borderWidth: 1, borderRadius: 11, padding: 14, marginBottom: 22 },
  bannerText: { fontSize: 14, color: C.greenDark, lineHeight: 21 },
  label: { fontSize: 14, color: C.title, fontWeight: '800', marginBottom: 10 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  type: { borderColor: C.border, borderWidth: 1, borderRadius: 22, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: C.white },
  typeSelected: { backgroundColor: C.green, borderColor: C.green },
  typeText: { color: C.text, fontSize: 14 },
  typeTextSelected: { color: C.white, fontWeight: '800' },
  toggle: { alignSelf: 'flex-end', paddingVertical: 7, marginBottom: 12 },
  link: { color: C.green, fontWeight: '800', fontSize: 14 },
  error: { color: C.danger, fontSize: 14, marginBottom: 13, lineHeight: 20 },
  notice: { color: C.orange, fontSize: 14, marginBottom: 13, lineHeight: 20 },
  helper: { color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 19, textAlign: 'center' },
  login: { alignItems: 'center', paddingVertical: 22 },
  loginText: { color: C.muted, fontSize: 14 },
});
