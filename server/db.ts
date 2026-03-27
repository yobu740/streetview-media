import { eq, ne, asc, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// Notification helpers
import { notifications, InsertNotification, anuncios } from "../drizzle/schema";

export async function createNotification(notification: InsertNotification): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create notification: database not available");
    return;
  }

  try {
    await db.insert(notifications).values(notification);
  } catch (error) {
    console.error("[Database] Failed to create notification:", error);
    throw error;
  }
}

export async function getNotificationsByUserId(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get notifications: database not available");
    return [];
  }

  const { and, ne } = await import("drizzle-orm");
  const result = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), ne(notifications.ignorada, 1)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return result;
}

export async function ignoreNotification(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot ignore notification: database not available");
    return;
  }

  try {
    await db
      .update(notifications)
      .set({ ignorada: 1, read: 1 })
      .where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error("[Database] Failed to ignore notification:", error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot mark notification as read: database not available");
    return;
  }

  try {
    await db
      .update(notifications)
      .set({ read: 1 })
      .where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error("[Database] Failed to mark notification as read:", error);
    throw error;
  }
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get unread count: database not available");
    return 0;
  }

  const { and } = await import("drizzle-orm");
  const result = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, 0)));

  return result.length;
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot mark all notifications as read: database not available");
    return;
  }

  const { and } = await import("drizzle-orm");
  try {
    await db
      .update(notifications)
      .set({ read: 1 })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, 0)));
  } catch (error) {
    console.error("[Database] Failed to mark all notifications as read:", error);
    throw error;
  }
}

// Anuncio approval helpers
export async function updateAnuncioApprovalStatus(
  anuncioId: number,
  approvalStatus: "pending" | "approved" | "rejected",
  approvedBy: number,
  approvedByName?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update approval status: database not available");
    return;
  }

  try {
    const updateData: any = {
      approvalStatus,
      approvedBy,
      approvedAt: new Date(),
    };
    
    // When approved, also set estado to Programado
    if (approvalStatus === "approved") {
      updateData.estado = "Programado";
    }
    
    await db
      .update(anuncios)
      .set(updateData)
      .where(eq(anuncios.id, anuncioId));
    
    // Record history entry for approval/rejection
    const accionMap: Record<string, string> = {
      approved: "Aprobado",
      rejected: "Rechazado",
      pending: "Pendiente",
    };
    await createAnuncioHistoryEntry({
      anuncioId,
      userId: approvedBy,
      userName: approvedByName,
      accion: accionMap[approvalStatus] || approvalStatus,
      campoModificado: "approvalStatus",
      valorAnterior: "pending",
      valorNuevo: approvalStatus,
      detalles: `Reserva ${accionMap[approvalStatus]?.toLowerCase() || approvalStatus} por ${approvedByName || `Usuario #${approvedBy}`}`,
    });
  } catch (error) {
    console.error("[Database] Failed to update approval status:", error);
    throw error;
  }
}

// Anuncio history tracking
export async function createAnuncioHistoryEntry(entry: {
  anuncioId: number;
  userId?: number;
  userName?: string;
  accion: string;
  campoModificado?: string;
  valorAnterior?: string;
  valorNuevo?: string;
  detalles?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create history entry: database not available");
    return;
  }

  try {
    const { anuncioHistorial } = await import("../drizzle/schema");
    await db.insert(anuncioHistorial).values(entry);
  } catch (error) {
    console.error("[Database] Failed to create history entry:", error);
    throw error;
  }
}

export async function getAnuncioHistory(anuncioId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get history: database not available");
    return [];
  }

  const { anuncioHistorial } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(anuncioHistorial)
    .where(eq(anuncioHistorial.anuncioId, anuncioId))
    .orderBy(desc(anuncioHistorial.createdAt));

  return result;
}

// ─── Instalaciones helpers ───────────────────────────────────────────────────

