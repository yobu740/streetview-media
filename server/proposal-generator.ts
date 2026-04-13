// ─── Proposal PDF Generator ───────────────────────────────────────────────────────────────────────────────
// Generates a professional "Propuesta / Estimado" PDF for the vendor calculator.

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663148968393/NB4DzLv3DwSWij5HcQ7rQi/streetview-logo-white_ee80e299.png";

/** Render HTML to a PDF buffer using headless Chromium.
 *  Always uses puppeteer's own bundled Chrome — ignores PUPPETEER_EXECUTABLE_PATH
 *  to avoid path-not-found errors in production containers.
 */
async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer');

  // Force puppeteer to use its bundled Chrome regardless of any
  // PUPPETEER_EXECUTABLE_PATH environment variable that may be set.
  delete process.env.PUPPETEER_EXECUTABLE_PATH;
  const executablePath = puppeteer.default.executablePath();
  console.log('[PDF] Chrome path:', executablePath);

  const browser = await puppeteer.default.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/** Format a number as $X,XXX.XX */
function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ORI_LABEL: Record<string, string> = { I: "Interior", O: "Exterior", P: "Pilón" };

export interface ProposalParada {
  cobertizoId: string;
  localizacion: string;
  direccion: string;
  orientacion: string;
  tipoFormato: string;
  ruta?: string | null;
  precioMes: number;
}

export interface ProposalData {
  empresa: string;
  contacto: string;
  email: string;
  vendedorName: string;
  fechaInicio: string;   // YYYY-MM-DD or ""
  fechaFin: string;      // YYYY-MM-DD or ""
  meses: number;
  descuento: number;     // amount in dollars
  paradas: ProposalParada[];
  cotizacionNumber: string; // e.g. "COT-2026-001"
}

