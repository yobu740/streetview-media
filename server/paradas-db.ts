import { eq, ne, and, or, desc, asc, like, sql, lte, gte, inArray } from "drizzle-orm";
import { paradas, anuncios, type Parada, type Anuncio, type InsertParada, type InsertAnuncio } from "../drizzle/schema";
import { getDb } from "./db";;

// ========== PARADAS ==========

export async function getAllParadas() {
  const db = await getDb();
  if (!db) return [];
  
  // First, auto-update expired anuncios to Finalizado status
  const now = new Date();
  await db
    .update(anuncios)
    .set({ estado: "Finalizado" })
    .where(
      and(
        sql`${anuncios.fechaFin} < ${now}`,
        or(
          eq(anuncios.estado, "Activo"),
          eq(anuncios.estado, "Programado")
        )
      )
    );
  
  // Get all paradas
  const allParadas = await db
    .select()
    .from(paradas)
    .orderBy(asc(paradas.localizacion));
  
  // For each parada, get the most recent active/scheduled anuncio (not expired)
  const result = await Promise.all(
    allParadas.map(async (parada) => {
      const anuncio = await db
        .select()
        .from(anuncios)
        .where(
          and(
            eq(anuncios.paradaId, parada.id),
            eq(anuncios.approvalStatus, "approved"),
            or(
              eq(anuncios.estado, "Activo"),
              eq(anuncios.estado, "Programado")
            ),
            sql`${anuncios.fechaFin} >= ${now}`, // Only get non-expired anuncios
            ne(anuncios.tipo, "Holder") // Holder anuncios don't block availability
          )
        )
        .orderBy(desc(anuncios.fechaInicio))
        .limit(1);

      // Separately fetch the holder anuncio (for badge display only)
      const holderAnuncio = await db
        .select({ id: anuncios.id, producto: anuncios.producto, cliente: anuncios.cliente })
        .from(anuncios)
        .where(
          and(
            eq(anuncios.paradaId, parada.id),
            eq(anuncios.tipo, "Holder"),
            eq(anuncios.approvalStatus, "approved"),
            or(eq(anuncios.estado, "Activo"), eq(anuncios.estado, "Programado")),
            sql`${anuncios.fechaFin} >= ${now}`
          )
        )
        .limit(1);
      
      const currentAnuncio = anuncio[0];
      
      return {
        // Parada fields
        id: parada.id,
        cobertizoId: parada.cobertizoId,
        localizacion: parada.localizacion,
        direccion: parada.direccion,
        orientacion: parada.orientacion,
        flowCat: parada.flowCat,
        ruta: parada.ruta,
        coordenadasLat: parada.coordenadasLat,
        coordenadasLng: parada.coordenadasLng,
        tipoFormato: parada.tipoFormato,
        fotoUrl: parada.fotoUrl,
        producto: parada.producto,
        cliente: parada.cliente,
        activa: parada.activa,
        // Condition fields
        condicionPintada: parada.condicionPintada,
        condicionArreglada: parada.condicionArreglada,
        condicionLimpia: parada.condicionLimpia,
        displayPublicidad: parada.displayPublicidad,
        enConstruccion: parada.enConstruccion,
        fechaDisponibilidad: parada.fechaDisponibilidad,
        removida: parada.removida,
        fechaRetorno: parada.fechaRetorno,
        destacada: parada.destacada,
        createdAt: parada.createdAt,
        updatedAt: parada.updatedAt,
        // Current anuncio fields (null if no anuncio)
        // Convert dates to ISO strings to avoid timezone issues
        anuncioId: currentAnuncio?.id || null,
        anuncioProducto: currentAnuncio?.producto || null,
        anuncioCliente: currentAnuncio?.cliente || null,
        anuncioTipo: currentAnuncio?.tipo || null,
        anuncioFechaInicio: currentAnuncio?.fechaInicio ? currentAnuncio.fechaInicio.toISOString().split('T')[0] + 'T00:00:00.000Z' : null,
        anuncioFechaFin: currentAnuncio?.fechaFin ? currentAnuncio.fechaFin.toISOString().split('T')[0] + 'T00:00:00.000Z' : null,
        anuncioEstado: currentAnuncio?.estado || null,
        // Holder indicator: parada has a Holder anuncio but is available for sale
        isHolder: (holderAnuncio[0]?.id ?? null) !== null,
        holderProducto: holderAnuncio[0]?.producto || null,
      };
    })
  );
  
  return result;
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
  
  const searchPattern = `%${searchTerm.toLowerCase()}%`;
  
  // First, search for paradas by ID, location, address, or route (case-insensitive)
  const paradaResults = await db.select().from(paradas).where(
    or(
      sql`LOWER(${paradas.cobertizoId}) LIKE ${searchPattern}`,
      sql`LOWER(${paradas.localizacion}) LIKE ${searchPattern}`,
      sql`LOWER(${paradas.direccion}) LIKE ${searchPattern}`,
      sql`LOWER(${paradas.ruta}) LIKE ${searchPattern}`
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
    clienteNombre: anuncios.cliente,
  })
  .from(paradas)
  .innerJoin(anuncios, eq(paradas.id, anuncios.paradaId))
  .where(sql`LOWER(${anuncios.cliente}) LIKE ${searchPattern}`);
  
  // Mark paradas with match type
  const paradaResultsWithType = paradaResults.map(p => ({
    ...p,
    matchType: 'parada' as const,
    clienteNombre: null,
  }));
  
  const anuncioResultsWithType = anuncioResults.map(p => ({
    ...p,
    matchType: 'cliente' as const,
  }));
  
  // Combine results and handle duplicates (prefer cliente match if both exist)
  const resultMap = new Map();
  
  for (const result of paradaResultsWithType) {
    resultMap.set(result.id, result);
  }
  
  for (const result of anuncioResultsWithType) {
    const existing = resultMap.get(result.id);
    if (!existing || existing.matchType === 'parada') {
      resultMap.set(result.id, result);
    }
  }
  
  const uniqueResults = Array.from(resultMap.values());
  
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
  const results = await db.select().from(anuncios).orderBy(desc(anuncios.createdAt));
  
  // Convert Date objects to ISO strings to avoid timezone issues
  return results.map(anuncio => ({
    ...anuncio,
    fechaInicio: anuncio.fechaInicio?.toISOString().split('T')[0] + 'T00:00:00.000Z',
    fechaFin: anuncio.fechaFin?.toISOString().split('T')[0] + 'T00:00:00.000Z',
    createdAt: anuncio.createdAt,
    updatedAt: anuncio.updatedAt,
  }));
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
  
  const anuncioId = inserted[0]?.id || 0;
  
  // Log creation in history
  if (anuncioId) {
    const { createAnuncioHistoryEntry } = await import("./db");
    await createAnuncioHistoryEntry({
      anuncioId,
      userId: data.createdBy || undefined,
      accion: "Creado",
      detalles: `Anuncio creado para cliente ${data.cliente} en parada ${data.paradaId}`,
    });
  }
  
  return anuncioId;
}

