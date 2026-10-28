/**
 * Dynamic Date and Tax Year Utilities
 * Automatically handles year transitions (e.g. 2026 -> 2027),
 * timezone-safe YYYY-MM-DD formatting (Asia/Karachi / Pakistan Standard Time),
 * dynamic tax year calculation, and repair resolution for missing or 'N/A' years.
 */

/**
 * Returns current date in YYYY-MM-DD format in Pakistan Standard Time (Asia/Karachi).
 * Avoids UTC off-by-one conversion bugs when called across midnight boundaries.
 */
export function getLocalDateString(d: Date | string = new Date()): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  
  // Format specifically in Asia/Karachi (PKT) timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(dateObj); // Returns "YYYY-MM-DD"
}

/**
 * Returns the current calendar year dynamically (e.g., 2026, 2027).
 */
export function getCurrentCalendarYear(d: Date = new Date()): number {
  const localDateStr = getLocalDateString(d);
  return parseInt(localDateStr.slice(0, 4), 10);
}

/**
 * Calculates current operative Tax Year.
 * Under Pakistan FBR Tax Law, Tax Year corresponds to the fiscal period:
 * - 1 July 2025 to 30 June 2026 = Tax Year 2026
 * - 1 July 2026 to 30 June 2027 = Tax Year 2027
 * Returns 4-digit year string.
 */
export function getCurrentTaxYear(d: Date = new Date()): string {
  const localDateStr = getLocalDateString(d);
  const year = parseInt(localDateStr.slice(0, 4), 10);
  const month = parseInt(localDateStr.slice(5, 7), 10); // 1 to 12

  // In FBR tax filings, from July (month 7) onwards, filings for the new fiscal year begin (year + 1).
  // Between Jan and June (months 1-6), the operative tax year is the current calendar year.
  if (month >= 7) {
    return String(year + 1);
  }
  return String(year);
}

/**
 * Generates dynamic list of selectable tax years based on the operative year.
 * Includes upcoming year (for advance filing), current year, and past historical years.
 * When the calendar transitions from 2026 to 2027, the options update automatically.
 */
export function getSelectableTaxYears(
  baseDate: Date = new Date(),
  pastYearsCount = 6,
  futureYearsCount = 1
): string[] {
  const currentYr = parseInt(getCurrentTaxYear(baseDate), 10);
  const years: string[] = [];

  for (let i = futureYearsCount; i >= 1; i--) {
    years.push(String(currentYr + i));
  }
  years.push(String(currentYr));
  for (let i = 1; i <= pastYearsCount; i++) {
    years.push(String(currentYr - i));
  }

  return years;
}

/**
 * Resolves and repairs missing or 'N/A' tax year from reliable existing record evidence:
 * 1. If existing year is already a valid 4-digit string, returns it intact.
 * 2. If 'N/A' or empty, inspects record ID for embedded year (e.g. 'SRV-2026-0004' -> '2026').
 * 3. Inspects fallback date (e.g. startDate '2026-01-15' -> '2026').
 * 4. If completely indeterminate, returns 'Review Required' instead of masking errors.
 */
export function resolveTaxYear(
  rawTaxYear?: string | null,
  fallbackDate?: string | null,
  recordId?: string | null
): string {
  const trimmed = (rawTaxYear || '').trim();

  // 1. Valid 4-digit year
  if (/^(19\d\d|20\d\d)$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Extract from record ID if formatted like SRV-2026-XXXX or TXN-2026XXXX-XXX
  if (recordId) {
    const srvMatch = recordId.match(/SRV-(20\d\d)-/i);
    if (srvMatch) return srvMatch[1];

    const txnMatch = recordId.match(/TXN-(20\d\d)/i);
    if (txnMatch) return txnMatch[1];

    const recMatch = recordId.match(/REC-(20\d\d)-/i);
    if (recMatch) return recMatch[1];
  }

  // 3. Extract from fallback date (startDate or paymentDate)
  if (fallbackDate && fallbackDate.length >= 4) {
    const yearSub = fallbackDate.slice(0, 4);
    if (/^(19\d\d|20\d\d)$/.test(yearSub)) {
      return yearSub;
    }
  }

  // 4. Truly indeterminate
  return 'Review Required';
}
