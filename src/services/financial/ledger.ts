/**
 * Financial Calculation & Ledger Engine
 * Production-ready, decimal-safe integer calculations in Pakistani Rupees (PKR)
 */

import { TaxService, ServicePaymentStatus } from '../../types/service';
import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { CustomerSummaryMetrics } from '../../types/customer';

/**
 * Formats an amount into Pakistani Rupees string
 * Example: 15000 -> "Rs. 15,000"
 */
export function formatPKR(amount: number, options?: { showPkrPrefix?: boolean; symbol?: string }): string {
  const symbol = options?.symbol || (options?.showPkrPrefix ? 'PKR ' : 'Rs. ');
  const safeInt = Math.round(Number.isFinite(amount) ? amount : 0);
  const formattedNumber = new Intl.NumberFormat('en-PK').format(safeInt);
  return `${symbol}${formattedNumber}`;
}

/**
 * Calculates Final Payable amount: Agreed Fee - Discount
 * Guarded against negative values.
 */
export function calculateFinalPayable(agreedFee: number, discount: number): number {
  const safeFee = Math.max(0, Math.round(agreedFee || 0));
  const safeDiscount = Math.max(0, Math.round(discount || 0));
  return Math.max(0, safeFee - safeDiscount);
}

export interface ServiceFinancialSummary {
  agreedFee: number;
  discount: number;
  finalPayable: number;
  totalValidPayments: number;
  totalRefunded: number;
  netPaymentsApplied: number;
  outstandingBalance: number;
  paymentStatus: ServicePaymentStatus;
  installmentsCount: number;
}

/**
 * Authoritative recalculation of a tax service's financial state
 * Derived strictly from actual recorded payment transactions and refund records.
 */
export function calculateServiceFinancials(
  service: TaxService,
  allTransactions: PaymentTransaction[],
  allRefunds: RefundRecord[] = []
): ServiceFinancialSummary {
  const agreedFee = Math.max(0, Math.round(service.agreedFee || 0));
  const discount = Math.max(0, Math.round(service.discount || 0));
  const finalPayable = calculateFinalPayable(agreedFee, discount);

  // Filter valid transactions belonging to this service
  const serviceTxns = allTransactions.filter(
    (txn) => txn.serviceId === service.id
  );

  let totalValidPayments = 0;
  let totalReversed = 0;

  for (const txn of serviceTxns) {
    if (txn.status === 'valid') {
      totalValidPayments += Math.round(txn.amount);
    } else if (txn.status === 'partially_refunded') {
      // Amount remaining after partial refund
      const netPaid = Math.max(0, Math.round(txn.amount) - Math.round(txn.refundedAmount || 0));
      totalValidPayments += netPaid;
    } else if (txn.status === 'refunded' || txn.status === 'reversed') {
      totalReversed += Math.round(txn.amount);
    }
  }

  // Also include explicit refund records linked to this service
  const serviceRefunds = allRefunds.filter((ref) => ref.serviceId === service.id);
  const totalRefundedRecords = serviceRefunds.reduce((sum, r) => sum + Math.round(r.amount), 0);
  const totalRefunded = Math.max(totalReversed, totalRefundedRecords);

  const netPaymentsApplied = totalValidPayments;
  const outstandingBalance = finalPayable - netPaymentsApplied;

  // Determine authoritative payment status
  let paymentStatus: ServicePaymentStatus = 'unpaid';

  if (service.filingStatus === 'cancelled') {
    paymentStatus = 'cancelled';
  } else if (finalPayable === 0) {
    paymentStatus = netPaymentsApplied > 0 ? 'overpaid' : 'paid';
  } else if (netPaymentsApplied === 0) {
    const hasOnlyReversals = serviceTxns.length > 0 && serviceTxns.every((t) => t.status === 'reversed');
    if (hasOnlyReversals) {
      paymentStatus = 'unpaid';
    } else if (totalRefunded > 0) {
      paymentStatus = 'refunded';
    } else {
      paymentStatus = 'unpaid';
    }
  } else if (netPaymentsApplied < finalPayable) {
    if (totalRefunded > 0) {
      paymentStatus = 'partially_refunded';
    } else {
      paymentStatus = 'partially_paid';
    }
  } else if (netPaymentsApplied === finalPayable) {
    paymentStatus = 'paid';
  } else {
    // netPaymentsApplied > finalPayable
    paymentStatus = 'overpaid';
  }

  return {
    agreedFee,
    discount,
    finalPayable,
    totalValidPayments,
    totalRefunded,
    netPaymentsApplied,
    outstandingBalance: Math.max(0, outstandingBalance),
    paymentStatus,
    installmentsCount: serviceTxns.filter((t) => t.status === 'valid' || t.status === 'partially_refunded').length
  };
}

/**
 * Computes authoritative customer-level financial metrics across all active services.
 */
