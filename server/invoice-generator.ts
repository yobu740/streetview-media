import { getDb } from "./db";
import { anuncios, paradas } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { storagePut } from "./storage";
import PDFDocument from "pdfkit";

const STANDARD_PRICE = 350; // Standard price per unit for discount calculation

interface InvoiceItem {
  paradaId: number;
  paradaInfo: string;         // cobertizo - localizacion
  orientacion: string;        // I / O / P
  caja: string;               // 1 (I) / 2 (O)
  periodoInicio: string;      // DD/MM/YY
  periodoFin: string;         // DD/MM/YY
  tipo: string;               // F / B / H
  costo: number;
  descuento: number;          // max(0, STANDARD_PRICE - costo)
}

export async function generateInvoiceFromAnuncios(
  anuncioIds: number[],
  title?: string,
  description?: string,
  productionCost?: number,
  otherServicesDescription?: string,
  otherServicesCost?: number,
  salespersonName?: string,
  clienteNombre?: string
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log("[Invoice] Generating invoice for anuncioIds:", anuncioIds);

  const { inArray } = await import("drizzle-orm");
  const clientAnuncios = await db
    .select()
    .from(anuncios)
    .where(inArray(anuncios.id, anuncioIds));

  console.log("[Invoice] Found", clientAnuncios.length, "anuncios");

  const items: InvoiceItem[] = [];
  let subtotalAnuncios = 0;

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

    // Orientación comes from the parada record
    const orientacion = parada?.orientacion || "";

    // Caja: I → "1", O → "2", others as-is
    const cajaMap: Record<string, string> = { I: "1", O: "2", P: "P" };
    const caja = cajaMap[orientacion.toUpperCase()] ?? orientacion;

    // Tipo abbreviation: Fijo → F, Bonificación → B, Holder → H
    const tipoMap: Record<string, string> = {
      Fijo: "F",
      "Bonificación": "B",
      Holder: "H",
    };
    const tipoAbrev = tipoMap[anuncio.tipo] ?? anuncio.tipo ?? "";

    // Format dates as DD/MM/YY
    const fmt = (d: Date | string) => {
      const dt = new Date(d);
      const dd = String(dt.getUTCDate()).padStart(2, "0");
      const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const yy = String(dt.getUTCFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    };

    const descuento = cost < STANDARD_PRICE ? STANDARD_PRICE - cost : 0;

    items.push({
      paradaId: anuncio.paradaId,
      paradaInfo,
      orientacion,
      caja,
      periodoInicio: fmt(anuncio.fechaInicio),
      periodoFin: fmt(anuncio.fechaFin),
      tipo: tipoAbrev,
      costo: cost,
      descuento,
    });

    subtotalAnuncios += cost;
  }

  const clientName = clienteNombre || clientAnuncios[0]?.cliente || "Cliente";
  const invoiceTitle = title || `Factura - ${new Date().toLocaleDateString("es-PR")}`;

  let finalTotal = subtotalAnuncios;
  if (productionCost) finalTotal += productionCost;
  if (otherServicesCost) finalTotal += otherServicesCost;

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

  const pdfBuffer = await createPDFBuffer({
    clientName,
    invoiceTitle,
    description,
    items,
    subtotalAnuncios,
    productionCost,
    otherServicesDescription,
    otherServicesCost,
    salespersonName,
    finalTotal,
    invoiceNumber,
  });

  const timestamp = Date.now();
  const fileName = `facturas/${invoiceNumber}-${clientName.replace(/\s+/g, "-")}-${timestamp}.pdf`;
  const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");

  await db.insert(facturas).values({
    numeroFactura: invoiceNumber,
    cliente: clientName,
    titulo: invoiceTitle,
    descripcion: description || null,
    subtotal: subtotalAnuncios.toString(),
    costoProduccion: productionCost ? productionCost.toString() : null,
    otrosServiciosDescripcion: otherServicesDescription || null,
    otrosServiciosCosto: otherServicesCost ? otherServicesCost.toString() : null,
    total: finalTotal.toString(),
    vendedor: salespersonName || null,
    pdfUrl: url,
    cantidadAnuncios: items.length,
    anuncioIdsJson: JSON.stringify(anuncioIds),
    createdBy: 1,
  });

  return url;
}