export async function updateAnuncio(id: number, data: Partial<InsertAnuncio>, userId?: number, userName?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get current anuncio data before update
  const currentAnuncio = await db.select().from(anuncios).where(eq(anuncios.id, id)).limit(1);
  const current = currentAnuncio[0];
  
  if (current) {
    const { createAnuncioHistoryEntry } = await import("./db");
    
    // Log significant changes
    if (data.estado && data.estado !== current.estado) {
      await createAnuncioHistoryEntry({
        anuncioId: id,
        userId,
        userName,
        accion: "Estado cambiado",
        campoModificado: "estado",
        valorAnterior: current.estado,
        valorNuevo: data.estado,
        detalles: `Estado cambiado de ${current.estado} a ${data.estado}`,
      });
    }
    
    if (data.paradaId && data.paradaId !== current.paradaId) {
      // Get parada names for better history tracking
      const oldParada = await db.select().from(paradas).where(eq(paradas.id, current.paradaId)).limit(1);
      const newParada = await db.select().from(paradas).where(eq(paradas.id, data.paradaId)).limit(1);
      
      const oldP = oldParada[0];
      const newP = newParada[0];
      const oldParadaName = oldP
        ? `${oldP.cobertizoId}${oldP.orientacion ? ` [${oldP.orientacion}]` : ''} - ${oldP.localizacion}`
        : `Parada #${current.paradaId}`;
      const newParadaName = newP
        ? `${newP.cobertizoId}${newP.orientacion ? ` [${newP.orientacion}]` : ''} - ${newP.localizacion}`
        : `Parada #${data.paradaId}`;
      
      await createAnuncioHistoryEntry({
        anuncioId: id,
        userId,
        userName,
        accion: "Relocalizado",
        campoModificado: "paradaId",
        valorAnterior: oldParadaName,
        valorNuevo: newParadaName,
        detalles: `Anuncio relocalizado de "${oldParadaName}" a "${newParadaName}"`,
      });
    }
    
    // Log other field changes
    const fieldsToTrack = ['producto', 'cliente', 'tipo', 'fechaInicio', 'fechaFin'] as const;
    for (const field of fieldsToTrack) {
      if (data[field] !== undefined && data[field] !== current[field]) {
        await createAnuncioHistoryEntry({
          anuncioId: id,
          userId,
          userName,
          accion: "Editado",
          campoModificado: field,
          valorAnterior: String(current[field]),
          valorNuevo: String(data[field]),
          detalles: `Campo ${field} actualizado`,
        });
      }
    }
  }
  
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
  
  // Get anuncios that overlap with the requested date range (excluding Holder type)
  const overlappingAnuncios = await db.select().from(anuncios).where(
    and(
      or(
        and(
          lte(anuncios.fechaInicio, fechaFin),
          gte(anuncios.fechaFin, fechaInicio)
        )
      ),
      or(
        eq(anuncios.estado, "Activo"),
        eq(anuncios.estado, "Programado")
      ),
      eq(anuncios.approvalStatus, "approved"),
      ne(anuncios.tipo, "Holder") // Holder anuncios don't block availability
    )
  );
  
  // Create a set of occupied parada IDs
  const occupiedParadaIds = new Set(overlappingAnuncios.map(a => a.paradaId));
  
  // Filter out occupied paradas
  return allParadas.filter(p => !occupiedParadaIds.has(p.id));
}

