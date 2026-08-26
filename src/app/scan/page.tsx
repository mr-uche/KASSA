"use client";

import { useState } from "react";
import { ArrowLeft, Zap, Keyboard, Camera, Minus, Plus, CheckCircle2 } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import Link from "next/link";

type SaleItem = {
  name: string;
  qty: number;
  price: number;
  justAdded?: boolean;
};

const initialSale: SaleItem[] = [
  { name: "Paracetamol 500mg", qty: 2, price: 1700 },
  { name: "Vitamin C 1000mg", qty: 1, price: 1500 },
];

const scannedProduct = {
  name: "Amoxicillin 250mg",
  sku: "AMX-250",
  category: "Antibiotics",
  price: 2100,
  stockLeft: 8,
};

export default function ScanProductPage() {
  const [quantity, setQuantity] = useState(1);
  const [sale, setSale] = useState<SaleItem[]>(initialSale);
  const [added, setAdded] = useState(false);

  const handleAddToSale = () => {
    setSale((prev) => [
      ...prev,
      { name: scannedProduct.name, qty: quantity, price: scannedProduct.price, justAdded: true },
    ]);
    setAdded(true);
  };

  const total = sale.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-gray-900">Scan product</h1>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">
            Main branch
          </button>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium mt-4 mb-4"
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        <div className="grid grid-cols-3 gap-6">
          {/* Scaer viewrt */}
          <div className="col-span-2 bg-[#0B1220] rounded-xl p-8 flex flex-col items-center justify-between min-h-[520px]">
            <div className="relative w-full max-w-md flex-1 flex items-center justify-center">
              {/* cor brats */}
              <div className="absolute top-8 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
              <div className="absolute top-8 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
              <div className="absolute bottom-8 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
              <div className="absolute bottom-8 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />

              <div className="flex items-center gap-[3px]">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white"
                    style={{
                      width: i % 3 === 0 ? "4px" : "2px",
                      height: "56px",
                    }}
                  />
                ))}
              </div>
              <div className="absolute w-full h-0.5 bg-emerald-400" />
            </div>

            <div className="text-center mb-4">
              <p className="text-white text-sm">Position the barcode within the frame</p>
              <p className="text-gray-400 text-xs mt-1">Scanning happens automatically</p>
            </div>

            <div className="flex items-center gap-6">
              <button className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                <Zap size={18} />
              </button>
              <button className="flex flex-col items-center gap-1 text-white">
                <span className="w-11 h-11 rounded-full bg-emerald-700 flex items-center justify-center">
                  <Keyboard size={18} />
                </span>
                <span className="text-xs text-gray-300">Enter code manually</span>
              </button>
              <button className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                <Camera size={18} />
              </button>
            </div>
          </div>

          {/* Result + current sale */}
          <div className="space-y-4">
            {added && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span className="text-sm font-semibold text-emerald-800">PRODUCT FOUND</span>
                </div>

                <div className="bg-white rounded-lg p-3">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-md bg-gray-100 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{scannedProduct.name}</p>
                      <p className="text-xs text-gray-500">
                        SKU: {scannedProduct.sku} · {scannedProduct.category}
                      </p>
                      <p className="text-emerald-700 font-semibold mt-1">
                        ₦{scannedProduct.price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                      {scannedProduct.stockLeft} left in stock
                    </span>
                    <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-2 py-1">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleAddToSale}
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              Add to sale — ₦{(scannedProduct.price * quantity).toLocaleString()}
            </button>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">Current sale</h3>
                <span className="text-sm text-emerald-700 font-medium">{sale.length} items</span>
              </div>

              <div className="space-y-3 mb-4">
                {sale.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className={item.justAdded ? "text-gray-400" : "text-gray-700"}>
                        {item.name} × {item.qty}
                      </span>
                      {item.justAdded && (
                        <span className="ml-2 text-xs text-emerald-600">just added</span>
                      )}
                    </div>
                    <span className={item.justAdded ? "text-gray-400" : "text-gray-900 font-medium"}>
                      ₦{item.price.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4 mb-4">
                <span className="font-semibold text-gray-900">Sale total</span>
                <span className="text-xl font-bold text-emerald-700">
                  ₦{total.toLocaleString()}
                </span>
              </div>

              <button className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded-lg text-sm font-medium mb-2 transition-colors">
                Proceed to payment
              </button>
              <button className="w-full text-center text-emerald-700 text-sm font-medium py-1">
                Scan another item
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}