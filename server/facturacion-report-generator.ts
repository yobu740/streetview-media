import PDFDocument from "pdfkit";
import { storagePut } from "./storage";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "streetview-logo.png");

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
  const totalParciales = parciales.reduce((s, f) => s + parseFloat(f.total || "0"), 0);
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

  // Build PDF
  const doc = new PDFDocument({ margin: 50, size: "LETTER" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  await new Promise<void>((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);

    const GREEN = "#1a4d3c";
    const ORANGE = "#ff6b35";
    const GRAY = "#666666";
    const LIGHT_GRAY = "#f5f5f5";
    const pageWidth = doc.page.width - 100; // margins 50 each side

    // ── Header bar ────────────────────────────────────────────────────────
    doc.rect(50, 50, pageWidth, 80).fill(GREEN);

    // Logo image on the left
    try {
      // Logo is 900x231 px; scale to fit height ~55px inside the green bar
      const logoH = 52;
      const logoW = Math.round(logoH * (900 / 231));
      doc.image(LOGO_PATH, 60, 59, { width: logoW, height: logoH });
    } catch {
      // Fallback to text if image fails to load
      doc.fillColor("white").font("Helvetica-Bold").fontSize(22).text("STREETVIEW MEDIA", 70, 65);
    }

    // Slogan below logo area
    doc.fillColor("white").font("Helvetica-Oblique").fontSize(9)
      .text("Tu Marca en el Camino", 60, 115);

    // Report title on right
    doc.fillColor("white").font("Helvetica-Bold").fontSize(14).text(titulo, 50, 65, { align: "right", width: pageWidth });
    doc.font("Helvetica").fontSize(10).fillColor("white").text(
      `Generado: ${formatDate(new Date())}`,
      50, 90, { align: "right", width: pageWidth }
    );

    // ── Filter description ──────────────────────────────────────────────────
    let y = 140;
    if (filtroDescripcion) {
      doc.fillColor(GRAY).font("Helvetica-Oblique").fontSize(10)
        .text(`Filtro aplicado: ${filtroDescripcion}`, 50, y);
      y += 20;
    }

    // ── Summary cards ───────────────────────────────────────────────────────
    const cardW = (pageWidth - 30) / 4;
    const cards = [
      { label: "Total Facturas", count: totalFacturas, amount: totalMonto, color: "#2563eb" },
      { label: "Pagadas", count: pagadas.length, amount: totalPagadas, color: "#16a34a" },
      { label: "Pago Parcial", count: parciales.length, amount: totalParciales, color: "#2563eb" },
      { label: "No Pagadas", count: pendientes.length + vencidas.length, amount: totalPendientes + totalVencidas, color: "#dc2626" },
    ];

    cards.forEach((card, i) => {
      const cx = 50 + i * (cardW + 10);
      doc.rect(cx, y, cardW, 60).fill(LIGHT_GRAY);
      doc.rect(cx, y, 4, 60).fill(card.color);
      doc.fillColor(card.color).font("Helvetica-Bold").fontSize(9)
        .text(card.label.toUpperCase(), cx + 10, y + 8, { width: cardW - 15 });
      doc.fillColor("#111111").font("Helvetica-Bold").fontSize(20)
        .text(String(card.count), cx + 10, y + 22);
      doc.fillColor(GRAY).font("Helvetica").fontSize(9)
        .text(formatMoney(card.amount), cx + 10, y + 44);
    });

    y += 80;

    // ── Table header ────────────────────────────────────────────────────────
    const cols = [
      { label: "No. Factura", x: 50, w: 75 },
      { label: "Cliente", x: 128, w: 120 },
      { label: "Fecha", x: 252, w: 65 },
      { label: "Total", x: 320, w: 65 },
      { label: "Balance", x: 388, w: 65 },
      { label: "Estado", x: 456, w: 65 },
      { label: "Fecha Pago", x: 524, w: 0 }, // last col, auto width
    ];

    doc.rect(50, y, pageWidth, 20).fill(GREEN);
    cols.forEach(col => {
      doc.fillColor("white").font("Helvetica-Bold").fontSize(8)
        .text(col.label, col.x + 3, y + 6, { width: col.w || 80, ellipsis: true });
    });
    y += 20;

    // ── Table rows ──────────────────────────────────────────────────────────
    const statusColors: Record<string, string> = {
      Pagada: "#16a34a",
      Pendiente: "#d97706",
      Vencida: "#dc2626",
      "Pago Parcial": "#2563eb",
    };

    facturas.forEach((f, idx) => {
      // Page break check
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 50;
        // Repeat table header
        doc.rect(50, y, pageWidth, 20).fill(GREEN);
        cols.forEach(col => {
          doc.fillColor("white").font("Helvetica-Bold").fontSize(8)
            .text(col.label, col.x + 3, y + 6, { width: col.w || 80, ellipsis: true });
        });
        y += 20;
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

      // Status badge
      const statusColor = statusColors[f.estadoPago] || GRAY;
      doc.fillColor(statusColor).font("Helvetica-Bold").fontSize(7)
        .text(f.estadoPago, cols[5].x + 3, rowY + 1, { width: cols[5].w });

      doc.fillColor("#111111").font("Helvetica").fontSize(8)
        .text(formatDate(f.fechaPago), cols[6].x + 3, rowY, { width: 80 });

      // Thin bottom border
      doc.moveTo(50, y + 18).lineTo(50 + pageWidth, y + 18).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
      y += 18;
    });

    // ── Grand total row ──────────────────────────────────────────────────────
    y += 4;
    doc.rect(50, y, pageWidth, 22).fill(GREEN);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(10)
      .text("TOTAL GENERAL", 53, y + 6, { width: 300 });
    doc.text(formatMoney(totalMonto), cols[4].x + 3, y + 6, { width: cols[4].w });
    y += 30;

    // ── Summary breakdown ────────────────────────────────────────────────────
    y += 6;
    doc.rect(50, y, pageWidth, 1).fill("#e5e7eb");
    y += 10;
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(11).text("Resumen por Estado de Pago", 50, y);
    y += 18;

    const summaryRows = [
      { label: "Pagadas", count: pagadas.length, amount: totalPagadas, color: "#16a34a" },
      { label: "Pago Parcial", count: parciales.length, amount: totalParciales, color: "#2563eb" },
      { label: "Pendientes", count: pendientes.length, amount: totalPendientes, color: "#d97706" },
      { label: "Vencidas", count: vencidas.length, amount: totalVencidas, color: "#dc2626" },
    ];

    // Total balance owed
    y += 8;
    doc.rect(50, y, pageWidth, 22).fill("#fff3cd");
    doc.rect(50, y, 4, 22).fill("#d97706");
    doc.fillColor("#92400e").font("Helvetica-Bold").fontSize(10)
      .text("TOTAL BALANCE ADEUDADO", 60, y + 6, { width: 300 });
    doc.fillColor("#dc2626").font("Helvetica-Bold").fontSize(10)
      .text(formatMoney(totalBalance), 60, y + 6, { align: "right", width: pageWidth - 20 });
    y += 30;

    summaryRows.forEach(row => {
      doc.fillColor(row.color).font("Helvetica-Bold").fontSize(9)
        .text(`● ${row.label}`, 60, y);
      doc.fillColor("#111111").font("Helvetica").fontSize(9)
        .text(`${row.count} factura${row.count !== 1 ? "s" : ""}  —  ${formatMoney(row.amount)}`, 140, y);
      y += 16;
    });

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.rect(50, footerY - 10, pageWidth, 1).fill("#e5e7eb");
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text("Streetview Media — Donde Puerto Rico Mira  |  (787) 708-5115", 50, footerY, { align: "center", width: pageWidth });

    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);
  const fileName = `reportes/reporte-facturacion-${Date.now()}.pdf`;
  const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");
  return url;
}
