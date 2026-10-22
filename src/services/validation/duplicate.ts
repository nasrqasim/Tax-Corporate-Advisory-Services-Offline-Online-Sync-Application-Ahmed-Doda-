/**
 * Duplicate Customer Detection Engine
 * Non-destructive duplicate warning logic for Customer CRM
 */

import { Customer } from '../../types/customer';
import { normalizeCnic } from './cnic';
import { normalizePhone } from './phone';

export interface DuplicateMatch {
  matchedCustomer: Customer;
  matchType: 'cnic' | 'primary_phone' | 'secondary_phone' | 'whatsapp' | 'name_and_father_name';
  description: string;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  matches: DuplicateMatch[];
  warningMessage?: string;
}

export function checkForDuplicateCustomer(
  existingCustomers: Customer[],
  candidate: {
    id?: string;
    fullName: string;
    fatherName?: string;
    cnic: string;
    primaryMobile: string;
    secondaryMobile?: string;
    whatsappNumber?: string;
  }
): DuplicateCheckResult {
  const matches: DuplicateMatch[] = [];
  const candidateCnic = normalizeCnic(candidate.cnic);
  const candidatePrimary = normalizePhone(candidate.primaryMobile);
  const candidateSecondary = candidate.secondaryMobile ? normalizePhone(candidate.secondaryMobile) : '';
  const candidateWhatsapp = candidate.whatsappNumber ? normalizePhone(candidate.whatsappNumber) : '';
  const candidateNameClean = candidate.fullName.trim().toLowerCase();
  const candidateFatherClean = (candidate.fatherName || '').trim().toLowerCase();

  for (const cust of existingCustomers) {
    // Skip comparing against self when updating
    if (candidate.id && cust.id === candidate.id) {
      continue;
    }

    // 1. CNIC Match (Definitive duplicate check)
    if (candidateCnic && normalizeCnic(cust.cnic) === candidateCnic) {
      matches.push({
        matchedCustomer: cust,
        matchType: 'cnic',
        description: `Existing customer "${cust.fullName}" (${cust.id}) has the same CNIC (${cust.cnic}).`
      });
      continue;
    }

    // 2. Primary Mobile Match
    if (candidatePrimary && normalizePhone(cust.primaryMobile) === candidatePrimary) {
      matches.push({
        matchedCustomer: cust,
        matchType: 'primary_phone',
        description: `Existing customer "${cust.fullName}" (${cust.id}) shares the same primary phone number.`
      });
    }

    // 3. Secondary Mobile Match
    if (candidateSecondary && cust.secondaryMobile && normalizePhone(cust.secondaryMobile) === candidateSecondary) {
      matches.push({
        matchedCustomer: cust,
        matchType: 'secondary_phone',
        description: `Existing customer "${cust.fullName}" (${cust.id}) shares the secondary phone number.`
      });
    }

    // 4. Name & Father Name Match
    if (
      candidateNameClean &&
      candidateFatherClean &&
      cust.fullName.trim().toLowerCase() === candidateNameClean &&
      (cust.fatherName || '').trim().toLowerCase() === candidateFatherClean
    ) {
      matches.push({
        matchedCustomer: cust,
        matchType: 'name_and_father_name',
        description: `Existing customer "${cust.fullName}" (${cust.id}) has the exact same name and father's name.`
      });
    }
  }

  const hasDuplicate = matches.length > 0;
  let warningMessage: string | undefined;

  if (hasDuplicate) {
    const primaryReason = matches[0].description;
    warningMessage = matches.length === 1
      ? `Warning: Possible duplicate customer detected! ${primaryReason}`
      : `Warning: ${matches.length} possible duplicate records detected! Check customer list before saving.`;
  }

  return {
    hasDuplicate,
    matches,
    warningMessage
  };
}
