"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";
import { Download, Menu, Printer, RefreshCw, ShoppingCart, Upload, Wifi, WifiOff } from "lucide-react";
import { createEncryptedOfflineBackup, restoreEncryptedOfflineBackup } from "@/lib/offline-backup";
import { getInventoryContext } from "@/lib/inventory-client";
import { hasBusinessAccess, loadAccess } from "@/lib/kassa-permissions";
import { listCheckoutProducts } from "@/lib/sales-client";
import {
  availableOfflineStock, createOfflineSale, getOfflineWorkspace, koboToNaira,
  listOfflineSales, nairaToKobo, OFFLINE_CACHE_DAYS, retryReviewedOfflineSale, saveOfflineWorkspace,
  syncOfflineSales, workspaceFresh, type OfflineLine, type OfflineSale,
  type OfflineWorkspace,
} from "@/lib/offline-sales";

type OfflineSection = "home" | "new-sale" | "transactions" | "scan" | "reports" |
  "products" | "customers" | "staff" | "settings" | "backup";
const OFFLINE_TITLES: Record<OfflineSection, string> = {
  home: "Home", "new-sale": "New Sale", transactions: "Transactions",
  scan: "Scan Product", reports: "Reports & Analytics", products: "Products & Inventory",
  customers: "Customers", staff: "Staff & Branches", settings: "Settings",
  backup: "Offline Backup & Recovery",
};
function parseSection(value: string | null): OfflineSection {
  return value && value in OFFLINE_TITLES ? value as OfflineSection : "new-sale";
}

