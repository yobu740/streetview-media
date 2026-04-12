import { getDb } from "./db";
import { anuncios, paradas } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { storagePut } from "./storage";

// ─── PDF Generation via Puppeteer ─────────────────────────────────────────────

/** Render HTML to a PDF buffer using headless Chromium */
async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663148968393/NB4DzLv3DwSWij5HcQ7rQi/streetview-logo-white_ee80e299.png";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a Date or timestamp as DD/MM/YYYY */
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = dt.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Format a number as $X,XXX.XX */
function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Map raw orientacion code to display label */
function orientacionLabel(raw: string): string {
  const map: Record<string, string> = {
    I: "Interior",
    O: "Exterior",
    P: "Posterior",
  };
  return map[raw?.toUpperCase()] ?? raw ?? "";
}

/** Map orientacion code to Caja number */
function cajaLabel(raw: string): string {
  const map: Record<string, string> = { I: "1", O: "2", P: "P" };
  return map[raw?.toUpperCase()] ?? raw ?? "";
}

/** Map tipo enum to full display label */
function tipoLabel(raw: string): string {
  const map: Record<string, string> = {
    Fijo: "Fijo",
    "Bonificación": "Bonificación",
    Holder: "Holder",
  };
  return map[raw] ?? raw ?? "";
}

// ─── Data Types ───────────────────────────────────────────────────────────────

interface InvoiceItem {
  paradaInfo: string;
  orientacion: string;   // raw code: I / O / P
  caja: string;
  producto: string;      // product/campaign name
  periodoInicio: string; // DD/MM/YYYY
  periodoFin: string;
  tipo: string;          // raw: Fijo / Bonificación / Holder
  costo: number;
  descuento: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  clientName: string;
  invoiceTitle: string;       // e.g. "CLARO PR — Marzo 2026"
  periodoContrato: string;    // e.g. "01/03/2026 - 31/03/2026"
  salespersonName: string;
  items: InvoiceItem[];
  subtotalAnuncios: number;
  totalDescuentos: number;
  productionCost: number;
  otherServicesDescription: string;
  otherServicesCost: number;
  finalTotal: number;
  billingPeriodOverride?: string; // e.g. "2026-04" to override the period shown in each row
}

// ─── HTML Generator ───────────────────────────────────────────────────────────

