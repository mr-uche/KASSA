# Kassa — Barcode Camera & External Scanner Integration

## Implemented

- **Camera barcode detection** on supported HTTPS or localhost browsers via `@zxing/browser` and `@zxing/library`; the customer chooses Start Camera explicitly. Camera tracks stop after a successful scan, when the tab becomes hidden, on Stop Camera, and on navigation.
- **USB/Bluetooth HID keyboard-wedge scanners** (the common scanner mode) are supported through a dedicated input and a rapid-keyboard/Enter listener while `/scan` is open. No USB API permissions are needed for keyboard-wedge scanners.
- Scanned products are resolved with an authenticated, business-and-branch-scoped NestJS `GET /sales/lookup?businessId=&branchId=&code=` endpoint. It matches exact barcodes and case-insensitive SKUs; it tolerates UPC-A versus zero-prefixed EAN-13 reads. Ambiguous cross-field matches are rejected.
- The lookup requires `Manage sales & transactions`, verifies assigned active branch and returns only product name, SKU, barcode, selling price, category, availability and stock (never cost price).
- A camera scan displays the verified product. Click **Add to Sale** to stage it. Keyboard scanners configured with the Enter suffix automatically stage a matched in-stock product.
- Each scan can increase quantity up to live branch stock. **View Sale** opens `/sales/new` with staged items merged into a remembered current sale. This is per-tab/session and always scoped to business and branch.
- Existing products can be assigned or changed a barcode from **Products & Inventory → Catalogue → Assign barcode**; newly created products have an optional Barcode Number field.
- Manual entry at `/scan/product-code` now uses real lookup. No sample products or simulated scan success.
- No new database migration was required: `Product.barcode` and its unique business+barcode index already existed in the Prisma schema.

## How to install and start

On Windows, using the project root (save any local changes first):

```powershell
cd C:\dev\KASSA
git status
git pull origin main
npm ci
npx next typegen
npx tsc --noEmit
npm run dev
```

In a second terminal:

```powershell
cd C:\dev\KASSA\backend
npm run typecheck
npm run start:dev
```

`npm ci` installs the ZXing packages using the synchronized root `package-lock.json`. If you see an `EBADENGINE` warning, check `node -v`; `@zxing/library@0.23.0` declares Node >=24. Upgrade to a supported Node 24 LTS release if your installation enforces engine compatibility.

## Test a camera scan

1. Login as Owner or staff with Manage sales & transactions.
2. From Products & Inventory, assign the printed barcode to an existing product, or add a new product including the Barcode Number. Confirm that it has positive stock at the selected branch.
3. Open `http://localhost:3000/scan` on the machine running Next.js (or use a deployed HTTPS domain on a phone).
4. Click Start Camera, grant browser camera permission, and hold the barcode inside the frame. The camera will stop on a successful scan.
5. Verify that product name, price, SKU, barcode, and branch stock match Supabase. Click Add to Sale and then View Sale.
6. Confirm the scanned product appears in New Sale. Continue with normal cash/other payment flow; only verified payment or explicit confirmed cash receipt deducts stock.

## Test USB or Bluetooth scanner

1. Pair a Bluetooth scanner or connect a USB scanner in **HID keyboard mode**.
2. Configure the scanner to append **Enter** after each barcode (common default). Ensure prefix/suffix formatting does not add extraneous characters other than Enter.
3. Open `/scan`. A scanner can input into the 'USB/Bluetooth barcode scanner' field and press Enter automatically. Rapid keyboard-wedge scans also work while focus is elsewhere on the page.
4. A matching barcode automatically adds one unit to the scan cart. Scan the same barcode again: quantity should increment, but not beyond the stock balance.
5. Click View Sale to open the checkout with all staged items.
6. If the scanner has no Enter suffix, click the input, scan, then click Find Product and Add to Sale manually.

## Security, device support, and limitations

- Camera access requires a **secure context** (HTTPS or localhost). Visiting `http://192.168.x.x:3000` from a phone is not a secure context and generally cannot open the phone camera.
- USB HID scanners behave like keyboards and do not require vendor-specific plugins; scanners operating only in serial/COM, OPOS, or proprietary modes require separate integration and are not covered.
- Only codes saved as product barcodes or SKUs match. Physical retail barcode values are not automatically known to Kassa.
- Users without Manage sales & transactions cannot call the lookup API; users without Manage products & inventory cannot assign product barcodes.
- Confirmed sales are still subject to the payment/reconciliation rules; simply scanning never marks a sale as paid or decrements stock.
- The scan cart persists within the current browser tab session and is not yet synced between devices.
- Tested by source/code inspection and committed to GitHub; end-to-end camera hardware tests and local Next/Nest typechecks still need to run on the user's Windows setup.

## Basic error diagnosis

- **Camera blocked:** browser permission or HTTP origin; open site settings and allow camera, or deploy HTTPS.
- **Camera not found:** check phone/laptop camera availability, whether another app has locked it, and browser support.
- **No product found:** check the barcode exactly matches the assigned Barcode Number or SKU and the user selected the correct business/branch.
- **Out of stock:** product exists but the assigned branch has 0 stock; restock through Inventory before adding to sale.
- **USB scanner types but doesn't add:** verify HID keyboard mode and Enter suffix; test in the scanner text input.
- **403:** staff lacks Manage sales & transactions, or the branch does not match their assignment.
- **TypeScript dependency errors:** run `npm ci` in the frontend root; don't install packages in `backend/`.