export async function createInstalacion(entry: {
  anuncioId: number;
  paradaId: number;
  fromParadaId?: number;
  estado: "Programado" | "Relocalizacion" | "CambioArte";
  notas?: string;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create instalacion: database not available");
    return;
  }
  try {
    const { instalaciones } = await import("../drizzle/schema");
    await db.insert(instalaciones).values({
      anuncioId: entry.anuncioId,
      paradaId: entry.paradaId,
      fromParadaId: entry.fromParadaId ?? null,
      estado: entry.estado,
      notas: entry.notas ?? null,
    });
  } catch (error) {
    console.error("[Database] Failed to create instalacion:", error);
    throw error;
  }
}

export async function getInstalaciones() {
  const db = await getDb();
  if (!db) return [];
  const { instalaciones, anuncios, paradas } = await import("../drizzle/schema");
  const { alias } = await import("drizzle-orm/mysql-core");
  const fromParadas = alias(paradas, "from_paradas");
  const result = await db
    .select({
      id: instalaciones.id,
      anuncioId: instalaciones.anuncioId,
      paradaId: instalaciones.paradaId,
      fromParadaId: instalaciones.fromParadaId,
      estado: instalaciones.estado,
      fotoInstalacion: instalaciones.fotoInstalacion,
      instaladoAt: instalaciones.instaladoAt,
      instaladoPor: instalaciones.instaladoPor,
      notas: instalaciones.notas,
      createdAt: instalaciones.createdAt,
      updatedAt: instalaciones.updatedAt,
      // Anuncio fields
      producto: anuncios.producto,
      cliente: anuncios.cliente,
      tipo: anuncios.tipo,
      fechaInicio: anuncios.fechaInicio,
      fechaFin: anuncios.fechaFin,
      estadoAnuncio: anuncios.estado,
      arteUrl: anuncios.notas, // re-use notas field for arteUrl lookup — actual arte stored separately
      // Parada (destination) fields
      cobertizoId: paradas.cobertizoId,
      orientacion: paradas.orientacion,
      direccion: paradas.direccion,
      localizacion: paradas.localizacion,
      flowCat: paradas.flowCat,
      coordenadasLat: paradas.coordenadasLat,
      coordenadasLng: paradas.coordenadasLng,
      // From parada (origin) fields — only set for Relocalizacion
      fromCobertizoId: fromParadas.cobertizoId,
      fromOrientacion: fromParadas.orientacion,
      fromLocalizacion: fromParadas.localizacion,
    })
    .from(instalaciones)
    .innerJoin(anuncios, eq(instalaciones.anuncioId, anuncios.id))
    .innerJoin(paradas, eq(instalaciones.paradaId, paradas.id))
    .leftJoin(fromParadas, eq(instalaciones.fromParadaId, fromParadas.id))
    .where(ne(instalaciones.estado, "Instalado" as const))
    .orderBy(asc(paradas.flowCat), asc(paradas.cobertizoId));
  return result;
}

export async function markInstalacionInstalada(
  instalacionId: number,
  instaladoPor: string,
  fotoInstalacion?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { instalaciones, anuncios, paradas } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  // Get the instalacion to find the anuncioId and paradaId
  const [inst] = await db
    .select()
    .from(instalaciones)
    .where(eq(instalaciones.id, instalacionId))
    .limit(1);

  if (!inst) throw new Error("Instalacion not found");

  // Mark instalacion as Instalado
  await db
    .update(instalaciones)
    .set({
      estado: "Instalado",
      instaladoAt: new Date(),
      instaladoPor,
      fotoInstalacion: fotoInstalacion ?? null,
    })
    .where(eq(instalaciones.id, instalacionId));

  // Automatically set the anuncio estado to Activo
  await db
    .update(anuncios)
    .set({ estado: "Activo" })
    .where(eq(anuncios.id, inst.anuncioId));

  // Auto-sync: if a foto was provided, update the parada's fotoUrl so the detail view stays current
  if (fotoInstalacion && inst.paradaId) {
    await db
      .update(paradas)
      .set({ fotoUrl: fotoInstalacion })
      .where(eq(paradas.id, inst.paradaId));
  }

  return inst.anuncioId;
}

