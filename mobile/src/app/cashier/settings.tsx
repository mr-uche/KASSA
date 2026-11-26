import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import * as Print from 'expo-print';
import * as WebBrowser from 'expo-web-browser';
import { KCard, KField, KScreen } from '@/components/kassa-demo/ui';
import { C, naira } from '@/components/kassa-demo/theme';
import { useKassaSession } from '@/components/kassa-demo/api';
import { canAccess } from '@/components/kassa-demo/access';
import { useKassaDemo } from '@/components/kassa-demo/store';
import { getOfflineSaleQueueStatus } from '@/components/kassa-demo/offline-cash';
import { InlineNotice, ScreenHeading, SmallAction, StatusChip } from '@/components/kassa-demo/business-ui';

type Section = 'Business profile' | 'Subscription & Billing' | 'Business receiving accounts' |
  'Notifications' | 'Data Export' | 'Delete Account';
const sections: Section[] = [
  'Business profile', 'Subscription & Billing', 'Business receiving accounts',
  'Notifications', 'Data Export', 'Delete Account',
];
type BusinessSettings = {
  businessId: string; businessName: string; businessType: string;
  branchId: string | null; branchName: string; branchAddress: string; branchPhone: string;
};
type Bank = { id: string; bankName: string; accountNumber: string; accountName: string; isDefault: boolean };
type BillingCycle = 'monthly' | 'quarterly' | 'annual';
const billingCycles: { code: BillingCycle; label: string; period: string }[] = [
  { code: 'monthly', label: 'Monthly', period: 'month' },
  { code: 'quarterly', label: 'Quarterly', period: 'quarter' },
  { code: 'annual', label: 'Annually', period: 'year' },
];
const planDescriptions: Record<string, string> = {
  starter: 'For small businesses', growth: 'For growing businesses',
  business: 'For established businesses', enterprise: 'For larger retail operations',
};
type SubscriptionEntitlement = {
  tier: 'free' | 'monthly' | 'quarterly' | 'annual' | 'starter' | 'growth' | 'business' | 'enterprise';
  ownerIncluded?: boolean;
  maxBranches: number; maxStaff: number;
  features: { customers: boolean; reports: boolean; grossProfit: boolean; dataExport: boolean };
};
type BillingState = {
  configured: boolean; environment: 'test' | 'live' | null;
  currency: 'NGN';
  plans: { code: string; name: string; amountKobo: number; durationDays: number;
    testPricing: boolean; entitlement: SubscriptionEntitlement;
    tier?: string; tierName?: string; billingCycle?: BillingCycle; discountPercent?: number;
    savingsKobo?: number; monthlyEquivalentKobo?: number }[];
  entitlement: SubscriptionEntitlement & { expiresAt: string | null };
  featureRestrictionsEnabled: boolean;
  subscription: { status: 'ACTIVE' | 'EXPIRED' | 'NOT_ACTIVE'; planName: string | null; expiresAt: string | null };
  scheduled?: { planName: string; startsAt: string | null } | null;
  pending: { reference: string; planName: string; checkoutUrl: string | null } | null;
  history: { id: string; reference: string; planName: string; amountKobo: number;
    status: string; environment: 'test' | 'live'; createdAt: string }[];
  automaticRenewal: false;
};
function validPaystackCheckout(url: string): boolean {
  return /^https:\/\/checkout\.paystack\.com\/[A-Za-z0-9/?=&._%-]+$/.test(url);
}
type NotificationKey = 'successfulPayments' | 'failedPayments' | 'lowStockAlerts' |
  'staffActivity' | 'securityAlerts' | 'productUpdates' |
  'channelEmail' | 'channelInApp' | 'channelSms';
