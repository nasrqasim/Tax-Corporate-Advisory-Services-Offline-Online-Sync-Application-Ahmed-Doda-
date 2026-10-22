/**
 * Payment & Financial Types
 * Pakistani Tax Practice Financial Module
 */

export type PaymentMethod =
  | 'Cash'
  | 'Bank Transfer'
  | 'Easypaisa'
  | 'JazzCash'
  | 'Cheque'
  | 'PayOrder'
  | 'Other';

export type TransactionStatus =
  | 'valid'
  | 'refunded'
  | 'partially_refunded'
  | 'reversed';

export interface PaymentTransaction {
  id: string; // e.g. TXN-20261022-XXXXX
  receiptNumber: string; // e.g. REC-2026-00001
  customerId: string;
  serviceId: string;
  taxYear: string;
  amount: number; // PKR, positive integer
  paymentMethod: PaymentMethod;
  paymentDate: string; // ISO 8601
  transactionReference?: string; // Bank ref, JazzCash TID, Cheque no.
  receivedBy: string; // Staff member username / ID
  notes?: string;
  
  // Status and Auditing
  status: TransactionStatus;
  refundedAmount: number; // For partial refunds
  reversalReason?: string;
  reversalBy?: string;
  reversalDate?: string;
  
  // Offline durability & Idempotency
  idempotencyKey: string; // UUID to prevent duplicate writes on retry
  syncStatus: 'saved_locally' | 'pending_sync' | 'syncing' | 'synced' | 'sync_failed' | 'conflict';
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface RefundRecord {
  id: string; // e.g. REF-20261022-XXXXX
  originalTransactionId: string;
  receiptNumber: string;
  customerId: string;
  serviceId: string;
  taxYear: string;
  refundType: 'full_refund' | 'partial_refund' | 'reversal';
  amount: number; // PKR
  reason: string;
  authorizedBy: string;
  processedAt: string; // ISO 8601
  notes?: string;
  idempotencyKey: string;
  syncStatus: 'saved_locally' | 'pending_sync' | 'syncing' | 'synced' | 'sync_failed' | 'conflict';
  createdAt: string;
}

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  customerId: string;
  customerName: string;
  customerCnic: string;
  serviceId: string;
  serviceName: string;
  taxYear: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  previousBalance: number;
  remainingBalance: number;
  receivedBy: string;
  notes?: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessNtn?: string;
}

export interface CustomerStatementItem {
  date: string;
  type: 'SERVICE_CHARGE' | 'PAYMENT' | 'REFUND' | 'REVERSAL';
  referenceId: string;
  description: string;
  taxYear: string;
  debit: number; // Charges incurred
  credit: number; // Payments made
  runningBalance: number;
}

export interface CustomerStatement {
  customerId: string;
  customerName: string;
  cnic: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  items: CustomerStatementItem[];
  generatedAt: string;
}
