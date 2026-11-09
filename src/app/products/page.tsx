"use client"; 
  
import { useState, useEffect, Suspense } from "react"; 
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  ChevronDown, 
  X, 
  CheckCircle2, 
  Menu, 
  Bell, 
} from "lucide-react"; 
import KassaSidebar from "@/components/KassaSidebar"; 
import { useSearchParams, useRouter } from "next/navigation"; 
import Link from "next/link";
import { formatNaira, getInventoryContext, getInventoryProducts, getInventoryCategories, assignProductBarcode, type InventoryProduct, type InventoryContext } from "@/lib/inventory-client"; 
  
type Product = {
  id: string;
  categoryId: string | null;
  lowStockThreshold: number;
  name: string; 
  sku: string;
  barcode: string | null; 
  category: string; 
  price: string; 
  stock: number; 
  status: "In stock" | "Low stock" | "Out of stock"; 
}; 
  
type Category = {
  id: string;
  name: string; 
  products: number; 
  stockValue: string; 
  status: "Active" | "Inactive"; 
}; 
  
type LowStockProduct = { 
  name: string; 
  sku: string; 
  category: string; 
  currentStock: number; 
  reorderLevel: number; 
  status: "Low stock" | "Out of stock"; 
}; 
  
const tabs = ["Catalogue", "Categories", "Low Stock"] as const; 
type Tab = (typeof tabs)[number]; 
 
