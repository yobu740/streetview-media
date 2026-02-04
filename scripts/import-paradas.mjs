import { drizzle } from "drizzle-orm/mysql2";
import { paradas } from "../drizzle/schema.js";
import XLSX from "xlsx";


// Read Excel file
const workbook = XLSX.readFile("/home/ubuntu/upload/SISTEMASPARADAS1-31-26.xlsx");
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

// Initialize database
const db = drizzle(process.env.DATABASE_URL);

// Process and import data
const paradaMap = new Map(); // Track unique paradas by cobertizoId

console.log(`Processing ${data.length} rows from Excel...`);
console.log("First row keys:", Object.keys(data[0] || {}));
console.log("First 3 rows:", data.slice(0, 3));

let skipped = 0;
let processed = 0;

for (const row of data) {
  // Skip header rows and empty rows (first 2 rows are headers)
  if (!row["__EMPTY_2"] || row["__EMPTY_2"] === "#COB.") {
    skipped++;
    continue;
  }
  
  const cobertizoId = String(row["__EMPTY_2"]).trim();
  const localizacion = String(row["__EMPTY"] || "").trim();
  const direccion = String(row["__EMPTY_3"] || "").trim();
  const orientacion = String(row["__EMPTY_4"] || "").trim();
  const flowCat = String(row["__EMPTY_1"] || "").trim();
  const ruta = String(row["__EMPTY_7"] || "").trim();
  
  // Skip if already processed this cobertizo
  if (paradaMap.has(cobertizoId)) {
    skipped++;
    continue;
  }
  
  processed++;
  if (processed <= 3) {
    console.log(`Sample row ${processed}:`, { cobertizoId, localizacion, direccion, orientacion });
  }
  
  // Determine if it's digital based on cobertizo ID pattern
  const tipoFormato = cobertizoId.includes("A") || 
                      cobertizoId.includes("B") || 
                      cobertizoId.includes("C") || 
                      cobertizoId.includes("D") || 
                      cobertizoId.includes("E") || 
                      cobertizoId.includes("F") || 
                      cobertizoId.includes("G") || 
                      cobertizoId.includes("H") 
                      ? "Digital" : "Fija";
  
  const paradaData = {
    cobertizoId,
    localizacion: localizacion || "Sin localización",
    direccion: direccion || "Sin dirección",
    orientacion: orientacion || null,
    flowCat: flowCat || null,
    ruta: ruta || null,
    coordenadasLat: null,
    coordenadasLng: null,
    tipoFormato,
    activa: 1,
  };
  
  paradaMap.set(cobertizoId, paradaData);
}

console.log(`Found ${paradaMap.size} unique paradas to import`);

// Batch insert
const paradaArray = Array.from(paradaMap.values());
const batchSize = 100;

for (let i = 0; i < paradaArray.length; i += batchSize) {
  const batch = paradaArray.slice(i, i + batchSize);
  try {
    await db.insert(paradas).values(batch);
    console.log(`Imported batch ${Math.floor(i / batchSize) + 1} (${batch.length} paradas)`);
  } catch (error) {
    console.error(`Error importing batch:`, error.message);
  }
}

console.log("Import completed!");
process.exit(0);
