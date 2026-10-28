import { describe, it, expect } from 'vitest';
import { filterCustomersByDate, filterPaymentsByDate, filterServicesByDate, sanitizeExcelCell } from '../services/export/excelExport';
import { Customer } from '../types/customer';
import { TaxService } from '../types/service';
import { PaymentTransaction } from '../types/payment';
import { createFullDatabaseBackup, restoreDatabaseBackup } from '../services/backup/backupService';
import { dbService } from '../services/sqlite/db';

describe('Date-Filtered PDF & Excel Exports & Disaster Recovery Tests', () => {
  const sampleCustomers: Customer[] = [
    {
      id: 'C-01',
      fullName: 'Muhammad Usman',
      fatherName: 'Usman Senior',
      cnic: '42101-1234567-1',
      primaryMobile: '+923001234567',
      whatsappNumber: '+923001234567',
      address: 'Hub, Balochistan',
      status: 'active',
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
      syncStatus: 'synced',
      version: 1
    },
    {
      id: 'C-02',
      fullName: 'Rashid Khan',
      fatherName: 'Khan Senior',
      cnic: '42101-7654321-2',
      primaryMobile: '+923211234567',
      whatsappNumber: '+923211234567',
      address: 'Winder, Balochistan',
      status: 'active',
      createdAt: '2026-06-20T10:00:00.000Z',
      updatedAt: '2026-06-20T10:00:00.000Z',
      syncStatus: 'synced',
      version: 1
    }
  ];

  const samplePayments: PaymentTransaction[] = [
    {
      id: 'P-01',
      receiptNumber: 'REC-001',
      customerId: 'C-01',
      serviceId: 'S-01',
      taxYear: '2025',
      amount: 5000,
      paymentMethod: 'Cash',
      paymentDate: '2026-02-10',
      receivedBy: 'admin',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-1',
      syncStatus: 'synced',
      createdAt: '2026-02-10T10:00:00.000Z',
      updatedAt: '2026-02-10T10:00:00.000Z',
      version: 1
    },
    {
      id: 'P-02',
      receiptNumber: 'REC-002',
      customerId: 'C-02',
      serviceId: 'S-02',
      taxYear: '2025',
      amount: 7500,
      paymentMethod: 'Bank Transfer',
      paymentDate: '2026-07-15',
      receivedBy: 'admin',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-2',
      syncStatus: 'synced',
      createdAt: '2026-07-15T10:00:00.000Z',
      updatedAt: '2026-07-15T10:00:00.000Z',
      version: 1
    }
  ];

  it('filters customers accurately by date range', () => {
    // Only C-01 is in Jan-March 2026
    const q1Customers = filterCustomersByDate(sampleCustomers, { fromDate: '2026-01-01', toDate: '2026-03-31' });
    expect(q1Customers.length).toBe(1);
    expect(q1Customers[0].id).toBe('C-01');

    // All customers included when no range specified
    const allCustomers = filterCustomersByDate(sampleCustomers, {});
    expect(allCustomers.length).toBe(2);
  });

  it('filters payments accurately by payment date range', () => {
    const julyPayments = filterPaymentsByDate(samplePayments, { fromDate: '2026-07-01', toDate: '2026-07-31' });
    expect(julyPayments.length).toBe(1);
    expect(julyPayments[0].id).toBe('P-02');
  });

  it('sanitizes formula injection characters to prevent spreadsheet command execution', () => {
    expect(sanitizeExcelCell('=1+1')).toBe("'=1+1");
    expect(sanitizeExcelCell('+500')).toBe("'+500");
    expect(sanitizeExcelCell('-250')).toBe("'-250");
    expect(sanitizeExcelCell('@SUM(A1:B1)')).toBe("'@SUM(A1:B1)");
    expect(sanitizeExcelCell('Safe Taxpayer')).toBe('Safe Taxpayer');
  });

  it('generates a restorable full database backup with SHA-256 integrity checksum', async () => {
    await dbService.init();
    const backupJson = await createFullDatabaseBackup();
    const parsed = JSON.parse(backupJson);

    expect(parsed.app).toBe('TaxCustomerManagement');
    expect(parsed.payload).toBeDefined();
    expect(parsed.checksum).toBeDefined();
    expect(typeof parsed.checksum).toBe('string');
    expect(parsed.checksum.length).toBe(64); // SHA-256 hex string length
  });

  it('rejects tampered or corrupted database backup files on restore', async () => {
    await dbService.init();
    const backupJson = await createFullDatabaseBackup();
    const parsed = JSON.parse(backupJson);

    // Tamper with payload without recomputing checksum
    parsed.payload = parsed.payload + '{"tampered":true}';
    const tamperedJson = JSON.stringify(parsed);

    const restoreRes = await restoreDatabaseBackup(tamperedJson);
    expect(restoreRes.success).toBe(false);
    expect(restoreRes.message.toLowerCase()).toContain('integrity check failed');
  });
});
