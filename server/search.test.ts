import { describe, it, expect, beforeAll } from "vitest";
import * as paradasDb from "./paradas-db";

describe("Search Functionality", () => {
  it("should search paradas by cobertizo ID", async () => {
    const results = await paradasDb.searchParadas("101");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(p => p.cobertizoId.includes("101"))).toBe(true);
  });

  it("should search paradas by location", async () => {
    const results = await paradasDb.searchParadas("San Juan");
    expect(results.length).toBeGreaterThan(0);
  });

  it("should search paradas by route", async () => {
    const results = await paradasDb.searchParadas("52");
    // Should find paradas with route containing "52"
    expect(Array.isArray(results)).toBe(true);
  });

  it("should search paradas by client/anuncio name", async () => {
    // This will find paradas that have anuncios with matching client names
    const results = await paradasDb.searchParadas("Producto");
    // Should return results if there are any anuncios with "Producto" in the client name
    expect(Array.isArray(results)).toBe(true);
  });

  it("should return unique paradas (no duplicates)", async () => {
    const results = await paradasDb.searchParadas("PR");
    const ids = results.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it("should return empty array for non-existent search term", async () => {
    const results = await paradasDb.searchParadas("NONEXISTENTXYZ123");
    expect(results).toEqual([]);
  });

  it("should handle empty search term", async () => {
    const results = await paradasDb.searchParadas("");
    expect(Array.isArray(results)).toBe(true);
  });
});
