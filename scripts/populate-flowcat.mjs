/**
 * Script to populate the flow_cat field in all paradas based on their localizacion.
 * Flowcat mapping extracted from MASTERPARADASSTREETVIEWMEDIA.pdf
 * Run with: node scripts/populate-flowcat.mjs
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

// Mapping from DB localizacion values to Flowcat numbers
// Format: { localizacion_in_db: flowcat_number }
const FLOWCAT_MAP = {
  'AVE. ASHFORD': '004',
  'AVE. BARBOSA': '007',
  'AVE. HOSTOS': '010',
  'AVE. PIÑERO / CENTRAL': '011',  // Avenida Central = 011
  'AVE. ESCORIAL': '013',
  'AVE. CHARDON': '015',
  'AVE. DE DIEGO PUERTO NUEVO': '017',
  'AVE. DE DIEGO RIO PIEDRAS': '019',
  'AVE. DE DIEGO SANTURCE': '021',
  'AVE. DOMENECH': '023',
  'AVE. FERNANDEZ JUNCOS': '025',
  'AVE. FERNANDEZ JUNCOS PTA. TIERRA': '027',
  'AVE. FD ROOSEVELT': '029',
  'AVE. GANDARA': '031',
  'AVE. GLASGOW': '032',
  'AVE. MAYAGUEZ': '035',
  'AVE. AMERICO MIRANDA': '037',
  'AVE. MUÑOZ RIVERA HATO REY ': '039',
  'AVE. PONCE DE LEÓN': '043',
  'AVE. PONCE DE LEÓN PTA DE TIERRA': '045',
  'AVE. SAN PATRICIO': '065',
  'AVE. QUISQUELLA': '049',
  'CENTRO MÉDICO': '050',
  'CARRETERA #1': '051',
  'CARRETERA #21': '055',
  'CARRETERA #176': '057',
  'CARRETERA #177': '059',
  'LAS CUMBRES': '060',
  'CARRETERA #838': '061',
  'CARRETERA #841': '063',
  'AVE. 65 DE INFANTERÍA': '067',
  'AVE. ROBERTO H. TODD': '069',
  'AVE. PRUDENCIO RIVERA': '071',
  'CALLE LOÍZA': '073',
  'MISCELÁNEOS': '077',
  'AVE. ITURREGUI': '078',
  'AVE. CAMPO RICO CAROLINA': '091',
  'AVE. EDUARDO CONDE': '093',  // Not in PDF but likely exists
  'EXPRESO TRUJILLO ALTO': '105',
  'AMA': '136',
};

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('Starting flowcat population...');
  
  let totalUpdated = 0;
  let notFound = [];
  
  for (const [localizacion, flowcat] of Object.entries(FLOWCAT_MAP)) {
    const [result] = await conn.execute(
      'UPDATE paradas SET flow_cat = ? WHERE localizacion = ? AND (flow_cat IS NULL OR flow_cat = "")',
      [flowcat, localizacion]
    );
    const affected = result.affectedRows;
    if (affected > 0) {
      console.log(`  ✓ ${localizacion} → ${flowcat} (${affected} rows updated)`);
      totalUpdated += affected;
    }
  }
  
  // Check for paradas without flowcat
  const [missing] = await conn.execute(
    'SELECT DISTINCT localizacion, COUNT(*) as cnt FROM paradas WHERE (flow_cat IS NULL OR flow_cat = "") GROUP BY localizacion ORDER BY localizacion'
  );
  
  if (missing.length > 0) {
    console.log('\n⚠️  Paradas without flowcat:');
    missing.forEach(row => console.log(`  - "${row.localizacion}" (${row.cnt} rows)`));
  }
  
  console.log(`\n✅ Total updated: ${totalUpdated} rows`);
  await conn.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