const notificationRows: { key: NotificationKey; name: string; info: string }[] = [
  { key: 'successfulPayments', name: 'Successful payments', info: 'When a payment is recorded as successful' },
  { key: 'failedPayments', name: 'Failed payments', info: 'When a payment attempt fails' },
  { key: 'lowStockAlerts', name: 'Low stock alerts', info: 'When products are running low' },
  { key: 'staffActivity', name: 'Staff activity', info: 'Changes made by your team' },
  { key: 'securityAlerts', name: 'Security alerts', info: 'Account and login activity' },
  { key: 'productUpdates', name: 'Product updates', info: 'Changes to inventory' },
  { key: 'channelEmail', name: 'Email', info: 'Email delivery preference' },
  { key: 'channelInApp', name: 'In-app notifications', info: 'Display notifications inside KASSA' },
  { key: 'channelSms', name: 'SMS', info: 'SMS delivery preference' },
];
type NotificationPreferences = Record<NotificationKey, boolean>;
const defaultNotifications: NotificationPreferences = {
  successfulPayments: true, failedPayments: true, lowStockAlerts: true,
  staffActivity: false, securityAlerts: true, productUpdates: false,
  channelEmail: true, channelInApp: true, channelSms: false,
};
type ExportSection = 'transactions' | 'productsInventory' | 'customers' | 'staff' | 'branches' | 'reportsAnalytics';
const exportSections: { key: ExportSection; name: string }[] = [
  { key: 'transactions', name: 'Transactions' },
  { key: 'productsInventory', name: 'Products & Inventory' },
  { key: 'customers', name: 'Customers' },
  { key: 'staff', name: 'Staff' },
  { key: 'branches', name: 'Branches' },
  { key: 'reportsAnalytics', name: 'Reports & Analytics' },
];
type DateRange = 'ALL' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'THIS_YEAR';
const dateRanges: { id: DateRange; label: string }[] = [
  { id: 'ALL', label: 'All available data' },
  { id: 'LAST_30_DAYS', label: 'Last 30 days' },
  { id: 'LAST_90_DAYS', label: 'Last 90 days' },
  { id: 'THIS_YEAR', label: 'This year' },
];
type ExportData = {
  businessId: string; generatedAt: string; includesPersonalData: boolean;
  datasets: { key: string; title: string; columns: string[]; rows: (string | number | boolean | null)[][] }[];
};
function quotedCell(value: string | number | boolean | null): string {
  const raw = value === null ? '' : String(value);
  const safe = /^\s*[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}
function csvExport(data: ExportData): string {
  const output: string[] = [];
  for (const section of data.datasets) {
    output.push('', quotedCell(section.title), section.columns.map(quotedCell).join(','));
    for (const row of section.rows) output.push(row.map(quotedCell).join(','));
  }
  return output.join('\r\n');
}
function pdfExport(data: ExportData): string {
  const escape = (text: string) => text.replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
  return '<html><head><meta charset="utf-8"/><style>' +
    'body{font-family:Arial,sans-serif;margin:22px;color:#22342D}h1,h2{color:#0F6E56}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:25px}' +
    'th,td{border:1px solid #e5e7eb;padding:6px;font-size:9px;text-align:left;overflow-wrap:anywhere}' +
    'th{background:#EAF5F0}</style></head><body><h1>KASSA Business Data Export</h1>' +
    '<p>' + escape(data.generatedAt) + '</p>' +
    data.datasets.map(section => '<h2>' + escape(section.title) + '</h2><table><tr>' +
      section.columns.map(value => '<th>' + escape(value) + '</th>').join('') + '</tr>' +
      section.rows.map(row => '<tr>' + row.map(value =>
        '<td>' + escape(value == null ? '' : String(value)) + '</td>').join('') + '</tr>').join('') +
      '</table>').join('') +
    '<p>Contains business information. Store and share securely.</p></body></html>';
}
function ToggleRow({ label, description, value, onValueChange }: {
  label: string; description?: string; value: boolean; onValueChange(value: boolean): void;
}) {
  return <View style={s.toggleRow}>
    <View style={{ flex: 1 }}>
      <Text style={s.toggleLabel}>{label}</Text>
      {!!description && <Text style={s.toggleDescription}>{description}</Text>}
    </View>
    <Switch accessibilityLabel={label} value={value} onValueChange={onValueChange}
      trackColor={{ false: '#CDD3D1', true: '#80B8A4' }}
      thumbColor={value ? C.green : C.white}/>
  </View>;
}
function SettingsButton({ label, selected, onPress, danger }: {
  label: string; selected: boolean; onPress(): void; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }}
    style={[s.sectionOption, selected && s.sectionSelected]} onPress={onPress}>
    <Text style={[s.sectionOptionText, selected && s.sectionSelectedText,
      danger && { color: C.danger }]}>{label}</Text>
    <Text style={{ color: danger ? C.danger : C.muted }}>{selected ? '⌄' : '›'}</Text>
  </Pressable>;
}

let preferencesDb: Promise<SQLite.SQLiteDatabase> | null = null;
async function settingsDb() {
  if (!preferencesDb) {
    preferencesDb = (async () => {
      const db = await SQLite.openDatabaseAsync('kassa-mobile-preferences.db');
      await db.execAsync('CREATE TABLE IF NOT EXISTS notification_prefs (userId TEXT PRIMARY KEY, preferencesJson TEXT NOT NULL);');
      return db;
    })().catch(cause => { preferencesDb = null; throw cause; });
  }
  return preferencesDb;
}

