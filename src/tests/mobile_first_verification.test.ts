import { describe, it, expect } from 'vitest';
import { dbService } from '../services/sqlite/db';
import { getWhatsAppUrl, getCallUri, normalizePhone } from '../services/validation/phone';
import { calculateCustomerFinancials, calculateServiceFinancials, formatPKR } from '../services/financial/ledger';
import { TaxService } from '../types/service';
import { PaymentTransaction } from '../types/payment';

describe('Mobile-First & Branding Integrity Verification', () => {
  it('loads exact default business profile branding for Arslan Tax & Corporate Advisory Services', async () => {
    await dbService.init();
    const profile = await dbService.getBusinessProfile();

    expect(profile.officeName).toBe('Arslan Tax & Corporate Advisory Services');
    expect(profile.ntn).toBe('7392814-2');
    expect(profile.address).toContain('Winder, Hub, Balochistan, Pakistan');
  });

  it('generates compliant WhatsApp deep links and tel URIs for Pakistani mobile networks', () => {
    const rawMobile = '03001234567';
    const normalized = normalizePhone(rawMobile);
    expect(normalized).toBe('+923001234567');

    const callUri = getCallUri(rawMobile);
    expect(callUri).toBe('tel:+923001234567');

    const waUrl = getWhatsAppUrl(rawMobile, 'Assalam-o-Alaikum, contacting from Arslan Tax & Corporate Advisory Services.');
    expect(waUrl).toContain('https://wa.me/923001234567?text=');
    expect(waUrl).toContain('Arslan%20Tax%20%26%20Corporate%20Advisory%20Services');
  });

  it('guarantees accurate financial calculations for mobile card summaries and ledger metrics', () => {
    const mockService: TaxService = {
      id: 'SRV-TEST-001',
      customerId: 'CUST-001',
      serviceType: 'income_tax_return',
      taxYear: '2025',
      startDate: '2026-07-01',
      filingDeadline: '2026-09-30',
      filingStatus: 'completed',
      checklist: [],
      agreedFee: 10000,
      discount: 1000,
      finalPayable: 9000,
      amountPaid: 0,
      outstandingBalance: 9000,
      paymentStatus: 'unpaid',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      syncStatus: 'saved_locally',
      version: 1
    };

    const mockPayments: PaymentTransaction[] = [
      {
        id: 'TXN-001',
        receiptNumber: 'REC-2026-00001',
        customerId: 'CUST-001',
        serviceId: 'SRV-TEST-001',
        taxYear: '2025',
        amount: 4000,
        paymentDate: '2026-07-05T10:00:00.000Z',
        paymentMethod: 'Cash',
        status: 'valid',
        refundedAmount: 0,
        idempotencyKey: 'IDEMP-TEST-001',
        receivedBy: 'Cashier',
        createdAt: '2026-07-05T10:00:00.000Z',
        updatedAt: '2026-07-05T10:00:00.000Z',
        syncStatus: 'saved_locally',
        version: 1
      }
    ];

    const serviceFin = calculateServiceFinancials(mockService, mockPayments, []);
    expect(serviceFin.finalPayable).toBe(9000);
    expect(serviceFin.netPaymentsApplied).toBe(4000);
    expect(serviceFin.outstandingBalance).toBe(5000);
    expect(serviceFin.paymentStatus).toBe('partially_paid');

    const customerFin = calculateCustomerFinancials('CUST-001', [mockService], mockPayments, []);
    expect(customerFin.totalServiceFees).toBe(10000);
    expect(customerFin.totalDiscounts).toBe(1000);
    expect(customerFin.totalPayable).toBe(9000);
    expect(customerFin.totalPaid).toBe(4000);
    expect(customerFin.totalOutstanding).toBe(5000);
    expect(customerFin.partiallyPaidServicesCount).toBe(1);
    expect(customerFin.unpaidServicesCount).toBe(0);
    expect(customerFin.fullyPaidServicesCount).toBe(0);

    // Formatted strings
    expect(formatPKR(customerFin.totalOutstanding)).toBe('Rs. 5,000');
  });
});
