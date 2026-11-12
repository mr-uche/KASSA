"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, CircleAlert, Clock3, UserRound, Settings2, LogOut } from "lucide-react";
import { getOfflineWorkspace, listOfflineSales, setOfflineActiveUser, type OfflineSale, type OfflineWorkspace } from "@/lib/offline-sales";
import { loadAccess, selectedBusiness } from "@/lib/kassa-permissions";

type Profile = { id: string; fullName?: string; email?: string; phone?: string | null };
type Props = {
  offlineMode?: boolean;
  workspace?: OfflineWorkspace | null;
  onOpenOfflineProfile?: () => void;
};
type Panel = "notifications" | "profile" | null;

function initials(name?: string): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "U";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0])
    .toUpperCase();
}
function formattedMoney(value: string): string {
  return "₦" + Number(value).toLocaleString("en-NG", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

export default function KassaHeaderActions({
  offlineMode = false, workspace: suppliedWorkspace, onOpenOfflineProfile,
}: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [online, setOnline] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [localWorkspace, setLocalWorkspace] = useState<OfflineWorkspace | null>(null);
  const [sales, setSales] = useState<OfflineSale[]>([]);
  const [role, setRole] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeWorkspace = suppliedWorkspace === undefined ? localWorkspace : suppliedWorkspace;
  const displayName = profile?.fullName || activeWorkspace?.userName || "Staff account";
  const displayEmail = profile?.email || activeWorkspace?.userEmail || "";
  const displayRole = activeWorkspace?.role || role || "Team member";
  const displayPhone = profile?.phone || activeWorkspace?.userPhone || "";
  const alerts = sales.filter((sale) => sale.status !== "synced").length;
  const items = sales.slice(0, 5);

  const refreshLocal = useCallback(async () => {
    try {
      const workspace = await getOfflineWorkspace();
      setLocalWorkspace(workspace);
      setSales(workspace ? await listOfflineSales(workspace) : []);
    } catch {
      setLocalWorkspace(null);
      setSales([]);
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refreshLocal();
    const onUpdate = () => void refreshLocal();
    const onConnection = () => { setOnline(navigator.onLine); void refreshLocal(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "kassa-offline-identity-change") void refreshLocal();
    };
    window.addEventListener("online", onConnection);
    window.addEventListener("offline", onConnection);
    window.addEventListener("focus", onUpdate);
    window.addEventListener("storage", onStorage);
    window.addEventListener("kassa-offline-sync-update", onUpdate);
    window.addEventListener("kassa-offline-account-changed", onUpdate);
    window.addEventListener("kassa-offline-catalogue-updated", onUpdate);
    return () => {
      window.removeEventListener("online", onConnection);
      window.removeEventListener("offline", onConnection);
      window.removeEventListener("focus", onUpdate);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("kassa-offline-sync-update", onUpdate);
      window.removeEventListener("kassa-offline-account-changed", onUpdate);
      window.removeEventListener("kassa-offline-catalogue-updated", onUpdate);
    };
  }, [refreshLocal]);

  useEffect(() => {
    if (offlineMode || !online) return;
    let cancelled = false;
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store", credentials: "same-origin", signal: controller.signal,
        });
        if (!response.ok) { if (!cancelled) setProfile(null); return; }
        const raw: unknown = await response.json();
        if (!raw || typeof raw !== "object" || typeof (raw as { id?: unknown }).id !== "string") return;
        const current = raw as Profile;
        if (cancelled) return;
        const cached = await getOfflineWorkspace();
        if (cancelled) return;
        // Do not display another cashier's cached profile during an account switch.
        setProfile(current);
        setLocalWorkspace(cached?.userId === current.id ? cached : null);
        setSales(cached?.userId === current.id ? await listOfflineSales(cached) : []);
        if (!cached || cached.userId !== current.id) {
          try {
            const memberships = await loadAccess();
            if (cancelled) return;
            const selectedId = localStorage.getItem("selectedBranchId") ?? "";
            setRole(selectedBusiness(memberships, selectedId)?.myRole ?? "");
          } catch { /* The account menu can still show the verified user. */ }
        } else setRole(cached.role ?? "");
      } catch {
        // Keep the existing locally verified identity on a transient outage.
      }
    }
    void loadProfile();
    return () => { cancelled = true; controller.abort(); };
  }, [online, offlineMode]);

  useEffect(() => {
    if (!panel) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setPanel(null);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [panel]);

  async function logOut() {
    if (!online || signingOut) return;
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: "{}",
      });
      if (!response.ok) return;
      await setOfflineActiveUser(null);
      window.location.replace("/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="relative flex shrink-0 items-center gap-2 sm:gap-4" ref={ref}>
      <button type="button" aria-label={"Notifications" + (alerts ? " (" + alerts + " local sync alerts)" : "")}
        aria-expanded={panel === "notifications"} aria-controls="kassa-notifications-panel"
        onClick={() => setPanel((value) => value === "notifications" ? null : "notifications")}
        className="relative flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#F8F9FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
        <Bell size={17} className="text-[#98A1AE]" />
        {alerts > 0 && <span aria-hidden="true" className="absolute right-[7px] top-[5px] h-[8px] w-[8px] rounded-full border border-white bg-[#E54848]" />}
      </button>
      <button type="button" aria-label="Your profile" aria-expanded={panel === "profile"}
        aria-controls="kassa-profile-panel"
        onClick={() => setPanel((value) => value === "profile" ? null : "profile")}
        className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
        title={displayName}>
        {initials(displayName)}
      </button>

      {panel === "notifications" && (
        <div id="kassa-notifications-panel" role="region" aria-label="Notifications"
          className="absolute right-0 top-[45px] z-[120] w-[min(345px,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 text-gray-900 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {alerts > 0 && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">{alerts} unsynced</span>}
          </div>
          <p className="mt-1 text-xs text-gray-500">Sales recorded on this device</p>
          <div className="mt-3 max-h-[280px] divide-y divide-gray-100 overflow-y-auto">
            {items.length === 0 ? (
              <p className="py-5 text-center text-sm text-gray-500">No local sync notifications.</p>
            ) : items.map((sale) => (
              <div key={sale.id} className="flex gap-2 py-3">
                {sale.status === "synced" ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-700" /> :
                  sale.status === "needs_attention" ? <CircleAlert size={17} className="mt-0.5 shrink-0 text-red-700" /> :
                  <Clock3 size={17} className="mt-0.5 shrink-0 text-amber-600" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {sale.status === "synced" ? "Cash sale synced" :
                      sale.status === "needs_attention" ? "Sale needs attention" :
                      sale.status === "syncing" ? "Syncing cash sale" : "Cash sale pending"}
                  </p>
                  <p className="text-xs text-gray-600">{formattedMoney(sale.total)}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(sale.recordedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/offline-sales?section=transactions" onClick={() => setPanel(null)}
            className="mt-3 block rounded-lg bg-emerald-800 px-3 py-2.5 text-center text-xs font-semibold text-white">
            View local transactions
          </Link>
        </div>
      )}

      {panel === "profile" && (
        <div id="kassa-profile-panel" role="region" aria-label="Account"
          className="absolute right-0 top-[45px] z-[120] w-[min(300px,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 text-gray-900 shadow-xl">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E5F5F0] font-bold text-[#08745F]">{initials(displayName)}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-gray-500">{displayEmail || displayRole}</p>
            </div>
          </div>
          <div className="space-y-1 py-3 text-xs">
            <p><span className="text-gray-500">Role:</span> <span className="font-semibold">{displayRole}</span></p>
            {activeWorkspace?.branchName && <p><span className="text-gray-500">Branch:</span> {activeWorkspace.branchName}</p>}
            {displayPhone && <p><span className="text-gray-500">Phone:</span> {displayPhone}</p>}
          </div>
          {offlineMode || !online ? (
            <button type="button" onClick={() => { setPanel(null); onOpenOfflineProfile?.(); }}
              disabled={!onOpenOfflineProfile}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50">
              <UserRound size={17} /> My account
            </button>
          ) : (
            <Link href="/profile" onClick={() => setPanel(null)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50">
              <UserRound size={17} /> My account
            </Link>
          )}
          {online && !offlineMode && displayRole === "Owner" && (
            <Link href="/settings" onClick={() => setPanel(null)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50">
              <Settings2 size={17} /> Business profile
            </Link>
          )}
          {online && !offlineMode && (
            <button type="button" disabled={signingOut} onClick={() => void logOut()}
              className="mt-1 flex w-full items-center gap-2 border-t border-gray-100 px-3 py-3 text-left text-sm text-red-700 disabled:opacity-50">
              <LogOut size={17} /> {signingOut ? "Signing out..." : "Sign out"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
