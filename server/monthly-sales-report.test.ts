/**
 * Unit tests for the monthly sales report deduplication logic.
 * These tests verify the core business rules without hitting the database.
 */

import { describe, it, expect } from "vitest";

// ─── Replicated logic from routers.ts monthlySalesReport ─────────────────────
// NOTE: keep this in sync with the normalization in routers.ts
const normalizeCobertizoId = (id: string) => id.replace(/[A-Za-z]+$/, '').trim() || id;

type ReportRow = {
  id: number;
  paradaId: number;
  producto: string;
  cliente: string;
  tipo: "Fijo" | "Bonificación" | "Holder";
  costoPorUnidad: string | null;
  estado: string;
  cobertizoId: string;
};

function buildSalesReport(rows: ReportRow[]) {
  const productMap = new Map<
    string,
    {
      producto: string;
      cliente: string;
      cobertizoIds: Set<string>;
      totalFacturado: number;
      anuncioCount: number;
    }
  >();

  for (const row of rows) {
    const key = `${row.cliente}|||${row.producto}`;
    if (!productMap.has(key)) {
      productMap.set(key, {
        producto: row.producto,
        cliente: row.cliente,
        cobertizoIds: new Set(),
        totalFacturado: 0,
        anuncioCount: 0,
      });
    }
    const entry = productMap.get(key)!;
    // Normalize: strip trailing letter suffix (671A, 671B → 671)
    entry.cobertizoIds.add(normalizeCobertizoId(row.cobertizoId));
    if (row.tipo === "Fijo") {
      entry.totalFacturado += parseFloat(row.costoPorUnidad ?? "0") || 0;
    }
    entry.anuncioCount += 1;
  }

  return Array.from(productMap.values()).map((e) => ({
    producto: e.producto,
    cliente: e.cliente,
    paradasActivas: e.cobertizoIds.size,
    totalFacturado: e.totalFacturado,
    pagoParadas: e.cobertizoIds.size * 25,
    anuncioCount: e.anuncioCount,
  }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("monthlySalesReport – deduplication logic", () => {
  it("counts Inbound and Outbound of the same physical stop as 1 parada", () => {
    const rows: ReportRow[] = [
      {
        id: 1,
        paradaId: 10,
        producto: "Coca-Cola",
        cliente: "Coca-Cola PR",
        tipo: "Fijo",
        costoPorUnidad: "500",
        estado: "Activo",
        cobertizoId: "671",
      },
      {
        id: 2,
        paradaId: 11,
        producto: "Coca-Cola",
        cliente: "Coca-Cola PR",
        tipo: "Fijo",
        costoPorUnidad: "500",
        estado: "Activo",
        cobertizoId: "671", // same physical stop (Outbound)
      },
    ];

    const result = buildSalesReport(rows);
    expect(result).toHaveLength(1);
    expect(result[0].paradasActivas).toBe(1); // deduplicated
    expect(result[0].totalFacturado).toBe(1000); // both Fijo costs summed
    expect(result[0].pagoParadas).toBe(25); // 1 stop × $25
  });

  it("counts two different physical stops as 2 paradas", () => {
    const rows: ReportRow[] = [
      {
        id: 1,
        paradaId: 10,
        producto: "BPPR",
        cliente: "Banco Popular",
        tipo: "Fijo",
        costoPorUnidad: "800",
        estado: "Activo",
        cobertizoId: "100",
      },
      {
        id: 2,
        paradaId: 20,
        producto: "BPPR",
        cliente: "Banco Popular",
        tipo: "Fijo",
        costoPorUnidad: "800",
        estado: "Activo",
        cobertizoId: "200",
      },
    ];

    const result = buildSalesReport(rows);
    expect(result[0].paradasActivas).toBe(2);
    expect(result[0].pagoParadas).toBe(50); // 2 × $25
  });

  it("groups by cliente + producto correctly", () => {
    const rows: ReportRow[] = [
      {
        id: 1,
        paradaId: 1,
        producto: "Ad A",
        cliente: "Client X",
        tipo: "Fijo",
        costoPorUnidad: "300",
        estado: "Activo",
        cobertizoId: "001",
      },
      {
        id: 2,
        paradaId: 2,
        producto: "Ad B",
        cliente: "Client X",
        tipo: "Fijo",
        costoPorUnidad: "400",
        estado: "Activo",
        cobertizoId: "002",
      },
      {
        id: 3,
        paradaId: 3,
        producto: "Ad A",
        cliente: "Client Y",
        tipo: "Fijo",
        costoPorUnidad: "300",
        estado: "Activo",
        cobertizoId: "003",
      },
    ];

    const result = buildSalesReport(rows);
    expect(result).toHaveLength(3); // 3 distinct client+product combos
  });

  it("does NOT add cost for Bonificación type ads", () => {
    const rows: ReportRow[] = [
      {
        id: 1,
        paradaId: 5,
        producto: "Free Ad",
        cliente: "Sponsor",
        tipo: "Bonificación",
        costoPorUnidad: "999",
        estado: "Activo",
        cobertizoId: "500",
      },
    ];

    const result = buildSalesReport(rows);
    expect(result[0].totalFacturado).toBe(0); // Bonificación not counted
    expect(result[0].paradasActivas).toBe(1);
    expect(result[0].pagoParadas).toBe(25);
  });

  it("handles null costoPorUnidad gracefully", () => {
    const rows: ReportRow[] = [
      {
        id: 1,
        paradaId: 7,
        producto: "Test",
        cliente: "Client",
        tipo: "Fijo",
        costoPorUnidad: null,
        estado: "Activo",
        cobertizoId: "700",
      },
    ];

    const result = buildSalesReport(rows);
    expect(result[0].totalFacturado).toBe(0);
  });

  it("returns empty array when no rows provided", () => {
    expect(buildSalesReport([])).toHaveLength(0);
  });

  it("treats 671A and 671B as the same physical stop (letter-suffix normalization)", () => {
    const rows: ReportRow[] = [
      {
        id: 1,
        paradaId: 10,
        producto: "Taco Bell",
        cliente: "Taco Bell PR",
        tipo: "Fijo",
        costoPorUnidad: "600",
        estado: "Activo",
        cobertizoId: "671A", // display face A
      },
      {
        id: 2,
        paradaId: 11,
        producto: "Taco Bell",
        cliente: "Taco Bell PR",
        tipo: "Fijo",
        costoPorUnidad: "600",
        estado: "Activo",
        cobertizoId: "671B", // display face B — same physical stop
      },
      {
        id: 3,
        paradaId: 12,
        producto: "Taco Bell",
        cliente: "Taco Bell PR",
        tipo: "Fijo",
        costoPorUnidad: "600",
        estado: "Activo",
        cobertizoId: "672", // a genuinely different stop
      },
    ];

    const result = buildSalesReport(rows);
    expect(result).toHaveLength(1);
    // 671A + 671B = 1 physical stop, plus 672 = 2 total
    expect(result[0].paradasActivas).toBe(2);
    expect(result[0].pagoParadas).toBe(50); // 2 × $25
    expect(result[0].totalFacturado).toBe(1800); // 3 ads × $600
  });

  it("calculates pagoParadas as paradasActivas × 25", () => {
    const rows: ReportRow[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      paradaId: i + 1,
      producto: "Multi",
      cliente: "Client",
      tipo: "Fijo" as const,
      costoPorUnidad: "100",
      estado: "Activo",
      cobertizoId: String(i + 1), // 5 distinct stops
    }));

    const result = buildSalesReport(rows);
    expect(result[0].paradasActivas).toBe(5);
    expect(result[0].pagoParadas).toBe(125); // 5 × $25
    expect(result[0].totalFacturado).toBe(500); // 5 × $100
  });
});
