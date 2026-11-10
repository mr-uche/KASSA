"use client";

import type { SavedSale } from "@/lib/sales-client";

type ReceiptLine = { text: string; bold?: boolean; size?: number };

// Core PDF fonts don't include the naira glyph. Preserve the exact amounts as
// "NGN" in the downloadable PDF; the on-screen receipt uses the naira symbol.
function plain(value: string): string {
  return value.normalize("NFKD")
    .replace(/₦/g, "NGN ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");
}

function wrap(text: string, width = 78): string[] {
  const words = plain(text).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const result: string[] = [];
  let current = "";
  for (const word of words) {
    let remaining = word;
    while (remaining.length > width) {
      if (current) { result.push(current); current = ""; }
      result.push(remaining.slice(0, width));
      remaining = remaining.slice(width);
    }
    if (!remaining) continue;
    if (current && current.length + remaining.length + 1 > width) {
      result.push(current);
      current = remaining;
    } else {
      current += (current ? " " : "") + remaining;
    }
  }
  if (current) result.push(current);
  return result;
}

function money(value: string): string {
  const amount = Number(value);
  return "NGN " + (Number.isFinite(amount)
    ? amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : plain(value));
}

function pdfEscape(input: string): string {
  return plain(input).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createPdf(lines: ReceiptLine[]): Blob {
  const perPage = 46;
  const pages: ReceiptLine[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  const pageIds = pages.map((_, i) => 5 + 2 * i);
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [" + pageIds.map((id) => id + " 0 R").join(" ") +
      "] /Count " + pages.length + " >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>",
  ];

  pages.forEach((page, pageIndex) => {
    const commands = page.map((line, lineIndex) => {
      const font = line.bold ? "/F2" : "/F1";
      const size = line.size ?? 10;
      const y = 788 - lineIndex * 16;
      return "BT " + font + " " + size + " Tf 45 " + y +
        " Td (" + pdfEscape(line.text) + ") Tj ET";
    }).join("\n");
    const stream = commands + "\n";
    const pageId = pageIds[pageIndex];
    const streamId = pageId + 1;
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " +
      streamId + " 0 R >>");
    objects.push("<< /Length " + stream.length + " >>\nstream\n" +
      stream + "endstream");
  });

  let pdf = "%PDF-1.4\n%KASSA\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += (index + 1) + " 0 obj\n" + object + "\nendobj\n";
  });
  const xref = pdf.length;
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += String(offset).padStart(10, "0") + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\n" +
    "startxref\n" + xref + "\n%%EOF\n";
  return new Blob([pdf], { type: "application/pdf" });
}

/** Download a receipt using only saved, verified sale data. Never generate paid
 * receipts from callback query parameters or unverified client-side totals. */
export function downloadSaleReceiptPdf(
  sale: SavedSale, businessName: string, branchName: string,
): void {
  const successful = sale.payments.find((payment) => payment.status === "SUCCEEDED");
  if (sale.status !== "PAID" || !successful) return;

  const test = successful.provider === "PAYSTACK_TEST";
  const lines: ReceiptLine[] = [];
  const add = (text: string, bold = false, size = 10) => {
    wrap(text).forEach((segment) => lines.push({ text: segment, bold, size }));
  };
  const pair = (label: string, value: string) => {
    add(label + ": " + value);
  };
  const rule = "-".repeat(78);

  add(businessName || "Kassa merchant", true, 14);
  if (branchName) add(branchName);
  add(test ? "PAYSTACK TEST RECEIPT" : "PAYMENT RECEIPT", true, 12);
  if (test) {
    add("TEST TRANSACTION - NO REAL MONEY RECEIVED", true);
    add("Not proof of payment or settlement.", true);
  }
  add(rule);
  pair("Receipt reference", sale.reference);
  pair("Payment confirmed", new Date(successful.confirmedAt ?? sale.createdAt)
    .toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }));
  pair("Served by", sale.cashier);
  pair("Customer", sale.customer);
  pair("Payment method", successful.channel.replaceAll("_", " "));
  if (test && successful.providerReference) pair("Paystack test reference", successful.providerReference);
  add(rule);
  add("ITEM                                                  QTY           AMOUNT", true);
  add(rule);
  sale.items.forEach((item) => {
    const nameLines = wrap(item.name, 49);
    const qty = String(item.quantity).padStart(5);
    const price = money(item.lineTotal).padStart(19);
    add(nameLines[0].padEnd(49) + qty + price);
    nameLines.slice(1).forEach((name) => add(name));
  });
  add(rule);
  pair("Subtotal", money(sale.subtotal));
  pair("Discount", money(sale.discount));
  pair("TOTAL PAID", money(sale.total));
  add(rule);
  add(test ? "TEST RECEIPT ONLY - DO NOT RELEASE REAL GOODS." : "Thank you for your purchase.", true);

  const blob = createPdf(lines);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "kassa-receipt-" + sale.reference.replace(/[^a-zA-Z0-9_-]/g, "-") + ".pdf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
