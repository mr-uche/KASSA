"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";

type StaffMember = { fullName: string; role: string; phone: string };
type Branch = { name: string; address: string; phone: string };
type PayoutSchedule = "instant" | "daily" | "weekly";

const steps = ["Business info", "Branches", "Payout schedule", "Invite staff"];

const businessTypes = [
  "Pharmacy",
  "Retail store",
  "Restaurant / Food",
  "Salon & Spa",
  "Supermarket",
  "Other",
];

const banks = [
  "Access Bank",
  "GTBank",
  "Zenith Bank",
  "UBA",
  "First Bank",
  "Fidelity Bank",
  "Union Bank",
  "Sterling Bank",
];

const roles = ["Cashier", "Branch manager", "Admin", "Owner"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [staffCount, setStaffCount] = useState("");

  // Step 2
  const [branches, setBranches] = useState<Branch[]>([
    { name: "", address: "", phone: "" },
  ]);

  // Step 3
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule>("daily");
  const [settlementBank, setSettlementBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // Step 4
  const [staff, setStaff] = useState<StaffMember[]>([
    { fullName: "", role: "Cashier", phone: "" },
    { fullName: "", role: "Branch manager", phone: "" },
  ]);

  const addBranch = () =>
    setBranches([...branches, { name: "", address: "", phone: "" }]);

  const updateBranch = (index: number, field: keyof Branch, value: string) => {
    const next = [...branches];
    next[index][field] = value;
    setBranches(next);
  };

  const addStaff = () =>
    setStaff([...staff, { fullName: "", role: "Cashier", phone: "" }]);

  const updateStaff = (index: number, field: keyof StaffMember, value: string) => {
    const next = [...staff];
    next[index][field] = value;
    setStaff(next);
  };

  const handleFinish = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto pt-10 px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
              K
            </span>
            <span className="font-semibold text-gray-900">Kassa</span>
          </div>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            Save and exit
          </button>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            Set up your business
          </h1>
          <p className="text-sm text-gray-500">
            A few details before you start taking sales. Takes about 3 minutes.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-8 max-w-lg mx-auto">
          {steps.map((label, i) => {
            const stepNum = i + 1;
            const isDone = stepNum < step;
            const isActive = stepNum === step;
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isDone || isActive
                        ? "bg-emerald-700 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isDone ? <Check size={14} /> : stepNum}
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      isActive
                        ? "text-emerald-700"
                        : isDone
                        ? "text-gray-700"
                        : "text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {stepNum < steps.length && (
                  <div
                    className={`flex-1 h-0.5 mx-2 -mt-5 ${
                      isDone ? "bg-emerald-700" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-10">
          {step === 1 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">
                Tell us about your business
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                This appears on receipts and your dashboard.
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business logo (optional)
              </label>
              <button className="w-10 h-10 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 mb-5">
                <Plus size={16} />
              </button>

              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Business name
              </label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Adebola Pharmacy"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
              />

              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Business type
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 text-gray-700"
              >
                <option value="">Select business type</option>
                {businessTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Registered business name (RC number optional)
              </label>
              <input
                value={registeredName}
                onChange={(e) => setRegisteredName(e.target.value)}
                placeholder="As registered with CAC"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
              />

              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Number of staff (total)
              </label>
              <input
                type="number"
                value={staffCount}
                onChange={(e) => setStaffCount(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">
                Add your branches
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                You can manage each branch&apos;s sales and staff separately.
              </p>

              {branches.map((branch, i) => (
                <div key={i} className="border-t border-gray-100 first:border-t-0 pt-4 first:pt-0 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Branch name
                  </label>
                  <input
                    value={branch.name}
                    onChange={(e) => updateBranch(i, "name", e.target.value)}
                    placeholder="e.g. Main branch"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address
                  </label>
                  <input
                    value={branch.address}
                    onChange={(e) => updateBranch(i, "address", e.target.value)}
                    placeholder="e.g. Wuse II, Abuja"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone number
                  </label>
                  <input
                    value={branch.phone}
                    onChange={(e) => updateBranch(i, "phone", e.target.value)}
                    placeholder="+234"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}

              <button
                onClick={addBranch}
                className="text-sm font-medium text-emerald-700 flex items-center gap-1"
              >
                <Plus size={14} /> Add another branch
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">
                Choose your payout schedule
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                This is when your reconciled sales settle to your bank account.
              </p>

              <div className="space-y-3 mb-5">
                {[
                  { id: "instant", title: "Instant payout", fee: "1.5% fee", desc: "Funds settle within minutes of each sale" },
                  { id: "daily", title: "Daily payout", fee: "Standard", desc: "Funds settle every business day at 6:00 PM" },
                  { id: "weekly", title: "Weekly payout", fee: "Lowest fee", desc: "Funds settle every Friday" },
                ].map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer ${
                      payoutSchedule === option.id
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payoutSchedule"
                      checked={payoutSchedule === option.id}
                      onChange={() =>
                        setPayoutSchedule(option.id as PayoutSchedule)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {option.title}
                        </p>
                        <p className="text-xs text-gray-500">{option.desc}</p>
                      </div>
                      <span className="text-xs font-medium text-gray-500">
                        {option.fee}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Settlement bank account
              </label>
              <select
                value={settlementBank}
                onChange={(e) => setSettlementBank(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 text-gray-700"
              >
                <option value="">Select bank</option>
                {banks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Account number
              </label>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="10-digit NUBAN number"
                maxLength={10}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">
                Invite your team
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Each staff member gets their own login and activity log.
              </p>

              {staff.map((member, i) => (
                <div key={i} className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full name
                    </label>
                    <input
                      value={member.fullName}
                      onChange={(e) => updateStaff(i, "fullName", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Role
                    </label>
                    <select
                      value={member.role}
                      onChange={(e) => updateStaff(i, "role", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone number
                    </label>
                    <input
                      value={member.phone}
                      onChange={(e) => updateStaff(i, "phone", e.target.value)}
                      placeholder="+234"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={addStaff}
                className="text-sm font-medium text-emerald-700 flex items-center gap-1 mb-2"
              >
                <Plus size={14} /> Add another staff member
              </button>
              <p className="text-xs text-gray-400">
                You can skip this and invite staff later from Staff &amp; branches.
              </p>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 disabled:opacity-40"
            >
              Back
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold"
              >
                Finish setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
