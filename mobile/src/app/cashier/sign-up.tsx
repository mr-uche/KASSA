import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '@/components/kassa-demo/theme';
import { KButton, KCard, KField, KScreen } from '@/components/kassa-demo/ui';
import {
  useKassaSession, registerMerchantUser, onboardMerchantBusiness,
  type MerchantRegistration, type MerchantBranchDraft, type MerchantStaffDraft,
} from '@/components/kassa-demo/api';

const businessTypes = ['Pharmacy', 'Retail store', 'Restaurant / Food', 'Salon & Spa', 'Supermarket', 'Other'];
const roles = ['Cashier', 'Branch manager', 'Admin', 'Owner'];
const titles = ['Business info', 'Branches', 'Receiving account', 'Invite staff'];
type BranchInput = { name: string; address: string; phone: string };
type StaffInput = { fullName: string; role: string; phone: string };

/** A small mobile-native dropdown that reuses the existing KASSA input and card palette. */
function ChoiceField({ label, value, options, onSelect, placeholder }: {
  label: string;
  value: string;
  options: readonly string[];
  onSelect(value: string): void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return <View style={s.choiceWrap}>
    <Text style={s.fieldLabel}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
      accessibilityLabel={label + ': ' + (value || 'not selected')}
      onPress={() => setOpen(previous => !previous)} style={s.choice}>
      <Text style={[s.choiceValue, !value && { color: C.faint }]}>{value || placeholder || 'Select'}</Text>
      <Text style={s.chevron}>{open ? '⌃' : '⌄'}</Text>
    </Pressable>
    {open && <View style={s.options}>
      {options.map(option => (
        <Pressable key={option} accessibilityRole="button"
          accessibilityState={{ selected: value === option }}
          onPress={() => { onSelect(option); setOpen(false); }}
          style={[s.option, value === option && s.optionSelected]}>
          <Text style={[s.optionText, value === option && { color: C.green, fontWeight: '800' }]}>{option}</Text>
        </Pressable>
      ))}
    </View>}
  </View>;
}

export default function SignUp() {
  const router = useRouter();
  const session = useKassaSession();
  // Credentials stay in memory. They are never put in navigation URLs or local storage.
  const registered = useRef<Pick<MerchantRegistration, 'email' | 'password'> | null>(null);

  // Account creation is the entry screen. The four screenshots follow in order.
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [staffCount, setStaffCount] = useState('');
  const [branches, setBranches] = useState<BranchInput[]>([
    { name: 'Main Branch', address: '', phone: '' },
  ]);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [staff, setStaff] = useState<StaffInput[]>([
    { fullName: '', role: 'Cashier', phone: '' },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const updateBranch = (index: number, key: keyof BranchInput, value: string) => {
    setBranches(items => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  };
  const updateStaff = (index: number, key: keyof StaffInput, value: string) => {
    setStaff(items => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  };

  function validate(target: number): string | null {
    if (target === 0) {
      if (!fullName.trim() || fullName.trim().length > 120) return 'Enter your full name (maximum 120 characters).';
      if (phone.trim().length > 32) return 'Phone number is too long.';
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address.';
      if (password.length < 12 || password.length > 128) return 'Use a password of 12–128 characters.';
      if (password !== confirmation) return 'Your passwords do not match.';
    }
    if (target === 1) {
      if (!businessName.trim() || businessName.trim().length > 150) return 'Enter a business name of up to 150 characters.';
      if (!businessType) return 'Select your business type.';
      if (registeredName.trim().length > 200) return 'Registered name cannot exceed 200 characters.';
      if (staffCount.trim() && (!/^\d{1,6}$/.test(staffCount.trim()) || Number(staffCount) > 100000)) {
        return 'Enter a valid number of staff, up to 100,000.';
      }
    }
    if (target === 2) {
      if (!branches.length || branches.length > 20) return 'Set up between 1 and 20 branches.';
      if (branches.some(branch => !branch.name.trim() || branch.name.trim().length > 120 ||
        branch.address.trim().length > 300 || branch.phone.trim().length > 32)) {
        return 'Each branch needs a valid name. Check the address and phone lengths.';
      }
      if (new Set(branches.map(branch => branch.name.trim().toLowerCase())).size !== branches.length) {
        return 'Give each branch a different name.';
      }
    }
    if (target === 3) {
      const anyBankField = !!(bankName.trim() || bankAccountNumber.trim() || bankAccountName.trim());
      if (anyBankField && (!bankName.trim() || bankName.trim().length > 100 ||
        !/^\d{10}$/.test(bankAccountNumber) ||
        !bankAccountName.trim() || bankAccountName.trim().length > 150)) {
        return 'Enter the receiving bank, 10-digit account number and account holder name—or leave all three blank.';
      }
    }
    if (target === 4) {
      if (staff.length > 50) return 'You can add up to 50 staff drafts.';
      if (staff.some(member => (!member.fullName.trim() && member.phone.trim()) ||
        member.fullName.trim().length > 120 || member.phone.trim().length > 32 ||
        !roles.includes(member.role))) {
        return 'Enter valid staff names, roles and phone numbers, or leave a row empty to skip it.';
      }
    }
    return null;
  }

  const continueStep = () => {
    const problem = validate(step);
    if (problem) { setError(problem); return; }
    setError('');
    setStep(current => Math.min(4, current + 1));
  };
  const backStep = () => {
    if (busy) return;
    setError('');
    setNotice('');
    setStep(current => Math.max(0, current - 1));
  };

  const submit = async () => {
    if (busy) return;
    for (let current = 0; current <= 4; current++) {
      const problem = validate(current);
      if (problem) { setStep(current); setError(problem); return; }
    }
    const details: MerchantRegistration = {
      fullName: fullName.trim(),
      email: registered.current?.email ?? email.trim(),
      password: registered.current?.password ?? password,
      phone: phone.trim() || undefined,
      businessName: businessName.trim(),
      businessType,
      branchName: branches[0].name.trim(),
      registeredName: registeredName.trim() || undefined,
      staffCount: staffCount.trim() ? Number(staffCount) : undefined,
      branches: branches.map((branch): MerchantBranchDraft => ({
        name: branch.name.trim(), address: branch.address.trim() || undefined,
        phone: branch.phone.trim() || undefined,
      })),
      bankName: bankName.trim() || undefined,
      bankAccountNumber: bankAccountNumber.trim() || undefined,
      bankAccountName: bankAccountName.trim() || undefined,
      staff: staff.filter(member => member.fullName.trim()).map((member): MerchantStaffDraft => ({
        fullName: member.fullName.trim(), role: member.role,
        phone: member.phone.trim() || undefined,
      })),
    };
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
      setError(cause instanceof Error ? cause.message : 'Could not complete business setup.');
      if (registered.current) {
        setNotice('Your account may already be created. Tap Retry setup; do not register or pay again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return <KScreen
    title={step === 0 ? 'Create your business account' : 'Set up your business'}
    subtitle={step === 0
      ? 'Start with your account details. Your business setup comes next.'
      : 'A few details before you start taking sales.'}
    nav={false} back={false} showPreviewLabel={false}>
    {step > 0 && <View style={s.progress} accessibilityLabel={'Business setup step ' + step + ' of 4'}>
      {titles.map((title, index) => {
        const number = index + 1;
        const done = number < step;
        const active = number === step;
        return <React.Fragment key={title}>
          <View style={s.step}>
            <View style={[s.stepDot, (active || done) && s.stepActive]}>
              <Text style={[s.stepNumber, (active || done) && s.stepNumberActive]}>{done ? '✓' : number}</Text>
            </View>
            <Text numberOfLines={2} style={[s.stepText, active && s.stepTextActive]}>{title}</Text>
          </View>
          {index < 3 && <View style={[s.connector, done && s.connectorActive]} />}
        </React.Fragment>;
      })}
    </View>}

    <KCard style={s.card}>
      {step === 0 && <>
        <Text style={s.cardTitle}>Your account details</Text>
        <Text style={s.cardHelp}>These details will be used to sign in to KASSA.</Text>
        <KField label="Your full name" value={fullName} onChangeText={setFullName} placeholder="Enter your full name"/>
        <KField label="Phone number (optional)" value={phone} onChangeText={setPhone}
          keyboardType="phone-pad" placeholder="+234..."/>
        <KField label="Email address" value={email} onChangeText={setEmail}
          keyboardType="email-address" placeholder="you@example.com"/>
        <KField label="Password" value={password} onChangeText={setPassword}
          secureTextEntry={!visible} placeholder="Minimum 12 characters"/>
        <KField label="Confirm password" value={confirmation} onChangeText={setConfirmation}
          secureTextEntry={!visible} placeholder="Re-enter password"/>
        <Pressable accessibilityRole="button" onPress={() => setVisible(value => !value)} style={s.toggle}>
          <Text style={s.link}>{visible ? 'Hide passwords' : 'Show passwords'}</Text>
        </Pressable>
      </>}

      {step === 1 && <>
        <Text style={s.cardTitle}>Tell us about your business</Text>
        <Text style={s.cardHelp}>This appears on receipts and your dashboard.</Text>
        <KField label="Business name" value={businessName} onChangeText={setBusinessName}
          placeholder="e.g. Adebola Pharmacy"/>
        <ChoiceField label="Business type" value={businessType} onSelect={setBusinessType}
          options={businessTypes} placeholder="Select business type"/>
        <KField label="Registered business name (optional)" value={registeredName}
          onChangeText={setRegisteredName} placeholder="As registered with CAC"/>
        <KField label="Number of staff (total, optional)" value={staffCount}
          onChangeText={value => setStaffCount(value.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="numeric" placeholder="e.g. 6"/>
      </>}

      {step === 2 && <>
        <Text style={s.cardTitle}>Add your branch locations</Text>
        <Text style={s.cardHelp}>Start with your main branch. You can add more anytime.</Text>
        {branches.map((branch, index) => (
          <View key={index} style={s.nestedCard}>
            <View style={s.branchHeader}>
              <Text style={s.branchTitle}>{index === 0 ? 'MAIN BRANCH' : 'BRANCH ' + (index + 1)}</Text>
              {index > 0 && <Pressable accessibilityRole="button"
                accessibilityLabel={'Remove branch ' + (index + 1)}
                onPress={() => setBranches(current => current.filter((_, i) => i !== index))}>
                <Text style={s.remove}>Remove</Text>
              </Pressable>}
            </View>
            <KField label="Branch name" value={branch.name}
              onChangeText={value => updateBranch(index, 'name', value)} placeholder="Branch name"/>
            <KField label="Branch address (optional)" value={branch.address}
              onChangeText={value => updateBranch(index, 'address', value)}
              placeholder="e.g. Wuse II, Abuja"/>
            <KField label="Branch phone (optional)" value={branch.phone}
              onChangeText={value => updateBranch(index, 'phone', value)}
              keyboardType="phone-pad" placeholder="+234..."/>
          </View>
        ))}
        <Pressable accessibilityRole="button" disabled={branches.length >= 20}
          onPress={() => setBranches(current => [...current, { name: '', address: '', phone: '' }])}
          style={s.addLink}>
          <Text style={s.link}>＋ Add another branch</Text>
        </Pressable>
      </>}

      {step === 3 && <>
        <Text style={s.cardTitle}>Business receiving account</Text>
        <Text style={s.cardHelp}>Customers pay your business directly. You can add an account now or skip and add one later.</Text>
        <KField label="Bank or receiving institution (optional)" value={bankName}
          onChangeText={setBankName} placeholder="Any Nigerian bank, including digital banks"/>
        <KField label="Account number" value={bankAccountNumber}
          onChangeText={value => setBankAccountNumber(value.replace(/\D/g, '').slice(0, 10))}
          keyboardType="numeric" placeholder="10-digit account number"/>
        <KField label="Account holder name" value={bankAccountName}
          onChangeText={setBankAccountName} placeholder="Name on the account"/>
        <View style={s.info}>
          <Text style={s.infoText}>Account details are supplied by you, not independently verified. KASSA never holds the customer's money.</Text>
        </View>
      </>}

      {step === 4 && <>
        <Text style={s.cardTitle}>Invite your team</Text>
        <Text style={s.cardHelp}>Add staff details now, or leave this blank and do it later.</Text>
        {staff.map((member, index) => (
          <View key={index} style={s.nestedCard}>
            <View style={s.branchHeader}>
              <Text style={s.branchTitle}>STAFF {index + 1}</Text>
              {index > 0 && <Pressable accessibilityRole="button"
                accessibilityLabel={'Remove staff ' + (index + 1)}
                onPress={() => setStaff(current => current.filter((_, i) => i !== index))}>
                <Text style={s.remove}>Remove</Text>
              </Pressable>}
            </View>
            <KField label="Full name" value={member.fullName}
              onChangeText={value => updateStaff(index, 'fullName', value)}
              placeholder="e.g. Ifeoma Bassey"/>
            <ChoiceField label="Role" value={member.role} options={roles}
              onSelect={value => updateStaff(index, 'role', value)}/>
            <KField label="Phone number (optional)" value={member.phone}
              onChangeText={value => updateStaff(index, 'phone', value)}
              keyboardType="phone-pad" placeholder="+234..."/>
          </View>
        ))}
        <Pressable accessibilityRole="button" disabled={staff.length >= 50}
          onPress={() => setStaff(current => [...current, { fullName: '', role: 'Cashier', phone: '' }])}
          style={s.addLink}>
          <Text style={s.link}>＋ Add another staff member</Text>
        </Pressable>
        <View style={s.info}>
          <Text style={s.infoText}>Staff names are saved as drafts. No invitations are sent yet; staff accounts can be set up later.</Text>
        </View>
      </>}

      {notice ? <Text style={s.notice}>{notice}</Text> : null}
      {error ? <Text style={s.error} accessibilityRole="alert">{error}</Text> : null}

      <View style={s.actions}>
        {step > 0 && <Pressable accessibilityRole="button" disabled={busy}
          onPress={backStep} style={[s.back, busy && { opacity: 0.45 }]}>
          <Text style={s.backText}>Back</Text>
        </Pressable>}
        <View style={s.primary}>
          <KButton text={step === 4 ? (busy ? 'Saving business…' : registered.current ? 'Retry setup' : 'Finish setup') : 'Continue'}
            disabled={busy}
            onPress={step === 4 ? () => { void submit(); } : continueStep}/>
        </View>
      </View>
    </KCard>

    {step === 0 && <Pressable onPress={() => router.replace('/login')}
      accessibilityRole="button" style={s.login}>
      <Text style={s.loginText}>Already have an account? <Text style={s.link}>Log in</Text></Text>
    </Pressable>}
  </KScreen>;
}

const s = StyleSheet.create({
  card: { padding: 19, marginBottom: 20 },
  cardTitle: { color: C.title, fontSize: 20, fontWeight: '800', marginBottom: 5 },
  cardHelp: { color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 23 },
  fieldLabel: { color: C.text, fontWeight: '700', fontSize: 14, marginBottom: 9 },
  progress: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, marginTop: 4 },
  step: { alignItems: 'center', width: 65 },
  stepDot: { height: 25, width: 25, borderRadius: 13, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: C.green, borderColor: C.green },
  stepNumber: { fontSize: 12, fontWeight: '800', color: C.muted },
  stepNumberActive: { color: C.white },
  stepText: { fontSize: 10, lineHeight: 13, color: C.faint, marginTop: 7, textAlign: 'center' },
  stepTextActive: { color: C.green, fontWeight: '800' },
  connector: { flex: 1, height: 2, backgroundColor: C.border, marginTop: 12, minWidth: 3 },
  connectorActive: { backgroundColor: C.green },
  choiceWrap: { marginBottom: 19 },
  choice: { minHeight: 51, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 9, backgroundColor: C.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  choiceValue: { color: C.title, fontSize: 14, flex: 1 },
  chevron: { color: C.muted, fontSize: 19, paddingLeft: 8 },
  options: { borderWidth: 1, borderColor: C.border, borderRadius: 9, marginTop: 5, overflow: 'hidden', backgroundColor: C.white },
  option: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderBottomColor: C.border, borderBottomWidth: 1 },
  optionSelected: { backgroundColor: C.mint },
  optionText: { fontSize: 14, color: C.text },
  nestedCard: { borderWidth: 1, borderColor: C.border, borderRadius: 11, backgroundColor: '#F9FAFB',
    padding: 13, paddingBottom: 0, marginBottom: 14 },
  branchHeader: { marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  branchTitle: { color: C.greenDark, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  remove: { fontSize: 13, fontWeight: '700', color: C.danger },
  addLink: { alignSelf: 'flex-start', minHeight: 42, justifyContent: 'center', marginTop: 1, marginBottom: 7 },
  link: { color: C.green, fontSize: 14, fontWeight: '800' },
  info: { borderRadius: 9, backgroundColor: C.mint, padding: 13, marginTop: 5, marginBottom: 9 },
  infoText: { fontSize: 13, lineHeight: 19, color: C.greenDark },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  back: { minHeight: 52, borderRadius: 9, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: C.white },
  backText: { color: C.text, fontWeight: '700', fontSize: 14 },
  primary: { flex: 1 },
  toggle: { alignSelf: 'flex-end', paddingVertical: 7, marginBottom: 13 },
  error: { marginTop: 12, color: C.danger, fontSize: 14, lineHeight: 20 },
  notice: { marginTop: 12, color: C.orange, fontSize: 14, lineHeight: 20 },
  login: { alignSelf: 'center', paddingVertical: 20 },
  loginText: { color: C.muted, fontSize: 14 },
});
