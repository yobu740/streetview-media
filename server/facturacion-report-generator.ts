import PDFDocument from "pdfkit";
import { storagePut } from "./storage";

const LOGO_CDN_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663148968393/NB4DzLv3DwSWij5HcQ7rQi/streetview-logo-white_ee80e299.png";

interface FacturaItem {
  numeroFactura: string;
  cliente: string;
  createdAt: Date | string;
  total: string;
  estadoPago: string;
  fechaPago?: Date | string | null;
  vendedor?: string | null;
  titulo?: string | null;
  cantidadAnuncios?: number | null;
  balance?: number | null; // remaining balance (for partial payments)
}

interface ReportOptions {
  facturas: FacturaItem[];
  titulo?: string;
  filtroDescripcion?: string; // e.g. "Mes: Enero 2025" or "Cliente: ACME Corp"
}

export async function generateFacturacionReportPDF(options: ReportOptions): Promise<string> {
  const { facturas, titulo = "Reporte de Facturación", filtroDescripcion } = options;

  // Compute summary stats
  const totalFacturas = facturas.length;
  const totalMonto = facturas.reduce((s, f) => s + parseFloat(f.total || "0"), 0);
  const pagadas = facturas.filter(f => f.estadoPago === "Pagada");
  const pendientes = facturas.filter(f => f.estadoPago === "Pendiente");
  const vencidas = facturas.filter(f => f.estadoPago === "Vencida");
  const parciales = facturas.filter(f => f.estadoPago === "Pago Parcial");
  const totalPagadas = pagadas.reduce((s, f) => s + parseFloat(f.total || "0"), 0);
  const totalPendientes = pendientes.reduce((s, f) => s + parseFloat(f.total || "0"), 0);
  const totalVencidas = vencidas.reduce((s, f) => s + parseFloat(f.total || "0"), 0);
  // Pago Parcial card: total abonos received
  const totalParcialesAbonos = parciales.reduce((s, f) => {
    const total = parseFloat(f.total || "0");
    const balance = f.balance != null ? f.balance : total;
    return s + (total - balance);
  }, 0);
  // Total balance owed (unpaid + partial remaining)
  const totalBalance = facturas.reduce((s, f) => {
    if (f.estadoPago === "Pagada") return s;
    if (f.balance != null) return s + f.balance;
    return s + parseFloat(f.total || "0");
  }, 0);

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("es-PR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatMoney = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Pre-load logo from CDN before building PDF (fetch must be outside the sync Promise callback)
  let logoBuffer: Buffer | null = null;
  try {
    const logoResponse = await fetch(LOGO_CDN_URL);
    if (logoResponse.ok) {
      logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
    }
  } catch {
    // Will fall back to text in the PDF
  }

  // Build PDF — LANDSCAPE orientation for wider table
  const doc = new PDFDocument({ margin: 50, size: "LETTER", layout: "landscape" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  await new Promise<void>((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);

    const GREEN = "#1a4d3c";
    const ORANGE = "#ff6b35";
    const GRAY = "#666666";
    const LIGHT_GRAY = "#f5f5f5";
    // In landscape Letter: 792pt wide, 612pt tall; margins 50 each side → 692pt usable width
    const pageWidth = doc.page.width - 100;

    // ── Header bar ────────────────────────────────────────────────────────
    doc.rect(50, 50, pageWidth, 70).fill(GREEN);

    // Logo image on the left - use pre-loaded buffer from CDN
    if (logoBuffer) {
      try {
        // Logo is 900x231 px; scale to fit height ~48px inside the green bar
        const logoH = 48;
        const logoW = Math.round(logoH * (900 / 231));
        doc.image(logoBuffer, 60, 57, { width: logoW, height: logoH });
      } catch {
        doc.fillColor("white").font("Helvetica-Bold").fontSize(22).text("STREETVIEW MEDIA", 70, 62);
      }
    } else {
      // Fallback to text if image failed to load
      doc.fillColor("white").font("Helvetica-Bold").fontSize(22).text("STREETVIEW MEDIA", 70, 62);
    }

    // Slogan below logo area
    doc.fillColor("white").font("Helvetica-Oblique").fontSize(9)
      .text("Tu Marca en el Camino", 60, 108);

    // Report title on right
    doc.fillColor("white").font("Helvetica-Bold").fontSize(14)
      .text(titulo, 50, 62, { align: "right", width: pageWidth });
    doc.font("Helvetica").fontSize(10).fillColor("white")
      .text(`Generado: ${formatDate(new Date())}`, 50, 84, { align: "right", width: pageWidth });

    // ── Filter description ──────────────────────────────────────────────────
    let y = 132;
    if (filtroDescripcion) {
      doc.fillColor(GRAY).font("Helvetica-Oblique").fontSize(10)
        .text(`Filtro aplicado: ${filtroDescripcion}`, 50, y);
      y += 20;
    }

    // ── Summary cards (5 cards across the wider landscape page) ─────────────
    const cardW = (pageWidth - 40) / 5;
    const cards = [
      { label: "Total Facturas", count: totalFacturas, amount: totalMonto, color: "#2563eb" },
      { label: "Pagadas", count: pagadas.length, amount: totalPagadas, color: "#16a34a" },
      { label: "Pago Parcial", count: parciales.length, amount: totalParcialesAbonos, color: "#2563eb" },
      { label: "Pendientes", count: pendientes.length, amount: totalPendientes, color: "#d97706" },
      { label: "Vencidas", count: vencidas.length, amount: totalVencidas, color: "#dc2626" },
    ];

    cards.forEach((card, i) => {
      const cx = 50 + i * (cardW + 10);
      doc.rect(cx, y, cardW, 55).fill(LIGHT_GRAY);
      doc.rect(cx, y, 4, 55).fill(card.color);
      doc.fillColor(card.color).font("Helvetica-Bold").fontSize(8)
        .text(card.label.toUpperCase(), cx + 10, y + 7, { width: cardW - 15 });
      doc.fillColor("#111111").font("Helvetica-Bold").fontSize(18)
        .text(String(card.count), cx + 10, y + 20);
      doc.fillColor(GRAY).font("Helvetica").fontSize(8)
        .text(formatMoney(card.amount), cx + 10, y + 40);
    });

    y += 70;

    // ── Table columns — distributed across 692pt landscape width ─────────────
    // No. Factura: 80 | Cliente: 150 | Fecha: 75 | Total: 75 | Balance: 75 | Estado: 80 | Fecha Pago: 80 | Vendedor: remaining
    const cols = [
      { label: "No. Factura", x: 50,  w: 80  },
      { label: "Cliente",     x: 133, w: 150 },
      { label: "Fecha",       x: 286, w: 75  },
      { label: "Total",       x: 364, w: 75  },
      { label: "Balance",     x: 442, w: 75  },
      { label: "Estado",      x: 520, w: 80  },
      { label: "Fecha Pago",  x: 603, w: 80  },
      { label: "Vendedor",    x: 686, w: 56  },
    ];

    // ── Table header ────────────────────────────────────────────────────────
    doc.rect(50, y, pageWidth, 20).fill(GREEN);
    cols.forEach(col => {
      doc.fillColor("white").font("Helvetica-Bold").fontSize(8)
        .text(col.label, col.x + 3, y + 6, { width: col.w, ellipsis: true });
    });
    y += 20;

    // ── Table rows ──────────────────────────────────────────────────────────
    const statusColors: Record<string, string> = {
      Pagada: "#16a34a",
      Pendiente: "#d97706",
      Vencida: "#dc2626",
      "Pago Parcial": "#2563eb",
    };

    const drawTableHeader = (yPos: number) => {
      doc.rect(50, yPos, pageWidth, 20).fill(GREEN);
      cols.forEach(col => {
        doc.fillColor("white").font("Helvetica-Bold").fontSize(8)
          .text(col.label, col.x + 3, yPos + 6, { width: col.w, ellipsis: true });
      });
      return yPos + 20;
    };

    facturas.forEach((f, idx) => {
      // Page break check — landscape height is 612pt
      if (y > doc.page.height - 100) {
        doc.addPage({ layout: "landscape" });
        y = 50;
        y = drawTableHeader(y);
      }

      const rowBg = idx % 2 === 0 ? "white" : LIGHT_GRAY;
      doc.rect(50, y, pageWidth, 18).fill(rowBg);

      const rowY = y + 5;
      doc.fillColor("#111111").font("Helvetica-Bold").fontSize(8)
        .text(f.numeroFactura, cols[0].x + 3, rowY, { width: cols[0].w, ellipsis: true });
      doc.font("Helvetica").fontSize(8)
        .text(f.cliente, cols[1].x + 3, rowY, { width: cols[1].w, ellipsis: true });
      doc.text(formatDate(f.createdAt), cols[2].x + 3, rowY, { width: cols[2].w });
      doc.font("Helvetica-Bold").text(formatMoney(parseFloat(f.total || "0")), cols[3].x + 3, rowY, { width: cols[3].w });

      // Balance column
      const balanceAmt = f.estadoPago === "Pagada" ? 0 : (f.balance != null ? f.balance : parseFloat(f.total || "0"));
      const balanceColor = balanceAmt === 0 ? "#16a34a" : (f.estadoPago === "Pago Parcial" ? "#2563eb" : "#d97706");
      doc.fillColor(balanceColor).font("Helvetica-Bold").fontSize(8)
        .text(formatMoney(balanceAmt), cols[4].x + 3, rowY, { width: cols[4].w });

      // Status
      const statusColor = statusColors[f.estadoPago] || GRAY;
      doc.fillColor(statusColor).font("Helvetica-Bold").fontSize(7)
        .text(f.estadoPago, cols[5].x + 3, rowY + 1, { width: cols[5].w });

      // Fecha Pago
      doc.fillColor("#111111").font("Helvetica").fontSize(8)
        .text(formatDate(f.fechaPago), cols[6].x + 3, rowY, { width: cols[6].w });

      // Vendedor
      doc.font("Helvetica").fontSize(8)
        .text(f.vendedor || "-", cols[7].x + 3, rowY, { width: cols[7].w, ellipsis: true });

      // Thin bottom border
      doc.moveTo(50, y + 18).lineTo(50 + pageWidth, y + 18).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
      y += 18;
    });

    // ── Grand total row ──────────────────────────────────────────────────────
    y += 4;
    doc.rect(50, y, pageWidth, 22).fill(GREEN);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(10)
      .text("TOTAL GENERAL", 53, y + 6, { width: 300 });
    doc.text(formatMoney(totalMonto), cols[3].x + 3, y + 6, { width: cols[3].w });
    y += 30;

    // ── Summary breakdown ────────────────────────────────────────────────────
    // Need ~130pt for summary block; if not enough space, add a new page
    const summaryHeight = 130;
    if (y + summaryHeight > doc.page.height - 60) {
      doc.addPage({ layout: "landscape" });
      y = 50;
    }

    y += 6;
    doc.rect(50, y, pageWidth, 1).fill("#e5e7eb");
    y += 10;
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(11)
      .text("Resumen por Estado de Pago", 50, y, { lineBreak: false });
    y += 18;

    const summaryRows = [
      { label: "Pagadas", count: pagadas.length, amount: totalPagadas, color: "#16a34a" },
      { label: "Pago Parcial (abonos recibidos)", count: parciales.length, amount: totalParcialesAbonos, color: "#2563eb" },
      { label: "Pendientes", count: pendientes.length, amount: totalPendientes, color: "#d97706" },
      { label: "Vencidas", count: vencidas.length, amount: totalVencidas, color: "#dc2626" },
    ];

    summaryRows.forEach(row => {
      doc.fillColor(row.color).font("Helvetica-Bold").fontSize(9)
        .text(`● ${row.label}`, 60, y, { lineBreak: false });
      doc.fillColor("#111111").font("Helvetica").fontSize(9)
        .text(`${row.count} factura${row.count !== 1 ? "s" : ""}  —  ${formatMoney(row.amount)}`, 260, y, { lineBreak: false });
      y += 16;
    });

    // Total balance owed
    y += 8;
    doc.rect(50, y, pageWidth, 22).fill("#fff3cd");
    doc.rect(50, y, 4, 22).fill("#d97706");
    doc.fillColor("#92400e").font("Helvetica-Bold").fontSize(10)
      .text("TOTAL BALANCE ADEUDADO", 60, y + 6, { width: 300, lineBreak: false });
    doc.fillColor("#dc2626").font("Helvetica-Bold").fontSize(10)
      .text(formatMoney(totalBalance), 60, y + 6, { align: "right", width: pageWidth - 20, lineBreak: false });
    y += 30;

    // ── Footer ───────────────────────────────────────────────────────────────
    // Place footer at bottom of current page (no absolute page.height reference that causes blank pages)
    const footerY = doc.page.height - 40;
    if (footerY > y + 10) {
      doc.rect(50, footerY - 10, pageWidth, 1).fill("#e5e7eb");
      doc.fillColor(GRAY).font("Helvetica").fontSize(8)
        .text("Streetview Media — Tu Marca en el Camino  |  (787) 708-5115", 50, footerY, { align: "center", width: pageWidth, lineBreak: false });
    } else {
      y += 10;
      doc.rect(50, y, pageWidth, 1).fill("#e5e7eb");
      y += 6;
      doc.fillColor(GRAY).font("Helvetica").fontSize(8)
        .text("Streetview Media — Tu Marca en el Camino  |  (787) 708-5115", 50, y, { align: "center", width: pageWidth, lineBreak: false });
    }

    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);
  const fileName = `reportes/reporte-facturacion-${Date.now()}.pdf`;
  const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");
  return url;
}
