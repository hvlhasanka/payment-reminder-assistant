/**
 * Formats a numeric amount with the currency code and exactly 2 decimal places.
 * Example: formatAmount(1250, "EUR") => "EUR 1250.00"
 */
export function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}
