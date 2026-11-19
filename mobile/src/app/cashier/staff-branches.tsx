import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useKassaSession } from '@/components/kassa-demo/api';
import { KScreen, KCard, KField } from '@/components/kassa-demo/ui';
import { C } from '@/components/kassa-demo/theme';
import { DropdownFilter } from '@/components/kassa-demo/dropdown-filter';
import {
  ScreenHeading, Tabs, MetricGrid, ListHeading, RecordRow,
  InlineNotice, SmallAction,
} from '@/components/kassa-demo/business-ui';

type Tab = 'Staff' | 'Branches' | 'Roles & Permissions';
type Staff = {
  id: string; name: string; email: string; role: string;
  roleId: string | null; branchId: string | null; branch: string;
  status: 'Active' | 'Pending' | 'Expired';
};
type Branch = {
  id: string; name: string; code: string | null; address: string | null;
  city: string | null; state: string | null; phone: string | null; location: string;
  staffCount: number; status: 'Active' | 'Inactive'; createdAt: string; lastActivity: string | null;
};
type Role = {
  id: string; name: string; description: string; staff: number;
  isSystem: boolean; permissions: string[]; access: string;
};
type StaffData = { staff: Staff[]; branches: Branch[]; roles: Role[] };
type InviteResult = { token: string; id: string; expiresAt: string; delivery: 'COPY_LINK_ONLY' };
const tabs: Tab[] = ['Staff', 'Branches', 'Roles & Permissions'];