export async function checkParadaDisponibilidad(paradaId: number, fechaInicio: Date, fechaFin: Date) {
  const db = await getDb();
  if (!db) return { disponible: true, proximaFechaDisponible: null, anuncioActual: null };
  
  // Check if there are any overlapping APPROVED anuncios (excluding Holder type)
  const overlapping = await db.select().from(anuncios).where(
    and(
      eq(anuncios.paradaId, paradaId),
      or(
        and(
          lte(anuncios.fechaInicio, fechaFin),
          gte(anuncios.fechaFin, fechaInicio)
        )
      ),
      or(
        eq(anuncios.estado, "Activo"),
        eq(anuncios.estado, "Programado")
      ),
      eq(anuncios.approvalStatus, "approved"), // Only consider approved anuncios
      ne(anuncios.tipo, "Holder") // Holder anuncios don't block availability
    )
  ).orderBy(anuncios.fechaFin);
  
  if (overlapping.length === 0) {
    return { disponible: true, proximaFechaDisponible: null, anuncioActual: null };
  }
  
  // Find the latest end date among overlapping anuncios
  const latestEndDate = overlapping.reduce((latest, anuncio) => {
    return anuncio.fechaFin > latest ? anuncio.fechaFin : latest;
  }, overlapping[0].fechaFin);
  
  // Add one day to get the next available date
  const nextAvailable = new Date(latestEndDate);
  nextAvailable.setDate(nextAvailable.getDate() + 1);
  
  return {
    disponible: false,
    proximaFechaDisponible: nextAvailable,
    anuncioActual: overlapping[0]
  };
}

// ========== APPROVAL WORKFLOW ==========

export async function getAnuncioById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(anuncios).where(eq(anuncios.id, id)).limit(1);
  return result[0] || null;
}

export async function getPendingAnuncios() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(anuncios).where(eq(anuncios.approvalStatus, "pending")).orderBy(desc(anuncios.createdAt));
}

export async function notifyAdminsOfNewReservation(anuncioId: number, creatorName: string, clientName: string) {
  const db = await getDb();
  if (!db) return;
  
  // Get all admin users
  const { users } = await import("../drizzle/schema");
  const admins = await db.select().from(users).where(eq(users.role, "admin"));
  
  // Create notification for each admin
  const { createNotification } = await import("./db");
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: "reservation_pending",
      title: "Nueva Reserva Pendiente",
      message: `${creatorName} ha creado una nueva reserva para ${clientName}. Requiere aprobación.`,
      relatedId: anuncioId,
      read: 0,
    });
  }
}

