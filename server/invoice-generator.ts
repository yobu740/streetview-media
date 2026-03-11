import { getDb } from "./db";
import { anuncios, paradas } from "../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { storagePut } from "./storage";
import PDFDocument from "pdfkit";

interface InvoiceItem {
  paradaId: number;
  paradaInfo: string;
  producto: string;
  fechaInicio: string;
  fechaFin: string;
  costo: number;
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

  // Get anuncios by IDs - now using ORM since costoPorUnidad is varchar
  console.log("[Invoice] Generating invoice for anuncioIds:", anuncioIds);
  
  const { inArray } = await import("drizzle-orm");
  const clientAnuncios = await db
    .select()
    .from(anuncios)
    .where(inArray(anuncios.id, anuncioIds));
  
  console.log("[Invoice] Found", clientAnuncios.length, "anuncios");

  // Get parada info for each anuncio
  const items: InvoiceItem[] = [];
  let total = 0;

  for (const anuncio of clientAnuncios) {
    // costoPorUnidad is now varchar, parse as float
    const cost = parseFloat(anuncio.costoPorUnidad || "0");
    console.log(`[Invoice] Anuncio #${anuncio.id}: cost=${cost}, tipo=${anuncio.tipo}`);
    
    // Include bonificaciones (cost = 0) in invoice - they should appear with $0.00

    const parada = await db
      .select()
      .from(paradas)
      .where(eq(paradas.id, anuncio.paradaId))
      .limit(1);

    const paradaInfo = parada[0]
      ? `${parada[0].cobertizoId} - ${parada[0].localizacion}`
      : `Parada #${anuncio.paradaId}`;

    items.push({
      paradaId: anuncio.paradaId,
      paradaInfo,
      producto: anuncio.producto || "",
      fechaInicio: new Date(anuncio.fechaInicio).toLocaleDateString("es-PR"),
      fechaFin: new Date(anuncio.fechaFin).toLocaleDateString("es-PR"),
      costo: cost,
    });

    total += cost;
  }

  // Get client name: use provided name (e.g. "Todos los clientes") or fall back to first anuncio's client
  const clientName = clienteNombre || clientAnuncios[0]?.cliente || "Cliente";
  const invoiceTitle = title || `Factura - ${new Date().toLocaleDateString("es-PR")}`;

  // Add production cost and other services to total
  let finalTotal = total;
  if (productionCost) finalTotal += productionCost;
  if (otherServicesCost) finalTotal += otherServicesCost;

  // Generate sequential invoice number
  const { facturas } = await import("../drizzle/schema");
  const lastInvoice = await db
    .select({ numeroFactura: facturas.numeroFactura })
    .from(facturas)
    .orderBy(sql`${facturas.id} DESC`)
    .limit(1);
  
