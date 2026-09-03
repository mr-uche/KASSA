"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  ChevronDown,
  Menu,
} from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import Link from "next/link";

// ---------- Staff data ----------
type StaffMember = {
  name: string;
  email: string;
  role: string;
  branch: string;
  status: "Active" | "Pending" | "Suspended";
};

const staff: StaffMember[] = [
  { name: "Sarah Okafor", email: "sarah@hefa.com", role: "Cashier", branch: "Main Branch", status: "Active" },
  { name: "David Ibrahim", email: "david@hefa.com", role: "Branch Manager", branch: "Wuse Branch", status: "Active" },
  { name: "Amina Bello", email: "amina@hefa.com", role: "Cashier", branch: "Main Branch", status: "Pending" },
];

// ---------- Branches data ----------
type Branch = {
  name: string;
  location: string;
  staffCount: number;
  status: "Active" | "Inactive";
  lastActivity: string;
};

const branches: Branch[] = [
  { name: "Main Branch", location: "Garki, Abuja", staffCount: 4, status: "Active", lastActivity: "2 min ago" },
  { name: "Wuse Branch", location: "Wuse II, Abuja", staffCount: 2, status: "Active", lastActivity: "1 hr ago" },
];

// ---------- Roles data ----------
type Role = {
  name: string;
  description: string;
  staff: number;
  access: string;
};

const roles: Role[] = [
  { name: "Owner", description: "Full business access and administration", staff: 1, access: "Full access" },
  { name: "Branch Manager", description: "Manages branch operations and staff", staff: 1, access: "High" },
  { name: "Cashier", description: "Handles sales and customer payments", staff: 2, access: "Limited" },
  { name: "Accountant", description: "Manages reports and reconciliation", staff: 1, access: "Finance" },
  { name: "Inventory Manager", description: "Manages products and stock levels", staff: 1, access: "Inventory" },
];

const tabs = ["Staff", "Branches", "Roles & Permissions"] as const;
type Tab = (typeof tabs)[number];

