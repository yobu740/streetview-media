/**
 * Scheduled background jobs for Streetview Media.
 * Runs on server startup and repeats at configured intervals.
 */

import { getDb } from "./db";
import { paradas } from "../drizzle/schema";
import { and, eq, lte, isNotNull } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

/**
 * Check for En Construccion paradas whose estimated availability date has passed.
 * Sends an owner notification for each one that hasn't been notified yet today.
 * Runs once per day.
 */
export async function checkConstruccionAvailabilityDates() {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    // Find paradas that are still En Construccion AND whose fechaDisponibilidad has passed
    const overdue = await db
      .select()
      .from(paradas)
      .where(
        and(
          eq(paradas.enConstruccion, 1),
          isNotNull(paradas.fechaDisponibilidad),
          lte(paradas.fechaDisponibilidad, today)
        )
      );

    if (overdue.length === 0) return;

    const lines = overdue.map((p) => {
      const fechaDisp = p.fechaDisponibilidad
        ? new Date(p.fechaDisponibilidad).toLocaleDateString("es-PR")
        : "—";
      return `• ${p.cobertizoId} — ${p.localizacion || p.direccion || "Sin dirección"} (fecha estimada: ${fechaDisp})`;
    });

    await notifyOwner({
      title: `⚠️ ${overdue.length} cara(s) En Construcción con fecha de disponibilidad vencida`,
      content:
        `Las siguientes caras están marcadas como En Construcción y su fecha estimada de disponibilidad ya pasó. ` +
        `Por favor revisa su estado en el módulo de Mantenimiento:\n\n${lines.join("\n")}`,
    });

    console.log(
      `[ScheduledJobs] Notified owner: ${overdue.length} En Construccion parada(s) overdue.`
    );
  } catch (err) {
    console.error("[ScheduledJobs] Error in checkConstruccionAvailabilityDates:", err);
  }
}

/**
 * Check for Removida paradas whose estimated return date has passed.
 * Sends an owner notification so they can be reactivated manually.
 * Runs once per day.
 */
export async function checkRemovidaReturnDates() {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    // Find paradas that are still Removida AND whose fechaRetorno has passed
    const overdue = await db
      .select()
      .from(paradas)
      .where(
        and(
          eq(paradas.removida, 1),
          isNotNull(paradas.fechaRetorno),
          lte(paradas.fechaRetorno, today)
        )
      );

    if (overdue.length === 0) return;

    const lines = overdue.map((p) => {
      const fechaRet = p.fechaRetorno
        ? new Date(p.fechaRetorno).toLocaleDateString("es-PR")
        : "—";
      return `• ${p.cobertizoId} — ${p.localizacion || p.direccion || "Sin dirección"} (fecha estimada de retorno: ${fechaRet})`;
    });

    await notifyOwner({
      title: `🔴 ${overdue.length} cara(s) Removida(s) con fecha de retorno vencida`,
      content:
        `Las siguientes caras están marcadas como Removidas y su fecha estimada de retorno ya pasó. ` +
        `Por favor revisa su estado en el módulo de Mantenimiento:\n\n${lines.join("\n")}`,
    });

    console.log(
      `[ScheduledJobs] Notified owner: ${overdue.length} Removida parada(s) overdue.`
    );
  } catch (err) {
    console.error("[ScheduledJobs] Error in checkRemovidaReturnDates:", err);
  }
}

/**
 * Start all scheduled jobs.
 * Call this once from server startup.
 */
export function startScheduledJobs() {
  // Run once on startup (after a short delay to let DB connect)
  setTimeout(async () => {
    await checkConstruccionAvailabilityDates();
    await checkRemovidaReturnDates();
  }, 10_000);

  // Then repeat every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    await checkConstruccionAvailabilityDates();
    await checkRemovidaReturnDates();
  }, TWENTY_FOUR_HOURS);

  console.log("[ScheduledJobs] Started: checkConstruccionAvailabilityDates + checkRemovidaReturnDates (daily)");
}
