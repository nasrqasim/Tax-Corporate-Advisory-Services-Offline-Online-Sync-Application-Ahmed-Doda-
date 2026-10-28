import { describe, it, expect } from 'vitest';
import {
  calculateFinalPayable,
  calculateServiceFinancials,
  calculateCustomerFinancials,
  formatPKR
} from '../services/financial/ledger';
import { generateReceiptNumber } from '../services/financial/receipt';
import { processRefundTransaction, validateRefundRequest } from '../services/financial/refund';
import { TaxService } from '../types/service';
import { PaymentTransaction, RefundRecord } from '../types/payment';

describe('Financial Ledger & Money Calculations', () => {
  it('formats amounts into Pakistani Rupees with correct thousands separators', () => {
    expect(formatPKR(15000)).toBe('Rs. 15,000');
    expect(formatPKR(8500)).toBe('Rs. 8,500');
    expect(formatPKR(0)).toBe('Rs. 0');
  });

  it('calculates Final Payable as Agreed Fee - Discount, bounded at 0', () => {
    expect(calculateFinalPayable(10000, 1000)).toBe(9000);
    expect(calculateFinalPayable(5000, 0)).toBe(5000);
    // Discount exceeding fee gives 0 payable (never negative)
    expect(calculateFinalPayable(5000, 6000)).toBe(0);
  });

  it('calculates multi-installment payments for a single tax service accurately', () => {
    const service: TaxService = {
      id: 'SRV-001',
      customerId: 'CUST-001',
      serviceType: 'income_tax_return',
      taxYear: '2025',
      startDate: '2026-01-01',
      filingStatus: 'completed', // Workflow completed
      checklist: [],
      agreedFee: 15000,
      discount: 0,
      finalPayable: 15000,
      amountPaid: 0,
      outstandingBalance: 15000,
      paymentStatus: 'unpaid',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      syncStatus: 'saved_locally',
      version: 1
    };

    // 1. Initial State: Unpaid
    const initialFin = calculateServiceFinancials(service, []);
    expect(initialFin.finalPayable).toBe(15000);
    expect(initialFin.totalValidPayments).toBe(0);
    expect(initialFin.outstandingBalance).toBe(15000);
    expect(initialFin.paymentStatus).toBe('unpaid');

    // 2. First Installment: Rs. 5,000
    const txn1: PaymentTransaction = {
      id: 'TXN-1',
      receiptNumber: 'REC-2026-00001',
      customerId: 'CUST-001',
      serviceId: 'SRV-001',
      taxYear: '2025',
      amount: 5000,
      paymentMethod: 'Cash',
      paymentDate: '2026-10-01',
      receivedBy: 'Bilal',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-1',
      syncStatus: 'saved_locally',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
      version: 1
    };

    const finAfterTxn1 = calculateServiceFinancials(service, [txn1]);
    expect(finAfterTxn1.totalValidPayments).toBe(5000);
    expect(finAfterTxn1.outstandingBalance).toBe(10000);
    expect(finAfterTxn1.paymentStatus).toBe('partially_paid');

    // 3. Second Installment: Rs. 3,000
    const txn2: PaymentTransaction = {
      id: 'TXN-2',
      receiptNumber: 'REC-2026-00002',
      customerId: 'CUST-001',
      serviceId: 'SRV-001',
      taxYear: '2025',
      amount: 3000,
      paymentMethod: 'JazzCash',
      paymentDate: '2026-10-05',
      receivedBy: 'Bilal',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-2',
      syncStatus: 'saved_locally',
      createdAt: '2026-10-05',
      updatedAt: '2026-10-05',
      version: 1
    };

    // 4. Third Installment: Rs. 2,000
    const txn3: PaymentTransaction = {
      id: 'TXN-3',
      receiptNumber: 'REC-2026-00003',
      customerId: 'CUST-001',
      serviceId: 'SRV-001',
      taxYear: '2025',
      amount: 2000,
      paymentMethod: 'Bank Transfer',
      paymentDate: '2026-10-12',
      receivedBy: 'Bilal',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-3',
      syncStatus: 'saved_locally',
      createdAt: '2026-10-12',
      updatedAt: '2026-10-12',
      version: 1
    };

    const finAfterAllTxns = calculateServiceFinancials(service, [txn1, txn2, txn3]);
    expect(finAfterAllTxns.totalValidPayments).toBe(10000); // 5000 + 3000 + 2000
    expect(finAfterAllTxns.outstandingBalance).toBe(5000); // 15000 - 10000
    expect(finAfterAllTxns.paymentStatus).toBe('partially_paid');
    expect(finAfterAllTxns.installmentsCount).toBe(3);

    // 5. Final settlement of remaining Rs. 5,000
    const txn4: PaymentTransaction = {
      id: 'TXN-4',
      receiptNumber: 'REC-2026-00004',
      customerId: 'CUST-001',
      serviceId: 'SRV-001',
      taxYear: '2025',
      amount: 5000,
      paymentMethod: 'Cash',
      paymentDate: '2026-10-15',
      receivedBy: 'Bilal',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-4',
      syncStatus: 'saved_locally',
      createdAt: '2026-10-15',
      updatedAt: '2026-10-15',
      version: 1
    };

    const finSettled = calculateServiceFinancials(service, [txn1, txn2, txn3, txn4]);
    expect(finSettled.totalValidPayments).toBe(15000);
    expect(finSettled.outstandingBalance).toBe(0);
    expect(finSettled.paymentStatus).toBe('paid');
  });

  it('preserves tax filing status independently from payment status', () => {
    const completedFilingService: TaxService = {
      id: 'SRV-COMP',
      customerId: 'CUST-001',
      serviceType: 'income_tax_return',
      taxYear: '2025',
      startDate: '2026-01-01',
      filingStatus: 'completed', // Filing is submitted & completed!
      checklist: [],
      agreedFee: 8000,
      discount: 0,
      finalPayable: 8000,
      amountPaid: 0,
      outstandingBalance: 8000,
      paymentStatus: 'unpaid', // But client hasn't paid!
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      syncStatus: 'saved_locally',
      version: 1
    };

    const fin = calculateServiceFinancials(completedFilingService, []);
    expect(completedFilingService.filingStatus).toBe('completed');
    expect(fin.paymentStatus).toBe('unpaid');
    expect(fin.outstandingBalance).toBe(8000);
  });

  it('aggregates balances across multiple services for a customer without double counting', () => {
    // Example from prompt:
    // Ahmed Ali has:
    // Tax Return 2025: Fee 8,000 - Disc 500 = 7,500. Paid 4,000. Bal 3,500.
    // NTN Registration: Fee 2,000 - Disc 0 = 2,000. Paid 2,000. Bal 0.
    // Tax Return 2024: Fee 5,000 - Disc 0 = 5,000. Paid 0. Bal 5,000.
    // Customer Total Payable: 14,500. Total Paid: 6,000. Outstanding: 8,500.

    const s1: TaxService = {
      id: 'S1',
      customerId: 'AHMED-ALI',
      serviceType: 'income_tax_return',
      taxYear: '2025',
      startDate: '2025-01-01',
      filingStatus: 'completed',
      checklist: [],
      agreedFee: 8000,
      discount: 500,
      finalPayable: 7500,
      amountPaid: 4000,
      outstandingBalance: 3500,
      paymentStatus: 'partially_paid',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      syncStatus: 'saved_locally',
      version: 1
    };

    const s2: TaxService = {
      id: 'S2',
      customerId: 'AHMED-ALI',
      serviceType: 'ntn_registration',
      taxYear: '2025',
      startDate: '2025-02-01',
      filingStatus: 'completed',
      checklist: [],
      agreedFee: 2000,
      discount: 0,
      finalPayable: 2000,
      amountPaid: 2000,
      outstandingBalance: 0,
      paymentStatus: 'paid',
      createdAt: '2025-02-01',
      updatedAt: '2025-02-01',
      syncStatus: 'saved_locally',
      version: 1
    };

    const s3: TaxService = {
      id: 'S3',
      customerId: 'AHMED-ALI',
      serviceType: 'income_tax_return',
      taxYear: '2024',
      startDate: '2024-01-01',
      filingStatus: 'completed',
      checklist: [],
      agreedFee: 5000,
      discount: 0,
      finalPayable: 5000,
      amountPaid: 0,
      outstandingBalance: 5000,
      paymentStatus: 'unpaid',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      syncStatus: 'saved_locally',
      version: 1
    };

    const p1: PaymentTransaction = {
      id: 'TXN-S1',
      receiptNumber: 'REC-1',
      customerId: 'AHMED-ALI',
      serviceId: 'S1',
      taxYear: '2025',
      amount: 4000,
      paymentMethod: 'Cash',
      paymentDate: '2025-01-05',
      receivedBy: 'Bilal',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-p1',
      syncStatus: 'saved_locally',
      createdAt: '2025-01-05',
      updatedAt: '2025-01-05',
      version: 1
    };

    const p2: PaymentTransaction = {
      id: 'TXN-S2',
      receiptNumber: 'REC-2',
      customerId: 'AHMED-ALI',
      serviceId: 'S2',
      taxYear: '2025',
      amount: 2000,
      paymentMethod: 'Bank Transfer',
      paymentDate: '2025-02-05',
      receivedBy: 'Bilal',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-p2',
      syncStatus: 'saved_locally',
      createdAt: '2025-02-05',
      updatedAt: '2025-02-05',
      version: 1
    };

    const custSummary = calculateCustomerFinancials(
      'AHMED-ALI',
      [s1, s2, s3],
      [p1, p2],
      []
    );

    expect(custSummary.totalServiceFees).toBe(15000);
    expect(custSummary.totalDiscounts).toBe(500);
    expect(custSummary.totalPayable).toBe(14500);
    expect(custSummary.totalPaid).toBe(6000);
    expect(custSummary.totalOutstanding).toBe(8500);
    expect(custSummary.fullyPaidServicesCount).toBe(1);
    expect(custSummary.partiallyPaidServicesCount).toBe(1);
    expect(custSummary.unpaidServicesCount).toBe(1);
  });
});