  let nextNumber = 1000; // Start from 1000 for 4-digit format
  if (lastInvoice.length > 0) {
    const lastNumber = lastInvoice[0].numeroFactura;
    const match = lastNumber.match(/INV-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  const invoiceNumber = `INV-${nextNumber}`;
  
  // Generate PDF with invoice number
  const pdfBuffer = await createPDFBuffer(
    clientName, 
    invoiceTitle, 
    description, 
    items, 
    total,
    productionCost,
    otherServicesDescription,
    otherServicesCost,
    salespersonName,
    finalTotal,
    invoiceNumber
  );
  
  // Add timestamp suffix to ensure unique S3 key even if invoice number is reused after deletion
  // This prevents CloudFront from serving a stale cached version of a previously deleted invoice
  const timestamp = Date.now();
  const fileName = `facturas/${invoiceNumber}-${clientName.replace(/\s+/g, "-")}-${timestamp}.pdf`;
  const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");

  // Save invoice record to database
  await db.insert(facturas).values({
    numeroFactura: invoiceNumber,
    cliente: clientName,
    titulo: invoiceTitle,
    descripcion: description || null,
    subtotal: total.toString(),
    costoProduccion: productionCost ? productionCost.toString() : null,
    otrosServiciosDescripcion: otherServicesDescription || null,
    otrosServiciosCosto: otherServicesCost ? otherServicesCost.toString() : null,
    total: finalTotal.toString(),
    vendedor: salespersonName || null,
    pdfUrl: url,
    cantidadAnuncios: items.length,
    createdBy: 1, // TODO: Get from context when auth is implemented
  });

  return url;
}

async function createPDFBuffer(
  cliente: string,
  invoiceTitle: string,
  description: string | undefined,
  items: InvoiceItem[],
  subtotal: number,
  productionCost?: number,
  otherServicesDescription?: string,
  otherServicesCost?: number,
  salespersonName?: string,
  total?: number,
  invoiceNumber?: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Draw green header bar background
    const pageWidth = doc.page.width;
    doc
      .rect(0, 0, pageWidth, 110)
      .fill("#1a4d3c");

    // Header with logo from CDN (white version for dark header backgrounds)
    const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663148968393/NB4DzLv3DwSWij5HcQ7rQi/streetview-logo-white_ee80e299.png";
    try {
      // Download logo from S3 using fetch
      const response = await fetch(logoUrl);
      if (!response.ok) throw new Error(`Failed to fetch logo: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      const logoBuffer = Buffer.from(arrayBuffer);
      // Logo is 900x231 px; scale to fit height ~48px inside the green bar
      const logoH = 48;
      const logoW = Math.round(logoH * (900 / 231));
      doc.image(logoBuffer, 50, 31, { width: logoW, height: logoH });
    } catch (e) {
      console.error('[Invoice] Failed to load logo:', e);
      // Fallback to text if logo fails to load
      doc
        .fontSize(24)
        .fillColor("#ffffff")
        .text("STREETVIEW MEDIA", 50, 40);
    }

    // Address below the green header bar
    doc
      .fontSize(9)
      .fillColor("#666666")
      .text("130 Ave. Winston Churchill", 50, 120)
      .text("PMB 167", 50, 131)
      .text("San Juan, PR 00926", 50, 142);

    // Invoice info - inside the green bar (white text on right side)
    const displayInvoiceNumber = invoiceNumber || `INV-${Date.now()}`;

    doc
      .fontSize(14)
      .fillColor("#ffffff")
      .text("FACTURA", 0, 20, { align: "right", width: pageWidth - 50 });

    let headerY = 42;
    doc
      .fontSize(9)
      .fillColor("#ffffff")
      .text(`No. ${displayInvoiceNumber}`, 0, headerY, { align: "right", width: pageWidth - 50 });
    headerY += 13;
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-PR")}`, 0, headerY, { align: "right", width: pageWidth - 50 });
    headerY += 13;
    doc.text(invoiceTitle, 0, headerY, { align: "right", width: pageWidth - 50 });
    headerY += 13;
    
    // Salesperson name in header if provided
    if (salespersonName) {
      doc.text(`Vendedor: ${salespersonName}`, 0, headerY, { align: "right", width: pageWidth - 50 });
      headerY += 13;
    }

    // Description if provided
    if (description) {
      doc
        .fontSize(9)
        .fillColor("#ffffff")
        .text(description, 0, headerY, { align: "right", width: pageWidth - 50 });
      headerY += 13;
    }

    // Client info
    doc
      .fontSize(12)
      .fillColor("#1a4d3c")
      .text("FACTURADO A:", 50, 165);

    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(cliente, 50, 182);

    // Table header
    const tableTop = 220;
    doc
      .fontSize(10)
      .fillColor("#ffffff")
      .rect(50, tableTop, 512, 25)
      .fill("#1a4d3c");

    doc
      .fillColor("#ffffff")
      .text("Parada", 60, tableTop + 8)
      .text("Producto", 200, tableTop + 8)
      .text("Inicio", 340, tableTop + 8)
      .text("Fin", 420, tableTop + 8)
      .text("Costo", 500, tableTop + 8);

    // Table rows
    let y = tableTop + 35;
    doc.fillColor("#333333");

    items.forEach((item, index) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(50, y - 5, 512, 20).fill("#f5f5f5");
      }

      doc
        .fillColor("#333333")
        .fontSize(9)
        .text(item.paradaInfo.substring(0, 30), 60, y, { width: 130 })
        .text(item.producto.substring(0, 20), 200, y, { width: 130 })
        .text(item.fechaInicio, 340, y)
        .text(item.fechaFin, 420, y)
        .text(`$${item.costo.toFixed(2)}`, 500, y);

      y += 25;
    });

    // Totals section - table format
    y += 30;
    
    // Separator line
    doc
      .moveTo(50, y)
      .lineTo(562, y)
      .stroke("#cccccc");
    y += 15;
    
    // Subtotal row
    doc
      .fontSize(11)
      .fillColor("#333333")
      .text("Subtotal (Anuncios)", 50, y)
      .text(`$${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 480, y, { align: "right" });
    y += 25;
    
    // Production cost row
    if (productionCost) {
      doc
        .text("Costo de Producción", 50, y)
        .text(`$${productionCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 480, y, { align: "right" });
      y += 25;
    }
    
    // Other services row
    if (otherServicesCost) {
      const serviceLabel = otherServicesDescription || "Otros Servicios";
      doc
        .text(serviceLabel, 50, y)
        .text(`$${otherServicesCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 480, y, { align: "right" });
      y += 25;
    }
    
    // Total separator line
    doc
      .moveTo(50, y)
      .lineTo(562, y)
      .stroke("#1a4d3c");
    y += 15;
    
    // Total row
    const finalTotal = total || subtotal;
    doc
      .fontSize(13)
      .fillColor("#1a4d3c")
      .text("TOTAL", 50, y)
      .fontSize(15)
      .text(`$${finalTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 480, y, { align: "right" });
    
    doc.end();
  });
}