function buildInvoiceHTML(data: InvoiceData): string {
  const {
    invoiceNumber, invoiceDate, clientName, invoiceTitle,
    periodoContrato, salespersonName, items,
    subtotalAnuncios, totalDescuentos, productionCost,
    otherServicesDescription, otherServicesCost, finalTotal,
  } = data;

  const rowsHTML = items.map((item, i) => {
    const isBonif = item.tipo === "Bonificación";
    const tipoClass = isBonif ? 'class="bonif-tipo"' : "";
    const descHTML =
      item.descuento > 0
        ? `<td class="col-desc descuento-val">-${fmtMoney(item.descuento)}</td>`
        : `<td class="col-desc descuento-none">—</td>`;

    return `
      <tr${i % 2 === 1 ? ' style="background:#f5f5f5"' : ""}>
        <td class="col-parada">${item.paradaInfo}</td>
        <td class="col-orient">${orientacionLabel(item.orientacion)}</td>
        <td class="col-caja">${item.caja}</td>
        <td class="col-producto">${item.producto || '—'}</td>
        <td class="col-periodo">${item.periodoInicio} - ${item.periodoFin}</td>
        <td class="col-tipo" ${tipoClass}>${tipoLabel(item.tipo)}</td>
        <td class="col-costo">${fmtMoney(item.costo)}</td>
        ${descHTML}
        <td class="col-total total-cell">${fmtMoney(item.total)}</td>
      </tr>`;
  }).join("\n");

  const totalsHTML = `
    <tr>
      <td class="lbl">Subtotal (Anuncios)</td>
      <td class="amt">${fmtMoney(subtotalAnuncios)}</td>
    </tr>
    ${totalDescuentos > 0 ? `
    <tr>
      <td class="desc-lbl">Descuentos / Bonificaciones</td>
      <td class="desc-amt">${fmtMoney(totalDescuentos)}</td>
    </tr>` : ""}
    ${productionCost > 0 ? `
    <tr>
      <td class="lbl">Costo de Producción</td>
      <td class="amt">${fmtMoney(productionCost)}</td>
    </tr>` : ""}
    ${otherServicesCost > 0 ? `
    <tr>
      <td class="lbl">${otherServicesDescription || "Otros Servicios"}</td>
      <td class="amt">${fmtMoney(otherServicesCost)}</td>
    </tr>` : ""}
    <tr class="totals-divider">
      <td class="grand-lbl">TOTAL</td>
      <td class="grand-amt">${fmtMoney(finalTotal)}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Factura ${invoiceNumber} — Streetview Media</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; font-family: Arial, Helvetica, sans-serif; padding: 0; }
  .page {
    width: 100%;
    min-height: 1056px;
    background: white;
    margin: 0;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .header {
    background: #1a4d3c;
    height: 120px;
    display: flex;
    align-items: center;
    padding: 0 50px;
    position: relative;
    flex-shrink: 0;
    width: 100%;
  }
  .header img { height: 48px; }
  .header-right {
    position: absolute;
    right: 50px;
    top: 14px;
    text-align: right;
    color: white;
    font-size: 9px;
    line-height: 1.75;
  }
  .header-right .label { font-size: 14px; font-weight: 700; letter-spacing: 1px; margin-bottom: 2px; }

  /* ── Address + client ── */
  .address {
    padding: 10px 50px 0;
    font-size: 9px;
    color: #666;
    line-height: 1.6;
  }
  .billed-to {
    padding: 14px 50px 8px;
  }
  .billed-label { font-size: 11px; font-weight: 700; color: #1a4d3c; margin-bottom: 3px; }
  .billed-name  { font-size: 10px; color: #555; }

  /* ── Table ── */
  .invoice-table {
    width: calc(100% - 100px);
    margin: 0 50px;
    border-collapse: collapse;
  }
  .invoice-table thead tr { background: #1a4d3c; }
  .invoice-table thead th {
    color: white;
    font-size: 8px;
    font-weight: 700;
    padding: 8px 5px;
    text-align: left;
    letter-spacing: 0.2px;
    white-space: nowrap;
  }
  .invoice-table thead th.right { text-align: right; }
  .invoice-table tbody td {
    font-size: 8.5px;
    color: #333;
    padding: 6px 5px;
    border-bottom: 1px solid #eee;
    vertical-align: middle;
  }
  .right { text-align: right; }

  /* col widths — 9 columns total */
  .col-parada   { width: 17%; }
  .col-orient   { width: 9%;  }
  .col-caja     { width: 4%;  text-align: center; }
  .col-producto { width: 16%; }
  .col-periodo  { width: 17%; }
  .col-tipo     { width: 9%;  }
  .col-costo    { width: 8%;  text-align: right; }
  .col-desc     { width: 8%;  text-align: right; }
  .col-total    { width: 9%;  text-align: right; font-weight: 700; }

  .descuento-val  { color: #e05a00; font-weight: 600; }
  .descuento-none { color: #bbb; }
  .total-cell     { color: #1a4d3c; font-weight: 700; }
  .bonif-tipo     { color: #e05a00; font-style: italic; }

  /* ── Totals ── */
  .totals-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 20px 50px 0;
  }
  .totals-table { width: 270px; border-collapse: collapse; font-size: 10px; }
  .totals-table td { padding: 5px 8px; }
  .totals-table .lbl { color: #555; }
  .totals-table .amt { text-align: right; font-weight: 600; }
  .totals-table .desc-lbl { color: #ff6b35; font-style: italic; font-size: 9px; font-weight: 600; }
  .totals-table .desc-amt { color: #ff6b35; text-align: right; font-weight: 600; font-style: italic; font-size: 9px; }
  .totals-divider td { border-top: 2px solid #1a4d3c; padding-top: 10px; }
  .totals-table .grand-lbl { font-size: 13px; font-weight: 700; color: #1a4d3c; }
  .totals-table .grand-amt { font-size: 15px; font-weight: 900; color: #1a4d3c; text-align: right; }

  /* ── Footer ── */
  .footer {
    margin: auto 50px 0;
    border-top: 2px solid #1a4d3c;
    padding-top: 14px;
    font-size: 8px;
    color: #555;
    line-height: 1.7;
  }
  .footer-legal {
    margin-bottom: 14px;
    font-style: italic;
    color: #666;
  }
  .footer-contacts {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    margin-top: 10px;
  }
  .footer-block-title {
    font-weight: 700;
    font-size: 8px;
    color: #1a4d3c;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 4px;
  }
  .footer-copy {
    margin-top: 16px;
    text-align: center;
    font-size: 7.5px;
    color: #aaa;
    padding-bottom: 16px;
  }

  /* ── Print Button ── */
  .print-btn-wrap {
    text-align: center;
    padding: 20px 0 10px;
  }
  .print-btn {
    background: #1a4d3c;
    color: white;
    border: none;
    padding: 10px 28px;
    font-size: 13px;
    font-family: Arial, Helvetica, sans-serif;
    font-weight: 700;
    letter-spacing: 0.5px;
    cursor: pointer;
    border-radius: 4px;
  }
  .print-btn:hover { background: #0f3a2a; }

  @media print {
    @page { margin: 0; }
    body { background: white; padding: 0; }
    .page { box-shadow: none; width: 100%; }
    .print-btn-wrap { display: none; }
    .header { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: #1a4d3c !important; }
    .invoice-table thead tr { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: #1a4d3c !important; }
    .invoice-table thead th { color: white !important; }
    .header-right { color: white !important; }
    /* Repeat table header on every page */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    /* Page number counter in footer */
    .footer-copy::after {
      content: ' — Página ' counter(page) ' de ' counter(pages);
    }
  }
  /* Force background colors in print globally */
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <img src="${LOGO_URL}" alt="Streetview Media" onerror="this.style.display='none'">
    <div class="header-right">
      <div class="label">FACTURA</div>
      <div>No. ${invoiceNumber}</div>
      <div>Fecha: ${invoiceDate}</div>
      <div>${invoiceTitle}</div>
      ${periodoContrato ? `<div>Periodo de Contrato: ${periodoContrato}</div>` : ""}
      <div>Vendedor: ${salespersonName || "—"}</div>
    </div>
  </div>

  <!-- Address -->
  <div class="address">
    130 Ave. Winston Churchill<br>PMB 167<br>San Juan, PR 00926
  </div>

  <!-- Billed to -->
  <div class="billed-to">
    <div class="billed-label">FACTURADO A:</div>
    <div class="billed-name">${clientName.toUpperCase()}</div>
  </div>

  <!-- Invoice Table -->
  <table class="invoice-table">
    <thead>
      <tr>
        <th class="col-parada">Parada</th>
        <th class="col-orient">Orientación</th>
        <th class="col-caja">Caras</th>
        <th class="col-producto">Producto</th>
        <th class="col-periodo">Periodo de Facturación</th>
        <th class="col-tipo">Tipo</th>
        <th class="col-costo right">Costo</th>
        <th class="col-desc right">Descuento</th>
        <th class="col-total right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrap">
    <table class="totals-table">
      <tbody>
        ${totalsHTML}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p class="footer-legal">
      El cliente tiene (20) días calendarios, contados a partir del envío de la factura, para presentar cualquier objeción a la misma y solicitar alguna investigación. El cliente deberá efectuar el pago de aquellos cargos y/o parte de la factura que no sean objetados, si alguno, dentro del término establecido por Streetview Media.
    </p>

    <div class="footer-contacts">
      <div>
        <div class="footer-block-title">Contacto Comercial (Ventas)</div>
        Sra. Carmen Esteve<br>
        cesteve@streetviewmediapr.com<br>
        Tel. (787) 708-5115
      </div>
      <div>
        <div class="footer-block-title">Dirección Postal para Pagos</div>
        Street View Media<br>
        130 Ave. Winston Churchill, PMB 167<br>
        San Juan, PR 00926
      </div>
      <div>
        <div class="footer-block-title">Información Bancaria</div>
        Banco: Banco Popular de Puerto Rico<br>
        No. de Cuenta: 118035940<br>
        ABA / Routing: 021502011
      </div>
    </div>

    <div class="footer-copy">
      Require Puerto Rico, Inc. d/b/a Street View Media &nbsp;|&nbsp; www.streetviewmediapr.com
    </div>
  </div>

</div>

<!-- Print / Save as PDF button (hidden when printing) -->
<div class="print-btn-wrap">
  <button class="print-btn" onclick="window.print()">&#128438;&nbsp; Imprimir / Guardar como PDF</button>
</div>

</body>
</html>`;
}

