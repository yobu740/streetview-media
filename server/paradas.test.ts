import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@streetviewmedia.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Paradas Management", () => {
  it("should list all paradas", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const paradas = await caller.paradas.list();

    expect(Array.isArray(paradas)).toBe(true);
    expect(paradas.length).toBeGreaterThan(0);
    
    // Verify structure of first parada
    if (paradas.length > 0) {
      const firstParada = paradas[0];
      expect(firstParada).toHaveProperty("id");
      expect(firstParada).toHaveProperty("cobertizoId");
      expect(firstParada).toHaveProperty("direccion");
      expect(firstParada).toHaveProperty("tipoFormato");
    }
  });

  it("should search paradas by term", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.paradas.search({ searchTerm: "AVE" });

    expect(Array.isArray(results)).toBe(true);
    // Results should contain paradas with "AVE" in localizacion, direccion, or cobertizoId
    if (results.length > 0) {
      const hasSearchTerm = results.some(p => 
        p.localizacion.includes("AVE") || 
        p.direccion.includes("AVE") ||
        p.cobertizoId.includes("AVE")
      );
      expect(hasSearchTerm).toBe(true);
    }
  });

  it("should get parada by id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First get all paradas to get a valid ID
    const paradas = await caller.paradas.list();
    expect(paradas.length).toBeGreaterThan(0);

    const firstParadaId = paradas[0].id;
    const parada = await caller.paradas.getById({ id: firstParadaId });

    expect(parada).not.toBeNull();
    expect(parada?.id).toBe(firstParadaId);
  });
});

describe("Anuncios Management", () => {
  it("should create and delete an anuncio", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get a parada to use
    const paradas = await caller.paradas.list();
    expect(paradas.length).toBeGreaterThan(0);
    const testParada = paradas[0];

    // Create anuncio
    const fechaInicio = new Date();
    const fechaFin = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const createResult = await caller.anuncios.create({
      paradaId: testParada.id,
      cliente: "Test Cliente",
      tipo: "Fijo",
      fechaInicio,
      fechaFin,
      estado: "Activo",
      notas: "Test anuncio",
    });

    expect(createResult).toHaveProperty("id");
    expect(createResult.id).toBeGreaterThan(0);

    // Verify it was created
    const anuncios = await caller.anuncios.getByParadaId({ paradaId: testParada.id });
    const createdAnuncio = anuncios.find(a => a.id === createResult.id);
    expect(createdAnuncio).toBeDefined();
    expect(createdAnuncio?.cliente).toBe("Test Cliente");

    // Delete the test anuncio
    const deleteResult = await caller.anuncios.delete({ id: createResult.id });
    expect(deleteResult.success).toBe(true);

    // Verify it was deleted
    const anunciosAfterDelete = await caller.anuncios.getByParadaId({ paradaId: testParada.id });
    const deletedAnuncio = anunciosAfterDelete.find(a => a.id === createResult.id);
    expect(deletedAnuncio).toBeUndefined();
  });

  it("should check disponibilidad correctly", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get a parada
    const paradas = await caller.paradas.list();
    expect(paradas.length).toBeGreaterThan(0);
    const testParada = paradas[0];

    // Check disponibilidad for a future date range
    const fechaInicio = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
    const fechaFin = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    const result = await caller.anuncios.checkDisponibilidad({
      paradaId: testParada.id,
      fechaInicio,
      fechaFin,
    });

    expect(result).toHaveProperty("disponible");
    expect(typeof result.disponible).toBe("boolean");
  });

  it("should get active anuncios", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const activeAnuncios = await caller.anuncios.active();

    expect(Array.isArray(activeAnuncios)).toBe(true);
    // All returned anuncios should have estado "Activo"
    activeAnuncios.forEach(anuncio => {
      expect(anuncio.estado).toBe("Activo");
    });
  });
});

describe("Disponibilidad System", () => {
  it("should return available paradas for a date range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Check disponibilidad for a far future date range (likely all available)
    const fechaInicio = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    const fechaFin = new Date(Date.now() + 395 * 24 * 60 * 60 * 1000); // 1 year + 30 days

    const disponibles = await caller.paradas.disponibles({
      fechaInicio,
      fechaFin,
    });

    expect(Array.isArray(disponibles)).toBe(true);
    // Should return some available paradas
    expect(disponibles.length).toBeGreaterThan(0);
  });
});
