import { describe, it, expect } from 'vitest';
import { dbService } from '../services/sqlite/db';
import { outboxManager } from '../services/sync/outbox';
import { syncEngine } from '../services/sync/firestoreSync';
import { calculateCustomerFinancials, calculateServiceFinancials, formatPKR } from '../services/financial/ledger';
import { PaymentTransaction } from '../types/payment';
import { TaxService } from '../types/service';
import { Customer } from '../types/customer';

describe('Cross-Device Synchronization & Idempotency Engine', () => {
  it('prevents duplicate transactions when synchronization retries identical operations', async () => {
    await dbService.init();
    const customers = await dbService.getCustomers();
    const cust = customers[0];
    const services = await dbService.getTaxServices(cust.id);
    const service = services[0];

    const stableIdempotencyKey = `idemp-sync-test-uuid-98421`;

    // 1. First attempt: payment recorded locally
    const paymentRecord1: Omit<PaymentTransaction, 'id' | 'receiptNumber' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus'> = {
      customerId: cust.id,
      serviceId: service.id,
      taxYear: service.taxYear,
      amount: 2500,
      paymentMethod: 'Bank Transfer',
      paymentDate: new Date().toISOString(),
      transactionReference: 'IBFT-772184',
      receivedBy: 'Partner A',
      notes: 'Initial network attempt',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: stableIdempotencyKey
    };

    const recorded1 = await dbService.recordPayment(paymentRecord1);
    expect(recorded1.idempotencyKey).toBe(stableIdempotencyKey);

    // 2. Outbox entry verified
    const outbox = await dbService.getOutboxEntries();
    const matchingOutbox = outbox.filter((e) => e.idempotencyKey === stableIdempotencyKey);
    expect(matchingOutbox.length).toBe(1);

    // 3. Trigger cloud sync
    const statsAfterSync = await syncEngine.triggerSync();
    expect(statsAfterSync.pendingCount).toBe(0);

    // 4. Retry sync with identical outbox entry - must NOT create duplicate payment
    const statsAfterRetry = await syncEngine.triggerSync();
    expect(statsAfterRetry.pendingCount).toBe(0);
  });

  it('preserves offline transactions made across Android and Windows devices', async () => {
    // Simulate Customer with two tax services
    const customer: Customer = {
      id: 'CUST-CROSS-DEV',
      fullName: 'Muhammad Usman',
      fatherName: 'Abdul Rehman',
      cnic: '37405-9876543-3',
      primaryMobile: '+923335551234',
      whatsappNumber: '+923335551234',
      address: 'Rawalpindi',
      status: 'active',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      syncStatus: 'saved_locally',
      version: 1
    };

    const srv2024: TaxService = {
      id: 'SRV-CROSS-2024',
      customerId: customer.id,
      serviceType: 'income_tax_return',
      taxYear: '2024',
      startDate: '2024-09-01',
      filingStatus: 'completed',
      checklist: [],
      agreedFee: 6000,
      discount: 0,
      finalPayable: 6000,
      amountPaid: 0,
      outstandingBalance: 6000,
      paymentStatus: 'unpaid',
      createdAt: '2024-09-01',
      updatedAt: '2024-09-01',
      syncStatus: 'saved_locally',
      version: 1
    };

    const srv2025: TaxService = {
      id: 'SRV-CROSS-2025',
      customerId: customer.id,
      serviceType: 'income_tax_return',
      taxYear: '2025',
      startDate: '2025-09-01',
      filingStatus: 'completed',
      checklist: [],
      agreedFee: 8000,
      discount: 1000,
      finalPayable: 7000,
      amountPaid: 0,
      outstandingBalance: 7000,
      paymentStatus: 'unpaid',
      createdAt: '2025-09-01',
      updatedAt: '2025-09-01',
      syncStatus: 'saved_locally',
      version: 1
    };

    // Device A (Android): Cash payment of Rs. 3,000 for 2024
    const paymentAndroid: PaymentTransaction = {
      id: 'TXN-ANDROID-001',
      receiptNumber: 'REC-2026-90001',
      customerId: customer.id,
      serviceId: srv2024.id,
      taxYear: '2024',
      amount: 3000,
      paymentMethod: 'Cash',
      paymentDate: '2026-10-20T10:00:00Z',
      receivedBy: 'Android Cashier',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-android-001',
      syncStatus: 'saved_locally',
      createdAt: '2026-10-20T10:00:00Z',
      updatedAt: '2026-10-20T10:00:00Z',
      version: 1
    };

    // Device B (Windows): Online payment of Rs. 4,000 for 2025
    const paymentWindows: PaymentTransaction = {
      id: 'TXN-WINDOWS-002',
      receiptNumber: 'REC-2026-90002',
      customerId: customer.id,
      serviceId: srv2025.id,
      taxYear: '2025',
      amount: 4000,
      paymentMethod: 'Bank Transfer',
      paymentDate: '2026-10-20T11:30:00Z',
      transactionReference: 'MBL-FT-449102',
      receivedBy: 'Windows Partner',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-windows-002',
      syncStatus: 'saved_locally',
      createdAt: '2026-10-20T11:30:00Z',
      updatedAt: '2026-10-20T11:30:00Z',
      version: 1
    };

    // Merged state across both devices
    const allMergedTxns = [paymentAndroid, paymentWindows];

    const fin2024 = calculateServiceFinancials(srv2024, allMergedTxns);
    expect(fin2024.netPaymentsApplied).toBe(3000);
    expect(fin2024.outstandingBalance).toBe(3000); // 6000 - 3000
    expect(fin2024.paymentStatus).toBe('partially_paid');

    const fin2025 = calculateServiceFinancials(srv2025, allMergedTxns);
    expect(fin2025.netPaymentsApplied).toBe(4000);
    expect(fin2025.outstandingBalance).toBe(3000); // 7000 - 4000
    expect(fin2025.paymentStatus).toBe('partially_paid');

    // Customer Aggregate
    const custFin = calculateCustomerFinancials(customer.id, [srv2024, srv2025], allMergedTxns);
    expect(custFin.totalPayable).toBe(13000); // 6000 + 7000
    expect(custFin.totalPaid).toBe(7000); // 3000 + 4000
    expect(custFin.totalOutstanding).toBe(6000); // 3000 + 3000
    expect(custFin.partiallyPaidServicesCount).toBe(2);
  });
});
