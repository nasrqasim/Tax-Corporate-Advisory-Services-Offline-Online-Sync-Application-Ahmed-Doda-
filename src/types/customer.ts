/**
 * Customer Types & Interfaces
 * Production-ready offline-first Tax CRM
 */

export type CustomerStatus = 'active' | 'inactive';

export interface CustomerDocument {
  id: string;
  customerId: string;
  serviceId?: string;
  documentType: 'cnic_front' | 'cnic_back' | 'salary_slip' | 'bank_statement' | 'wealth_statement' | 'tax_challan' | 'fbr_acknowledgment' | 'other';
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** Encrypted Base64 or local URI */
  dataUri: string;
  isEncrypted: boolean;
  uploadedAt: string;
  syncStatus: 'saved_locally' | 'pending_sync' | 'synced';
}

export interface Customer {
  id: string; // e.g. CUST-2026-0001
  fullName: string;
  fatherName: string;
  cnic: string; // Normalized: 13 digits, formatted 00000-0000000-0
  cnicFrontImage?: string; // Encrypted data URI or local path
  cnicBackImage?: string; // Encrypted data URI or local path
  primaryMobile: string; // Normalized Pakistani mobile: +923001234567
  secondaryMobile?: string;
  whatsappNumber: string; // Normalized: +923001234567
  address: string;
  email?: string;
  ntnNumber?: string; // National Tax Number (7 digits + check digit or 8 chars)
  status: CustomerStatus;
  notes?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  syncStatus: 'saved_locally' | 'pending_sync' | 'syncing' | 'synced' | 'sync_failed' | 'conflict';
  version: number;
}

export interface CustomerSummaryMetrics {
  totalServiceFees: number;
  totalDiscounts: number;
  totalPayable: number;
  totalPaid: number;
  totalOutstanding: number;
  totalRefunds: number;
  unpaidServicesCount: number;
  partiallyPaidServicesCount: number;
  fullyPaidServicesCount: number;
}
