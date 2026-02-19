/**
 * Format a date for display without timezone conversion issues
 * This extracts the date parts directly from the Date object to avoid
 * timezone shifts that cause "day before" bugs
 * 
 * @param date - Date object or ISO string
 * @param locale - Locale for formatting (default: 'es-PR')
 * @returns Formatted date string
 */
export function formatDateDisplay(date: Date | string, locale: string = 'es-PR'): string {
  let year: number, month: number, day: number;
  
  if (typeof date === 'string') {
    // Parse ISO string directly without timezone conversion
    // Extract YYYY-MM-DD from ISO string (e.g., "2024-02-19T00:00:00.000Z")
    const datePart = date.split('T')[0]; // Get "2024-02-19"
    const [y, m, d] = datePart.split('-').map(Number);
    year = y;
    month = m - 1; // JavaScript months are 0-indexed
    day = d;
  } else {
    // Extract from Date object
    year = date.getFullYear();
    month = date.getMonth();
    day = date.getDate();
  }
  
  // Create a new date with these components in local timezone
  const localDate = new Date(year, month, day);
  
  return localDate.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Format a date as YYYY-MM-DD without timezone conversion
 * Useful for date inputs and CSV exports
 */
export function formatDateISO(date: Date | string): string {
  if (typeof date === 'string') {
    // Already in ISO format, just extract the date part
    return date.split('T')[0];
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
