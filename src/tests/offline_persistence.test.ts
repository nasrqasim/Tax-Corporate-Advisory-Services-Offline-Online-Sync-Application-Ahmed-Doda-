import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../services/sqlite/db';
import { outboxManager } from '../services/sync/outbox';
import { encryptData, decryptData, computeSha256 } from '../services/security/crypto';
import { createFullDatabaseBackup, restoreDatabaseBackup } from '../services/backup/backupService';
import { Customer } from '../types/customer';
import { TaxService } from '../types/service';

describe('Offline Persistence & Database Engine', () => {
  beforeEach(async () => {
    await dbService.init();
  });

  it('loads seeded Pakistani tax clients and services successfully', async () => {
    const customers = await dbService.getCustomers();
    expect(customers.length).toBeGreaterThanOrEqual(3);

    const ahmed = customers.find((c) => c.fullName.includes('Ahmed Ali'));
    expect(ahmed).toBeDefined();
    expect(ahmed?.cnic).toBe('35202-1234567-1');
  });

  it('performs indexed offline searches by Name, Phone, and CNIC', async () => {
    // 1. By Name
    const nameResults = await dbService.searchCustomers('Ahmed', 'name');
    expect(nameResults.length).toBeGreaterThanOrEqual(1);
    expect(nameResults[0].fullName).toContain('Ahmed');

    // 2. By Phone
    const phoneResults = await dbService.searchCustomers('03001234567', 'phone');
    expect(phoneResults.length).toBeGreaterThanOrEqual(1);

    // 3. By CNIC
    const cnicResults = await dbService.searchCustomers('3520212345671', 'cnic');
    expect(cnicResults.length).toBeGreaterThanOrEqual(1);
  });

  it('saves new customers locally and enqueues outbox operation with version tracking', async () => {
    const newCust: Customer = {
      id: '',
      fullName: 'Tariq Mehmood',
      fatherName: 'Abdul Ghafoor',
      cnic: '37405-1122334-5',
      primaryMobile: '03011234567',
      whatsappNumber: '03011234567',
      address: 'F-10 Markaz, Islamabad',
      status: 'active',
      createdAt: '',
      updatedAt: '',
      syncStatus: 'saved_locally',
      version: 1
    };

    const saved = await dbService.saveCustomer(newCust, 'admin');
    expect(saved.id).toContain('CUST-');
    expect(saved.fullName).toBe('Tariq Mehmood');

    // Verify outbox queued
    const outbox = await dbService.getOutboxEntries('pending');
    const custOutbox = outbox.find((o) => o.entityId === saved.id);
    expect(custOutbox).toBeDefined();
    expect(custOutbox?.operation).toBe('INSERT');
    expect(custOutbox?.idempotencyKey).toBeDefined();
  });

  it('records offline payment with durable receipt generation and outbox idempotency', async () => {
    const customers = await dbService.getCustomers();
    const targetCust = customers.find((c) => c.id === 'CUST-2026-0001') || customers[0];
    const services = await dbService.getTaxServices(targetCust.id);
    const targetService = services[0];

    const prevBalance = targetService.outstandingBalance;

    const recorded = await dbService.recordPayment({
      customerId: targetCust.id,
      serviceId: targetService.id,
      taxYear: targetService.taxYear,
      amount: 1000,
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString(),
      receivedBy: 'Bilal Cashier',
      notes: 'Test offline payment transaction',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: `idemp-test-${Date.now()}`
    }, 'admin');

    expect(recorded.receiptNumber).toMatch(/^REC-\d{4}-\d{5}$/);
    expect(recorded.id).toContain('TXN-');

    // Verify service balance updated locally
    const updatedServices = await dbService.getTaxServices(targetCust.id);
    const refreshedService = updatedServices.find((s) => s.id === targetService.id);
    expect(refreshedService?.outstandingBalance).toBe(Math.max(0, prevBalance - 1000));

    // Verify outbox entry
    const outbox = await dbService.getOutboxEntries();
    const payOutbox = outbox.find((o) => o.entityId === recorded.id);
    expect(payOutbox).toBeDefined();
    expect(payOutbox?.idempotencyKey).toBe(recorded.idempotencyKey);
  });
});

describe('Security & AES-256-GCM Encryption', () => {
  it('encrypts and decrypts sensitive document data with Web Crypto API', async () => {
    const sensitiveData = 'CNIC Scanned Confidential Payload - Front & Back';
    const secretKey = 'tax_firm_master_passphrase';

    const encrypted = await encryptData(sensitiveData, secretKey);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(sensitiveData);

    const decrypted = await decryptData(encrypted, secretKey);
    expect(decrypted).toBe(sensitiveData);
  });

  it('computes SHA-256 checksums consistently', async () => {
    const hash1 = await computeSha256('TaxLedgerRecord-2026');
    const hash2 = await computeSha256('TaxLedgerRecord-2026');
    const hash3 = await computeSha256('ModifiedRecord');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64); // 256 bits = 64 hex characters
  });
});

describe('Database Backup & Verified Disaster Recovery', () => {
  it('creates an encrypted backup package with SHA-256 checksum', async () => {
    const backupJson = await createFullDatabaseBackup('my_secure_backup_password');
    const pkg = JSON.parse(backupJson);

    expect(pkg.app).toBe('TaxCustomerManagement');
    expect(pkg.isEncrypted).toBe(true);
    expect(pkg.checksum).toBeDefined();
    expect(pkg.checksum.length).toBe(64);
  });

  it('restores and verifies database backup integrity', async () => {
    const password = 'restore_test_password';
    const backupJson = await createFullDatabaseBackup(password);

    const restoreResult = await restoreDatabaseBackup(backupJson, password);
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.message).toContain('successfully restored');
  });

  it('rejects tampered backups where SHA-256 checksum mismatches', async () => {
    const backupJson = await createFullDatabaseBackup();
    const pkg = JSON.parse(backupJson);

    // Tamper with payload
    pkg.payload = pkg.payload + ' '; // altered

    const restoreResult = await restoreDatabaseBackup(JSON.stringify(pkg));
    expect(restoreResult.success).toBe(false);
    expect(restoreResult.message).toContain('Integrity check failed');
  });
});