export async function updateInstalacionFoto(instalacionId: number, fotoUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { instalaciones, paradas } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  // Update the installation photo
  await db
    .update(instalaciones)
    .set({ fotoInstalacion: fotoUrl })
    .where(eq(instalaciones.id, instalacionId));

  // Auto-sync: also update the parada's fotoUrl so the detail view in Admin stays current
  const instalacion = await db
    .select({ paradaId: instalaciones.paradaId })
    .from(instalaciones)
    .where(eq(instalaciones.id, instalacionId))
    .limit(1);

  if (instalacion[0]?.paradaId) {
    await db
      .update(paradas)
      .set({ fotoUrl })
      .where(eq(paradas.id, instalacion[0].paradaId));
  }
}

export async function getInstalacionByAnuncioId(anuncioId: number) {
  const db = await getDb();
  if (!db) return null;
  const { instalaciones } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(instalaciones)
    .where(eq(instalaciones.anuncioId, anuncioId))
    .limit(1);
  return result[0] ?? null;
}

export async function backfillInstalaciones(): Promise<{ created: number; skipped: number }> {
  const db = await getDb();
  if (!db) return { created: 0, skipped: 0 };
  const { anuncios, instalaciones } = await import("../drizzle/schema");
  // Get all Programado anuncios that have a paradaId
  const programados = await db
    .select()
    .from(anuncios)
    .where(eq(anuncios.estado, "Programado"));
  let created = 0;
  let skipped = 0;
  for (const anuncio of programados) {
    if (!anuncio.paradaId) { skipped++; continue; }
    // Check if already has an instalacion record
    const existing = await db
      .select({ id: instalaciones.id })
      .from(instalaciones)
      .where(eq(instalaciones.anuncioId, anuncio.id))
      .limit(1);
    if (existing.length > 0) { skipped++; continue; }
    await db.insert(instalaciones).values({
      anuncioId: anuncio.id,
      paradaId: anuncio.paradaId,
      estado: "Programado",
    });
    created++;
  }
  return { created, skipped };
}

export async function getInstalacionesHistorial() {
  const db = await getDb();
  if (!db) return [];
  const { instalaciones, anuncios, paradas } = await import("../drizzle/schema");
  const { eq, asc } = await import("drizzle-orm");
  const result = await db
    .select({
      id: instalaciones.id,
      anuncioId: instalaciones.anuncioId,
      paradaId: instalaciones.paradaId,
      estado: instalaciones.estado,
      fotoInstalacion: instalaciones.fotoInstalacion,
      instaladoAt: instalaciones.instaladoAt,
      instaladoPor: instalaciones.instaladoPor,
      notas: instalaciones.notas,
      createdAt: instalaciones.createdAt,
      // Anuncio fields
      producto: anuncios.producto,
      cliente: anuncios.cliente,
      tipo: anuncios.tipo,
      fechaInicio: anuncios.fechaInicio,
      fechaFin: anuncios.fechaFin,
      estadoAnuncio: anuncios.estado,
      arteUrl: anuncios.notas,
      // Parada fields
      cobertizoId: paradas.cobertizoId,
      orientacion: paradas.orientacion,
      direccion: paradas.direccion,
      localizacion: paradas.localizacion,
      flowCat: paradas.flowCat,
      coordenadasLat: paradas.coordenadasLat,
      coordenadasLng: paradas.coordenadasLng,
    })
    .from(instalaciones)
    .innerJoin(anuncios, eq(instalaciones.anuncioId, anuncios.id))
    .innerJoin(paradas, eq(instalaciones.paradaId, paradas.id))
    .where(eq(instalaciones.estado, "Instalado" as const))
    .orderBy(asc(instalaciones.instaladoAt));
  return result;
}

// ONE-TIME backfill: sync all existing installation photos to their parada's fotoUrl
export async function syncInstalacionFotosToParadas(): Promise<{ synced: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { instalaciones, paradas } = await import("../drizzle/schema");
  const { eq, isNotNull } = await import("drizzle-orm");

  // Get all instalaciones that have a foto
  const withFotos = await db
    .select({ id: instalaciones.id, paradaId: instalaciones.paradaId, fotoInstalacion: instalaciones.fotoInstalacion })
    .from(instalaciones)
    .where(isNotNull(instalaciones.fotoInstalacion));

  let synced = 0;
  let skipped = 0;

  for (const inst of withFotos) {
    if (!inst.paradaId || !inst.fotoInstalacion) { skipped++; continue; }
    await db
      .update(paradas)
      .set({ fotoUrl: inst.fotoInstalacion })
      .where(eq(paradas.id, inst.paradaId));
    synced++;
  }

  return { synced, skipped };
}