export default function Settings() {
  const router = useRouter();
  const session = useKassaSession();
  const store = useKassaDemo();
  const businessId = session.scope?.businessId;
  const branchId = session.scope?.branchId;
  const isOwner = session.scope?.myRole === 'Owner';
  const canManageBusiness = canAccess(session.scope, 'Manage business settings');
  const availableSections = isOwner ? sections : (['Business profile', 'Notifications'] as Section[]);
  const userId = session.user?.id;
  const [section, setSection] = useState<Section>('Business profile');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<BusinessSettings | null>(null);
  const [form, setForm] = useState({ businessName: '', businessType: '', branchAddress: '', branchPhone: '' });
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: '', accountName: '', accountNumber: '' });
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotifications);
  const [exportSelected, setExportSelected] = useState<ExportSection[]>(exportSections.map(item => item.key));
  const [range, setRange] = useState<DateRange>('ALL');
  const [exportMode, setExportMode] = useState<'CSV' | 'PDF'>('CSV');
  const [lastExport, setLastExport] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [billingMessage, setBillingMessage] = useState('');

  const loadProfile = useCallback(async (alive: () => boolean = () => true) => {
    if (!businessId || !branchId || !canManageBusiness) return;
    if (alive()) { setLoading(true); setError(''); }
    try {
      const result = await session.request<BusinessSettings>('businesses/' + encodeURIComponent(businessId) +
        '/settings?branchId=' + encodeURIComponent(branchId));
      if (alive()) {
        setProfile(result);
        setForm({ businessName: result.businessName, businessType: result.businessType,
          branchAddress: result.branchAddress, branchPhone: result.branchPhone });
      }
    } catch (cause) { if (alive()) setError(cause instanceof Error ? cause.message : 'Cannot load business settings.'); }
    finally { if (alive()) setLoading(false); }
  }, [businessId, branchId, canManageBusiness, session.request]);

  const loadBanks = useCallback(async (alive: () => boolean = () => true) => {
    if (!businessId || session.scope?.myRole !== 'Owner') return;
    try {
      const result = await session.request<Bank[]>('businesses/' + encodeURIComponent(businessId) + '/receiving-accounts');
      if (alive()) setBanks(Array.isArray(result) ? result : []);
    } catch (cause) { if (alive()) setError(cause instanceof Error ? cause.message : 'Cannot load receiving accounts.'); }
  }, [businessId, session.scope?.myRole, session.request]);

  const refreshBilling = useCallback(async (alive: () => boolean = () => true) => {
    if (!businessId || !isOwner) return;
    if (alive()) { setBillingLoading(true); setBillingError(''); }
    try {
      const result = await session.request<BillingState>(
        'billing/status?businessId=' + encodeURIComponent(businessId));
      if (alive()) setBilling(result);
    } catch (cause) {
      if (alive()) { setBilling(null);
        setBillingError(cause instanceof Error ? cause.message : 'Unable to load subscription billing.'); }
    } finally { if (alive()) setBillingLoading(false); }
  }, [businessId, isOwner, session.request]);

  useEffect(() => {
    if (section === 'Subscription & Billing' && isOwner) void refreshBilling();
  }, [section, isOwner, refreshBilling]);

  const subscribe = async (planCode: string) => {
    if (!businessId || !isOwner || billingBusy || !billing?.configured) return;
    setBillingBusy(true); setBillingError(''); setBillingMessage('');
    try {
      const result = await session.request<{
        authorizationUrl: string; reference: string; environment: 'test' | 'live';
      }>('billing/initialize', { businessId, planCode });
      if (!validPaystackCheckout(result.authorizationUrl)) {
        throw new Error('Paystack returned an invalid checkout URL.');
      }
      await WebBrowser.openBrowserAsync(result.authorizationUrl);
      setBillingMessage('If payment succeeded, tap Verify payment to confirm it with Paystack.');
      await refreshBilling();
    } catch (cause) {
      setBillingError(cause instanceof Error ? cause.message : 'Unable to start subscription.');
      await refreshBilling();
    } finally { setBillingBusy(false); }
  };

  const verifyBilling = async (reference: string) => {
    if (!businessId || !isOwner || billingBusy) return;
    setBillingBusy(true); setBillingError(''); setBillingMessage('');
    try {
      const result = await session.request<{ status: string; expiresAt: string | null }>(
        'billing/verify', { businessId, reference });
      setBillingMessage(result.status === 'SUCCEEDED'
        ? 'Subscription verified. Your billing period has been updated.'
        : 'Paystack status: ' + result.status + '. No subscription was activated.');
      await refreshBilling();
    } catch (cause) {
      setBillingError(cause instanceof Error ? cause.message : 'Subscription verification failed.');
    } finally { setBillingBusy(false); }
  };

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadProfile(() => active);
    return () => { active = false; };
  }, [loadProfile]));
  useEffect(() => { if (section === 'Business receiving accounts') void loadBanks(); }, [section, loadBanks]);
  useEffect(() => {
    let active = true;
    setPreferences(defaultNotifications);
    if (userId) void settingsDb().then(db =>
      db.getFirstAsync<{ preferencesJson: string }>('SELECT preferencesJson FROM notification_prefs WHERE userId=?', userId)
    ).then(row => {
      if (!active || !row) return;
      const parsed: unknown = JSON.parse(row.preferencesJson);
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        setPreferences(previous => {
          const next = { ...previous };
          for (const key of Object.keys(next) as NotificationKey[]) {
            if (typeof record[key] === 'boolean') next[key] = record[key] as boolean;
          }
          return next;
        });
      }
    }).catch(() => { /* Keep defaults if local preferences cannot be read. */ });
    return () => { active = false; };
  }, [userId]);

  const setPreference = (key: NotificationKey, nextValue: boolean) => {
    const next = { ...preferences, [key]: nextValue };
    setPreferences(next);
    if (userId) void settingsDb().then(db =>
      db.runAsync('INSERT OR REPLACE INTO notification_prefs (userId,preferencesJson) VALUES (?,?)',
        userId, JSON.stringify(next))
    ).catch(() => setError('Could not save notification preferences on this phone.'));
  };
  function changeSection(next: Section) {
    setSection(next); setMenuOpen(false); setError(''); setSuccess('');
  }

  const saveProfile = async () => {
    if (!businessId || !branchId || busy) return;
    if (!form.businessName.trim() || form.businessName.trim().length > 150 ||
      form.businessType.length > 100 || form.branchAddress.length > 300 || form.branchPhone.length > 32) {
      setError('Check the business name and field lengths.'); return;
    }
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await session.request<BusinessSettings>(
        'businesses/' + encodeURIComponent(businessId) + '/settings',
        { ...form, businessName: form.businessName.trim(), branchId }, 'PATCH',
      );
      setProfile(result);
      setForm({ businessName: result.businessName, businessType: result.businessType,
        branchAddress: result.branchAddress, branchPhone: result.branchPhone });
      setSuccess('Business profile saved. Refresh branch selection to see renamed businesses elsewhere.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Cannot save profile.'); }
    finally { setBusy(false); }
  };
  const addBank = async () => {
    if (!businessId || busy) return;
    if (!bankForm.bankName.trim() || bankForm.bankName.trim().length > 120 ||
      !bankForm.accountName.trim() || bankForm.accountName.trim().length > 150 ||
      !/^\d{10}$/.test(bankForm.accountNumber)) {
      setError('Enter the bank, account holder name and 10-digit account number.'); return;
    }
    setBusy(true); setError(''); setSuccess('');
    try {
      await session.request('businesses/' + encodeURIComponent(businessId) + '/receiving-accounts',
        { ...bankForm, bankName: bankForm.bankName.trim(), accountName: bankForm.accountName.trim() });
      setBankForm({ bankName: '', accountName: '', accountNumber: '' }); setBankFormOpen(false);
      await loadBanks();
      setSuccess('Receiving account added. It can be selected at checkout.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Cannot add receiving account.'); }
    finally { setBusy(false); }
  };
  const setDefaultBank = async (account: Bank) => {
    if (!businessId || busy || account.isDefault) return;
    setBusy(true); setError('');
    try {
      await session.request('businesses/' + encodeURIComponent(businessId) + '/receiving-accounts/' +
        encodeURIComponent(account.id), { isDefault: true }, 'PATCH');
      await loadBanks();
      setSuccess('Default receiving account updated.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Cannot change default account.'); }
    finally { setBusy(false); }
  };
  const removeBank = (account: Bank) => {
    if (!businessId || busy) return;
    Alert.alert('Remove receiving account?', 'This bank account will no longer appear at checkout.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { void (async () => {
        setBusy(true); setError('');
        try {
          await session.request('businesses/' + encodeURIComponent(businessId) + '/receiving-accounts/' +
            encodeURIComponent(account.id), undefined, 'DELETE');
          await loadBanks();
          setSuccess('Account removed from checkout.');
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to remove account.'); }
        finally { setBusy(false); }
      })(); } },
    ]);
  };

  const exportBusiness = async () => {
    if (!businessId || busy) return;
    if (!exportSelected.length) { setError('Select at least one dataset.'); return; }
    Alert.alert('Export business records?', 'This export may contain customer, staff and financial information. Only share it with trusted recipients.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => { void (async () => {
        setBusy(true); setError(''); setSuccess('');
        try {
          const data = await session.request<ExportData>(
            'businesses/' + encodeURIComponent(businessId) + '/export',
            { sections: exportSelected, dateRange: range },
          );
          if (!Array.isArray(data.datasets)) throw new Error('Export response was invalid.');
          const rows = data.datasets.reduce((total, section) => total + section.rows.length, 0);
          if (exportMode === 'CSV') {
            const csv = csvExport(data);
            if (csv.length > 120000) throw new Error('Export is too large for mobile sharing. Use the web app for the full CSV or XLSX download.');
            await Share.share({ title: 'KASSA business CSV data', message: csv });
            setSuccess('CSV text sent to your device share menu. Use KASSA Web for downloadable CSV/XLSX files.');
          } else {
            if (rows > 200) throw new Error('This PDF export is too large for the mobile print dialog. Use KASSA Web to download the full PDF.');
            await Print.printAsync({ html: pdfExport(data) });
            setSuccess('PDF opened in your device print/save dialog.');
          }
          setLastExport(exportMode + ' · ' + rows + ' records · ' + new Date().toLocaleString('en-NG'));
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to export business data.'); }
        finally { setBusy(false); }
      })(); } },
    ]);
  };

  const deleteAccount = async () => {
    if (busy || closed || !userId || !password || confirmation !== 'DELETE ACCOUNT') {
      setError('Enter your current password and type DELETE ACCOUNT exactly.'); return;
    }
    if (store.pendingSale) {
      setError('Resolve your pending sale before closing the account.'); return;
    }
    if (!session.scopes.length) {
      setError('Cannot confirm that offline sales are synced. Sign in and select a branch before closing this account.');
      return;
    }
    try {
      for (const activeScope of session.scopes) {
        const queue = await getOfflineSaleQueueStatus({
          userId, businessId: activeScope.businessId, branchId: activeScope.branchId,
        });
        if (queue.waiting > 0) {
          setError('There are ' + queue.waiting + ' unsynced sales on this phone. Sync or resolve all branches before closing the account.');
          return;
        }
      }
    } catch {
      setError('Could not check offline sales in every branch. Do not close this account until they are safely synced.');
      return;
    }
    Alert.alert('Permanently close this KASSA login?', 'You will lose access immediately and cannot undo this. Financial, business and audit records may be retained.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close my account', style: 'destructive', onPress: () => { void (async () => {
        setBusy(true); setError('');
        try {
          const result = await session.request<{ closed: boolean }>('auth/me',
            { password, confirmation: 'DELETE ACCOUNT' }, 'DELETE');
          if (result.closed !== true) throw new Error('KASSA did not confirm account closure.');
          setClosed(true); setPassword(''); setConfirmation('');
          await session.signOut().catch(() => undefined);
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Account closure failed.'); }
        finally { setBusy(false); }
      })(); } },
    ]);
  };

  if (closed) return <KScreen nav={false} showPreviewLabel={false}>
    <KCard style={s.deleted}>
      <View style={s.deletedIcon}><Text style={s.deletedIconText}>✓</Text></View>
      <Text style={s.deletedTitle}>Account closed</Text>
      <Text style={s.deletedText}>Your KASSA login has been permanently disabled and all existing sessions revoked.</Text>
      <InlineNotice warning text="Financial and business records may be retained to meet audit and accounting requirements."/>
      <SmallAction label="Back to sign in" onPress={() => router.replace('/login')}/>
    </KCard>
  </KScreen>;

  if (!canManageBusiness) return <KScreen showBrand={false} showPreviewLabel={false}>
    <ScreenHeading title="Settings" subtitle="Business administration"/>
    <InlineNotice warning text="Your role cannot manage business settings. Use Profile to manage your own account."/>
  </KScreen>;

  return <KScreen showBrand showPreviewLabel={false}>
    <ScreenHeading title="Settings" subtitle="Manage your business account and preferences"/>
    <SettingsButton label={section} selected onPress={() => setMenuOpen(value => !value)}
      danger={section === 'Delete Account'}/>
    {menuOpen && <View style={s.sectionMenu}>
      {availableSections.map(item => <SettingsButton key={item} label={item} selected={item === section}
        danger={item === 'Delete Account'} onPress={() => changeSection(item)}/>)}
    </View>}
    {!isOwner && <InlineNotice
      text="Only business profile and notification preferences are available to delegated staff. Financial exports, account closure and merchant bank accounts remain owner-only."/>}
    {!!error && <InlineNotice text={error} warning/>}
    {!!success && <InlineNotice text={success}/>}
    {loading && <Text style={s.loading}>Loading settings…</Text>}

    {section === 'Business profile' && <KCard>
      <Text style={s.cardTitle}>Business profile</Text>
      <Text style={s.cardNote}>Saved profile information appears on business screens and receipts.</Text>
      <KField label="Business name" value={form.businessName} onChangeText={v => setForm(f => ({ ...f, businessName: v }))}/>
      <KField label="Business type" value={form.businessType} onChangeText={v => setForm(f => ({ ...f, businessType: v }))}/>
      <KField label="Business address" value={form.branchAddress} onChangeText={v => setForm(f => ({ ...f, branchAddress: v }))}/>
      <KField label="Support phone" keyboardType="phone-pad" value={form.branchPhone}
        onChangeText={v => setForm(f => ({ ...f, branchPhone: v }))}/>
      {!!profile && <Text style={s.cardNote}>Selected branch: {profile.branchName}</Text>}
      <SmallAction label={busy ? 'Saving…' : 'Save changes'} disabled={busy || !profile}
        onPress={() => { void saveProfile(); }}/>
    </KCard>}

    {isOwner && section === 'Subscription & Billing' && <>
      <KCard>
        <Text style={s.cardTitle}>Current subscription</Text>
        <Text style={s.businessName}>{profile?.businessName || session.scope?.businessName || 'KASSA Business'}</Text>
        {billingLoading && <Text style={s.cardNote}>Loading subscription…</Text>}
        {!!billingError && <InlineNotice text={billingError} warning/>}
        {!!billingMessage && <InlineNotice text={billingMessage}/>}
        {billing && <>
          <StatusChip label={billing.subscription.status === 'ACTIVE' ? 'Active' :
            billing.subscription.status === 'EXPIRED' ? 'Expired' : 'Not active'}
            color={billing.subscription.status === 'ACTIVE' ? 'green' : 'orange'}/>
          <Text style={s.billingDetail}>{billing.subscription.planName || 'No subscription purchased'}</Text>
          {!!billing.subscription.expiresAt && <Text style={s.cardNote}>
            Expires {new Date(billing.subscription.expiresAt).toLocaleDateString('en-NG')}
          </Text>}
          <Text style={s.billingDetail}>Current tier: {billing.entitlement.tier.toUpperCase()}</Text>
          <Text style={s.cardNote}>
            Includes {billing.entitlement.maxBranches} branch(es) and {billing.entitlement.maxStaff} staff account(s){billing.entitlement.ownerIncluded === false ? ', excluding the owner.' : ', including the owner.'}
          </Text>
          {!!billing.scheduled && <InlineNotice text={'Next paid plan: ' + billing.scheduled.planName +
            (billing.scheduled.startsAt ? ' · Starts ' + new Date(billing.scheduled.startsAt).toLocaleDateString('en-NG') : '')}/>}
          <Text style={s.cardNote}>Manual renewal.</Text>
          {billing.environment === 'test' && <InlineNotice warning text="No real funds will be charged."/>}
          {!billing.configured && <InlineNotice warning
            text="Subscription payments are currently unavailable."/>}
          {!!billing.pending && <>
            <Text style={s.groupTitle}>Payment awaiting verification</Text>
            <Text style={s.billingDetail}>{billing.pending.planName}</Text>
            <Text style={s.cardNote}>Reference: {billing.pending.reference}</Text>
            {!!billing.pending.checkoutUrl && <SmallAction secondary label="Continue Paystack checkout"
              disabled={billingBusy} onPress={() => {
                if (billing.pending?.checkoutUrl && validPaystackCheckout(billing.pending.checkoutUrl))
                  void WebBrowser.openBrowserAsync(billing.pending.checkoutUrl);
              }}/>}
            <SmallAction label={billingBusy ? 'Verifying…' : 'Verify payment'} disabled={billingBusy}
              onPress={() => { if (billing.pending) void verifyBilling(billing.pending.reference); }}/>
          </>}
        </>}
        <SmallAction label="Refresh billing status" secondary disabled={billingLoading}
          onPress={() => { void refreshBilling(); }}/>
      </KCard>
      {billing && <KCard>
        <Text style={s.cardTitle}>Choose your subscription</Text>
        <Text style={s.cardNote}>Flexible plans for every business size.</Text>
        {billing.plans.some(plan => !!plan.billingCycle) ? <>
          <View style={s.cycleRow}>
            {billingCycles.map(cycle => <Pressable key={cycle.code} accessibilityRole="button"
              accessibilityState={{ selected: billingCycle === cycle.code }}
              onPress={() => setBillingCycle(cycle.code)}
              style={[s.cycleButton, billingCycle === cycle.code && s.cycleSelected]}>
              <Text style={[s.cycleLabel, billingCycle === cycle.code && s.cycleLabelSelected]}>{cycle.label}</Text>
            </Pressable>)}
          </View>
          {billingCycle !== 'monthly' && <Text style={s.savingsBanner}>
            Save {billing.plans.find(plan => plan.billingCycle === billingCycle)?.discountPercent ?? 0}% with {billingCycle === 'annual' ? 'annual' : 'quarterly'} billing
          </Text>}
          {billing.subscription.status === 'ACTIVE' && <Text style={s.cardNote}>
            New plans start after your current paid period.
          </Text>}
          {billing.plans.filter(plan => plan.billingCycle === billingCycle).map(plan => <View key={plan.code}
            style={[s.billingPlan, plan.tier === 'growth' && s.recommendedPlan]}>
            {plan.tier === 'growth' && <Text style={s.recommendedLabel}>RECOMMENDED</Text>}
            <Text style={s.planTitle}>{plan.tierName || plan.name}</Text>
            <Text style={s.planDescription}>{planDescriptions[plan.tier || ''] || ''}</Text>
            <Text style={s.planPrice}>{naira(plan.amountKobo / 100)}</Text>
            <Text style={s.planPeriod}>per {billingCycles.find(cycle => cycle.code === billingCycle)?.period} · {plan.durationDays} days</Text>
            {!!plan.savingsKobo && <Text style={s.planSaving}>Save {naira(plan.savingsKobo / 100)} · {naira((plan.monthlyEquivalentKobo ?? 0) / 100)}/month equivalent</Text>}
            <View style={s.planLimits}>
              <Text style={s.planLimit}>{plan.entitlement.maxBranches} {plan.entitlement.maxBranches === 1 ? 'branch' : 'branches'}</Text>
              <Text style={s.planLimit}>{plan.entitlement.maxStaff} staff members</Text>
            </View>
            <Text style={s.planDescription}>{plan.entitlement.ownerIncluded === false ? 'Owner account included at no extra cost' : 'Staff limit includes owner'}</Text>
            {['Sales & inventory', 'Customer management', 'Reports & analytics', 'Offline sales', 'Digital receipts', 'Gross profit & data export'].map(feature =>
              <Text key={feature} style={s.planFeature}>✓  {feature}</Text>)}
            <SmallAction label={(billing.subscription.status === 'ACTIVE' ? 'Renew with ' : 'Choose ') + (plan.tierName || plan.name)}
              disabled={billingBusy || !billing.configured || !!billing.pending}
              onPress={() => { void subscribe(plan.code); }}/>
          </View>)}
          <Text style={s.cardNote}>All plans include core features. Staff permissions apply.</Text>
        </> : <InlineNotice warning text="Subscription plans are currently unavailable."/>}
      </KCard>}
      <KCard>
        <Text style={s.cardTitle}>Billing history</Text>
        {!billing?.history.length && <Text style={s.cardNote}>No subscription payments recorded.</Text>}
        {billing?.history.map(charge => <View key={charge.id} style={s.billingHistory}>
          <View style={{ flex: 1 }}>
            <Text style={s.bankTitle}>{charge.planName}</Text>
            <Text style={s.cardNote}>
              {new Date(charge.createdAt).toLocaleDateString('en-NG')}{charge.environment === 'test' ? ' · Non-live' : ''}
            </Text>
          </View>
          <View style={s.billingAmount}>
            <Text style={s.bankTitle}>{naira(charge.amountKobo / 100)}</Text>
            <Text style={s.cardNote}>{charge.status}</Text>
          </View>
        </View>)}
        <InlineNotice text="Customer payments go directly to your business."/>
      </KCard>
    </>}

    {isOwner && section === 'Business receiving accounts' && <>
      <KCard>
        <Text style={s.cardTitle}>Business receiving accounts</Text>
        <Text style={s.cardNote}>Customers transfer directly to these accounts. Cashiers see the selected account at checkout. KASSA does not receive or pay out these funds.</Text>
        {banks.map(account => <View key={account.id} style={s.bankRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.bankTitle}>{account.bankName} {account.isDefault ? '· Default' : ''}</Text>
            <Text style={s.bankDetail}>{account.accountName}</Text>
            <Text style={s.bankDetail}>••••••{account.accountNumber.slice(-4)}</Text>
          </View>
          <View style={s.bankActions}>
            {!account.isDefault && <SmallAction label="Make default" secondary disabled={busy} onPress={() => { void setDefaultBank(account); }}/>}
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => removeBank(account)}>
              <Text style={s.removeText}>Remove</Text>
            </Pressable>
          </View>
        </View>)}
        {!banks.length && <InlineNotice text="No receiving accounts added yet."/>}
        <SmallAction label={bankFormOpen ? 'Cancel' : '+ Add account'} secondary
          onPress={() => setBankFormOpen(value => !value)}/>
        {bankFormOpen && <View style={{ marginTop: 16 }}>
          <KField label="Bank name" value={bankForm.bankName}
            onChangeText={v => setBankForm(f => ({ ...f, bankName: v }))} placeholder="Any Nigerian bank"/>
          <KField label="Account number" value={bankForm.accountNumber}
            keyboardType="numeric" onChangeText={v => setBankForm(f => ({ ...f, accountNumber: v.replace(/\D/g, '').slice(0, 10) }))}
            placeholder="10-digit account number"/>
          <KField label="Account holder name" value={bankForm.accountName}
            onChangeText={v => setBankForm(f => ({ ...f, accountName: v }))}/>
          <SmallAction label={busy ? 'Saving…' : 'Save receiving account'} disabled={busy}
            onPress={() => { void addBank(); }}/>
        </View>}
      </KCard>
      <InlineNotice warning text="Receiving account details are supplied by the business, not independently verified by a bank."/>
    </>}

    {section === 'Notifications' && <KCard>
      <Text style={s.cardTitle}>Notifications</Text>
      <Text style={s.cardNote}>Choose which alerts you would like to receive.</Text>
      <InlineNotice text="Preferences are saved on this device."/>
      <Text style={s.groupTitle}>Transaction alerts</Text>
      {notificationRows.slice(0, 2).map(item => <ToggleRow key={item.key} label={item.name} description={item.info}
        value={preferences[item.key]} onValueChange={value => setPreference(item.key, value)}/>)}
      <Text style={s.groupTitle}>Business alerts</Text>
      {notificationRows.slice(2, 6).map(item => <ToggleRow key={item.key} label={item.name} description={item.info}
        value={preferences[item.key]} onValueChange={value => setPreference(item.key, value)}/>)}
      <Text style={s.groupTitle}>Delivery channels</Text>
      {notificationRows.slice(6).map(item => <ToggleRow key={item.key} label={item.name} description={item.info}
        value={preferences[item.key]} onValueChange={value => setPreference(item.key, value)}/>)}
      <Text style={s.cardNote}>Message delivery is unavailable.</Text>    </KCard>}

    {isOwner && section === 'Data Export' && <KCard>
      <Text style={s.cardTitle}>Data Export</Text>
      <Text style={s.cardNote}>Choose the business data you want to export.</Text>
      <Text style={s.groupTitle}>Datasets</Text>
      <View style={s.datasetGrid}>
        {exportSections.map(item => {
          const checked = exportSelected.includes(item.key);
          return <Pressable key={item.key} accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() => setExportSelected(current => checked
              ? current.filter(key => key !== item.key) : [...current, item.key])}
            style={[s.dataset, checked && s.datasetSelected]}>
            <Text style={[s.datasetCheck, checked && { color: C.green }]}>{checked ? '☑' : '☐'}</Text>
            <Text style={s.datasetLabel}>{item.name}</Text>
          </Pressable>;
        })}
      </View>
      <Text style={s.groupTitle}>Export format</Text>
      <View style={s.modeRow}>
        {(['CSV', 'PDF'] as const).map(mode => <Pressable key={mode} accessibilityRole="button"
          accessibilityState={{ selected: exportMode === mode }}
          onPress={() => setExportMode(mode)}
          style={[s.mode, exportMode === mode && s.modeSelected]}>
          <Text style={[s.modeText, exportMode === mode && { color: C.green }]}>{mode}</Text>
        </Pressable>)}
      </View>
      <Text style={s.cardNote}>CSV shares the data as text. PDF opens Android’s print/save dialog. Use KASSA Web to download actual CSV/XLSX files or large exports.</Text>
      <Text style={s.groupTitle}>Transaction date range</Text>
      <View style={s.modeRow}>
        {dateRanges.map(option => <Pressable key={option.id}
          accessibilityRole="button" accessibilityState={{ selected: range === option.id }}
          onPress={() => setRange(option.id)}
          style={[s.mode, range === option.id && s.modeSelected]}>
          <Text style={[s.modeText, range === option.id && { color: C.green }]}>{option.label}</Text>
        </Pressable>)}
      </View>
      <InlineNotice text="Exports may contain personal and financial data. Share them securely."/>
      <SmallAction label={busy ? 'Preparing export…' : 'Export data'} disabled={busy || !exportSelected.length}
        onPress={() => { void exportBusiness(); }}/>
      {!!lastExport && <Text style={s.lastExport}>Most recent export: {lastExport}</Text>}
    </KCard>}

    {isOwner && section === 'Delete Account' && <>
      <KCard>
        <Text style={[s.cardTitle, { color: C.danger }]}>Delete Account</Text>
        <InlineNotice warning text="This action is permanent. Your KASSA login and access will be disabled. Financial and business records may be retained for audit or legal reasons."/>
        <Text style={s.groupTitle}>What will happen</Text>
        <Text style={s.bullet}>• Your login is disabled and active sessions are revoked.</Text>
        <Text style={s.bullet}>• Profile details are anonymised where supported.</Text>
        <Text style={s.bullet}>• Business, transaction and accounting records may be retained.</Text>
        <Text style={s.bullet}>• You cannot undo account closure.</Text>
        <View style={s.dangerNotice}><Text style={s.dangerNoticeText}>Unsynced offline sales must be resolved first. Deleting a login does not delete or erase those financial records.</Text></View>
        <KField label="Current password" value={password} onChangeText={setPassword}
          secureTextEntry placeholder="Confirm your current password"/>
        <KField label="Type DELETE ACCOUNT" value={confirmation} onChangeText={setConfirmation}
          placeholder="DELETE ACCOUNT"/>
        <View style={s.deleteRow}>
          <View style={{ flex: 1 }}><SmallAction label="Cancel" secondary onPress={() => changeSection('Business profile')}/></View>
          <View style={{ flex: 1 }}><Pressable accessibilityRole="button" disabled={busy || !password || confirmation !== 'DELETE ACCOUNT'}
            onPress={() => { void deleteAccount(); }} style={[s.deleteButton,
              (busy || !password || confirmation !== 'DELETE ACCOUNT') && { opacity: 0.45 }]}>
            <Text style={s.deleteButtonText}>{busy ? 'Closing…' : 'Delete account'}</Text>
          </Pressable></View>
        </View>
        <Text style={s.deleteNote}>An additional confirmation is required before deletion.</Text>
      </KCard>
    </>}
  </KScreen>;
}

