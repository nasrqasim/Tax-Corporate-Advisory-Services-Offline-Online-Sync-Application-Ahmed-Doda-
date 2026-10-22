/**
 * Receipt & Customer Statement Generator
 * Generates unique receipt numbers, formatted receipts, and customer statements.
 */

import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction, ReceiptData, CustomerStatement, CustomerStatementItem, RefundRecord } from '../../types/payment';
import { BusinessProfile } from '../../types/settings';
import { formatPKR } from './ledger';

/**
 * Generates a standard receipt number: REC-YYYY-00001
 */
export function generateReceiptNumber(sequenceNumber: number, year: number = new Date().getFullYear()): string {
  const padded = String(sequenceNumber).padStart(5, '0');
  return `REC-${year}-${padded}`;
}

/**
 * Builds the complete receipt model for printing, viewing, or PDF generation.
 */
export function buildReceiptData(
  transaction: PaymentTransaction,
  customer: Customer,
  service: TaxService,
  previousOutstanding: number,
  remainingOutstanding: number,
  business: BusinessProfile
): ReceiptData {
  const serviceDisplayName = service.serviceType === 'income_tax_return'
    ? `Income Tax Return (Tax Year ${service.taxYear})`
    : service.serviceType === 'ntn_registration'
    ? 'NTN Registration'
    : service.serviceType === 'ntn_modification'
    ? 'NTN Modification'
    : service.customServiceName || service.serviceType.replace(/_/g, ' ').toUpperCase();

  return {
    receiptNumber: transaction.receiptNumber,
    paymentDate: transaction.paymentDate,
    customerId: customer.id,
    customerName: customer.fullName,
    customerCnic: customer.cnic,
    serviceId: service.id,
    serviceName: serviceDisplayName,
    taxYear: service.taxYear,
    amount: transaction.amount,
    paymentMethod: transaction.paymentMethod,
    transactionReference: transaction.transactionReference,
    previousBalance: previousOutstanding,
    remainingBalance: Math.max(0, remainingOutstanding),
    receivedBy: transaction.receivedBy,
    notes: transaction.notes,
    businessName: business.officeName,
    businessAddress: business.address,
    businessPhone: business.primaryPhone,
    businessNtn: business.ntn
  };
}

/**
 * Generates a full itemized Customer Account Statement over an optional date range.
 */
export function generateCustomerStatement(
  customer: Customer,
  services: TaxService[],
  transactions: PaymentTransaction[],
  refunds: RefundRecord[],
  dateRange?: { startDate?: string; endDate?: string }
): CustomerStatement {
  const items: CustomerStatementItem[] = [];

  // Filter services for customer
  const customerServices = services.filter((s) => s.customerId === customer.id);
  const customerTxns = transactions.filter((t) => t.customerId === customer.id);
  const customerRefunds = refunds.filter((r) => r.customerId === customer.id);

  // 1. Add Service charges
  for (const s of customerServices) {
    const fee = Math.max(0, (s.agreedFee || 0) - (s.discount || 0));
    const serviceName = s.serviceType === 'income_tax_return'
      ? `Income Tax Return Filing (${s.taxYear})`
      : s.customServiceName || s.serviceType.replace(/_/g, ' ').toUpperCase();

    items.push({
      date: s.startDate || s.createdAt,
      type: 'SERVICE_CHARGE',
      referenceId: s.id,
      description: `Service Charge: ${serviceName}${s.discount > 0 ? ` (Discount Rs. ${s.discount})` : ''}`,
      taxYear: s.taxYear,
      debit: fee,
      credit: 0,
      runningBalance: 0 // Will compute sequentially
    });
  }

  // 2. Add Payments
  for (const t of customerTxns) {
    if (t.status === 'valid' || t.status === 'partially_refunded') {
      items.push({
        date: t.paymentDate,
        type: 'PAYMENT',
        referenceId: t.receiptNumber,
        description: `Payment Received (${t.paymentMethod}) - Ref: ${t.transactionReference || 'N/A'}`,
        taxYear: t.taxYear,
        debit: 0,
        credit: t.amount,
        runningBalance: 0
      });
    }
  }

  // 3. Add Refunds / Reversals
  for (const r of customerRefunds) {
    items.push({
      date: r.processedAt,
      type: r.refundType === 'reversal' ? 'REVERSAL' : 'REFUND',
      referenceId: r.id,
      description: `${r.refundType.toUpperCase()}: ${r.reason} (Auth by: ${r.authorizedBy})`,
      taxYear: r.taxYear,
      debit: r.amount, // Adds back to outstanding balance
      credit: 0,
      runningBalance: 0
    });
  }

  // Sort chronologically
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute running balance
  let currentBalance = 0;
  let totalDebits = 0;
  let totalCredits = 0;

  for (const item of items) {
    currentBalance += item.debit - item.credit;
    totalDebits += item.debit;
    totalCredits += item.credit;
    item.runningBalance = currentBalance;
  }

  return {
    customerId: customer.id,
    customerName: customer.fullName,
    cnic: customer.cnic,
    startDate: dateRange?.startDate || (items.length > 0 ? items[0].date : new Date().toISOString()),
    endDate: dateRange?.endDate || new Date().toISOString(),
    openingBalance: 0,
    closingBalance: currentBalance,
    totalDebits,
    totalCredits,
    items,
    generatedAt: new Date().toISOString()
  };
}