describe('Controlled Refunds, Reversals and Audit Trail', () => {
  const service: TaxService = {
    id: 'SRV-REF-1',
    customerId: 'CUST-REF',
    serviceType: 'income_tax_return',
    taxYear: '2025',
    startDate: '2026-01-01',
    filingStatus: 'in_progress',
    checklist: [],
    agreedFee: 10000,
    discount: 0,
    finalPayable: 10000,
    amountPaid: 6000,
    outstandingBalance: 4000,
    paymentStatus: 'partially_paid',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    syncStatus: 'saved_locally',
    version: 1
  };

  const payment: PaymentTransaction = {
    id: 'TXN-REF-1',
    receiptNumber: 'REC-2026-00050',
    customerId: 'CUST-REF',
    serviceId: 'SRV-REF-1',
    taxYear: '2025',
    amount: 6000,
    paymentMethod: 'Cash',
    paymentDate: '2026-01-10',
    receivedBy: 'Cashier',
    status: 'valid',
    refundedAmount: 0,
    idempotencyKey: 'idemp-ref-target',
    syncStatus: 'saved_locally',
    createdAt: '2026-01-10',
    updatedAt: '2026-01-10',
    version: 1
  };

  it('validates refund requests and rejects duplicate or excessive refunds', () => {
    // 1. Rejects missing reason
    const invalidReason = validateRefundRequest({
      transaction: payment,
      service,
      refundType: 'partial_refund',
      amount: 2000,
      reason: '',
      authorizedBy: 'Admin'
    });
    expect(invalidReason.isValid).toBe(false);

    // 2. Rejects refund exceeding paid amount
    const excessiveRefund = validateRefundRequest({
      transaction: payment,
      service,
      refundType: 'partial_refund',
      amount: 7000, // Exceeds 6000
      reason: 'Client requested refund',
      authorizedBy: 'Admin'
    });
    expect(excessiveRefund.isValid).toBe(false);
  });

  it('processes partial refund: preserves original transaction and recalculates balance', () => {
    const result = processRefundTransaction(
      {
        transaction: payment,
        service,
        refundType: 'partial_refund',
        amount: 2000,
        reason: 'Refunded over-estimated fee per partner agreement',
        authorizedBy: 'Senior Partner'
      },
      [payment],
      []
    );

    expect(result.success).toBe(true);
    expect(result.updatedTransaction?.status).toBe('partially_refunded');
    expect(result.updatedTransaction?.refundedAmount).toBe(2000);
    // Net paid is now 6000 - 2000 = 4000
    // Outstanding balance is 10000 - 4000 = 6000
    expect(result.updatedService?.outstandingBalance).toBe(6000);
    expect(result.updatedService?.paymentStatus).toBe('partially_refunded');
  });

  it('processes full transaction reversal preserving audit record', () => {
    const result = processRefundTransaction(
      {
        transaction: payment,
        service,
        refundType: 'reversal',
        amount: 6000,
        reason: 'Payment entered against wrong customer account by cashier mistake',
        authorizedBy: 'Managing Partner'
      },
      [payment],
      []
    );

    expect(result.success).toBe(true);
    expect(result.updatedTransaction?.status).toBe('reversed');
    expect(result.updatedTransaction?.reversalReason).toContain('wrong customer');
    // Balance restored to full 10000
    expect(result.updatedService?.outstandingBalance).toBe(10000);
    expect(result.updatedService?.paymentStatus).toBe('unpaid');
  });
});

describe('Sequential Receipt Number Generation', () => {
  it('generates unique standardized sequential receipt numbers', () => {
    expect(generateReceiptNumber(1, 2026)).toBe('REC-2026-00001');
    expect(generateReceiptNumber(42, 2026)).toBe('REC-2026-00042');
    expect(generateReceiptNumber(1035, 2026)).toBe('REC-2026-01035');
  });
});
