import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, vendedorProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as paradasDb from "./paradas-db";
import { uploadParadaFoto } from "./upload-foto";
import * as db from "./db";
import { gte } from "drizzle-orm";
import { getDb } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Paradas management router
  paradas: router({
    list: publicProcedure.query(async () => {
      return await paradasDb.getAllParadas();
    }),

    // Returns all distinct flowcat values (number + localizacion name) for filter dropdown
    getFlowcats: publicProcedure.query(async () => {
      return await paradasDb.getDistinctFlowcats();
    }),
    
    search: publicProcedure
      .input(z.object({ searchTerm: z.string() }))
      .query(async ({ input }) => {
        return await paradasDb.searchParadas(input.searchTerm);
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await paradasDb.getParadaById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        cobertizoId: z.string(),
        localizacion: z.string(),
        direccion: z.string(),
        orientacion: z.string(), // Required for uniqueness with cobertizoId
        flowCat: z.string().optional(),
        ruta: z.string().optional(),
        coordenadasLat: z.string().optional(),
        coordenadasLng: z.string().optional(),
        tipoFormato: z.enum(["Fija", "Digital"]),
        activa: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await paradasDb.createParada(input);
        return { id };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          cobertizoId: z.string().optional(),
          localizacion: z.string().optional(),
          direccion: z.string().optional(),
          orientacion: z.string(), // Required for uniqueness with cobertizoId
          flowCat: z.string().optional(),
          ruta: z.string().optional(),
          coordenadasLat: z.string().optional(),
          coordenadasLng: z.string().optional(),
          tipoFormato: z.enum(["Fija", "Digital"]).optional(),
          activa: z.number().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await paradasDb.updateParada(input.id, input.data);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await paradasDb.deleteParada(input.id);
        return { success: true };
      }),
    
    uploadFoto: protectedProcedure
      .input(z.object({
        paradaId: z.number(),
        cobertizoId: z.string(),
        fotoBase64: z.string(),
      }))
      .mutation(async ({ input }) => {
        const fotoUrl = await uploadParadaFoto(input.fotoBase64, input.cobertizoId);
        await paradasDb.updateParada(input.paradaId, { fotoUrl });
        return { fotoUrl };
      }),
    
    updateLocation: adminProcedure
      .input(z.object({
        paradaId: z.number(),
        localizacion: z.string().optional(),
        direccion: z.string().optional(),
        ruta: z.string().optional(),
        orientacion: z.string().optional(),
        flowCat: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { paradaId, ...updates } = input;
        await paradasDb.updateParada(paradaId, updates);
        return { success: true };
      }),
    
    updateCondicion: protectedProcedure
      .input(z.object({
        paradaId: z.number(),
        condicionPintada: z.number().optional(),
        condicionArreglada: z.number().optional(),
        condicionLimpia: z.number().optional(),
        displayPublicidad: z.enum(["Si", "No", "N/A"]).optional(),
        enConstruccion: z.number().optional(),
        fechaDisponibilidad: z.date().nullable().optional(),
        removida: z.number().optional(),
        fechaRetorno: z.date().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { paradaId, ...updates } = input;
        
        // Get current parada state before update
        const { getDb } = await import("./db");
        const { paradas, mantenimientoHistorial } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [currentParada] = await db
          .select()
          .from(paradas)
          .where(eq(paradas.id, paradaId))
          .limit(1);
        
        if (!currentParada) throw new Error("Parada not found");
        
        // Track changes in history
        const historyEntries = [];
        
        if (updates.condicionPintada !== undefined && updates.condicionPintada !== currentParada.condicionPintada) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "Pintada",
            valorAnterior: currentParada.condicionPintada ? "Sí" : "No",
            valorNuevo: updates.condicionPintada ? "Sí" : "No",
            notas: null,
          });
        }
        
        if (updates.condicionArreglada !== undefined && updates.condicionArreglada !== currentParada.condicionArreglada) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "Arreglada",
            valorAnterior: currentParada.condicionArreglada ? "Sí" : "No",
            valorNuevo: updates.condicionArreglada ? "Sí" : "No",
            notas: null,
          });
        }
        
        if (updates.condicionLimpia !== undefined && updates.condicionLimpia !== currentParada.condicionLimpia) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "Limpia",
            valorAnterior: currentParada.condicionLimpia ? "Sí" : "No",
            valorNuevo: updates.condicionLimpia ? "Sí" : "No",
            notas: null,
          });
        }
        
        if (updates.displayPublicidad !== undefined && updates.displayPublicidad !== currentParada.displayPublicidad) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "Display Publicidad",
            valorAnterior: currentParada.displayPublicidad,
            valorNuevo: updates.displayPublicidad,
            notas: null,
          });
        }
        
        if (updates.enConstruccion !== undefined && updates.enConstruccion !== currentParada.enConstruccion) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "En Construcción",
            valorAnterior: currentParada.enConstruccion ? "Sí" : "No",
            valorNuevo: updates.enConstruccion ? "Sí" : "No",
            notas: updates.fechaDisponibilidad
              ? `Fecha estimada: ${new Date(updates.fechaDisponibilidad).toLocaleDateString('es-PR')}`
              : null,
          });
        }
        
        if (updates.removida !== undefined && updates.removida !== currentParada.removida) {
          historyEntries.push({
            paradaId,
            userId: ctx.user?.id || null,
            userName: ctx.user?.name || "Sistema",
            campoModificado: "Removida",
            valorAnterior: currentParada.removida ? "Sí" : "No",
            valorNuevo: updates.removida ? "Sí" : "No",
            notas: updates.fechaRetorno
              ? `Fecha estimada de retorno: ${new Date(updates.fechaRetorno).toLocaleDateString('es-PR')}`
              : null,
          });
        }
        
        // Insert history entries
        if (historyEntries.length > 0) {
          await db.insert(mantenimientoHistorial).values(historyEntries);
        }
        
        // Update parada
        await paradasDb.updateParada(paradaId, updates);
        return { success: true };
      }),
    
    disponibles: publicProcedure
      .input(z.object({
        fechaInicio: z.date(),
        fechaFin: z.date(),
      }))
      .query(async ({ input }) => {
        return await paradasDb.getParadasDisponibles(input.fechaInicio, input.fechaFin);
      }),
    
    toggleDestacada: protectedProcedure
      .input(z.object({ paradaId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores pueden marcar caras destacadas.' });
        const { getDb } = await import('./db');
        const { paradas } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const [current] = await db.select({ destacada: paradas.destacada }).from(paradas).where(eq(paradas.id, input.paradaId)).limit(1);
        if (!current) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cara no encontrada.' });
        const newValue = current.destacada ? 0 : 1;
        await db.update(paradas).set({ destacada: newValue }).where(eq(paradas.id, input.paradaId));
        return { success: true, destacada: newValue };
      }),
  }),
  
  // Anuncios management router
  anuncios: router({
    list: protectedProcedure.query(async () => {
      return await paradasDb.getAllAnuncios();
    }),

    topClients: protectedProcedure.query(async () => {
      const { anuncios: anunciosTable } = await import('../drizzle/schema');
      const dbConn = await getDb();
      if (!dbConn) return [];
      const mar2026 = new Date('2026-03-01T00:00:00.000Z');
      const results = await dbConn
        .select({ cliente: anunciosTable.cliente })
        .from(anunciosTable)
        .where(gte(anunciosTable.fechaInicio, mar2026));
      const freq: Record<string, number> = {};
      for (const r of results) {
        freq[r.cliente] = (freq[r.cliente] || 0) + 1;
      }
      return Object.entries(freq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([cliente, count]) => ({ cliente, count }));
    }),
    
    getByParadaId: publicProcedure
      .input(z.object({ paradaId: z.number() }))
      .query(async ({ input }) => {
        return await paradasDb.getAnunciosByParadaId(input.paradaId);
      }),
    
    active: publicProcedure.query(async () => {
      return await paradasDb.getActiveAnuncios();
    }),
    
    /**
     * Create anuncio/reservation
     * - If created by ADMIN: Auto-approved, appears immediately in dashboard and calendar
     * - If created by USER: Pending approval, appears in admin notifications, requires approval to show in calendar
     */
    create: protectedProcedure
      .input(z.object({
        paradaId: z.number(),
        producto: z.string(),
        cliente: z.string(),
        tipo: z.enum(["Fijo", "Bonificación", "Holder"]),
        costoPorUnidad: z.number().optional(),
        fechaInicio: z.date(),
        fechaFin: z.date(),
        estado: z.enum(["Disponible", "Activo", "Programado", "Finalizado", "Inactivo"]).optional(),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const isAdmin = ctx.user.role === "admin";
        
        // CRITICAL: Check if parada is En Construccion BEFORE creating
        const parada = await paradasDb.getParadaById(input.paradaId);
        
        // CRITICAL: Check if parada has display disabled
        if (parada?.displayPublicidad === 'No') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Esta cara no tiene display habilitado y no está disponible para reservas de anuncios.',
          });
        }
        
        if (parada?.enConstruccion) {
          const fechaDisp = parada.fechaDisponibilidad
            ? new Date(parada.fechaDisponibilidad).toLocaleDateString('es-PR')
            : 'fecha no especificada';
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Esta cara está En Construcción y no está disponible para reservas. Fecha estimada de disponibilidad: ${fechaDisp}.`,
          });
        }
        
        if (parada?.removida) {
          const fechaRet = parada.fechaRetorno
            ? new Date(parada.fechaRetorno).toLocaleDateString('es-PR')
            : 'fecha no especificada';
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Esta cara ha sido Removida y no está disponible para reservas. Fecha estimada de retorno: ${fechaRet}.`,
          });
        }
        
        // CRITICAL: Check for overlapping reservations BEFORE creating
        const availability = await paradasDb.checkParadaDisponibilidad(
          input.paradaId,
          input.fechaInicio,
          input.fechaFin
        );
        
        if (!availability.disponible) {
          throw new Error(
            `Esta parada ya está ocupada para las fechas seleccionadas. ` +
            `Próxima fecha disponible: ${availability.proximaFechaDisponible?.toLocaleDateString('es-PR')}`
          );
        }
        
        const id = await paradasDb.createAnuncio({
          ...input,
          costoPorUnidad: input.costoPorUnidad !== undefined ? input.costoPorUnidad.toString() : undefined,
          createdBy: ctx.user.id,
          approvalStatus: isAdmin ? "approved" : "pending",
          approvedBy: isAdmin ? ctx.user.id : undefined,
          approvedAt: isAdmin ? new Date() : undefined,
        });
        
        // Only notify admins if created by non-admin (reservation)
        if (!isAdmin) {
          await paradasDb.notifyAdminsOfNewReservation(id, ctx.user.name || 'Usuario', input.cliente);
        }

        // Auto-create instalacion record when admin creates a Programado anuncio
        if (isAdmin && input.estado === 'Programado') {
          try {
            const { createInstalacion } = await import('./db');
            await createInstalacion({
              anuncioId: id,
              paradaId: input.paradaId,
              estado: 'Programado',
            });
          } catch (e) {
            console.error('[Instalaciones] Failed to create instalacion record:', e);
            // Non-fatal: anuncio was created successfully
          }
        }
        
        return { id };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        paradaId: z.number().optional(),
        producto: z.string().optional(),
        cliente: z.string().optional(),
        tipo: z.enum(["Fijo", "Bonificación", "Holder"]).optional(),
        costoPorUnidad: z.number().optional(),
        fechaInicio: z.date().optional(),
        fechaFin: z.date().optional(),
        estado: z.enum(["Disponible", "Activo", "Programado", "Finalizado", "Inactivo"]).optional(),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, costoPorUnidad, ...data } = input;
        const updateData = {
          ...data,
          ...(costoPorUnidad !== undefined && { costoPorUnidad: costoPorUnidad.toString() }),
        };

        // If paradaId is changing, auto-create a Relocalizacion instalacion record
        if (input.paradaId !== undefined) {
          try {
            const { getDb } = await import('./db');
            const { anuncios } = await import('../drizzle/schema');
            const { eq } = await import('drizzle-orm');
            const db = await getDb();
            if (db) {
              const [current] = await db.select({ paradaId: anuncios.paradaId }).from(anuncios).where(eq(anuncios.id, id)).limit(1);
              if (current && current.paradaId !== input.paradaId) {
                const { createInstalacion } = await import('./db');
                await createInstalacion({
                  anuncioId: id,
                  paradaId: input.paradaId,
                  fromParadaId: current.paradaId ?? undefined,
                  estado: 'Relocalizacion',
                  notas: `Relocalizado desde parada #${current.paradaId}`,
                });
              }
            }
          } catch (e) {
            console.error('[Instalaciones] Failed to create relocalizacion record:', e);
          }
        }

        await paradasDb.updateAnuncio(id, updateData, ctx.user.id, ctx.user.name || ctx.user.openId);
        return { success: true };
      }),
    
    bulkUpdate: adminProcedure
      .input(z.object({
        anuncioIds: z.array(z.number()),
        updates: z.object({
          tipo: z.enum(["Fijo", "Bonificación", "Holder"]).optional(),
          fechaFin: z.date().optional(),
          estado: z.enum(["Disponible", "Activo", "Programado", "Finalizado", "Inactivo"]).optional(),
          producto: z.string().optional(),
          cliente: z.string().optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        const { anuncioIds, updates } = input;
        
        // Update each anuncio
        for (const id of anuncioIds) {
          await paradasDb.updateAnuncio(id, updates, ctx.user.id, ctx.user.name || ctx.user.openId);
        }
        
        return { success: true, count: anuncioIds.length };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await paradasDb.deleteAnuncio(input.id);
        return { success: true };
      }),
    
    cancel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Cancel anuncio by setting estado to "Inactivo"
        // This frees up the parada while keeping history
        await paradasDb.updateAnuncio(input.id, { estado: "Inactivo" }, ctx.user.id, ctx.user.name || ctx.user.openId);
        return { success: true };
      }),
    
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(["Disponible", "Activo", "Programado", "Inactivo", "Finalizado"])
      }))
      .mutation(async ({ input, ctx }) => {
        await paradasDb.updateAnuncio(input.id, { estado: input.estado }, ctx.user.id, ctx.user.name || ctx.user.openId);
        return { success: true };
      }),
    
    bulkUpdateDates: adminProcedure
      .input(z.object({
        searchCliente: z.string(),
        operation: z.enum(["extend", "set"]),
        months: z.number().optional(),
        newFechaInicio: z.date().optional(),
        newFechaFin: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const count = await paradasDb.bulkUpdateAnuncioDates(
          input.searchCliente,
          input.operation,
          input.months,
          input.newFechaInicio,
          input.newFechaFin
        );
        return { success: true, count };
      }),
    
    checkDisponibilidad: publicProcedure
      .input(z.object({
        paradaId: z.number(),
        fechaInicio: z.date(),
        fechaFin: z.date(),
      }))
      .query(async ({ input }) => {
        const result = await paradasDb.checkParadaDisponibilidad(
          input.paradaId,
          input.fechaInicio,
          input.fechaFin
        );
        return result;
      }),
    
    myReservations: protectedProcedure.query(async ({ ctx }) => {
      return await paradasDb.getAnunciosByUserId(ctx.user.id);
    }),
    
    // History tracking
    getHistory: protectedProcedure
      .input(z.object({ anuncioId: z.number() }))
      .query(async ({ input }) => {
        const { getAnuncioHistory } = await import("./db");
        return await getAnuncioHistory(input.anuncioId);
      }),
  }),

  // Notifications router
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getNotificationsByUserId } = await import("./db");
      return await getNotificationsByUserId(ctx.user.id);
    }),
    
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const { getUnreadNotificationCount } = await import("./db");
      return await getUnreadNotificationCount(ctx.user.id);
    }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { markNotificationAsRead } = await import("./db");
        await markNotificationAsRead(input.id);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { markAllNotificationsAsRead } = await import("./db");
        await markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),
    
    ignore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { ignoreNotification } = await import("./db");
        await ignoreNotification(input.id);
        return { success: true };
      }),

    // Create a seguimiento from a campaign_ending notification
    createSeguimiento: protectedProcedure
      .input(z.object({
        notificationId: z.number(),
        anuncioId: z.number(),
        cliente: z.string(),
        producto: z.string().optional(),
        fechaVencimiento: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb, markNotificationAsRead } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Check if a seguimiento already exists for this anuncio and vendedor
        const { eq, and } = await import("drizzle-orm");
        const existing = await db.select().from(seguimientos)
          .where(and(
            eq(seguimientos.anuncioId, input.anuncioId),
            eq(seguimientos.vendedorId, ctx.user!.id)
          ))
          .limit(1);
        
        if (existing.length > 0) {
          // Already exists — just mark notification as read
          await markNotificationAsRead(input.notificationId);
          return { success: true, id: existing[0].id, alreadyExists: true };
        }
        
        // Fetch the actual fechaFin from the anuncio for accuracy
        const { getAnuncioById } = await import("./paradas-db");
        const anuncio = await getAnuncioById(input.anuncioId);
        const fechaVencimiento = anuncio?.fechaFin ? new Date(anuncio.fechaFin) : new Date(input.fechaVencimiento);
        const clienteFromAnuncio = anuncio?.cliente || input.cliente;
        const productoFromAnuncio = anuncio?.producto || input.producto || null;
        
        const [result] = await db.insert(seguimientos).values({
          anuncioId: input.anuncioId,
          vendedorId: ctx.user!.id,
          cliente: clienteFromAnuncio,
          producto: productoFromAnuncio,
          fechaVencimiento,
          estado: "Pendiente",
        });
        
        // Mark the notification as read after creating seguimiento
        await markNotificationAsRead(input.notificationId);
        
        return { success: true, id: result.insertId, alreadyExists: false };
      }),

    expiringAnuncios: adminProcedure.query(async () => {
      return await paradasDb.checkExpiringAnuncios(7);
    }),
  }),
  
  // Approval workflow router
  approvals: router({
    approve: adminProcedure
      .input(z.object({ anuncioId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { updateAnuncioApprovalStatus, createNotification } = await import("./db");
        const { getAnuncioById, getParadaById } = await import("./paradas-db");
        
        // Check if the parada is En Construccion before approving
        const anuncioToApprove = await getAnuncioById(input.anuncioId);
        if (anuncioToApprove?.paradaId) {
          const paradaCheck = await getParadaById(anuncioToApprove.paradaId);
          if (paradaCheck?.enConstruccion) {
            const fechaDisp = paradaCheck.fechaDisponibilidad
              ? new Date(paradaCheck.fechaDisponibilidad).toLocaleDateString('es-PR')
              : 'fecha no especificada';
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `No se puede aprobar: la cara está En Construcción. Fecha estimada de disponibilidad: ${fechaDisp}.`,
            });
          }
          if (paradaCheck?.removida) {
            const fechaRet = paradaCheck.fechaRetorno
              ? new Date(paradaCheck.fechaRetorno).toLocaleDateString('es-PR')
              : 'fecha no especificada';
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `No se puede aprobar: la cara ha sido Removida. Fecha estimada de retorno: ${fechaRet}.`,
            });
          }
        }
        
        await updateAnuncioApprovalStatus(input.anuncioId, "approved", ctx.user.id, ctx.user.name || ctx.user.openId);
        
        // Notify the creator
        const anuncio = await getAnuncioById(input.anuncioId);
        if (anuncio && anuncio.createdBy) {
          await createNotification({
            userId: anuncio.createdBy,
            type: "reservation_approved",
            title: "Reserva Aprobada",
            message: `Tu reserva para ${anuncio.cliente} ha sido aprobada por ${ctx.user.name || 'Admin'}.`,
            relatedId: input.anuncioId,
            read: 0,
          });
        }
        
        // Auto-create instalacion record if anuncio is Programado and no record exists yet
        if (anuncio && anuncio.estado === 'Programado' && anuncio.paradaId) {
          try {
            const { createInstalacion, getInstalacionByAnuncioId } = await import('./db');
            const existing = await getInstalacionByAnuncioId(anuncio.id);
            if (!existing) {
              await createInstalacion({
                anuncioId: anuncio.id,
                paradaId: anuncio.paradaId,
                estado: 'Programado',
              });
            }
          } catch (e) {
            console.error('[Instalaciones] Failed to create instalacion on approval:', e);
          }
        }
        
        return { success: true };
      }),
    
    reject: adminProcedure
      .input(z.object({ anuncioId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { updateAnuncioApprovalStatus, createNotification } = await import("./db");
        const { getAnuncioById } = await import("./paradas-db");
        
        await updateAnuncioApprovalStatus(input.anuncioId, "rejected", ctx.user.id, ctx.user.name || ctx.user.openId);
        
        // Notify the creator
        const anuncio = await getAnuncioById(input.anuncioId);
        if (anuncio && anuncio.createdBy) {
          await createNotification({
            userId: anuncio.createdBy,
            type: "reservation_rejected",
            title: "Reserva Rechazada",
            message: `Tu reserva para ${anuncio.cliente} ha sido rechazada por ${ctx.user.name || 'Admin'}.`,
            relatedId: input.anuncioId,
            read: 0,
          });
        }
        
        return { success: true };
      }),
    
    bulkApprove: adminProcedure
      .input(z.object({ anuncioIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const { updateAnuncioApprovalStatus, createNotification } = await import("./db");
        const { getAnuncioById } = await import("./paradas-db");
        
        for (const anuncioId of input.anuncioIds) {
          await updateAnuncioApprovalStatus(anuncioId, "approved", ctx.user.id, ctx.user.name || ctx.user.openId);
          
          // Notify the creator
          const anuncio = await getAnuncioById(anuncioId);
          if (anuncio && anuncio.createdBy) {
            await createNotification({
              userId: anuncio.createdBy,
              type: "reservation_approved",
              title: "Reserva Aprobada",
              message: `Tu reserva para ${anuncio.cliente} ha sido aprobada por ${ctx.user.name || 'Admin'}.`,
              relatedId: anuncioId,
              read: 0,
            });
          }
        }
        
        return { success: true, count: input.anuncioIds.length };
      }),
    
    bulkReject: adminProcedure
      .input(z.object({ anuncioIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const { updateAnuncioApprovalStatus, createNotification } = await import("./db");
        const { getAnuncioById } = await import("./paradas-db");
        
        for (const anuncioId of input.anuncioIds) {
          await updateAnuncioApprovalStatus(anuncioId, "rejected", ctx.user.id, ctx.user.name || ctx.user.openId);
          
          // Notify the creator
          const anuncio = await getAnuncioById(anuncioId);
          if (anuncio && anuncio.createdBy) {
            await createNotification({
              userId: anuncio.createdBy,
              type: "reservation_rejected",
              title: "Reserva Rechazada",
              message: `Tu reserva para ${anuncio.cliente} ha sido rechazada por ${ctx.user.name || 'Admin'}.`,
              relatedId: anuncioId,
              read: 0,
            });
          }
        }
        
        return { success: true, count: input.anuncioIds.length };
      }),
    
    pending: adminProcedure.query(async () => {
      const { getPendingAnuncios } = await import("./paradas-db");
      return await getPendingAnuncios();
    }),
  }),

  // Activity logging router
  activity: router({
    // Log a new activity
    log: protectedProcedure
      .input(z.object({
        action: z.string(),
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        details: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { activityLog } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.insert(activityLog).values({
          userId: ctx.user.id,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          details: input.details,
        });
        
        return { success: true };
      }),
    
    // Get recent activities for current user
    recent: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { activityLog } = await import("../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      
      const activities = await db
        .select()
        .from(activityLog)
        .where(eq(activityLog.userId, ctx.user.id))
        .orderBy(desc(activityLog.createdAt))
        .limit(3);
      
      return activities;
    }),
  }),

  // Mantenimiento history router
  mantenimiento: router({    getHistory: publicProcedure
      .input(z.object({ paradaId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { mantenimientoHistorial } = await import("../drizzle/schema");
        const { desc, eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        
        const history = await db
          .select()
          .from(mantenimientoHistorial)
          .where(eq(mantenimientoHistorial.paradaId, input.paradaId))
          .orderBy(desc(mantenimientoHistorial.createdAt))
          .limit(50);
        
        return history;
      }),
  }),

  // Facturas (invoice history) router
  facturas: router({
    list: protectedProcedure
      .input(z.object({
        cliente: z.string().optional(),
        fechaDesde: z.string().optional(),
        fechaHasta: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { desc, eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        
        let query = db.select().from(facturas);
        
        if (input?.cliente) {
          query = query.where(eq(facturas.cliente, input.cliente)) as any;
        }
        
        const results = await query.orderBy(desc(facturas.createdAt));
        return results;
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(facturas).where(eq(facturas.id, input.id));
        return { success: true };
      }),

    regenerate: adminProcedure
      .input(z.object({
        facturaId: z.number(),
        billingPeriodStart: z.string().optional(), // "YYYY-MM"
      }))
      .mutation(async ({ input }) => {
        const { regenerateInvoicePDF } = await import("./invoice-generator");
        const pdfUrl = await regenerateInvoicePDF(input.facturaId, input.billingPeriodStart);
        return { pdfUrl };
      }),

    // Link existing anuncios to an old factura that lacks anuncioIdsJson
    // Searches by client name and a date range (the billing month of the invoice)
    linkAnuncios: adminProcedure
      .input(z.object({
        facturaId: z.number(),
        anuncioIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(facturas)
          .set({ anuncioIdsJson: JSON.stringify(input.anuncioIds) })
          .where(eq(facturas.id as any, input.facturaId));

        return { success: true, count: input.anuncioIds.length };
      }),

    // Search anuncios by client name to help link old invoices
    searchAnunciosByCliente: adminProcedure
      .input(z.object({ cliente: z.string() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { anuncios, paradas } = await import("../drizzle/schema");
        const { eq, like, desc } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];

        const results = await db
          .select({
            id: anuncios.id,
            paradaId: anuncios.paradaId,
            cliente: anuncios.cliente,
            tipo: anuncios.tipo,
            fechaInicio: anuncios.fechaInicio,
            fechaFin: anuncios.fechaFin,
            costoPorUnidad: anuncios.costoPorUnidad,
            cobertizoId: paradas.cobertizoId,
            localizacion: paradas.localizacion,
          })
          .from(anuncios)
          .leftJoin(paradas, eq(anuncios.paradaId, paradas.id))
          .where(like(anuncios.cliente, `%${input.cliente}%`))
          .orderBy(desc(anuncios.fechaInicio))
          .limit(200);

        return results;
      }),
  }),

  // Contact form router
  contact: router({
    sendEmail: publicProcedure
      .input(z.object({
        nombre: z.string(),
        email: z.string().email(),
        telefono: z.string(),
        mensaje: z.string(),
        recaptchaToken: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Verify reCAPTCHA token
          const { verifyRecaptcha } = await import("./recaptcha-service");
          const isValid = await verifyRecaptcha(input.recaptchaToken);
          
          if (!isValid) {
            throw new Error("Verificación de seguridad fallida. Por favor intente nuevamente.");
          }
          
          // Send email
          const { sendContactEmail } = await import("./email-service");
          await sendContactEmail({
            nombre: input.nombre,
            email: input.email,
            telefono: input.telefono,
            mensaje: input.mensaje,
          });
          
          return { success: true, message: "Mensaje enviado correctamente" };
        } catch (error) {
          console.error("[Contact Form] Error:", error);
          throw new Error(error instanceof Error ? error.message : "Error al enviar el mensaje");
        }
      }),
  }),

  // Invoices router
  invoices: router({
    list: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { facturas, pagos } = await import("../drizzle/schema");
      const { desc, eq, sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      
      const results = await db.select().from(facturas).orderBy(desc(facturas.createdAt));
      
      // For each factura, calculate totalPagado from pagos table
      const facturaIds = results.map(f => f.id);
      let pagosSums: Record<number, number> = {};
      if (facturaIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        const pagosList = await db
          .select({ facturaId: pagos.facturaId, monto: pagos.monto })
          .from(pagos)
          .where(inArray(pagos.facturaId, facturaIds));
        for (const p of pagosList) {
          pagosSums[p.facturaId] = (pagosSums[p.facturaId] || 0) + parseFloat(p.monto);
        }
      }
      
      return results.map(f => {
        const total = parseFloat(f.total || "0");
        const totalPagado = pagosSums[f.id] || 0;
        const balance = Math.max(0, total - totalPagado);
        return { ...f, totalPagado, balance };
      });
    }),
    
    generateReport: adminProcedure
      .input(z.object({
        facturaIds: z.array(z.number()).optional(), // if provided, only include these
        filtroDescripcion: z.string().optional(),
        titulo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { getDb } = await import("./db");
          const { facturas, pagos } = await import("../drizzle/schema");
          const { desc, inArray } = await import("drizzle-orm");
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          
          let query = db.select().from(facturas).$dynamic();
          if (input.facturaIds && input.facturaIds.length > 0) {
            query = query.where(inArray(facturas.id, input.facturaIds));
          }
          const facturaList = await query.orderBy(desc(facturas.createdAt));
          
          // Calculate balance for each factura (total - sum of pagos)
          const facturaIds = facturaList.map(f => f.id);
          let pagosSums: Record<number, number> = {};
          if (facturaIds.length > 0) {
            const pagosList = await db
              .select({ facturaId: pagos.facturaId, monto: pagos.monto })
              .from(pagos)
              .where(inArray(pagos.facturaId, facturaIds));
            for (const p of pagosList) {
              pagosSums[p.facturaId] = (pagosSums[p.facturaId] || 0) + parseFloat(p.monto);
            }
          }
          
          const facturaListWithBalance = facturaList.map(f => {
            const total = parseFloat(f.total || "0");
            const totalPagado = pagosSums[f.id] || 0;
            const balance = Math.max(0, total - totalPagado);
            return { ...f, balance };
          });
          
          const { generateFacturacionReportPDF } = await import("./facturacion-report-generator");
          const pdfUrl = await generateFacturacionReportPDF({
            facturas: facturaListWithBalance,
            titulo: input.titulo || "Reporte de Facturación",
            filtroDescripcion: input.filtroDescripcion,
          });
          
          return { pdfUrl };
        } catch (error) {
          console.error("[Invoice Report] Error generating report:", error);
          throw error;
        }
      }),
    
    updatePaymentStatus: adminProcedure
      .input(z.object({
        facturaId: z.number(),
        estadoPago: z.enum(["Pendiente", "Pagada", "Vencida"]),
        fechaPago: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(facturas)
          .set({
            estadoPago: input.estadoPago,
            fechaPago: input.fechaPago ? new Date(input.fechaPago) : null,
          })
          .where(eq(facturas.id, input.facturaId));
        
        return { success: true };
      }),
    
    generate: protectedProcedure
      .input(z.object({
        anuncioIds: z.array(z.number()),
        title: z.string().optional(),
        description: z.string().optional(),
        productionCost: z.number().optional(),
        otherServicesDescription: z.string().optional(),
        otherServicesCost: z.number().optional(),
        salespersonName: z.string().optional(),
        clienteNombre: z.string().optional(),
        billingPeriodStart: z.string().optional(), // "YYYY-MM"
      }))
      .mutation(async ({ input }) => {
        try {
          console.log("[Invoice Router] Received request with", input.anuncioIds.length, "anuncios");
          const { generateInvoiceFromAnuncios } = await import("./invoice-generator");
          const pdfUrl = await generateInvoiceFromAnuncios(
            input.anuncioIds, 
            input.title, 
            input.description,
            input.productionCost,
            input.otherServicesDescription,
            input.otherServicesCost,
            input.salespersonName,
            input.clienteNombre,
            input.billingPeriodStart
          );
          console.log("[Invoice Router] Generated PDF:", pdfUrl);
          return { pdfUrl };
        } catch (error) {
          console.error("[Invoice Router] Error generating invoice:", error);
          throw error;
        }
      }),

    regenerate: adminProcedure
      .input(z.object({
        facturaId: z.number(),
        billingPeriodStart: z.string().optional(), // "YYYY-MM"
      }))
      .mutation(async ({ input }) => {
        const { regenerateInvoicePDF } = await import("./invoice-generator");
        const pdfUrl = await regenerateInvoicePDF(input.facturaId, input.billingPeriodStart);
        return { pdfUrl };
      }),

    // Check for overdue invoices and create notifications
    checkOverdueInvoices: adminProcedure.mutation(async () => {
      const { getDb, createNotification } = await import("./db");
      const { facturas, users } = await import("../drizzle/schema");
      const { and, eq, lt } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get all overdue invoices (Pendiente status and past due date)
      const today = new Date();
      const overdueInvoices = await db.select().from(facturas)
        .where(
          and(
            eq(facturas.estadoPago, "Pendiente"),
            lt(facturas.createdAt, new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) // 30 days old
          )
        );
      
      // Get all admin users
      const admins = await db.select().from(users).where(eq(users.role, "admin"));
      
      // Create notifications for each overdue invoice
      let notificationCount = 0;
      for (const invoice of overdueInvoices) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "invoice_overdue",
            title: "Factura Vencida",
            message: `La factura ${invoice.numeroFactura} para ${invoice.cliente} está vencida (${Math.floor((today.getTime() - new Date(invoice.createdAt).getTime()) / (24 * 60 * 60 * 1000))} días sin pago).`,
            relatedId: invoice.id,
            read: 0,
          });
          notificationCount++;
        }
      }
      
      return { success: true, overdueCount: overdueInvoices.length, notificationCount };
    }),
    
    // Check for clients without invoices in last 30 days
    checkClientsWithoutInvoices: adminProcedure.mutation(async () => {
      const { getDb, createNotification } = await import("./db");
      const { facturas, anuncios, users } = await import("../drizzle/schema");
      const { eq, and, gte } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get all active/programado anuncios
      const activeAnuncios = await db.select().from(anuncios)
        .where(
          and(
            eq(anuncios.approvalStatus, "approved"),
            eq(anuncios.estado, "Activo")
          )
        );
      
      // Get unique clients from active anuncios
      const activeClients = Array.from(new Set(activeAnuncios.map(a => a.cliente)));
      
      // Check which clients have no invoice in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const clientsWithoutInvoice: string[] = [];
      
      for (const cliente of activeClients) {
        const recentInvoices = await db.select().from(facturas)
          .where(
            and(
              eq(facturas.cliente, cliente),
              gte(facturas.createdAt, thirtyDaysAgo)
            )
          );
        
        if (recentInvoices.length === 0) {
          clientsWithoutInvoice.push(cliente);
        }
      }
      
      // Get all admin users
      const admins = await db.select().from(users).where(eq(users.role, "admin"));
      
      // Create notifications
      let notificationCount = 0;
      for (const cliente of clientsWithoutInvoice) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "client_no_invoice",
            title: "Cliente Sin Factura",
            message: `El cliente ${cliente} tiene anuncios activos pero no se ha generado factura en los últimos 30 días.`,
            relatedId: null,
            read: 0,
          });
          notificationCount++;
        }
      }
      
      return { success: true, clientCount: clientsWithoutInvoice.length, notificationCount };
    }),
    
    // Combined check for both overdue invoices and clients without invoices
    checkAndNotify: adminProcedure.mutation(async () => {
      const { getDb, createNotification } = await import("./db");
      const { facturas, anuncios, users } = await import("../drizzle/schema");
      const { and, eq, lt, gte, lte } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const today = new Date();
      let totalNotifications = 0;
      
      // Check overdue invoices
      const overdueInvoices = await db.select().from(facturas)
        .where(
          and(
            eq(facturas.estadoPago, "Pendiente"),
            lt(facturas.createdAt, new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000))
          )
        );
      
      // Check clients without invoices
      const activeAnuncios = await db.select().from(anuncios)
        .where(
          and(
            eq(anuncios.approvalStatus, "approved"),
            eq(anuncios.estado, "Activo")
          )
        );
      
      const activeClients = Array.from(new Set(activeAnuncios.map(a => a.cliente)));
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const clientsWithoutInvoice: string[] = [];
      
      for (const cliente of activeClients) {
        const recentInvoices = await db.select().from(facturas)
          .where(
            and(
              eq(facturas.cliente, cliente),
              gte(facturas.createdAt, thirtyDaysAgo)
            )
          );
        
        if (recentInvoices.length === 0) {
          clientsWithoutInvoice.push(cliente);
        }
      }
      
      // Get all admin users
      const admins = await db.select().from(users).where(eq(users.role, "admin"));
      
      // Create notifications for overdue invoices
      for (const invoice of overdueInvoices) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "invoice_overdue",
            title: "Factura Vencida",
            message: `La factura ${invoice.numeroFactura} para ${invoice.cliente} está vencida (${Math.floor((today.getTime() - new Date(invoice.createdAt).getTime()) / (24 * 60 * 60 * 1000))} días sin pago).`,
            relatedId: invoice.id,
            read: 0,
          });
          totalNotifications++;
        }
      }
      
      // Create notifications for clients without invoices
      for (const cliente of clientsWithoutInvoice) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "client_no_invoice",
            title: "Cliente Sin Factura",
            message: `El cliente ${cliente} tiene anuncios activos pero no se ha generado factura en los últimos 30 días.`,
            relatedId: null,
            read: 0,
          });
          totalNotifications++;
        }
      }
      
      // Check for campaigns ending soon (21, 14, 7 days)
      const intervals = [
        { days: 21, type: "campaign_ending_21d" as const, label: "21 días" },
        { days: 14, type: "campaign_ending_14d" as const, label: "14 días" },
        { days: 7, type: "campaign_ending_7d" as const, label: "7 días" },
      ];
      
      let campaignsEndingSoonCount = 0;
      
      for (const interval of intervals) {
        const targetDate = new Date(today.getTime() + interval.days * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        const endingCampaigns = await db.select().from(anuncios)
          .where(
            and(
              eq(anuncios.approvalStatus, "approved"),
              eq(anuncios.estado, "Activo"),
              gte(anuncios.fechaFin, startOfDay),
              lte(anuncios.fechaFin, endOfDay)
            )
          );
        
        for (const campaign of endingCampaigns) {
          campaignsEndingSoonCount++;
          
          for (const admin of admins) {
            await createNotification({
              userId: admin.id,
              type: interval.type,
              title: "Campaña por Vencer",
              message: `La campaña de ${campaign.cliente} (${campaign.producto}) termina en ${interval.label}. Contactar para renovación.`,
              relatedId: campaign.id,
              read: 0,
            });
            totalNotifications++;
          }
        }
      }
      
      return { 
        success: true, 
        overdueCount: overdueInvoices.length, 
        clientsWithoutInvoiceCount: clientsWithoutInvoice.length,
        campaignsEndingSoonCount,
        totalNotifications 
      };
    }),
    
    // Check for campaigns ending soon (21, 14, 7 days before)
    checkCampaignsEndingSoon: adminProcedure.mutation(async () => {
      const { getDb, createNotification } = await import("./db");
      const { anuncios, users } = await import("../drizzle/schema");
      const { and, eq, gte, lte } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const today = new Date();
      const intervals = [
        { days: 21, type: "campaign_ending_21d" as const, label: "21 días" },
        { days: 14, type: "campaign_ending_14d" as const, label: "14 días" },
        { days: 7, type: "campaign_ending_7d" as const, label: "7 días" },
      ];
      
      let totalNotifications = 0;
      const campaignsEndingSoon: any[] = [];
      
      // Get all admin and vendedor users
      const recipients = await db.select().from(users).where(
        eq(users.role, "admin")
      );
      
      // Check for each interval
      for (const interval of intervals) {
        const targetDate = new Date(today.getTime() + interval.days * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        // Find active campaigns ending on this date
        const endingCampaigns = await db.select().from(anuncios)
          .where(
            and(
              eq(anuncios.approvalStatus, "approved"),
              eq(anuncios.estado, "Activo"),
              gte(anuncios.fechaFin, startOfDay),
              lte(anuncios.fechaFin, endOfDay)
            )
          );
        
        // Create notifications for each campaign
        for (const campaign of endingCampaigns) {
          campaignsEndingSoon.push({ ...campaign, daysRemaining: interval.days });
          
          for (const recipient of recipients) {
            await createNotification({
              userId: recipient.id,
              type: interval.type,
              title: "Campaña por Vencer",
              message: `La campaña de ${campaign.cliente} (${campaign.producto}) termina en ${interval.label}. Contactar para renovación.`,
              relatedId: campaign.id,
              read: 0,
            });
            totalNotifications++;
          }
        }
      }
      
      return { 
        success: true, 
        campaignsCount: campaignsEndingSoon.length,
        totalNotifications,
        campaigns: campaignsEndingSoon
      };
    }),
    
    // Archive invoice
    archive: adminProcedure
      .input(z.object({ facturaId: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(facturas)
          .set({ archivada: 1 })
          .where(eq(facturas.id, input.facturaId));
        
        return { success: true };
      }),
    
    // Unarchive invoice
    unarchive: adminProcedure
      .input(z.object({ facturaId: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(facturas)
          .set({ archivada: 0 })
          .where(eq(facturas.id, input.facturaId));
        
        return { success: true };
      }),

    // List all pagos (abonos) for a specific factura
    listPagos: protectedProcedure
      .input(z.object({ facturaId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { pagos } = await import("../drizzle/schema");
        const { eq, asc } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        return await db.select().from(pagos)
          .where(eq(pagos.facturaId, input.facturaId))
          .orderBy(asc(pagos.fechaPago));
      }),

    // Register a new abono (partial payment)
    registrarAbono: adminProcedure
      .input(z.object({
        facturaId: z.number(),
        monto: z.number().positive(),
        fechaPago: z.string(), // ISO date string
        metodoPago: z.enum(["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Otro"]),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { pagos, facturas } = await import("../drizzle/schema");
        const { eq, sum } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get the factura to check total
        const [factura] = await db.select().from(facturas).where(eq(facturas.id, input.facturaId));
        if (!factura) throw new TRPCError({ code: "NOT_FOUND", message: "Factura no encontrada" });

        // Insert the new pago
        await db.insert(pagos).values({
          facturaId: input.facturaId,
          monto: input.monto.toFixed(2),
          fechaPago: new Date(input.fechaPago),
          metodoPago: input.metodoPago,
          notas: input.notas || null,
          registradoPor: ctx.user?.name || "Admin",
        });

        // Recalculate total paid and update factura status
        const pagosList = await db.select().from(pagos).where(eq(pagos.facturaId, input.facturaId));
        const totalPagado = pagosList.reduce((acc, p) => acc + parseFloat(p.monto), 0);
        const totalFactura = parseFloat(factura.total);
        const balance = totalFactura - totalPagado;

        let nuevoEstado: "Pendiente" | "Pagada" | "Vencida" | "Pago Parcial";
        if (balance <= 0) {
          nuevoEstado = "Pagada";
        } else if (totalPagado > 0) {
          nuevoEstado = "Pago Parcial";
        } else {
          nuevoEstado = factura.estadoPago === "Vencida" ? "Vencida" : "Pendiente";
        }

        await db.update(facturas)
          .set({
            estadoPago: nuevoEstado,
            fechaPago: nuevoEstado === "Pagada" ? new Date(input.fechaPago) : factura.fechaPago,
          })
          .where(eq(facturas.id, input.facturaId));

        return { success: true, nuevoEstado, totalPagado, balance: Math.max(0, balance) };
      }),

    // Delete an abono
    deleteAbono: adminProcedure
      .input(z.object({ pagoId: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { pagos, facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get the pago to find its facturaId before deleting
        const [pago] = await db.select().from(pagos).where(eq(pagos.id, input.pagoId));
        if (!pago) throw new TRPCError({ code: "NOT_FOUND", message: "Abono no encontrado" });

        await db.delete(pagos).where(eq(pagos.id, input.pagoId));

        // Recalculate balance after deletion
        const [factura] = await db.select().from(facturas).where(eq(facturas.id, pago.facturaId));
        if (!factura) return { success: true };

        const pagosList = await db.select().from(pagos).where(eq(pagos.facturaId, pago.facturaId));
        const totalPagado = pagosList.reduce((acc, p) => acc + parseFloat(p.monto), 0);
        const totalFactura = parseFloat(factura.total);
        const balance = totalFactura - totalPagado;

        let nuevoEstado: "Pendiente" | "Pagada" | "Vencida" | "Pago Parcial";
        if (balance <= 0) {
          nuevoEstado = "Pagada";
        } else if (totalPagado > 0) {
          nuevoEstado = "Pago Parcial";
        } else {
          nuevoEstado = factura.estadoPago === "Vencida" ? "Vencida" : "Pendiente";
        }

        await db.update(facturas)
          .set({ estadoPago: nuevoEstado })
          .where(eq(facturas.id, pago.facturaId));

        return { success: true, nuevoEstado, balance: Math.max(0, balance) };
      }),

    // Send invoice by email with PDF attachment
    sendByEmail: adminProcedure
      .input(z.object({
        facturaId: z.number(),
        to: z.string().email(),
        cc: z.string().optional(),
        subject: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { facturas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [factura] = await db.select().from(facturas).where(eq(facturas.id, input.facturaId));
        if (!factura) throw new TRPCError({ code: "NOT_FOUND", message: "Factura no encontrada" });
        if (!factura.pdfUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "La factura no tiene PDF generado. Genera el PDF primero." });

        const { sendInvoiceEmail } = await import("./email-service");
        await sendInvoiceEmail({
          to: input.to,
          cc: input.cc,
          subject: input.subject,
          message: input.message,
          pdfUrl: factura.pdfUrl,
          numeroFactura: factura.numeroFactura,
          clienteNombre: factura.cliente,
        });

        return { success: true };
      }),
  }),
  
  // CRM System for Vendedores
  seguimientos: router({
    // Get all follow-ups for current user (vendedor)
    myFollowUps: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { seguimientos } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      
      return await db.select().from(seguimientos)
        .where(eq(seguimientos.vendedorId, ctx.user!.id))
        .orderBy(desc(seguimientos.fechaVencimiento));
    }),
    
    // Get pending follow-ups (campaigns ending soon without contact)
    pending: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { seguimientos } = await import("../drizzle/schema");
      const { and, eq, or } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      
      return await db.select().from(seguimientos)
        .where(
          and(
            eq(seguimientos.vendedorId, ctx.user!.id),
            or(
              eq(seguimientos.estado, "Pendiente"),
              eq(seguimientos.estado, "Contactado")
            )
          )
        );
    }),
    
    // Create new follow-up
    create: protectedProcedure
      .input(z.object({
        anuncioId: z.number(),
        cliente: z.string(),
        producto: z.string().optional(),
        fechaVencimiento: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(seguimientos).values({
          anuncioId: input.anuncioId,
          vendedorId: ctx.user!.id,
          cliente: input.cliente,
          producto: input.producto || null,
          fechaVencimiento: new Date(input.fechaVencimiento),
          estado: "Pendiente",
        });
        
        return { success: true, id: result.insertId };
      }),
    
    // Update follow-up status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        estado: z.enum(["Pendiente", "Contactado", "Interesado", "Renovado", "No Renovará"]),
        fechaContacto: z.string().optional(),
        resultado: z.string().optional(),
        proximoSeguimiento: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(seguimientos)
          .set({
            estado: input.estado,
            fechaContacto: input.fechaContacto ? new Date(input.fechaContacto) : undefined,
            resultado: input.resultado || undefined,
            proximoSeguimiento: input.proximoSeguimiento ? new Date(input.proximoSeguimiento) : undefined,
          })
          .where(eq(seguimientos.id, input.id));
        
        return { success: true };
      }),
    
    // Get notes for a follow-up
    getNotes: protectedProcedure
      .input(z.object({ seguimientoId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { notasCliente } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        
        return await db.select().from(notasCliente)
          .where(eq(notasCliente.seguimientoId, input.seguimientoId))
          .orderBy(desc(notasCliente.createdAt));
      }),
    
    // Add note to follow-up
    addNote: protectedProcedure
      .input(z.object({
        seguimientoId: z.number(),
        nota: z.string(),
        tipoContacto: z.enum(["Llamada", "Email", "Reunión", "WhatsApp", "Otro"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { notasCliente } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(notasCliente).values({
          seguimientoId: input.seguimientoId,
          vendedorId: ctx.user!.id,
          vendedorNombre: ctx.user!.name || "Usuario",
          nota: input.nota,
          tipoContacto: input.tipoContacto,
        });
        
        return { success: true, id: result.insertId };
      }),

    // Create a seguimiento manually (without an anuncio)
    createManual: protectedProcedure
      .input(z.object({
        cliente: z.string().min(1),
        producto: z.string().optional(),
        telefono: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        vendedorId: z.number().optional(), // if admin assigns to a specific vendedor
        fechaVencimiento: z.string().optional(), // defaults to 30 days from now
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const assignedVendedorId = input.vendedorId ?? ctx.user!.id;
        const fechaVenc = input.fechaVencimiento
          ? new Date(input.fechaVencimiento)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

        const [result] = await db.insert(seguimientos).values({
          anuncioId: null,
          vendedorId: assignedVendedorId,
          cliente: input.cliente,
          producto: input.producto || null,
          telefono: input.telefono || null,
          email: input.email || null,
          fechaVencimiento: fechaVenc,
          estado: "Pendiente",
        });

        return { success: true, id: result.insertId };
      }),

    // Update contact info (phone and email) on a seguimiento
    updateContact: protectedProcedure
      .input(z.object({
        id: z.number(),
        telefono: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(seguimientos)
          .set({
            telefono: input.telefono ?? null,
            email: input.email ?? null,
          })
          .where(eq(seguimientos.id, input.id));

        return { success: true };
      }),

    // Assign a seguimiento to a different vendedor
    assignVendor: protectedProcedure
      .input(z.object({
        id: z.number(),
        vendedorId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(seguimientos)
          .set({ vendedorId: input.vendedorId })
          .where(eq(seguimientos.id, input.id));

        return { success: true };
      }),

    // Delete a seguimiento permanently
    deleteSeguimiento: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { seguimientos, notasCliente } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Delete notes first (FK constraint)
        await db.delete(notasCliente).where(eq(notasCliente.seguimientoId, input.id));
        await db.delete(seguimientos).where(eq(seguimientos.id, input.id));

        return { success: true };
      }),

    // Archive a seguimiento (soft delete)
    archiveSeguimiento: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { seguimientos } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(seguimientos)
          .set({ archivedAt: new Date() })
          .where(eq(seguimientos.id, input.id));

        return { success: true };
      }),

    // Get archived seguimientos
    archived: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { seguimientos } = await import("../drizzle/schema");
      const { isNotNull, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(seguimientos)
        .where(isNotNull(seguimientos.archivedAt))
        .orderBy(seguimientos.archivedAt);
    }),

    // List all vendors (users with role vendedor or admin) for assignment dropdown
    listVendors: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { users } = await import("../drizzle/schema");
      const { or, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];

      return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      }).from(users)
        .where(or(eq(users.role, "admin"), eq(users.role, "vendedor")));
    }),

    // Get all active seguimientos (for admin view)
    listAll: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { seguimientos } = await import("../drizzle/schema");
      const { isNull, desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(seguimientos)
        .where(isNull(seguimientos.archivedAt))
        .orderBy(desc(seguimientos.createdAt));
    }),
  }),

  // Announcements (toast notifications) router
  announcements: router({
    // Public: get active announcement to show on platform entry
    getActive: publicProcedure.query(async () => {
      const { getDb } = await import('./db');
      const { announcements } = await import('../drizzle/schema');
      const { and, eq, or, isNull, lte, gte } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return null;
      const now = new Date();
      const [announcement] = await db
        .select()
        .from(announcements)
        .where(
          and(
            eq(announcements.activo, 1),
            or(isNull(announcements.fechaInicio), lte(announcements.fechaInicio, now)),
            or(isNull(announcements.fechaFin), gte(announcements.fechaFin, now))
          )
        )
        .orderBy(announcements.createdAt)
        .limit(1);
      return announcement || null;
    }),

    // Admin: list all announcements
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const { getDb } = await import('./db');
      const { announcements } = await import('../drizzle/schema');
      const { desc } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    }),

    // Admin: create announcement
    create: protectedProcedure
      .input(z.object({
        titulo: z.string().min(1),
        mensaje: z.string().min(1),
        tipo: z.enum(['info', 'alerta', 'exito', 'urgente']).default('info'),
        activo: z.number().default(1),
        fechaInicio: z.date().nullable().optional(),
        fechaFin: z.date().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getDb } = await import('./db');
        const { announcements } = await import('../drizzle/schema');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const [result] = await db.insert(announcements).values({
          titulo: input.titulo,
          mensaje: input.mensaje,
          tipo: input.tipo,
          activo: input.activo,
          fechaInicio: input.fechaInicio || null,
          fechaFin: input.fechaFin || null,
          creadoPor: ctx.user.name || 'Admin',
        });
        return { success: true, id: result.insertId };
      }),

    // Admin: update announcement
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().min(1).optional(),
        mensaje: z.string().min(1).optional(),
        tipo: z.enum(['info', 'alerta', 'exito', 'urgente']).optional(),
        activo: z.number().optional(),
        fechaInicio: z.date().nullable().optional(),
        fechaFin: z.date().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getDb } = await import('./db');
        const { announcements } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const { id, ...updates } = input;
        await db.update(announcements).set(updates).where(eq(announcements.id, id));
        return { success: true };
      }),

    // Admin: delete announcement
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getDb } = await import('./db');
        const { announcements } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        await db.delete(announcements).where(eq(announcements.id, input.id));
        return { success: true };
      }),

     // Admin: toggle active status
    toggleActive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getDb } = await import('./db');
        const { announcements } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const [current] = await db.select({ activo: announcements.activo }).from(announcements).where(eq(announcements.id, input.id)).limit(1);
        if (!current) throw new TRPCError({ code: 'NOT_FOUND' });
        await db.update(announcements).set({ activo: current.activo ? 0 : 1 }).where(eq(announcements.id, input.id));
        return { success: true, activo: current.activo ? 0 : 1 };
      }),
  }),

  // ─── Instalaciones ────────────────────────────────────────────────────────
  instalaciones: router({
    // List all pending/relocalizacion instalaciones (ordered by flowcat)
    list: protectedProcedure.query(async () => {
      const { getInstalaciones } = await import('./db');
      return await getInstalaciones();
    }),

    // Mark an instalacion as Instalado (also sets anuncio → Activo)
    markInstalado: protectedProcedure
      .input(z.object({
        instalacionId: z.number(),
        fotoInstalacion: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { markInstalacionInstalada } = await import('./db');
        let fotoUrl: string | undefined = undefined;

        // If a data URL is provided, upload it to S3
        if (input.fotoInstalacion && input.fotoInstalacion.startsWith('data:')) {
          try {
            const { storagePut } = await import('./storage');
            const match = input.fotoInstalacion.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              const mimeType = match[1];
              const base64Data = match[2];
              const buffer = Buffer.from(base64Data, 'base64');
              const ext = mimeType === 'image/png' ? 'png' : 'jpg';
              const key = `instalaciones/foto-${input.instalacionId}-${Date.now()}.${ext}`;
              const { url } = await storagePut(key, buffer, mimeType);
              fotoUrl = url;
            }
          } catch (e) {
            console.error('[Instalaciones] Failed to upload foto:', e);
          }
        }

        const result = await markInstalacionInstalada(
          input.instalacionId,
          ctx.user.name ?? ctx.user.email ?? 'Unknown',
          fotoUrl
        );
        return {
          success: true,
          anuncioId: result.anuncioId,
          fechaInicioActual: result.fechaInicioActual,
          fechaInstalacion: result.fechaInstalacion,
        };
      }),

    // Update the campaign start date of an anuncio (called after marking as installed)
    updateAnuncioFechaInicio: adminProcedure
      .input(z.object({
        anuncioId: z.number(),
        fechaInicio: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const { anuncios, anuncioHistorial } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get current fechaInicio for history
        const [current] = await db.select({ fechaInicio: anuncios.fechaInicio }).from(anuncios).where(eq(anuncios.id, input.anuncioId)).limit(1);

        await db.update(anuncios).set({ fechaInicio: input.fechaInicio }).where(eq(anuncios.id, input.anuncioId));

        // Log in history
        await db.insert(anuncioHistorial).values({
          anuncioId: input.anuncioId,
          userId: ctx.user.id,
          userName: ctx.user.name ?? ctx.user.openId,
          accion: 'Editado',
          campoModificado: 'fechaInicio',
          valorAnterior: current?.fechaInicio ? current.fechaInicio.toISOString().split('T')[0] : null,
          valorNuevo: input.fechaInicio.toISOString().split('T')[0],
          detalles: 'Fecha de inicio actualizada al día de instalación',
        });

        return { success: true };
      }),

    // Upload installation photo
    uploadFoto: protectedProcedure
      .input(z.object({
        instalacionId: z.number(),
        fileBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        const { updateInstalacionFoto } = await import('./db');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.mimeType === 'image/png' ? 'png' : 'jpg';
        const key = `instalaciones/foto-${input.instalacionId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateInstalacionFoto(input.instalacionId, url);
        return { url };
      }),

    // Backfill: create instalacion records for existing Programado anuncios that don't have one
    backfill: adminProcedure.mutation(async () => {
      const { backfillInstalaciones } = await import('./db');
      return await backfillInstalaciones();
    }),

    // ONE-TIME: sync existing installation photos to parada fotoUrl (remove after use)
    syncFotosToParadas: adminProcedure.mutation(async () => {
      const { syncInstalacionFotosToParadas } = await import('./db');
      return await syncInstalacionFotosToParadas();
    }),

    // Get historial: completed installations (estado = Instalado)
    historial: protectedProcedure.query(async () => {
      const { getInstalacionesHistorial } = await import('./db');
      return await getInstalacionesHistorial();
    }),

    // Upload arte to a single anuncio
    uploadArte: protectedProcedure
      .input(z.object({
        anuncioId: z.number(),
        fileBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        const { getDb } = await import('./db');
        const { anuncios } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.mimeType === 'image/png' ? 'png' : 'jpg';
        const key = `arte/anuncio-${input.anuncioId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.update(anuncios).set({ notas: url }).where(eq(anuncios.id, input.anuncioId));
        return { url };
      }),

    // Bulk upload same arte to multiple anuncios (same client)
    bulkUploadArte: protectedProcedure
      .input(z.object({
        anuncioIds: z.array(z.number()),
        fileBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        const { getDb } = await import('./db');
        const { anuncios } = await import('../drizzle/schema');
        const { inArray } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.mimeType === 'image/png' ? 'png' : 'jpg';
        const key = `arte/bulk-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.update(anuncios).set({ notas: url }).where(inArray(anuncios.id, input.anuncioIds));
        return { url, count: input.anuncioIds.length };
      }),

    // Check if an anuncio has a pending (Programado) instalacion record
    // Used by Gestor de Anuncios to warn before changing estado away from Programado
    checkPendingInstalacion: protectedProcedure
      .input(z.object({ anuncioId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const { instalaciones, paradas } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        const result = await db
          .select({
            id: instalaciones.id,
            estado: instalaciones.estado,
            cobertizoId: paradas.cobertizoId,
            orientacion: paradas.orientacion,
            direccion: paradas.direccion,
            flowCat: paradas.flowCat,
          })
          .from(instalaciones)
          .innerJoin(paradas, eq(instalaciones.paradaId, paradas.id))
          .where(and(
            eq(instalaciones.anuncioId, input.anuncioId),
            eq(instalaciones.estado, 'Programado')
          ))
          .limit(1);
        return result[0] ?? null;
      }),

    // Confirm that an anuncio was installed: marks its pending instalacion as Instalado
    // Called from Gestor de Anuncios when user confirms installation after changing estado
    confirmInstalled: protectedProcedure
      .input(z.object({ anuncioId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const { instalaciones } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        // Find the pending instalacion
        const [inst] = await db
          .select({ id: instalaciones.id })
          .from(instalaciones)
          .where(and(
            eq(instalaciones.anuncioId, input.anuncioId),
            eq(instalaciones.estado, 'Programado')
          ))
          .limit(1);
        if (!inst) throw new Error('No pending instalacion found');
        // Mark as Instalado using the existing helper
        const { markInstalacionInstalada } = await import('./db');
        await markInstalacionInstalada(
          inst.id,
          ctx.user.name ?? ctx.user.email ?? 'Gestor de Anuncios',
          undefined // no photo
        );
        return { success: true, instalacionId: inst.id };
      }),

    // Cancel (delete) one or more instalacion records and revert anuncio to Disponible
    cancel: adminProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const { instalaciones, anuncios } = await import('../drizzle/schema');
        const { eq, inArray } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get anuncio IDs before deleting
        const records = await db
          .select({ id: instalaciones.id, anuncioId: instalaciones.anuncioId })
          .from(instalaciones)
          .where(inArray(instalaciones.id, input.ids));

        const anuncioIds = [...new Set(records.map(r => r.anuncioId))];

        // Delete the instalacion records
        await db.delete(instalaciones).where(inArray(instalaciones.id, input.ids));

        // Revert each anuncio to Disponible (only if it has no other pending instalacion)
        for (const anuncioId of anuncioIds) {
          const remaining = await db
            .select({ id: instalaciones.id })
            .from(instalaciones)
            .where(eq(instalaciones.anuncioId, anuncioId))
            .limit(1);
          if (remaining.length === 0) {
            await db.update(anuncios)
              .set({ estado: 'Disponible' })
              .where(eq(anuncios.id, anuncioId));
          }
        }

        return { success: true, deleted: input.ids.length };
      }),

    // Mark an active anuncio for art change — creates a CambioArte instalacion record
    markCambioArte: adminProcedure
      .input(z.object({
        anuncioId: z.number(),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb, createInstalacion } = await import('./db');
        const { instalaciones, anuncios, paradas } = await import('../drizzle/schema');
        const { eq, and, ne } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get the anuncio to verify it is Activo
        const [anuncio] = await db.select().from(anuncios).where(eq(anuncios.id, input.anuncioId)).limit(1);
        if (!anuncio) throw new TRPCError({ code: 'NOT_FOUND', message: 'Anuncio no encontrado' });
        if (anuncio.estado !== 'Activo') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solo se puede marcar cambio de arte en anuncios Activos' });

        // Check if there is already a pending CambioArte for this anuncio
        const existing = await db
          .select({ id: instalaciones.id })
          .from(instalaciones)
          .where(and(eq(instalaciones.anuncioId, input.anuncioId), eq(instalaciones.estado, 'CambioArte')))
          .limit(1);
        if (existing.length > 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este anuncio ya tiene un cambio de arte pendiente' });

        await createInstalacion({
          anuncioId: input.anuncioId,
          paradaId: anuncio.paradaId,
          estado: 'CambioArte',
          notas: input.notas,
        });

        return { success: true };
      }),

    bulkMarkCambioArte: adminProcedure
      .input(z.object({
        anuncioIds: z.array(z.number()).min(1),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb, createInstalacion } = await import('./db');
        const { instalaciones, anuncios } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const results: { anuncioId: number; success: boolean; reason?: string }[] = [];

        for (const anuncioId of input.anuncioIds) {
          const [anuncio] = await db.select().from(anuncios).where(eq(anuncios.id, anuncioId)).limit(1);
          if (!anuncio || anuncio.estado !== 'Activo') {
            results.push({ anuncioId, success: false, reason: 'No es Activo' });
            continue;
          }
          const existing = await db
            .select({ id: instalaciones.id })
            .from(instalaciones)
            .where(and(eq(instalaciones.anuncioId, anuncioId), eq(instalaciones.estado, 'CambioArte')))
            .limit(1);
          if (existing.length > 0) {
            results.push({ anuncioId, success: false, reason: 'Ya tiene cambio de arte pendiente' });
            continue;
          }
          await createInstalacion({
            anuncioId,
            paradaId: anuncio.paradaId,
            estado: 'CambioArte',
            notas: input.notas,
          });
          results.push({ anuncioId, success: true });
        }

        const created = results.filter(r => r.success).length;
        const skipped = results.filter(r => !r.success).length;
        return { created, skipped, results };
      }),

    // Get all instalaciones including Instalado (for history / order generation)
    listAll: protectedProcedure.query(async () => {
      const { getDb } = await import('./db');
      const { instalaciones, anuncios, paradas } = await import('../drizzle/schema');
      const { eq, asc } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return [];
      return await db
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
          producto: anuncios.producto,
          cliente: anuncios.cliente,
          tipo: anuncios.tipo,
          fechaInicio: anuncios.fechaInicio,
          fechaFin: anuncios.fechaFin,
          estadoAnuncio: anuncios.estado,
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
        .orderBy(asc(paradas.flowCat), asc(paradas.cobertizoId));
    }),
  }),
  // ─── Clientes routerr ─────────────────────────────────────────────────────────
  clientes: router({
    list: adminProcedure.query(async () => {
      return await db.listClientes();
    }),

    // Lightweight list for combobox/select — accessible to all authenticated users
    listForSelect: protectedProcedure.query(async () => {
      const all = await db.listClientes();
      return all.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        contactoPrincipal: c.contactoPrincipal ?? null,
        email: c.email ?? null,
      }));
    }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const cliente = await db.getClienteById(input.id);
        if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
        return cliente;
      }),

    create: adminProcedure
      .input(z.object({
        nombre: z.string().min(1),
        esAgencia: z.number().default(0),
        direccion: z.string().optional().nullable(),
        ciudad: z.string().optional().nullable(),
        estado: z.string().optional().nullable(),
        codigoPostal: z.string().optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal("")),
        telefono: z.string().optional().nullable(),
        contactoPrincipal: z.string().optional().nullable(),
        notas: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCliente({
          nombre: input.nombre,
          esAgencia: input.esAgencia,
          direccion: input.direccion ?? null,
          ciudad: input.ciudad ?? null,
          estado: input.estado ?? null,
          codigoPostal: input.codigoPostal ?? null,
          email: input.email || null,
          telefono: input.telefono ?? null,
          contactoPrincipal: input.contactoPrincipal ?? null,
          notas: input.notas ?? null,
        });
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        nombre: z.string().min(1).optional(),
        esAgencia: z.number().optional(),
        direccion: z.string().optional().nullable(),
        ciudad: z.string().optional().nullable(),
        estado: z.string().optional().nullable(),
        codigoPostal: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        telefono: z.string().optional().nullable(),
        contactoPrincipal: z.string().optional().nullable(),
        notas: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCliente(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCliente(input.id);
        return { success: true };
      }),

    // Vendedor-accessible quick-create for new clients (minimal fields required)
    vendedorCreate: vendedorProcedure
      .input(z.object({
        nombre: z.string().min(1),
        esAgencia: z.number().default(0),
        contactoPrincipal: z.string().optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal('')),
        telefono: z.string().optional().nullable(),
        notas: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCliente({
          nombre: input.nombre,
          esAgencia: input.esAgencia,
          contactoPrincipal: input.contactoPrincipal ?? null,
          email: input.email || null,
          telefono: input.telefono ?? null,
          notas: input.notas ?? null,
          direccion: null,
          ciudad: null,
          estado: null,
          codigoPostal: null,
        });
        return { id, nombre: input.nombre, contactoPrincipal: input.contactoPrincipal ?? null, email: input.email || null };
      }),
  }),

  // ─── Contratos router ─────────────────────────────────────────────────────────
  contratos: router({
    list: adminProcedure
      .input(z.object({ clienteId: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.listContratos(input.clienteId);
      }),

    // Vendedor: list only contracts they created
    listMine: vendedorProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { contratos, clientes } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      const database = await getDb();
      if (!database) return [];
      return await database
        .select({
          id: contratos.id,
          clienteId: contratos.clienteId,
          clienteNombre: clientes.nombre,
          numeroContrato: contratos.numeroContrato,
          numeroPO: contratos.numeroPO,
          fecha: contratos.fecha,
          customerId: contratos.customerId,
          salesDuration: contratos.salesDuration,
          vendedor: contratos.vendedor,
          fechaVencimiento: contratos.fechaVencimiento,
          subtotal: contratos.subtotal,
          total: contratos.total,
          numMeses: contratos.numMeses,
          estado: contratos.estado,
          pdfUrl: contratos.pdfUrl,
          firmaUrl: contratos.firmaUrl,
          docusealSigningUrl: contratos.docusealSigningUrl,
          createdBy: contratos.createdBy,
          createdAt: contratos.createdAt,
        })
        .from(contratos)
        .leftJoin(clientes, eq(contratos.clienteId, clientes.id))
        .where(eq(contratos.createdBy, ctx.user!.id))
        .orderBy(desc(contratos.createdAt));
    }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const contrato = await db.getContratoById(input.id);
        if (!contrato) throw new TRPCError({ code: "NOT_FOUND", message: "Contrato no encontrado" });
        const items = await db.getContratoItems(input.id);
        return { ...contrato, items };
      }),

    create: adminProcedure
      .input(z.object({
        clienteId: z.number(),
        numeroContrato: z.string().min(1),
        numeroPO: z.string().nullish(),
        fecha: z.date(),
        customerId: z.string().nullish(),
        salesDuration: z.string().nullish(),
        vendedor: z.string().nullish(),
        metodoPago: z.string().nullish(),
        fechaVencimiento: z.date().nullish(),
        subtotal: z.string().nullish(),
        total: z.string().nullish(),
        notas: z.string().nullish(),
        numMeses: z.number().optional().nullable(),
        poDocumentUrl: z.string().optional().nullable(),
        estado: z.enum(["Borrador", "Enviado", "Firmado", "Cancelado"]).default("Borrador"),
        items: z.array(z.object({
          cantidad: z.number().default(1),
          concepto: z.string().min(1),
          precioPorUnidad: z.string().nullish(),
          total: z.string().nullish(),
          isProduccion: z.number().optional().default(0),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { items, ...contratoData } = input;
        const id = await db.createContrato(
          { ...contratoData, createdBy: ctx.user.id },
          items.map((item, i) => ({ ...item, contratoId: 0, orden: i, precioPorUnidad: item.precioPorUnidad ?? null, total: item.total ?? null, isProduccion: item.isProduccion ?? 0 }))
        );
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        clienteId: z.number().optional(),
        numeroContrato: z.string().optional(),
        numeroPO: z.string().optional().nullable(),
        fecha: z.date().optional(),
        customerId: z.string().optional().nullable(),
        salesDuration: z.string().optional().nullable(),
        vendedor: z.string().optional().nullable(),
        metodoPago: z.string().optional().nullable(),
        fechaVencimiento: z.date().optional().nullable(),
        subtotal: z.string().optional().nullable(),
        total: z.string().optional().nullable(),
        notas: z.string().optional().nullable(),
        numMeses: z.number().optional().nullable(),
        poDocumentUrl: z.string().optional().nullable(),
        estado: z.enum(["Borrador", "Enviado", "Firmado", "Cancelado"]).optional(),
        pdfUrl: z.string().optional().nullable(),
        items: z.array(z.object({
          cantidad: z.number().default(1),
          concepto: z.string().min(1),
          precioPorUnidad: z.string().optional(),
          total: z.string().optional(),
          isProduccion: z.number().optional().default(0),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, items, ...data } = input;
        await db.updateContrato(id, data);
        if (items !== undefined) {
          await db.updateContratoItems(id, items.map((item, i) => ({ ...item, contratoId: id, orden: i, precioPorUnidad: item.precioPorUnidad ?? null, total: item.total ?? null, isProduccion: item.isProduccion ?? 0 })));
        }
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteContrato(input.id);
        return { success: true };
      }),

    savePdfUrl: adminProcedure
      .input(z.object({ id: z.number(), pdfUrl: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateContratoPdfUrl(input.id, input.pdfUrl);
        return { success: true };
      }),

    getExhibitA: adminProcedure
      .input(z.object({ contratoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getContratoExhibitA(input.contratoId);
      }),

    saveExhibitA: adminProcedure
      .input(z.object({
        contratoId: z.number(),
        rows: z.array(z.object({
          localizacion: z.string(),
          cobertizo: z.string(),
          direccion: z.string(),
          iop: z.string().nullish(),
          producto: z.string().nullish(),
          fb: z.string().nullish(),
        })),
      }))
      .mutation(async ({ input }) => {
        await db.updateContratoExhibitA(input.contratoId, input.rows);
        return { success: true };
      }),

    // Get active anuncios for a client name (for importing into Exhibit A)
    getAnunciosByCliente: adminProcedure
      .input(z.object({ clienteNombre: z.string() }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const { anuncios, paradas } = await import('../drizzle/schema');
        const { eq, and, sql, inArray } = await import('drizzle-orm');
        const database = await getDb();
        if (!database) return [];

        // Extract meaningful keywords (3+ chars), ignoring special chars like & ' etc.
        // The anuncios.cliente column uses utf8mb4_bin (case-sensitive), so we use
        // UPPER(column) LIKE UPPER(?) to force case-insensitive matching.
        const stopwords = new Set(['and', 'the', 'los', 'las', 'del', 'de', 'la', 'el', 'y']);
        const keywords = input.clienteNombre
          .split(/[\s&,\/\\'\u2019]+/)
          .map((w: string) => w.replace(/[^a-zA-Z0-9]/g, '').trim())
          .filter((w: string) => w.length >= 3 && !stopwords.has(w.toLowerCase()));

        const uniqueTerms = [...new Set(
          (keywords.length > 0 ? keywords : [input.clienteNombre]).map((kw: string) => kw.toUpperCase())
        )];
        console.log('[getAnunciosByCliente] input:', input.clienteNombre, '| searchTerms:', uniqueTerms);

        // Build UPPER(cliente) LIKE UPPER('%kw%') conditions joined with OR
        // Must use full table name `anuncios` not alias `a` since Drizzle doesn't alias
        const likeClause = uniqueTerms
          .map(kw => `UPPER(\`anuncios\`.\`cliente\`) LIKE UPPER('%${kw.replace(/'/g, "''")}%')`)
          .join(' OR ');

        // Use sql.raw for the WHERE clause to bypass utf8mb4_bin case-sensitivity
        const clienteFilter = sql.raw(`(${likeClause})`);

        const results = await database
          .select({
            anuncioId: anuncios.id,
            producto: anuncios.producto,
            tipo: anuncios.tipo,
            estado: anuncios.estado,
            clienteAnuncio: anuncios.cliente,
            cobertizoId: paradas.cobertizoId,
            localizacion: paradas.localizacion,
            direccion: paradas.direccion,
            orientacion: paradas.orientacion,
          })
          .from(anuncios)
          .innerJoin(paradas, eq(anuncios.paradaId, paradas.id))
          .where(and(
            clienteFilter,
            inArray(anuncios.estado, ['Activo', 'Programado']),
          ));
        return results;
      }),

    // Send contract for e-signature via DocuSeal
    sendForSigning: adminProcedure
      .input(z.object({
        contratoId: z.number(),
        signerEmail: z.string().email(),
        signerName: z.string(),
        companySignerEmail: z.string().email().optional(),
        companySignerName: z.string().optional(),
        // Client sends the HTML directly to avoid server-side fetch from CDN (which returns 403)
        contractHtml: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { ENV } = await import('./_core/env');
        const { getDb } = await import('./db');
        const { contratos } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        if (!ENV.docusealApiKey) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DocuSeal API key not configured' });
        }

        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });

        // Verify the contrato exists
        const [contrato] = await database.select().from(contratos).where(eq(contratos.id, input.contratoId));
        if (!contrato) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contrato no encontrado' });

        // Use the HTML sent directly from the client (avoids CDN 403 on server-side fetch)
        let contractHtml: string = input.contractHtml;

        // Replace static signature placeholders with DocuSeal interactive fields.
        // The contract HTML has 3 pages with signature areas. We target the
        // static "height:48px border-bottom" lines that serve as signature lines
        // and replace them with proper <signature-field> / <date-field> elements.
        //
        // Page 1 — Company (Representante) + Customer (Firmante)
        // Page 2 — Company (Representante) + Customer (Firmante)  
        // Page 3 — Customer only (Firmante)

        // Helper: build a signature cell replacement
        // Each signature area: [Signature field] [Date field] side by side, then Name text field below
        const customerSigField = `<signature-field name="Firma_Cliente" role="Firmante" style="width:200px;height:56px;display:inline-block;"></signature-field>`;
        const customerDateField = `<date-field name="Fecha_Cliente" role="Firmante" style="width:110px;height:28px;display:inline-block;margin-left:12px;vertical-align:top;"></date-field>`;
        const customerNameField = `<text-field name="Nombre_Cliente" role="Firmante" style="width:200px;height:24px;display:block;margin-top:4px;font-size:10px;"></text-field>`;
        const companySigField = `<signature-field name="Firma_Empresa" role="Representante" style="width:200px;height:56px;display:inline-block;"></signature-field>`;
        const companyDateField = `<date-field name="Fecha_Empresa" role="Representante" style="width:110px;height:28px;display:inline-block;margin-left:12px;vertical-align:top;"></date-field>`;
        const companyNameField = `<text-field name="Nombre_Empresa" role="Representante" style="width:200px;height:24px;display:block;margin-top:4px;font-size:10px;"></text-field>`;

        // We inject by replacing the static signature line divs.
        // The contract has these patterns:
        //   Company sig area: div with "Authorized by Company" label followed by height:48px border-bottom div
        //   Customer sig area: div with "Customer Acceptance" label followed by height:48px border-bottom div
        //   Page 2 legal sig: .legal-sig-line elements with "By:" text
        //   Page 3 exhibit: div with "height:44px;border-bottom" for customer sig

        let htmlWithSignature = contractHtml;

        // Page 1 — replace the two static 48px signature line divs
        // First occurrence = Company (Representante), second = Customer (Firmante)
        // Also replace the "Name / Title: ___" line that follows each sig block with a text-field
        let companyReplaced = false;
        let customerReplaced = false;
        htmlWithSignature = htmlWithSignature.replace(
          /<div style="height:48px;border-bottom:2px solid #1a1a1a;margin-bottom:6px;"><\/div>/g,
          () => {
            if (!companyReplaced) {
              companyReplaced = true;
              return `<div style="margin-bottom:6px;white-space:nowrap;">${companySigField}${companyDateField}</div>`;
            }
            if (!customerReplaced) {
              customerReplaced = true;
              return `<div style="margin-bottom:6px;white-space:nowrap;">${customerSigField}${customerDateField}</div>`;
            }
            return `<div style="height:48px;border-bottom:2px solid #1a1a1a;margin-bottom:6px;"></div>`;
          }
        );

        // Replace static "Name / Title: ___" lines with interactive text-fields.
        // There are 3 occurrences in the HTML:
        //   1. Page 1 Customer Acceptance area → replace with DocuSeal text-field
        //   2. Page 2 IN WITNESS WHEREOF Customer area → already handled by legal-sig-line injection above (which appends customerNameField to the By: line); just remove the static line
        //   3. Page 3 Exhibit A Customer area → already handled by the 44px sig injection below; just remove the static line
        // Strategy: replace only the FIRST occurrence with the interactive field;
        // replace subsequent occurrences with an empty string (they are covered by sig-line injections).
        let nameFieldCount = 0;
        htmlWithSignature = htmlWithSignature.replace(
          /Name \/ Title: ___________________________/g,
          () => {
            nameFieldCount++;
            if (nameFieldCount === 1) {
              // Page 1 Customer Acceptance — inject interactive text-field
              return `Name / Title: ${customerNameField}`;
            }
            // Pages 2 & 3 — remove the static placeholder (sig-line injection already added the field)
            return '';
          }
        );

        // Page 2 — replace .legal-sig-line "By: ... Date: __________" lines
        // First = Company, second = Customer
        let legalCompanyReplaced = false;
        let legalCustomerReplaced = false;
        htmlWithSignature = htmlWithSignature.replace(
          /<div class="legal-sig-line">By:[^<]*Date: __________<\/div>/g,
          () => {
            if (!legalCompanyReplaced) {
              legalCompanyReplaced = true;
              return `<div class="legal-sig-line" style="white-space:nowrap;">By: ${companySigField}${companyDateField}${companyNameField}</div>`;
            }
            if (!legalCustomerReplaced) {
              legalCustomerReplaced = true;
              return `<div class="legal-sig-line" style="white-space:nowrap;">By: ${customerSigField}${customerDateField}${customerNameField}</div>`;
            }
            return `<div class="legal-sig-line">By: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date: __________</div>`;
          }
        );

        // Page 3 — replace the 44px signature line for customer + add name field below
        htmlWithSignature = htmlWithSignature.replace(
          /<div style="height:44px;border-bottom:2px solid #1a1a1a;margin-bottom:6px;"><\/div>/,
          `<div style="margin-bottom:6px;white-space:nowrap;">${customerSigField}${customerDateField}</div><div style="margin-top:4px;">Name / Title: ${customerNameField}</div>`
        );

        // Create DocuSeal submission using the HTML endpoint
        const docusealPayload = {
          name: `Contrato ${contrato.numeroContrato}`,
          // send_email at document level is a fallback; we set it per-submitter below
          // so each signer gets their own email with a unique signing link.
          documents: [{
            name: `Contrato_${contrato.numeroContrato}`,
            html: htmlWithSignature,
          }],
          submitters: [
            {
              role: 'Firmante',
              email: input.signerEmail,
              name: input.signerName,
              send_email: true,  // Customer receives signing link
            },
            ...(input.companySignerEmail ? [{
              role: 'Representante',
              email: input.companySignerEmail,
              name: input.companySignerName || 'Representante',
              send_email: true,  // Company rep also receives signing link (not just a copy)
            }] : []),
          ],
        };

        const response = await fetch('https://api.docuseal.com/submissions/html', {
          method: 'POST',
          headers: {
            'X-Auth-Token': ENV.docusealApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(docusealPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[DocuSeal] Error creating submission:', errorText);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `DocuSeal error: ${errorText}` });
        }

        const result = await response.json() as any;
        // DocuSeal returns: { id: <submission_id>, name: "...", submitters: [{id, slug, role, ...}] }
        console.log('[DocuSeal] Full API response:', JSON.stringify(result, null, 2));
        // The submission ID is at result.id (top-level), NOT result.submission_id
        const submissionId: number | undefined =
          result?.id ??
          result?.submission_id ??
          (Array.isArray(result) ? result[0]?.submission_id : undefined);
        // The signing URL comes from the first submitter's slug
        const firstSubmitter = Array.isArray(result?.submitters) ? result.submitters[0] : (Array.isArray(result) ? result[0] : null);
        const signingUrl = firstSubmitter?.slug ? `https://docuseal.com/s/${firstSubmitter.slug}` : null;
        console.log('[DocuSeal] Extracted submissionId:', submissionId, '| signingUrl:', signingUrl);

        // Update contrato with DocuSeal submission info and change estado to Enviado
        await database.update(contratos).set({
          docusealSubmissionId: submissionId,
          docusealSigningUrl: signingUrl,
          estado: 'Enviado',
        }).where(eq(contratos.id, input.contratoId));

        return { success: true, submissionId, signingUrl };
      }),

    // Check DocuSeal submission status manually
    checkSigningStatus: adminProcedure
      .input(z.object({ contratoId: z.number() }))
      .query(async ({ input }) => {
        const { ENV } = await import('./_core/env');
        const { getDb } = await import('./db');
        const { contratos } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });

        const [contrato] = await database.select().from(contratos).where(eq(contratos.id, input.contratoId));
        if (!contrato || !contrato.docusealSubmissionId) {
          return { status: 'not_sent', signingUrl: null };
        }

        if (!ENV.docusealApiKey) return { status: 'unknown', signingUrl: contrato.docusealSigningUrl };

        const response = await fetch(`https://api.docuseal.com/submissions/${contrato.docusealSubmissionId}`, {
          headers: { 'X-Auth-Token': ENV.docusealApiKey },
        });

        if (!response.ok) return { status: 'unknown', signingUrl: contrato.docusealSigningUrl };

        const submission = await response.json() as any;
        const status = submission.status; // 'pending' | 'completed' | 'declined' | 'expired'

        // Auto-update to Firmado if completed
        if (status === 'completed' && contrato.estado !== 'Firmado') {
          const signedUrl = submission.documents?.[0]?.url ?? null;
          await database.update(contratos).set({
            estado: 'Firmado',
            firmaUrl: signedUrl,
          }).where(eq(contratos.id, input.contratoId));
        }

        return { status, signingUrl: contrato.docusealSigningUrl };
      }),

    // Vendedor-accessible contract creation (creates Borrador)
    vendedorCreate: vendedorProcedure
      .input(z.object({
        clienteId: z.number().optional().nullable(),
        clienteNombre: z.string().optional(),
        numeroContrato: z.string().min(1),
        fecha: z.date(),
        fechaVencimiento: z.date().nullish(),
        subtotal: z.string().nullish(),
        total: z.string().nullish(),
        numMeses: z.number().optional().nullable(),
        notas: z.string().nullish(),
        items: z.array(z.object({
          cantidad: z.number().default(1),
          concepto: z.string().min(1),
          precioPorUnidad: z.string().nullish(),
          total: z.string().nullish(),
          isProduccion: z.number().optional().default(0),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { items, clienteNombre, ...contratoData } = input;
        // If clienteId not provided, try to find or skip
        const finalClienteId = contratoData.clienteId ?? 0;
        const id = await db.createContrato(
          {
            ...contratoData,
            clienteId: finalClienteId,
            estado: 'Borrador' as const,
            vendedor: ctx.user.name ?? null,
            createdBy: ctx.user.id,
          },
          items.map((item, i) => ({
            ...item,
            contratoId: 0,
            orden: i,
            precioPorUnidad: item.precioPorUnidad ?? null,
            total: item.total ?? null,
            isProduccion: item.isProduccion ?? 0,
          }))
        );
        return { id };
      }),

    // Manually save a signed PDF URL for a contrato
    saveSignedPdf: adminProcedure
      .input(z.object({
        contratoId: z.number(),
        signedPdfUrl: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const { contratos } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const database = await getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        await database.update(contratos).set({
          pdfUrl: input.signedPdfUrl,
          firmaUrl: input.signedPdfUrl,
          estado: 'Firmado',
        }).where(eq(contratos.id, input.contratoId));
        return { success: true };
      }),
  }),

  // ─── Cotizaciones (Proposal PDF generator) ───────────────────────────────
  cotizaciones: router({
    // List cotizaciones for the current vendor
    list: vendedorProcedure.query(async ({ ctx }) => {
      const { cotizaciones } = await import('../drizzle/schema');
      const { desc, eq } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return [];
      return db.select().from(cotizaciones)
        .where(eq(cotizaciones.vendedorId, ctx.user.id))
        .orderBy(desc(cotizaciones.createdAt))
        .limit(100);
    }),
    // List all cotizaciones: admins see all, vendedores see their own
    listAll: protectedProcedure.query(async ({ ctx }) => {
      const { cotizaciones } = await import('../drizzle/schema');
      const { desc, eq } = await import('drizzle-orm');
      const db = await getDb();
      if (!db) return [];
      if (ctx.user.role === 'admin') {
        return db.select().from(cotizaciones)
          .orderBy(desc(cotizaciones.createdAt))
          .limit(500);
      }
      // Vendedores only see their own
      return db.select().from(cotizaciones)
        .where(eq(cotizaciones.vendedorId, ctx.user.id))
        .orderBy(desc(cotizaciones.createdAt))
        .limit(200);
    }),
    generatePdf: vendedorProcedure
      .input(z.object({
        empresa: z.string(),
        contacto: z.string(),
        email: z.string(),
        fechaInicio: z.string(),
        fechaFin: z.string(),
        meses: z.number().int().min(1).max(24),
        descuento: z.number().min(0),
        paradas: z.array(z.object({
          cobertizoId: z.string(),
          localizacion: z.string(),
          direccion: z.string(),
          orientacion: z.string(),
          tipoFormato: z.string(),
          ruta: z.string().nullable().optional(),
          precioMes: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const { generateProposalPdf } = await import('./proposal-generator');
        const { storagePut } = await import('./storage');
        const { cotizaciones } = await import('../drizzle/schema');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

        // Generate sequential cotizacion number based on timestamp
        const cotizacionNumber = `COT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

        const { buffer, filename } = await generateProposalPdf({
          ...input,
          vendedorName: ctx.user.name ?? '',
          cotizacionNumber,
        });

        // Upload to S3 and return URL
        const fileKey = `cotizaciones/${ctx.user.id}/${cotizacionNumber}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileKey, buffer, 'application/pdf');

        // Calculate totals (in cents to avoid float issues)
        const totalMensual = Math.round(
          input.paradas.reduce((sum, p) => sum + p.precioMes, 0) * (1 - input.descuento / 100)
        );
        const totalCampana = totalMensual * input.meses;

        // Save cotizacion record to database
        await db.insert(cotizaciones).values({
          cotizacionNumber,
          empresa: input.empresa,
          contacto: input.contacto,
          email: input.email || null,
          vendedorId: ctx.user.id,
          vendedorName: ctx.user.name ?? '',
          fechaInicio: input.fechaInicio,
          fechaFin: input.fechaFin,
          meses: input.meses,
          descuento: input.descuento,
          totalMensual,
          totalCampana,
          paradasCount: input.paradas.length,
          pdfUrl: url,
        });

        return { url, filename, cotizacionNumber };
      }),
  }),
});
export type AppRouter = typeof appRouter;
