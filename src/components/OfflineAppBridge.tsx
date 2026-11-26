"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useBrowserOnline } from "@/lib/browser-state";
import { getOfflineWorkspace, offlineSectionAllowed, setOfflineActiveUser, workspaceFresh } from "@/lib/offline-sales";
import { prepareCurrentStaffOffline } from "@/lib/offline-preparation";

const SECTIONS: Array<[string, string]> = [
  ["/dashboard", "home"], ["/sales/new", "new-sale"],
  ["/transactions", "transactions"], ["/scan", "scan"],
  ["/reports", "reports"], ["/products", "products"],
  ["/customers", "customers"], ["/sales", "new-sale"],
];
function offlineSection(pathname: string): string | null {
  if (pathname === "/" || pathname === "/login") return "home";
  return SECTIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"))?.[1] ?? null;
}

/** Prepare the offline entry point from *any* Kassa screen, not only from the
 * offline-sales page. Offline routing does not grant server permissions. */
export default function OfflineAppBridge() {
  const offline = !useBrowserOnline();
  const [prepared, setPrepared] = useState(false);
  const [offlineIssue, setOfflineIssue] = useState("");

  useEffect(() => {
    let active = true;
    let preparing = false;
    let switching = false;

    // A transition never creates a sale. The offline queue keeps immutable
    // request IDs for safe sync once connectivity returns.
    async function enterOfflineSales() {
      if (!active || navigator.onLine || switching || location.pathname === "/offline-sales") return;
      switching = true;
      let navigated = false;
      try {
        if (!("serviceWorker" in navigator) || !("caches" in window)) {
          throw new Error("Offline selling is not ready on this browser. Reconnect once to prepare this device.");
        }
        const [registration, shell, workspace] = await Promise.all([
          navigator.serviceWorker.getRegistration("/"),
          caches.match("/offline-sales", { ignoreVary: true }),
          getOfflineWorkspace(),
        ]);
        if (!active || navigator.onLine) return;
        if (!registration?.active || !shell) {
          throw new Error("Offline selling has not been cached yet. Connect once to prepare this device.");
        }
        if (!workspace || !workspaceFresh(workspace)) {
          throw new Error("This account needs a fresh offline catalogue. Reconnect to prepare it before selling.");
        }
        const selectedBranchId = localStorage.getItem("selectedBranchId");
        if (selectedBranchId && selectedBranchId !== workspace.branchId) {
          throw new Error("Offline stock belongs to another branch. Reconnect to prepare your selected branch.");
        }
        const currentSection = offlineSection(location.pathname);
        // Cashiers land on New Sale automatically. Other staff only see
        // sections explicitly permitted by their cached, expiring role.
        const section = ["new-sale", currentSection, "home", "products", "transactions", "scan", "reports"]
          .find((candidate): candidate is string =>
            typeof candidate === "string" && offlineSectionAllowed(candidate, workspace));
        if (!section) throw new Error("No offline sections are available for this account.");
        const interruptedPayment = /^\/sales\/(checkout|payment)(?:\/|$)/.test(location.pathname);
        const destination = "/offline-sales?section=" + encodeURIComponent(section) +
          (interruptedPayment ? "&interruptedPayment=1" : "");
        window.location.replace(destination);
        navigated = true;
      } catch (cause) {
        if (active && !navigator.onLine) setOfflineIssue(
          cause instanceof Error ? cause.message : "Unable to open saved offline sales.");
      } finally {
        if (!navigated) switching = false;
      }
    }

    async function updateIdentity() {
      if (!active || !navigator.onLine) return;
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store", credentials: "same-origin",
        });
        if (response.ok) {
          const profile: unknown = await response.json();
          if (profile && typeof profile === "object" && "id" in profile &&
            typeof (profile as { id: unknown }).id === "string") {
            const userId = (profile as { id: string }).id;
            await setOfflineActiveUser(userId);
            try {
              await prepareCurrentStaffOffline(userId, false,
                profile as { fullName?: string; email?: string; phone?: string | null });
            } catch {
              // Offline cache preparation is best-effort: it must not prevent
              // a valid online login or block normal online navigation.
            }
          }
        } else if (response.status === 401) {
          await setOfflineActiveUser(null);
        }
      } catch {
        // A temporary backend outage must not log a cashier out of local mode.
      }
    }

    async function prepareShell() {
      if (!active || preparing || !navigator.onLine || !("serviceWorker" in navigator)) return;
      preparing = true;
      try {
        await updateIdentity();
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        // The first install may not be active yet. Wait so preparation also
        // works on a device that has never opened Offline Selling before.
        const activeRegistration = await navigator.serviceWorker.ready;
        const shell = await fetch("/offline-sales", { credentials: "same-origin", cache: "no-store" });
        if (!shell.ok) throw new Error("Offline Kassa entry could not be fetched");
        const html = await shell.text();
        const documentFragment = new DOMParser().parseFromString(html, "text/html");
        const assets = new Set<string>();
        for (const element of documentFragment.querySelectorAll("script[src],link[href]")) {
          const path = element.getAttribute("src") ?? element.getAttribute("href");
          if (path?.startsWith("/_next/static/")) assets.add(path);
        }
        // Next.js may include dynamic chunk preloads in its serialized route
        // payload rather than in a conventional script tag.
        for (const found of html.matchAll(/\/_next\/static\/[^\s"'<>\\]+/g)) {
          assets.add(found[0].replace(/&amp;/g, "&"));
        }
        for (const resource of performance.getEntriesByType("resource")) {
          try {
            const path = new URL(resource.name).pathname;
            if (path.startsWith("/_next/static/")) assets.add(path);
          } catch { /* Ignore non-URL performance entries. */ }
        }
        (activeRegistration.active ?? registration.active ?? navigator.serviceWorker.controller)?.postMessage({
          type: "PREPARE_OFFLINE", assets: [...assets],
        });
      } catch {
        if (active) setPrepared(false);
      } finally {
        preparing = false;
      }
    }

    function connectivity() {
      if (!active) return;
      if (navigator.onLine) {
        setOfflineIssue("");
        void prepareShell();
      } else {
        void enterOfflineSales();
      }
    }
    function focus() {
      if (!active) return;
      if (navigator.onLine) void updateIdentity();
      else void enterOfflineSales();
    }
    function onWorkerMessage(event: MessageEvent) {
      if (active && event.data?.type === "KASSA_OFFLINE_SHELL") {
        setPrepared(event.data.prepared === true);
      }
    }
    function redirectNavigation(event: MouseEvent) {
      if (navigator.onLine || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor || anchor.hasAttribute("download") || anchor.getAttribute("target") === "_blank") return;
      let link: URL;
      try { link = new URL(anchor.getAttribute("href") ?? "", window.location.href); }
      catch { return; }
      if (link.origin !== window.location.origin) return;
      const section = offlineSection(link.pathname);
      if (!section) return;
      // A native full navigation is handled by the service worker, even if
      // the Next.js Router would otherwise try an online RSC request.
      event.preventDefault();
      event.stopPropagation();
      window.location.assign("/offline-sales?section=" + encodeURIComponent(section));
    }

    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    window.addEventListener("focus", focus);
    navigator.serviceWorker?.addEventListener("message", onWorkerMessage);
    document.addEventListener("click", redirectNavigation, true);
    if (navigator.onLine) void prepareShell();
    else void enterOfflineSales();
    return () => {
      active = false;
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
      window.removeEventListener("focus", focus);
      navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
      document.removeEventListener("click", redirectNavigation, true);
    };
  }, []);

  if (!offline || (typeof window !== "undefined" && location.pathname === "/offline-sales")) {
    return null;
  }
  // Display a compact fallback only when this device cannot automatically
  // enter offline sales. No separate "Open offline" action is required.
  return (
    <aside role="status"
      className="fixed right-4 top-4 z-[100] flex max-w-[min(420px,calc(100vw-2rem))] items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm">
      <WifiOff size={15} className="shrink-0 text-amber-700"/>
      <span className="shrink-0">Offline</span>
      {offlineIssue && <span className="border-l border-amber-300 pl-2 font-normal">{offlineIssue}</span>}
      {!offlineIssue && !prepared && <span className="border-l border-amber-300 pl-2 font-normal">Opening saved sales…</span>}
    </aside>
  );
}
