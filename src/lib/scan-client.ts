import { inventoryFetch, type InventoryContext } from "@/lib/inventory-client";

export type ScannedProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  price: string;
  stock: number;
  status: "In stock" | "Low stock" | "Out of stock";
};

export type CartItem = { productId: string; quantity: number };
type CartStore = { businessId: string; branchId: string; items: CartItem[] };

export const SCAN_CART_KEY = "kassa_scan_cart";
export const SALE_CART_KEY = "kassa_new_sale_cart";

export function findScannedProduct(context: InventoryContext, rawCode: string) {
  const code = rawCode.trim();
  if (!code || code.length > 100) {
    throw new Error("Enter a valid barcode or SKU of 1–100 characters.");
  }
  const params = new URLSearchParams({
    businessId: context.businessId,
    branchId: context.branchId,
    code,
  });
  return inventoryFetch<ScannedProduct>("/api/sales/lookup?" + params.toString());
}

export function readScopedCart(key: string, context: Pick<InventoryContext, "businessId" | "branchId">): CartItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    const cart = parsed as Partial<CartStore>;
    if (cart.businessId !== context.businessId || cart.branchId !== context.branchId ||
        !Array.isArray(cart.items)) return [];
    return cart.items.filter((item): item is CartItem => {
      return !!item && typeof item.productId === "string" &&
        /^[0-9a-f-]{36}$/i.test(item.productId) &&
        Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100000;
    }).slice(0, 50);
  } catch {
    return [];
  }
}

export function writeScopedCart(key: string, context: Pick<InventoryContext, "businessId" | "branchId">, items: CartItem[]) {
  if (typeof window === "undefined") return;
  const cart: CartStore = {
    businessId: context.businessId,
    branchId: context.branchId,
    items: items.slice(0, 50),
  };
  window.sessionStorage.setItem(key, JSON.stringify(cart));
}

export function addScannedItem(context: InventoryContext, product: ScannedProduct): number {
  if (product.stock < 1) throw new Error("This product is out of stock in your branch.");
  const existing = readScopedCart(SCAN_CART_KEY, context);
  const current = existing.find((item) => item.productId === product.id);
  if (current) {
    if (current.quantity >= product.stock) {
      throw new Error("The scanned quantity already equals the available stock.");
    }
    current.quantity += 1;
  } else {
    if (existing.length >= 50) throw new Error("The sale can contain at most 50 different products.");
    existing.push({ productId: product.id, quantity: 1 });
  }
  writeScopedCart(SCAN_CART_KEY, context, existing);
  return existing.reduce((total, item) => total + item.quantity, 0);
}
