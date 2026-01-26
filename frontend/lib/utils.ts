/**
 * Shared utilities for the frontend application.
 * Centralized to ensure consistency across all components.
 */

/**
 * Format price in Tunisian Dinar (DT)
 * @param price - The price value to format
 * @returns Formatted price string with DT suffix
 */
export function formatPriceDT(price: number): string {
  return `${new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)} DT`;
}

/**
 * Format date to French locale
 * @param dateString - ISO date string
 * @returns Formatted date string in French
 */
export function formatDateFR(dateString?: string): string | null {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format date with full weekday in French
 * @param dateString - ISO date string
 * @returns Full formatted date string
 */
export function formatDateFullFR(dateString?: string): string | null {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Check if a date is in the past
 * @param dateString - ISO date string
 * @returns true if date is in the past
 */
export function isDateInPast(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Get minimum date for date pickers (today)
 * @returns Today's date in YYYY-MM-DD format
 */
export function getMinDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}
