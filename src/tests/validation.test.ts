import { describe, it, expect } from 'vitest';
import { validateCnic, normalizeCnic, formatCnic } from '../services/validation/cnic';
import { validatePakistaniPhone, normalizePhone, formatLocalPhone, getWhatsAppUrl, getCallUri } from '../services/validation/phone';
import { checkForDuplicateCustomer } from '../services/validation/duplicate';
import { Customer } from '../types/customer';

describe('Pakistani CNIC Validation & Normalization', () => {
  it('normalizes raw CNIC strings by removing dashes and spaces', () => {
    expect(normalizeCnic('35202-1234567-1')).toBe('3520212345671');
    expect(normalizeCnic('35202 1234567 1')).toBe('3520212345671');
    expect(normalizeCnic('3520212345671')).toBe('3520212345671');
  });

  it('formats raw 13-digit CNIC into standard XXXXX-XXXXXXX-X format', () => {
    expect(formatCnic('3520212345671')).toBe('35202-1234567-1');
  });

  it('validates a correct 13-digit Pakistani CNIC with province and gender detection', () => {
    const maleCnic = validateCnic('35202-1234567-1'); // Last digit 1 = Male, first digit 3 = Punjab
    expect(maleCnic.isValid).toBe(true);
    expect(maleCnic.provinceCode).toBe(3);
    expect(maleCnic.gender).toBe('Male');

    const femaleCnic = validateCnic('42101-7654321-2'); // Last digit 2 = Female, first digit 4 = Sindh
    expect(femaleCnic.isValid).toBe(true);
    expect(femaleCnic.provinceCode).toBe(4);
    expect(femaleCnic.gender).toBe('Female');
  });

  it('rejects incomplete, empty or invalid CNIC numbers', () => {
    expect(validateCnic('').isValid).toBe(false);
    expect(validateCnic('35202').isValid).toBe(false);
    expect(validateCnic('35202-1234567-123').isValid).toBe(false);
    // Invalid province code (0 or 8 or 9)
    expect(validateCnic('85202-1234567-1').isValid).toBe(false);
  });
});

describe('Pakistani Phone Number Normalization & Validation', () => {
  it('normalizes local phone formats to E.164 (+923001234567)', () => {
    expect(normalizePhone('03001234567')).toBe('+923001234567');
    expect(normalizePhone('0300-1234567')).toBe('+923001234567');
    expect(normalizePhone('0300 1234567')).toBe('+923001234567');
    expect(normalizePhone('+923001234567')).toBe('+923001234567');
    expect(normalizePhone('923001234567')).toBe('+923001234567');
  });

  it('formats normalized phone into clean local readability (0300-1234567)', () => {
    expect(formatLocalPhone('+923001234567')).toBe('0300-1234567');
  });

  it('identifies mobile network operators accurately', () => {
    const jazz = validatePakistaniPhone('03001234567');
    expect(jazz.isValid).toBe(true);
    expect(jazz.operator).toContain('Jazz');

    const zong = validatePakistaniPhone('03121234567');
    expect(zong.isValid).toBe(true);
    expect(zong.operator).toBe('Zong');

    const ufone = validatePakistaniPhone('03331234567');
    expect(ufone.isValid).toBe(true);
    expect(ufone.operator).toBe('Ufone');

    const telenor = validatePakistaniPhone('03451234567');
    expect(telenor.isValid).toBe(true);
    expect(telenor.operator).toBe('Telenor');
  });

  it('constructs correct WhatsApp and Phone deep links', () => {
    expect(getWhatsAppUrl('03001234567')).toBe('https://wa.me/923001234567');
    expect(getWhatsAppUrl('03001234567', 'Tax Reminder')).toBe('https://wa.me/923001234567?text=Tax%20Reminder');
    expect(getCallUri('03001234567')).toBe('tel:+923001234567');
  });
});

describe('Non-Destructive Duplicate Customer Detection', () => {
  const existingClients: Customer[] = [
    {
      id: 'CUST-001',
      fullName: 'Ahmed Ali Khan',
      fatherName: 'Tariq Khan',
      cnic: '35202-1234567-1',
      primaryMobile: '+923001234567',
      whatsappNumber: '+923001234567',
      address: 'Islamabad',
      status: 'active',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      syncStatus: 'saved_locally',
      version: 1
    }
  ];

  it('detects duplicate on exact CNIC match with detailed warning', () => {
    const res = checkForDuplicateCustomer(existingClients, {
      fullName: 'Ahmed A.',
      cnic: '3520212345671', // raw unformatted
      primaryMobile: '03219999999'
    });

    expect(res.hasDuplicate).toBe(true);
    expect(res.matches[0].matchType).toBe('cnic');
    expect(res.matches[0].matchedCustomer.id).toBe('CUST-001');
  });

  it('detects duplicate on primary phone number match', () => {
    const res = checkForDuplicateCustomer(existingClients, {
      fullName: 'Different Name',
      cnic: '35202-9999999-9',
      primaryMobile: '0300-1234567'
    });

    expect(res.hasDuplicate).toBe(true);
    expect(res.matches[0].matchType).toBe('primary_phone');
  });

  it('detects duplicate on identical full name and father name match', () => {
    const res = checkForDuplicateCustomer(existingClients, {
      fullName: 'Ahmed Ali Khan',
      fatherName: 'Tariq Khan',
      cnic: '35202-9999999-9',
      primaryMobile: '0321-0000000'
    });

    expect(res.hasDuplicate).toBe(true);
    expect(res.matches[0].matchType).toBe('name_and_father_name');
  });

  it('does not flag separate distinct clients as duplicates', () => {
    const res = checkForDuplicateCustomer(existingClients, {
      fullName: 'Fatima Zahra',
      fatherName: 'Syed Hasan Ali',
      cnic: '42101-7654321-2',
      primaryMobile: '0321-9876543'
    });

    expect(res.hasDuplicate).toBe(false);
    expect(res.matches.length).toBe(0);
  });
});
