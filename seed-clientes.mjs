// Seed script: import existing clients and contracts
// Run with: node seed-clientes.mjs

import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const db = await createConnection(process.env.DATABASE_URL);

// ─── Clients ──────────────────────────────────────────────────────────────────

const clients = [
  {
    nombre: "ARCO PUBLICIDAD",
    esAgencia: 1,
    direccion: "1511 Ave. Ponce de León STE 22",
    ciudad: "San Juan",
    estado: "PR",
    codigoPostal: "00909",
    email: null,
    telefono: null,
    contactoPrincipal: null,
    notas: null,
  },
  {
    nombre: "Badillo Saatchi & Saatchi",
    esAgencia: 1,
    direccion: "PO Box 11905",
    ciudad: "San Juan",
    estado: "PR",
    codigoPostal: "00922-1905",
    email: null,
    telefono: null,
    contactoPrincipal: null,
    notas: null,
  },
  {
    nombre: "Billups, LLC Media",
    esAgencia: 1,
    direccion: "224 W 35th St Ste 500 PMB 196",
    ciudad: "New York",
    estado: "NY",
    codigoPostal: "10001",
    email: null,
    telefono: null,
    contactoPrincipal: null,
    notas: null,
  },
  {
    nombre: "Blue Morpho Creative LLC",
    esAgencia: 0,
    direccion: "550 Calle Aldebaran",
    ciudad: "San Juan",
    estado: "PR",
    codigoPostal: "00929",
    email: null,
    telefono: null,
    contactoPrincipal: null,
    notas: null,
  },
  {
    nombre: "COSVI",
    esAgencia: 0,
    direccion: "PO BOX 363428",
    ciudad: "San Juan",
    estado: "PR",
    codigoPostal: "00936-3428",
    email: null,
    telefono: null,
    contactoPrincipal: null,
    notas: null,
  },
  {
    nombre: "JJ Investment Group LLC",
    esAgencia: 0,
    direccion: "250 Ave. Muñoz Rivera, Suite 350",
    ciudad: "San Juan",
    estado: "PR",
    codigoPostal: "00918",
    email: null,
    telefono: null,
    contactoPrincipal: null,
    notas: null,
  },
  {
    nombre: "OMD",
    esAgencia: 1,
    direccion: "90 Carr 165, Bldg II, 6th FL, Ste 602",
    ciudad: "Guaynabo",
    estado: "PR",
    codigoPostal: "00968",
    email: null,
    telefono: null,
    contactoPrincipal: null,
    notas: null,
  },
  {
    nombre: "Rosado & Toledo",
    esAgencia: 1,
    direccion: "207 Calle del Parque Suite 10",
    ciudad: "San Juan",
    estado: "PR",
    codigoPostal: "00912",
    email: null,
    telefono: null,
    contactoPrincipal: null,
    notas: null,
  },
  {
    nombre: "Say Media",
    esAgencia: 1,
    direccion: "PO Box 195520",
    ciudad: "San Juan",
    estado: "PR",
    codigoPostal: "00919-5520",
    email: null,
    telefono: null,
    contactoPrincipal: null,
    notas: null,
  },
  {
    nombre: "Wilson's Stuff Inc.",
    esAgencia: 0,
    direccion: "Ponce de León 70 Suite 180",
    ciudad: "San Juan",
    estado: "PR",
    codigoPostal: "00918",
    email: null,
    telefono: null,
    contactoPrincipal: null,
    notas: null,
  },
];

