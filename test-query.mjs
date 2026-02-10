import { getDb } from "./server/db.ts";

const db = await getDb();
const result = await db.execute("SELECT id, producto, tipo, costo_por_unidad FROM anuncios WHERE cliente = 'OPIOIDES' LIMIT 3");
console.log("Raw SQL result:", JSON.stringify(result, null, 2));
