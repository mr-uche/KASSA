"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Menu, Printer, RefreshCw, ShoppingCart, Wifi, WifiOff } from "lucide-react";
import { getInventoryContext } from "@/lib/inventory-client";
import { hasBusinessAccess, loadAccess } from "@/lib/kassa-permissions";
import { listCheckoutProducts } from "@/lib/sales-client";
import {
  availableOfflineStock, createOfflineSale, getOfflineWorkspace, koboToNaira,
  listOfflineSales, nairaToKobo, OFFLINE_CACHE_DAYS, retryReviewedOfflineSale, saveOfflineWorkspace,
  syncOfflineSales, workspaceFresh, type OfflineLine, type OfflineSale,
  type OfflineWorkspace,
} from "@/lib/offline-sales";

const money = (value: string) => "₦" + Number(value).toLocaleString("en-NG", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export default function OfflineSalesPage() {
  const [workspace, setWorkspace] = useState<OfflineWorkspace | null>(null);
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
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async () => {
        const registration = await navigator.serviceWorker.ready;
        const assets = performance.getEntriesByType("resource").map((entry) => entry.name)
          .filter((name) => name.includes("/_next/static/"));
        registration.active?.postMessage({ type: "PREPARE_OFFLINE", assets });
        setShellReady(true);
      }).catch(() => setMessage("The offline page cache could not be installed. Keep the page open while testing."));
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
      <header className="flex min-h-[80px] flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/sales/new" aria-label="Back to New Sale" className="rounded-md p-2 hover:bg-gray-100">
            <Menu size={20}/>
          </Link>
          <h1 className="text-[20px] font-bold text-[#182033]">Offline selling</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold">
          {online ? <Wifi size={15} className="text-emerald-700"/> : <WifiOff size={15} className="text-amber-700"/>}
          {online ? "Internet detected" : "Offline"}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Cash-only test mode.</strong> Receipts are LOCAL and marked Pending Cloud Sync until Kassa confirms them.
          Paystack, bank transfers, cards and USSD cannot be confirmed offline. Stock shown here is a device estimate.
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

        {workspace && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-2 text-lg font-semibold">Products</h2>
              <p className="mb-4 text-xs text-gray-500">Local stock estimates include pending cash sales on this device.</p>
              <input value={search} onChange={(event) => setSearch(event.target.value)}
                placeholder="Search product, SKU or barcode"
                className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"/>
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

        {selectedReceipt && (
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
        <p className="pb-6 text-xs leading-5 text-gray-500">
          Device storage is encrypted using a non-exportable browser key. This first test version is not a replacement
          for device screen locks, offline-user PINs, external backups or multi-device stock reconciliation.
          Browser storage may be cleared by the user or system; sync pending cash sales before resetting your browser.
        </p>
      </main>
    </div>
  );
}
