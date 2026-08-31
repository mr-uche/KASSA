"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

const navItems = [
  "Business profile",
  "Subscription & Billing",
  "Payout Preferences",
  "Notifications",
  "Data Export",
  "Delete Account",
] as const;
type NavItem = (typeof navItems)[number];

const billingHistory = [
  {
    date: "Aug 21, 2026",
    description: "Hefa Business — Monthly",
    amount: "₦25,000",
    status: "Paid",
  },
  {
    date: "Jul 21, 2026",
    description: "Hefa Business — Monthly",
    amount: "₦25,000",
    status: "Paid",
  },
];

const recentExports = [
  {
    name: "Export_2026-08-20.csv",
    data: "All selected data",
    requested: "20 Aug 2026",
    status: "Ready",
  },
];

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`w-11 h-6 rounded-full relative shrink-0 transition-colors ${
        checked ? "bg-emerald-700" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
          checked ? "right-0.5" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [active, setActive] = useState<NavItem>("Business profile");
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<0 | 1 | 2 | 3>(0);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");

  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0 = confirm, 1 = final, 2 = deleted
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [form, setForm] = useState({
    businessName: "Adebola Pharmacy",
    businessType: "Pharmacy",
    supportEmail: "adebola@pharmacy.ng",
    supportPhone: "+234 803 555 0192",
    address: "12 Aminu Kano Crescent, Wuse II, Abuja",
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ---- Notifications state ----
  const [notif, setNotif] = useState({
    successfulPayments: true,
    failedPayments: true,
    lowStockAlerts: true,
    payoutUpdates: true,
    staffActivity: false,
    securityAlerts: true,
    productUpdates: false,
    channelEmail: true,
    channelInApp: true,
    channelSms: false,
  });
  const toggleNotif = (key: keyof typeof notif) =>
    setNotif((prev) => ({ ...prev, [key]: !prev[key] }));

  // ---- Data export state ----
  const [exportData, setExportData] = useState({
    transactions: true,
    productsInventory: true,
    customers: true,
    staff: true,
    branches: true,
    reportsAnalytics: false,
  });
  const toggleExportData = (key: keyof typeof exportData) =>
    setExportData((prev) => ({ ...prev, [key]: !prev[key] }));
  const [exportFormat, setExportFormat] = useState("CSV");
  const [exportDateRange, setExportDateRange] = useState("All available data");

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

        <div className="flex gap-6">
          {/* Left nav */}
          <aside className="w-64 shrink-0">
            <nav className="bg-white rounded-xl border border-gray-200 p-2">
              {navItems.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setActive(item);
                    if (item === "Delete Account") {
                      setDeleteStep(0);
                      setDeleteConfirmText("");
                    }
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active === item
                      ? "bg-emerald-50 text-emerald-800"
                      : item === "Delete Account"
                      ? "text-red-600 hover:bg-red-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 space-y-6">
            {active === "Business profile" && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Business profile
                  </h2>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Business name
                      </label>
                      <input
                        value={form.businessName}
                        onChange={(e) => handleChange("businessName", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Business type
                      </label>
                      <input
                        value={form.businessType}
                        onChange={(e) => handleChange("businessType", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Support email
                      </label>
                      <input
                        value={form.supportEmail}
                        onChange={(e) => handleChange("supportEmail", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Support phone
                      </label>
                      <input
                        value={form.supportPhone}
                        onChange={(e) => handleChange("supportPhone", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Business address
                      </label>
                      <input
                        value={form.address}
                        onChange={(e) => handleChange("address", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <button className="mt-6 bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                    Save changes
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Current plan
                  </h2>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                        Growth tier
                      </span>
                      <span className="text-sm text-gray-600">
                        ₦12,500 / month · renews 1 Sep 2026
                      </span>
                    </div>
                    <button
                      onClick={() => setShowChangePlan(true)}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Change plan
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Includes: 2 branches, unlimited transactions, priority support
                  </p>
                </div>
              </>
            )}

            {active === "Subscription & Billing" && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Subscription & billing
                  </h2>
                  <p className="text-sm text-gray-500 mb-5">
                    Manage your plan, billing cycle, payment method, and invoices.
                  </p>

                  <div className="border border-gray-200 rounded-lg p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        Current plan
                      </p>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-semibold text-gray-900">
                          Growth
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mb-1">
                        ₦15,000{" "}
                        <span className="text-sm font-normal text-gray-500">
                          /month
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Up to 3 branches · Up to 2,000 transactions/month
                      </p>
                      <p className="text-sm text-gray-500">
                        Next billing date: September 18, 2026
                      </p>
                    </div>
                    <button
                      onClick={() => setShowChangePlan(true)}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
                    >
                      Change plan
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Billing details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Billing cycle</p>
                      <p className="font-semibold text-gray-900 mb-1">Monthly</p>
                      <p className="text-xs text-gray-400">
                        Next billing date: September 21, 2026
                      </p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Amount</p>
                      <p className="font-semibold text-gray-900 mb-1">₦25,000</p>
                      <p className="text-xs text-gray-400">per month</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Payment method
                  </h3>
                  <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded bg-gray-900 flex items-center justify-center text-white text-[10px] font-bold">
                        VISA
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Visa ending in 4242
                        </p>
                        <p className="text-xs text-gray-400">Expires 08/28</p>
                      </div>
                    </div>
                    <button className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                      Update
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900">
                      Billing history
                    </h3>
                    <button className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                      View all
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Description</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingHistory.map((row) => (
                        <tr key={row.date} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 text-gray-700">{row.date}</td>
                          <td className="py-3 text-gray-700">{row.description}</td>
                          <td className="py-3 text-gray-700">{row.amount}</td>
                          <td className="py-3">
                            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {active === "Payout Preferences" && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Payout Preferences
                  </h2>
                  <p className="text-sm text-gray-500 mb-5">
                    Choose where and when your business receives payouts.
                  </p>

                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Payout account
                  </p>
                  <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                        <div className="w-4 h-0.5 bg-emerald-700 relative before:content-[''] before:absolute before:-top-1.5 before:w-4 before:h-0.5 before:bg-emerald-700 after:content-[''] after:absolute after:top-1.5 after:w-4 after:h-0.5 after:bg-emerald-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          GTBank Business Account
                        </p>
                        <p className="text-xs text-gray-500">**** 4821 · Adebola Okafor</p>
                        <p className="text-xs text-gray-400">Primary payout account</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        Verified
                      </span>
                      <button className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                        Change
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Payout schedule
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1.5">Frequency</p>
                      <select className="w-full font-semibold text-gray-900 bg-transparent focus:outline-none">
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                      </select>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Next payout</p>
                      <p className="font-semibold text-gray-900">Today · 5:00 PM</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Automatic payouts
                  </p>
                  <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Automatic payouts</p>
                      <p className="text-sm text-gray-500">
                        Automatically send your available balance to the payout account.
                      </p>
                    </div>
                    <button
                      role="switch"
                      aria-checked="true"
                      className="w-11 h-6 rounded-full bg-emerald-700 relative shrink-0"
                    >
                      <span className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Payout rules
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Minimum payout amount</p>
                      <p className="font-semibold text-gray-900">₦10,000</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Payout currency</p>
                      <p className="font-semibold text-gray-900">NGN (₦)</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {active === "Notifications" && (
              <div className="grid grid-cols-3 gap-6 items-start">
                <div className="col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-900">Transaction alerts</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Stay informed about important payment activity.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Successful payments</p>
                          <p className="text-xs text-gray-500">
                            Get notified when a payment is completed.
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={notif.successfulPayments}
                          onChange={() => toggleNotif("successfulPayments")}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          Failed or reversed payments
                        </p>
                        <ToggleSwitch
                          checked={notif.failedPayments}
                          onChange={() => toggleNotif("failedPayments")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-900">Business alerts</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Receive alerts that help you stay on top of operations.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Low stock alerts</p>
                        <ToggleSwitch
                          checked={notif.lowStockAlerts}
                          onChange={() => toggleNotif("lowStockAlerts")}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Payout updates</p>
                        <ToggleSwitch
                          checked={notif.payoutUpdates}
                          onChange={() => toggleNotif("payoutUpdates")}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Staff activity</p>
                        <ToggleSwitch
                          checked={notif.staffActivity}
                          onChange={() => toggleNotif("staffActivity")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Account & system
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Security alerts</p>
                        <ToggleSwitch
                          checked={notif.securityAlerts}
                          onChange={() => toggleNotif("securityAlerts")}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          Product and feature updates
                        </p>
                        <ToggleSwitch
                          checked={notif.productUpdates}
                          onChange={() => toggleNotif("productUpdates")}
                        />
                      </div>
                    </div>
                  </div>

                  <button className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                    Save Changes
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Delivery channels</h3>
                  <p className="text-xs text-gray-500 -mt-3 mb-4">Where your notifications are sent.</p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-xs text-gray-400">admin@kassa.business</p>
                      </div>
                      <ToggleSwitch
                        checked={notif.channelEmail}
                        onChange={() => toggleNotif("channelEmail")}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">In-app</p>
                        <p className="text-xs text-gray-400">Notifications in Kassa</p>
                      </div>
                      <ToggleSwitch
                        checked={notif.channelInApp}
                        onChange={() => toggleNotif("channelInApp")}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">SMS</p>
                        <p className="text-xs text-gray-400">For critical alerts only</p>
                      </div>
                      <ToggleSwitch
                        checked={notif.channelSms}
                        onChange={() => toggleNotif("channelSms")}
                      />
                    </div>
                  </div>

                  <div className="mt-5 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-emerald-800 mb-1">Notification tip</p>
                    <p className="text-xs text-emerald-700">
                      Keep alerts enabled for important security and payout events so nothing gets
                      missed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {active === "Data Export" && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Data Export</h2>
                  <p className="text-sm text-gray-500 mb-5">
                    Choose the business data you want to download.
                  </p>

                  <p className="text-sm font-medium text-gray-900 mb-3">Data to export</p>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {(
                      [
                        { key: "transactions", label: "Transactions" },
                        { key: "productsInventory", label: "Products & Inventory" },
                        { key: "customers", label: "Customers" },
                        { key: "staff", label: "Staff" },
                        { key: "branches", label: "Branches" },
                        { key: "reportsAnalytics", label: "Reports & Analytics" },
                      ] as const
                    ).map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={exportData[key]}
                          onChange={() => toggleExportData(key)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-700"
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Export format
                      </label>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      >
                        <option>CSV</option>
                        <option>XLSX</option>
                        <option>PDF</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Transaction date range
                      </label>
                      <select
                        value={exportDateRange}
                        onChange={(e) => setExportDateRange(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      >
                        <option>All available data</option>
                        <option>Last 30 days</option>
                        <option>Last 90 days</option>
                        <option>This year</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex gap-2 mb-5">
                    <span className="text-emerald-600 shrink-0">ⓘ</span>
                    <p className="text-xs text-emerald-700">
                      Your export will be prepared securely. Large exports may take a few minutes.
                      You can continue using Kassa while it is prepared.
                    </p>
                  </div>

                  <button className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                    Export data
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Recent Exports</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Your most recent data export requests.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        <th className="pb-3 font-medium">Export</th>
                        <th className="pb-3 font-medium">Data</th>
                        <th className="pb-3 font-medium">Requested</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentExports.map((row) => (
                        <tr key={row.name} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 text-gray-900 font-medium">{row.name}</td>
                          <td className="py-3 text-gray-700">{row.data}</td>
                          <td className="py-3 text-gray-700">{row.requested}</td>
                          <td className="py-3">
                            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3">
                            <button className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Your Data, Your Control
                  </h3>
                  <p className="text-sm text-gray-500">
                    Exports contain business information and should be stored securely. Kassa does
                    not lock your data in.
                  </p>
                </div>
              </>
            )}

            {active === "Delete Account" && deleteStep === 0 && (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-1">
                    <span className="text-red-500">⚠</span> This action is permanent
                  </p>
                  <p className="text-sm text-red-600">
                    You will be signed out and will no longer be able to access this account.
                    <br />
                    There is no undo option after deletion is completed.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    What will be deleted
                  </h3>
                  <ul className="space-y-2.5 text-sm text-gray-600">
                    {[
                      "Your Kassa account and login access",
                      "Business profile and eligible account settings",
                      "Eligible customer, staff, product and catalogue data",
                      "Saved preferences and notification settings",
                      "Eligible reports and account history",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-1">
                    <span className="text-amber-500">ⓘ</span> Some financial records may be
                    retained
                  </p>
                  <p className="text-sm text-amber-700">
                    Certain transaction, payout, tax, audit, or compliance records may need to be
                    retained where required by law or for legitimate business records.
                    <br />
                    Retained records do not restore your account or login access.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Ready to delete your account?
                  </h3>
                  <p className="text-sm text-gray-500 mb-5">
                    The next step will ask you to confirm this permanent action.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setActive("Business profile")}
                      className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setDeleteStep(1)}
                      className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>

                <p className="text-center text-xs text-gray-400">
                  Need help before deleting your account?{" "}
                  <a href="/support" className="text-emerald-700 hover:underline">
                    Contact support
                  </a>
                </p>
              </div>
            )}

            {active === "Delete Account" && deleteStep === 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-2xl">
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-lg">
                    ⚠
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Are you sure you want to delete your account?
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    This is the final confirmation. Account deletion cannot be undone.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-red-700 mb-1">
                    What happens when you continue
                  </p>
                  <ul className="space-y-1 text-sm text-red-600">
                    <li>• Your Kassa account and login access will be permanently closed.</li>
                    <li>• Eligible business, customer, staff and product data will be deleted.</li>
                    <li>• You will be signed out after deletion is completed.</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    Financial records may be retained
                  </p>
                  <p className="text-sm text-amber-700">
                    Certain transaction, payout, tax, audit, or compliance records may need to be
                    retained where required by law or for legitimate business records.
                  </p>
                </div>

                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Type DELETE ACCOUNT to confirm
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE ACCOUNT"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-red-400"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteStep(0)}
                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={deleteConfirmText.trim() !== "DELETE ACCOUNT"}
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete Account
                  </button>
                </div>

                <p className="text-center text-xs text-gray-400 mt-4">
                  This action is permanent. There is no undo option.
                </p>
              </div>
            )}

            {active === "Delete Account" && deleteStep === 2 && (
              <div className="bg-white rounded-xl border border-gray-200 p-10 max-w-2xl text-center mx-auto">
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <Check size={28} className="text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Account deleted</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Your Kassa account has been permanently deleted.
                  <br />
                  You have been signed out.
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">What this means</p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Your account and login access are permanently closed.</li>
                    <li>• Eligible business data has been deleted as described during deletion.</li>
                    <li>• This action cannot be undone or used to restore the account.</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left mb-6">
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    Some financial records may remain
                  </p>
                  <p className="text-sm text-amber-700">
                    Certain transaction, payout, tax, audit, or compliance records may be retained
                    where required by law or for legitimate business records.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setDeleteStep(0);
                    setDeleteConfirmText("");
                    setActive("Business profile");
                    // TODO: redirect to sign-in / clear auth session
                  }}
                  className="w-full py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors mb-4"
                >
                  Back to Sign In
                </button>

                <p className="text-xs text-gray-400">
                  Need help?{" "}
                  <a href="/support" className="text-emerald-700 hover:underline">
                    Contact Kassa Support
                  </a>
                </p>
                <p className="text-xs text-gray-300 mt-1">This account is no longer accessible.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Change Plan modal */}
      {showChangePlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-8 relative">
            <button
              onClick={() => setShowChangePlan(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-semibold text-gray-900 mb-1">Change your plan</h2>
            <p className="text-sm text-gray-500 mb-6">
              Upgrade or downgrade anytime. Changes apply from your next billing date.
            </p>

            <div className="grid grid-cols-3 gap-4">
              {/* Starter */}
              <div className="border border-gray-200 rounded-xl p-5 flex flex-col">
                <h3 className="font-semibold text-gray-900 mb-1">Starter</h3>
                <p className="text-xs text-gray-500 mb-4">For single-branch businesses</p>
                <p className="text-2xl font-bold text-gray-900 mb-4">
                  ₦5,000<span className="text-sm font-normal text-gray-400">/month</span>
                </p>
                <ul className="space-y-2 text-sm text-gray-600 flex-1 mb-5">
                  {[
                    "1 branch",
                    "Up to 500 transactions/month",
                    "Basic daily reporting",
                    "Digital receipts",
                    "Standard support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Downgrade
                </button>
              </div>

              {/* Growth - current plan */}
              <div className="border-2 border-emerald-700 rounded-xl p-5 flex flex-col relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-700 text-white text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                  Your current plan
                </span>
                <h3 className="font-semibold text-gray-900 mb-1 mt-2">Growth</h3>
                <p className="text-xs text-gray-500 mb-4">For growing multi-branch businesses</p>
                <p className="text-2xl font-bold text-gray-900 mb-4">
                  ₦12,500<span className="text-sm font-normal text-gray-400">/month</span>
                </p>
                <ul className="space-y-2 text-sm text-gray-600 flex-1 mb-5">
                  {[
                    "Up to 2 branches",
                    "Unlimited transactions",
                    "Full reports & analytics",
                    "Staff roles & permissions",
                    "Priority support",
                    "WhatsApp payment links",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold">
                  Current plan
                </button>
              </div>

              {/* Scale */}
              <div className="border border-gray-200 rounded-xl p-5 flex flex-col">
                <h3 className="font-semibold text-gray-900 mb-1">Scale</h3>
                <p className="text-xs text-gray-500 mb-4">For high-volume, multi-branch chains</p>
                <p className="text-2xl font-bold text-gray-900 mb-4">
                  ₦15,000<span className="text-sm font-normal text-gray-400">/month</span>
                </p>
                <ul className="space-y-2 text-sm text-gray-600 flex-1 mb-5">
                  {[
                    "Unlimited branches",
                    "Unlimited transactions",
                    "Advanced analytics",
                    "Auditor & accountant access",
                    "Dedicated account manager",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setShowChangePlan(false);
                    setUpgradeStep(1);
                  }}
                  className="w-full py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors"
                >
                  Upgrade
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-6">
              Downgrading may restrict access to features and branches above your new plan&apos;s
              limit.
            </p>
          </div>
        </div>
      )}

      {/* Scale-plan upgrade flow (3 steps) */}
      {upgradeStep > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            {upgradeStep < 3 && (
              <button
                onClick={() => setUpgradeStep(0)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}

            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-4">
              Step {upgradeStep} of 3
            </p>

            {/* ---------------- STEP 1: Confirm upgrade ---------------- */}
            {upgradeStep === 1 && (
              <>
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                    <Check size={20} className="text-emerald-700" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Confirm your upgrade</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    You&apos;re switching to the Scale plan.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Scale plan</p>
                  <p className="text-xs text-gray-500 mb-4">Unlimited branches & transactions</p>

                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">New monthly price</span>
                    <span className="font-semibold text-gray-900">₦15,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Prorated charge today</span>
                    <span className="font-semibold text-gray-900">₦1,340</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2 mb-5">
                  <span className="text-blue-600 shrink-0">ⓘ</span>
                  <p className="text-xs text-blue-700">
                    Full plan price applies from your next billing date, 1 Sep 2026.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setUpgradeStep(0)}
                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setUpgradeStep(2)}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors"
                  >
                    Confirm upgrade
                  </button>
                </div>
              </>
            )}

            {/* ---------------- STEP 2: Add second branch ---------------- */}
            {upgradeStep === 2 && (
              <>
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                    <Check size={20} className="text-emerald-700" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    You&apos;re on the <span className="bg-yellow-100 px-1">Growth</span> plan
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    You now have room for a second branch.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-3 flex items-center gap-3 mb-5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Main branch — Wuse II</p>
                    <p className="text-xs text-gray-500">4 staff · already active</p>
                  </div>
                </div>

                <p className="text-sm font-semibold text-gray-900 mb-3">Add your second branch</p>

                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Branch name
                    </label>
                    <input
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Garki branch"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Branch address
                    </label>
                    <input
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      placeholder="Street, area, city"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Staff at this branch (optional)
                    </label>
                    <input
                      placeholder="You can invite staff later from Staff & branches"
                      disabled
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-400 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-5">
                  You can also add this branch anytime from Staff & branches.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setUpgradeStep(3)}
                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={() => setUpgradeStep(3)}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors"
                  >
                    Add branch
                  </button>
                </div>
              </>
            )}

            {/* ---------------- STEP 3: Redirecting to payment ---------------- */}
            {upgradeStep === 3 && (
              <div className="flex flex-col items-center text-center py-2">
                <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-emerald-600 animate-spin mb-5" />

                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Redirecting to secure payment
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Processing your ₦1,340 upgrade charge
                </p>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-5">
                  ✓ Secured by payment partner
                </span>

                <p className="text-xs text-gray-400 mb-6 max-w-xs">
                  You&apos;ll briefly leave Hefa to confirm this payment with your bank or card
                  provider, then return here automatically.
                </p>

                <div className="flex items-center gap-1.5 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                </div>

                <button
                  onClick={() => setUpgradeStep(0)}
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Cancel and stay on Growth plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}