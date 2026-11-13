"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import {
  getOfflineWorkspace, listOfflineSales, offlineSectionAllowed,
  type OfflineSale, type OfflineWorkspace,
} from "@/lib/offline-sales";

type Props = {
  offlineMode?: boolean;
  workspace?: OfflineWorkspace | null;
};

/**
 * Use the first letter of the first and last words for a full name.
 * For a single name such as Timi, choose its first letter and next consonant
 * (TM). If there is no second consonant, use the second letter.
 */
function initials(name?: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length > 1) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  const letters = Array.from(words[0]).filter((letter) => /\p{L}/u.test(letter));
  if (letters.length <= 1) return (letters[0] ?? "?").toUpperCase();
  const consonant = letters.slice(1).find((letter) => /[bcdfghjklmnpqrstvwxyz]/i.test(letter));
  return (letters[0] + (consonant ?? letters[1])).toUpperCase();
}

function formattedMoney(value: string): string {
  return "₦" + Number(value).toLocaleString("en-NG", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

export default function KassaHeaderActions({
  offlineMode = false, workspace: suppliedWorkspace,
}: Props) {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [fullName, setFullName] = useState("");
  const [localWorkspace, setLocalWorkspace] = useState<OfflineWorkspace | null>(null);
  const [sales, setSales] = useState<OfflineSale[]>([]);
  const wrapper = useRef<HTMLDivElement>(null);
  const activeWorkspace = suppliedWorkspace === undefined ? localWorkspace : suppliedWorkspace;
  // The cached workspace belongs to the authenticated offline identity.
  const displayName = (offlineMode || !online
    ? activeWorkspace?.userName
    : fullName || activeWorkspace?.userName) ?? "";
  const permittedSales = offlineSectionAllowed("transactions", activeWorkspace ?? null);
  const visibleSales = permittedSales ? sales : [];
  const alerts = visibleSales.filter((sale) => sale.status !== "synced").length;

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
    const controller = new AbortController();
    async function updateName() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store", credentials: "same-origin", signal: controller.signal,
        });
        if (response.status === 401) {
          if (!controller.signal.aborted) setFullName("");
          return;
        }
        if (!response.ok) return;
        const raw: unknown = await response.json();
        if (!raw || typeof raw !== "object") return;
        const profile = raw as { id?: unknown; fullName?: unknown };
        if (typeof profile.id !== "string" || typeof profile.fullName !== "string") return;
        const active = await getOfflineWorkspace();
        if (!controller.signal.aborted) {
          setFullName(profile.fullName);
          if (active?.userId !== profile.id) {
            // A staff switch must not display the previous person's offline sales.
            setLocalWorkspace(null);
            setSales([]);
          }
        }
      } catch {
        // A temporary backend outage does not clear the last verified name.
      }
    }
    void updateName();
    return () => controller.abort();
  }, [offlineMode, online]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="relative flex shrink-0 items-center gap-2 sm:gap-4" ref={wrapper}>
      <button type="button"
        aria-label={"Notifications" + (alerts ? " (" + alerts + " local sync alerts)" : "")}
        aria-expanded={open} aria-controls="kassa-notifications-panel"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#F8F9FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
        <Bell size={17} className="text-[#98A1AE]" />
        {alerts > 0 && (
          <span aria-hidden="true"
            className="absolute right-[7px] top-[5px] h-[8px] w-[8px] rounded-full border border-white bg-[#E54848]" />
        )}
      </button>
      <div role="img" aria-label={displayName ? "Signed in as " + displayName : "Staff member"}
        className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F]"
        title={displayName || "Staff member"}>
        {initials(displayName)}
      </div>

      {open && (
        <div id="kassa-notifications-panel" role="region" aria-label="Notifications"
          className="absolute right-0 top-[45px] z-[120] w-[min(345px,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 text-gray-900 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {alerts > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">
                {alerts} unsynced
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">Sales recorded on this device</p>
          <div className="mt-3 max-h-[280px] divide-y divide-gray-100 overflow-y-auto">
            {visibleSales.length === 0 ? (
              <p className="py-5 text-center text-sm text-gray-500">No local sync notifications.</p>
            ) : visibleSales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex gap-2 py-3">
                {sale.status === "synced" ? (
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-700" />
                ) : sale.status === "needs_attention" ? (
                  <CircleAlert size={17} className="mt-0.5 shrink-0 text-red-700" />
                ) : (
                  <Clock3 size={17} className="mt-0.5 shrink-0 text-amber-600" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {sale.status === "synced" ? "Cash sale synced" :
                      sale.status === "needs_attention" ? "Sale needs attention" :
                        sale.status === "syncing" ? "Syncing cash sale" : "Cash sale pending"}
                  </p>
                  <p className="text-xs text-gray-600">{formattedMoney(sale.total)}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(sale.recordedAt).toLocaleString("en-NG", {
                      dateStyle: "medium", timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {permittedSales && (
            <Link href="/offline-sales?section=transactions" onClick={() => setOpen(false)}
              className="mt-3 block rounded-lg bg-emerald-800 px-3 py-2.5 text-center text-xs font-semibold text-white">
              View local transactions
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
