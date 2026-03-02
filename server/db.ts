import { eq } from "drizzle-orm";
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
import { desc } from "drizzle-orm";

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

  const result = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return result;
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