// ─── Core Invoice Builder ─────────────────────────────────────────────────────

async function buildInvoiceData(
  anuncioIds: number[],
  opts: {
    title?: string;
    productionCost?: number;
    otherServicesDescription?: string;
    otherServicesCost?: number;
    salespersonName?: string;
    clienteNombre?: string;
    invoiceNumber?: string;
    billingPeriodStart?: string; // "YYYY-MM" — overrides the period shown in each row
  }
): Promise<{ data: InvoiceData; anuncioCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { inArray } = await import("drizzle-orm");
  const clientAnuncios = await db
    .select()
    .from(anuncios)
    .where(inArray(anuncios.id, anuncioIds));

  const items: InvoiceItem[] = [];
  let subtotalAnuncios = 0;
  let totalDescuentos = 0;

  // Determine billing period from the anuncios themselves (first/last dates)
  let minFechaInicio: Date | null = null;
  let maxFechaFin: Date | null = null;

  for (const anuncio of clientAnuncios) {
    const cost = parseFloat(anuncio.costoPorUnidad || "0");

    const paradaRows = await db
      .select()
      .from(paradas)
      .where(eq(paradas.id, anuncio.paradaId))
      .limit(1);

    const parada = paradaRows[0];
    const paradaInfo = parada
      ? `${parada.cobertizoId} - ${parada.localizacion}`
      : `Parada #${anuncio.paradaId}`;

    const orientacion = parada?.orientacion || "";
    const caja = cajaLabel(orientacion);

    // Dynamic standard price logic:
    // - If cost <= $350: Costo = $350, Descuento = $350 - cost
    // - If cost > $350: Costo = next multiple of $50 above cost,
    //   Descuento = rounded Costo - cost
    // Total always = real contract price (cost), except Bonificación = $0
    const BASE_PRICE = 350;
    let displayCosto: number;
    if (anuncio.tipo === "Bonificación") {
      displayCosto = BASE_PRICE;
    } else if (cost <= BASE_PRICE) {
      displayCosto = BASE_PRICE;
    } else {
      // Round up to next multiple of $50
      displayCosto = Math.ceil(cost / 50) * 50;
    }
    const descuento =
      anuncio.tipo === "Bonificación"
        ? displayCosto
        : Math.max(0, displayCosto - cost);
    const total = anuncio.tipo === "Bonificación" ? 0 : cost;

    const fechaInicio = new Date(anuncio.fechaInicio);
    const fechaFin = new Date(anuncio.fechaFin);

    if (!minFechaInicio || fechaInicio < minFechaInicio) minFechaInicio = fechaInicio;
    if (!maxFechaFin || fechaFin > maxFechaFin) maxFechaFin = fechaFin;

    // Billing period: Option C — use selected month/year but preserve real contract start/end days
    // e.g. contract day=17, selected month=March 2026 → 17/03/2026 - 17/04/2026
    let periodStart: Date;
    let periodEnd: Date;
    if (opts.billingPeriodStart) {
      const [bYear, bMonth] = opts.billingPeriodStart.split("-").map(Number);
      // Keep the real day-of-month from the contract's fechaInicio
      const contractDay = fechaInicio.getUTCDate();
      periodStart = new Date(Date.UTC(bYear, bMonth - 1, contractDay));
      // End date: same day of the NEXT month (Option C: 1 billing month)
      // e.g. day=17, month=March 2026 → 17/03/2026 - 17/04/2026
      const nextMonth = bMonth; // bMonth is 1-based, so bMonth = next month index in UTC
      periodEnd = new Date(Date.UTC(bYear, nextMonth, contractDay));
    } else {
      periodStart = fechaInicio;
      periodEnd = fechaFin;
    }

    items.push({
      paradaInfo,
      orientacion,
      caja,
      producto: anuncio.producto || "",
      periodoInicio: fmtDate(periodStart),
      periodoFin: fmtDate(periodEnd),
      tipo: anuncio.tipo,
      costo: displayCosto, // Always $350 in the Costo column
      descuento,
      total,
    });

    subtotalAnuncios += total; // Subtotal = sum of real charged amounts (Total column)
    totalDescuentos += descuento;
  }

  const clientName = opts.clienteNombre || clientAnuncios[0]?.cliente || "Cliente";
  const productionCost = opts.productionCost ?? 0;
  const otherServicesCost = opts.otherServicesCost ?? 0;
  // Descuentos son informativos — el total NO los resta del subtotal
  const finalTotal = subtotalAnuncios + productionCost + otherServicesCost;

  // Periodo de contrato: from min fechaInicio to max fechaFin of the anuncios
  const periodoContrato =
    minFechaInicio && maxFechaFin
      ? `${fmtDate(minFechaInicio)} - ${fmtDate(maxFechaFin)}`
      : "";

  // Invoice title: "CLIENT — Month YYYY" — use billingPeriodStart override if provided
  let billingMonthStr: string;
  if (opts.billingPeriodStart) {
    const [bYear, bMonth] = opts.billingPeriodStart.split("-").map(Number);
    const refDate = new Date(Date.UTC(bYear, bMonth - 1, 1));
    billingMonthStr = refDate.toLocaleDateString("es-PR", { month: "long", year: "numeric", timeZone: "UTC" });
  } else {
    billingMonthStr = minFechaInicio
      ? minFechaInicio.toLocaleDateString("es-PR", { month: "long", year: "numeric", timeZone: "UTC" })
      : new Date().toLocaleDateString("es-PR", { month: "long", year: "numeric" });
  }
  const capitalizedMonth = billingMonthStr.charAt(0).toUpperCase() + billingMonthStr.slice(1);
  const invoiceTitle = opts.title || `${clientName} — ${capitalizedMonth}`;

  const invoiceDate = new Date().toLocaleDateString("es-PR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  const data: InvoiceData = {
    invoiceNumber: opts.invoiceNumber || "INV-????",
    invoiceDate,
    clientName,
    invoiceTitle,
    periodoContrato,
    salespersonName: opts.salespersonName || "",
    items,
    subtotalAnuncios,
    totalDescuentos,
    productionCost,
    otherServicesDescription: opts.otherServicesDescription || "",
    otherServicesCost,
    finalTotal,
  };

  return { data, anuncioCount: items.length };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateInvoiceFromAnuncios(
  anuncioIds: number[],
  title?: string,
  description?: string,
  productionCost?: number,
  otherServicesDescription?: string,
  otherServicesCost?: number,
  salespersonName?: string,
  clienteNombre?: string,
  billingPeriodStart?: string // "YYYY-MM"
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log("[Invoice] Generating invoice for anuncioIds:", anuncioIds);

  // Generate sequential invoice number
  const { facturas } = await import("../drizzle/schema");
  const lastInvoice = await db
    .select({ numeroFactura: facturas.numeroFactura })
    .from(facturas)
    .orderBy(sql`${facturas.id} DESC`)
    .limit(1);

  let nextNumber = 1000;
  if (lastInvoice.length > 0) {
    const match = lastInvoice[0].numeroFactura.match(/INV-(\d+)/);
    if (match) nextNumber = parseInt(match[1]) + 1;
  }
  const invoiceNumber = `INV-${nextNumber}`;

  const { data, anuncioCount } = await buildInvoiceData(anuncioIds, {
    title,
    productionCost,
    otherServicesDescription,
    otherServicesCost,
    salespersonName,
    clienteNombre,
    invoiceNumber,
    billingPeriodStart,
  });

  const html = buildInvoiceHTML(data);

  const timestamp = Date.now();
  const safeName = data.clientName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "");

  // Generate real PDF binary via Puppeteer
  let pdfBuffer: Buffer;
  let fileName: string;
  let contentType: string;
  try {
    pdfBuffer = await htmlToPdfBuffer(html);
    fileName = `facturas/${invoiceNumber}-${safeName}-${timestamp}.pdf`;
    contentType = "application/pdf";
    console.log("[Invoice] PDF generated via Puppeteer, size:", pdfBuffer.length);
  } catch (pdfErr) {
    console.warn("[Invoice] Puppeteer failed, falling back to HTML:", pdfErr);
    pdfBuffer = Buffer.from(html, "utf-8");
    fileName = `facturas/${invoiceNumber}-${safeName}-${timestamp}.html`;
    contentType = "text/html; charset=utf-8";
  }

  const { url } = await storagePut(fileName, pdfBuffer, contentType);

  await db.insert(facturas).values({
    numeroFactura: invoiceNumber,
    cliente: data.clientName,
    titulo: data.invoiceTitle,
    descripcion: description || null,
    subtotal: data.subtotalAnuncios.toString(),
    costoProduccion: productionCost ? productionCost.toString() : null,
    otrosServiciosDescripcion: otherServicesDescription || null,
    otrosServiciosCosto: otherServicesCost ? otherServicesCost.toString() : null,
    total: data.finalTotal.toString(),
    vendedor: salespersonName || null,
    pdfUrl: url,
    cantidadAnuncios: anuncioCount,
    anuncioIdsJson: JSON.stringify(anuncioIds),
    createdBy: 1,
  });

  console.log("[Invoice] Generated:", invoiceNumber, "→", url);
  return url;
}

