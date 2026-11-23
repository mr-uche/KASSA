import { kassaPost } from "@/lib/kassa-client";

export type ExportSection = "transactions" | "productsInventory" | "customers" |
  "staff" | "branches" | "reportsAnalytics";
export type ExportDateRange = "ALL" | "LAST_30_DAYS" | "LAST_90_DAYS" | "THIS_YEAR";
export type ExportFormat = "CSV" | "XLSX" | "PDF";
type Cell = string | number | boolean | null;
type Dataset = { key: string; title: string; columns: string[]; rows: Cell[][] };
export type BusinessExport = {
  businessId: string;
  generatedAt: string;
  dateRange: ExportDateRange;
  includesPersonalData: boolean;
  datasets: Dataset[];
};

export function getBusinessExport(businessId: string, sections: ExportSection[], dateRange: ExportDateRange) {
  return kassaPost<BusinessExport>(
    "/api/businesses/" + encodeURIComponent(businessId) + "/export",
    { sections, dateRange },
  );
}

// CSV fields are always quoted and protected against spreadsheet formula injection.
function csvCell(value: Cell): string {
  let text = value == null ? "" : String(value);
  if (/^\s*[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
function csvContent(data: BusinessExport): string {
  const lines = [
    [ "Kassa business export", data.businessId ],
    [ "Generated (UTC)", data.generatedAt ],
    [ "Range", data.dateRange ],
  ].map((row) => row.map(csvCell).join(","));
  for (const dataset of data.datasets) {
    lines.push("", [dataset.title].map(csvCell).join(","),
      dataset.columns.map(csvCell).join(","));
    for (const row of dataset.rows) lines.push(row.map(csvCell).join(","));
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

const enc = new TextEncoder();
function bytes(text: string): Uint8Array { return enc.encode(text); }
function put16(view: DataView, offset: number, n: number) { view.setUint16(offset, n, true); }
function put32(view: DataView, offset: number, n: number) { view.setUint32(offset, n >>> 0, true); }
function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
// An uncompressed standards-compliant ZIP (OpenXML container), no external libraries.
function zipStore(files: Array<{ name: string; content: string }>): Uint8Array {
  const locals: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0, centralLength = 0;
  for (const file of files) {
    const name = bytes(file.name), content = bytes(file.content);
    const checksum = crc32(content);
    const local = new Uint8Array(30 + name.length + content.length);
    const lview = new DataView(local.buffer);
    put32(lview, 0, 0x04034b50); put16(lview, 4, 20);
    put32(lview, 14, checksum); put32(lview, 18, content.length); put32(lview, 22, content.length);
    put16(lview, 26, name.length); local.set(name, 30);
    local.set(content, 30 + name.length);

    const cd = new Uint8Array(46 + name.length);
    const dview = new DataView(cd.buffer);
    put32(dview, 0, 0x02014b50); put16(dview, 4, 20); put16(dview, 6, 20);
    put32(dview, 16, checksum); put32(dview, 20, content.length); put32(dview, 24, content.length);
    put16(dview, 28, name.length); put32(dview, 42, offset); cd.set(name, 46);
    locals.push(local); central.push(cd); offset += local.length; centralLength += cd.length;
  }
  const end = new Uint8Array(22), eview = new DataView(end.buffer);
  put32(eview, 0, 0x06054b50); put16(eview, 8, files.length);
  put16(eview, 10, files.length); put32(eview, 12, centralLength);
  put32(eview, 16, offset);
  const out = new Uint8Array(offset + centralLength + end.length);
  let index = 0;
  for (const local of locals) { out.set(local, index); index += local.length; }
  for (const cd of central) { out.set(cd, index); index += cd.length; }
  out.set(end, index);
  return out;
}
function xmlEscape(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function columnName(index: number): string {
  let n = index + 1, result = "";
  while (n) { n--; result = String.fromCharCode(65 + n % 26) + result; n = Math.floor(n / 26); }
  return result;
}
function sheetXml(rows: Cell[][]): string {
  const sheetRows = rows.map((row, ri) => {
    const cells = row.map((cell, ci) => {
      const ref = columnName(ci) + (ri + 1);
      // Inline strings deliberately prevent Excel executing imported formulas.
      return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' +
        xmlEscape(cell == null ? "" : String(cell)) + '</t></is></c>';
    }).join("");
    return '<row r="' + (ri + 1) + '">' + cells + '</row>';
  }).join("");
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    sheetRows + '</sheetData></worksheet>';
}
function xlsxContent(data: BusinessExport): Uint8Array {
  const sheets = data.datasets.length ? data.datasets :
    [{ key: 'empty', title: 'No records', columns: ['Info'], rows: [['No records']] }];
  const types = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    sheets.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) +
      '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("") +
    '</Types>';
  const rootRels = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const wb = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    sheets.map((sheet, i) =>
      '<sheet name="' + xmlEscape(sheet.title.slice(0, 31).replace(/[\\/:*?\[\]]/g, " ")) +
      '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join("") +
    '</sheets></workbook>';
  const workbookRels = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets.map((_, i) => '<Relationship Id="rId' + (i + 1) +
      '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' +
      (i + 1) + '.xml"/>').join("") + '</Relationships>';
  const files = [
    { name: '[Content_Types].xml', content: types },
    { name: '_rels/.rels', content: rootRels },
    { name: 'xl/workbook.xml', content: wb },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRels },
    ...sheets.map((sheet, i) => ({
      name: 'xl/worksheets/sheet' + (i + 1) + '.xml',
      content: sheetXml([sheet.columns, ...sheet.rows]),
    })),
  ];
  return zipStore(files);
}

function pdfSafe(text: string): string {
  return text.normalize("NFKD").replace(/[^\x20-\x7e]/g, "?")
    .replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}
function pdfContent(data: BusinessExport): Uint8Array {
  const lines: string[] = [
    "Kassa - Business data export",
    "Generated (UTC): " + data.generatedAt,
    "Date range: " + data.dateRange,
  ];
  for (const dataset of data.datasets) {
    lines.push("", "=== " + dataset.title.toUpperCase() + " ===");
    if (!dataset.rows.length) lines.push("No records in this section.");
    for (const row of dataset.rows) {
      const cells = row.map((cell, i) =>
        dataset.columns[i] + ": " + (cell == null ? "" : String(cell)));
      const raw = cells.join(" | ");
      for (let i = 0; i < raw.length; i += 105) lines.push(raw.slice(i, i + 105));
      lines.push("");
    }
  }
  // Plain-text accessible PDF; multiple pages, no external PDF library.
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += 55) chunks.push(lines.slice(i, i + 55));
  if (!chunks.length) chunks.push(["No records"]);
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [" + chunks.map((_, i) => (4 + 2 * i) + " 0 R").join(" ") +
      "] /Count " + chunks.length + " >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  for (const page of chunks) {
    const pageNum = objects.length + 1, streamNum = pageNum + 1;
    const stream = "BT /F1 8 Tf 32 790 Td 12 TL\n" +
      page.map((line) => "(" + pdfSafe(line) + ") Tj T*").join("\n") +
      "\nET\n";
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 3 0 R >> >> /Contents " + streamNum + " 0 R >>");
    objects.push("<< /Length " + bytes(stream).length + " >>\nstream\n" + stream + "endstream");
  }
  let content = "%PDF-1.4\n", offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(bytes(content).length);
    content += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const start = bytes(content).length;
  content += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) content += String(offset).padStart(10, "0") + " 00000 n \n";
  content += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\n" +
    "startxref\n" + start + "\n%%EOF";
  return bytes(content);
}

export function downloadBusinessExport(data: BusinessExport, format: ExportFormat): void {
  const date = new Date(data.generatedAt).toISOString().slice(0, 10);
  const filename = "kassa-business-export-" + date + "." + format.toLowerCase();
  let blob: Blob;
  if (format === "CSV") {
    blob = new Blob([csvContent(data)], { type: "text/csv;charset=utf-8" });
  } else if (format === "XLSX") {
    blob = new Blob([new Uint8Array(xlsxContent(data)).buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } else {
    blob = new Blob([new Uint8Array(pdfContent(data)).buffer], { type: "application/pdf" });
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.append(link);
  link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
