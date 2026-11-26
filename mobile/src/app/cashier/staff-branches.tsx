import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useKassaSession } from '@/components/kassa-demo/api';
import { KScreen, KCard, KField } from '@/components/kassa-demo/ui';
import { C } from '@/components/kassa-demo/theme';
import { DropdownFilter } from '@/components/kassa-demo/dropdown-filter';
import {
  ScreenHeading, SegmentedTabs, MetricGrid, ListHeading, RecordRow,
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
// Match the permissions accepted by the business role-creation endpoint.
const rolePermissionOptions = [
  'View dashboard',
  'Manage sales',
  'View transactions',
  'Manage products & inventory',
  'View reports & analytics',
  'Manage customers',
  'Manage staff & branches',
  'Manage business settings',
  'View financial overview',
] as const;

export default function StaffAndBranches() {
  const session = useKassaSession();
  const scope = session.scope;
  const [tab, setTab] = useState<Tab>('Staff');
  const [data, setData] = useState<StaffData>({ staff: [], branches: [], roles: [] });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All statuses');
  const [groupFilter, setGroupFilter] = useState('All categories');
  const [sort, setSort] = useState('Sort');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<'invite' | 'branch' | 'role' | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteBranch, setInviteBranch] = useState('');
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState<string[]>([
    'View dashboard', 'Manage sales',
  ]);
  const isOwner = scope?.myRole === 'Owner';
  const visibleTabs: Tab[] = isOwner ? tabs : ['Staff', 'Branches'];

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
  }, [scope, session]);
  useFocusEffect(useCallback(() => {
    let alive = true;
    void reload(() => alive);
    return () => { alive = false; };
  }, [reload]));

  const activeBranches = data.branches.filter(item => item.status === 'Active');
  // Match the backend's role-assignment checks; managers cannot grant permissions they do not hold.
  const heldPermissions = scope?.myPermissions ?? [];
  const availableRoles = data.roles.filter(item => item.name.toLowerCase() !== 'owner' &&
    (isOwner || (Array.isArray(item.permissions) && item.permissions.every(permission =>
      heldPermissions.includes(permission) ||
      (heldPermissions.includes('Manage sales & transactions') &&
        (permission === 'Manage sales' || permission === 'View transactions'))))));
  const staffCategories = ['All categories', ...new Set(data.staff.map(item => item.role).filter(Boolean))];
  const accessLevels = ['All access levels', ...new Set(data.roles.map(item => item.access).filter(Boolean))];
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sortByName = <T extends { name: string }>(items: T[]): T[] =>
      sort === 'Name A–Z' ? items.sort((a, b) => a.name.localeCompare(b.name)) :
        sort === 'Name Z–A' ? items.sort((a, b) => b.name.localeCompare(a.name)) : items;
    const filteredBranches = data.branches.filter(item =>
      (item.name + ' ' + item.location).toLowerCase().includes(q) &&
      (filter === 'Status' || item.status === filter));
    filteredBranches.sort((a, b) =>
      sort === 'Name A–Z' ? a.name.localeCompare(b.name) :
      sort === 'Name Z–A' ? b.name.localeCompare(a.name) :
      sort === 'Oldest first' ? Date.parse(a.createdAt) - Date.parse(b.createdAt) :
      Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return {
      staff: sortByName(data.staff.filter(item =>
        (item.name + ' ' + item.email + ' ' + item.role + ' ' + item.branch).toLowerCase().includes(q) &&
        (filter === 'All statuses' || item.status === filter) &&
        (groupFilter === 'All categories' || item.role === groupFilter))),
      branches: filteredBranches,
      roles: data.roles.filter(item =>
        (item.name + ' ' + item.description + ' ' + item.access).toLowerCase().includes(q) &&
        (filter === 'All access levels' || item.access === filter)),
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
  const selectedRole = availableRoles.find(item => item.id === inviteRole);
  const selectedBranch = activeBranches.find(item => item.id === inviteBranch);

  async function invite() {
    if (!scope || busy) return;
    if (!fullName.trim() || fullName.trim().length > 120 ||
      !/^\S+@\S+\.\S+$/.test(email.trim()) || !selectedRole || !selectedBranch) {
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

  async function createRole() {
    if (!scope || busy) return;
    const name = roleName.trim();
    const description = roleDescription.trim();
    if (!name || name.length > 80 || name.toLowerCase() === 'owner' || description.length > 500) {
      setError('Enter a non-owner role name (up to 80 characters) and a description of up to 500 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (!isOwner) throw new Error('Only business owners can edit role permissions.');
      if (editingRole) {
        await session.request('staff-branches/roles/' + encodeURIComponent(editingRole.id), {
          businessId: scope.businessId, name, description, permissions: rolePermissions,
        }, 'PATCH');
      } else {
        await session.request('staff-branches/roles', {
          businessId: scope.businessId, name, description, permissions: rolePermissions,
        });
      }
      setRoleName('');
      setRoleDescription('');
      setRolePermissions(['View dashboard', 'Manage sales']);
      setEditingRole(null);
      setForm(null);
      await reload();
      Alert.alert(editingRole ? 'Role updated' : 'Role created',
        editingRole ? 'Role permissions were updated.' : 'The new role is available for staff assignments.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the role.');
    } finally {
      setBusy(false);
    }
  }

  const editRole = (role: Role) => {
    if (!isOwner || role.isSystem) return;
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description);
    const legacy = role.permissions.includes('Manage sales & transactions');
    setRolePermissions([
      ...role.permissions.filter(permission => permission !== 'Manage sales & transactions'),
      ...(legacy ? ['Manage sales', 'View transactions'] : []),
    ].filter((value, index, values) => values.indexOf(value) === index));
    setError('');
    setForm('role');
  };
  const removeRole = (role: Role) => {
    if (!scope || !isOwner || role.isSystem) return;
    Alert.alert('Remove role?', 'Remove "' + role.name +
      '"? Only roles without assigned staff or invitations can be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove role', style: 'destructive', onPress: () => {
        void (async () => {
          if (busy) return;
          setBusy(true); setError('');
          try {
            await session.request('staff-branches/roles/' + encodeURIComponent(role.id),
              { businessId: scope.businessId }, 'DELETE');
            if (editingRole?.id === role.id) { setEditingRole(null); setForm(null); }
            await reload();
            Alert.alert('Role removed', 'The role is no longer available.');
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Unable to remove the role.');
          } finally { setBusy(false); }
        })();
      } },
    ]);
  };

  return <KScreen showBrand={false} showPreviewLabel={false}>
    <ScreenHeading title="Staff & Branches" subtitle={scope?.businessName ?? 'Your business'}
      right={<SmallAction label="Refresh" secondary onPress={() => { void reload(); }} disabled={loading}/>}/>
    <SegmentedTabs options={visibleTabs} value={tab} onChange={value => {
      setTab(value);
      setGroupFilter('All categories');
      setFilter(value === 'Staff' ? 'All statuses' :
        value === 'Branches' ? 'Status' : 'All access levels');
      setSort(value === 'Branches' ? 'Sort Recent' : 'Sort');
      setSearch('');
      setShowAll(false);
      setForm(null);
    }}/>
    <View style={s.filtersRow}>
      {tab === 'Staff' && <>
        <DropdownFilter label="Category" value={groupFilter}
          options={staffCategories} onChange={setGroupFilter}/>
        <DropdownFilter label="Status" value={filter}
          options={['All statuses', 'Active', 'Pending', 'Expired']} onChange={setFilter}/>
        <DropdownFilter label="Sort" value={sort}
          options={['Sort', 'Name A–Z', 'Name Z–A']} onChange={setSort}/>
      </>}
      {tab === 'Branches' && <>
        <View style={s.branchFilter}>
          <DropdownFilter label="Status" value={filter}
            options={['Status', 'Active', 'Inactive']} onChange={setFilter}/>
        </View>
        <View style={s.branchFilter}>
          <DropdownFilter label="Sort" value={sort}
            options={['Sort Recent', 'Oldest first', 'Name A–Z', 'Name Z–A']} onChange={setSort}/>
        </View>
      </>}
      {tab === 'Roles & Permissions' && <View style={s.rolesFilter}>
        <DropdownFilter label="Access levels" value={filter}
          options={accessLevels} onChange={setFilter}/>
      </View>}
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
      {tab === 'Roles & Permissions' && isOwner && <SmallAction label="+ Add role"
        onPress={() => {
          setEditingRole(null);
          setRoleName('');
          setRoleDescription('');
          setRolePermissions(['View dashboard', 'Manage sales']);
          setForm(value => value === 'role' ? null : 'role');
        }}/>}
    </View>
    {form === 'invite' && <KCard>
      <Text style={s.section}>Invite a staff member</Text>
      <KField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Full name"/>
      <KField label="Email address" value={email} onChangeText={setEmail}
        keyboardType="email-address" placeholder="staff@example.com"/>
      <View style={s.inviteSelectRow}>
        <View style={s.inviteSelectField}>
          <Text style={s.fieldLabel}>Role</Text>
          <DropdownFilter label="Staff role" value={selectedRole?.name ?? 'Select role'}
            options={availableRoles.map(item => item.name)}
            onChange={name => setInviteRole(availableRoles.find(role => role.name === name)?.id ?? '')}/>
        </View>
        <View style={s.inviteSelectField}>
          <Text style={s.fieldLabel}>Branch</Text>
          <DropdownFilter label="Staff branch" value={selectedBranch?.name ?? 'Select branch'}
            options={activeBranches.map(item => item.name)}
            onChange={name => setInviteBranch(activeBranches.find(branch => branch.name === name)?.id ?? '')}/>
        </View>
      </View>
      {!loading && !availableRoles.length && <InlineNotice warning text={isOwner
        ? 'No assignable roles. Create a role under Roles & Permissions and try again.'
        : 'No roles are available within your permissions. Contact the business owner.'}/>}
      {!loading && !activeBranches.length && <InlineNotice warning text="No active branches are available. Add or activate a branch first."/>}
      <SmallAction label={busy ? 'Creating…' : 'Create invite'} disabled={busy || loading || !selectedRole || !selectedBranch}
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
    {form === 'role' && tab === 'Roles & Permissions' && isOwner && <KCard>
      <Text style={s.section}>{editingRole ? 'Edit role' : 'Add role'}</Text>
      <KField label="Role name" value={roleName} onChangeText={setRoleName}
        placeholder="e.g. Sales Supervisor"/>
      <KField label="Description (optional)" value={roleDescription}
        onChangeText={setRoleDescription} placeholder="What this role is responsible for"/>
      <Text style={s.fieldLabel}>Permissions</Text>
      <Text style={s.permissionHint}>Select the areas this role can access.</Text>
      {rolePermissionOptions.map(permission => {
        const checked = rolePermissions.includes(permission);
        return <Pressable key={permission} accessibilityRole="checkbox"
          accessibilityLabel={permission} accessibilityState={{ checked }}
          disabled={busy}
          onPress={() => setRolePermissions(current => current.includes(permission)
            ? current.filter(item => item !== permission) : [...current, permission])}
          style={s.permissionRow}>
          <View style={[s.permissionCheck, checked && s.permissionCheckActive]}>
            {checked && <Text style={s.permissionTick}>✓</Text>}
          </View>
          <Text style={s.permissionText}>{permission}</Text>
        </Pressable>;
      })}
      <View style={s.roleActions}>
        <SmallAction label="Cancel" secondary disabled={busy} onPress={() => setForm(null)}/>
        <SmallAction label={busy ? 'Saving…' : editingRole ? 'Save role' : 'Create role'} disabled={busy}
          onPress={() => { void createRole(); }}/>
      </View>
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
      <View key={role.id} style={s.roleListRow}>
        <View style={s.roleListInfo}>
          <RecordRow title={role.name} subtitle={role.description || role.access}
            detail={role.staff + ' staff assigned · ' + role.access}
            onPress={() => Alert.alert(role.name,
              (role.description || role.access) + '\n\nPermissions:\n' + (role.permissions.join('\n') || 'None'))}/>
        </View>
        {isOwner && !role.isSystem && <Pressable accessibilityRole="button"
          accessibilityLabel={'More options for ' + role.name}
          style={s.roleMore} onPress={() => Alert.alert(role.name, 'Choose an action', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Edit', onPress: () => editRole(role) },
            { text: 'Remove role', style: 'destructive', onPress: () => removeRole(role) },
          ])}>
          <Text style={s.roleMoreText}>⋮</Text>
        </Pressable>}
      </View>)}
    {!loading && !error && (tab === 'Staff' ? !visible.staff.length :
      tab === 'Branches' ? !visible.branches.length : !visible.roles.length) &&
      <InlineNotice text="No records match these filters."/>}
    {tab === 'Roles & Permissions' && <InlineNotice
      text="Changes to role permissions affect assigned staff. System roles cannot be edited or removed."/>}
  </KScreen>;
}

