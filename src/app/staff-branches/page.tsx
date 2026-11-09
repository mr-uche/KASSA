"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCircle2, ChevronDown, Loader2, Menu, MoreHorizontal, Plus, Search, X,
} from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import {
  createInvitation, getStaffSummary, revokeInvitation, staffContext, updateStaff, staffPatch,
  type BranchRecord, type RoleRecord, type StaffRecord, type StaffSummary,
} from "@/lib/staff-branches-client";

const tabs = ["Staff", "Branches", "Roles & Permissions"] as const;
type Tab = typeof tabs[number];

function StatusBadge({ status }: { status: string }) {
  const cls = status === "Active" ? "bg-green-100 text-green-700" :
    status === "Pending" ? "bg-yellow-100 text-yellow-700" :
    "bg-gray-100 text-gray-600";
  return <span className={"whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium " + cls}>{status}</span>;
}

function FilterSelect({ value, choices, onChange }: {
  value: string; choices: string[]; onChange(value: string): void;
}) {
  return (
    <div className="relative w-full shrink-0 sm:w-auto">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-700">
        {choices.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"/>
    </div>
  );
}

export default function StaffBranchPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Staff");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [branchDisplay, setBranchDisplay] = useState("All branches");
  const [data, setData] = useState<StaffSummary>({ staff: [], branches: [], roles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [staffStatus, setStaffStatus] = useState("Filter");
  const [branchQuery, setBranchQuery] = useState("");
  const [branchStatus, setBranchStatus] = useState("Status");
  const [branchSort, setBranchSort] = useState("Sort: Recent");
  const [roleQuery, setRoleQuery] = useState("");
  const [roleAccess, setRoleAccess] = useState("All access levels");
  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    fullName: "", email: "", role: "", branch: "", message: "",
  });
  const [inviteLink, setInviteLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StaffRecord | null>(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null);
  const [roleDraft, setRoleDraft] = useState({ name: "", description: "", permissions: [] as string[] });
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);
  const [branchDraft, setBranchDraft] = useState({
    name: "", code: "", address: "", city: "", state: "", phone: "", isActive: true,
  });
  const editablePermissions = [
    "View dashboard", "Manage sales & transactions", "Manage products & inventory",
    "View reports & analytics", "Manage customers",
  ];

  const reload = useCallback(async (id: string) => {
    const summary = await getStaffSummary(id);
    setData(summary);
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const context = await staffContext();
        if (context.myRole !== "Owner") {
          throw new Error("Only business owners may manage staff, branches and roles.");
        }
        const summary = await getStaffSummary(context.businessId);
        if (!active) return;
        setBusinessId(context.businessId);
        setBranchDisplay(context.branchName);
        setData(summary);
        const created = new URLSearchParams(window.location.search).get("added");
        if (created === "branch" || created === "role") {
          setToast(created === "branch" ? "Branch added successfully" : "Role added successfully");
          setTab(created === "branch" ? "Branches" : "Roles & Permissions");
          router.replace("/staff-branches");
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load staff information.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const staff = data.staff.filter((person) =>
    (staffStatus === "Filter" || staffStatus === person.status) &&
    (person.name + " " + person.email + " " + person.branch + " " + person.role).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const branches = data.branches
    .filter((branch) => (branchStatus === "Status" || branch.status === branchStatus) &&
      (branch.name + " " + branch.location).toLowerCase().includes(branchQuery.trim().toLowerCase()))
    .sort((a, b) => {
      if (branchSort === "Name A-Z") return a.name.localeCompare(b.name);
      if (branchSort === "Name Z-A") return b.name.localeCompare(a.name);
      return branchSort === "Oldest" ? Date.parse(a.createdAt) - Date.parse(b.createdAt) :
        Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  const roles = data.roles.filter((role) =>
    (roleAccess === "All access levels" || role.access === roleAccess) &&
    (role.name + " " + role.description + " " + role.access).toLowerCase().includes(roleQuery.trim().toLowerCase()),
  );
  const activeBranches = data.branches.filter((b) => b.status === "Active");
  const assignableRoles = data.roles.filter((r) => r.name !== "Owner");

  function setField(field: keyof typeof inviteForm, value: string) {
    setInviteForm((current) => ({ ...current, [field]: value }));
  }

  async function createInvite() {
    if (saving || !businessId) return;
    if (!inviteForm.fullName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email.trim()) ||
      !inviteForm.role || !inviteForm.branch) {
      setError("Enter a full name, valid email, role and active branch.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await createInvitation({
        businessId, fullName: inviteForm.fullName.trim(),
        email: inviteForm.email.trim().toLowerCase(), roleId: inviteForm.role,
        branchId: inviteForm.branch, message: inviteForm.message.trim(),
      });
      setInviteLink(window.location.origin + "/staff-invite?token=" + encodeURIComponent(result.token));
      setInviteFormOpen(false);
      setInviteForm({ fullName: "", email: "", role: "", branch: "", message: "" });
      setToast("Invitation created. Copy the link to share it.");
      await reload(businessId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create invitation.");
    } finally { setSaving(false); }
  }

  async function cancelInvite(member: StaffRecord) {
    if (!businessId || !window.confirm("Cancel the invitation for " + member.email + "?")) return;
    setError("");
    try {
      await revokeInvitation(businessId, member.id);
      await reload(businessId);
      setToast("Invitation cancelled.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to cancel invitation.");
    }
  }

  async function saveAssignment() {
    if (!businessId || !editing || !editRoleId || !editBranchId || saving) {
      setError("Select a role and an active branch.");
      return;
    }
    setSaving(true);
    try {
      await updateStaff(businessId, editing.id, editRoleId, editBranchId);
      setEditing(null);
      setError("");
      await reload(businessId);
      setToast("Staff assignment updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save assignment.");
    } finally { setSaving(false); }
  }

  function editBranch(branch: BranchRecord) {
    setEditingBranch(branch);
    setBranchDraft({
      name: branch.name, code: branch.code ?? "", address: branch.address ?? "",
      city: branch.city ?? "", state: branch.state ?? "", phone: branch.phone ?? "",
      isActive: branch.status === "Active",
    });
  }

  async function saveBranch() {
    if (!businessId || !editingBranch || saving) return;
    if (!branchDraft.name.trim()) return setError("Branch name is required.");
    setSaving(true);
    setError("");
    try {
      await staffPatch("branches/" + editingBranch.id, { businessId, ...branchDraft });
      await reload(businessId);
      setEditingBranch(null);
      setToast("Branch updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update branch.");
    } finally { setSaving(false); }
  }

  function viewRole(role: RoleRecord) {
    setSelectedRole(role);
    setRoleDraft({
      name: role.name, description: role.description,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    });
  }

  async function saveRole() {
    if (!businessId || !selectedRole || selectedRole.isSystem || saving) return;
    if (!roleDraft.name.trim()) return setError("Enter a role name.");
    setSaving(true);
    setError("");
    try {
      await staffPatch("roles/" + selectedRole.id, { businessId, ...roleDraft });
      await reload(businessId);
      setSelectedRole(null);
      setToast("Role permissions updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update role.");
    } finally { setSaving(false); }
  }

  const totals = [
    tab === "Staff" ? [
      ["Total staff", data.staff.filter((s) => s.status === "Active").length],
      ["Active", data.staff.filter((s) => s.status === "Active").length],
      ["Pending invites", data.staff.filter((s) => s.status === "Pending").length],
    ] : tab === "Branches" ? [
      ["Total branches", data.branches.length],
      ["Active branches", activeBranches.length],
      ["Staff across branches", data.branches.reduce((sum, b) => sum + b.staffCount, 0)],
    ] : [
      ["Roles", data.roles.length],
      ["Staff assigned", data.roles.reduce((sum, r) => sum + r.staff, 0)],
      ["Custom roles", data.roles.filter((r) => !r.isSystem).length],
      ["Access levels", new Set(data.roles.map((r) => r.access)).size],
    ],
  ][0] as [string, number][];
  const primaryLabel = tab === "Staff" ? "Invite Staff" : tab === "Branches" ? "Add Branch" : "Add Role";

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="shrink-0 rounded-md p-1.5 text-gray-600 lg:hidden"><Menu size={22}/></button>
            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">Staff &amp; Branches</h1>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <div className="hidden w-[162px] sm:block">
              <div className="flex h-[34px] items-center rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[13px] text-[#374151]"><span className="truncate">{branchDisplay}</span></div>
            </div>
            <span aria-label="Notifications" className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#F8F9FA]"><Bell size={17} className="text-[#98A1AE]"/></span>
            <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#E5F5F0] text-xs font-semibold text-[#08745F]">AO</div>
          </div>
        </header>

        <p className="mb-5 px-4 pt-6 text-sm text-gray-500 sm:px-6 sm:pt-8 sm:text-base lg:px-8 lg:pt-12">Manage your team, branches, and access permissions.</p>
        {loading && <p className="mb-3 px-4 text-sm text-gray-500 sm:px-6 lg:px-8">Loading records...</p>}
        {error && <p role="alert" className="mb-4 px-4 text-sm text-red-700 sm:px-6 lg:px-8">{error}</p>}
        {inviteLink && (
          <div className="mx-4 mb-5 rounded-xl border border-emerald-200 bg-white p-4 sm:mx-6 lg:mx-8">
            <p className="font-semibold text-emerald-800">Invitation created — share the link securely</p>
            <p className="mb-3 text-xs text-gray-500">No invitation email has been sent. This link expires after 7 days and will disappear after you leave the page.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input aria-label="Invitation link" value={inviteLink} readOnly onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 p-2 text-xs"/>
              <button onClick={() => void navigator.clipboard.writeText(inviteLink)}
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white">Copy link</button>
              <button onClick={() => setInviteLink("")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">Dismiss</button>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex flex-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1">
            {tabs.map((item) => (
              <button key={item} onClick={() => { setTab(item); setInviteFormOpen(false); setEditing(null); }}
                className={"shrink-0 flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium " +
                  (tab === item ? "border-b-2 border-emerald-700 text-emerald-700" : "text-gray-500 hover:text-gray-700")}>
                {item}
              </button>
            ))}
          </div>
          {tab === "Staff" ? (
            <button onClick={() => setInviteFormOpen((open) => !open)} disabled={!businessId}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50">
              <Plus size={16}/>{primaryLabel}
            </button>
          ) : (
            <Link href={tab === "Branches" ? "/staff-branches/branches/add" : "/staff-branches/roles/add"}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-900">
              <Plus size={16}/>{primaryLabel}
            </Link>
          )}
        </div>

        {!inviteFormOpen && (
          <div className={"mb-6 grid grid-cols-2 gap-4 px-4 sm:px-6 lg:px-8 " + (tab === "Roles & Permissions" ? "lg:grid-cols-4" : "sm:grid-cols-3")}>
            {totals.map(([label, count]) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <p className="mb-2 text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-semibold text-gray-900">{count}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "Staff" && inviteFormOpen && (
          <div className="mx-4 grid max-w-5xl gap-6 sm:mx-6 lg:mx-8 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 lg:col-span-2">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">Invite Staff</h2>
              <p className="mb-5 text-sm text-gray-500">Enter details, choose the role, and assign an active branch.</p>
              <div className="space-y-5">
                {assignableRoles.length === 0 && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Create a staff role first in Roles &amp; Permissions.
                    {" "}<Link href="/staff-branches/roles/add" className="font-semibold underline">Add role</Link>
                  </p>
                )}
                <label className="block text-sm font-medium text-gray-700">Full name *
                  <input value={inviteForm.fullName} onChange={(e) => setField("fullName", e.target.value)}
                    placeholder="e.g. Sarah Okafor" maxLength={120}
                    className="mt-1.5 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-700"/>
                </label>
                <label className="block text-sm font-medium text-gray-700">Email address *
                  <input type="email" value={inviteForm.email} onChange={(e) => setField("email", e.target.value)}
                    placeholder="staff@example.com" maxLength={254}
                    className="mt-1.5 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-700"/>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">Role *
                    <select value={inviteForm.role} onChange={(e) => setField("role", e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm">
                      <option value="">Select role</option>
                      {assignableRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">Branch *
                    <select value={inviteForm.branch} onChange={(e) => setField("branch", e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm">
                      <option value="">Select branch</option>
                      {activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-medium text-gray-700">Personal message (optional)
                  <textarea rows={3} maxLength={600} value={inviteForm.message} onChange={(e) => setField("message", e.target.value)}
                    className="mt-1.5 w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm"/>
                </label>
                <p className="text-xs text-gray-500">A secure invitation link will be created for you to copy. No email will be sent automatically.</p>
                <div className="flex flex-wrap justify-between gap-3">
                  <button onClick={() => setInviteFormOpen(false)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm">Cancel</button>
                  <button onClick={() => void createInvite()} disabled={saving}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                    {saving && <Loader2 size={16} className="animate-spin"/>}{saving ? "Creating..." : "Create Invite Link"}
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
              <h3 className="mb-4 font-semibold text-emerald-800">Invitation flow</h3>
              <p className="mb-3 text-sm text-gray-500">1. Create and securely share the link.</p>
              <p className="mb-3 text-sm text-gray-500">2. Staff opens the link and signs in or creates an account with the invited email.</p>
              <p className="text-sm text-gray-500">3. Staff accepts their role and branch assignment.</p>
            </div>
          </div>
        )}

        {tab === "Staff" && !inviteFormOpen && (
          <section className="px-4 sm:px-6 lg:px-8">
            <h2 className="mb-1 text-xl font-semibold text-gray-900">Staff</h2>
            <p className="mb-4 text-sm text-gray-500">Manage staff members and their access.</p>
            <div className="relative z-10 mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff by name, email or role..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm"/>
              </div>
              <FilterSelect value={staffStatus} onChange={setStaffStatus} choices={["Filter","Active","Pending","Expired"]}/>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-4 font-medium">Staff Member</th><th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Branch</th><th className="px-6 py-4 font-medium">Status</th><th className="px-6 py-4 font-medium">Action</th>
                </tr></thead>
                <tbody>
                  {staff.map((person) => <tr key={person.id} className="border-b border-gray-50 last:border-0">
                    <td className="whitespace-nowrap px-6 py-4"><p className="font-medium text-gray-900">{person.name}</p><p className="text-xs text-gray-500">{person.email}</p></td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-700">{person.role}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-700">{person.branch}</td>
                    <td className="px-6 py-4"><StatusBadge status={person.status}/></td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {person.role !== "Owner" && (person.status === "Active"
                        ? <button className="flex items-center gap-1 text-xs text-emerald-800" onClick={() => {
                          setEditing(person); setEditRoleId(person.roleId ?? ""); setEditBranchId(person.branchId ?? "");
                        }}><MoreHorizontal size={16}/>Assign</button>
                        : <button className="text-xs text-red-700" onClick={() => void cancelInvite(person)}>Cancel invite</button>)}
                    </td>
                  </tr>)}
                  {!loading && staff.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No staff found.</td></tr>}
                </tbody>
              </table>
            </div>
            {editing && (
              <div className="mt-4 max-w-xl rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">Update staff assignment</h3>
                <p className="mb-3 text-sm text-gray-500">{editing.name} — {editing.email}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">Role
                    <select className="mt-1 w-full rounded-lg border border-gray-200 p-2" value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)}>
                      <option value="">Choose role</option>{assignableRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">Branch
                    <select className="mt-1 w-full rounded-lg border border-gray-200 p-2" value={editBranchId} onChange={(e) => setEditBranchId(e.target.value)}>
                      <option value="">Choose branch</option>{activeBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex gap-3">
                  <button disabled={saving} onClick={() => void saveAssignment()} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white disabled:opacity-50">Save changes</button>
                  <button onClick={() => setEditing(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">Cancel</button>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "Branches" && (
          <section className="px-4 sm:px-6 lg:px-8">
            <h2 className="mb-1 text-xl font-semibold text-gray-900">Branches</h2>
            <p className="mb-4 text-sm text-gray-500">Manage your business locations and branch activity.</p>
            <div className="relative z-10 mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={branchQuery} onChange={(e) => setBranchQuery(e.target.value)} placeholder="Search branches..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm"/>
              </div>
              <FilterSelect value={branchStatus} onChange={setBranchStatus} choices={["Status","Active","Inactive"]}/>
              <FilterSelect value={branchSort} onChange={setBranchSort} choices={["Sort: Recent","Oldest","Name A-Z","Name Z-A"]}/>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-4 font-medium">Branch</th><th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Staff</th><th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Last Activity</th><th className="px-6 py-4 font-medium">Action</th>
                </tr></thead>
                <tbody>
                  {branches.map((branch) => <tr key={branch.id} className="border-b border-gray-50 last:border-0">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                          {branch.name.split(" ").map((w) => w[0] ?? "").join("").slice(0,3).toUpperCase()}
                        </span>
                        <div><p className="font-medium text-gray-900">{branch.name}</p><p className="text-xs text-gray-400">{branch.code ?? "Branch location"}</p></div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-700">{branch.location}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-700">{branch.staffCount} staff</td>
                    <td className="px-6 py-4"><StatusBadge status={branch.status}/></td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">{branch.lastActivity ? new Date(branch.lastActivity).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"}) : "No sales yet"}</td>
                    <td className="px-6 py-4"><button className="text-xs text-emerald-800" onClick={() => editBranch(branch)}>Edit</button></td>
                  </tr>)}
                  {!loading && branches.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No branches found.</td></tr>}
                </tbody>
              </table>
            </div>
            {editingBranch && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 font-semibold text-gray-900">Edit branch</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {([
                    ["name", "Branch name"], ["code", "Branch code"], ["phone", "Phone number"],
                    ["address", "Address"], ["city", "City"], ["state", "State"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="text-sm text-gray-700">{label}
                      <input value={branchDraft[key]} maxLength={key === "address" ? 250 : 120}
                        onChange={(e) => setBranchDraft((old) => ({ ...old, [key]: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"/>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={branchDraft.isActive}
                      onChange={(e) => setBranchDraft((old) => ({ ...old, isActive: e.target.checked }))}/>
                    Active branch
                  </label>
                </div>
                <p className="mt-3 text-xs text-gray-500">Reassign active staff before deactivating a branch.</p>
                <div className="mt-4 flex gap-3">
                  <button disabled={saving} onClick={() => void saveBranch()} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white disabled:opacity-50">Save branch</button>
                  <button onClick={() => setEditingBranch(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">Cancel</button>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "Roles & Permissions" && (
          <section className="px-4 sm:px-6 lg:px-8">
            <h2 className="mb-1 text-xl font-semibold text-gray-900">Roles &amp; permissions</h2>
            <p className="mb-4 text-sm text-gray-500">Control what each role can view, create, edit, and manage.</p>
            <div className="relative z-10 mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={roleQuery} onChange={(e) => setRoleQuery(e.target.value)} placeholder="Search roles..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm"/>
              </div>
              <FilterSelect value={roleAccess} onChange={setRoleAccess} choices={["All access levels","Full access","Custom"]}/>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-4 font-medium">Role</th><th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Staff</th><th className="px-6 py-4 font-medium">Access</th><th className="px-6 py-4 font-medium">Action</th>
                </tr></thead>
                <tbody>
                  {roles.map((role) => <tr key={role.id} className="border-b border-gray-50 last:border-0">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{role.name}</td>
                    <td className="px-6 py-4 text-gray-600">{role.description || "No description"}</td>
                    <td className="px-6 py-4 text-gray-700">{role.staff}</td><td className="px-6 py-4 text-gray-700">{role.access}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button className="text-xs text-emerald-700" onClick={() => viewRole(role)}>{role.isSystem ? "View permissions" : "Edit permissions"}</button>
                    </td>
                  </tr>)}
                  {!loading && roles.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No roles found.</td></tr>}
                </tbody>
              </table>
            </div>
            {selectedRole && (
              <div className="mt-4 max-w-2xl rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 font-semibold text-gray-900">{selectedRole.name} permissions</h3>
                {selectedRole.isSystem ? <p className="text-sm text-gray-600">System role — full access. This role cannot be edited.</p> : (
                  <div className="space-y-4">
                    <label className="block text-sm text-gray-700">Role name
                      <input value={roleDraft.name} maxLength={80}
                        onChange={(e) => setRoleDraft((old) => ({ ...old, name: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"/>
                    </label>
                    <label className="block text-sm text-gray-700">Description
                      <textarea value={roleDraft.description} maxLength={500}
                        onChange={(e) => setRoleDraft((old) => ({ ...old, description: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"/>
                    </label>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Permissions</p>
                      {editablePermissions.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={roleDraft.permissions.includes(perm)}
                            onChange={(e) => setRoleDraft((old) => ({
                              ...old, permissions: e.target.checked
                                ? [...old.permissions, perm] : old.permissions.filter((p) => p !== perm),
                            }))}/>{perm}
                        </label>
                      ))}
                    </div>
                    <button disabled={saving} onClick={() => void saveRole()}
                      className="rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white disabled:opacity-50">Save role</button>
                  </div>
                )}
                <button className="ml-3 text-sm text-gray-500" onClick={() => setSelectedRole(null)}>Close</button>
              </div>
            )}
            <p className="mt-4 text-sm text-gray-500">Updates to role permissions affect assigned staff immediately on their next API request.</p>
          </section>
        )}
        <div className="h-10"/>
      </main>
      {toast && <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-lg">
        <CheckCircle2 size={20} className="text-emerald-700"/>
        <p className="text-sm font-semibold text-gray-900">{toast}</p>
        <button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={14}/></button>
      </div>}
    </div>
  );
}
