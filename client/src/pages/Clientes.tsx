import { trpc } from "@/lib/trpc";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Eye,
  Printer,
  Loader2,
  X,
  ChevronLeft,
  Copy,
  MapPin,
  Bell,
  Upload,
  Download,
  Send,
  PenLine,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useSearch } from "wouter";

// ─── Types ───────────────────────────────────────────────────────────────────

type Cliente = {
  id: number;
  nombre: string;
  esAgencia: number;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  codigoPostal: string | null;
  email: string | null;
  telefono: string | null;
  contactoPrincipal: string | null;
  notas: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ContratoItem = {
  id?: number;
  cantidad: number;
  concepto: string;
  precioPorUnidad: string;
  total: string;
  isProduccion?: number; // 1 = production cost, not multiplied by months
};

type ExhibitARow = {
  localizacion: string;
  cobertizo: string;
  direccion: string;
  iop: string;
  producto: string;
  fb: string;
};

type Contrato = {
  id: number;
  clienteId: number;
  numeroContrato: string;
  numeroPO: string | null;
  fecha: Date;
  customerId: string | null;
  salesDuration: string | null;
  vendedor: string | null;
  metodoPago: string | null;
  fechaVencimiento: Date | null;
  subtotal: string | null;
  total: string | null;
  notas: string | null;
  pdfUrl: string | null;
  numMeses: number | null;
  poDocumentUrl: string | null;
  estado: "Borrador" | "Enviado" | "Firmado" | "Cancelado";
  docusealSubmissionId: number | null;
  docusealSigningUrl: string | null;
  firmaUrl: string | null;
  createdAt: Date;
  items?: ContratoItem[];
  exhibitA?: ExhibitARow[];
};

// ─── PDF Generator ───────────────────────────────────────────────────────────

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png";

function fmtDate(d: Date | null | string) {
  if (!d) return "__ / __ / __";
  const dt = new Date(d);
  // Use UTC methods to avoid timezone offset shifting the date by one day
  // when the value is a date-only string like "2025-04-28" (parsed as UTC midnight)
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const yy = String(dt.getUTCFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

function parseAmount(s: string): number {
  const raw = (s || "").replace(/[^0-9.]/g, "");
  return raw ? parseFloat(raw) : 0;
}

function calcSubtotalWithMonths(items: ContratoItem[], numMeses: number): number {
  let sum = 0;
  for (const item of items) {
    const lineTotal = parseAmount(item.total);
    if (lineTotal > 0) {
      // Production costs are NOT multiplied by months
      sum += item.isProduccion ? lineTotal : lineTotal * numMeses;
    }
  }
  return sum;
}

function calcRawTotal(items: ContratoItem[]): number {
  let sum = 0;
  for (const item of items) {
    sum += parseAmount(item.total);
  }
  return sum;
}

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateContractHTML(contrato: Contrato, cliente: Cliente, exhibitA: ExhibitARow[]) {
  const items = contrato.items || [];
  const numMeses = contrato.numMeses && contrato.numMeses > 1 ? contrato.numMeses : 1;
  const computedSubtotal = calcSubtotalWithMonths(items, numMeses);
  const subtotalStr = contrato.subtotal || (computedSubtotal > 0 ? fmtMoney(computedSubtotal) : "");
  const totalStr = contrato.total || subtotalStr;
  const vendedor = contrato.vendedor || "____________";

  // Build item rows
  const itemRowsHtml = items.map(item => {
    const lineTotal = parseAmount(item.total);
    const displayTotal = item.isProduccion
      ? (item.total || "")
      : (lineTotal > 0 && numMeses > 1 ? fmtMoney(lineTotal * numMeses) : (item.total || ""));
    return `
    <tr>
      <td style="padding:10px 8px;border:1px solid #ccc;text-align:center;font-size:13px;">${item.cantidad}</td>
      <td style="padding:10px 8px;border:1px solid #ccc;font-size:13px;">${item.concepto}${item.isProduccion ? ' <span style="font-size:10px;color:#888;">(producción)</span>' : ""}</td>
      <td style="padding:10px 8px;border:1px solid #ccc;text-align:right;font-size:13px;">${item.precioPorUnidad || ""}</td>
      <td style="padding:10px 8px;border:1px solid #ccc;text-align:right;font-size:13px;font-weight:600;">${displayTotal}</td>
    </tr>`;
  }).join("");

  const emptyRows = Math.max(0, 3 - items.length);
  const emptyRowsHtml = Array(emptyRows).fill(`
    <tr>
      <td style="padding:18px 8px;border:1px solid #ccc;"></td>
      <td style="padding:18px 8px;border:1px solid #ccc;"></td>
      <td style="padding:18px 8px;border:1px solid #ccc;"></td>
      <td style="padding:18px 8px;border:1px solid #ccc;"></td>
    </tr>`).join("");

  // Exhibit A rows
  let exhibitRowsHtml = "";
  let lastLoc = "";
  for (const row of exhibitA) {
    const locCell = row.localizacion !== lastLoc
      ? `<td style="padding:7px 8px;border:1px solid #ccc;font-weight:700;font-size:12px;background:#f5f5f5;">${row.localizacion}</td>`
      : `<td style="padding:7px 8px;border:1px solid #ccc;background:#f5f5f5;"></td>`;
    lastLoc = row.localizacion;
    exhibitRowsHtml += `
    <tr>
      ${locCell}
      <td style="padding:7px 8px;border:1px solid #ccc;font-size:12px;text-align:center;">${row.cobertizo}</td>
      <td style="padding:7px 8px;border:1px solid #ccc;font-size:12px;">${row.direccion}</td>
      <td style="padding:7px 8px;border:1px solid #ccc;font-size:12px;text-align:center;">${row.iop || ""}</td>
      <td style="padding:7px 8px;border:1px solid #ccc;font-size:12px;">${row.producto || ""}</td>
      <td style="padding:7px 8px;border:1px solid #ccc;font-size:12px;text-align:center;">${row.fb || ""}</td>
    </tr>`;
  }
  if (!exhibitRowsHtml) {
    exhibitRowsHtml = `<tr><td colspan="6" style="padding:20px;text-align:center;color:#999;font-size:12px;border:1px solid #ccc;">No hay localizaciones en el Exhibit A</td></tr>`;
  }

  const clientAddr = [cliente.direccion, cliente.ciudad, (cliente.estado ? cliente.estado + " " : "") + (cliente.codigoPostal || "")]
    .filter(Boolean).join(", ");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; background: white; }
  .page { width: 816px; min-height: 1056px; margin: 0 auto; padding: 48px 52px; position: relative; }
  .page-break { page-break-before: always; }
  /* ── Header stripe ── */
  .top-stripe { height: 6px; background: linear-gradient(90deg, #1a4d3c 60%, #ff6b35 80%, #ffd700 100%); margin-bottom: 28px; }
  .bottom-stripe { height: 6px; background: linear-gradient(90deg, #1a4d3c 60%, #ff6b35 80%, #ffd700 100%); margin-top: 28px; }
  /* ── Page 1 ── */
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
  .logo-block img { height: 68px; }
  .logo-tagline { font-size: 10px; color: #888; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; text-align: center; }
  .contract-word { font-size: 58px; font-weight: 900; color: #1a1a1a; line-height: 1; letter-spacing: -2px; }
  .contact-block { text-align: right; font-size: 11px; color: #555; margin-top: 6px; line-height: 1.7; }
  .divider { height: 3px; background: linear-gradient(90deg, #1a4d3c, #ff6b35); margin-bottom: 20px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 18px; }
  .for-label { color: #e05a00; font-weight: 800; font-size: 15px; margin-bottom: 3px; }
  .for-name { font-size: 17px; font-weight: 700; }
  .for-addr { font-size: 12px; color: #555; margin-top: 3px; line-height: 1.5; }
  .meta-label { color: #e05a00; font-weight: 700; font-size: 12px; min-width: 130px; display: inline-block; }
  .meta-val { font-size: 13px; font-weight: 600; }
  .meta-row { margin-bottom: 5px; }
  .dur-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .dur-table th { background: #1a4d3c; color: white; padding: 8px 10px; font-size: 11px; text-align: left; letter-spacing: 0.5px; }
  .dur-table td { border: 1px solid #ccc; padding: 10px; font-size: 13px; background: #f9f9f9; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  .items-table th { background: #1a1a1a; color: white; padding: 9px 10px; font-size: 12px; text-align: left; }
  .items-table th:first-child { width: 55px; text-align: center; }
  .items-table th:nth-child(3), .items-table th:nth-child(4) { width: 130px; text-align: right; }
  .items-table td { border: 1px solid #ccc; }
  .items-section { margin-bottom: 16px; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 50px; }
  .totals-tbl { width: 240px; border-collapse: collapse; }
  .totals-tbl td { padding: 7px 12px; font-size: 13px; }
  .totals-tbl .lbl { font-weight: 600; }
  .totals-tbl .amt { text-align: right; background: #d4edda; font-weight: 700; }
  .totals-tbl .total-row td { font-size: 16px; font-weight: 900; background: #c3e6cb; }
  .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 24px; }
  .sig-line { border-top: 2px solid #1a1a1a; padding-top: 6px; font-size: 11px; font-weight: 700; text-align: center; letter-spacing: 0.5px; }
  .footer-note { border-top: 2px solid #1a4d3c; padding-top: 10px; font-size: 9.5px; color: #666; text-align: center; line-height: 1.7; }
  /* ── Page 2 (Legal) ── */
  .legal-title { font-size: 15px; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px; }
  .legal-intro { font-size: 11.5px; line-height: 1.7; margin-bottom: 14px; }
  .legal-party { font-size: 11.5px; line-height: 1.7; margin-bottom: 8px; padding-left: 16px; }
  .legal-whereas { font-size: 11px; line-height: 1.7; margin-bottom: 8px; font-style: italic; }
  .legal-clause { margin-bottom: 10px; }
  .legal-clause-title { font-size: 11.5px; font-weight: 800; text-transform: uppercase; }
  .legal-clause-body { font-size: 11px; line-height: 1.7; margin-top: 2px; }
  .legal-sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 24px; }
  .legal-sig-line { border-top: 1.5px solid #1a1a1a; padding-top: 5px; font-size: 10px; font-weight: 700; }
  /* ── Page 3 (Exhibit A) ── */
  .exhibit-title { font-size: 14px; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
  .exhibit-table { width: 100%; border-collapse: collapse; }
  .exhibit-table th { background: #1a4d3c; color: white; padding: 8px 8px; font-size: 11px; text-align: left; }
  .exhibit-table th:nth-child(2) { text-align: center; }
  .exhibit-table th:nth-child(4), .exhibit-table th:nth-child(6) { text-align: center; }
  @media print {
    @page { size: letter; margin: 40px 48px; }
    @page :first { margin-top: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; }
    .page { margin: 0 auto; padding: 40px 48px; }
    .page-break { page-break-before: always; }
    .top-stripe { height: 6px !important; background: linear-gradient(90deg, #1a4d3c 60%, #ff6b35 80%, #ffd700 100%) !important; display: block !important; -webkit-print-color-adjust: exact !important; }
    .bottom-stripe { height: 6px !important; background: linear-gradient(90deg, #1a4d3c 60%, #ff6b35 80%, #ffd700 100%) !important; display: block !important; -webkit-print-color-adjust: exact !important; }
    .divider { height: 3px !important; background: linear-gradient(90deg, #1a4d3c, #ff6b35) !important; display: block !important; -webkit-print-color-adjust: exact !important; }
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════ PAGE 1 ══ -->
<div class="page">
  <div class="top-stripe"></div>

  <div class="header-row">
    <div class="logo-block">
      <img src="${LOGO_URL}" alt="Streetview Media" />
      <div class="logo-tagline">Tu Marca en el Camino</div>
    </div>
    <div style="text-align:right;">
      <div class="contract-word">CONTRACT</div>
      <div class="contact-block">
        787-708-5115<br>
        www.streetviewmedia.com<br>
        info@streetviewmedia.com
      </div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="info-grid">
    <div>
      <div class="for-label">FOR:</div>
      <div class="for-name">${cliente.nombre}</div>
      ${clientAddr ? `<div class="for-addr">${clientAddr}</div>` : ""}

    </div>
    <div>
      <div class="meta-row"><span class="meta-label">CONTRACT #:</span> <span class="meta-val">${contrato.numeroContrato}</span></div>
      ${contrato.numeroPO ? `<div class="meta-row"><span class="meta-label">PO #:</span> <span class="meta-val">${contrato.numeroPO}</span></div>` : ""}
      <div class="meta-row"><span class="meta-label">DATE:</span> <span class="meta-val">${fmtDate(contrato.fecha)}</span></div>
      ${contrato.customerId ? `<div class="meta-row"><span class="meta-label">CUSTOMER ID:</span> <span class="meta-val">${contrato.customerId}</span></div>` : ""}
      ${contrato.vendedor ? `<div class="meta-row"><span class="meta-label">SALES REP:</span> <span class="meta-val">${contrato.vendedor}</span></div>` : ""}
    </div>
  </div>

  <table class="dur-table">
    <thead>
      <tr>
        <th>SALES DURATION</th>
        <th>PAYMENT METHOD</th>
        <th>DUE DATE</th>
        ${numMeses > 1 ? `<th>CONTRACT MONTHS</th>` : ""}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${contrato.salesDuration || ""}</td>
        <td>${contrato.metodoPago || "ACH / Wire Transfer"}</td>
        <td>${fmtDate(contrato.fechaVencimiento)}</td>
        ${numMeses > 1 ? `<td style="text-align:center;font-weight:700;">${numMeses} months</td>` : ""}
      </tr>
    </tbody>
  </table>

  <div class="items-section">
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align:center;">QNTY</th>
          <th>CONCEPT</th>
          <th style="text-align:right;">PRICE PER UNIT</th>
          <th style="text-align:right;">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
        ${emptyRowsHtml}
      </tbody>
    </table>
  </div>

  <div class="totals-wrap">
    <table class="totals-tbl">
      <tr>
        <td class="lbl">SUBTOTAL${numMeses > 1 ? ` (×${numMeses} mo.)` : ""}</td>
        <td class="amt">${subtotalStr}</td>
      </tr>
      <tr>
        <td style="padding:7px 12px;font-size:11px;color:#888;">Tax / IVU</td>
        <td class="amt" style="background:#e8f5e9;font-size:11px;color:#888;">Exempt</td>
      </tr>
      <tr class="total-row">
        <td class="lbl">TOTAL</td>
        <td class="amt">${totalStr}</td>
      </tr>
    </table>
  </div>

  <div class="sigs">
    <div>
      <div class="sig-line">AUTHORIZED SIGNATURE / DATE</div>
    </div>
    <div>
      <div class="sig-line">CLIENT SIGNATURE / DATE</div>
    </div>
  </div>

  <div class="bottom-stripe"></div>

  <div class="footer-note">
    Require Puerto Rico, Inc. d/b/a Street View Media &nbsp;|&nbsp; PO Box 194000 San Juan, PR 00919 &nbsp;|&nbsp; 787-708-5115 &nbsp;|&nbsp; www.streetviewmedia.com<br>
    This contract is subject to the terms and conditions on the reverse side.
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════ PAGE 2 ══ -->
<div class="page page-break">
  <div class="top-stripe"></div>

  <div class="legal-title">Advertising Space Agreement – Bus Shelters</div>

  <div class="legal-intro">
    This Advertising Space Agreement ("Agreement") is entered into as of ${fmtDate(contrato.fecha)}, by and between:
  </div>

  <div class="legal-party">
    <strong>COMPANY:</strong> Require Puerto Rico, Inc., a Puerto Rico corporation, doing business as Street View Media ("Company"), represented by <strong>${vendedor}</strong>.
  </div>
  <div class="legal-party">
    <strong>CUSTOMER:</strong> ${cliente.nombre} ("Customer").
  </div>

  <div class="legal-whereas">
    WHEREAS, Company manages advertising space on bus shelters located throughout the metropolitan area of San Juan, Puerto Rico; and<br>
    WHEREAS, Customer desires to advertise on certain bus shelter panels managed by Company;
  </div>

  <div class="legal-intro">
    NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:
  </div>

  <div class="legal-clause">
    <div class="legal-clause-title">1. Services</div>
    <div class="legal-clause-body">Company agrees to provide Customer with advertising space on bus shelter panels ("Shelters") as specified in the contract summary and Exhibit A attached hereto ("Services"). The specific locations, dimensions, and quantities of advertising panels are detailed in Exhibit A.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">2. Contract Term</div>
    <div class="legal-clause-body">The Services shall commence on the start date specified in the Sales Duration field and continue for the term indicated therein ("Contract Term"), unless earlier terminated in accordance with the terms of this Agreement.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">3. Fees and Payment</div>
    <div class="legal-clause-body">Customer shall pay Company the total amount specified in this Agreement. Payment is due by the Due Date indicated. Invoices not paid within thirty (30) days of the due date shall accrue interest at the rate of 1.5% per month. All fees are exclusive of applicable taxes.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">4. Creative Materials</div>
    <div class="legal-clause-body">If Customer provides the creative materials, it shall be delivered with at least twenty-four (24) hours prior to commencement for electronic shelters, and five (5) days prior for static shelters. Failure to timely deliver materials shall not delay billing or the Contract Term.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">5. Operation</div>
    <div class="legal-clause-body">Company shall make reasonable efforts to maintain the operation of the shelters. Interruptions exceeding seven (7) consecutive days may result in credits, extensions or alternative placements at Company's discretion.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">6. Arrears</div>
    <div class="legal-clause-body">Failure to pay by the due date constitutes a material breach. Company may remove advertising materials, terminate Services, and pursue collection of all amounts due, including reasonable attorneys' fees and costs.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">7. Liability and Indemnification</div>
    <div class="legal-clause-body">Company shall be responsible only for damages caused by its gross negligence or willful misconduct, limited to amounts actually paid under this Agreement. Customer shall indemnify and hold Company harmless from any claims arising from advertising content, including intellectual property claims.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">8. Insurance</div>
    <div class="legal-clause-body">Company shall maintain commercial general liability insurance with limits of not less than $1,000,000 per occurrence and aggregate.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">9. Force Majeure</div>
    <div class="legal-clause-body">Neither party shall be liable for delays or interruptions due to events beyond reasonable control. Credits for interrupted Services shall be calculated on a pro rata basis where applicable.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">10. Obsolescence or Removal</div>
    <div class="legal-clause-body">If a shelter becomes unavailable due to governmental action, infrastructure changes or other similar causes, Company may provide alternative locations or credits without liability.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">11. Objectionable Material</div>
    <div class="legal-clause-body">Company reserves the right, at its sole and absolute discretion, to reject, suspend, remove or require modification of any advertising material that violates laws, municipal regulations, third-party rights, industry standards, or contractual obligations with the Municipality of San Juan, or that may expose Company to legal, regulatory or reputational risk. Such actions shall not constitute a breach of this Agreement nor entitle Customer to cancellation, refund or credit, except at Company's discretion. Customer shall indemnify Company against any claims arising from the content of advertising materials.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">12. Non-Cancellation</div>
    <div class="legal-clause-body">This Agreement is non-cancelable by Customer prior to expiration of the Contract Term. Failure to use the contracted space or delivery delays of creative materials shall not relieve Customer of payment obligations. In the event of attempted early cancellation, Company may demand immediate payment of the remaining contract balance.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">13. Assignment</div>
    <div class="legal-clause-body">Company may assign or transfer this Agreement to an affiliate or successor. Customer may not assign without prior written consent.</div>
  </div>
  <div class="legal-clause">
    <div class="legal-clause-title">14. Governing Law and Jurisdiction</div>
    <div class="legal-clause-body">This Agreement shall be governed by the laws of the Commonwealth of Puerto Rico. Venue shall lie exclusively in the courts of Puerto Rico.</div>
  </div>

  <div class="legal-intro" style="margin-top:16px;">
    <strong>IN WITNESS WHEREOF,</strong> the parties execute this Agreement as of the date written below.
  </div>

  <div class="legal-sig-grid">
    <div>
      <div style="font-size:11px;font-weight:700;margin-bottom:4px;">COMPANY:</div>
      <div style="font-size:10.5px;color:#555;margin-bottom:28px;">Require Puerto Rico, Inc. d/b/a Street View Media</div>
      <div class="legal-sig-line">By: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date: __________</div>
      <div style="font-size:10px;margin-top:4px;color:#555;">Name: ${vendedor}</div>
    </div>
    <div>
      <div style="font-size:11px;font-weight:700;margin-bottom:4px;">CUSTOMER:</div>
      <div style="font-size:10.5px;color:#555;margin-bottom:28px;">${cliente.nombre}</div>
      <div class="legal-sig-line">By: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date: __________</div>
      <div style="font-size:10px;margin-top:4px;color:#555;">Name / Title: ___________________________</div>
    </div>
  </div>

  <div class="bottom-stripe" style="margin-top:24px;"></div>
</div>

<!-- ═══════════════════════════════════════════════════════════ PAGE 3 ══ -->
<div class="page page-break">
  <div class="top-stripe"></div>

  <div class="exhibit-title">Exhibit A – Advertising Locations</div>
  <div style="text-align:center;font-size:12px;color:#555;margin-bottom:16px;">
    Contract #${contrato.numeroContrato} &nbsp;|&nbsp; ${cliente.nombre} &nbsp;|&nbsp; ${fmtDate(contrato.fecha)}
  </div>

  <table class="exhibit-table">
    <thead>
      <tr>
        <th style="width:28%;">LOCALIZATION</th>
        <th style="width:10%;text-align:center;">SHELTER #</th>
        <th style="width:28%;">ADDRESS</th>
        <th style="width:8%;text-align:center;">I/O/P</th>
        <th style="width:18%;">PRODUCT</th>
        <th style="width:8%;text-align:center;">F/B</th>
      </tr>
    </thead>
    <tbody>
      ${exhibitRowsHtml}
    </tbody>
  </table>

  <div class="bottom-stripe" style="margin-top:24px;"></div>
</div>

</body>
</html>`;
}

// ─── Estado Badge ─────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Borrador: "bg-gray-100 text-gray-700",
    Enviado: "bg-blue-100 text-blue-700",
    Firmado: "bg-green-100 text-green-700",
    Cancelado: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[estado] || "bg-gray-100 text-gray-700"}`}>
      {estado}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Clientes() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: clientes = [], isLoading } = trpc.clientes.list.useQuery();
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: isAuthenticated });

  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const [search, setSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [showContratoForm, setShowContratoForm] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [duplicatingContrato, setDuplicatingContrato] = useState<Contrato | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [urlHandled, setUrlHandled] = useState(false);
  const [signingContrato, setSigningContrato] = useState<Contrato | null>(null);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [generatingSignPdf, setGeneratingSignPdf] = useState(false);

  // Auto-open modals based on URL params (from Calendar shortcuts)
  useEffect(() => {
    if (urlHandled || isLoading || clientes.length === 0) return;
    const newContrato = urlParams.get("newContrato");
    const newCliente = urlParams.get("newCliente");
    const clienteParam = urlParams.get("cliente") || urlParams.get("nombre") || "";
    if (newCliente === "1") {
      setShowClienteForm(true);
      setUrlHandled(true);
    } else if (newContrato === "1") {
      // Find matching client or open new contract form
      const match = clientes.find(c => c.nombre.toLowerCase() === clienteParam.toLowerCase());
      if (match) {
        setSelectedCliente(match);
        setView("detail");
        setShowContratoForm(true);
      } else {
        setShowContratoForm(true);
      }
      setUrlHandled(true);
    }
  }, [urlHandled, isLoading, clientes]);

  const createCliente = trpc.clientes.create.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cliente creado"); setShowClienteForm(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateCliente = trpc.clientes.update.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cliente actualizado"); setShowClienteForm(false); setEditingCliente(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCliente = trpc.clientes.delete.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cliente eliminado"); setSelectedCliente(null); setView("list"); },
    onError: (e) => toast.error(e.message),
  });
  const createContrato = trpc.contratos.create.useMutation({
    onSuccess: () => { if (selectedCliente) utils.contratos.list.invalidate({ clienteId: selectedCliente.id }); toast.success("Contrato creado"); setShowContratoForm(false); setDuplicatingContrato(null); },
    onError: (e) => toast.error(e.message),
  });
  const updateContrato = trpc.contratos.update.useMutation({
    onSuccess: () => { if (selectedCliente) utils.contratos.list.invalidate({ clienteId: selectedCliente.id }); toast.success("Contrato actualizado"); setShowContratoForm(false); setEditingContrato(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteContrato = trpc.contratos.delete.useMutation({
    onSuccess: () => { if (selectedCliente) utils.contratos.list.invalidate({ clienteId: selectedCliente.id }); toast.success("Contrato eliminado"); },
    onError: (e) => toast.error(e.message),
  });
  const saveExhibitA = trpc.contratos.saveExhibitA.useMutation();
  const sendForSigning = trpc.contratos.sendForSigning.useMutation({
    onSuccess: (data) => {
      if (selectedCliente) utils.contratos.list.invalidate({ clienteId: selectedCliente.id });
      toast.success("Contrato enviado para firma electrónica");
      setSigningContrato(null);
      setSignerEmail("");
      setSignerName("");
    },
    onError: (e) => toast.error(e.message),
  });
  const savePdfUrl = trpc.contratos.savePdfUrl.useMutation({
    onSuccess: () => { if (selectedCliente) utils.contratos.list.invalidate({ clienteId: selectedCliente.id }); },
  });

  const filtered = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.contactoPrincipal || "").toLowerCase().includes(search.toLowerCase())
  );

  const { data: contratos = [] } = trpc.contratos.list.useQuery(
    { clienteId: selectedCliente?.id },
    { enabled: !!selectedCliente }
  );

  const handleSelectCliente = (c: Cliente) => { setSelectedCliente(c); setView("detail"); };

  const handlePrintContract = async (contrato: Contrato) => {
    if (!selectedCliente) return;
    // Always fetch fresh items from server — the list query may not include items
    const [fullContrato, exhibitRows] = await Promise.all([
      utils.contratos.getById.fetch({ id: contrato.id }),
      utils.contratos.getExhibitA.fetch({ contratoId: contrato.id }),
    ]);
    const contratoWithItems: Contrato = { ...contrato, items: (fullContrato?.items || []) as ContratoItem[] };
    const html = generateContractHTML(contratoWithItems, selectedCliente, exhibitRows as ExhibitARow[]);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  const handlePreviewContract = async (contrato: Contrato) => {
    if (!selectedCliente) return;
    // Always fetch fresh items from server — the list query may not include items
    const [fullContrato, exhibitRows] = await Promise.all([
      utils.contratos.getById.fetch({ id: contrato.id }),
      utils.contratos.getExhibitA.fetch({ contratoId: contrato.id }),
    ]);
    const contratoWithItems: Contrato = { ...contrato, items: (fullContrato?.items || []) as ContratoItem[] };
    const html = generateContractHTML(contratoWithItems, selectedCliente, exhibitRows as ExhibitARow[]);
    setPreviewHtml(html);
  };

  const handleDuplicate = (contrato: Contrato) => {
    setDuplicatingContrato(contrato);
    setEditingContrato(null);
    setShowContratoForm(true);
  };

  // Generate PDF from contract HTML and upload to server, returning the public URL
  const handleGenerateAndUploadPdf = async (contrato: Contrato): Promise<string | null> => {
    if (!selectedCliente) return null;
    setGeneratingSignPdf(true);
    try {
      const [fullContrato, exhibitRows] = await Promise.all([
        utils.contratos.getById.fetch({ id: contrato.id }),
        utils.contratos.getExhibitA.fetch({ contratoId: contrato.id }),
      ]);
      const contratoWithItems: Contrato = { ...contrato, items: (fullContrato?.items || []) as ContratoItem[] };
      const html = generateContractHTML(contratoWithItems, selectedCliente, exhibitRows as ExhibitARow[]);

      // Use print-to-PDF via a hidden iframe approach:
      // Create a Blob from the HTML and upload it
      const htmlBlob = new Blob([html], { type: "text/html" });
      const formData = new FormData();
      formData.append("file", htmlBlob, `contrato-${contrato.numeroContrato}.html`);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      // Save the URL to the contract
      await savePdfUrl.mutateAsync({ id: contrato.id, pdfUrl: data.url });
      return data.url;
    } catch (err) {
      console.error("[PDF Upload] Error:", err);
      toast.error("Error al generar el PDF del contrato");
      return null;
    } finally {
      setGeneratingSignPdf(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        {/* Header — same as Admin.tsx */}
        <nav className="hidden lg:block bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
          <div className="container flex items-center justify-between h-20">
            <Link href="/">
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png"
                alt="Streetview Media"
                className="h-12 cursor-pointer"
              />
            </Link>
            {user?.role === "admin" && (
              <div className="relative">
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#ff6b35] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </nav>

        <main className="p-6 overflow-auto">
          {view === "list" ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-display text-3xl text-[#1a4d3c] font-bold">Clientes</h1>
                  <p className="text-body text-gray-500 mt-1">Gestión de clientes y contratos</p>
                </div>
                <Button className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white" onClick={() => { setEditingCliente(null); setShowClienteForm(true); }}>
                  <Plus size={16} className="mr-2" /> Nuevo Cliente
                </Button>
              </div>

              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input className="pl-9" placeholder="Buscar por nombre, email o contacto..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#1a4d3c]" size={32} /></div>
              ) : (
                <div className="bg-white rounded-xl border overflow-x-auto shadow-sm">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-[#1a4d3c] text-white">
                      <tr>
                        <th className="p-3 text-left">Cliente</th>
                        <th className="p-3 text-left">Tipo</th>
                        <th className="p-3 text-left">Contacto</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">Teléfono</th>
                        <th className="p-3 w-28"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">No hay clientes</td></tr>
                      ) : filtered.map((c) => (
                        <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectCliente(c as Cliente)}>
                          <td className="p-3 font-semibold text-[#1a4d3c]">{c.nombre}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.esAgencia ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                              {c.esAgencia ? "Agencia" : "Directo"}
                            </span>
                          </td>
                          <td className="p-3 text-gray-600">{c.contactoPrincipal || "—"}</td>
                          <td className="p-3 text-gray-600">{c.email || "—"}</td>
                          <td className="p-3 text-gray-600">{c.telefono || "—"}</td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingCliente(c as Cliente); setShowClienteForm(true); }}>
                                <Edit size={13} />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400" onClick={() => { if (confirm(`¿Eliminar ${c.nombre}?`)) deleteCliente.mutate({ id: c.id }); }}>
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Detail view */}
              <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="sm" onClick={() => setView("list")}>
                  <ChevronLeft size={16} className="mr-1" /> Clientes
                </Button>
                <span className="text-gray-400">/</span>
                <h1 className="text-display text-2xl text-[#1a4d3c] font-bold">{selectedCliente?.nombre}</h1>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingCliente(selectedCliente); setShowClienteForm(true); }}>
                    <Edit size={14} className="mr-1" /> Editar Cliente
                  </Button>
                  <Button className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white" size="sm" onClick={() => { setEditingContrato(null); setDuplicatingContrato(null); setShowContratoForm(true); }}>
                    <Plus size={14} className="mr-1" /> Nuevo Contrato
                  </Button>
                </div>
              </div>

              {/* Client info card */}
              <div className="bg-white rounded-xl border p-5 mb-6 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><div className="text-gray-400 text-xs uppercase font-semibold mb-1">Tipo</div><div>{selectedCliente?.esAgencia ? "Agencia" : "Directo"}</div></div>
                <div><div className="text-gray-400 text-xs uppercase font-semibold mb-1">Contacto</div><div>{selectedCliente?.contactoPrincipal || "—"}</div></div>
                <div><div className="text-gray-400 text-xs uppercase font-semibold mb-1">Email Facturación</div><div className={selectedCliente?.email ? "" : "text-orange-500 italic"}>{selectedCliente?.email || "Pendiente"}</div></div>
                <div><div className="text-gray-400 text-xs uppercase font-semibold mb-1">Teléfono</div><div>{selectedCliente?.telefono || "—"}</div></div>
                {selectedCliente?.direccion && <div className="col-span-2"><div className="text-gray-400 text-xs uppercase font-semibold mb-1">Dirección</div><div>{[selectedCliente.direccion, selectedCliente.ciudad, selectedCliente.estado].filter(Boolean).join(", ")}</div></div>}
                {selectedCliente?.notas && <div className="col-span-2 md:col-span-4"><div className="text-gray-400 text-xs uppercase font-semibold mb-1">Notas</div><div className="text-gray-600">{selectedCliente.notas}</div></div>}
              </div>

              {/* Contracts list */}
              <h2 className="text-lg font-bold text-[#1a4d3c] mb-3">Contratos</h2>
              {contratos.length === 0 ? (
                <div className="bg-white rounded-xl border p-10 text-center text-gray-400 shadow-sm">
                  <FileText size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No hay contratos para este cliente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contratos.map((c) => (
                    <ContratoCard
                      key={c.id}
                      contrato={c as Contrato}
                      onEdit={() => { setEditingContrato(c as Contrato); setDuplicatingContrato(null); setShowContratoForm(true); }}
                      onDelete={() => { if (confirm("¿Eliminar este contrato?")) deleteContrato.mutate({ id: c.id }); }}
                      onPrint={() => handlePrintContract(c as Contrato)}
                      onPreview={() => handlePreviewContract(c as Contrato)}
                      onDuplicate={() => handleDuplicate(c as Contrato)}
                      onSendForSigning={() => {
                        setSigningContrato(c as Contrato);
                        setSignerEmail(selectedCliente?.email || "");
                        setSignerName(selectedCliente?.contactoPrincipal || selectedCliente?.nombre || "");
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Client Form Dialog */}
      {showClienteForm && (
        <ClienteFormDialog
          open={showClienteForm}
          onClose={() => { setShowClienteForm(false); setEditingCliente(null); }}
          cliente={editingCliente}
          onSave={(data) => {
            if (editingCliente) updateCliente.mutate({ id: editingCliente.id, ...data });
            else createCliente.mutate(data);
          }}
          saving={createCliente.isPending || updateCliente.isPending}
        />
      )}

      {/* Contract Form Dialog */}
      {showContratoForm && selectedCliente && (
        <ContratoFormDialog
          open={showContratoForm}
          onClose={() => { setShowContratoForm(false); setEditingContrato(null); setDuplicatingContrato(null); }}
          contrato={editingContrato}
          duplicateFrom={duplicatingContrato}
          clienteId={selectedCliente.id}
          clienteNombre={selectedCliente.nombre}
          onSave={(data, exhibitARows) => {
            if (editingContrato) {
              updateContrato.mutate({ id: editingContrato.id, ...data }, {
                onSuccess: async () => {
                  await saveExhibitA.mutateAsync({ contratoId: editingContrato.id, rows: exhibitARows });
                }
              });
            } else {
              createContrato.mutate(data, {
                onSuccess: async (result) => {
                  if (result?.id) {
                    await saveExhibitA.mutateAsync({ contratoId: result.id, rows: exhibitARows });
                  }
                }
              });
            }
          }}
          saving={createContrato.isPending || updateContrato.isPending}
        />
      )}

      {/* Send for Signature Dialog */}
      {signingContrato && (
        <Dialog open={!!signingContrato} onOpenChange={(open) => { if (!open && !sendForSigning.isPending && !generatingSignPdf) { setSigningContrato(null); setSignerEmail(""); setSignerName(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenLine size={18} className="text-[#1a4d3c]" />
                Enviar para Firma Electrónica
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-semibold">{signingContrato.numeroContrato}</p>
                <p className="text-xs text-blue-600 mt-1">Se enviará un email al firmante con un enlace para firmar el contrato electrónicamente vía DocuSeal.</p>
              </div>
              {signingContrato.pdfUrl ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  <span>Documento listo para firma</span>
                  <a href={signingContrato.pdfUrl} target="_blank" rel="noreferrer" className="text-green-600 underline text-xs ml-auto flex items-center gap-1">
                    <ExternalLink size={10} /> Ver
                  </a>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-semibold mb-2">⚠️ Sin documento generado</p>
                  <p className="text-xs mb-3">El contrato necesita un documento para que el cliente pueda firmarlo.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-400 text-amber-800 hover:bg-amber-100"
                    disabled={generatingSignPdf}
                    onClick={async () => {
                      const url = await handleGenerateAndUploadPdf(signingContrato);
                      if (url) {
                        setSigningContrato(prev => prev ? { ...prev, pdfUrl: url } : null);
                        toast.success("Documento generado correctamente");
                      }
                    }}
                  >
                    {generatingSignPdf ? (
                      <><Loader2 size={12} className="mr-1 animate-spin" /> Generando...</>
                    ) : (
                      <><FileText size={12} className="mr-1" /> Generar Documento del Contrato</>
                    )}
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="signerName">Nombre del Firmante</Label>
                <Input
                  id="signerName"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nombre completo del firmante"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signerEmail">Email del Firmante</Label>
                <Input
                  id="signerEmail"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" disabled={sendForSigning.isPending || generatingSignPdf} onClick={() => { setSigningContrato(null); setSignerEmail(""); setSignerName(""); }}>
                Cancelar
              </Button>
              <Button
                className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white"
                disabled={!signerEmail || !signerName || sendForSigning.isPending || generatingSignPdf || !signingContrato.pdfUrl}
                onClick={async () => {
                  if (!signingContrato) return;
                  let pdfUrl = signingContrato.pdfUrl;
                  if (!pdfUrl) {
                    pdfUrl = await handleGenerateAndUploadPdf(signingContrato);
                    if (!pdfUrl) return;
                  }
                  sendForSigning.mutate({
                    contratoId: signingContrato.id,
                    signerEmail,
                    signerName,
                  });
                }}
              >
                {sendForSigning.isPending ? (
                  <><Loader2 size={14} className="mr-1 animate-spin" /> Enviando...</>
                ) : (
                  <><Send size={14} className="mr-1" /> Enviar para Firma</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* PDF Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-[#1a4d3c]">Vista Previa del Contrato</h3>
              <div className="flex gap-2">
                <Button size="sm" className="bg-[#1a4d3c] text-white" onClick={() => {
                  const win = window.open("", "_blank");
                  if (!win) return;
                  win.document.write(previewHtml);
                  win.document.close();
                  win.focus();
                  setTimeout(() => win.print(), 600);
                }}>
                  <Printer size={14} className="mr-1" /> Imprimir / Guardar PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPreviewHtml(null)}>
                  <X size={14} />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <iframe srcDoc={previewHtml} className="w-full h-full min-h-[600px] border-0" title="Contract Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contrato Card ─────────────────────────────────────────────────────────────

function ContratoCard({ contrato, onEdit, onDelete, onPrint, onPreview, onDuplicate, onSendForSigning }: {
  contrato: Contrato;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onSendForSigning: () => void;
}) {
  const numMeses = contrato.numMeses && contrato.numMeses > 1 ? contrato.numMeses : 1;
  const rawTotal = contrato.items ? calcRawTotal(contrato.items) : 0;
  const computedTotal = contrato.items ? calcSubtotalWithMonths(contrato.items, numMeses) : 0;
  const displayTotal = contrato.total || contrato.subtotal || (computedTotal > 0 ? fmtMoney(computedTotal) : (rawTotal > 0 ? fmtMoney(rawTotal) : "—"));
  const isSigned = contrato.estado === "Firmado";
  const isSent = contrato.estado === "Enviado";
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 bg-[#1a4d3c]/10 rounded-lg flex items-center justify-center mt-0.5">
          <FileText size={16} className="text-[#1a4d3c]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#1a4d3c] text-sm">{contrato.numeroContrato}</span>
            {contrato.numeroPO && <span className="text-xs text-gray-400">PO: {contrato.numeroPO}</span>}
            {numMeses > 1 && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{numMeses} meses</span>}
            <EstadoBadge estado={contrato.estado} />
            {contrato.poDocumentUrl && (
              <a href={contrato.poDocumentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                <Download size={10} /> PO
              </a>
            )}
            {isSigned && contrato.firmaUrl && (
              <a href={contrato.firmaUrl} target="_blank" rel="noreferrer" className="text-xs text-green-600 underline flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                <CheckCircle2 size={10} /> Firmado
              </a>
            )}
            {isSent && contrato.docusealSigningUrl && (
              <a href={contrato.docusealSigningUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                <ExternalLink size={10} /> Ver firma
              </a>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 flex gap-3 flex-wrap">
            <span>{new Date(contrato.fecha).toLocaleDateString("es-PR")}</span>
            {contrato.customerId && <span>{contrato.customerId}</span>}
            {contrato.salesDuration && <span>{contrato.salesDuration}</span>}
            <span className="font-semibold text-[#1a4d3c]">{displayTotal}</span>
          </div>
          {/* Action buttons - wrap to two rows on mobile */}
          <div className="flex flex-wrap gap-1 mt-2">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onPreview} title="Vista previa">
              <Eye size={12} className="mr-1" /> Ver
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onPrint} title="Imprimir / PDF">
              <Printer size={12} className="mr-1" /> PDF
            </Button>
            {!isSigned && (
              <Button
                size="sm"
                variant="ghost"
                className={`h-7 px-2 text-xs ${isSent ? 'text-blue-600 hover:text-blue-700' : 'text-[#1a4d3c] hover:text-[#1a4d3c]'}`}
                onClick={onSendForSigning}
                title={isSent ? "Reenviar para firma" : "Enviar para firma electrónica"}
              >
                <PenLine size={12} className="mr-1" /> {isSent ? "Reenviar" : "Enviar para Firma"}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onDuplicate} title="Duplicar contrato">
              <Copy size={12} className="mr-1" /> Duplicar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit} title="Editar"><Edit size={12} /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400" onClick={onDelete} title="Eliminar"><Trash2 size={12} /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cliente Form Dialog ──────────────────────────────────────────────────────

function ClienteFormDialog({ open, onClose, cliente, onSave, saving }: {
  open: boolean; onClose: () => void; cliente: Cliente | null; onSave: (data: any) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    nombre: cliente?.nombre || "",
    esAgencia: cliente?.esAgencia ?? 0,
    direccion: cliente?.direccion || "",
    ciudad: cliente?.ciudad || "",
    estado: cliente?.estado || "PR",
    codigoPostal: cliente?.codigoPostal || "",
    email: cliente?.email || "",
    telefono: cliente?.telefono || "",
    contactoPrincipal: cliente?.contactoPrincipal || "",
    notas: cliente?.notas || "",
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{cliente ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nombre *</Label><Input value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="ARCO, Badillo Comms..." /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={String(form.esAgencia)} onValueChange={v => set("esAgencia", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Cliente Directo</SelectItem>
                  <SelectItem value="1">Agencia de Publicidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Teléfono</Label><Input value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="787-000-0000" /></div>
            <div className="col-span-2"><Label>Email de Facturación</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="billing@empresa.com" /></div>
            <div className="col-span-2"><Label>Contacto Principal</Label><Input value={form.contactoPrincipal} onChange={e => set("contactoPrincipal", e.target.value)} /></div>
            <div className="col-span-2"><Label>Dirección</Label><Input value={form.direccion} onChange={e => set("direccion", e.target.value)} /></div>
            <div><Label>Ciudad</Label><Input value={form.ciudad} onChange={e => set("ciudad", e.target.value)} placeholder="San Juan" /></div>
            <div><Label>Código Postal</Label><Input value={form.codigoPostal} onChange={e => set("codigoPostal", e.target.value)} placeholder="00926" /></div>
            <div className="col-span-2"><Label>Notas</Label><Textarea value={form.notas} onChange={e => set("notas", e.target.value)} rows={2} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white" onClick={() => {
            if (!form.nombre.trim()) { toast.error("El nombre es requerido"); return; }
            onSave({ ...form, email: form.email || null, telefono: form.telefono || null, direccion: form.direccion || null, ciudad: form.ciudad || null, estado: form.estado || null, codigoPostal: form.codigoPostal || null, contactoPrincipal: form.contactoPrincipal || null, notas: form.notas || null });
          }} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            {cliente ? "Guardar" : "Crear Cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Contrato Form Dialog ─────────────────────────────────────────────────────

function ContratoFormDialog({ open, onClose, contrato, duplicateFrom, clienteId, clienteNombre, onSave, saving }: {
  open: boolean; onClose: () => void; contrato: Contrato | null; duplicateFrom: Contrato | null;
  clienteId: number; clienteNombre: string; onSave: (data: any, exhibitA: ExhibitARow[]) => void; saving: boolean;
}) {
  const source = contrato || duplicateFrom;
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    numeroContrato: duplicateFrom ? `${duplicateFrom.numeroContrato}-copia` : (contrato?.numeroContrato || "2026-"),
    numeroPO: source?.numeroPO || "",
    fecha: source?.fecha ? new Date(source.fecha).toISOString().split("T")[0] : today,
    fechaVencimiento: source?.fechaVencimiento ? new Date(source.fechaVencimiento).toISOString().split("T")[0] : "",
    customerId: source?.customerId || "",
    salesDuration: source?.salesDuration || "",
    vendedor: source?.vendedor || "",
    metodoPago: source?.metodoPago || "ACH / Wire Transfer",
    numMeses: source?.numMeses ?? 1,
    subtotal: source?.subtotal || "",
    total: source?.total || "",
    notas: source?.notas || "",
    estado: ((duplicateFrom ? "Borrador" : source?.estado) || "Borrador") as "Borrador" | "Enviado" | "Firmado" | "Cancelado",
    items: (source?.items || [{ cantidad: 1, concepto: "", precioPorUnidad: "", total: "", isProduccion: 0 }]) as ContratoItem[],
  });

  const [exhibitA, setExhibitA] = useState<ExhibitARow[]>([]);
  const [activeTab, setActiveTab] = useState<"contrato" | "exhibit">("contrato");
  const [loadingExhibit, setLoadingExhibit] = useState(false);
  const [uploadingPO, setUploadingPO] = useState(false);
  const [poDocumentUrl, setPoDocumentUrl] = useState<string>(source?.poDocumentUrl || "");
  const utils = trpc.useUtils();

  // Reinitialize form when contrato/duplicateFrom changes (e.g. opening a different contract to edit)
  useEffect(() => {
    if (!open) return;
    setForm({
      numeroContrato: duplicateFrom ? `${duplicateFrom.numeroContrato}-copia` : (contrato?.numeroContrato || "2026-"),
      numeroPO: source?.numeroPO || "",
      fecha: source?.fecha ? new Date(source.fecha).toISOString().split("T")[0] : today,
      fechaVencimiento: source?.fechaVencimiento ? new Date(source.fechaVencimiento).toISOString().split("T")[0] : "",
      customerId: source?.customerId || "",
      salesDuration: source?.salesDuration || "",
      vendedor: source?.vendedor || "",
      metodoPago: source?.metodoPago || "ACH / Wire Transfer",
      numMeses: source?.numMeses ?? 1,
      subtotal: source?.subtotal || "",
      total: source?.total || "",
      notas: source?.notas || "",
      estado: ((duplicateFrom ? "Borrador" : source?.estado) || "Borrador") as "Borrador" | "Enviado" | "Firmado" | "Cancelado",
      items: (source?.items && source.items.length > 0
        ? source.items
        : [{ cantidad: 1, concepto: "", precioPorUnidad: "", total: "", isProduccion: 0 }]) as ContratoItem[],
    });
    setPoDocumentUrl(source?.poDocumentUrl || "");
    setActiveTab("contrato");
  }, [open, contrato?.id, duplicateFrom?.id]);

  // Load exhibit A when editing or duplicating
  useEffect(() => {
    if (!source?.id) return;
    setLoadingExhibit(true);
    utils.contratos.getExhibitA.fetch({ contratoId: source.id }).then((rows) => {
      setExhibitA((rows as ExhibitARow[]).map(r => ({ localizacion: r.localizacion, cobertizo: r.cobertizo, direccion: r.direccion, iop: r.iop || "", producto: r.producto || "", fb: r.fb || "" })));
    }).finally(() => setLoadingExhibit(false));
  }, [source?.id]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { cantidad: 1, concepto: "", precioPorUnidad: "", total: "", isProduccion: 0 }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const updateItem = (i: number, field: keyof ContratoItem, value: any) => {
    setForm(f => {
      const items = f.items.map((item, idx) => {
        if (idx !== i) return item;
        const updated = { ...item, [field]: value };
        // Auto-calc line total when cantidad or precioPorUnidad changes
        if (field === "cantidad" || field === "precioPorUnidad") {
          const qty = field === "cantidad" ? Number(value) : item.cantidad;
          const priceRaw = (field === "precioPorUnidad" ? String(value) : item.precioPorUnidad).replace(/[^0-9.]/g, "");
          const price = parseFloat(priceRaw);
          if (!isNaN(price) && price > 0) {
            updated.total = fmtMoney(qty * price);
          }
        }
        return updated;
      });
      return { ...f, items };
    });
  };

  const numMeses = form.numMeses && form.numMeses > 0 ? form.numMeses : 1;

  const autoSubtotal = () => {
    const n = calcSubtotalWithMonths(form.items, numMeses);
    return n > 0 ? fmtMoney(n) : "";
  };

  // Exhibit A helpers
  const addExhibitRow = () => setExhibitA(rows => [...rows, { localizacion: "", cobertizo: "", direccion: "", iop: "", producto: "", fb: "" }]);
  const removeExhibitRow = (i: number) => setExhibitA(rows => rows.filter((_, idx) => idx !== i));
  const updateExhibitRow = (i: number, field: keyof ExhibitARow, value: string) =>
    setExhibitA(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  // Import Exhibit A from Anuncios
  const importFromAnuncios = async () => {
    try {
      const results = await utils.contratos.getAnunciosByCliente.fetch({ clienteNombre });
      if (!results || results.length === 0) {
        toast.info("No se encontraron anuncios activos para este cliente");
        return;
      }
      const rows: ExhibitARow[] = results.map((r: any) => ({
        localizacion: r.localizacion || "",
        cobertizo: r.cobertizoId || "",
        direccion: r.direccion || "",
        iop: r.orientacion || "",
        producto: r.producto || "",
        fb: "",
      }));
      setExhibitA(rows);
      toast.success(`${rows.length} localizaciones importadas desde Anuncios`);
    } catch {
      toast.error("Error al importar anuncios");
    }
  };

  // Upload PO document
  const handlePOUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPO(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPoDocumentUrl(data.url);
      toast.success("Documento PO subido correctamente");
    } catch {
      toast.error("Error al subir el documento PO");
    } finally {
      setUploadingPO(false);
    }
  };

  const handleSubmit = () => {
    if (!form.numeroContrato.trim()) { toast.error("El número de contrato es requerido"); return; }
    const subtotal = form.subtotal || autoSubtotal();
    const total = form.total || subtotal;
    onSave({
      clienteId,
      ...form,
      fecha: new Date(form.fecha),
      fechaVencimiento: form.fechaVencimiento ? new Date(form.fechaVencimiento) : null,
      subtotal: subtotal || null,
      total: total || null,
      numeroPO: form.numeroPO || null,
      customerId: form.customerId || null,
      salesDuration: form.salesDuration || null,
      vendedor: form.vendedor || null,
      notas: form.notas || null,
      numMeses: form.numMeses || 1,
      poDocumentUrl: poDocumentUrl || null,
      items: form.items.filter(i => i.concepto.trim()),
    }, exhibitA.filter(r => r.cobertizo.trim() || r.localizacion.trim()));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {duplicateFrom ? `Duplicar Contrato: ${duplicateFrom.numeroContrato}` : contrato ? "Editar Contrato" : "Nuevo Contrato"}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b mb-4">
          <button className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "contrato" ? "border-[#1a4d3c] text-[#1a4d3c]" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTab("contrato")}>
            Contrato
          </button>
          <button className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${activeTab === "exhibit" ? "border-[#1a4d3c] text-[#1a4d3c]" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTab("exhibit")}>
            <MapPin size={13} /> Exhibit A
            {exhibitA.length > 0 && <span className="ml-1 bg-[#1a4d3c] text-white text-xs rounded-full px-1.5">{exhibitA.length}</span>}
          </button>
        </div>

        {activeTab === "contrato" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Número de Contrato *</Label><Input value={form.numeroContrato} onChange={e => set("numeroContrato", e.target.value)} placeholder="2026-1" /></div>
              <div><Label>Número PO (si aplica)</Label><Input value={form.numeroPO} onChange={e => set("numeroPO", e.target.value)} placeholder="161400" /></div>
              <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} /></div>
              <div><Label>Due Date (Fecha de Vencimiento)</Label><Input type="date" value={form.fechaVencimiento} onChange={e => set("fechaVencimiento", e.target.value)} /></div>
              <div><Label>Customer ID (Marca)</Label><Input value={form.customerId} onChange={e => set("customerId", e.target.value)} placeholder="Taco Bell, CLARO..." /></div>
              <div><Label>Duración de Ventas</Label><Input value={form.salesDuration} onChange={e => set("salesDuration", e.target.value)} placeholder="February 2026 - November 2026" /></div>
              <div><Label>Vendedor(es)</Label><Input value={form.vendedor} onChange={e => set("vendedor", e.target.value)} placeholder="Carmen Esteve" /></div>
              <div><Label>Método de Pago</Label><Input value={form.metodoPago} onChange={e => set("metodoPago", e.target.value)} placeholder="ACH / Wire Transfer" /></div>
              <div>
                <Label>Meses del Contrato</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.numMeses}
                  onChange={e => set("numMeses", Number(e.target.value))}
                  placeholder="1"
                />
                <p className="text-xs text-gray-400 mt-1">Multiplica el total de cada línea (excepto producción) × meses</p>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => set("estado", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Borrador">Borrador</SelectItem>
                    <SelectItem value="Enviado">Enviado</SelectItem>
                    <SelectItem value="Firmado">Firmado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* PO Document Upload */}
            <div>
              <Label>Documento Orden de Compra (PO)</Label>
              <div className="flex items-center gap-3 mt-1">
                {poDocumentUrl ? (
                  <div className="flex items-center gap-2 flex-1">
                    <a href={poDocumentUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline truncate flex-1">
                      Ver documento PO
                    </a>
                    <Button size="sm" variant="ghost" className="text-red-400 h-7 px-2" onClick={() => setPoDocumentUrl("")}>
                      <X size={12} />
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    {uploadingPO ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploadingPO ? "Subiendo..." : "Subir documento PO (PDF, imagen)"}
                    <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handlePOUpload} disabled={uploadingPO} />
                  </label>
                )}
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Líneas del Contrato</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus size={13} className="mr-1" /> Añadir Línea</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left w-16">Cant.</th>
                      <th className="p-2 text-left">Concepto</th>
                      <th className="p-2 text-left w-28">Precio/Unidad</th>
                      <th className="p-2 text-left w-28">Total línea</th>
                      <th className="p-2 text-center w-20 text-xs">Producción</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={i} className={`border-t ${item.isProduccion ? "bg-amber-50" : ""}`}>
                        <td className="p-1">
                          <Input type="number" value={item.cantidad} onChange={e => updateItem(i, "cantidad", Number(e.target.value))} className="h-8 text-center" min={1} />
                        </td>
                        <td className="p-1">
                          <Input value={item.concepto} onChange={e => updateItem(i, "concepto", e.target.value)} className="h-8" placeholder="Descripción..." />
                        </td>
                        <td className="p-1">
                          <Input value={item.precioPorUnidad} onChange={e => updateItem(i, "precioPorUnidad", e.target.value)} className="h-8" placeholder="$300.00" />
                        </td>
                        <td className="p-1">
                          <Input value={item.total} onChange={e => updateItem(i, "total", e.target.value)} className="h-8 font-medium" placeholder="$2,400.00" />
                        </td>
                        <td className="p-1 text-center">
                          <input
                            type="checkbox"
                            checked={!!item.isProduccion}
                            onChange={e => updateItem(i, "isProduccion", e.target.checked ? 1 : 0)}
                            title="Costo de producción (no se multiplica por meses)"
                            className="w-4 h-4 accent-[#ff6b35]"
                          />
                        </td>
                        <td className="p-1">
                          {form.items.length > 1 && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400" onClick={() => removeItem(i)}><X size={12} /></Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-2 gap-6 text-sm pr-2">
                {numMeses > 1 && (
                  <span className="text-orange-600 font-medium">×{numMeses} meses</span>
                )}
                <span className="text-gray-500">Subtotal automático: <strong className="text-[#1a4d3c]">{autoSubtotal() || "—"}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Subtotal (sobreescribe auto)</Label><Input value={form.subtotal} onChange={e => set("subtotal", e.target.value)} placeholder={autoSubtotal() || "$24,000.00"} /></div>
              <div><Label>Total (sobreescribe auto)</Label><Input value={form.total} onChange={e => set("total", e.target.value)} placeholder={autoSubtotal() || "$24,000.00"} /></div>
            </div>
            <div><Label>Notas Internas</Label><Textarea value={form.notas} onChange={e => set("notas", e.target.value)} rows={2} /></div>
          </div>
        ) : (
          /* Exhibit A tab */
          <div>
            <div className="flex items-center justify-end gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={importFromAnuncios}>
                <Download size={13} className="mr-1" /> Importar desde Anuncios
              </Button>
              <Button size="sm" variant="outline" onClick={addExhibitRow}><Plus size={13} className="mr-1" /> Añadir Fila</Button>
            </div>
            {loadingExhibit ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#1a4d3c]" size={24} /></div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#1a4d3c] text-white">
                    <tr>
                      <th className="p-2 text-left">Localización</th>
                      <th className="p-2 text-left w-20">#Cob.</th>
                      <th className="p-2 text-left">Dirección</th>
                      <th className="p-2 text-left w-14">I/O/P</th>
                      <th className="p-2 text-left">Producto</th>
                      <th className="p-2 text-left w-12">F/B</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {exhibitA.length === 0 ? (
                      <tr><td colSpan={7} className="p-6 text-center text-gray-400">No hay filas. Haz clic en "Añadir Fila" o "Importar desde Anuncios".</td></tr>
                    ) : exhibitA.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1"><Input value={row.localizacion} onChange={e => updateExhibitRow(i, "localizacion", e.target.value)} className="h-7 text-xs" placeholder="AVE. MUÑOZ RIVERA" /></td>
                        <td className="p-1"><Input value={row.cobertizo} onChange={e => updateExhibitRow(i, "cobertizo", e.target.value)} className="h-7 text-xs" placeholder="128" /></td>
                        <td className="p-1"><Input value={row.direccion} onChange={e => updateExhibitRow(i, "direccion", e.target.value)} className="h-7 text-xs" placeholder="Dirección..." /></td>
                        <td className="p-1"><Input value={row.iop} onChange={e => updateExhibitRow(i, "iop", e.target.value)} className="h-7 text-xs text-center" placeholder="I" /></td>
                        <td className="p-1"><Input value={row.producto} onChange={e => updateExhibitRow(i, "producto", e.target.value)} className="h-7 text-xs" placeholder="CLARO" /></td>
                        <td className="p-1"><Input value={row.fb} onChange={e => updateExhibitRow(i, "fb", e.target.value)} className="h-7 text-xs text-center" placeholder="F" /></td>
                        <td className="p-1"><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400" onClick={() => removeExhibitRow(i)}><X size={11} /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            {contrato ? "Guardar Cambios" : duplicateFrom ? "Crear Copia" : "Crear Contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
