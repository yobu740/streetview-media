/**
 * Script to add "Comunidad Dominicana" tag to all specified paradas.
 * Run with: node scripts/add-comunidad-dominicana-tag.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

// All parada cobertizoIds to tag as "Comunidad Dominicana"
// Source: Av. Ponce de León, Hato Rey Norte y Comercial, Santurce y Limítrofes, Río Piedras
const PARADAS_COMUNIDAD_DOMINICANA = [
  // 1. Avenida Ponce de León - Operativas
  "134", "135A", "135B", "137", "139", "140", "143", "147", "148", "151",
  "158", "317A", "317B", "331A", "331B", "349", "359", "372", "393", "398",
  "454", "456", "466", "469", "506", "507A", "507B", "511", "518", "530",
  "534", "572", "581", "634", "641", "642", "655", "673", "676", "679",
  "680", "681", "711", "739", "753",
  // 1. Avenida Ponce de León - Digitales (Sin Display)
  "134A", "134B", "134C", "134D", "134E", "134F", "134G", "134H",
  "745A", "745B", "745C", "745D", "745E", "745F", "745G", "745H",
  // 2. Hato Rey Norte y Comercial - Operativas
  "025", "032", "033", "034", "035", "059", "060", "061", "062",
  "079A", "079B", "080", "081", "082A", "082B", "091", "092A", "092B",
  "094A", "094B", "096", "098", "390", "397", "417A", "417B", "449",
  "453", "499", "500B", "515", "531", "604", "605", "653", "741",
  // 2. Hato Rey Norte y Comercial - Digitales
  "089", "449", "453A", "453B", "453C", "453D", "453E", "453F", "453G", "453H",
  "500A", "606",
  // 3. Santurce y Limítrofes - Operativas
  "006", "038A", "038B", "039A", "040A", "040B", "064", "065", "099",
  "300A", "300B", "332", "364", "365", "416", "437A", "437B", "439",
  "446", "461A", "461B", "462", "465A", "465B", "488", "492", "493",
  "505", "523", "524", "570", "578", "580", "590", "608", "610", "625",
  "633", "639", "656", "726", "734",
  // 3. Santurce y Limítrofes - Digitales
  "039B", "488A", "488B", "488C", "488D", "488E", "488F", "488G", "488H",
  "607", "712",
  // 4. Río Piedras - Operativas
  "008", "010", "049", "057", "242", "243", "245", "247", "373", "392",
  "480", "733",
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to database.");

  let updated = 0;
  let notFound = [];

  for (const cobertizoId of PARADAS_COMUNIDAD_DOMINICANA) {
    // Get current tags for this parada
    const [rows] = await conn.execute(
      "SELECT id, cobertizo_id, tags FROM paradas WHERE cobertizo_id = ?",
      [cobertizoId]
    );

    if (rows.length === 0) {
      notFound.push(cobertizoId);
      continue;
    }

    for (const row of rows) {
      let tags = [];
      try {
        tags = row.tags ? JSON.parse(row.tags) : [];
      } catch {
        tags = [];
      }

      if (!tags.includes("Comunidad Dominicana")) {
        tags.push("Comunidad Dominicana");
        await conn.execute(
          "UPDATE paradas SET tags = ? WHERE id = ?",
          [JSON.stringify(tags), row.id]
        );
        updated++;
        console.log(`✓ Updated parada ${cobertizoId} (id: ${row.id}) → tags: ${JSON.stringify(tags)}`);
      } else {
        console.log(`  Skipped parada ${cobertizoId} (already has tag)`);
      }
    }
  }

  console.log(`\n✅ Done. Updated ${updated} paradas.`);
  if (notFound.length > 0) {
    console.log(`⚠️  Not found in DB (${notFound.length}): ${notFound.join(", ")}`);
  }

  await conn.end();
}

main().catch(console.error);