function StatusBadge({ status }: { status: StaffMember["status"] | Branch["status"] }) {
  const styles: Record<string, string> = {
    Active: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Suspended: "bg-red-100 text-red-700",
    Inactive: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function StaffBranchesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Staff");
  const [query, setQuery] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    role: "",
    branch: "",
    message: "",
  });

  const handleInviteChange = (field: keyof typeof inviteForm, value: string) => {
    setInviteForm((prev) => ({ ...prev, [field]: value }));
  };

  const filteredStaff = staff.filter((s) =>
    `${s.name} ${s.email} ${s.role}`.toLowerCase().includes(query.toLowerCase())
  );

  const totalStaff = staff.length;
  const active = staff.filter((s) => s.status === "Active").length;
  const pending = staff.filter((s) => s.status === "Pending").length;

  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.status === "Active").length;
  const staffAcrossBranches = branches.reduce((sum, b) => sum + b.staffCount, 0);

  const totalRoles = roles.length;
  const staffAssigned = roles.reduce((sum, r) => sum + r.staff, 0);

  const headerButtonLabel =
    activeTab === "Staff" ? "Invite Staff" : activeTab === "Branches" ? "Add Branch" : "Add Role";

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-h-screen lg:ml-[198px] p-4 sm:p-6 lg:p-8">
        {/* Mobile header row with menu button */}
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="shrink-0 rounded-md p-1.5 text-gray-600 transition hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Staff & Branches</h1>
        </div>
        <p className="text-gray-500 mb-6 text-sm sm:text-base">
          Manage your team, branches, and access permissions.
        </p>

        {/* Tabs + action button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
          <div className="flex flex-1 bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setShowInviteForm(false);
                }}
                className={`flex-1 shrink-0 px-3 sm:px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "text-emerald-700 border-b-2 border-emerald-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Staff" ? (
            <button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              <Plus size={16} />
              {headerButtonLabel}
            </button>
          ) : (
            <Link
              href={activeTab === "Branches" ? "/staff-branches/branches/add" : "/staff-branches/roles/add"}
              className="flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              <Plus size={16} />
              {headerButtonLabel}
            </Link>
          )}
        </div>

        {/* ---------------- STAFF TAB ---------------- */}
        {activeTab === "Staff" && !showInviteForm && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Staff</h2>
            <p className="text-gray-500 mb-4 text-sm sm:text-base">Manage staff members and their access.</p>

            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 mb-6 flex flex-wrap gap-8 sm:gap-16">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Staff</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalStaff}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active</p>
                <p className="text-xl sm:text-2xl font-semibold text-emerald-700">{active}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pending Invites</p>
                <p className="text-xl sm:text-2xl font-semibold text-amber-500">{pending}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search staff by name, email or role..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 shrink-0">
                <Filter size={16} />
                Filter
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Staff Member</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Role</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Branch</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((member) => (
                    <tr key={member.email} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-gray-500 text-xs">{member.email}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{member.role}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{member.branch}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        No staff found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- INVITE STAFF FORM ---------------- */}
        {activeTab === "Staff" && showInviteForm && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Invite Staff</h2>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">
              Send an invitation to a staff member to join your Hefa account.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Staff details</h3>
                <p className="text-sm text-gray-500 mb-5">
                  Enter the staff member&apos;s details and assign their access.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={inviteForm.fullName}
                      onChange={(e) => handleInviteChange("fullName", e.target.value)}
                      placeholder="e.g. Sarah Okafor"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={inviteForm.email}
                      onChange={(e) => handleInviteChange("email", e.target.value)}
                      placeholder="staff@example.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) => handleInviteChange("role", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      >
                        <option value="">Select role</option>
                        {roles.map((r) => (
                          <option key={r.name} value={r.name}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Branch <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={inviteForm.branch}
                        onChange={(e) => handleInviteChange("branch", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      >
                        <option value="">Select branch</option>
                        {branches.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Personal message <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={inviteForm.message}
                      onChange={(e) => handleInviteChange("message", e.target.value)}
                      placeholder="Add a short message to include with the invitation..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
                    />
                  </div>

                  <p className="text-xs text-gray-400">
                    An invitation email will be sent with a secure link to set up their account.
                  </p>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
                    <button
                      onClick={() => setShowInviteForm(false)}
                      className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button className="px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors">
                      Send Invite
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                  <h3 className="text-base font-semibold text-emerald-800 mb-4">
                    Before you invite
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Assign the right role</p>
                      <p className="text-sm text-gray-500">
                        Roles determine what the staff member can view and manage in Hefa.
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Choose a branch</p>
                      <p className="text-sm text-gray-500">
                        The staff member will be associated with the selected branch.
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Invitation status</p>
                      <p className="text-sm text-gray-500">
                        You can resend or cancel pending invites from the Staff list.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                  <h3 className="text-base font-semibold text-emerald-800 mb-4">
                    Invitation flow
                  </h3>
                  <ol className="space-y-4">
                    {["Send invitation", "Staff opens secure link", "They set up their account", "They appear as Active staff"].map(
                      (step, i) => (
                        <li key={step} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-sm text-gray-700">{step}</span>
                        </li>
                      )
                    )}
                  </ol>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ---------------- BRANCHES TAB ---------------- */}
        {activeTab === "Branches" && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Branches</h2>
            <p className="text-gray-500 mb-4 text-sm sm:text-base">Manage your business locations and branch activity.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Total branches</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalBranches}</p>
                  <span className="text-xs text-emerald-600">Active</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Active branches</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{activeBranches}</p>
                  <span className="text-xs text-emerald-600">All reporting</span>
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Staff across branches</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{staffAcrossBranches}</p>
                  <span className="text-xs text-gray-400">Assigned</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search branches..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <button className="flex shrink-0 items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
                  Status <ChevronDown size={14} />
                </button>
                <button className="flex shrink-0 items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
                  Sort: Recent <ChevronDown size={14} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Branch</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Location</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Staff</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Last Activity</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.name} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center shrink-0">
                            {b.name.split(" ").map((w) => w[0]).join("")}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{b.name}</p>
                            <p className="text-gray-400 text-xs">
                              {b.name === "Main Branch" ? "Primary location" : "Branch location"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{b.location}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{b.staffCount} staff</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{b.lastActivity}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- ROLES & PERMISSIONS TAB ---------------- */}
        {activeTab === "Roles & Permissions" && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Roles & permissions</h2>
            <p className="text-gray-500 mb-4 text-sm sm:text-base">
              Control what each role can view, create, edit, and manage.
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 mb-6 flex flex-wrap gap-8 sm:gap-16">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Roles</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalRoles}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Staff Assigned</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{staffAssigned}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Custom Roles</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">2</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Access Levels</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">4</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search roles..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <button className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 shrink-0">
                All access levels <ChevronDown size={14} />
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto mb-6">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Role</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Description</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Staff</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Access</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.name} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{r.name}</td>
                      <td className="px-6 py-4 text-gray-600">{r.description}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{r.staff}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{r.access}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 mb-4">Select a role to review or edit its permissions.</p>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
              <p className="text-sm font-semibold text-emerald-800 mb-1">Permission tip</p>
              <p className="text-sm text-emerald-700">
                Give each team member only the access they need for their responsibilities.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}