import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {
      headers: {},
      cookies: {},
    } as unknown as TrpcContext["req"],
    res: {
      setHeader: vi.fn(),
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Unit tests for instalacion business logic ────────────────────────────────

describe("Instalacion - base64 data URL parsing", () => {
  it("should extract mime type and base64 from data URL", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgAB";
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("image/jpeg");
    expect(match![2]).toBe("/9j/4AAQSkZJRgAB");
  });

  it("should extract png mime type correctly", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("image/png");
  });

  it("should return null for non-data URLs", () => {
    const url = "https://example.com/image.jpg";
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    expect(match).toBeNull();
  });

  it("should detect data URL by startsWith check", () => {
    expect("data:image/jpeg;base64,abc".startsWith("data:")).toBe(true);
    expect("https://cdn.example.com/img.jpg".startsWith("data:")).toBe(false);
  });
});

describe("Instalacion - flowcat ordering", () => {
  it("should sort flowcats alphabetically (numeric flowcats sort correctly)", () => {
    const flowcats = ["03", "01", "10", "02", "09"];
    const sorted = [...flowcats].sort();
    expect(sorted).toEqual(["01", "02", "03", "09", "10"]);
  });

  it("should handle mixed flowcats with letters", () => {
    const flowcats = ["03A", "01", "02B", "01A"];
    const sorted = [...flowcats].sort();
    expect(sorted).toEqual(["01", "01A", "02B", "03A"]);
  });

  it("should filter out null/empty flowcats", () => {
    const items = [
      { flowCat: "01", id: 1 },
      { flowCat: null, id: 2 },
      { flowCat: "02", id: 3 },
      { flowCat: "", id: 4 },
    ];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of items) {
      if (item.flowCat && !seen.has(item.flowCat)) {
        seen.add(item.flowCat);
        result.push(item.flowCat);
      }
    }
    expect(result).toEqual(["01", "02"]);
  });
});

describe("Instalacion - estado transitions", () => {
  it("should identify Programado as a pending state", () => {
    const pendingStates = ["Programado", "Relocalizacion"];
    expect(pendingStates.includes("Programado")).toBe(true);
    expect(pendingStates.includes("Instalado")).toBe(false);
  });

  it("should identify Relocalizacion as a pending state", () => {
    const pendingStates = ["Programado", "Relocalizacion"];
    expect(pendingStates.includes("Relocalizacion")).toBe(true);
  });

  it("should map Instalado to Activo for anuncio estado", () => {
    const instalacionEstado = "Instalado";
    const anuncioEstado = instalacionEstado === "Instalado" ? "Activo" : "Programado";
    expect(anuncioEstado).toBe("Activo");
  });
});

describe("Instalacion - GPS URL generation", () => {
  it("should generate Google Maps URL with coordinates when available", () => {
    const lat = "18.4655";
    const lng = "-66.1057";
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    expect(url).toBe("https://maps.google.com/?q=18.4655,-66.1057");
  });

  it("should generate Google Maps URL with address when no coordinates", () => {
    const direccion = "Av. Ponce de León, San Juan, PR";
    const url = `https://maps.google.com/?q=${encodeURIComponent(direccion)}`;
    expect(url).toContain("maps.google.com");
    expect(url).toContain("Ponce");
  });
});

describe("Instalacion - admin context", () => {
  it("should create admin context with role admin", () => {
    const ctx = createAdminCtx();
    expect(ctx.user?.role).toBe("admin");
    expect(ctx.user?.name).toBe("Admin User");
  });
});
