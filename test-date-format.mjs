import { drizzle } from "drizzle-orm/mysql2";
import { anuncios } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

// Get one anuncio to check date format
const result = await db.select().from(anuncios).limit(1);

if (result[0]) {
  console.log("Raw database result:");
  console.log("fechaInicio type:", typeof result[0].fechaInicio);
  console.log("fechaInicio value:", result[0].fechaInicio);
  console.log("fechaInicio constructor:", result[0].fechaInicio?.constructor?.name);
  console.log("\nfechaFin type:", typeof result[0].fechaFin);
  console.log("fechaFin value:", result[0].fechaFin);
  
  // Test what happens when we serialize
  console.log("\nJSON.stringify result:");
  console.log(JSON.stringify({ fecha: result[0].fechaInicio }));
}

process.exit(0);
