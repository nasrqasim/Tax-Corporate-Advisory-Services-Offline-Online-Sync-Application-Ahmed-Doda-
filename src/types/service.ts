/**
 * Tax Service & Filing Management Types
 */

export type ServiceType =
  | 'income_tax_return'
  | 'ntn_registration'
  | 'ntn_modification'
  | 'sales_tax_registration'
  | 'sales_tax_filing'
  | 'tax_consultation'
  | 'withholding_statement'
  | 'custom';

export type FilingStatus =
  | 'inquiry'
  | 'documents_pending'
  | 'in_progress'
  | 'review_required'
  | 'filed'
  | 'completed'
  | 'cancelled';

export type ServicePaymentStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overpaid'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled';

export interface RequiredDocumentItem {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  isReceived: boolean;
  receivedDate?: string;
  documentId?: string; // Links to CustomerDocument
  notes?: string;
}

export interface TaxService {
  id: string; // e.g. SRV-2026-0001
  customerId: string;
  serviceType: ServiceType;
  customServiceName?: string;
  taxYear: string; // e.g. "2024", "2025", "2026", "N/A"
  startDate: string; // ISO 8601
  filingDeadline?: string;
  filingStatus: FilingStatus;
  
  // Document checklists
  checklist: RequiredDocumentItem[];
  
  submissionDate?: string;
  completionDate?: string;
  assignedStaff?: string;
  
  // Financial fields (in Pakistani Rupees, integer precision)
  agreedFee: number;
  discount: number;
  finalPayable: number; // agreedFee - discount
  amountPaid: number;   // Calculated dynamically from ledger
  outstandingBalance: number; // finalPayable - amountPaid
  paymentStatus: ServicePaymentStatus;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'saved_locally' | 'pending_sync' | 'syncing' | 'synced' | 'sync_failed' | 'conflict';
  version: number;
}
