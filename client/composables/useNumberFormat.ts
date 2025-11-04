/**
 * Formats a number for UI DISPLAY ONLY (not for calculations or data plotting).
 * 
 * This function rounds numbers to a maximum of 2 decimal places for display purposes.
 * It should NOT be used for:
 * - Chart data plotting (use raw values with full precision)
 * - Calculations (use raw values with full precision)
 * - Data processing (use raw values with full precision)
 * 
 * It SHOULD be used for:
 * - Displaying numbers in UI text/labels
 * - Tooltip formatters
 * - Table cell values
 * 
 * Behavior:
 * - If the number has no decimals after rounding, it returns as an integer (no .00)
 * - If the number has decimals, shows up to 2 decimal places
 * - Removes trailing zeros (e.g., "1.20" -> "1.2", "1.00" -> "1")
 * - Preserves thousand separators for large numbers
 * 
 * @param num - The number to format (will be rounded for display)
 * @param options - Options for formatting
 * @returns The formatted number as a string (for display only)
 */
export function formatNumber(
  num: number,
  options: { locale?: string; useGrouping?: boolean } = {}
): string {
  const { locale = 'en-US', useGrouping = true } = options
  
  // Round to 2 decimal places
  const rounded = Math.round(num * 100) / 100
  
  // Check if the rounded number is an integer
  if (rounded % 1 === 0) {
    if (useGrouping) {
      return rounded.toLocaleString(locale, { maximumFractionDigits: 0 })
    }
    return rounded.toString()
  }
  
  // Format with up to 2 decimal places, then remove trailing zeros
  // First, format to 2 decimal places to ensure we have the right precision
  const formatted = rounded.toFixed(2)
  
  // Remove trailing zeros (e.g., "1.20" -> "1.2", "1.00" -> "1")
  const withoutTrailingZeros = formatted.replace(/\.?0+$/, '')
  
  // If we need grouping, apply locale formatting
  if (useGrouping) {
    // Parse back to number to apply locale formatting
    const numValue = parseFloat(withoutTrailingZeros)
    // Use locale formatting but without forcing decimals
    return numValue.toLocaleString(locale, { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    }).replace(/\.?0+$/, '')
  }
  
  return withoutTrailingZeros
}