function fmtDateDisplay(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function buildProposalHTML(data: ProposalData): string {
  const {
    empresa, contacto, email, vendedorName,
    fechaInicio, fechaFin, meses, descuento,
    paradas, cotizacionNumber,
  } = data;

  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  // Validity: 30 days from today
  const validity = new Date(today);
  validity.setDate(validity.getDate() + 30);
  const validityStr = `${String(validity.getDate()).padStart(2, "0")}/${String(validity.getMonth() + 1).padStart(2, "0")}/${validity.getFullYear()}`;

  const subtotalMes = paradas.reduce((s, p) => s + p.precioMes, 0);
  const subtotalTotal = subtotalMes * meses;
  const finalTotal = Math.max(0, subtotalTotal - descuento);

  const rowsHTML = paradas.map((p, i) => `
    <tr${i % 2 === 1 ? ' style="background:#f7f9f7"' : ""}>
      <td class="col-id">#${p.cobertizoId}</td>
      <td class="col-loc">${p.localizacion}</td>
      <td class="col-dir">${p.direccion}</td>
      <td class="col-ori">${ORI_LABEL[p.orientacion] ?? p.orientacion}</td>
      <td class="col-fmt">${p.tipoFormato}</td>
      <td class="col-ruta">${p.ruta ?? "—"}</td>
      <td class="col-price right">${fmtMoney(p.precioMes)}</td>
      <td class="col-total right">${fmtMoney(p.precioMes * meses)}</td>
    </tr>`).join("\n");

  const periodoText = (fechaInicio && fechaFin)
    ? `${fmtDateDisplay(fechaInicio)} – ${fmtDateDisplay(fechaFin)}`
    : `${meses} mes${meses !== 1 ? "es" : ""}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Propuesta ${cotizacionNumber} — Streetview Media</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; font-family: Arial, Helvetica, sans-serif; font-size: 9.5px; color: #222; }
  .page { width: 100%; min-height: 1056px; display: flex; flex-direction: column; }

  /* Header */
  .header {
    background: #1a4d3c;
    height: 150px;
    display: flex;
    align-items: center;
    padding: 0 50px;
    justify-content: space-between;
  }
  .header img { height: 52px; object-fit: contain; }
  .header-right { text-align: right; color: white; }
  .header-right .label {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #ff6b35;
  }
  .header-right div { font-size: 10px; margin-top: 2px; opacity: 0.9; }

  /* Address bar */
  .address {
    background: #f5f5f5;
    padding: 8px 50px;
    font-size: 9px;
    color: #555;
    border-bottom: 1px solid #e0e0e0;
  }

  /* Client info */
  .client-section {
    padding: 18px 50px 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #1a4d3c;
  }
  .client-block {}
  .client-label { font-size: 8.5px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
  .client-name { font-size: 14px; font-weight: 900; color: #1a4d3c; }
  .client-sub { font-size: 9.5px; color: #555; margin-top: 2px; }
  .meta-block { text-align: right; }
  .meta-row { font-size: 9.5px; color: #555; margin-bottom: 2px; }
  .meta-row strong { color: #222; }

  /* Validity banner */
  .validity-banner {
    background: #fff8f0;
    border-left: 4px solid #ff6b35;
    padding: 7px 50px;
    font-size: 9px;
    color: #cc5500;
    font-weight: 600;
  }

  /* Table */
  .proposal-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
    font-size: 9px;
  }
  .proposal-table thead tr {
    background: #1a4d3c;
    color: white;
  }
  .proposal-table thead th {
    padding: 7px 8px;
    text-align: left;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .proposal-table thead th.right { text-align: right; }
  .proposal-table tbody td {
    padding: 6px 8px;
    border-bottom: 1px solid #eee;
    vertical-align: middle;
  }
  .col-id { width: 60px; font-weight: 700; color: #1a4d3c; }
  .col-loc { width: 160px; font-weight: 600; }
  .col-dir { width: 180px; color: #555; }
  .col-ori { width: 65px; }
  .col-fmt { width: 50px; }
  .col-ruta { width: 50px; color: #777; }
  .col-price { width: 80px; }
  .col-total { width: 80px; font-weight: 700; }
  .right { text-align: right; }

  /* Totals */
  .totals-section {
    display: flex;
    justify-content: flex-end;
    padding: 14px 50px 0;
  }
  .totals-table {
    border-collapse: collapse;
    min-width: 260px;
  }
  .totals-table td { padding: 4px 10px; font-size: 9.5px; }
  .totals-table .lbl { color: #555; text-align: right; }
  .totals-table .amt { text-align: right; font-weight: 600; color: #222; }
  .totals-table .desc-lbl { color: #ff6b35; text-align: right; font-weight: 700; }
  .totals-table .desc-amt { color: #ff6b35; text-align: right; font-weight: 700; }
  .totals-table .grand-row td { border-top: 2px solid #1a4d3c; padding-top: 8px; }
  .totals-table .grand-lbl { color: #1a4d3c; font-weight: 900; font-size: 11px; text-align: right; }
  .totals-table .grand-amt { color: #1a4d3c; font-weight: 900; font-size: 14px; text-align: right; }

  /* Period summary */
  .period-bar {
    margin: 14px 50px 0;
    padding: 10px 16px;
    background: #f0f7f4;
    border-radius: 6px;
    border: 1px solid #c8e0d8;
    display: flex;
    gap: 40px;
    font-size: 9.5px;
  }
  .period-item { display: flex; flex-direction: column; gap: 2px; }
  .period-item .pi-label { font-size: 8px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.8px; }
  .period-item .pi-value { font-weight: 700; color: #1a4d3c; font-size: 10.5px; }

  /* Notes */
  .notes {
    margin: 16px 50px 0;
    padding: 10px 16px;
    background: #fafafa;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    font-size: 8.5px;
    color: #666;
    line-height: 1.5;
  }
  .notes strong { color: #333; }

  /* Footer */
  .footer {
    margin-top: auto;
    padding: 16px 50px 20px;
    border-top: 3px solid #1a4d3c;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .footer-left { font-size: 8.5px; color: #666; }
  .footer-left .ft-company { font-weight: 700; color: #1a4d3c; font-size: 10px; margin-bottom: 2px; }
  .footer-right { text-align: right; font-size: 8.5px; color: #999; }

  @media print {
    @page { margin: 40px 0 20px 0; }
    @page :first { margin: 0; }
    body { background: white; }
    .page { box-shadow: none; width: 100%; }
    .header { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: #1a4d3c !important; }
    .proposal-table thead tr { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: #1a4d3c !important; }
    .proposal-table thead th { color: white !important; }
    thead { display: table-header-group; }
    .proposal-table tbody tr { page-break-inside: avoid; }
  }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <img src="${LOGO_URL}" alt="Streetview Media" onerror="this.style.display='none'">
    <div class="header-right">
      <div class="label">PROPUESTA</div>
      <div>No. ${cotizacionNumber}</div>
      <div>Fecha: ${todayStr}</div>
      <div>Vendedor: ${vendedorName || "—"}</div>
    </div>
  </div>

  <!-- Address -->
  <div class="address">
    130 Ave. Winston Churchill &nbsp;|&nbsp; PMB 167 &nbsp;|&nbsp; San Juan, PR 00926 &nbsp;|&nbsp; sales@streetviewmediapr.com &nbsp;|&nbsp; (787) 708-5115
  </div>

  <!-- Client info -->
  <div class="client-section">
    <div class="client-block">
      <div class="client-label">Preparado para:</div>
      <div class="client-name">${empresa || "—"}</div>
      ${contacto ? `<div class="client-sub">${contacto}</div>` : ""}
      ${email ? `<div class="client-sub">${email}</div>` : ""}
    </div>
    <div class="meta-block">
      <div class="meta-row"><strong>Cotización:</strong> ${cotizacionNumber}</div>
      <div class="meta-row"><strong>Fecha:</strong> ${todayStr}</div>
      <div class="meta-row"><strong>Válida hasta:</strong> ${validityStr}</div>
      <div class="meta-row"><strong>Periodo:</strong> ${periodoText}</div>
    </div>
  </div>

  <!-- Validity banner -->
  <div class="validity-banner">
    Esta propuesta es válida por 30 días a partir de la fecha de emisión (${todayStr}). Los precios y disponibilidad están sujetos a cambios.
  </div>

  <!-- Paradas table -->
  <table class="proposal-table">
    <thead>
      <tr>
        <th class="col-id">ID</th>
        <th class="col-loc">Localización</th>
        <th class="col-dir">Dirección</th>
        <th class="col-ori">Orientación</th>
        <th class="col-fmt">Formato</th>
        <th class="col-ruta">Ruta</th>
        <th class="col-price right">$/Mes</th>
        <th class="col-total right">Total (${meses} mes${meses !== 1 ? "es" : ""})</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>

  <!-- Period summary bar -->
  <div class="period-bar">
    <div class="period-item">
      <span class="pi-label">Paradas</span>
      <span class="pi-value">${paradas.length}</span>
    </div>
    <div class="period-item">
      <span class="pi-label">Duración</span>
      <span class="pi-value">${meses} mes${meses !== 1 ? "es" : ""}</span>
    </div>
    ${fechaInicio ? `<div class="period-item">
      <span class="pi-label">Inicio</span>
      <span class="pi-value">${fmtDateDisplay(fechaInicio)}</span>
    </div>` : ""}
    ${fechaFin ? `<div class="period-item">
      <span class="pi-label">Fin</span>
      <span class="pi-value">${fmtDateDisplay(fechaFin)}</span>
    </div>` : ""}
    <div class="period-item">
      <span class="pi-label">Subtotal/Mes</span>
      <span class="pi-value">${fmtMoney(subtotalMes)}</span>
    </div>
  </div>

  <!-- Totals -->
  <div class="totals-section">
    <table class="totals-table">
      <tbody>
        ${descuento > 0 ? `
        <tr>
          <td class="lbl">Precio de Lista (${paradas.length} parada${paradas.length !== 1 ? "s" : ""} × ${meses} mes${meses !== 1 ? "es" : ""})</td>
          <td class="amt">${fmtMoney(subtotalTotal)}</td>
        </tr>
        <tr>
          <td class="desc-lbl">Descuentos / Bonificaciones</td>
          <td class="desc-amt">-${fmtMoney(descuento)}</td>
        </tr>` : `
        <tr>
          <td class="lbl">Subtotal (${paradas.length} parada${paradas.length !== 1 ? "s" : ""} × ${meses} mes${meses !== 1 ? "es" : ""})</td>
          <td class="amt">${fmtMoney(subtotalTotal)}</td>
        </tr>`}
        <tr class="grand-row">
          <td class="grand-lbl">TOTAL</td>
          <td class="grand-amt">${fmtMoney(finalTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Notes -->
  <div class="notes">
    <strong>Notas:</strong> Los precios indicados son por mes por parada. El costo de producción e instalación de materiales no está incluido en esta propuesta y será cotizado por separado.
    Para proceder con la reserva de espacios, se requiere la firma del contrato correspondiente. La disponibilidad de las paradas está sujeta a confirmación al momento de la firma.
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      <div class="ft-company">Require Puerto Rico, Inc. d/b/a Street View Media</div>
      <div>130 Ave. Winston Churchill, PMB 167, San Juan, PR 00926</div>
      <div>sales@streetviewmediapr.com &nbsp;·&nbsp; (787) 708-5115</div>
    </div>
    <div class="footer-right">
      <div>${cotizacionNumber}</div>
      <div>Generado el ${todayStr}</div>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateProposalPdf(data: ProposalData): Promise<{ buffer: Buffer; filename: string }> {
  const html = buildProposalHTML(data);
  const buffer = await htmlToPdfBuffer(html);
  const safeName = (data.empresa || "propuesta").replace(/[^a-zA-Z0-9]/g, "-").toUpperCase();
  const filename = `PROPUESTA-${data.cotizacionNumber}-${safeName}.pdf`;
  return { buffer, filename };
}
