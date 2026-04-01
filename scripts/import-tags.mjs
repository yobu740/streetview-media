/**
 * Tag Import Script
 * Assigns strategic location tags to paradas based on cobertizoId.
 * Run with: node scripts/import-tags.mjs
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// ── Tag definitions ──────────────────────────────────────────────────────────
// Format: { tag, ids: string[], localizaciones: string[] }
// localizaciones: partial strings matched against parada.localizacion (case-insensitive)
const TAG_RULES = [
  {
    tag: 'Hospitales',
    ids: ['049','059','061','062','140','147','148','218','242','397','446','469','475','506','507','514','523','524','588','629','633','635','679','CE001','CE002','CE003'],
    localizaciones: ['Ave. Ashford'],
  },
  {
    tag: 'Residenciales',
    ids: ['021','031','046','066','079','080','081','082','089','091','092','094','187','189','203','235','332','364','367','382','429','436','498','501','529','536','570','592','625','657','687','709','740','749'],
    localizaciones: [],
  },
  {
    tag: 'Complejo Turístico',
    ids: ['041','046','082','099','135','137','139','349','359','365','392','398','465','493','511','530','581','634','681','745'],
    localizaciones: ['Ave. Ashford','AVE. FERNANDEZ JUNCOS PTA. TIERRA','Calle Loíza','CALLE LOIZA'],
  },
  {
    tag: 'Supermercados',
    ids: ['021','039','046','047','111','112','143','150','219','300','313','326','332','364','451','457','460','462','472','481','492','516','539','542','570','590','592','596','601','625','642','705','726','740','748','749'],
    localizaciones: ['Ponce de León','PONCE DE LEON','PONCE DE LEÓN'],
  },
  {
    tag: 'Universidades',
    ids: ['008','010','163','175','317','373','392','425','445','466','467','469','480','491','549','572','739','CE001'],
    localizaciones: [],
  },
  {
    tag: 'Bancos y Cooperativas',
    ids: ['042','048','462','472','493','513','055','079','115','125','176','326','342','426','437','514','207'],
    localizaciones: [],
  },
  {
    tag: 'Farmacias',
    ids: ['116','117','123','505','549','656','113','308','655','234','592'],
    localizaciones: [],
  },
  {
    tag: 'Centros Comerciales y Retail',
    ids: ['031','046','047B','082','504','101','650','671','191','345','044','045','460','632','099','137','465','539','740','605','158','429'],
    localizaciones: [],
  },
  {
    tag: 'Edificios Gubernamentales',
    ids: ['112','148','305','393','581','034','237','430','436','503','AMA07','038A','038B','040A','040B','362','563','AMA06','013','390','578','653','704'],
    localizaciones: [],
  },
  {
    tag: 'Entretenimiento y Parques',
    ids: ['094','AMA05','306','517','AMA03','398','534','AMA04','AMA01'],
    localizaciones: [],
  },
  {
    tag: 'Cadenas de Comida Rápida',
    ids: ['573','617','735','738','397','390','489','505','196','508','747B','T007','T001','176','098','683'],
    localizaciones: [],
  },
  {
    tag: 'Restaurantes y Cafés',
    ids: ['675','258B','091','065','416','524','700','139','681','749','530','685','507','651','686','349','359','449','488','745'],
    localizaciones: [],
  },
  {
    tag: 'Gasolineras',
    ids: ['004','021','028','028A','028B','028C','028D','028E','028F','028G','028H','050','052','092A','092B','111','256','364','458','461A','461B','498','506','593','598','599','750'],
    localizaciones: [],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Fetch all paradas
const [paradas] = await conn.query('SELECT id, cobertizo_id, localizacion, tags FROM paradas');
console.log(`Loaded ${paradas.length} paradas from DB`);

let updated = 0;
let skipped = 0;

for (const parada of paradas) {
  const cobId = (parada.cobertizo_id || '').trim().toUpperCase();
  const loc = (parada.localizacion || '').trim();
  
  // Collect all matching tags for this parada
  const matchedTags = new Set();
  
  for (const rule of TAG_RULES) {
    // Check by ID (case-insensitive)
    const idMatch = rule.ids.some(id => id.trim().toUpperCase() === cobId);
    // Check by localizacion (partial, case-insensitive)
    const locMatch = rule.localizaciones.some(l => 
      loc.toUpperCase().includes(l.toUpperCase())
    );
    if (idMatch || locMatch) {
      matchedTags.add(rule.tag);
    }
  }
  
  if (matchedTags.size === 0) {
    skipped++;
    continue;
  }
  
  const tagsJson = JSON.stringify([...matchedTags]);
  await conn.query('UPDATE paradas SET tags = ? WHERE id = ?', [tagsJson, parada.id]);
  updated++;
}

console.log(`Done. Updated: ${updated} paradas, Skipped (no tags): ${skipped}`);

// Show summary of tag distribution
const [tagCounts] = await conn.query(`
  SELECT tags, COUNT(*) as count 
  FROM paradas 
  WHERE tags IS NOT NULL AND tags != '[]'
  GROUP BY tags
  ORDER BY count DESC
  LIMIT 20
`);
console.log('\nTag distribution sample:');
for (const row of tagCounts.slice(0, 10)) {
  console.log(`  ${row.tags}: ${row.count}`);
}

// Count total tagged
const [total] = await conn.query("SELECT COUNT(*) as c FROM paradas WHERE tags IS NOT NULL AND tags != 'null'");
console.log(`\nTotal paradas with tags: ${total[0].c}`);

await conn.end();
