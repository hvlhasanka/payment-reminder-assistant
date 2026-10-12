/**
 * Validates that a string is a real calendar date strictly matching YYYY-MM-DD.
 * Rejects invalid dates such as 2026-02-30, non-leap year 2026-02-29, or alternative formats.
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (typeof dateStr !== "string") {
    return false;
  }

  // Strict YYYY-MM-DD regex check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  // Check round-trip validity using UTC
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Calculates calendar days difference between two YYYY-MM-DD date strings:
 * return value = toDate - fromDate in calendar days.
 * Due today returns 0. If toDate is after fromDate, returns a positive integer.
 */
export function daysBetween(fromDateStr: string, toDateStr: string): number {
  const [y1, m1, d1] = fromDateStr.split("-").map(Number);
  const [y2, m2, d2] = toDateStr.split("-").map(Number);

  const utcFrom = Date.UTC(y1, m1 - 1, d1);
  const utcTo = Date.UTC(y2, m2 - 1, d2);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utcTo - utcFrom) / MS_PER_DAY);
}
