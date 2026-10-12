import { Invoice, SkipReason } from "../types";
import { isValidCalendarDate } from "./date";

/**
 * Validates an invoice against bad data rules in the exact required order:
 * 1. duplicate_id
 * 2. invalid_amount
 * 3. missing_due_date
 * 4. invalid_due_date
 * 5. invalid_paid_date
 *
 * Returns null if the invoice is valid, or the SkipReason if invalid.
 */
export function getSkipReason(
  invoice: unknown,
  isDuplicate: boolean,
  today: string
): SkipReason | null {
  const inv = invoice as Partial<Invoice> | null | undefined;

  // 1. duplicate_id: Another invoice in the file has the same id
  if (isDuplicate) {
    return "duplicate_id";
  }

  // 2. invalid_amount: missing, not a JSON number (a string or true is not a number), or 0 or less
  if (
    inv?.amount === undefined ||
    inv?.amount === null ||
    typeof inv.amount !== "number" ||
    !Number.isFinite(inv.amount) ||
    inv.amount <= 0
  ) {
    return "invalid_amount";
  }

  // 3. missing_due_date: due_date is missing, null or an empty string ""
  if (
    inv.due_date === undefined ||
    inv.due_date === null ||
    inv.due_date === ""
  ) {
    return "missing_due_date";
  }

  // 4. invalid_due_date: due_date is not a real date in the form YYYY-MM-DD
  if (typeof inv.due_date !== "string" || !isValidCalendarDate(inv.due_date)) {
    return "invalid_due_date";
  }

  // 5. invalid_paid_date: paid_date is not null and is not a real YYYY-MM-DD date, or it is after today
  if (inv.paid_date !== null && inv.paid_date !== undefined) {
    if (
      typeof inv.paid_date !== "string" ||
      !isValidCalendarDate(inv.paid_date) ||
      inv.paid_date > today
    ) {
      return "invalid_paid_date";
    }
  }

  return null;
}