export async function regenerateInvoicePDF(facturaId: number, billingPeriodStart?: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { facturas } = await import("../drizzle/schema");
  const rows = await db
    .select()
    .from(facturas)
    .where(eq(facturas.id as any, facturaId))
    .limit(1);
  const factura = rows[0];
  if (!factura) throw new Error("Factura no encontrada");
  if (!factura.anuncioIdsJson)
    throw new Error("Esta factura no tiene anuncios guardados para regenerar");

  const anuncioIds: number[] = JSON.parse(factura.anuncioIdsJson);

  console.log("[Invoice Regen] billingPeriodStart received:", JSON.stringify(billingPeriodStart));

  const { data } = await buildInvoiceData(anuncioIds, {
    title: factura.titulo,
    productionCost: factura.costoProduccion ? parseFloat(factura.costoProduccion) : undefined,
    otherServicesDescription: factura.otrosServiciosDescripcion ?? undefined,
    otherServicesCost: factura.otrosServiciosCosto ? parseFloat(factura.otrosServiciosCosto) : undefined,
    salespersonName: factura.vendedor ?? undefined,
    clienteNombre: factura.cliente,
    invoiceNumber: factura.numeroFactura,
    billingPeriodStart, // "YYYY-MM" if provided by user, otherwise uses anuncio fechaInicio
  });

  const html = buildInvoiceHTML(data);

  const timestamp = Date.now();
  const safeName = factura.cliente.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "");

  // Generate real PDF binary via Puppeteer
  let pdfBuffer: Buffer;
  let fileName: string;
  let contentType: string;
  try {
    pdfBuffer = await htmlToPdfBuffer(html);
    fileName = `facturas/${factura.numeroFactura}-${safeName}-${timestamp}.pdf`;
    contentType = "application/pdf";
    console.log("[Invoice] Regenerated PDF via Puppeteer, size:", pdfBuffer.length);
  } catch (pdfErr) {
    console.warn("[Invoice] Puppeteer failed, falling back to HTML:", pdfErr);
    pdfBuffer = Buffer.from(html, "utf-8");
    fileName = `facturas/${factura.numeroFactura}-${safeName}-${timestamp}.html`;
    contentType = "text/html; charset=utf-8";
  }

  const { url } = await storagePut(fileName, pdfBuffer, contentType);

  await db
    .update(facturas)
    .set({ pdfUrl: url })
    .where(eq(facturas.id as any, facturaId));

  console.log("[Invoice] Regenerated:", factura.numeroFactura, "→", url);
  return url;
}
