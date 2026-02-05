import { describe, it, expect } from 'vitest';
import { searchParadas } from './paradas-db';

describe('Case-insensitive Search', () => {
  it('should find paradas by client name regardless of case', async () => {
    // Test with uppercase
    const resultsUpper = await searchParadas('BPPR');
    expect(resultsUpper.length).toBeGreaterThan(0);
    
    // Test with lowercase
    const resultsLower = await searchParadas('bppr');
    expect(resultsLower.length).toBeGreaterThan(0);
    
    // Test with mixed case
    const resultsMixed = await searchParadas('BpPr');
    expect(resultsMixed.length).toBeGreaterThan(0);
    
    // All should return the same results
    expect(resultsUpper.length).toBe(resultsLower.length);
    expect(resultsUpper.length).toBe(resultsMixed.length);
  });

  it('should find paradas by ID regardless of case', async () => {
    // Get first parada
    const allResults = await searchParadas('');
    if (allResults.length === 0) {
      console.log('No paradas available for test');
      return;
    }
    
    const firstId = allResults[0].cobertizoId;
    if (!firstId) return;
    
    const resultsUpper = await searchParadas(firstId.toUpperCase());
    const resultsLower = await searchParadas(firstId.toLowerCase());
    
    expect(resultsUpper.length).toBeGreaterThan(0);
    expect(resultsLower.length).toBeGreaterThan(0);
    expect(resultsUpper.length).toBe(resultsLower.length);
  });

  it('should find paradas by location regardless of case', async () => {
    const resultsUpper = await searchParadas('SANTURCE');
    const resultsLower = await searchParadas('santurce');
    
    // Should return same number of results
    expect(resultsUpper.length).toBe(resultsLower.length);
  });
});
