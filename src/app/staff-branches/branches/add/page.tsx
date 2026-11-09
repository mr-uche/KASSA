"use client";
 
import { useRouter } from "next/navigation";
import { useState,useEffect } from "react";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";
import { Loader2, Menu,Bell } from "lucide-react";
import { createBranch, staffContext } from "@/lib/staff-branches-client";
 
export default function AddBranchPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    staffContext().then((context) => {
      if (context.myRole !== "Owner") throw new Error("Only owners can create branches.");
      if (active) setBusinessId(context.businessId);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load your business.");
    });
    return () => { active = false; };
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    status: "Active",
  });
 
  const handleSave = async () => {
    if (saving || !businessId) return;
    if (!form.name.trim() || !form.code.trim() || !form.address.trim() ||
        !form.city.trim() || !form.state.trim()) {
      setError("Fill in the branch name, code, address, city and state.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createBranch({
        businessId, name: form.name.trim(), code: form.code.trim(),
        phone: form.phone.trim(), address: form.address.trim(),
        city: form.city.trim(), state: form.state.trim(),
        isActive: form.status === "Active",
      });
      router.replace("/staff-branches?added=branch");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create branch.");
    } finally {
      setSaving(false);
    }
  };
 
  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

// Branch selected from the dashboard
      const [selectedBranch, setSelectedBranch] = useState("Main branch");
    
      // Get the selected branch from the dashboard
      useEffect(() => {
        const savedBranch = localStorage.getItem("selectedBranch");
    
        if (savedBranch) {
          setSelectedBranch(savedBranch);
        }
      }, []);
    
      // Listen for branch changes
      useEffect(() => {
        const handleBranchChange = () => {
          const savedBranch = localStorage.getItem("selectedBranch");
    
          if (savedBranch) {
            setSelectedBranch(savedBranch);
          }
        };
    
        window.addEventListener("storage", handleBranchChange);
    
        return () => {
          window.removeEventListener("storage", handleBranchChange);
        };
      }, []);
    
  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
 
      <main className="lg:ml-[198px] ">
         {/* Header */}
                <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(true)}
                      className="shrink-0 rounded-md p-1.5 text-[#374151] transition hover:bg-[#F3F4F6] lg:hidden"
                      aria-label="Open menu"
                    >
                      <Menu size={22} />
                    </button>
        
                    <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">
                        Add branch
                    </h1>
                  </div>
        
                  <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                      {/* Branch display - no dropdown */}
                    <div className="hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]">
                      <div className="flex h-[34px] w-full items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] sm:text-[13px]">
                        <span className="truncate">{selectedBranch}</span>
                      </div>
                    </div>
        
                    <button className="relative flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#F8F9FA]">
                      <Bell size={17} className="text-[#98A1AE]" />
        
                      <span className="absolute right-[8px] top-[6px] h-[7px] w-[7px] rounded-full bg-[#E54848]" />
                    </button>
        
                    <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F]">
                      AO
                    </div>
                  </div>
                </header>
        
        <p className="text-sm sm:text-base text-gray-500 mb-6 mt-4 px-3">
          Create a new business location and assign staff to it.
        </p>
 
        {error && <p role="alert" className="mb-4 px-3 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-3">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
              Branch information
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Enter the details for this location.
            </p>
 
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Branch name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Wuse Branch"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
 
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Branch code <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="e.g. WUSE-01"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone number
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="e.g. 0803 123 4567"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>
 
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Branch address <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Street address"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
 
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="e.g. Abuja"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="">Select state</option>
                    <option value="FCT">FCT (Abuja)</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Kano">Kano</option>
                    <option value="Rivers">Rivers</option>
                    {["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
                      "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa",
                      "Kaduna","Katsina","Kebbi","Kogi","Kwara","Nasarawa","Niger","Ogun","Ondo",
                      "Osun","Oyo","Plateau","Sokoto","Taraba","Yobe","Zamfara"].map((state) =>
                      <option key={state} value={state}>{state}</option>)}
                  </select>
                </div>
              </div>
 
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Branch status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
          </div>
 
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                Add branch
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                Review before creating the location.
              </p>
 
              <div className="bg-gray-50 rounded-lg p-4 mb-5">
                <p className="text-sm font-semibold text-gray-900 mb-2">What happens next?</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Branch appears in your branch list</li>
                  <li>• You can assign staff to it</li>
                </ul>
              </div>
 
              <div className="border-t border-gray-100 pt-4 mb-5">
                <p className="text-sm font-semibold text-gray-900 mb-1">Branch access</p>
                <p className="text-sm text-gray-500">
                  Staff assigned to this branch can work from this location based on
                  their assigned role and permissions.
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !businessId}
                className="w-full flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded-lg text-sm font-medium transition-colors mb-3 disabled:opacity-70"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Adding..." : "Add branch"}
              </button>
              <Link
                href="/staff-branches"
                className="block w-full text-center border border-gray-200 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 mb-3"
              >
                Cancel
              </Link>
              <p className="text-xs text-gray-400 text-center">
                Staff can only be assigned to active branches.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}