import { clientes, contratos, contratoItems, InsertCliente, InsertContrato, InsertContratoItem } from "../drizzle/schema";

// ─── Clientes ────────────────────────────────────────────────────────────────

export async function listClientes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientes).orderBy(clientes.nombre);
}

export async function getClienteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(clientes).where(eq(clientes.id, id));
  return rows[0] ?? null;
}

export async function createCliente(data: InsertCliente) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(clientes).values(data);
  return result[0].insertId as number;
}

export async function updateCliente(id: number, data: Partial<InsertCliente>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(clientes).set(data).where(eq(clientes.id, id));
}

export async function deleteCliente(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(clientes).where(eq(clientes.id, id));
}

// ─── Contratos ───────────────────────────────────────────────────────────────

export async function listContratos(clienteId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = clienteId
    ? await db.select().from(contratos).where(eq(contratos.clienteId, clienteId)).orderBy(contratos.fecha)
    : await db.select().from(contratos).orderBy(contratos.fecha);
  // Attach items to each contract so the edit modal can pre-populate them
  const withItems = await Promise.all(
    rows.map(async (c) => {
      const items = await db.select().from(contratoItems).where(eq(contratoItems.contratoId, c.id)).orderBy(contratoItems.orden);
      return { ...c, items };
    })
  );
  return withItems;
}

export async function getContratoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(contratos).where(eq(contratos.id, id));
  return rows[0] ?? null;
}

export async function getContratoItems(contratoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contratoItems).where(eq(contratoItems.contratoId, contratoId)).orderBy(contratoItems.orden);
}

export async function createContrato(data: InsertContrato, items: InsertContratoItem[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(contratos).values(data);
  const contratoId = result[0].insertId as number;
  if (items.length > 0) {
    await db.insert(contratoItems).values(items.map((item, i) => ({ ...item, contratoId, orden: i })));
  }
  return contratoId;
}

export async function updateContrato(id: number, data: Partial<InsertContrato>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contratos).set(data).where(eq(contratos.id, id));
}

export async function updateContratoItems(contratoId: number, items: InsertContratoItem[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contratoItems).where(eq(contratoItems.contratoId, contratoId));
  if (items.length > 0) {
    await db.insert(contratoItems).values(items.map((item, i) => ({ ...item, contratoId, orden: i })));
  }
}

export async function deleteContrato(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contratoItems).where(eq(contratoItems.contratoId, id));
  await db.delete(contratos).where(eq(contratos.id, id));
}

export async function updateContratoPdfUrl(id: number, pdfUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contratos).set({ pdfUrl }).where(eq(contratos.id, id));
}

// ─── Exhibit A helpers ────────────────────────────────────────────────────────
export async function getContratoExhibitA(contratoId: number) {
  const { contratoExhibitA } = await import("../drizzle/schema");
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contratoExhibitA)
    .where(eq(contratoExhibitA.contratoId, contratoId))
    .orderBy(asc(contratoExhibitA.orden));
}

export async function updateContratoExhibitA(
  contratoId: number,
  rows: Array<{ localizacion: string; cobertizo: string; direccion: string; iop?: string | null; producto?: string | null; fb?: string | null }>
) {
  const { contratoExhibitA } = await import("../drizzle/schema");
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contratoExhibitA).where(eq(contratoExhibitA.contratoId, contratoId));
  if (rows.length > 0) {
    await db.insert(contratoExhibitA).values(
      rows.map((r, i) => ({
        contratoId,
        localizacion: r.localizacion,
        cobertizo: r.cobertizo,
        direccion: r.direccion,
        iop: r.iop ?? "",
        producto: r.producto ?? "",
        fb: r.fb ?? "",
        orden: i,
      }))
    );
  }
}
