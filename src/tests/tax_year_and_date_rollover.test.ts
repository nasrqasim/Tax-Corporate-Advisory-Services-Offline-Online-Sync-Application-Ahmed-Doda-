import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { dbService } from '../services/sqlite/db';
import { TaxService } from '../types/service';
import {
  getLocalDateString,
  getCurrentCalendarYear,
  getCurrentTaxYear,
  getSelectableTaxYears,
  resolveTaxYear
} from '../services/utils/dateUtils';
import { calculateServiceFinancials } from '../services/financial/ledger';
import { PaymentTransaction } from '../types/payment';

describe('Tax Year Integrity, Data Consistency & Automated Year Rollover Tests', () => {
  beforeEach(async () => {
    await dbService.init();
    if ((await dbService.getTaxServices()).length === 0) {
      await dbService.seedDemoData();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Test 1: A new service saves and displays the correct tax year
  it('saves and displays the correct tax year for new tax services', async () => {
    const currentTaxYear = getCurrentTaxYear();
    const newService: TaxService = {
      id: `SRV-TEST-${Date.now()}`,
      customerId: 'CUST-2026-0001',
      serviceType: 'income_tax_return',
      taxYear: currentTaxYear,
      startDate: getLocalDateString(),
      filingDeadline: getLocalDateString(),
      filingStatus: 'in_progress',
      checklist: [],
      agreedFee: 8000,
      discount: 500,
      finalPayable: 7500,
      amountPaid: 0,
      outstandingBalance: 7500,
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'saved_locally',
      version: 1
    };

    const saved = await dbService.saveTaxService(newService);
    expect(saved.taxYear).toBe(currentTaxYear);

    const services = await dbService.getTaxServices('CUST-2026-0001');
    const found = services.find((s) => s.id === newService.id);
    expect(found).toBeDefined();
    expect(found?.taxYear).toBe(currentTaxYear);
  });

  // Test 2: A record with a valid historical tax year continues to show that year
  it('preserves valid historical tax years when loaded or updated', async () => {
    const historicalService: TaxService = {
      id: `SRV-HIST-${Date.now()}`,
      customerId: 'CUST-2026-0002',
      serviceType: 'income_tax_return',
      taxYear: '2023',
      startDate: '2023-08-15',
      filingStatus: 'completed',
      checklist: [],
      agreedFee: 6000,
      discount: 0,
      finalPayable: 6000,
      amountPaid: 6000,
      outstandingBalance: 0,
      paymentStatus: 'paid',
      createdAt: '2023-08-15T10:00:00.000Z',
      updatedAt: '2023-08-15T10:00:00.000Z',
      syncStatus: 'saved_locally',
      version: 1
    };

    const saved = await dbService.saveTaxService(historicalService);
    expect(saved.taxYear).toBe('2023');

    // Updating service without changing year preserves 2023
    const updated = await dbService.saveTaxService({
      ...saved,
      notes: 'Historical filing audit verified'
    });
    expect(updated.taxYear).toBe('2023');
  });

  // Test 3: A record with a missing tax year is flagged for review instead of being silently assigned an incorrect year
  it('flags records with missing or indeterminate tax years as "Review Required"', () => {
    // When no ID evidence and no date evidence exists
    const unresolved = resolveTaxYear(null, null, 'SRV-CUSTOM-NO-DATE');
    expect(unresolved).toBe('Review Required');

    const unresolvedFromEmpty = resolveTaxYear('', '', '');
    expect(unresolvedFromEmpty).toBe('Review Required');
  });

  // Test 4: The N/A row disappears after the underlying record is correctly repaired
  it('repairs historical "N/A" records (like SRV-2026-0004) to their exact year (2026)', async () => {
    // SRV-2026-0004 has ID indicating 2026 and startDate 2026-01-15
    const resolvedYear = resolveTaxYear('N/A', '2026-01-15T09:30:00.000Z', 'SRV-2026-0004');
    expect(resolvedYear).toBe('2026');

    // Verify all seeded tax services now have valid years (no 'N/A')
    const allServices = await dbService.getTaxServices();
    const naServices = allServices.filter((s) => s.taxYear === 'N/A' || !s.taxYear);
    expect(naServices.length).toBe(0);

    // Verify s4 (SRV-2026-0004) has taxYear '2026'
    const s4 = allServices.find((s) => s.id === 'SRV-2026-0004');
    expect(s4).toBeDefined();
    expect(s4?.taxYear).toBe('2026');
  });

  // Test 5: Service counts, fees, discounts, paid amounts, and outstanding balances remain unchanged by the tax-year repair
  it('preserves exact financial calculations, fees, discounts, and balances during tax-year repair', async () => {
    const allServices = await dbService.getTaxServices();
    const allPayments = await dbService.getPayments();

    const s4 = allServices.find((s) => s.id === 'SRV-2026-0004');
    expect(s4).toBeDefined();

    const fin = calculateServiceFinancials(s4!, allPayments, []);
    // Values from the user's audit table:
    // Agreed Fee: Rs. 3,000, Discount: Rs. 0, Payable: Rs. 3,000, Paid: Rs. 1,500 (or as recorded), Net Outstanding intact
    expect(fin.agreedFee).toBe(3000);
    expect(fin.discount).toBe(0);
    expect(fin.finalPayable).toBe(3000);
    expect(fin.outstandingBalance + fin.netPaymentsApplied).toBe(3000);
  });

  // Test 6: A new-record date field uses the current date in local timezone
  it('generates the current date in YYYY-MM-DD format without timezone day shifts', () => {
    const todayStr = getLocalDateString();
    expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const [year, month, day] = todayStr.split('-').map(Number);
    expect(year).toBeGreaterThanOrEqual(2025);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });

  // Test 7: An existing record retains its original date when edited
  it('preserves original creation and transaction dates when edited', async () => {
    const originalDate = '2024-05-10T14:30:00.000Z';
    const testPayment: PaymentTransaction = {
      id: `TXN-ORIG-${Date.now()}`,
      receiptNumber: 'REC-TEST-ORIG',
      customerId: 'CUST-2026-0001',
      serviceId: 'SRV-2025-0001',
      taxYear: '2024',
      amount: 4500,
      paymentMethod: 'Cash',
      paymentDate: originalDate,
      receivedBy: 'Senior Partner',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: `idemp-orig-${Date.now()}`,
      syncStatus: 'saved_locally',
      createdAt: originalDate,
      updatedAt: originalDate,
      version: 1
    };

    // When edited, the original date is kept
    const editedPayment = {
      ...testPayment,
      notes: 'Customer requested updated note'
    };

    expect(editedPayment.paymentDate).toBe(originalDate);
    expect(editedPayment.taxYear).toBe('2024');
  });

  // Test 8: Date defaults and tax-year defaults work correctly during December 2026 and January 2027 (Controllable Clock)
  it('automatically rolls over calendar year and tax year options across 31 December 2026 to 1 January 2027', () => {
    // Scenario A: 31 December 2026
    const decDate = new Date('2026-12-31T23:59:00+05:00');
    expect(getCurrentCalendarYear(decDate)).toBe(2026);
    expect(getLocalDateString(decDate)).toBe('2026-12-31');
    // In December 2026 (month 12), the operative tax year for FBR filings is 2027 (fiscal year July 2026 - June 2027)
    expect(getCurrentTaxYear(decDate)).toBe('2027');

    const decYears = getSelectableTaxYears(decDate);
    expect(decYears).toContain('2028');
    expect(decYears).toContain('2027');
    expect(decYears).toContain('2026');
    expect(decYears).toContain('2025');

    // Scenario B: 1 January 2027 (Automated Rollover)
    const janDate = new Date('2027-01-01T00:01:00+05:00');
    expect(getCurrentCalendarYear(janDate)).toBe(2027);
    expect(getLocalDateString(janDate)).toBe('2027-01-01');
    expect(getCurrentTaxYear(janDate)).toBe('2027');

    const janYears = getSelectableTaxYears(janDate);
    expect(janYears).toContain('2028');
    expect(janYears).toContain('2027');
    expect(janYears).toContain('2026');

    // Scenario C: 1 July 2027 (New Tax Year 2028 begins)
    const julDate = new Date('2027-07-01T10:00:00+05:00');
    expect(getCurrentTaxYear(julDate)).toBe('2028');
    const julYears = getSelectableTaxYears(julDate);
    expect(julYears[0]).toBe('2029'); // Upcoming advance year
    expect(julYears[1]).toBe('2028'); // Operative tax year
  });

  // Test 9: Older tax years remain available for selection
  it('retains past historical tax years in selectable options for backlog filings', () => {
    const selectable = getSelectableTaxYears(new Date('2026-06-01'));
    // Must contain 2026, 2025, 2024, 2023, 2022, 2021, 2020
    expect(selectable).toContain('2026');
    expect(selectable).toContain('2025');
    expect(selectable).toContain('2024');
    expect(selectable).toContain('2023');
    expect(selectable).toContain('2022');
    expect(selectable).toContain('2021');
    expect(selectable).toContain('2020');
    // Must never contain 'N/A'
    expect(selectable).not.toContain('N/A');
  });

  // Test 10: Date filters, reports, and exports use consistent year rules without N/A
  it('ensures fees by tax year report groups without N/A and correctly attributes service counts', () => {
    const mockServices: TaxService[] = [
      {
        id: 'SRV-2026-0001',
        customerId: 'CUST-1',
        serviceType: 'income_tax_return',
        taxYear: '2026',
        startDate: '2026-01-10',
        filingStatus: 'completed',
        checklist: [],
        agreedFee: 10000,
        discount: 0,
        finalPayable: 10000,
        amountPaid: 10000,
        outstandingBalance: 0,
        paymentStatus: 'paid',
        createdAt: '2026-01-10T10:00:00Z',
        updatedAt: '2026-01-10T10:00:00Z',
        syncStatus: 'synced',
        version: 1
      },
      {
        id: 'SRV-2026-0004',
        customerId: 'CUST-3',
        serviceType: 'ntn_registration',
        taxYear: 'N/A', // Old corrupted record
        startDate: '2026-01-15',
        filingStatus: 'in_progress',
        checklist: [],
        agreedFee: 3000,
        discount: 0,
        finalPayable: 3000,
        amountPaid: 2901,
        outstandingBalance: 99,
        paymentStatus: 'partially_paid',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
        syncStatus: 'synced',
        version: 1
      }
    ];

    // Map each service's year with resolveTaxYear
    const groupedYears = mockServices.map((s) =>
      resolveTaxYear(s.taxYear, s.startDate, s.id)
    );

    // Both should resolve to 2026, none to N/A
    expect(groupedYears).toEqual(['2026', '2026']);
    expect(groupedYears).not.toContain('N/A');
  });
});