// Insert clients and collect their IDs
const clienteIds = {};
for (const c of clients) {
  const [result] = await db.execute(
    `INSERT INTO clientes (nombre, es_agencia, direccion, ciudad, estado, codigo_postal, email, telefono, contacto_principal, notas, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [c.nombre, c.esAgencia, c.direccion, c.ciudad, c.estado, c.codigoPostal, c.email, c.telefono, c.contactoPrincipal, c.notas]
  );
  clienteIds[c.nombre] = result.insertId;
  console.log(`✅ Cliente: ${c.nombre} (id=${result.insertId})`);
}

// ─── Contracts ────────────────────────────────────────────────────────────────

const contracts = [
  {
    clienteNombre: "ARCO PUBLICIDAD",
    numeroContrato: "2026-2",
    numeroPO: null,
    fecha: "2026-02-02",
    customerId: "Taco Bell",
    salesDuration: "February 2026 – November 2026",
    vendedor: "Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$24,000",
    total: "$24,000",
    estado: "Firmado",
    notas: null,
    items: [
      { cantidad: 8, concepto: "Taco Bell – Bus Shelter Advertising", precioPorUnidad: "$300/month", total: "$24,000" },
    ],
  },
  {
    clienteNombre: "Badillo Saatchi & Saatchi",
    numeroContrato: "2026-6",
    numeroPO: "010204/2026",
    fecha: "2026-02-11",
    customerId: "CLARO",
    salesDuration: "February 2026",
    vendedor: "Joyce Torres / Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$360",
    total: "$360",
    estado: "Firmado",
    notas: null,
    items: [
      { cantidad: 1, concepto: "CLARO – Bus Shelter Advertising", precioPorUnidad: "$360", total: "$360" },
    ],
  },
  {
    clienteNombre: "Badillo Saatchi & Saatchi",
    numeroContrato: "2026-12",
    numeroPO: null,
    fecha: "2026-03-03",
    customerId: "CLARO",
    salesDuration: "March 2026",
    vendedor: "Joyce Torres / Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$360",
    total: "$360",
    estado: "Firmado",
    notas: null,
    items: [
      { cantidad: 1, concepto: "CLARO – Bus Shelter Advertising", precioPorUnidad: "$360", total: "$360" },
    ],
  },
  {
    clienteNombre: "Billups, LLC Media",
    numeroContrato: "2026-1",
    numeroPO: "161400",
    fecha: "2026-02-11",
    customerId: "AHF",
    salesDuration: "February 2026 – December 2026",
    vendedor: "Ilia Rivera / Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$22,000",
    total: "$22,000",
    estado: "Firmado",
    notas: null,
    items: [
      { cantidad: 8, concepto: "AHF – Bus Shelter Advertising", precioPorUnidad: "$250/month", total: "$22,000" },
      { cantidad: 1, concepto: "Production", precioPorUnidad: "NO CHARGE", total: "$0" },
    ],
  },
  {
    clienteNombre: "Blue Morpho Creative LLC",
    numeroContrato: "2026-8",
    numeroPO: null,
    fecha: "2026-02-17",
    customerId: "Cooperativa Naguabeña",
    salesDuration: "February 17, 2026 – January 17, 2027",
    vendedor: "Manuel Romero / Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$3,642",
    total: "$3,642",
    estado: "Firmado",
    notas: null,
    items: [
      { cantidad: 1, concepto: "Cooperativa Naguabeña – Bus Shelter Advertising", precioPorUnidad: "$300/month", total: "$3,300" },
      { cantidad: 1, concepto: "Production (first month)", precioPorUnidad: "$42", total: "$42" },
    ],
  },
  {
    clienteNombre: "COSVI",
    numeroContrato: "2026-3",
    numeroPO: null,
    fecha: "2026-02-03",
    customerId: "COSVI",
    salesDuration: "February 2026 – December 2026",
    vendedor: "Betsabe Irizarry / Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$3,850",
    total: "$3,850",
    estado: "Firmado",
    notas: "AVE. AMERICO MIRANDA 226, Fte a Cosvi",
    items: [
      { cantidad: 1, concepto: "COSVI – Bus Shelter Advertising", precioPorUnidad: "$350/month", total: "$3,850" },
      { cantidad: 1, concepto: "Production", precioPorUnidad: "NO CHARGE", total: "$0" },
    ],
  },
  {
    clienteNombre: "JJ Investment Group LLC",
    numeroContrato: "2026-4",
    numeroPO: null,
    fecha: "2026-02-06",
    customerId: "CoC PR - 502",
    salesDuration: "February 2026",
    vendedor: "Isis Guzmán / Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$4,100",
    total: "$4,100",
    estado: "Firmado",
    notas: null,
    items: [
      { cantidad: 10, concepto: "CoC PR-502 – Bus Shelter Advertising", precioPorUnidad: "$350", total: "$3,500" },
      { cantidad: 1, concepto: "Production", precioPorUnidad: "$600", total: "$600" },
    ],
  },
  {
    clienteNombre: "OMD",
    numeroContrato: "2026-7",
    numeroPO: "17761",
    fecha: "2026-02-12",
    customerId: "Arcos Dorados de PR, Inc. (McDonald's)",
    salesDuration: "February 2026",
    vendedor: "Diana Rivera / Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$1,050",
    total: "$1,050",
    estado: "Firmado",
    notas: null,
    items: [
      { cantidad: 3, concepto: "McDonald's – Bus Shelter Advertising", precioPorUnidad: "$350", total: "$1,050" },
    ],
  },
  {
    clienteNombre: "Rosado & Toledo",
    numeroContrato: "2026-5",
    numeroPO: "PO#1408",
    fecha: "2026-03-02",
    customerId: "Mi Banco Pagos",
    salesDuration: "Marzo 2026 – Febrero 2027",
    vendedor: "Kim Torres / Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$4,200",
    total: "$4,200",
    estado: "Firmado",
    notas: null,
    items: [
      { cantidad: 1, concepto: "Mi Banco Pagos – Bus Shelter Advertising", precioPorUnidad: "$350/month", total: "$4,200" },
    ],
  },
  {
    clienteNombre: "Say Media",
    numeroContrato: "2026-9",
    numeroPO: null,
    fecha: "2026-02-18",
    customerId: "Betis",
    salesDuration: "February 25, 2026 – May 24, 2026",
    vendedor: "Zoraida Ramos / Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$4,980",
    total: "$4,980",
    estado: "Firmado",
    notas: null,
    items: [
      { cantidad: 5, concepto: "BETIS – Bus Shelter Advertising", precioPorUnidad: "$300/month", total: "$4,500" },
      { cantidad: 8, concepto: "Production", precioPorUnidad: "$60", total: "$480" },
    ],
  },
  {
    clienteNombre: "Wilson's Stuff Inc.",
    numeroContrato: "2026-11",
    numeroPO: null,
    fecha: "2026-02-27",
    customerId: "Wilson's Stuff",
    salesDuration: "March 2026",
    vendedor: "Carmen Esteve",
    metodoPago: "ACH / Wire Transfer",
    subtotal: "$3,500",
    total: "$3,500",
    estado: "Firmado",
    notas: null,
    items: [
      { cantidad: 10, concepto: "Wilson's Stuff – Bus Shelter Advertising", precioPorUnidad: "$350", total: "$3,500" },
      { cantidad: 1, concepto: "Production", precioPorUnidad: "NO CHARGE", total: "$0" },
    ],
  },
];

for (const c of contracts) {
  const clienteId = clienteIds[c.clienteNombre];
  if (!clienteId) { console.warn(`⚠️ No client found for: ${c.clienteNombre}`); continue; }

  const [result] = await db.execute(
    `INSERT INTO contratos (cliente_id, numero_contrato, numero_po, fecha, customer_id, sales_duration, vendedor, metodo_pago, subtotal, total, notas, estado, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [clienteId, c.numeroContrato, c.numeroPO, c.fecha, c.customerId, c.salesDuration, c.vendedor, c.metodoPago, c.subtotal, c.total, c.notas, c.estado]
  );
  const contratoId = result.insertId;

  for (let i = 0; i < c.items.length; i++) {
    const item = c.items[i];
    await db.execute(
      `INSERT INTO contrato_items (contrato_id, orden, cantidad, concepto, precio_por_unidad, total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [contratoId, i, item.cantidad, item.concepto, item.precioPorUnidad || null, item.total || null]
    );
  }
  console.log(`📄 Contrato ${c.numeroContrato} (${c.clienteNombre}) → id=${contratoId}`);
}

await db.end();
console.log("\n✅ Seed completado.");