export async function getAnunciosByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get anuncios by user: database not available");
    return [];
  }

  try {
    const results = await db
      .select()
      .from(anuncios)
      .leftJoin(paradas, eq(anuncios.paradaId, paradas.id))
      .where(eq(anuncios.createdBy, userId))
      .orderBy(desc(anuncios.createdAt));

    return results.map((row) => ({
      ...row.anuncios,
      parada: row.paradas,
    }));
  } catch (error) {
    console.error("[Database] Failed to get anuncios by user:", error);
    return [];
  }
}

export async function bulkUpdateAnuncioDates(
  searchCliente: string,
  operation: "extend" | "set",
  months?: number,
  newFechaInicio?: Date,
  newFechaFin?: Date
): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot bulk update anuncio dates: database not available");
    return 0;
  }

  try {
    // Find all anuncios matching the cliente search
    const matchingAnuncios = await db
      .select()
      .from(anuncios)
      .where(like(anuncios.cliente, `%${searchCliente}%`));

    if (matchingAnuncios.length === 0) {
      return 0;
    }

    // Update each anuncio
    for (const anuncio of matchingAnuncios) {
      let updateData: any = {};

      if (operation === "extend" && months) {
        // Extend existing dates by X months
        const currentFechaFin = new Date(anuncio.fechaFin);
        currentFechaFin.setMonth(currentFechaFin.getMonth() + months);
        updateData.fechaFin = currentFechaFin;
      } else if (operation === "set" && newFechaInicio && newFechaFin) {
        // Set new dates
        updateData.fechaInicio = newFechaInicio;
        updateData.fechaFin = newFechaFin;
      }

      updateData.updatedAt = new Date();

      await db
        .update(anuncios)
        .set(updateData)
        .where(eq(anuncios.id, anuncio.id));
    }

    console.log(`[Database] Bulk updated ${matchingAnuncios.length} anuncios for cliente: ${searchCliente}`);
    return matchingAnuncios.length;
  } catch (error) {
    console.error("[Database] Failed to bulk update anuncio dates:", error);
    throw error;
  }
}

export async function checkExpiringAnuncios(daysBeforeExpiration: number = 7) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot check expiring anuncios: database not available");
    return [];
  }

  try {
    const today = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysBeforeExpiration);

    // Find anuncios expiring within the specified days
    const expiringAnuncios = await db
      .select()
      .from(anuncios)
      .leftJoin(paradas, eq(anuncios.paradaId, paradas.id))
      .where(
        and(
          gte(anuncios.fechaFin, today),
          lte(anuncios.fechaFin, expirationDate),
          eq(anuncios.estado, "Activo")
        )
      )
      .orderBy(asc(anuncios.fechaFin));

    // Get all seguimiento anuncioIds to mark which ones already have seguimiento
    const { seguimientos } = await import('../drizzle/schema');
    const existingSeguimientos = await db
      .selectDistinct({ anuncioId: seguimientos.anuncioId })
      .from(seguimientos)
      .where(
        inArray(
          seguimientos.anuncioId,
          expiringAnuncios.map(r => r.anuncios.id)
        )
      );
    const seguimientoAnuncioIds = new Set(existingSeguimientos.map(s => s.anuncioId));

    return expiringAnuncios.map((row) => ({
      ...row.anuncios,
      parada: row.paradas,
      hasSeguimiento: seguimientoAnuncioIds.has(row.anuncios.id),
    }));
  } catch (error) {
    console.error("[Database] Failed to check expiring anuncios:", error);
    return [];
  }
}

// ========== FLOWCATS ==========

/**
 * Returns all distinct Flowcat entries (number + localizacion name), sorted by number.
 * Used to populate the Flowcat filter dropdown in the Admin panel.
 */
export async function getDistinctFlowcats() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .selectDistinct({
      flowCat: paradas.flowCat,
      localizacion: paradas.localizacion,
    })
    .from(paradas)
    .where(sql`${paradas.flowCat} IS NOT NULL AND ${paradas.flowCat} != ''`)
    .orderBy(asc(paradas.flowCat));

  // Deduplicate: one entry per flowCat number (use first localizacion found)
  const seen = new Set<string>();
  const result: { flowCat: string; localizacion: string }[] = [];
  for (const row of rows) {
    if (row.flowCat && !seen.has(row.flowCat)) {
      seen.add(row.flowCat);
      result.push({ flowCat: row.flowCat, localizacion: row.localizacion ?? '' });
    }
  }
  return result;
}