export function calculateCustomerFinancials(
  customerId: string,
  customerServices: TaxService[],
  allTransactions: PaymentTransaction[],
  allRefunds: RefundRecord[] = []
): CustomerSummaryMetrics {
  const activeServices = customerServices.filter(
    (s) => s.customerId === customerId && s.filingStatus !== 'cancelled'
  );

  let totalServiceFees = 0;
  let totalDiscounts = 0;
  let totalPayable = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalRefunds = 0;
  let unpaidServicesCount = 0;
  let partiallyPaidServicesCount = 0;
  let fullyPaidServicesCount = 0;

  for (const s of activeServices) {
    const fin = calculateServiceFinancials(s, allTransactions, allRefunds);

    totalServiceFees += fin.agreedFee;
    totalDiscounts += fin.discount;
    totalPayable += fin.finalPayable;
    totalPaid += fin.netPaymentsApplied;
    totalOutstanding += fin.outstandingBalance;
    totalRefunds += fin.totalRefunded;

    if (fin.paymentStatus === 'unpaid') {
      unpaidServicesCount++;
    } else if (fin.paymentStatus === 'partially_paid' || fin.paymentStatus === 'partially_refunded') {
      partiallyPaidServicesCount++;
    } else if (fin.paymentStatus === 'paid' || fin.paymentStatus === 'overpaid') {
      fullyPaidServicesCount++;
    }
  }

  return {
    totalServiceFees,
    totalDiscounts,
    totalPayable,
    totalPaid,
    totalOutstanding,
    totalRefunds,
    unpaidServicesCount,
    partiallyPaidServicesCount,
    fullyPaidServicesCount
  };
}

/**
 * Highly optimized O(N + M) batch financial calculator for large datasets
 * (e.g. 10,000+ customers and 50,000+ payment transactions).
 * Pre-indexes payments and services to eliminate O(N * M) loops.
 */
export function calculateAllCustomersFinancials(
  customers: { id: string }[],
  services: TaxService[],
  transactions: PaymentTransaction[],
  refunds: RefundRecord[] = []
): Map<string, CustomerSummaryMetrics> {
  const result = new Map<string, CustomerSummaryMetrics>();

  const txByService = new Map<string, PaymentTransaction[]>();
  const txByCustYear = new Map<string, PaymentTransaction[]>();

  for (const t of transactions) {
    if (t.serviceId) {
      let list = txByService.get(t.serviceId);
      if (!list) {
        list = [];
        txByService.set(t.serviceId, list);
      }
      list.push(t);
    }
    if (t.customerId && t.taxYear) {
      const key = `${t.customerId}:${t.taxYear}`;
      let list = txByCustYear.get(key);
      if (!list) {
        list = [];
        txByCustYear.set(key, list);
      }
      list.push(t);
    }
  }

  const refByService = new Map<string, RefundRecord[]>();
  for (const r of refunds) {
    if (r.serviceId) {
      let list = refByService.get(r.serviceId);
      if (!list) {
        list = [];
        refByService.set(r.serviceId, list);
      }
      list.push(r);
    }
  }

  const servicesByCust = new Map<string, TaxService[]>();
  for (const s of services) {
    if (s.filingStatus === 'cancelled') continue;
    let list = servicesByCust.get(s.customerId);
    if (!list) {
      list = [];
      servicesByCust.set(s.customerId, list);
    }
    list.push(s);
  }

  for (const c of customers) {
    const custServices = servicesByCust.get(c.id) || [];
    let totalServiceFees = 0;
    let totalDiscounts = 0;
    let totalPayable = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalRefunds = 0;
    let unpaidServicesCount = 0;
    let partiallyPaidServicesCount = 0;
    let fullyPaidServicesCount = 0;

    for (const s of custServices) {
      const directTx = txByService.get(s.id) || [];
      const fallbackTx = txByCustYear.get(`${s.customerId}:${s.taxYear}`) || [];
      const serviceTxns = directTx.length > 0 ? directTx : fallbackTx;
      const serviceRefunds = refByService.get(s.id) || [];

      const agreedFee = Math.max(0, s.agreedFee || 0);
      const discount = Math.max(0, Math.min(s.discount || 0, agreedFee));
      const finalPayable = agreedFee - discount;

      let validPayments = 0;
      for (const t of serviceTxns) {
        if (t.status === 'valid' || t.status === 'partially_refunded' || !t.status) {
          validPayments += t.amount;
        }
      }

      let refunded = 0;
      for (const r of serviceRefunds) {
        refunded += r.amount;
      }

      const netPaid = validPayments;
      const outstanding = Math.max(0, finalPayable - netPaid);

      totalServiceFees += agreedFee;
      totalDiscounts += discount;
      totalPayable += finalPayable;
      totalPaid += netPaid;
      totalOutstanding += outstanding;
      totalRefunds += refunded;

      if (netPaid === 0) {
        unpaidServicesCount++;
      } else if (netPaid < finalPayable) {
        partiallyPaidServicesCount++;
      } else {
        fullyPaidServicesCount++;
      }
    }

    result.set(c.id, {
      totalServiceFees,
      totalDiscounts,
      totalPayable,
      totalPaid,
      totalOutstanding,
      totalRefunds,
      unpaidServicesCount,
      partiallyPaidServicesCount,
      fullyPaidServicesCount
    });
  }

  return result;
}
