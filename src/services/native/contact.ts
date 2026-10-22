/**
 * Native Calling & WhatsApp Integration
 * Opens native dialer and WhatsApp chat on Android, Windows, and Browser.
 */

import { validatePakistaniPhone, getWhatsAppUrl, getCallUri } from '../validation/phone';

export function initiatePhoneCall(rawPhone: string): { success: boolean; message?: string } {
  const validation = validatePakistaniPhone(rawPhone);
  if (!validation.isValid) {
    return { success: false, message: validation.errorMessage || 'Invalid phone number.' };
  }

  const telUri = getCallUri(rawPhone);
  if (typeof window !== 'undefined') {
    try {
      window.location.href = telUri;
      return { success: true };
    } catch (e: any) {
      return { success: false, message: `Could not launch dialer: ${e.message}` };
    }
  }

  return { success: false, message: 'Window environment not available.' };
}

export function initiateWhatsAppMessage(rawPhone: string, defaultText?: string): { success: boolean; message?: string } {
  const validation = validatePakistaniPhone(rawPhone);
  if (!validation.isValid) {
    return { success: false, message: validation.errorMessage || 'Invalid WhatsApp number.' };
  }

  const waUrl = getWhatsAppUrl(rawPhone, defaultText);
  if (typeof window !== 'undefined') {
    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return { success: true };
    } catch (e: any) {
      return { success: false, message: `Could not open WhatsApp: ${e.message}` };
    }
  }

  return { success: false, message: 'Window environment not available.' };
}