// Regenerate PDF for an existing factura using stored anuncio IDs
export async function regenerateInvoicePDF(facturaId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { facturas } = await import("../drizzle/schema");
  const rows = await db.select().from(facturas).where(eq(facturas.id as any, facturaId)).limit(1);
  const factura = rows[0];
  if (!factura) throw new Error("Factura no encontrada");
  if (!factura.anuncioIdsJson) throw new Error("Esta factura no tiene anuncios guardados para regenerar");

  const anuncioIds: number[] = JSON.parse(factura.anuncioIdsJson);
  const { inArray } = await import("drizzle-orm");
  const clientAnuncios = await db.select().from(anuncios).where(inArray(anuncios.id, anuncioIds));

  const items: InvoiceItem[] = [];
  let subtotalAnuncios = 0;

  for (const anuncio of clientAnuncios) {
    const cost = parseFloat(anuncio.costoPorUnidad || "0");

    const paradaRows = await db.select().from(paradas).where(eq(paradas.id, anuncio.paradaId)).limit(1);
    const parada = paradaRows[0];
    const paradaInfo = parada
      ? `${parada.cobertizoId} - ${parada.localizacion}`
      : `Parada #${anuncio.paradaId}`;

    const orientacion = parada?.orientacion || "";
    const cajaMap: Record<string, string> = { I: "1", O: "2", P: "P" };
    const caja = cajaMap[orientacion.toUpperCase()] ?? orientacion;

    const tipoMap: Record<string, string> = { Fijo: "F", "Bonificación": "B", Holder: "H" };
    const tipoAbrev = tipoMap[anuncio.tipo] ?? anuncio.tipo ?? "";

    const fmt = (d: Date | string) => {
      const dt = new Date(d);
      const dd = String(dt.getUTCDate()).padStart(2, "0");
      const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const yy = String(dt.getUTCFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    };

    items.push({
      paradaId: anuncio.paradaId,
      paradaInfo,
      orientacion,
      caja,
      periodoInicio: fmt(anuncio.fechaInicio),
      periodoFin: fmt(anuncio.fechaFin),
      tipo: tipoAbrev,
      costo: cost,
      descuento: cost < STANDARD_PRICE ? STANDARD_PRICE - cost : 0,
    });

    subtotalAnuncios += cost;
  }

  const pdfBuffer = await createPDFBuffer({
    clientName: factura.cliente,
    invoiceTitle: factura.titulo,
    description: factura.descripcion ?? undefined,
    items,
    subtotalAnuncios,
    productionCost: factura.costoProduccion ? parseFloat(factura.costoProduccion) : undefined,
    otherServicesDescription: factura.otrosServiciosDescripcion ?? undefined,
    otherServicesCost: factura.otrosServiciosCosto ? parseFloat(factura.otrosServiciosCosto) : undefined,
    salespersonName: factura.vendedor ?? undefined,
    finalTotal: parseFloat(factura.total),
    invoiceNumber: factura.numeroFactura,
  });

  const timestamp = Date.now();
  const fileName = `facturas/${factura.numeroFactura}-${factura.cliente.replace(/\s+/g, "-")}-${timestamp}.pdf`;
  const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");

  // Update pdfUrl in DB
  await db.update(facturas).set({ pdfUrl: url }).where(eq(facturas.id as any, facturaId));

  return url;
}

// ─── PDF Layout ──────────────────────────────────────────────────────────────

interface PDFOptions {
  clientName: string;
  invoiceTitle: string;
  description?: string;
  items: InvoiceItem[];
  subtotalAnuncios: number;
  productionCost?: number;
  otherServicesDescription?: string;
  otherServicesCost?: number;
  salespersonName?: string;
  finalTotal: number;
  invoiceNumber: string;
}

// Column definitions for the invoice table
const COLS = [
  { key: "paradaInfo",    label: "Parada",    x: 60,  w: 118 },
  { key: "orientacion",   label: "Or.",        x: 182, w: 26  },
  { key: "caja",          label: "Caja",       x: 211, w: 28  },
  { key: "periodo",       label: "Periodo",    x: 242, w: 115 },
  { key: "tipo",          label: "F/B",        x: 360, w: 26  },
  { key: "costo",         label: "Costo",      x: 389, w: 68  },
  { key: "descuento",     label: "Desc.",      x: 460, w: 65  },
] as const;

async function createPDFBuffer(opts: PDFOptions): Promise<Buffer> {
  const {
    clientName, invoiceTitle, description, items,
    subtotalAnuncios, productionCost, otherServicesDescription,
    otherServicesCost, salespersonName, finalTotal, invoiceNumber,
  } = opts;

  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;

    // ── Green header bar ────────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 110).fill("#1a4d3c");

    const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663148968393/NB4DzLv3DwSWij5HcQ7rQi/streetview-logo-white_ee80e299.png";
    try {
      const response = await fetch(logoUrl);
      if (!response.ok) throw new Error(`Logo fetch failed: ${response.statusText}`);
      const logoBuffer = Buffer.from(await response.arrayBuffer());
      const logoH = 48;
      const logoW = Math.round(logoH * (900 / 231));
      doc.image(logoBuffer, 50, 31, { width: logoW, height: logoH });
    } catch {
      doc.fontSize(24).fillColor("#ffffff").text("STREETVIEW MEDIA", 50, 40);
    }

    // Address
    doc.fontSize(9).fillColor("#666666")
      .text("130 Ave. Winston Churchill", 50, 120)
      .text("PMB 167", 50, 131)
      .text("San Juan, PR 00926", 50, 142);

    // Invoice info (right side of header)
    doc.fontSize(14).fillColor("#ffffff")
      .text("FACTURA", 0, 20, { align: "right", width: pageWidth - 50 });

    let headerY = 42;
    doc.fontSize(9).fillColor("#ffffff")
      .text(`No. ${invoiceNumber}`, 0, headerY, { align: "right", width: pageWidth - 50 });
    headerY += 13;
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-PR")}`, 0, headerY, { align: "right", width: pageWidth - 50 });
    headerY += 13;
    doc.text(invoiceTitle, 0, headerY, { align: "right", width: pageWidth - 50 });
    headerY += 13;
    if (salespersonName) {
      doc.text(`Vendedor: ${salespersonName}`, 0, headerY, { align: "right", width: pageWidth - 50 });
      headerY += 13;
    }
    if (description) {
      doc.text(description, 0, headerY, { align: "right", width: pageWidth - 50 });
    }

    // Client info
    doc.fontSize(12).fillColor("#1a4d3c").text("FACTURADO A:", 50, 165);
    doc.fontSize(10).fillColor("#666666").text(clientName, 50, 182);

    // ── Table header ────────────────────────────────────────────────────────
    const tableTop = 220;
    doc.rect(50, tableTop, 512, 25).fill("#1a4d3c");

    doc.fontSize(8).fillColor("#ffffff");
    COLS.forEach(col => {
      doc.text(col.label, col.x, tableTop + 9, { width: col.w });
    });

    // ── Table rows ───────────────────────────────────────────────────────────
    let y = tableTop + 35;
    const ROW_H = 22;

    const fmtMoney = (n: number) =>
      `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    items.forEach((item, index) => {
      if (y > 680) {
        doc.addPage();
        // Reprint table header on new page
        y = 50;
        doc.rect(50, y, 512, 20).fill("#1a4d3c");
        doc.fontSize(8).fillColor("#ffffff");
        COLS.forEach(col => doc.text(col.label, col.x, y + 6, { width: col.w }));
        y += 28;
      }

      if (index % 2 === 0) {
        doc.rect(50, y - 4, 512, ROW_H).fill("#f5f5f5");
      }

      const periodo = `${item.periodoInicio} - ${item.periodoFin}`;

      doc.fillColor("#333333").fontSize(8);
      doc.text(item.paradaInfo, COLS[0].x, y, { width: COLS[0].w, ellipsis: true });
      doc.text(item.orientacion, COLS[1].x, y, { width: COLS[1].w });
      doc.text(item.caja, COLS[2].x, y, { width: COLS[2].w });
      doc.text(periodo, COLS[3].x, y, { width: COLS[3].w });
      doc.text(item.tipo, COLS[4].x, y, { width: COLS[4].w });

      // Cost in green if standard, orange if discounted
      const costoColor = item.descuento > 0 ? "#1a4d3c" : "#333333";
      doc.fillColor(costoColor).text(fmtMoney(item.costo), COLS[5].x, y, { width: COLS[5].w });

      // Discount column — show amount if > 0, dash if none
      if (item.descuento > 0) {
        doc.fillColor("#e05a00").text(`-${fmtMoney(item.descuento)}`, COLS[6].x, y, { width: COLS[6].w });
      } else {
        doc.fillColor("#aaaaaa").text("—", COLS[6].x, y, { width: COLS[6].w });
      }
      doc.fillColor("#333333");

      y += ROW_H;
    });

    // ── Totals ───────────────────────────────────────────────────────────────
    y += 20;
    doc.moveTo(50, y).lineTo(562, y).stroke("#cccccc");
    y += 15;

    const totalDescuentos = items.reduce((s, i) => s + i.descuento, 0);

    // Anuncios subtotal
    doc.fontSize(10).fillColor("#333333")
      .text("Subtotal (Anuncios)", 50, y)
      .text(fmtMoney(subtotalAnuncios), 480, y, { align: "right" });
    y += 22;

    // Discounts summary (if any)
    if (totalDescuentos > 0) {
      doc.fontSize(9).fillColor("#e05a00")
        .text(`Descuentos aplicados`, 50, y)
        .text(`-${fmtMoney(totalDescuentos)}`, 480, y, { align: "right" });
      y += 20;
    }

    if (productionCost) {
      doc.fontSize(10).fillColor("#333333")
        .text("Costo de Producción", 50, y)
        .text(fmtMoney(productionCost), 480, y, { align: "right" });
      y += 22;
    }

    if (otherServicesCost) {
      doc.fontSize(10).fillColor("#333333")
        .text(otherServicesDescription || "Otros Servicios", 50, y)
        .text(fmtMoney(otherServicesCost), 480, y, { align: "right" });
      y += 22;
    }

    // Total
    doc.moveTo(50, y).lineTo(562, y).stroke("#1a4d3c");
    y += 12;
    doc.fontSize(13).fillColor("#1a4d3c")
      .text("TOTAL", 50, y);
    doc.fontSize(15)
      .text(fmtMoney(finalTotal), 480, y, { align: "right" });

    doc.end();
  });
}
