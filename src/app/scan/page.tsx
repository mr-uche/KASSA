"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Bell, Camera, CameraOff, CheckCircle2, Keyboard, Menu,
  ScanBarcode, ShoppingCart, Video, Zap,
} from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import { getInventoryContext, formatNaira, type InventoryContext } from "@/lib/inventory-client";
import {
  addScannedItem, findScannedProduct, readScopedCart, SCAN_CART_KEY,
  type ScannedProduct,
} from "@/lib/scan-client";

type CameraState = "idle" | "starting" | "scanning";
type Source = "camera" | "hardware" | "manual";

type ScannerControls = { stop(): void };

export default function ScanProductPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [context, setContext] = useState<InventoryContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [code, setCode] = useState("");
  const [found, setFound] = useState<ScannedProduct | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const cameraEpoch = useRef(0);
  const inFlight = useRef(false);
  const lastScan = useRef<{ code: string; time: number } | null>(null);
  const lookupRef = useRef<(value: string, source: Source) => void>(() => {});
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
  }, []);

  const lookUp = useCallback(async (raw: string, source: Source) => {
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
    setFound(null);
    setCode(value);
    try {
      const product = await findScannedProduct(context, value);
      setFound(product);
      if (source === "hardware" && product.stock > 0) {
        const count = addScannedItem(context, product);
        setCartCount(count);
        setNotice(product.name + " added to your sale. Scan another product or view the sale.");
      } else if (product.stock === 0) {
        setNotice("This product is out of stock at " + context.branchName + ".");
      } else {
        setNotice("Product found. Select Add to Sale to include it in the checkout.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not find this product.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [context, stopCamera]);
  lookupRef.current = (value, source) => { void lookUp(value, source); };

  useEffect(() => {
    let live = true;
    async function loadContext() {
      try {
        const value = await getInventoryContext();
        if (!live) return;
        setContext(value);
        setCartCount(readScopedCart(SCAN_CART_KEY, value)
          .reduce((sum, item) => sum + item.quantity, 0));
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
      setFound(null);
      setNotice("");
      setContext(null);
      setLoadingContext(true);
      void loadContext();
    };
    window.addEventListener("branchChanged", onBranchChange);
    return () => {
      live = false;
      window.removeEventListener("branchChanged", onBranchChange);
    };
  }, [stopCamera]);

  // Also supports the manual barcode entry screen, which links to /scan?code=...
  useEffect(() => {
    if (!context || queryHandled.current) return;
    queryHandled.current = true;
    const incoming = new URLSearchParams(window.location.search).get("code");
    if (incoming) lookupRef.current(incoming, "manual");
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
          lookupRef.current(buffer, "hardware");
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
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        video,
        (result, _error, cameraControls) => {
          if (!result || generation !== cameraEpoch.current || inFlight.current) return;
          cameraControls.stop();
          lookupRef.current(result.getText(), "camera");
        },
      );
      if (generation !== cameraEpoch.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
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

  function addCurrentProduct() {
    if (!context || !found) return;
    try {
      const quantity = addScannedItem(context, found);
      setCartCount(quantity);
      setNotice(found.name + " added to your sale.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add this product.");
    }
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookUp(code, "manual");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-gray-600 lg:hidden"><Menu size={22}/></button>
            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">Scan product</h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-gray-500 sm:block">{context?.branchName ?? "Loading branch..."}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50"><Bell size={17} className="text-gray-400"/></span>
          </div>
        </header>

        <div className="mb-5 mt-4 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8">
          <Link href="/sales/new" className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
            <ArrowLeft size={16}/> Back to New Sale
          </Link>
          <button type="button" onClick={() => {stopCamera(); router.push("/sales/new");}}
            className="flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white">
            <ShoppingCart size={17}/> View Sale ({cartCount})
          </button>
        </div>

        {loadingContext && <p className="mb-4 px-4 text-sm text-gray-500 sm:px-8">Loading business access...</p>}
        {error && <p role="alert" className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-8">{error}</p>}
        {notice && <p role="status" className="mx-4 mb-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800 sm:mx-8">{notice}</p>}

        <div className="grid grid-cols-1 gap-5 px-4 pb-10 sm:px-8 lg:grid-cols-3">
          <section className="flex flex-col gap-4 lg:col-span-2">
            <div className="rounded-xl bg-[#0B1220] p-5 text-white sm:p-7">
              <div className="relative flex min-h-[255px] items-center justify-center overflow-hidden rounded-lg bg-black/30 sm:min-h-[385px]">
                <video ref={videoRef} muted autoPlay playsInline aria-label="Barcode camera preview"
                  className={"absolute inset-0 h-full w-full object-cover " +
                    (cameraState === "idle" ? "opacity-0" : "opacity-100")}/>
                {cameraState === "idle" && (
                  <div className="flex flex-col items-center gap-3 text-center text-gray-300">
                    <ScanBarcode size={64} strokeWidth={1.3} className="text-emerald-300"/>
                    <p className="text-sm">Activate your phone or laptop camera to scan a product.</p>
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
              <p className="mt-4 text-center text-sm text-white">
                {cameraState === "scanning" ? "Align the barcode inside the frame" : "Camera scanning"}
              </p>
              <p className="mt-1 text-center text-xs text-gray-400">Uses the camera only after you select Start Camera.</p>
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
                <Link href="/scan/product-code"
                  className="flex items-center gap-2 rounded-lg border border-white/30 px-4 py-3 text-sm text-white">
                  <Keyboard size={17}/> Manual Entry
                </Link>
              </div>
            </div>
            <form onSubmit={submitCode} className="rounded-xl border border-gray-200 bg-white p-5">
              <label htmlFor="scanner-code" className="text-sm font-semibold text-gray-900">
                USB/Bluetooth barcode scanner or manual code
              </label>
              <p className="mt-1 mb-3 text-xs leading-5 text-gray-500">
                Connect your scanner as a keyboard. Scan with its usual Enter suffix, or click the field,
                scan the barcode and press Find Product. Keyboard-wedge scanners also work without focusing the field.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="scanner-code" type="text" value={code}
                  onChange={(event) => setCode(event.target.value)} maxLength={100}
                  onKeyDown={(event) => {
                    // Most USB/Bluetooth scanners emit Enter after the barcode.
                    // Automatically put a matched item into the staging cart.
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
                  {busy ? "Searching..." : "Find Product"}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-base font-semibold text-gray-900">{found ? "Scanned product" : "Product details"}</h2>
              {!found && <p className="mt-3 text-sm text-gray-500">
                {busy ? "Checking this code against your business inventory..." :
                  "Scan a barcode or enter a product code. Only real inventory matches will appear here."}
              </p>}
              {found && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{found.name}</p>
                    <p className="mt-1 text-xs text-gray-500">SKU: {found.sku}{found.barcode ? " · Barcode: " + found.barcode : ""}</p>
                    <p className="mt-1 text-xs text-gray-500">{found.category}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-900">{formatNaira(found.price)}</p>
                    <p className="mt-1 text-xs text-gray-600">{found.stock} available in {context?.branchName}</p>
                  </div>
                  <button type="button" onClick={addCurrentProduct} disabled={!context || found.stock < 1}
                    className="w-full rounded-lg bg-emerald-800 px-4 py-3 text-sm font-medium text-white disabled:bg-gray-300">
                    Add to Sale
                  </button>
                  <button type="button" disabled={cameraState !== "idle"} onClick={() => void startCamera()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 px-4 py-2.5 text-sm text-emerald-800">
                    <Video size={16}/> Scan another with camera
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Zap size={17} className="text-emerald-700"/> External scanners
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                USB and Bluetooth HID scanners need no special browser permission. If your scanner
                sends Enter after each barcode, a successful match is automatically added to the sale.
                Repeated scans increase quantity, subject to available stock.
              </p>
              <p className="mt-3 text-xs text-gray-500">No barcode matched? Check the product SKU or the Barcode Number entered when it was created.</p>
            </div>
            {cartCount > 0 && (
              <button type="button" onClick={() => {stopCamera();router.push("/sales/new");}}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-white px-4 py-3 text-sm font-semibold text-emerald-800">
                <CheckCircle2 size={17}/> Continue with {cartCount} scanned item{cartCount === 1 ? "" : "s"}
              </button>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
