# Kassa responsive layout standards

**Reference:** the authenticated Dashboard screen.

## Layout

- **Sidebar:** fixed 198px width on desktop, overlay hamburger navigation on mobile. The main content begins at `lg:ml-[198px]` — not at the `md` breakpoint.
- **Header:** `min-h-[80px] px-4 py-4 sm:px-6 lg:px-8`. Use the same left/right gutters as the body.
- **Main content:** `px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12`. Use these classes on the outer page section; do not add a second nested page gutter.
- **Page heading:** `text-[18px] sm:text-[20px] lg:text-[21px]` as a practical baseline, not the previously accidental `sm:text-[10px]`.
- **Cards:** use `grid-cols-1` or `grid-cols-2` on narrow phones according to content; move to larger column counts only at `sm`/`lg`/`xl` when content fits.
- **Tables:** scroll *inside* a `w-full overflow-x-auto` wrapper. Keep useful table minimum widths so the browser does not squeeze text into unreadable columns.
- **Filter chips and dropdowns:** use `min-w-0 max-w-full overflow-x-auto` and non-shrinking filters for phone widths. Native `<select>` elements on mobile avoid popover clipping by the horizontal scroller; custom dropdowns can be shown above `sm` when the row uses `overflow-visible`.
- **Form controls:** inputs should use `w-full min-w-0` where necessary; avoid fixed pixel widths on narrow viewports.
- Keep original desktop styles, colors and functionality while harmonizing outer spacing.

## Screens updated

Dashboard title, Products & Inventory (all tabs and mobile filter scrolling), Add Product, Add Category, Restock Product, New Sale, Checkout, Payment Status, Payment Success, Receipt, Transactions listing and detail/dispute, Reports, Customers listing and add/edit, Scan Product and manual entry, Settings, Staff & Branches listing plus add branch/role screens.

The authentication and merchant-onboarding marketing layouts intentionally have a different structure from the authenticated workspace.

## Manual QA checklist

At viewport widths **320, 360, 375, 390, 430, 768, 1024, and 1440px**:

1. Compare header, content cards and table gutters with the Dashboard.
2. Open and close the hamburger navigation; content should not hide behind the 198px desktop sidebar on tablet.
3. Confirm **Catalogue** and **Low Stock** inventory filters scroll horizontally and remain operable on 320px phones.
4. Confirm Transactions filter row scrolls on mobile and its filter values actually apply.
5. Scroll each large table sideways within the table container; the entire page must not scroll horizontally.
6. Check forms and the dispute screen: no clipped inputs, off-screen submit buttons or overlapping grids.
7. Check camera, barcode input, New Sale cart and permissions still work.
8. Check receipt **print** styling and full sale/checkout flow.

**Status:** Source updated and reviewed; browser/device visual testing still required before claiming all breakpoints are verified. Run `npx tsc --noEmit` and test on your phone after pulling changes.