export default function StaffAndBranches() {
  const session = useKassaSession();
  const scope = session.scope;
  const [tab, setTab] = useState<Tab>('Staff');
  const [data, setData] = useState<StaffData>({ staff: [], branches: [], roles: [] });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All statuses');
  const [groupFilter, setGroupFilter] = useState('All branches');
  const [sort, setSort] = useState('Sort');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<'invite' | 'branch' | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteBranch, setInviteBranch] = useState('');
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  const reload = useCallback(async (alive: () => boolean = () => true) => {
    if (!scope) return;
    if (alive()) { setLoading(true); setError(''); }
    try {
      const result = await session.request<StaffData>('staff-branches/summary?businessId=' +
        encodeURIComponent(scope.businessId));
      if (!Array.isArray(result.staff) || !Array.isArray(result.branches) || !Array.isArray(result.roles)) {
        throw new Error('Invalid staff and branches response.');
      }
      if (alive()) setData(result);
    } catch (cause) {
      if (alive()) {
        setData({ staff: [], branches: [], roles: [] });
        setError(cause instanceof Error ? cause.message : 'Unable to load staff records.');
      }
    } finally { if (alive()) setLoading(false); }
  }, [scope?.businessId, session.request]);
  useFocusEffect(useCallback(() => {
    let alive = true;
    void reload(() => alive);
    return () => { alive = false; };
  }, [reload]));

  const activeBranches = data.branches.filter(item => item.status === 'Active');
  const availableRoles = data.roles.filter(item => item.name !== 'Owner');
  const groupOptions = tab === 'Staff'
    ? ['All branches', ...new Set(data.staff.map(item => item.branch).filter(Boolean))]
    : tab === 'Branches'
      ? ['All locations', ...new Set(data.branches.map(item => item.location).filter(Boolean))]
      : ['All roles', 'System roles', 'Custom roles'];
  const statusOptions = tab === 'Staff'
    ? ['All statuses', 'Active', 'Pending', 'Expired']
    : tab === 'Branches' ? ['All statuses', 'Active', 'Inactive']
      : ['All access', ...new Set(data.roles.map(item => item.access).filter(Boolean))];
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sortByName = <T extends { name: string }>(items: T[]): T[] =>
      sort === 'Name A–Z' ? items.sort((a, b) => a.name.localeCompare(b.name)) :
        sort === 'Name Z–A' ? items.sort((a, b) => b.name.localeCompare(a.name)) : items;
    return {
      staff: sortByName(data.staff.filter(item =>
        (item.name + ' ' + item.email + ' ' + item.role + ' ' + item.branch).toLowerCase().includes(q) &&
        (filter === 'All statuses' || item.status === filter) &&
        (groupFilter === 'All branches' || item.branch === groupFilter))),
      branches: sortByName(data.branches.filter(item =>
        (item.name + ' ' + item.location).toLowerCase().includes(q) &&
        (filter === 'All statuses' || item.status === filter) &&
        (groupFilter === 'All locations' || item.location === groupFilter))),
      roles: sortByName(data.roles.filter(item =>
        (item.name + ' ' + item.description + ' ' + item.access).toLowerCase().includes(q) &&
        (filter === 'All access' || item.access === filter) &&
        (groupFilter === 'All roles' ||
          (groupFilter === 'System roles' ? item.isSystem : !item.isSystem)))),
    };
  }, [data, search, filter, groupFilter, sort]);
  const stats = tab === 'Staff' ? [
    { label: 'Total staff', value: String(data.staff.length) },
    { label: 'Active', value: String(data.staff.filter(item => item.status === 'Active').length) },
    { label: 'Pending invites', value: String(data.staff.filter(item => item.status === 'Pending').length) },
  ] : tab === 'Branches' ? [
    { label: 'Total branches', value: String(data.branches.length) },
    { label: 'Active branches', value: String(activeBranches.length) },
    { label: 'Staff across branches', value: String(data.branches.reduce((n, branch) => n + branch.staffCount, 0)) },
  ] : [
    { label: 'Roles', value: String(data.roles.length) },
    { label: 'Staff assigned', value: String(data.roles.reduce((n, role) => n + role.staff, 0)) },
    { label: 'Custom roles', value: String(data.roles.filter(role => !role.isSystem).length) },
    { label: 'Access levels', value: String(new Set(data.roles.map(role => role.access)).size) },
  ];
  const selectedRole = data.roles.find(item => item.id === inviteRole);
  const selectedBranch = data.branches.find(item => item.id === inviteBranch);

  async function invite() {
    if (!scope || busy) return;
    if (!fullName.trim() || fullName.trim().length > 120 ||
      !/^\S+@\S+\.\S+$/.test(email.trim()) || !inviteRole || !inviteBranch) {
      setError('Enter a valid name, email, role and active branch.');
      return;
    }
    setBusy(true); setError('');
    try {
      const result = await session.request<InviteResult>('staff-branches/invitations', {
        businessId: scope.businessId, fullName: fullName.trim(),
        email: email.trim().toLowerCase(), roleId: inviteRole, branchId: inviteBranch,
      });
      setInviteResult(result);
      await reload();
      Alert.alert('Invitation created', 'The invitation must be shared manually. No invitation email was sent.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create invitation.'); }
    finally { setBusy(false); }
  }
  const shareInvitation = async () => {
    if (!inviteResult) return;
    const base = (process.env.EXPO_PUBLIC_KASSA_WEB_URL || '').trim().replace(/\/+$/, '');
    const destination = /^https:\/\//.test(base)
      ? base + '/staff-invite?token=' + encodeURIComponent(inviteResult.token)
      : '';
    const message = destination || 'KASSA staff invite token: ' + inviteResult.token +
      '\nOpen the KASSA Web staff invitation page and enter this token. Contact the sender for the correct website.';
    try { await Share.share({ message }); }
    catch { setError('Unable to share the invitation. The saved invitation remains pending.'); }
  };
  async function createBranch() {
    if (!scope || busy) return;
    if (!branchName.trim() || branchName.trim().length > 120 || branchAddress.trim().length > 250) {
      setError('Enter a branch name of up to 120 characters and address of up to 250 characters.');
      return;
    }
    setBusy(true); setError('');
    try {
      await session.request('staff-branches/branches', {
        businessId: scope.businessId, name: branchName.trim(),
        address: branchAddress.trim() || undefined, isActive: true,
      });
      setBranchName(''); setBranchAddress(''); setForm(null);
      await reload();
      Alert.alert('Branch created', 'The new branch was added to this business.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create branch.'); }
    finally { setBusy(false); }
  }

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <ScreenHeading title="Staff & Branches" subtitle={scope?.businessName ?? 'Your business'}
      right={<SmallAction label="Refresh" secondary onPress={() => { void reload(); }} disabled={loading}/>}/>
    <Tabs options={tabs} value={tab} onChange={value => {
      setTab(value);
      setGroupFilter(value === 'Staff' ? 'All branches' : value === 'Branches' ? 'All locations' : 'All roles');
      setFilter(value === 'Roles & Permissions' ? 'All access' : 'All statuses');
      setSort('Sort');
      setSearch('');
      setShowAll(false);
      setForm(null);
    }}/>
    <View style={s.filtersRow}>
      <DropdownFilter label={tab === 'Staff' ? 'Branch' : tab === 'Branches' ? 'Location' : 'Role type'}
        value={groupFilter} options={groupOptions} onChange={setGroupFilter}/>
      <DropdownFilter label={tab === 'Roles & Permissions' ? 'Access' : 'Status'}
        value={filter} options={statusOptions} onChange={setFilter}/>
      <DropdownFilter label="Sort" value={sort} options={['Sort', 'Name A–Z', 'Name Z–A']}
        onChange={setSort}/>
    </View>
    <View style={s.searchActionRow}>
      <TextInput
        accessibilityLabel={tab === 'Staff' ? 'Search staff by name, email or role' :
          tab === 'Branches' ? 'Search branches' : 'Search roles'}
        autoCapitalize="none"
        autoCorrect={false}
        value={search}
        onChangeText={setSearch}
        placeholder={tab === 'Staff' ? 'Search staff by name, email or role' :
          tab === 'Branches' ? 'Search branches' : 'Search roles'}
        placeholderTextColor={C.faint}
        style={s.searchInput}
      />
      {tab === 'Staff' && <SmallAction label="+ Invite staff" onPress={() => {
        setForm(value => value === 'invite' ? null : 'invite'); setInviteResult(null);
      }}/>}
      {tab === 'Branches' && <SmallAction label="+ Add branch"
        onPress={() => setForm(value => value === 'branch' ? null : 'branch')}/>}
    </View>
    {form === 'invite' && <KCard>
      <Text style={s.section}>Invite a staff member</Text>
      <KField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Full name"/>
      <KField label="Email address" value={email} onChangeText={setEmail}
        keyboardType="email-address" placeholder="staff@example.com"/>
      <Text style={s.fieldLabel}>Role</Text>
      <Tabs options={availableRoles.map(item => item.name)} value={selectedRole?.name ?? ''}
        onChange={name => setInviteRole(availableRoles.find(role => role.name === name)?.id ?? '')}/>
      <Text style={s.fieldLabel}>Branch</Text>
      <Tabs options={activeBranches.map(item => item.name)} value={selectedBranch?.name ?? ''}
        onChange={name => setInviteBranch(activeBranches.find(branch => branch.name === name)?.id ?? '')}/>
      <SmallAction label={busy ? 'Creating…' : 'Create invite'} disabled={busy}
        onPress={() => { void invite(); }}/>
      {!!inviteResult && <View style={s.invitation}>
        <InlineNotice text="Invitation created. No email is sent automatically; share this link or token securely."/>
        <SmallAction label="Share invitation" secondary onPress={() => { void shareInvitation(); }}/>
      </View>}
    </KCard>}
    {form === 'branch' && <KCard>
      <Text style={s.section}>Add a branch</Text>
      <KField label="Branch name" value={branchName} onChangeText={setBranchName} placeholder="e.g. Main Branch"/>
      <KField label="Address (optional)" value={branchAddress} onChangeText={setBranchAddress} placeholder="Branch address"/>
      <SmallAction label={busy ? 'Creating…' : 'Save branch'} disabled={busy}
        onPress={() => { void createBranch(); }}/>
    </KCard>}
    {loading && <Text style={s.message}>Loading business records…</Text>}
    {!!error && <InlineNotice text={error} warning/>}
    <MetricGrid items={stats}/>
    <ListHeading title={tab === 'Staff' ? 'Staff members' : tab === 'Branches' ? 'Branches' : 'Roles'}
      action={showAll ? 'Show less' : 'View all'} onPress={() => setShowAll(value => !value)}/>
    {tab === 'Staff' && (showAll ? visible.staff : visible.staff.slice(0, 10)).map(person =>
      <RecordRow key={person.id} title={person.name}
        subtitle={person.email + ' · ' + person.role + ' · ' + person.branch}
        status={person.status} tone={person.status === 'Active' ? 'green' : 'orange'}
        onPress={() => Alert.alert(person.name, 'Role: ' + person.role + '\nBranch: ' + person.branch + '\nStatus: ' + person.status)}/>)}
    {tab === 'Branches' && (showAll ? visible.branches : visible.branches.slice(0, 10)).map(branch =>
      <RecordRow key={branch.id} title={branch.name}
        subtitle={branch.location + ' · ' + branch.staffCount + ' staff'}
        status={branch.status} tone={branch.status === 'Active' ? 'green' : 'gray'}
        onPress={() => Alert.alert(branch.name,
          'Location: ' + branch.location + '\nStaff: ' + branch.staffCount + '\nStatus: ' + branch.status)}/>)}
    {tab === 'Roles & Permissions' && (showAll ? visible.roles : visible.roles.slice(0, 10)).map(role =>
      <RecordRow key={role.id} title={role.name}
        subtitle={role.description || role.access}
        detail={role.staff + ' staff assigned · ' + role.access}
        onPress={() => Alert.alert(role.name,
          (role.description || role.access) + '\n\nPermissions:\n' + (role.permissions.join('\n') || 'None'))}/>)}
    {!loading && !error && (tab === 'Staff' ? !visible.staff.length :
      tab === 'Branches' ? !visible.branches.length : !visible.roles.length) &&
      <InlineNotice text="No records match these filters."/>}
    {tab === 'Roles & Permissions' && <InlineNotice
      text="Permission tip: Staff members only have access granted by their saved role. No role rules are changed on this screen."/>}
  </KScreen>;
}

const s = StyleSheet.create({
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  searchActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border, borderRadius: 9,
    backgroundColor: C.white, color: C.title, fontSize: 13 },
  section: { color: C.title, fontSize: 17, fontWeight: '800', marginBottom: 15 },
  fieldLabel: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  message: { color: C.muted, fontSize: 14, marginBottom: 14 },
  invitation: { marginTop: 14 },
});