const s = StyleSheet.create({
  cardTitle: { color: C.title, fontSize: 19, fontWeight: '800', marginBottom: 6 },
  cardNote: { color: C.muted, fontSize: 12, lineHeight: 19, marginBottom: 16 },
  businessName: { fontSize: 17, fontWeight: '800', color: C.title, marginTop: 11, marginBottom: 9 },
  billingPlan: { gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginTop: 12 },
  cycleRow: { flexDirection: 'row', borderRadius: 12, backgroundColor: C.mint, padding: 4, gap: 3, marginBottom: 8 },
  cycleButton: { flex: 1, paddingVertical: 12, borderRadius: 9, alignItems: 'center' },
  cycleSelected: { backgroundColor: C.green },
  cycleLabel: { fontSize: 12, fontWeight: '700', color: C.greenDark },
  cycleLabelSelected: { color: C.white },
  savingsBanner: { color: C.greenDark, fontWeight: '700', fontSize: 13, marginVertical: 8, textAlign: 'center' },
  recommendedPlan: { borderColor: C.green, borderWidth: 2 },
  recommendedLabel: { color: C.greenDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  planTitle: { color: C.title, fontSize: 21, fontWeight: '800' },
  planDescription: { color: C.muted, fontSize: 12, lineHeight: 18 },
  planPrice: { color: C.greenDark, fontSize: 30, fontWeight: '800', marginTop: 5 },
  planPeriod: { color: C.muted, fontSize: 12 },
  planSaving: { color: C.greenDark, fontSize: 12, fontWeight: '700' },
  planLimits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginTop: 5 },
  planLimit: { backgroundColor: C.mint, color: C.greenDark, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: '800' },
  planFeature: { color: C.text, fontSize: 13, lineHeight: 20 },
  billingDetail: { fontSize: 14, fontWeight: '700', color: C.title, marginVertical: 8 },
  billingHistory: { flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 12 },
  billingAmount: { alignItems: 'flex-end' },
  sectionOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    backgroundColor: C.white, padding: 14, marginBottom: 9 },
  sectionSelected: { backgroundColor: C.mint, borderColor: C.mintBorder },
  sectionOptionText: { color: C.title, fontWeight: '700', fontSize: 14 },
  sectionSelectedText: { color: C.greenDark },
  sectionMenu: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 11, padding: 9, marginBottom: 15 },
  loading: { color: C.muted, paddingVertical: 12 },
  bankRow: { flexDirection: 'row', gap: 9, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border },
  bankTitle: { fontWeight: '800', color: C.title, fontSize: 14 },
  bankDetail: { color: C.muted, fontSize: 12, marginTop: 4 },
  bankActions: { alignItems: 'flex-end', gap: 7, maxWidth: 110 },
  removeText: { color: C.danger, fontSize: 12, padding: 5, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 13 },
  toggleLabel: { color: C.title, fontSize: 14, fontWeight: '700' },
  toggleDescription: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  groupTitle: { color: C.greenDark, fontSize: 13, fontWeight: '800', marginTop: 18, marginBottom: 9 },
  datasetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  dataset: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, gap: 6 },
  datasetSelected: { backgroundColor: C.mint, borderColor: C.mintBorder },
  datasetCheck: { fontSize: 15, color: C.faint },
  datasetLabel: { fontSize: 11, color: C.title, flex: 1 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  mode: { borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingVertical: 9, paddingHorizontal: 10, backgroundColor: C.white },
  modeSelected: { backgroundColor: C.mint, borderColor: C.green },
  modeText: { fontSize: 12, fontWeight: '700', color: C.muted },
  lastExport: { fontSize: 12, color: C.muted, marginTop: 12 },
  bullet: { color: C.text, fontSize: 13, lineHeight: 20, marginBottom: 7 },
  dangerNotice: { borderRadius: 8, backgroundColor: '#FFF4E1', borderWidth: 1,
    borderColor: '#F2D0A2', padding: 12, marginVertical: 13 },
  dangerNoticeText: { color: C.orange, fontSize: 13, lineHeight: 19 },
  deleteRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  deleteButton: { minHeight: 40, borderRadius: 9, alignItems: 'center',
    justifyContent: 'center', backgroundColor: C.danger },
  deleteButtonText: { color: C.white, fontSize: 13, fontWeight: '800' },
  deleteNote: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 13 },
  deleted: { alignItems: 'center', padding: 25, marginTop: 35 },
  deletedIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.mint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  deletedIconText: { color: C.green, fontSize: 28, fontWeight: '800' },
  deletedTitle: { color: C.title, fontSize: 23, fontWeight: '800', marginBottom: 12 },
  deletedText: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 18 },
});
