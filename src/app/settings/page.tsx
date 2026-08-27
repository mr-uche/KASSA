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

export default function SettingsPage() {
  const [active, setActive] = useState<NavItem>("Business profile");
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<0 | 1 | 2 | 3>(0);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");

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
                  onClick={() => setActive(item)}
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
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                Notification settings coming soon.
              </div>
            )}
            {active === "Data Export" && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                Data export tools coming soon.
              </div>
            )}
            {active === "Delete Account" && (
              <div className="bg-white rounded-xl border border-red-200 p-6">
                <h2 className="text-lg font-semibold text-red-700 mb-2">
                  Delete Account
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  This action is permanent and cannot be undone. All your business
                  data, transactions, and staff records will be deleted.
                </p>
                <button className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
                  Delete my account
                </button>
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
                  {["1 branch", "Up to 500 transactions/month", "Basic daily reporting", "Digital receipts", "Standard support"].map(
                    (f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    )
                  )}
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
                  {["Up to 2 branches", "Unlimited transactions", "Full reports & analytics", "Staff roles & permissions", "Priority support", "WhatsApp payment links"].map(
                    (f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    )
                  )}
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
                  {["Unlimited branches", "Unlimited transactions", "Advanced analytics", "Auditor & accountant access", "Dedicated account manager"].map(
                    (f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    )
                  )}
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
              Downgrading may restrict access to features and branches above your new plan&apos;s limit.
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