const money = (value: string) => "₦" + Number(value).toLocaleString("en-NG", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export default function OfflineSalesPage() {
  const [workspace, setWorkspace] = useState<OfflineWorkspace | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [section, setSection] = useState<OfflineSection>("new-sale");
  const [savedSales, setSavedSales] = useState<OfflineSale[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [shellReady, setShellReady] = useState(false);
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupWorking, setBackupWorking] = useState(false);

  useEffect(() => {
    setSection(parseSection(new URLSearchParams(window.location.search).get("section")));
  }, []);

  const navigate = (choice: string) => {
    const next = parseSection(choice);
    setSection(next);
    setSidebarOpen(false);
    window.history.replaceState(window.history.state, "", "/offline-sales?section=" + next);
  };

  const refreshDevice = useCallback(async () => {
    const active = await getOfflineWorkspace();
    const list = await listOfflineSales(active ?? undefined);
    setWorkspace(active);
    setSavedSales(list);
    setReady(true);
  }, []);

  const provision = useCallback(async () => {
    if (!navigator.onLine) return;
    setWorking(true);
    setMessage("");
    try {
      const auth = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      if (!auth.ok) throw new Error("Sign in online before preparing this device for offline selling.");
      const identity: unknown = await auth.json();
      const userId = identity && typeof identity === "object" && "id" in identity
        ? (identity as { id: unknown }).id : null;
      if (typeof userId !== "string" || !userId) throw new Error("Unable to identify this cashier.");

      const [context, memberships] = await Promise.all([getInventoryContext(), loadAccess()]);
      const business = memberships.find((item) => item.id === context.businessId);
      if (!hasBusinessAccess(business, "Manage sales & transactions")) {
        throw new Error("This account is not permitted to sell at the selected business.");
      }
      const previous = await getOfflineWorkspace();
      if (previous && (previous.userId !== userId || previous.businessId !== context.businessId ||
        previous.branchId !== context.branchId)) {
        const unsynced = (await listOfflineSales(previous))
          .filter((sale) => sale.status !== "synced");
        if (unsynced.length) {
          throw new Error("This device has unsynced sales for its previous cashier or branch. Sign back into that account and reconcile them before switching.");
        }
      }
      const catalogue = await listCheckoutProducts(context);
      const name = business && "name" in business && typeof business.name === "string"
        ? business.name : "Kassa merchant";
      const active: OfflineWorkspace = {
        userId, businessId: context.businessId, branchId: context.branchId,
        businessName: name, branchName: context.branchName,
        cachedAt: new Date().toISOString(),
        // Checkout catalogue excludes internal cost prices and private notes.
        products: catalogue.map((product) => ({
          id: product.id, name: product.name, sku: product.sku,
          barcode: product.barcode, category: product.category,
          price: product.price, stock: product.stock,
        })),
      };
      await saveOfflineWorkspace(active);
      setWorkspace(active);
      setCart({});
      await refreshDevice();
      setMessage("Offline products prepared. Cash selling is available on this device without internet for up to seven days.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Couldn't prepare offline selling.");
    } finally {
      setWorking(false);
    }
  }, [refreshDevice]);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      await syncOfflineSales();
      await refreshDevice();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Sync could not finish. Sales were kept on this device.");
    } finally {
      setSyncing(false);
    }
  }, [refreshDevice]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refreshDevice().catch((cause) => {
      setMessage(cause instanceof Error ? cause.message : "Offline storage is unavailable.");
      setReady(true);
    });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onShellMessage);
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async () => {
        const registration = await navigator.serviceWorker.ready;
        if (!navigator.onLine) {
          // Reopening while disconnected must not attempt a new precache and
          // falsely report failure for a previously prepared offline shell.
          const stored = await caches.match("/offline-sales", { ignoreVary: true });
          setShellReady(Boolean(stored));
          return;
        }
        const assets = performance.getEntriesByType("resource").map((entry) => entry.name)
          .filter((name) => name.includes("/_next/static/"));
        registration.active?.postMessage({ type: "PREPARE_OFFLINE", assets });
      }).catch(() => setMessage("The offline page cache could not be installed. Keep the page open while testing."));
    }
    function onShellMessage(event: MessageEvent) {
      if (event.data?.type !== "KASSA_OFFLINE_SHELL") return;
      setShellReady(event.data.prepared === true);
      if (!event.data.prepared) setMessage("Some offline page resources could not be saved. Reopen this page while connected before testing.");
    }
    const onDeviceUpdate = () => void refreshDevice();
    const onOnline = () => { setOnline(true); void syncNow(); };
    const onOffline = () => setOnline(false);
    const onFocus = () => { if (navigator.onLine) void syncNow(); };
    window.addEventListener("kassa-offline-sync-update", onDeviceUpdate);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      if (navigator.onLine) void syncNow();
    }, 30_000);
    return () => {
      window.clearInterval(interval);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onShellMessage);
      window.removeEventListener("kassa-offline-sync-update", onDeviceUpdate);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshDevice, syncNow]);

  useEffect(() => {
    if (ready && online && workspace) void syncNow();
  }, [ready, online, workspace?.businessId, workspace?.branchId, syncNow]);

  const fresh = workspace !== null && workspaceFresh(workspace);
  const products = workspace?.products ?? [];
  const visible = products.filter((product) =>
    (product.name + " " + product.sku + " " + (product.barcode ?? "")).toLowerCase()
      .includes(search.toLowerCase()));
  const totals = useMemo(() => {
    if (!workspace) return { total: "0.00", lines: [] as OfflineLine[] };
    const lines: OfflineLine[] = workspace.products.filter((product) => (cart[product.id] ?? 0) > 0)
      .map((product) => {
        const quantity = cart[product.id] ?? 0;
        const unitKobo = nairaToKobo(product.price);
        return {
          productId: product.id, name: product.name, quantity,
          unitPrice: koboToNaira(unitKobo),
          lineTotal: koboToNaira(unitKobo * BigInt(quantity)),
        };
      });
    const total = lines.reduce((sum, line) => sum + nairaToKobo(line.lineTotal), BigInt(0));
    return { total: koboToNaira(total), lines };
  }, [cart, workspace]);
  const counts = {
    pending: savedSales.filter((sale) => sale.status === "pending" || sale.status === "syncing").length,
    attention: savedSales.filter((sale) => sale.status === "needs_attention").length,
    synced: savedSales.filter((sale) => sale.status === "synced").length,
  };
  const selectedReceipt = savedSales.find((sale) => sale.id === receiptId);
  const localCash = savedSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const pendingCash = savedSales.filter((sale) => sale.status !== "synced")
    .reduce((sum, sale) => sum + Number(sale.total), 0);

  function scanOfflineProduct() {
    if (!workspace || !workspaceFresh(workspace)) {
      setMessage("Prepare a valid offline catalogue while connected before scanning.");
      return;
    }
    const code = search.trim().toLowerCase();
    const product = workspace.products.find((item) =>
      item.barcode?.toLowerCase() === code || item.sku.toLowerCase() === code);
    if (!product) {
      setMessage("This barcode or SKU is not in the cached product catalogue.");
      return;
    }
    add(product.id, 1);
    setSearch("");
    setMessage("Scanned " + product.name + " into the local cash sale.");
  }


  async function downloadBackup() {
    if (!workspace || backupWorking) return;
    setBackupWorking(true);
    setMessage("");
    try {
      const backup = await createEncryptedOfflineBackup(workspace, backupPassphrase);
      const url = URL.createObjectURL(backup.file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = backup.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage("Encrypted backup created for " + backup.count +
        " unsynced sale(s). Keep the file and passphrase in separate safe places.");
      setBackupPassphrase("");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to encrypt the offline sales backup.");
    } finally {
      setBackupWorking(false);
    }
  }

  async function restoreBackup() {
    if (!workspace || !backupFile || backupWorking) return;
    setBackupWorking(true);
    setMessage("");
    try {
      const restored = await restoreEncryptedOfflineBackup(backupFile, backupPassphrase, workspace);
      await refreshDevice();
      setMessage("Recovered " + restored.restored + " unsynced sale(s). " +
        restored.skipped + " existing ID(s) were safely skipped. Review them, then sync.");
      setBackupPassphrase("");
      setBackupFile(null);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to restore the backup.");
    } finally {
      setBackupWorking(false);
    }
  }

  function add(productId: string, delta: number) {
    if (!fresh || !workspace) return;
    const product = workspace.products.find((item) => item.id === productId);
    if (!product) return;
    const maximum = availableOfflineStock(product, savedSales, workspace.cachedAt);
    setCart((old) => {
      const nextQty = Math.max(0, Math.min(maximum, (old[productId] ?? 0) + delta));
      const next = { ...old };
      if (nextQty) next[productId] = nextQty;
      else delete next[productId];
      return next;
    });
  }

  async function recordCash() {
    if (!workspace || !fresh || working || !totals.lines.length) return;
    if (!window.confirm("Confirm you physically collected " + money(totals.total) +
      " in cash? This receipt will be PENDING CLOUD SYNC until the server confirms stock.")) return;
    setWorking(true);
    setMessage("");
    try {
      const latest = await listOfflineSales(workspace);
      for (const line of totals.lines) {
        const product = workspace.products.find((item) => item.id === line.productId);
        if (!product || line.quantity > availableOfflineStock(product, latest, workspace.cachedAt)) {
          throw new Error("Local available stock changed. Review your quantities before collecting another payment.");
        }
      }
      const record: OfflineSale = {
        id: crypto.randomUUID(),
        userId: workspace.userId, businessId: workspace.businessId, branchId: workspace.branchId,
        recordedAt: new Date().toISOString(),
        lines: totals.lines, total: totals.total,
        status: "pending", attempts: 0,
      };
      // A failed IndexedDB commit is NOT a successful sale.
      await createOfflineSale(record);
      setCart({});
      setReceiptId(record.id);
      await refreshDevice();
      setMessage("Cash sale saved on this device. Do not call it cloud verified until syncing succeeds.");
      if (navigator.onLine) void syncNow();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not save the cash sale. Do not issue a receipt.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-gray-900">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
        offlineMode activeOfflineSection={section} onOfflineNavigate={navigate} />
      <div className="min-h-screen lg:ml-[198px]">
      <header className="flex min-h-[80px] flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Open Kassa navigation"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-[#374151] hover:bg-gray-100 lg:hidden">
            <Menu size={20}/>
          </button>
          <h1 className="text-[20px] font-bold text-[#182033]">{OFFLINE_TITLES[section]}</h1>
          <span className="hidden rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 sm:inline">Offline workspace</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold">
          {online ? <Wifi size={15} className="text-emerald-700"/> : <WifiOff size={15} className="text-amber-700"/>}
          {online ? "Internet detected" : "Offline"}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Offline KASSA · Test mode.</strong> Move between the locally available sections
          using the usual green navigation bar. Cash sales, receipts, local transactions, and cached
          stock work without the backend. All totals are device estimates until cloud sync succeeds.
          Paystack and account-management actions remain online-only.
          {online && (
            <Link href="/dashboard" className="ml-2 font-semibold underline">Return to live KASSA</Link>
          )}
        </div>
        {message && <p role="status" className="rounded-lg border border-gray-200 bg-white p-3 text-sm">{message}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <div>
            <p className="font-semibold">{workspace?.businessName ?? "No offline catalogue prepared"}</p>
            <p className="text-sm text-gray-500">{workspace?.branchName ?? "Sign in online and prepare this device"}
              {workspace && " · Cached " + new Date(workspace.cachedAt).toLocaleString("en-NG")}
            </p>
            <p className={"mt-1 text-xs " + (fresh ? "text-emerald-800" : "text-amber-800")}>
              {fresh ? "Offline catalogue available" : "Online catalogue refresh required"} · {OFFLINE_CACHE_DAYS}-day offline window
              {shellReady ? " · Offline page prepared" : " · Loading offline page cache"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void provision()} disabled={!online || working}
              className="rounded-lg border border-emerald-800 px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-40">
              {working ? "Preparing..." : "Refresh offline catalogue"}
            </button>
            <button type="button" onClick={() => void syncNow()} disabled={!online || syncing}
              className="flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              <RefreshCw size={16}/> {syncing ? "Syncing..." : "Sync now"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg border border-gray-200 bg-white p-3"><b className="block text-xl">{counts.pending}</b>Pending</div>
          <div className="rounded-lg border border-gray-200 bg-white p-3"><b className="block text-xl">{counts.attention}</b>Needs attention</div>
          <div className="rounded-lg border border-gray-200 bg-white p-3"><b className="block text-xl">{counts.synced}</b>Synced</div>
        </div>

        {!ready && <p>Loading saved offline data...</p>}
        {ready && !workspace && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Open this page while signed in and online, then click <strong>Refresh offline catalogue</strong>.
            Visit it at least once online before testing disconnection so the browser can cache its scripts.
          </div>
        )}

        {section === "home" && (
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Offline business overview</h2>
            <p className="text-sm text-gray-600">
              This is your local device view. It does not include today's sales from other devices
              or changes that haven't been synchronized from the cloud.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-xs text-gray-600">Cash collected on this device</p>
                <p className="mt-1 text-xl font-bold">{money(localCash.toFixed(2))}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-xs text-gray-600">Not confirmed by cloud</p>
                <p className="mt-1 text-xl font-bold">{money(pendingCash.toFixed(2))}</p>
              </div>
              <div className="rounded-lg bg-gray-100 p-4">
                <p className="text-xs text-gray-600">Cached products</p>
                <p className="mt-1 text-xl font-bold">{products.length}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate("new-sale")} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">
                New cash sale
              </button>
              <button onClick={() => navigate("transactions")} className="rounded-lg border px-4 py-2.5 text-sm font-semibold">
                Local transactions
              </button>
              <button onClick={() => navigate("products")} className="rounded-lg border px-4 py-2.5 text-sm font-semibold">
                Cached inventory
              </button>
            </div>
          </section>
        )}

        {section === "products" && (
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Cached inventory</h2>
            <p className="text-sm text-gray-600">
              Read-only estimated stock for {workspace?.branchName ?? "this branch"}.
              Refresh your catalogue while online to pick up changes from other devices.
            </p>
            <input value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cached products" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"/>
            <div className="max-h-[560px] space-y-2 overflow-y-auto">
              {visible.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sku} · {product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{money(product.price)}</p>
                    <p className="text-xs text-gray-500">
                      Est. stock: {availableOfflineStock(product, savedSales, workspace?.cachedAt ?? "")}
                    </p>
                  </div>
                </div>
              ))}
              {!visible.length && <p className="text-sm text-gray-500">No cached products to display.</p>}
            </div>
          </section>
        )}

        {section === "reports" && (
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Device cash sales report</h2>
            <p className="text-sm text-gray-600">
              These figures represent only sales recorded in this offline workspace.
              Live branch revenue, settlements, and accounting reports still need the backend.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs">Local cash transactions</p><p className="text-xl font-bold">{savedSales.length}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs">Cash recorded locally</p><p className="text-xl font-bold">{money(localCash.toFixed(2))}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-xs">Awaiting cloud confirmation</p><p className="text-xl font-bold">{money(pendingCash.toFixed(2))}</p>
              </div>
            </div>
          </section>
        )}

        {["customers", "staff", "settings"].includes(section) && (
          <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold">{OFFLINE_TITLES[section]}</h2>
            <p className="text-sm leading-6 text-gray-600">
              This section depends on current cloud data and permissions, so editing is
              unavailable offline. Offline cash sales, local receipts, cached inventory,
              and local transaction history remain accessible using the sidebar.
            </p>
            <button onClick={() => navigate("new-sale")}
              className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">
              Continue offline selling
            </button>
          </section>
        )}

        {workspace && (section === "new-sale" || section === "scan") && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-2 text-lg font-semibold">
                {section === "scan" ? "Scan barcode or SKU" : "Products"}
              </h2>
              <p className="mb-4 text-xs text-gray-500">
                Local stock estimates include pending cash sales on this device.
                {section === "scan" ? " Bluetooth/USB HID scanners can type into this field." : ""}
              </p>
              <input value={search} onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && section === "scan") {
                    event.preventDefault();
                    scanOfflineProduct();
                  }
                }}
                placeholder={section === "scan" ? "Scan barcode, then press Enter" : "Search product, SKU or barcode"}
                className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"/>
              {section === "scan" && (
                <button type="button" onClick={scanOfflineProduct} disabled={!fresh}
                  className="mb-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
                  Add scanned product
                </button>
              )}
              <div className="max-h-[460px] space-y-2 overflow-y-auto">
                {visible.map((product) => {
                  const available = availableOfflineStock(product, savedSales, workspace.cachedAt);
                  return (
                    <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku} · Estimated stock: {available}</p>
                        <p className="mt-1 text-sm font-semibold">{money(product.price)}</p>
                      </div>
                      <button type="button" onClick={() => add(product.id, 1)}
                        disabled={!fresh || (cart[product.id] ?? 0) >= available}
                        className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-30">
                        Add
                      </button>
                    </div>
                  );
                })}
                {!visible.length && <p className="text-sm text-gray-500">No cached product matches your search.</p>}
              </div>
            </section>

            <section className="h-fit rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2"><ShoppingCart size={19}/><h2 className="text-lg font-semibold">Cash sale</h2></div>
              <div className="space-y-3">
                {totals.lines.map((line) => (
                  <div key={line.productId} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{line.name}</p>
                      <p className="text-xs text-gray-500">{money(line.unitPrice)} × {line.quantity}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => add(line.productId, -1)} className="rounded border px-2">−</button>
                      <span className="text-sm">{line.quantity}</span>
                      <button type="button" onClick={() => add(line.productId, 1)} className="rounded border px-2">+</button>
                    </div>
                  </div>
                ))}
                {!totals.lines.length && <p className="text-sm text-gray-500">Add products to begin.</p>}
              </div>
              <div className="mt-5 flex justify-between border-t border-gray-200 pt-4 text-lg font-bold">
                <span>Total cash</span><span className="text-emerald-800">{money(totals.total)}</span>
              </div>
              <button type="button" onClick={() => void recordCash()}
                disabled={!fresh || !totals.lines.length || working}
                className="mt-5 w-full rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">
                Record cash received & save locally
              </button>
              <p className="mt-2 text-xs text-amber-800">Only tap after collecting physical cash. Unsynced receipts are not cloud-verified.</p>
            </section>
          </div>
        )}

        {selectedReceipt && (section === "new-sale" || section === "scan" || section === "transactions") && (
          <section aria-label="Local receipt" className="space-y-3">
            <h2 className="text-lg font-semibold">Saved local receipt</h2>
            <div id="kassa-receipt-document" className="rounded-xl border border-gray-200 bg-white p-5 sm:p-8">
              <div className="mb-5 text-center">
                <h3 className="text-xl font-bold">{workspace?.businessName ?? "Kassa merchant"}</h3>
                <p className="text-sm text-gray-500">{workspace?.branchName}</p>
                <p className="mt-2 font-bold text-amber-800">
                  {selectedReceipt.status === "synced" ? "CLOUD SYNCED CASH SALE" : "LOCAL RECEIPT — PENDING CLOUD SYNC"}
                </p>
                <p className="text-xs text-gray-500">Issued {new Date(selectedReceipt.recordedAt).toLocaleString("en-NG")}</p>
              </div>
              <p className="mb-4 break-all text-xs">Offline ID: {selectedReceipt.id}</p>
              {selectedReceipt.lines.map((line) => (
                <div key={line.productId} className="flex justify-between gap-3 border-b border-gray-100 py-2 text-sm">
                  <span>{line.name} ({line.quantity} × {money(line.unitPrice)})</span>
                  <span>{money(line.lineTotal)}</span>
                </div>
              ))}
              <div className="mt-4 flex justify-between text-lg font-bold">
                <span>Cash collected</span><span>{money(selectedReceipt.total)}</span>
              </div>
              <p className="mt-4 text-center text-xs font-semibold text-amber-800">
                {selectedReceipt.status === "synced"
                  ? "Cloud reference: " + (selectedReceipt.cloudReference ?? "Confirmed")
                  : "This receipt is recorded on this device, not yet verified by the cloud."}
              </p>
            </div>
            <button type="button" onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white print:hidden">
              <Printer size={16}/> Print / Save PDF
            </button>
          </section>
        )}

        {(section === "home" || section === "transactions" || section === "new-sale") && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Device sales & sync queue</h2>
            <p className="text-xs text-gray-500">Never delete browser data before all sales are synced.</p>
          </div>
          <div className="space-y-3">
            {savedSales.map((sale) => (
              <div key={sale.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{money(sale.total)} · {sale.lines.length} product(s)</p>
                  <p className="text-xs text-gray-500">{new Date(sale.recordedAt).toLocaleString("en-NG")}</p>
                  <p className="mt-1 break-all text-xs text-gray-500">ID: {sale.id}</p>
                  {sale.lastError && <p className="mt-1 text-xs text-red-700">{sale.lastError}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " +
                    (sale.status === "synced" ? "bg-emerald-100 text-emerald-800" :
                      sale.status === "needs_attention" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800")}>
                    {sale.status === "needs_attention" ? "Needs attention" :
                      sale.status === "syncing" ? "Syncing" :
                        sale.status === "synced" ? "Synced" : "Pending"}
                  </span>
                  <button type="button" onClick={() => setReceiptId(sale.id)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold">Receipt</button>
                  {sale.status === "needs_attention" && (
                    <button type="button" disabled={!online} onClick={() => {
                      void retryReviewedOfflineSale(sale.id)
                        .then(() => syncNow()).then(() => refreshDevice())
                        .catch((cause) => setMessage(cause instanceof Error ? cause.message : "Could not retry sale."));
                    }} className="rounded-lg border border-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-40">
                      Retry after review
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!savedSales.length && <p className="text-sm text-gray-500">No local sales recorded yet.</p>}
          </div>
        </section>
        )}
        {section === "backup" && (
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 print:hidden">
          <div>
            <h2 className="text-lg font-semibold">Encrypted backup & recovery</h2>
            <p className="mt-1 text-sm text-gray-600">
              Save an encrypted copy of all unsynced cash sales. A backup keeps the original
              transaction IDs, so restoring one cannot create a second sale when synced.
              Import requires a current online login to the same cashier and branch.
            </p>
          </div>
          <label htmlFor="offline-backup-passphrase" className="block text-sm font-semibold">
            Backup passphrase (12+ characters)
          </label>
          <input id="offline-backup-passphrase" type="password" autoComplete="new-password"
            value={backupPassphrase} onChange={(event) => setBackupPassphrase(event.target.value)}
            placeholder="Use a unique, private passphrase"
            className="w-full max-w-lg rounded-lg border border-gray-300 p-3 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={!workspace || backupWorking || backupPassphrase.length < 12 ||
                savedSales.every((sale) => sale.status === "synced")}
              onClick={() => void downloadBackup()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              <Download size={17}/> Download encrypted backup
            </button>
            <label htmlFor="offline-backup-file" className="text-sm font-medium">Restore file</label>
            <input id="offline-backup-file" type="file" accept=".kassa,application/json"
              onChange={(event) => setBackupFile(event.target.files?.[0] ?? null)}
              className="max-w-full text-xs"/>
            <button type="button" disabled={!workspace || !online || !backupFile || backupWorking ||
                backupPassphrase.length < 12}
              onClick={() => void restoreBackup()}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-800 px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-40">
              <Upload size={17}/> Restore unsynced sales
            </button>
          </div>
          <p className="text-xs leading-5 text-amber-800">
            Store the backup file and passphrase separately. Losing the passphrase makes the
            backup unreadable. Do not delete browser data until you've verified a backup and
            synced the sales. This is a recovery aid, not automatic cloud backup.
          </p>
        </section>
        )}
        <p className="pb-6 text-xs leading-5 text-gray-500">
          Local storage is encrypted using a device-specific browser key. Keep your device
          locked; a separate offline sign-in/PIN is still needed before production release.
          Browser storage may be cleared by the user or system, and multi-device stock
          differences require reconciliation.
        </p>
      </main>
      </div>
    </div>
  );
}
