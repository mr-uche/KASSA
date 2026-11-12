"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { setOfflineActiveUser } from "@/lib/offline-sales";
import { prepareCurrentStaffOffline } from "@/lib/offline-preparation";

const SECTIONS: Array<[string, string]> = [
  ["/dashboard", "home"], ["/sales/new", "new-sale"],
  ["/transactions", "transactions"], ["/scan", "scan"],
  ["/reports", "reports"], ["/products", "products"],
  ["/customers", "customers"], ["/profile", "profile"], ["/sales", "new-sale"],
];
function offlineSection(pathname: string): string | null {
  if (pathname === "/" || pathname === "/login") return "home";
  return SECTIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"))?.[1] ?? null;
}

/** Prepare the offline entry point from *any* Kassa screen, not only from the
 * offline-sales page. Offline routing does not grant server permissions. */
export default function OfflineAppBridge() {
  const [offline, setOffline] = useState(false);
  const [prepared, setPrepared] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    let active = true;
    let preparing = false;

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
      setOffline(!navigator.onLine);
      if (navigator.onLine) void prepareShell();
    }
    function focus() {
      if (active && navigator.onLine) void updateIdentity();
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
    void prepareShell();
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
  return (
    <aside role="status"
      className="fixed bottom-4 right-4 z-[100] w-[min(360px,calc(100vw-2rem))] rounded-xl border border-amber-300 bg-white p-4 shadow-xl">
      <div className="flex items-center gap-2 font-semibold text-[#182033]">
        <WifiOff size={18} className="text-amber-700"/> KASSA is offline
      </div>
      <p className="my-2 text-sm text-gray-600">
        Switch to locally saved sales and products without connecting to the backend.
      </p>
      <a href="/offline-sales?section=home"
        className="inline-flex rounded-lg bg-[#08745F] px-4 py-2 text-sm font-semibold text-white">
        Open offline KASSA
      </a>
      {!prepared && <p className="mt-2 text-xs text-amber-800">
        The offline shell may need to be prepared online once on this device.
      </p>}
    </aside>
  );
}