const s = StyleSheet.create({
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  branchFilter: { width: '36%', maxWidth: 145, flexDirection: 'row' },
  rolesFilter: { width: '48%', maxWidth: 190, flexDirection: 'row' },
  searchActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border, borderRadius: 9,
    backgroundColor: C.white, color: C.title, fontSize: 13 },
  section: { color: C.title, fontSize: 17, fontWeight: '800', marginBottom: 15 },
  fieldLabel: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  inviteSelectRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  inviteSelectField: { flex: 1, minWidth: 0 },
  message: { color: C.muted, fontSize: 14, marginBottom: 14 },
  invitation: { marginTop: 14 },
  permissionHint: { color: C.muted, fontSize: 12, marginBottom: 12 },
  permissionRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center',
    gap: 11, paddingVertical: 8 },
  permissionCheck: { height: 20, width: 20, borderWidth: 1,
    borderColor: C.border, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  permissionCheckActive: { backgroundColor: C.green, borderColor: C.green },
  permissionTick: { color: C.white, fontSize: 13, fontWeight: '800' },
  permissionText: { flex: 1, fontSize: 13, color: C.text },
  roleActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  roleListRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  roleListInfo: { flex: 1, minWidth: 0 },
  roleMore: { minHeight: 48, minWidth: 40, alignItems: 'center',
    justifyContent: 'center', backgroundColor: C.white, borderWidth: 1,
    borderColor: C.border, borderRadius: 9 },
  roleMoreText: { fontSize: 24, color: C.muted },
});
