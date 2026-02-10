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
  description?: string
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get anuncios by IDs
  const { inArray } = await import("drizzle-orm");
  console.log("[Invoice] Generating invoice for anuncioIds:", anuncioIds);
  
  const clientAnuncios = await db
    .select({
      id: anuncios.id,
      paradaId: anuncios.paradaId,
      producto: anuncios.producto,
      cliente: anuncios.cliente,
      fechaInicio: anuncios.fechaInicio,
      fechaFin: anuncios.fechaFin,
      costoPorUnidad: anuncios.costoPorUnidad,
      tipo: anuncios.tipo,
    })
    .from(anuncios)
    .where(inArray(anuncios.id, anuncioIds));
  
  console.log("[Invoice] Found", clientAnuncios.length, "anuncios");
  if (clientAnuncios.length > 0) {
    console.log("[Invoice] Sample anuncio:", {
      id: clientAnuncios[0].id,
      costoPorUnidad: clientAnuncios[0].costoPorUnidad,
      tipo: clientAnuncios[0].tipo
    });
  }

  // Get parada info for each anuncio
  const items: InvoiceItem[] = [];
  let total = 0;

  for (const anuncio of clientAnuncios) {
    // Skip bonificaciones (cost = 0)
    const cost = parseFloat(anuncio.costoPorUnidad?.toString() || "0");
    console.log(`[Invoice] Anuncio #${anuncio.id}: cost=${cost}, tipo=${anuncio.tipo}`);
    if (cost === 0) {
      console.log(`[Invoice] Skipping anuncio #${anuncio.id} (cost = 0)`);
      continue;
    }

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

  // Get client name from first anuncio
  const clientName = clientAnuncios[0]?.cliente || "Cliente";
  const invoiceTitle = title || `Factura - ${new Date().toLocaleDateString("es-PR")}`;

  // Generate PDF
  const pdfBuffer = await createPDFBuffer(clientName, invoiceTitle, description, items, total);

  // Upload to S3
  const invoiceNumber = `INV-${Date.now()}`;
  const fileName = `facturas/${invoiceNumber}-${clientName.replace(/\s+/g, "-")}.pdf`;
  const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");

  return url;
}

async function createPDFBuffer(
  cliente: string,
  invoiceTitle: string,
  description: string | undefined,
  items: InvoiceItem[],
  total: number
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header with logo from S3
    const logoUrl = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/aXdEhASWaNhvKWjP.png";
    try {
      // Download logo from S3
      const https = require('https');
      const logoBuffer = await new Promise<Buffer>((resolve, reject) => {
        https.get(logoUrl, (res: any) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }).on('error', reject);
      });
      doc.image(logoBuffer, 50, 45, { width: 120 });
    } catch (e) {
      console.error('[Invoice] Failed to load logo:', e);
      // Fallback to text if logo fails to load
      doc
        .fontSize(24)
        .fillColor("#1a4d3c")
        .text("STREETVIEW MEDIA", 50, 50);
    }

    doc
      .fontSize(10)
      .fillColor("#666666")
      .text("Red de Publicidad Exterior", 50, 95)
      .text("Puerto Rico", 50, 110);

    // Invoice info
    const invoiceNumber = `INV-${Date.now()}`;

    doc
      .fontSize(12)
      .fillColor("#1a4d3c")
      .text("FACTURA", 400, 50, { align: "right" });

    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(`No. ${invoiceNumber}`, 400, 70, { align: "right" })
      .text(`Fecha: ${new Date().toLocaleDateString("es-PR")}`, 400, 85, { align: "right" })
      .text(invoiceTitle, 400, 100, { align: "right" });

    // Description if provided
    if (description) {
      doc
        .fontSize(10)
        .fillColor("#666666")
        .text(description, 400, 115, { align: "right" });
    }

    // Client info
    doc
      .fontSize(12)
      .fillColor("#1a4d3c")
      .text("FACTURADO A:", 50, 140);

    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(cliente, 50, 160);

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

    // Total
    y += 20;
    doc
      .fontSize(12)
      .fillColor("#1a4d3c")
      .text("TOTAL:", 400, y, { align: "right" })
      .fontSize(14)
      .text(`$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y);

    // Footer
    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(
        "Gracias por su preferencia. Para consultas, contáctenos.",
        50,
        750,
        { align: "center", width: 512 }
      );

    doc.end();
  });
}
