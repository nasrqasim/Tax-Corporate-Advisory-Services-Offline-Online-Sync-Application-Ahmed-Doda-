/**
 * Controlled Refund and Reversal Engine
 * Preserves financial audit trail, prevents duplicate refunds, recalculates balances safely.
 */

import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { TaxService } from '../../types/service';
import { calculateServiceFinancials } from './ledger';

export interface ProcessRefundParams {
  transaction: PaymentTransaction;
  service: TaxService;
  refundType: 'full_refund' | 'partial_refund' | 'reversal';
  amount: number; // PKR
  reason: string;
  authorizedBy: string;
  notes?: string;
}

export interface RefundProcessResult {
  success: boolean;
  updatedTransaction?: PaymentTransaction;
  refundRecord?: RefundRecord;
  updatedService?: TaxService;
  errorMessage?: string;
}

export function validateRefundRequest(params: ProcessRefundParams): { isValid: boolean; error?: string } {
  const { transaction, amount, reason, authorizedBy, refundType } = params;

  if (!transaction) {
    return { isValid: false, error: 'Transaction is required.' };
  }

  if (transaction.status === 'refunded' || transaction.status === 'reversed') {
    return { isValid: false, error: `This transaction has already been ${transaction.status}. Duplicate refund not permitted.` };
  }

  if (!reason || reason.trim().length < 5) {
    return { isValid: false, error: 'A detailed reason (minimum 5 characters) is required for refunds and reversals.' };
  }

  if (!authorizedBy || !authorizedBy.trim()) {
    return { isValid: false, error: 'Authorized staff username is required to process refunds.' };
  }

  const numericAmount = Math.round(amount);
  if (numericAmount <= 0) {
    return { isValid: false, error: 'Refund amount must be greater than zero.' };
  }

  const currentNetPaid = transaction.amount - (transaction.refundedAmount || 0);

  if (refundType === 'full_refund' || refundType === 'reversal') {
    if (numericAmount !== currentNetPaid) {
      return { isValid: false, error: `Full refund/reversal must match remaining paid amount of Rs. ${currentNetPaid}.` };
    }
  } else if (refundType === 'partial_refund') {
    if (numericAmount >= currentNetPaid) {
      return { isValid: false, error: `Partial refund amount (Rs. ${numericAmount}) must be less than remaining paid amount (Rs. ${currentNetPaid}). Use Full Refund instead.` };
    }
  }

  return { isValid: true };
}

export function processRefundTransaction(
  params: ProcessRefundParams,
  allTransactions: PaymentTransaction[],
  existingRefunds: RefundRecord[]
): RefundProcessResult {
  const validation = validateRefundRequest(params);
  if (!validation.isValid) {
    return { success: false, errorMessage: validation.error };
  }

  const { transaction, service, refundType, amount, reason, authorizedBy, notes } = params;
  const now = new Date().toISOString();
  const numericAmount = Math.round(amount);

  // Generate unique refund record ID
  const refundId = `REF-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const idempotencyKey = `idemp-ref-${refundId}`;

  const refundRecord: RefundRecord = {
    id: refundId,
    originalTransactionId: transaction.id,
    receiptNumber: transaction.receiptNumber,
    customerId: transaction.customerId,
    serviceId: transaction.serviceId,
    taxYear: transaction.taxYear,
    refundType,
    amount: numericAmount,
    reason: reason.trim(),
    authorizedBy: authorizedBy.trim(),
    processedAt: now,
    notes: notes?.trim(),
    idempotencyKey,
    syncStatus: 'saved_locally',
    createdAt: now
  };

  // Update existing transaction status immutably
  const currentRefundedAmount = transaction.refundedAmount || 0;
  const newRefundedAmount = currentRefundedAmount + numericAmount;

  let newStatus: PaymentTransaction['status'] = 'valid';
  if (refundType === 'reversal') {
    newStatus = 'reversed';
  } else if (newRefundedAmount >= transaction.amount) {
    newStatus = 'refunded';
  } else {
    newStatus = 'partially_refunded';
  }

  const updatedTransaction: PaymentTransaction = {
    ...transaction,
    status: newStatus,
    refundedAmount: newRefundedAmount,
    reversalReason: refundType === 'reversal' ? reason : transaction.reversalReason,
    reversalBy: refundType === 'reversal' ? authorizedBy : transaction.reversalBy,
    reversalDate: refundType === 'reversal' ? now : transaction.reversalDate,
    updatedAt: now,
    version: (transaction.version || 1) + 1,
    syncStatus: 'pending_sync'
  };

  // Recalculate service state with updated transactions
  const nextTransactions = allTransactions.map((t) =>
    t.id === transaction.id ? updatedTransaction : t
  );
  const nextRefunds = [...existingRefunds, refundRecord];

  const financialSummary = calculateServiceFinancials(service, nextTransactions, nextRefunds);

  const updatedService: TaxService = {
    ...service,
    amountPaid: financialSummary.netPaymentsApplied,
    outstandingBalance: financialSummary.outstandingBalance,
    paymentStatus: financialSummary.paymentStatus,
    updatedAt: now,
    version: (service.version || 1) + 1,
    syncStatus: 'pending_sync'
  };

  return {
    success: true,
    updatedTransaction,
    refundRecord,
    updatedService
  };
}