function StatusBadge({ 
  status, 
}: { 
  status: 
    | Product["status"] 
    | Category["status"] 
    | LowStockProduct["status"]; 
}) { 
  const styles: Record<string, string> = { 
    "In stock": "bg-green-100 text-green-700", 
    "Low stock": "bg-amber-100 text-amber-700", 
    "Out of stock": "bg-red-100 text-red-700", 
    Active: "bg-green-100 text-green-700", 
    Inactive: "bg-gray-100 text-gray-500", 
  }; 
 
  return ( 
    <span 
      className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${styles[status]}`} 
    > 
      {status} 
    </span> 
  ); 
} 
  
function FilterDropdown({ 
  selected, 
  options, 
  onSelect, 
}: { 
  selected: string; 
  options: string[]; 
  onSelect: (value: string) => void; 
}) { 
  const [open, setOpen] = useState(false); 
  
  return ( 
    <div className="relative shrink-0">
      {/* Mobile-native selects are not clipped by horizontal filter scrolling. */}
      <select aria-label="Select filter" value={selected} onChange={(event) => onSelect(event.target.value)}
        className="max-w-[170px] shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 sm:hidden">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <div className="hidden sm:block">
      <button 
        type="button" 
        onClick={() => setOpen((prev) => !prev)} 
        className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50" 
      > 
        {selected} 
        <ChevronDown 
          size={14} 
          className={`transition-transform ${open ? "rotate-180" : ""}`} 
        /> 
      </button> 
  
      {open && ( 
        <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"> 
          {options.map((option) => ( 
            <button 
              key={option} 
              type="button" 
              onClick={() => { 
                onSelect(option); 
                setOpen(false); 
              }} 
              className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" 
            > 
              {option} 
            </button> 
          ))} 
        </div> 
      )}
      </div>
    </div>
  );
}

function ProductsPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [context, setContext] = useState<InventoryContext | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [barcodeSaving, setBarcodeSaving] = useState(false);

  function beginBarcodeEdit(product: Product) {
    setBarcodeProduct(product);
    setBarcodeValue(product.barcode ?? "");
    setBarcodeError("");
  }

  async function saveBarcode() {
    if (!context || !barcodeProduct || barcodeSaving) return;
    if (barcodeValue.length > 100) return setBarcodeError("Barcode must be 100 characters or less.");
    setBarcodeSaving(true);
    setBarcodeError("");
    try {
      const result = await assignProductBarcode(context, barcodeProduct.id, barcodeValue);
      setProducts((current) => current.map((item) =>
        item.id === result.id ? { ...item, barcode: result.barcode } : item));
      setBarcodeProduct(null);
    } catch (cause) {
      setBarcodeError(cause instanceof Error ? cause.message : "Unable to save barcode.");
    } finally {
      setBarcodeSaving(false);
    }
  }
  const [refreshRevision, setRefreshRevision] = useState(0);
  const lowStockProducts: LowStockProduct[] = products
    .filter((product) => product.status !== "In stock")
    .map((product) => ({
      name: product.name, sku: product.sku, category: product.category,
      currentStock: product.stock, reorderLevel: product.lowStockThreshold,
      status: product.status as LowStockProduct["status"],
    }));
  const [query, setQuery] = useState(""); 
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [selectedCategory, setSelectedCategory] = useState("All Categories"); 
  const [selectedStock, setSelectedStock] = useState("All stock"); 
  const [selectedSort, setSelectedSort] = useState("Sort"); 
  const [selectedCategories, setSelectedCategories] = useState("All categories"); 
  const [selectedStockstatus, setSelectedStockstatus] = useState("Stock Status"); 
  
  const searchParams = useSearchParams(); 
  const router = useRouter(); 
 
  const [activeTab, setActiveTab] = useState<Tab>(() => 
    searchParams.get("added") === "restock" && searchParams.get("status") !== "In stock"
      ? "Low Stock"
      : "Catalogue" 
  ); 
 
  const [showRestockToast, setShowRestockToast] = useState( 
    () => searchParams.get("added") === "restock" 
  ); 
 
  const [restockedProduct] = useState( 
    () => searchParams.get("product") || "" 
  ); 
 
  const [restockedUnits] = useState(
    () => searchParams.get("units") || ""
  );
  const [restockedStock] = useState(
    () => searchParams.get("stock") || ""
  );
  const [restockedStatus] = useState(
    () => searchParams.get("status") || ""
  );
 
  useEffect(() => { 
    if (searchParams.get("added") === "restock") { 
      router.replace("/products"); 
    } 
  }, [searchParams, router]); 
  
  useEffect(() => { 
    if (!showRestockToast) return; 
 
    const timer = setTimeout(() => { 
      setShowRestockToast(false); 
    }, 4000); 
 
    return () => clearTimeout(timer); 
  }, [showRestockToast]); 
  
  // Branch names and quantities are loaded from the authenticated API response.
  const [selectedBranch, setSelectedBranch] = useState("Loading branch...");

  // The page may remain mounted while users switch tabs or return from another window.
  // Reload instead of relying on the first snapshot of stock data.
  useEffect(() => {
    const refresh = () => setRefreshRevision((revision) => revision + 1);
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "selectedBranch") refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("branchChanged", refresh);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("branchChanged", refresh);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, []); 
 
  useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      setLoading(true);
      setError("");
      try {
        const context = await getInventoryContext();
        const [productList, categoryList] = await Promise.all([
          getInventoryProducts(context), getInventoryCategories(context),
        ]);
        if (cancelled) return;
        setProducts(productList.map((product: InventoryProduct) => ({
          id: product.id, name: product.name, sku: product.sku,
          barcode: product.barcode,
          categoryId: product.categoryId, lowStockThreshold: product.lowStockThreshold,
          category: product.category, price: formatNaira(product.price),
          stock: product.stock, status: product.status,
        })));
        setCategories(categoryList.map((category) => ({
          id: category.id, name: category.name, products: category.products,
          stockValue: formatNaira(category.stockValue), status: category.status,
        })));
        setSelectedBranch(context.branchName);
        setContext(context);
        setError("");
      } catch (cause) {
        if (!cancelled) {
          setProducts([]);
          setCategories([]);
          setError(cause instanceof Error ? cause.message : "Unable to load inventory.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadInventory();
    return () => { cancelled = true; };
  }, [refreshRevision]);

  // =========================
  // CATALOGUE SEARCH + FILTER
  // =========================
  const filteredProducts = products 
    .filter((p) => { 
      const search = query.toLowerCase().trim(); 
 
      const matchesSearch = 
        `${p.name} ${p.sku} ${p.category}` 
          .toLowerCase() 
          .includes(search); 
 
      const matchesCategory = 
        selectedCategory === "All Categories" || 
        p.category === selectedCategory; 
 
      const matchesStock = 
        selectedStock === "All stock" || 
        p.status === selectedStock; 
 
      return matchesSearch && matchesCategory && matchesStock; 
    }) 
    .sort((a, b) => { 
      if (selectedSort === "Name A-Z") { 
        return a.name.localeCompare(b.name); 
      } 
 
      if (selectedSort === "Name Z-A") { 
        return b.name.localeCompare(a.name); 
      } 
 
      if (selectedSort === "Price: Low to High") { 
        return ( 
          Number(a.price.replace(/[₦,]/g, "")) - 
          Number(b.price.replace(/[₦,]/g, "")) 
        ); 
      } 
 
      if (selectedSort === "Price: High to Low") { 
        return ( 
          Number(b.price.replace(/[₦,]/g, "")) - 
          Number(a.price.replace(/[₦,]/g, "")) 
        ); 
      } 
 
      if (selectedSort === "Stock: Low to High") { 
        return a.stock - b.stock; 
      } 
 
      if (selectedSort === "Stock: High to Low") { 
        return b.stock - a.stock; 
      } 
 
      return 0; 
    }); 
 
  // =========================
  // CATEGORY SEARCH
  // =========================
  const filteredCategories = categories.filter((c) => { 
    const search = query.toLowerCase().trim(); 
 
    return `${c.name} ${c.status}` 
      .toLowerCase() 
      .includes(search); 
  }); 
 
  // =========================
  // LOW STOCK SEARCH + FILTER
  // =========================
  const filteredLowStockProducts = lowStockProducts.filter((p) => { 
    const search = query.toLowerCase().trim(); 
 
    const matchesSearch = 
      `${p.name} ${p.sku} ${p.category}` 
        .toLowerCase() 
        .includes(search); 
 
    const matchesCategory = 
      selectedCategories === "All categories" || 
      selectedCategories === "All Categories" || 
      p.category === selectedCategories; 
 
    const matchesStatus = 
      selectedStockstatus === "Stock Status" || 
      p.status === selectedStockstatus; 
 
    return matchesSearch && matchesCategory && matchesStatus; 
  }); 
  
  const totalProducts = products.length; 
 
  const numCategories = categories.length; 
 
  const lowStock = lowStockProducts.length; 
 
  const headerButtonLabel = 
    activeTab === "Catalogue" 
      ? "Add product" 
      : activeTab === "Categories" 
      ? "Add category" 
      : "Restock product"; 
 
  return ( 
    <div className="min-h-screen overflow-x-hidden bg-gray-50"> 
      <KassaSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      /> 
  
      <main className="min-h-screen lg:ml-[198px] "> 
        {/* Mobile header row with menu button */} 
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8"> 
         
          {/* Hamburger + Greeting */} 
          <div className="flex min-w-0 items-center gap-3"> 
            <button 
              type="button" 
              onClick={() => setSidebarOpen(true)} 
              className="shrink-0 rounded-md p-1.5 text-[#374151] transition hover:bg-[#F3F4F6] lg:hidden" 
              aria-label="Open menu" 
            > 
              <Menu size={22} /> 
            </button> 
         
            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]"> 
              Products & Inventory 
            </h1> 
          </div> 
         
          {/* Header actions */} 
          <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-5"> 
         
            {/* Branch display - no dropdown */} 
            <div className="hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]"> 
              <div className="flex h-[34px] w-full items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] sm:text-[13px]"> 
                <span className="truncate">{selectedBranch}</span> 
              </div> 
            </div> 
         
            {/* Notification */} 
            <button 
              className="relative flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#F8F9FA]" 
              type="button" 
              aria-label="Notifications" 
            > 
              <Bell size={17} className="text-[#98A1AE]" /> 
         
              <span className="absolute right-[8px] top-[6px] h-[7px] w-[7px] rounded-full bg-[#E54848]" /> 
            </button> 
         
            {/* Profile */} 
            <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F]"> 
              AO 
            </div> 
          </div> 
        </header> 
         
        <p className="mb-6 px-4 pt-6 text-sm text-gray-500 sm:px-6 sm:pt-8 sm:text-base lg:px-8 lg:pt-12"> 
          {activeTab === "Low Stock" 
            ? "Monitor products, categories and stock levels" 
            : "Manage your catalogue, categories and stock levels."} 
        </p> 
 
        {error && <p role="alert" className="mb-4 px-4 sm:px-6 lg:px-8 text-sm text-red-700">{error}</p>}
        {loading && <p role="status" className="mb-4 px-4 sm:px-6 lg:px-8 text-sm text-gray-500">Loading inventory...</p>}

        {/* Tabs + Action Button */} 
        <div className="mb-6 flex min-w-0 flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8"> 
          {/* Tabs */} 
          <div className="flex min-w-0 flex-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1"> 
            {tabs.map((tab) => ( 
              <button 
                key={tab} 
                onClick={() => { 
                  setActiveTab(tab);
                  setQuery("");
                  setRefreshRevision((revision) => revision + 1); 
                }} 
                className={`flex-1 shrink-0 px-3 sm:px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${ 
                  activeTab === tab 
                    ? "text-emerald-700 border-b-2 border-emerald-700" 
                    : "text-gray-500 hover:text-gray-700" 
                }`} 
              > 
                {tab} 
              </button> 
            ))} 
          </div> 
 
          {/* Action Button */} 
          <div className="flex justify-start lg:justify-end"> 
            <Link 
              href={ 
                activeTab === "Catalogue" 
                  ? "/products/add" 
                  : activeTab === "Categories" 
                  ? "/products/categories/add" 
                  : "/products/restock" 
              } 
              className="inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors" 
            > 
              <Plus size={16} /> 
              {headerButtonLabel} 
            </Link> 
          </div> 
        </div> 
 
        {/* ================= CATALOGUE TAB ================= */} 
        {activeTab === "Catalogue" && ( 
          <> 
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 px-4 sm:px-6 lg:px-8"> 
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5"> 
                <p className="text-sm text-gray-500 mb-2"> 
                  Total products 
                </p> 
 
                <div className="flex items-baseline gap-2 flex-wrap"> 
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900"> 
                    {totalProducts} 
                  </p> 
 
                  <span className="text-xs text-emerald-600"> 
                    In catalogue 
                  </span> 
                </div> 
              </div> 
 
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5"> 
                <p className="text-sm text-gray-500 mb-2"> 
                  Categories 
                </p> 
 
                <p className="text-xl sm:text-2xl font-semibold text-gray-900"> 
                  {numCategories} 
                </p> 
              </div> 
 
              <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-5"> 
                <p className="text-sm text-gray-500 mb-2"> 
                  Stock alerts 
                </p> 
 
                <div className="flex items-baseline gap-2 flex-wrap"> 
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900"> 
                    {lowStock} 
                  </p> 
 
                  <span className="text-xs text-red-600"> 
                    Needs attention 
                  </span> 
                </div> 
              </div> 
            </div> 
 
            {/* Search + Filters */} 
            <div className="mb-4 flex min-w-0 flex-col gap-3 px-4 sm:px-6 lg:flex-row lg:px-8"> 
              <div className="flex-1 relative"> 
                <Search 
                  size={16} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
                /> 
 
                <input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="Search products by name or code" 
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700" 
                /> 
              </div> 
 
              <div className="flex min-w-0 max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible sm:pb-0"> 
                <FilterDropdown 
                  selected={selectedCategory} 
                  options={["All Categories", ...categories.map((category) => category.name)]} 
                  onSelect={setSelectedCategory} 
                /> 
 
                <FilterDropdown 
                  selected={selectedStock} 
                  options={[ 
                    "All stock", 
                    "In stock", 
                    "Low stock", 
                    "Out of stock", 
                  ]} 
                  onSelect={setSelectedStock} 
                /> 
 
                <FilterDropdown 
                  selected={selectedSort} 
                  options={[ 
                    "Sort", 
                    "Name A-Z", 
                    "Name Z-A", 
                    "Price: Low to High", 
                    "Price: High to Low", 
                    "Stock: Low to High", 
                    "Stock: High to Low", 
                  ]} 
                  onSelect={setSelectedSort} 
                /> 
 
                <span className="flex shrink-0 items-center px-2 text-sm text-gray-400 whitespace-nowrap"> 
                  {filteredProducts.length} products 
                </span> 
              </div> 
            </div> 
 
            {/* Catalogue Table */} 
            <div className="mx-4 overflow-x-auto rounded-xl border border-gray-200 bg-white sm:mx-6 lg:mx-8 "> 
              <table className="w-full min-w-[720px] text-sm "> 
                <thead> 
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide"> 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Product 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Category 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Price 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Stock 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Status 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Action 
                    </th> 
                  </tr> 
                </thead> 
 
                <tbody> 
                  {filteredProducts.map((p) => ( 
                    <tr 
                      key={p.sku} 
                      className="border-b border-gray-50 last:border-0" 
                    > 
                      <td className="px-6 py-4 whitespace-nowrap"> 
                        <p className="font-medium text-gray-900"> 
                          {p.name} 
                        </p> 
 
                        <p className="text-gray-500 text-xs"> 
                          SKU: {p.sku}{p.barcode ? " · Barcode: " + p.barcode : ""}
                        </p> 
                      </td> 
 
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap"> 
                        {p.category} 
                      </td> 
 
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap"> 
                        {p.price} 
                      </td> 
 
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap"> 
                        {p.stock} 
                      </td> 
 
                      <td className="px-6 py-4 whitespace-nowrap"> 
                        <StatusBadge status={p.status} /> 
                      </td> 
 
                      <td className="px-6 py-4 whitespace-nowrap"> 
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => beginBarcodeEdit(p)}
                            aria-label={`Assign barcode for ${p.name}`}
                            className="whitespace-nowrap text-xs font-medium text-emerald-800 hover:underline">
                            {p.barcode ? "Edit barcode" : "Assign barcode"}
                          </button>
                          <button type="button"
                            onClick={() => router.push(`/products/restock?productId=${encodeURIComponent(p.id)}`)}
                            aria-label={`Restock ${p.name}`} title="Restock this product"
                            className="text-gray-400 hover:text-gray-600">
                            <MoreHorizontal size={18}/>
                          </button>
                        </div> 
                      </td> 
                    </tr> 
                  ))} 
 
                  {filteredProducts.length === 0 && ( 
                    <tr> 
                      <td 
                        colSpan={6} 
                        className="px-6 py-8 text-center text-gray-400" 
                      > 
                        No products found. 
                      </td> 
                    </tr> 
                  )} 
                </tbody> 
              </table>
            </div>
            {barcodeProduct && (
              <div className="mx-4 mt-5 max-w-xl rounded-xl border border-gray-200 bg-white p-5 sm:mx-6 lg:mx-8">
                <h3 className="text-base font-semibold text-gray-900">Assign product barcode</h3>
                <p className="mt-1 text-sm text-gray-500">{barcodeProduct.name} · SKU {barcodeProduct.sku}</p>
                <form onSubmit={(event) => {event.preventDefault();void saveBarcode();}} className="mt-4 space-y-3">
                  <label htmlFor="barcode-editor" className="block text-sm font-medium text-gray-700">
                    Barcode on product packaging
                  </label>
                  <input id="barcode-editor" value={barcodeValue}
                    onChange={(event) => setBarcodeValue(event.target.value)}
                    maxLength={100} autoComplete="off" spellCheck={false}
                    placeholder="Scan or type barcode number"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-700"/>
                  <p className="text-xs text-gray-500">Leave blank to remove an old barcode. Keep leading zeroes.</p>
                  {barcodeError && <p role="alert" className="text-sm text-red-700">{barcodeError}</p>}
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" disabled={barcodeSaving || !context}
                      className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      {barcodeSaving ? "Saving..." : "Save barcode"}
                    </button>
                    <button type="button" onClick={() => setBarcodeProduct(null)}
                      className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700">Cancel</button>
                  </div>
                </form>
              </div>
            )}
          </> 
        )} 
 
        {/* ================= CATEGORIES TAB ================= */} 
        {activeTab === "Categories" && ( 
          <> 
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-4 sm:px-6 lg:px-8 mb-6"> 
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5"> 
                <p className="text-sm text-gray-500 mb-2"> 
                  Total categories 
                </p> 
 
                <div className="flex items-baseline gap-2 flex-wrap"> 
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900"> 
                    {categories.length} 
                  </p> 
 
                  <span className="text-xs text-gray-400"> 
                    active categories 
                  </span> 
                </div> 
              </div> 
 
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5"> 
                <p className="text-sm text-gray-500 mb-2"> 
                  Products assigned 
                </p> 
 
                <div className="flex items-baseline gap-2 flex-wrap"> 
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900"> 
                    {products.filter((p) => p.categoryId).length} 
                  </p> 
 
                  <span className="text-xs text-gray-400"> 
                    across categories 
                  </span> 
                </div> 
              </div> 
 
              <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-5"> 
                <p className="text-sm text-gray-500 mb-2"> 
                  Uncategorised 
                </p> 
 
                <div className="flex items-baseline gap-2 flex-wrap"> 
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900"> 
                    {products.filter((p) => !p.categoryId).length} 
                  </p> 
 
                  <span className="text-xs text-amber-600"> 
                    products need a category 
                  </span> 
                </div> 
              </div> 
            </div> 
 
            {/* Category Search */} 
            <div className="mb-4 px-4 sm:px-6 lg:px-8"> 
              <div className="flex-1 relative"> 
                <Search 
                  size={16} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
                /> 
 
                <input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="Search Category by name or code" 
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700" 
                /> 
              </div> 
            </div> 
 
            {/* Categories Table */} 
            <div className="mx-4 overflow-x-auto rounded-xl border border-gray-200 bg-white sm:mx-6 lg:mx-8"> 
              <table className="w-full min-w-[560px] text-sm"> 
                <thead> 
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide"> 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Category 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Products 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Stock value 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Status 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Action 
                    </th> 
                  </tr> 
                </thead> 
 
                <tbody> 
                  {filteredCategories.map((c) => ( 
                    <tr 
                      key={c.name} 
                      className="border-b border-gray-50 last:border-0" 
                    > 
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap"> 
                        {c.name} 
                      </td> 
 
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap"> 
                        {c.products} 
                      </td> 
 
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap"> 
                        {c.stockValue} 
                      </td> 
 
                      <td className="px-6 py-4 whitespace-nowrap"> 
                        <StatusBadge status={c.status} /> 
                      </td> 
 
                      <td className="px-6 py-4 whitespace-nowrap"> 
                        <button
                          type="button"
                          onClick={() => { setActiveTab("Catalogue"); setSelectedCategory(c.name); setQuery(""); }}
                          className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                          View › 
                        </button> 
                      </td> 
                    </tr> 
                  ))} 
 
                  {filteredCategories.length === 0 && ( 
                    <tr> 
                      <td 
                        colSpan={5} 
                        className="px-6 py-8 text-center text-gray-400" 
                      > 
                        No categories found. 
                      </td> 
                    </tr> 
                  )} 
                </tbody> 
              </table> 
            </div> 
          </> 
        )} 
 
        {/* ================= LOW STOCK TAB ================= */} 
        {activeTab === "Low Stock" && ( 
          <> 
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 px-4 sm:px-6 lg:px-8"> 
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5"> 
                <p className="text-sm text-gray-500 mb-2"> 
                  Low-stock products 
                </p> 
 
                <p className="text-xl sm:text-2xl font-semibold text-amber-600"> 
                  {products.filter((p) => p.status === "Low stock").length} 
                </p> 
              </div> 
 
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5"> 
                <p className="text-sm text-gray-500 mb-2"> 
                  Out of stock 
                </p> 
 
                <p className="text-xl sm:text-2xl font-semibold text-red-600"> 
                  {products.filter((p) => p.status === "Out of stock").length} 
                </p> 
              </div> 
 
              <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-5"> 
                <p className="text-sm text-gray-500 mb-2"> 
                  Needs attention 
                </p> 
 
                <p className="text-sm sm:text-base font-semibold text-gray-900 mt-1.5"> 
                  {lowStockProducts.length === 0 ? "All products are adequately stocked" : "Restock before next sales cycle"} 
                </p> 
              </div> 
            </div> 
 
            {/* Low Stock Search + Filters */} 
            <div className="mb-4 flex min-w-0 flex-col gap-3 px-4 sm:px-6 lg:flex-row lg:px-8"> 
              <div className="flex-1 relative"> 
                <Search 
                  size={16} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
                /> 
 
                <input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="Search Stock by name or code" 
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700" 
                /> 
              </div> 
 
              <div className="flex min-w-0 max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible sm:pb-0"> 
                <FilterDropdown 
                  selected={selectedCategories} 
                  options={["All categories", ...categories.map((category) => category.name)]} 
                  onSelect={setSelectedCategories} 
                /> 
                
                <FilterDropdown 
                  selected={selectedStockstatus} 
                  options={[ 
                    "Stock Status", 
                    "Low stock", 
                    "Out of stock", 
                  ]} 
                  onSelect={setSelectedStockstatus} 
                /> 
 
                <span className="flex shrink-0 items-center px-2 text-sm text-gray-400 whitespace-nowrap"> 
                  {filteredLowStockProducts.length} products 
                </span> 
              </div> 
            </div> 
 
            {/* Low Stock Table */} 
            <div className="mx-4 overflow-x-auto rounded-xl border border-gray-200 bg-white sm:mx-6 lg:mx-8"> 
              <table className="w-full min-w-[620px] text-sm "> 
                <thead> 
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide"> 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Product 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Category 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Current stock 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Reorder level 
                    </th> 
 
                    <th className="px-6 py-4 font-medium whitespace-nowrap"> 
                      Status 
                    </th> 
                  </tr> 
                </thead> 
 
                <tbody> 
                  {filteredLowStockProducts.map((p) => ( 
                    <tr 
                      key={p.sku} 
                      className="border-b border-gray-50 last:border-0" 
                    > 
                      <td className="px-6 py-4 whitespace-nowrap"> 
                        <p className="font-medium text-gray-900"> 
                          {p.name} 
                        </p> 
 
                        <p className="text-gray-500 text-xs"> 
                          SKU {p.sku} 
                        </p> 
                      </td> 
 
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap"> 
                        {p.category} 
                      </td> 
 
                      <td className="px-6 py-4 font-medium text-amber-600 whitespace-nowrap"> 
                        {p.currentStock} units 
                      </td> 
 
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap"> 
                        {p.reorderLevel} units 
                      </td> 
 
                      <td className="px-6 py-4 whitespace-nowrap"> 
                        <StatusBadge status={p.status} /> 
                      </td> 
                    </tr> 
                  ))} 
 
                  {filteredLowStockProducts.length === 0 && ( 
                    <tr> 
                      <td 
                        colSpan={5} 
                        className="px-6 py-8 text-center text-gray-400" 
                      > 
                        No products currently below their stock threshold. 
                      </td> 
                    </tr> 
                  )} 
                </tbody> 
              </table> 
            </div> 
          </> 
        )} 
      </main> 
 
      {/* Restock Toast */} 
      {showRestockToast && ( 
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto sm:max-w-md flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-lg z-50"> 
          <CheckCircle2 
            className="text-[#0F4C3A] shrink-0" 
            size={20} 
          /> 
 
          <div className="min-w-0"> 
            <p className="text-[13px] font-semibold text-[#182033]"> 
              Restock successful 
            </p> 
 
            <p className="text-[12px] text-[#98A1AE]"> 
              {restockedUnits} units added to {restockedProduct}.
              {restockedStock && restockedStatus
                ? ` Stock is now ${restockedStock} units (${restockedStatus}).`
                : " Updated stock has been saved."}
            </p> 
          </div> 
 
          <button 
            onClick={() => setShowRestockToast(false)} 
            className="shrink-0" 
          > 
            <X size={14} className="text-[#98A1AE]" /> 
          </button> 
        </div> 
      )} 
    </div> 
  ); 
} 
  
export default function ProductsPage() { 
  return ( 
    <Suspense fallback={null}> 
      <ProductsPageContent /> 
    </Suspense> 
  ); 
}