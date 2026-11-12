"use client";

import KassaHeaderActions from "@/components/KassaHeaderActions";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import {
  ArrowLeft, Camera, CameraOff, Keyboard, Menu,
  ScanBarcode, ShoppingCart, Zap,
} from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import { getInventoryContext, type InventoryContext } from "@/lib/inventory-client";
import { listCheckoutProducts } from "@/lib/sales-client";
import {
  addScannedItem, findScannedProduct, readScopedCart, SCAN_CART_KEY, SALE_CART_KEY,
  type CartItem, type ScannedProduct,
} from "@/lib/scan-client";

type CameraState = "idle" | "starting" | "scanning";

type ScannerControls = { stop(): void; switchTorch?(enabled: boolean): Promise<void> };

export default function ScanProductPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [context, setContext] = useState<InventoryContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [productsById, setProductsById] = useState<
    Record<string, Pick<ScannedProduct, "name" | "sku" | "price">>
  >({});
  const cartCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = checkoutItems.reduce((sum, item) =>
    sum + Number(productsById[item.productId]?.price ?? 0) * item.quantity, 0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const cameraEpoch = useRef(0);
  const inFlight = useRef(false);
  const lastScan = useRef<{ code: string; time: number } | null>(null);
  const lookupRef = useRef<(value: string) => void>(() => {});
  const queryHandled = useRef(false);

  const stopCamera = useCallback(() => {
    cameraEpoch.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    const video = videoRef.current;
    if (video) {
      const stream = video.srcObject;
      if (typeof MediaStream !== "undefined" && stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    setCameraState("idle");
    setTorchAvailable(false);
    setTorchEnabled(false);
  }, []);


  // Both the current New Sale cart and newly scanned items appear in one
  // checkout summary. The scanner stage is merged by New Sale when opened.
  const refreshCheckout = useCallback((scope: InventoryContext) => {
    const combined = new Map<string, number>();
    for (const item of [
      ...readScopedCart(SALE_CART_KEY, scope),
      ...readScopedCart(SCAN_CART_KEY, scope),
    ]) {
      combined.set(item.productId, (combined.get(item.productId) ?? 0) + item.quantity);
    }
    setCheckoutItems(Array.from(combined, ([productId, quantity]) => ({ productId, quantity })));
  }, []);

  const lookUp = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value || !context || inFlight.current) return;
    if (value.length > 100) {
      setError("Barcode or SKU must not exceed 100 characters.");
      return;
    }
    const now = Date.now();
    if (lastScan.current?.code === value && now - lastScan.current.time < 450) return;
    lastScan.current = { code: value, time: now };
    inFlight.current = true;
    stopCamera();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const product = await findScannedProduct(context, value);
      // No preview or extra click: every successful camera, external-scanner
      // or manual lookup adds directly to the branch-scoped checkout cart.
      addScannedItem(context, product);
      setProductsById((current) => ({
        ...current,
        [product.id]: { name: product.name, sku: product.sku, price: product.price },
      }));
      refreshCheckout(context);
      setCode("");
      setNotice(product.name + " added to checkout.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add this product.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [context, refreshCheckout, stopCamera]);
  lookupRef.current = (value) => { void lookUp(value); };

  useEffect(() => {
    let live = true;
    async function loadContext() {
      try {
        const value = await getInventoryContext();
        if (!live) return;
        setContext(value);
        refreshCheckout(value);
        // Fill in existing checkout item names and prices without waiting
        // for the catalogue before enabling the camera.
        void listCheckoutProducts(value).then((products) => {
          if (!live) return;
          setProductsById(Object.fromEntries(products.map((product) => [
            product.id, { name: product.name, sku: product.sku, price: product.price },
          ])));
        }).catch(() => { /* A scan can still work if catalogue loading fails. */ });
        setError("");
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : "Unable to load your business.");
      } finally {
        if (live) setLoadingContext(false);
      }
    }
    void loadContext();
    const onBranchChange = () => {
      stopCamera();
      setNotice("");
      setProductsById({});
      setCheckoutItems([]);
      setContext(null);
      setLoadingContext(true);
      void loadContext();
    };
    window.addEventListener("branchChanged", onBranchChange);
    return () => {
      live = false;
      window.removeEventListener("branchChanged", onBranchChange);
    };
  }, [refreshCheckout, stopCamera]);

  // Also supports the manual barcode entry screen, which links to /scan?code=...
  useEffect(() => {
    if (!context || queryHandled.current) return;
    queryHandled.current = true;
    const incoming = new URLSearchParams(window.location.search).get("code");
    if (incoming) lookupRef.current(incoming);
    if (incoming) {
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, [context]);

  // Keyboard-wedge USB/Bluetooth scanners send a rapid string followed by Enter.
  // Capture only a burst of fast key events outside editable controls to avoid
  // treating normal typing, shortcuts or forms as barcode input.
  useEffect(() => {
    let buffer = "";
    let previous = 0;
    let first = 0;
    function keydown(event: KeyboardEvent) {
      const element = event.target;
      if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
      if (element instanceof HTMLElement &&
          (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName))) return;
      const current = performance.now();
      if (event.key === "Enter") {
        const duration = current - first;
        if (buffer.length >= 4 && duration <= Math.max(700, buffer.length * 110)) {
          event.preventDefault();
          lookupRef.current(buffer);
        }
        buffer = "";
        previous = 0;
        first = 0;
        return;
      }
      if (event.key.length !== 1 || event.repeat) return;
      if (previous && current - previous > 120) {
        buffer = "";
        first = 0;
      }
      if (!buffer) first = current;
      if (buffer.length >= 100) {
        buffer = "";
        first = 0;
      } else {
        buffer += event.key;
      }
      previous = current;
    }
    window.addEventListener("keydown", keydown, true);
    return () => window.removeEventListener("keydown", keydown, true);
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") stopCamera();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      // Stop camera tracks when this screen is left.
      cameraEpoch.current += 1;
      controlsRef.current?.stop();
      controlsRef.current = null;
      const video = videoRef.current;
      if (typeof MediaStream !== "undefined" && video?.srcObject instanceof MediaStream) {
        video.srcObject.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
    };
  }, [stopCamera]);

  async function startCamera() {
    if (!context || cameraState !== "idle") return;
    setError("");
    setNotice("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera access requires HTTPS or localhost in a supported browser. You can still use a USB/Bluetooth scanner.");
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    const generation = ++cameraEpoch.current;
    setCameraState("starting");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (generation !== cameraEpoch.current) return;
      // Focus the decoder on actual shop/product codes and scan HD video where available.
      // TRY_HARDER improves small and tightly printed 1D barcodes.
      const hints = new Map<DecodeHintType, BarcodeFormat[] | boolean>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93, BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 180,
        delayBetweenScanSuccess: 400,
      });
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        video,
        (result, _error, cameraControls) => {
          if (!result || generation !== cameraEpoch.current || inFlight.current) return;
          const scanned = result.getText().trim();
          if (!scanned) return;
          cameraControls.stop();
          lookupRef.current(scanned);
        },
      );
      if (generation !== cameraEpoch.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      const stream = video.srcObject;
      const track = stream instanceof MediaStream ? stream.getVideoTracks()[0] : undefined;
      try {
        const capabilities = track?.getCapabilities?.();
        setTorchAvailable(Boolean(controls.switchTorch && capabilities && "torch" in capabilities));
      } catch {
        setTorchAvailable(false);
      }
      setCameraState("scanning");
    } catch (cause) {
      if (generation !== cameraEpoch.current) return;
      stopCamera();
      const name = cause && typeof cause === "object" && "name" in cause
        ? String((cause as { name: unknown }).name) : "";
      const text = name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "Camera permission was denied. Enable camera access for this site in browser settings."
        : name === "NotFoundError" || name === "DevicesNotFoundError"
          ? "No compatible camera was found. Try an external barcode scanner or manual entry."
          : "Camera could not start. Close other apps using the camera and try again.";
      setError(text);
    }
  }

  async function toggleTorch() {
    const controls = controlsRef.current;
    if (!controls?.switchTorch) return;
    try {
      await controls.switchTorch(!torchEnabled);
      setTorchEnabled((value) => !value);
    } catch {
      setTorchAvailable(false);
      setError("Flashlight control is not supported on this camera.");
    }
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookUp(code);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-md p-1.5 text-[#374151] transition hover:bg-[#F3F4F6] lg:hidden"
              aria-label="Open menu">
              <Menu size={22} />
            </button>
            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">
              Scan product
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-5">
            <div className="hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]">
              <div className="flex h-[34px] w-full items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] sm:text-[13px]">
                <span className="truncate">{context?.branchName ?? "Loading branch..."}</span>
              </div>
            </div>
            <KassaHeaderActions />
          </div>
        </header>

        <div className="mb-5 mt-6 flex flex-wrap items-center justify-between gap-3 px-4 sm:mt-8 sm:px-6 lg:mt-12 lg:px-8">
          <Link href="/sales/new" className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
            <ArrowLeft size={16}/> Back to New Sale
          </Link>
          <button type="button" onClick={() => {stopCamera(); router.push("/sales/new");}}
            className="flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">
            <ShoppingCart size={17}/> View Sale ({cartCount})
          </button>
        </div>

        {loadingContext && <p className="mb-4 px-4 text-sm text-gray-500 sm:px-6 lg:px-8">Loading business access...</p>}
        {error && <p role="alert" className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-8">{error}</p>}
        {notice && <p role="status" className="mx-4 mb-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800 sm:mx-8">{notice}</p>}

        <div className="grid min-w-0 grid-cols-1 gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-3 lg:px-8 lg:pb-10">
          <section className="flex flex-col gap-4 lg:col-span-2">
            <div className="rounded-xl bg-[#0B1220] p-5 text-white sm:p-7">
              <div className="relative flex min-h-[255px] items-center justify-center overflow-hidden rounded-lg bg-black/30 sm:min-h-[385px]">
                <video ref={videoRef} muted autoPlay playsInline aria-label="Barcode camera preview"
                  className={"absolute inset-0 h-full w-full object-cover " +
                    (cameraState === "idle" ? "opacity-0" : "opacity-100")}/>
                {cameraState === "idle" && (
                  <div className="flex flex-col items-center gap-3 text-center text-gray-300">
                    <ScanBarcode size={64} strokeWidth={1.3} className="text-emerald-300"/>
                    <p className="text-sm">Point your camera at a product barcode.</p>
                  </div>
                )}
                {cameraState !== "idle" && (
                  <div className="pointer-events-none absolute inset-[14%] rounded-md border-2 border-emerald-400/80">
                    <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400/70"/>
                  </div>
                )}
                {cameraState === "starting" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm">Starting camera...</div>
                )}
              </div>
              <p className="mt-3 text-center text-sm text-gray-200">
                {cameraState === "scanning" ? "Hold the barcode inside the frame." : "Scan to add directly to checkout."}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {cameraState === "idle" ? (
                  <button type="button" onClick={() => void startCamera()}
                    disabled={!context || busy}
                    className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
                    <Camera size={18}/> Start Camera
                  </button>
                ) : (
                  <button type="button" onClick={stopCamera}
                    className="flex items-center gap-2 rounded-lg border border-white/40 px-5 py-3 text-sm font-medium text-white">
                    <CameraOff size={18}/> Stop Camera
                  </button>
                )}
                {cameraState === "scanning" && torchAvailable && (
                  <button type="button" onClick={() => void toggleTorch()}
                    className="flex items-center gap-2 rounded-lg border border-white/40 px-4 py-3 text-sm text-white">
                    <Zap size={17}/> {torchEnabled ? "Flashlight off" : "Flashlight on"}
                  </button>
                )}
                <Link href="/scan/product-code"
                  className="flex items-center gap-2 rounded-lg border border-white/30 px-4 py-3 text-sm text-white">
                  <Keyboard size={17}/> Manual Entry
                </Link>
              </div>
            </div>
            <form onSubmit={submitCode} className="rounded-xl border border-gray-200 bg-white p-5">
              <label htmlFor="scanner-code" className="text-sm font-semibold text-gray-900">
                Barcode or SKU
              </label>
              <p className="mb-3 mt-1 text-xs text-gray-500">
                Scan or enter a code to add it to checkout.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="scanner-code" type="text" value={code}
                  onChange={(event) => setCode(event.target.value)} maxLength={100}
                  onKeyDown={(event) => {
                    // Most USB/Bluetooth scanners emit Enter after the barcode.
                    // Automatically add the matching item to checkout.
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void lookUp(event.currentTarget.value, "hardware");
                    }
                  }}
                  placeholder="Scan barcode or type SKU"
                  autoComplete="off" spellCheck={false}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"/>
                <button type="submit" disabled={!context || busy}
                  className="rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                  {busy ? "Adding..." : "Add to checkout"}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-base font-semibold text-gray-900">
                Checkout list ({cartCount})
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Scanned products are added automatically.
              </p>
              {checkoutItems.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">Your checkout is empty.</p>
              ) : (
                <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
                  {checkoutItems.map((item) => (
                    <div key={item.productId}
                      className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">
                          {productsById[item.productId]?.name ?? "Product"}
                        </p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="shrink-0 font-semibold text-gray-900">
                        {productsById[item.productId]
                          ? "₦" + (Number(productsById[item.productId].price) * item.quantity)
                              .toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : "—"}
                      </span>
                    </div>
                  ))}
                  {checkoutItems.every((item) => productsById[item.productId]) && (
                    <div className="flex justify-between pt-1 font-semibold text-gray-900">
                      <span>Total</span>
                      <span>₦{cartTotal.toLocaleString("en-NG", {
                        minimumFractionDigits: 2, maximumFractionDigits: 2,
                      })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>   </aside>
        </div>
      </main>
    </div>
  );
}
