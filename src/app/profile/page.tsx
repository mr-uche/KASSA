"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Menu, UserRound } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import KassaHeaderActions from "@/components/KassaHeaderActions";
import { loadAccess, selectedBusiness } from "@/lib/kassa-permissions";

type User = {
  id: string; fullName: string; email: string; phone: string | null;
};
export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(response.status === 401 ? "Please sign in to view your profile." :
          "Could not load your profile. Check your internet connection.");
      }
      const result: unknown = await response.json();
      if (!result || typeof result !== "object" ||
        typeof (result as { id?: unknown }).id !== "string") {
        throw new Error("Invalid profile response.");
      }
      setProfile(result as User);
      try {
        const memberships = await loadAccess();
        const selectedId = localStorage.getItem("selectedBranchId") ?? "";
        const business = selectedBusiness(memberships, selectedId);
        setRole(business?.myRole ?? "");
        setBranch(business?.branches.find((item) => item.id === selectedId)?.name ??
          business?.branches.find((item) => item.isActive)?.name ?? "");
        setBusinessName(business && "name" in business && typeof business.name === "string"
          ? business.name : "");
      } catch {
        // Personal profile remains accessible without current business metadata.
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-[#374151] lg:hidden"><Menu size={22}/></button>
            <h1 className="text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">My profile</h1>
          </div>
          <KassaHeaderActions />
        </header>
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-7 sm:px-6 lg:px-8">
          <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E5F5F0] text-emerald-800">
                <UserRound size={24}/>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#182033]">Personal account</h2>
                <p className="text-sm text-gray-500">Your KASSA staff identity</p>
              </div>
            </div>
            {loading && <p role="status" className="mt-5 text-sm text-gray-600">Loading profile...</p>}
            {error && (
              <div role="alert" className="mt-5 space-y-3">
                <p className="text-sm text-red-700">{error}</p>
                <button type="button" onClick={() => void refresh()}
                  className="rounded-lg border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-800">Retry</button>
                <Link href="/offline-sales?section=profile" className="ml-3 text-sm font-medium text-emerald-800 underline">
                  Offline profile
                </Link>
              </div>
            )}
            {!loading && profile && !error && (
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-gray-500">Full name</dt><dd className="mt-1 font-semibold">{profile.fullName}</dd></div>
                <div><dt className="text-gray-500">Email</dt><dd className="mt-1 break-all font-semibold">{profile.email}</dd></div>
                <div><dt className="text-gray-500">Phone</dt><dd className="mt-1 font-semibold">{profile.phone || "Not added"}</dd></div>
                <div><dt className="text-gray-500">Staff role</dt><dd className="mt-1 font-semibold">{role || "Not assigned"}</dd></div>
                <div><dt className="text-gray-500">Branch</dt><dd className="mt-1 font-semibold">{branch || "Not selected"}</dd></div>
                {businessName && <div><dt className="text-gray-500">Business</dt><dd className="mt-1 font-semibold">{businessName}</dd></div>}
              </dl>
            )}
          </section>
          {role === "Owner" && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-600">Business details are managed separately from your personal profile.</p>
              <Link href="/settings" className="mt-3 inline-flex rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">
                Manage business profile
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
