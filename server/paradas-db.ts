import { eq, and, gte, lte, desc, asc, like, or } from "drizzle-orm";
import { paradas, anuncios, type Parada, type Anuncio, type InsertParada, type InsertAnuncio } from "../drizzle/schema";
import { getDb } from "./db";

// ========== PARADAS ==========

export async function getAllParadas() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paradas).orderBy(asc(paradas.localizacion));
}

export async function getParadaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(paradas).where(eq(paradas.id, id)).limit(1);
  return result[0] || null;
}

export async function searchParadas(searchTerm: string) {
  const db = await getDb();
  if (!db) return [];
  
  const searchPattern = `%${searchTerm}%`;
  
  // First, search for paradas by ID, location, address, or route
  const paradaResults = await db.select().from(paradas).where(
    or(
      like(paradas.cobertizoId, searchPattern),
      like(paradas.localizacion, searchPattern),
      like(paradas.direccion, searchPattern),
      like(paradas.ruta, searchPattern)
    )
  );
  
  // Then, search for paradas that have anuncios matching the client name
  const anuncioResults = await db.select({
    id: paradas.id,
    cobertizoId: paradas.cobertizoId,
    localizacion: paradas.localizacion,
    direccion: paradas.direccion,
    orientacion: paradas.orientacion,
    flowCat: paradas.flowCat,
    ruta: paradas.ruta,
    coordenadasLat: paradas.coordenadasLat,
    coordenadasLng: paradas.coordenadasLng,
    tipoFormato: paradas.tipoFormato,
    fotoUrl: paradas.fotoUrl,
    activa: paradas.activa,
    createdAt: paradas.createdAt,
    updatedAt: paradas.updatedAt,
  })
  .from(paradas)
  .innerJoin(anuncios, eq(paradas.id, anuncios.paradaId))
  .where(like(anuncios.cliente, searchPattern));
  
  // Combine results and remove duplicates
  const allResults = [...paradaResults, ...anuncioResults];
  const uniqueResults = Array.from(
    new Map(allResults.map(p => [p.id, p])).values()
  );
  
  // Sort by location
  return uniqueResults.sort((a, b) => 
    (a.localizacion || '').localeCompare(b.localizacion || '')
  );
}

export async function createParada(data: InsertParada) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(paradas).values(data);
  
  // Get the last inserted parada by cobertizoId
  const inserted = await db.select().from(paradas).where(eq(paradas.cobertizoId, data.cobertizoId)).limit(1);
  return inserted[0]?.id || 0;
}

export async function updateParada(id: number, data: Partial<InsertParada>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(paradas).set(data).where(eq(paradas.id, id));
  return true;
}

export async function deleteParada(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First delete all associated anuncios
  await db.delete(anuncios).where(eq(anuncios.paradaId, id));
  
  // Then delete the parada
  await db.delete(paradas).where(eq(paradas.id, id));
  return true;
}

// ========== ANUNCIOS ==========

export async function getAllAnuncios() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(anuncios).orderBy(desc(anuncios.createdAt));
}

export async function getAnunciosByParadaId(paradaId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(anuncios).where(eq(anuncios.paradaId, paradaId)).orderBy(desc(anuncios.fechaInicio));
}

export async function getActiveAnuncios() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  return await db.select().from(anuncios).where(
    and(
      eq(anuncios.estado, "Activo"),
      lte(anuncios.fechaInicio, now),
      gte(anuncios.fechaFin, now)
    )
  ).orderBy(desc(anuncios.fechaInicio));
}

export async function createAnuncio(data: InsertAnuncio) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(anuncios).values(data);
  
  // Get the last inserted anuncio by paradaId and cliente
  const inserted = await db.select().from(anuncios)
    .where(
      and(
        eq(anuncios.paradaId, data.paradaId),
        eq(anuncios.cliente, data.cliente)
      )
    )
    .orderBy(desc(anuncios.id))
    .limit(1);
  return inserted[0]?.id || 0;
}

export async function updateAnuncio(id: number, data: Partial<InsertAnuncio>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(anuncios).set(data).where(eq(anuncios.id, id));
  return true;
}

export async function deleteAnuncio(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(anuncios).where(eq(anuncios.id, id));
  return true;
}

// ========== DISPONIBILIDAD ==========

export async function getParadasDisponibles(fechaInicio: Date, fechaFin: Date) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all paradas
  const allParadas = await db.select().from(paradas).where(eq(paradas.activa, 1));
  
  // Get anuncios that overlap with the requested date range
  const overlappingAnuncios = await db.select().from(anuncios).where(
    and(
      or(
        and(
          lte(anuncios.fechaInicio, fechaFin),
          gte(anuncios.fechaFin, fechaInicio)
        )
      ),
      eq(anuncios.estado, "Activo")
    )
  );
  
  // Create a set of occupied parada IDs
  const occupiedParadaIds = new Set(overlappingAnuncios.map(a => a.paradaId));
  
  // Filter out occupied paradas
  return allParadas.filter(p => !occupiedParadaIds.has(p.id));
}

export async function checkParadaDisponibilidad(paradaId: number, fechaInicio: Date, fechaFin: Date) {
  const db = await getDb();
  if (!db) return true;
  
  // Check if there are any overlapping anuncios
  const overlapping = await db.select().from(anuncios).where(
    and(
      eq(anuncios.paradaId, paradaId),
      or(
        and(
          lte(anuncios.fechaInicio, fechaFin),
          gte(anuncios.fechaFin, fechaInicio)
        )
      ),
      eq(anuncios.estado, "Activo")
    )
  ).limit(1);
  
  return overlapping.length === 0;
}
