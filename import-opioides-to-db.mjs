import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Load JSON data
const opioidesData = JSON.parse(fs.readFileSync('/home/ubuntu/opioides_ads.json', 'utf8'));

console.log(`Importing ${opioidesData.length} OPIOIDES ads...`);

// First, get parada IDs from cobertizo_id + orientacion
const getParadaId = async (cobertizoId, orientacion) => {
  const [rows] = await connection.query(
    'SELECT id FROM paradas WHERE cobertizo_id = ? AND orientacion = ?',
    [cobertizoId, orientacion]
  );
  return rows[0]?.id;
};

// Set dates: start from Jan 1, 2025, end Dec 31, 2025
const fechaInicio = new Date('2025-01-01T00:00:00');
const fechaFin = new Date('2025-12-31T23:59:59');

let imported = 0;
let skipped = 0;

for (const ad of opioidesData) {
  const paradaId = await getParadaId(ad.cobertizo_id, ad.orientacion);
  
  if (!paradaId) {
    console.log(`Skipping: Parada not found for ${ad.cobertizo_id}-${ad.orientacion}`);
    skipped++;
    continue;
  }
  
  try {
    await connection.query(
      `INSERT INTO anuncios (
        parada_id, producto, cliente, tipo, costo_por_unidad,
        fecha_inicio, fecha_fin, estado, approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paradaId,
        ad.producto,
        ad.cliente,
        ad.tipo,
        ad.costo_por_unidad.toString(),
        fechaInicio,
        fechaFin,
        'Activo',
        'approved'
      ]
    );
    imported++;
    if (imported % 20 === 0) {
      console.log(`Imported ${imported}/${opioidesData.length}...`);
    }
  } catch (error) {
    console.error(`Error importing ${ad.cobertizo_id}-${ad.orientacion}:`, error.message);
    skipped++;
  }
}

console.log(`\nDone! Imported: ${imported}, Skipped: ${skipped}`);
await connection.end();
