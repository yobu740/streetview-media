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
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Extract year, month, day directly from the Date object
  // This avoids timezone conversion issues
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  
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
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
