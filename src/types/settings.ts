/**
 * System Settings, User Roles & Follow-ups
 */

export type UserRole = 'admin' | 'consultant' | 'accountant';

export interface AppUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  pinHash?: string;
  isActive: boolean;
  createdAt: string;
}

export interface BusinessProfile {
  officeName: string;
  tagline?: string;
  ntn?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  whatsapp?: string;
  email?: string;
  address: string;
  city: string;
  currencySymbol: string;
  allowOverpayments: boolean;
  enableEncryption: boolean;
  receiptFooterNote: string;
}

export interface FollowUpReminder {
  id: string;
  customerId: string;
  customerName: string;
  serviceId?: string;
  title: string;
  taxYear?: string;
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}
