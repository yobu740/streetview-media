/**
 * Server-side date utilities to handle timezone-safe date formatting
 */

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD) without timezone conversion
 * This ensures dates are sent to frontend in a consistent format
 */
export function dateToISOString(date: Date | null | undefined): string | null {
  if (!date) return null;
  
  // Extract year, month, day from the Date object
  // This avoids timezone conversion issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

/**
 * Convert date fields in an object to ISO strings
 * Useful for converting database results before sending to frontend
 */
export function convertDatesToISO<T extends Record<string, any>>(obj: T): T {
  const result: any = { ...obj };
  
  for (const key in result) {
    const value = result[key];
    if (value instanceof Date) {
      result[key] = dateToISOString(value);
    }
  }
  
  return result;
}
