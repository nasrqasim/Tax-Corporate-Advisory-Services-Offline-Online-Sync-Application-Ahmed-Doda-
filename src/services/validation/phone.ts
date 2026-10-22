/**
 * Pakistani Mobile Number Validator & Normalizer
 * Standard format: +92 3XX XXXXXXX (10 mobile digits after country code 92)
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // +923001234567
  localFormat: string; // 0300-1234567
  internationalFormat: string; // +92 300 1234567
  networkPrefix?: string; // e.g. 0300, 0312, 0333
  operator?: string; // Jazz, Zong, Ufone, Telenor
  errorMessage?: string;
}

const OPERATOR_PREFIXES: Record<string, string> = {
  '300': 'Jazz / Mobilink',
  '301': 'Jazz / Mobilink',
  '302': 'Jazz / Mobilink',
  '303': 'Jazz / Mobilink',
  '304': 'Jazz / Mobilink',
  '305': 'Jazz / Mobilink',
  '306': 'Jazz / Mobilink',
  '307': 'Jazz / Mobilink',
  '308': 'Jazz / Mobilink',
  '309': 'Jazz / Mobilink',
  '310': 'Zong',
  '311': 'Zong',
  '312': 'Zong',
  '313': 'Zong',
  '314': 'Zong',
  '315': 'Zong',
  '316': 'Zong',
  '317': 'Zong',
  '318': 'Zong',
  '320': 'Warid / Jazz',
  '321': 'Warid / Jazz',
  '322': 'Warid / Jazz',
  '323': 'Warid / Jazz',
  '324': 'Warid / Jazz',
  '325': 'Warid / Jazz',
  '331': 'Ufone',
  '332': 'Ufone',
  '333': 'Ufone',
  '334': 'Ufone',
  '335': 'Ufone',
  '336': 'Ufone',
  '337': 'Ufone',
  '340': 'Telenor',
  '341': 'Telenor',
  '342': 'Telenor',
  '343': 'Telenor',
  '344': 'Telenor',
  '345': 'Telenor',
  '346': 'Telenor',
  '347': 'Telenor',
  '348': 'Telenor',
  '349': 'Telenor',
  '355': 'SCOM (AJK & GB)',
};

/**
 * Normalizes phone numbers to standard E.164 format: +923001234567
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';

  // Remove non-digit characters except leading plus if present
  let clean = rawPhone.trim().replace(/[^\d+]/g, '');

  if (clean.startsWith('+92')) {
    clean = clean.slice(3);
  } else if (clean.startsWith('0092')) {
    clean = clean.slice(4);
  } else if (clean.startsWith('92') && clean.length > 10) {
    clean = clean.slice(2);
  } else if (clean.startsWith('0')) {
    clean = clean.slice(1);
  }

  // Strip any remaining non-digits
  clean = clean.replace(/\D/g, '');

  if (clean.length === 10) {
    return `+92${clean}`;
  }

  return clean ? `+${clean}` : '';
}

export function formatLocalPhone(rawPhone: string): string {
  const normalized = normalizePhone(rawPhone);
  if (!normalized.startsWith('+92') || normalized.length !== 13) {
    return rawPhone;
  }
  const digits = normalized.slice(3); // 10 digits, e.g. 3001234567
  return `0${digits.slice(0, 3)}-${digits.slice(3)}`;
}

export function validatePakistaniPhone(rawPhone: string): PhoneValidationResult {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      isValid: false,
      normalized: '',
      localFormat: '',
      internationalFormat: '',
      errorMessage: 'Phone number is required.'
    };
  }

  const normalized = normalizePhone(rawPhone);

  if (!normalized.startsWith('+92') || normalized.length !== 13) {
    return {
      isValid: false,
      normalized,
      localFormat: rawPhone,
      internationalFormat: rawPhone,
      errorMessage: 'Invalid Pakistani mobile number. Must be 11 digits starting with 03 (e.g. 03001234567).'
    };
  }

  const tenDigits = normalized.slice(3);
  const prefix = tenDigits.slice(0, 3);
  const operator = OPERATOR_PREFIXES[prefix] || 'Mobile Network';

  const localFormat = `0${tenDigits.slice(0, 3)}-${tenDigits.slice(3)}`;
  const internationalFormat = `+92 ${tenDigits.slice(0, 3)} ${tenDigits.slice(3)}`;

  return {
    isValid: true,
    normalized,
    localFormat,
    internationalFormat,
    networkPrefix: `0${prefix}`,
    operator
  };
}

/**
 * Returns deep link URL for WhatsApp
 */
export function getWhatsAppUrl(rawPhone: string, message?: string): string {
  const normalized = normalizePhone(rawPhone);
  if (!normalized) return '';
  const cleanNumber = normalized.replace('+', '');
  const encodedMsg = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${cleanNumber}${encodedMsg}`;
}

/**
 * Returns tel: URI for native phone dialer
 */
export function getCallUri(rawPhone: string): string {
  const normalized = normalizePhone(rawPhone);
  return normalized ? `tel:${normalized}` : '';
}
