/**
 * CNIC (Computerized National Identity Card) Validator & Normalizer
 * Pakistan National ID format: XXXXX-XXXXXXX-X (13 digits)
 */

export interface CnicValidationResult {
  isValid: boolean;
  normalized: string; // 13 digits without dashes
  formatted: string;  // XXXXX-XXXXXXX-X
  provinceCode?: number;
  gender?: 'Male' | 'Female';
  errorMessage?: string;
}

export function normalizeCnic(rawCnic: string): string {
  if (!rawCnic) return '';
  // Remove all non-digit characters
  return rawCnic.replace(/\D/g, '');
}

export function formatCnic(rawCnic: string): string {
  const digits = normalizeCnic(rawCnic);
  if (digits.length !== 13) {
    // If not complete, format as much as possible
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

export function validateCnic(rawCnic: string): CnicValidationResult {
  const digits = normalizeCnic(rawCnic);

  if (!digits) {
    return {
      isValid: false,
      normalized: '',
      formatted: '',
      errorMessage: 'CNIC is required.'
    };
  }

  if (digits.length !== 13) {
    return {
      isValid: false,
      normalized: digits,
      formatted: formatCnic(digits),
      errorMessage: `CNIC must be exactly 13 digits. Current: ${digits.length} digits.`
    };
  }

  // First digit indicates province/territory:
  // 1 = KP, 2 = FATA, 3 = Punjab, 4 = Sindh, 5 = Balochistan, 6 = Islamabad, 7 = Gilgit-Baltistan / AJK
  const firstDigit = parseInt(digits[0], 10);
  if (firstDigit < 1 || firstDigit > 7) {
    return {
      isValid: false,
      normalized: digits,
      formatted: formatCnic(digits),
      errorMessage: 'Invalid CNIC: Province code must be between 1 and 7.'
    };
  }

  // Last digit indicates gender: odd = Male, even = Female
  const lastDigit = parseInt(digits[12], 10);
  const gender = lastDigit % 2 === 1 ? 'Male' : 'Female';

  return {
    isValid: true,
    normalized: digits,
    formatted: formatCnic(digits),
    provinceCode: firstDigit,
    gender
  };
}
