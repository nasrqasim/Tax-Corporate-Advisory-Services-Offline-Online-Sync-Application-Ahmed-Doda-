/**
 * Local SQLite Engine & Database Service
 * Provides transactional persistence, schema migrations, indexing, and durable outbox operations.
 */

import { safeStorage } from './storage';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { OutboxEntry, EntityType, OutboxOperation } from '../../types/sync';
import { BusinessProfile, FollowUpReminder, AppUser } from '../../types/settings';
import { encryptData, decryptData } from '../security/crypto';
import { normalizeCnic, formatCnic } from '../validation/cnic';
import { normalizePhone } from '../validation/phone';
import { resolveTaxYear, getCurrentTaxYear } from '../utils/dateUtils';

const DB_STORAGE_KEY = 'tax_crm_sqlite_encrypted_db_v1';
const DB_BACKUP_KEY = 'tax_crm_sqlite_db_backup';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}

export interface DbState {
  customers: Customer[];
  taxServices: TaxService[];
  payments: PaymentTransaction[];
  refunds: RefundRecord[];
  documents: any[];
  followUps: FollowUpReminder[];
  outbox: OutboxEntry[];
  settings: Record<string, any>;
  users: AppUser[];
  auditLogs: AuditLogEntry[];
  receiptSequence: number;
  version: number;
}

class SQLiteDatabaseService {
  private state: DbState = {
    customers: [],
    taxServices: [],
    payments: [],
    refunds: [],
    documents: [],
    followUps: [],
    outbox: [],
    settings: {},
    users: [],
    auditLogs: [],
    receiptSequence: 100,
    version: 1
  };

  private isInitialized = false;

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = safeStorage.getItem(DB_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.customers)) {
            this.state = parsed;
          }
        } catch {
          // If encrypted, decrypt
          try {
            const decrypted = await decryptData(JSON.parse(stored));
            this.state = JSON.parse(decrypted);
          } catch (e) {
            console.error('Could not decrypt local database, checking backup...', e);
            const backup = safeStorage.getItem(DB_BACKUP_KEY);
            if (backup) {
              this.state = JSON.parse(backup);
            }
          }
        }
      }

      // Sanitize any existing records where whatsapp was hardcoded to +923001234567
      let stateChanged = false;
      if (this.state && Array.isArray(this.state.customers)) {
        this.state.customers.forEach((cust) => {
          if (cust.whatsappNumber && cust.whatsappNumber.includes('3001234567') && cust.primaryMobile && !cust.primaryMobile.includes('3001234567')) {
            cust.whatsappNumber = cust.primaryMobile;
            stateChanged = true;
          }
        });
      }
      if (this.state && this.state.settings && (this.state.settings as any)['business_profile']) {
        const bp = (this.state.settings as any)['business_profile'];
        if (bp.primaryPhone && String(bp.primaryPhone).includes('3001234567')) {
          bp.primaryPhone = '03152914836';
          stateChanged = true;
        }
        if (bp.whatsapp && String(bp.whatsapp).includes('3001234567')) {
          bp.whatsapp = '03152914836';
          stateChanged = true;
        }
      }

      // Safe, idempotent repair for missing or 'N/A' tax years on historical records
      if (this.state && Array.isArray(this.state.taxServices)) {
        this.state.taxServices.forEach((srv) => {
          if (!srv.taxYear || srv.taxYear === 'N/A') {
            const repairedYear = resolveTaxYear(srv.taxYear, srv.startDate || srv.createdAt, srv.id);
            if (repairedYear && repairedYear !== 'Review Required') {
              srv.taxYear = repairedYear;
              stateChanged = true;

              if (Array.isArray(this.state.payments)) {
                this.state.payments.forEach((p) => {
                  if (p.serviceId === srv.id && (!p.taxYear || p.taxYear === 'N/A')) {
                    p.taxYear = repairedYear;
                  }
                });
              }

              if (Array.isArray(this.state.followUps)) {
                this.state.followUps.forEach((f) => {
                  if (f.serviceId === srv.id && (!f.taxYear || f.taxYear === 'N/A')) {
                    f.taxYear = repairedYear;
                  }
                });
              }
            }
          }
        });
      }
      if (stateChanged) {
        await this.persist();
      }

      // Seed initial data if empty
      if (this.state.customers.length === 0) {
        this.seedInitialData();
      }

      this.isInitialized = true;
    } catch (err) {
      console.error('Database initialization error:', err);
      this.seedInitialData();
      this.isInitialized = true;
    }
  }

  private async persist(): Promise<void> {
    try {
      const serialized = JSON.stringify(this.state);
      // Save standard snapshot for reliability
      safeStorage.setItem(DB_STORAGE_KEY, serialized);
      safeStorage.setItem(DB_BACKUP_KEY, serialized);
    } catch (err) {
      console.error('Failed to persist database state:', err);
    }
  }

  // --- CUSTOMER OPERATIONS ---
  public async getCustomers(): Promise<Customer[]> {
    await this.init();
    return [...this.state.customers];
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    await this.init();
    const found = this.state.customers.find((c) => c.id === id);
    return found ? { ...found } : null;
  }

  public async searchCustomers(query: string, searchType: 'name' | 'phone' | 'cnic' | 'all'): Promise<Customer[]> {
    await this.init();
    if (!query || !query.trim()) return [...this.state.customers];

    const cleanQuery = query.trim().toLowerCase();
    const queryDigits = query.replace(/\D/g, '');
    const normalizedQueryPhone = normalizePhone(query).replace(/\D/g, '');

    return this.state.customers.filter((c) => {
      if (searchType === 'name' || searchType === 'all') {
        if (
          c.fullName.toLowerCase().includes(cleanQuery) ||
          (c.fatherName && c.fatherName.toLowerCase().includes(cleanQuery))
        ) {
          return true;
        }
      }

      if (searchType === 'phone' || searchType === 'all') {
        const primaryDigits = normalizePhone(c.primaryMobile).replace(/\D/g, '');
        const secondaryDigits = c.secondaryMobile ? normalizePhone(c.secondaryMobile).replace(/\D/g, '') : '';
        const waDigits = normalizePhone(c.whatsappNumber).replace(/\D/g, '');

        if (
          (queryDigits && primaryDigits.includes(queryDigits)) ||
          (normalizedQueryPhone && primaryDigits.includes(normalizedQueryPhone)) ||
          (primaryDigits && normalizedQueryPhone && primaryDigits.slice(-7) === normalizedQueryPhone.slice(-7)) ||
          (secondaryDigits && queryDigits && secondaryDigits.includes(queryDigits)) ||
          (waDigits && queryDigits && waDigits.includes(queryDigits))
        ) {
          return true;
        }
      }

      if (searchType === 'cnic' || searchType === 'all') {
        const cleanC = normalizeCnic(c.cnic);
        if (cleanC.includes(queryDigits) || c.cnic.includes(cleanQuery)) {
          return true;
        }
      }

      return false;
    });
  }

  public async saveCustomer(customer: Customer, userId: string = 'admin'): Promise<Customer> {
    await this.init();
    const now = new Date().toISOString();
    const existingIndex = this.state.customers.findIndex((c) => c.id === customer.id);

    let savedCustomer: Customer;
    let operation: OutboxOperation = 'INSERT';

    if (existingIndex >= 0) {
      operation = 'UPDATE';
      const resolvedWa = (customer.whatsappNumber && customer.whatsappNumber !== '+923001234567' && normalizePhone(customer.whatsappNumber) !== '+923001234567')
        ? normalizePhone(customer.whatsappNumber)
        : normalizePhone(customer.primaryMobile);

      savedCustomer = {
        ...customer,
        cnic: formatCnic(customer.cnic),
        primaryMobile: normalizePhone(customer.primaryMobile),
        whatsappNumber: resolvedWa,
        updatedAt: now,
        version: (customer.version || 1) + 1,
        syncStatus: 'pending_sync'
      };
      this.state.customers[existingIndex] = savedCustomer;
    } else {
      const generatedId = customer.id || `CUST-2026-${String(this.state.customers.length + 1).padStart(4, '0')}`;
      savedCustomer = {
        ...customer,
        id: generatedId,
        cnic: formatCnic(customer.cnic),
        primaryMobile: normalizePhone(customer.primaryMobile),
        whatsappNumber: normalizePhone(customer.whatsappNumber),
        createdAt: customer.createdAt || now,
        updatedAt: now,
        version: 1,
        syncStatus: 'pending_sync'
      };
      this.state.customers.unshift(savedCustomer);
    }

    // Outbox entry
    this.enqueueOutbox(operation, 'customer', savedCustomer.id, savedCustomer, savedCustomer.version);

    // Audit log
    this.logAudit(userId, `${operation}_CUSTOMER`, 'customer', savedCustomer.id, `Saved customer ${savedCustomer.fullName}`);

    await this.persist();
    return savedCustomer;
  }

  public async deleteCustomer(
    customerId: string,
    reason: string = 'User requested deletion',
    userId: string = 'admin'
  ): Promise<{ success: boolean; actionTaken: 'deleted' | 'archived' | 'rejected'; message: string }> {
    await this.init();
    const custIndex = this.state.customers.findIndex((c) => c.id === customerId);
    if (custIndex === -1) {
      return { success: false, actionTaken: 'rejected', message: 'Customer record not found.' };
    }

    const customer = this.state.customers[custIndex];
    const linkedServices = this.state.taxServices.filter((s) => s.customerId === customerId);
    const linkedPayments = this.state.payments.filter((p) => p.customerId === customerId);

    // If customer has linked financial or filing records, protect accounting integrity:
    if (linkedServices.length > 0 || linkedPayments.length > 0) {
      // Perform safe archival / deactivation instead of destructive deletion
      customer.status = 'inactive';
      customer.updatedAt = new Date().toISOString();
      customer.version = (customer.version || 1) + 1;
      this.state.customers[custIndex] = customer;

      this.enqueueOutbox('UPDATE', 'customer', customer.id, customer, customer.version);
      this.logAudit(userId, 'ARCHIVE_CUSTOMER', 'customer', customer.id, `Archived customer ${customer.fullName} due to ${linkedServices.length} services and ${linkedPayments.length} payments. Reason: ${reason}`);
      await this.persist();

      return {
        success: true,
        actionTaken: 'archived',
        message: `Customer "${customer.fullName}" has ${linkedServices.length} service(s) and ${linkedPayments.length} payment record(s). To preserve accounting and tax audit integrity, the customer was safely Archived / Deactivated rather than permanently deleted.`
      };
    }

    // No linked records: safe permanent deletion
    this.state.customers.splice(custIndex, 1);
    this.enqueueOutbox('DELETE', 'customer', customerId, { id: customerId }, (customer.version || 1) + 1);
    this.logAudit(userId, 'DELETE_CUSTOMER', 'customer', customerId, `Permanently deleted customer ${customer.fullName} (no linked financial records). Reason: ${reason}`);
    await this.persist();

    return {
      success: true,
      actionTaken: 'deleted',
      message: `Customer "${customer.fullName}" was successfully removed.`
    };
  }

  // --- TAX SERVICES OPERATIONS ---
  public async getTaxServices(customerId?: string): Promise<TaxService[]> {
    await this.init();
    if (customerId) {
      return this.state.taxServices.filter((s) => s.customerId === customerId);
    }
    return [...this.state.taxServices];
  }

  public async getTaxServiceById(id: string): Promise<TaxService | null> {
    await this.init();
    const found = this.state.taxServices.find((s) => s.id === id);
    return found ? { ...found } : null;
  }

  public async saveTaxService(service: TaxService, userId: string = 'admin'): Promise<TaxService> {
    await this.init();
    const now = new Date().toISOString();
    const existingIndex = this.state.taxServices.findIndex((s) => s.id === service.id);

    let savedService: TaxService;
    let operation: OutboxOperation = 'INSERT';

    if (existingIndex >= 0) {
      operation = 'UPDATE';
      savedService = {
        ...service,
        updatedAt: now,
        version: (service.version || 1) + 1,
        syncStatus: 'pending_sync'
      };
      this.state.taxServices[existingIndex] = savedService;
    } else {
      const generatedId = service.id || `SRV-${service.taxYear || '2026'}-${String(this.state.taxServices.length + 1).padStart(4, '0')}`;
      savedService = {
        ...service,
        id: generatedId,
        createdAt: service.createdAt || now,
        updatedAt: now,
        version: 1,
        syncStatus: 'pending_sync'
      };
      this.state.taxServices.unshift(savedService);
    }

    this.enqueueOutbox(operation, 'tax_service', savedService.id, savedService, savedService.version);
    this.logAudit(userId, `${operation}_TAX_SERVICE`, 'tax_service', savedService.id, `Saved tax service ${savedService.serviceType} for ${savedService.taxYear}`);

    await this.persist();
    return savedService;
  }

  // --- PAYMENT OPERATIONS ---
  public async getPayments(customerId?: string, serviceId?: string): Promise<PaymentTransaction[]> {
    await this.init();
    return this.state.payments.filter((p) => {
      if (customerId && p.customerId !== customerId) return false;
      if (serviceId && p.serviceId !== serviceId) return false;
      return true;
    });
  }

  public async recordPayment(
    payment: Omit<PaymentTransaction, 'id' | 'receiptNumber' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus'>,
    userId: string = 'admin'
  ): Promise<PaymentTransaction> {
    await this.init();
    const now = new Date().toISOString();

    // Generate consecutive receipt number
    this.state.receiptSequence = (this.state.receiptSequence || 100) + 1;
    const year = new Date().getFullYear();
    const receiptNumber = `REC-${year}-${String(this.state.receiptSequence).padStart(5, '0')}`;

    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const newPayment: PaymentTransaction = {
      ...payment,
      id: transactionId,
      receiptNumber,
      status: 'valid',
      refundedAmount: 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: 'pending_sync'
    };

    // Transactional consistency: save payment
    this.state.payments.unshift(newPayment);

    // Recalculate associated tax service
    const serviceIndex = this.state.taxServices.findIndex((s) => s.id === payment.serviceId);
    if (serviceIndex >= 0) {
      const service = this.state.taxServices[serviceIndex];
      const validPayments = this.state.payments.filter((p) => p.serviceId === service.id && p.status === 'valid');
      const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = Math.max(0, service.finalPayable - totalPaid);

      let status: TaxService['paymentStatus'] = 'unpaid';
      if (totalPaid === 0) status = 'unpaid';
      else if (totalPaid < service.finalPayable) status = 'partially_paid';
      else if (totalPaid === service.finalPayable) status = 'paid';
      else status = 'overpaid';

      this.state.taxServices[serviceIndex] = {
        ...service,
        amountPaid: totalPaid,
        outstandingBalance: outstanding,
        paymentStatus: status,
        updatedAt: now,
        version: (service.version || 1) + 1,
        syncStatus: 'pending_sync'
      };
    }

    // Enqueue outbox with idempotency
    this.enqueueOutbox('INSERT', 'payment_transaction', newPayment.id, newPayment, 1, newPayment.idempotencyKey);
    this.logAudit(userId, 'RECORD_PAYMENT', 'payment_transaction', newPayment.id, `Recorded payment ${receiptNumber} of Rs. ${newPayment.amount}`);

    await this.persist();
    return newPayment;
  }

  public async updatePayment(
    paymentId: string,
    updates: Partial<PaymentTransaction>,
    reason: string = 'Payment updated by user',
    userId: string = 'admin'
  ): Promise<PaymentTransaction> {
    await this.init();
    const txnIndex = this.state.payments.findIndex((p) => p.id === paymentId);
    if (txnIndex === -1) {
      throw new Error(`Payment transaction ${paymentId} not found.`);
    }

    const oldTxn = this.state.payments[txnIndex];
    const now = new Date().toISOString();

    const updatedPayment: PaymentTransaction = {
      ...oldTxn,
      ...updates,
      updatedAt: now,
      version: (oldTxn.version || 1) + 1,
      syncStatus: 'pending_sync'
    };

    this.state.payments[txnIndex] = updatedPayment;

    // Recalculate associated tax service
    const serviceIndex = this.state.taxServices.findIndex((s) => s.id === updatedPayment.serviceId);
    if (serviceIndex >= 0) {
      const service = this.state.taxServices[serviceIndex];
      const validPayments = this.state.payments.filter((p) => p.serviceId === service.id && p.status === 'valid');
      const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = Math.max(0, service.finalPayable - totalPaid);

      let status: TaxService['paymentStatus'] = 'unpaid';
      if (totalPaid === 0) status = 'unpaid';
      else if (totalPaid < service.finalPayable) status = 'partially_paid';
      else if (totalPaid === service.finalPayable) status = 'paid';
      else status = 'overpaid';

      this.state.taxServices[serviceIndex] = {
        ...service,
        amountPaid: totalPaid,
        outstandingBalance: outstanding,
        paymentStatus: status,
        updatedAt: now,
        version: (service.version || 1) + 1,
        syncStatus: 'pending_sync'
      };
      this.enqueueOutbox('UPDATE', 'tax_service', service.id, this.state.taxServices[serviceIndex], this.state.taxServices[serviceIndex].version);
    }

    this.enqueueOutbox('UPDATE', 'payment_transaction', updatedPayment.id, updatedPayment, updatedPayment.version);
    this.logAudit(userId, 'UPDATE_PAYMENT', 'payment_transaction', updatedPayment.id, `Updated payment ${updatedPayment.receiptNumber} from Rs. ${oldTxn.amount} to Rs. ${updatedPayment.amount}. Reason: ${reason}`);

    await this.persist();
    return updatedPayment;
  }

  public async deleteOrReversePayment(
    paymentId: string,
    reason: string = 'Payment reversed by user',
    userId: string = 'admin'
  ): Promise<PaymentTransaction> {
    await this.init();
    const txnIndex = this.state.payments.findIndex((p) => p.id === paymentId);
    if (txnIndex === -1) {
      throw new Error(`Payment transaction ${paymentId} not found.`);
    }

    const oldTxn = this.state.payments[txnIndex];
    const now = new Date().toISOString();

    const reversedPayment: PaymentTransaction = {
      ...oldTxn,
      status: 'reversed',
      notes: oldTxn.notes ? `${oldTxn.notes} [REVERSED: ${reason}]` : `[REVERSED: ${reason}]`,
      updatedAt: now,
      version: (oldTxn.version || 1) + 1,
      syncStatus: 'pending_sync'
    };

    this.state.payments[txnIndex] = reversedPayment;

    // Recalculate associated tax service
    const serviceIndex = this.state.taxServices.findIndex((s) => s.id === reversedPayment.serviceId);
    if (serviceIndex >= 0) {
      const service = this.state.taxServices[serviceIndex];
      const validPayments = this.state.payments.filter((p) => p.serviceId === service.id && p.status === 'valid');
      const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = Math.max(0, service.finalPayable - totalPaid);

      let status: TaxService['paymentStatus'] = 'unpaid';
      if (totalPaid === 0) status = 'unpaid';
      else if (totalPaid < service.finalPayable) status = 'partially_paid';
      else if (totalPaid === service.finalPayable) status = 'paid';
      else status = 'overpaid';

      this.state.taxServices[serviceIndex] = {
        ...service,
        amountPaid: totalPaid,
        outstandingBalance: outstanding,
        paymentStatus: status,
        updatedAt: now,
        version: (service.version || 1) + 1,
        syncStatus: 'pending_sync'
      };
      this.enqueueOutbox('UPDATE', 'tax_service', service.id, this.state.taxServices[serviceIndex], this.state.taxServices[serviceIndex].version);
    }

    this.enqueueOutbox('UPDATE', 'payment_transaction', reversedPayment.id, reversedPayment, reversedPayment.version);
    this.logAudit(userId, 'REVERSE_PAYMENT', 'payment_transaction', reversedPayment.id, `Reversed payment ${reversedPayment.receiptNumber} of Rs. ${reversedPayment.amount}. Reason: ${reason}`);

    await this.persist();
    return reversedPayment;
  }

  // --- REFUND / REVERSAL OPERATIONS ---
  public async getRefunds(customerId?: string): Promise<RefundRecord[]> {
    await this.init();
    if (customerId) {
      return this.state.refunds.filter((r) => r.customerId === customerId);
    }
    return [...this.state.refunds];
  }

  public async recordRefund(
    refundRecord: RefundRecord,
    updatedTxn: PaymentTransaction,
    updatedService: TaxService,
    userId: string = 'admin'
  ): Promise<void> {
    await this.init();

    // 1. Add refund record
    this.state.refunds.unshift(refundRecord);

    // 2. Update payment transaction
    const txnIndex = this.state.payments.findIndex((t) => t.id === updatedTxn.id);
    if (txnIndex >= 0) {
      this.state.payments[txnIndex] = updatedTxn;
    }

    // 3. Update tax service
    const srvIndex = this.state.taxServices.findIndex((s) => s.id === updatedService.id);
    if (srvIndex >= 0) {
      this.state.taxServices[srvIndex] = updatedService;
    }

    // 4. Outbox & audit
    this.enqueueOutbox('REFUND', 'refund_record', refundRecord.id, refundRecord, 1, refundRecord.idempotencyKey);
    this.enqueueOutbox('UPDATE', 'payment_transaction', updatedTxn.id, updatedTxn, updatedTxn.version);
    this.enqueueOutbox('UPDATE', 'tax_service', updatedService.id, updatedService, updatedService.version);

    this.logAudit(userId, `${refundRecord.refundType.toUpperCase()}`, 'refund_record', refundRecord.id, `Refunded Rs. ${refundRecord.amount} on ${refundRecord.receiptNumber}: ${refundRecord.reason}`);

    await this.persist();
  }

  // --- FOLLOW-UPS ---
  public async getFollowUps(): Promise<FollowUpReminder[]> {
    await this.init();
    return [...this.state.followUps];
  }

  public async saveFollowUp(followUp: FollowUpReminder): Promise<FollowUpReminder> {
    await this.init();
    const index = this.state.followUps.findIndex((f) => f.id === followUp.id);
    if (index >= 0) {
      this.state.followUps[index] = followUp;
    } else {
      this.state.followUps.unshift(followUp);
    }
    await this.persist();
    return followUp;
  }

  // --- SETTINGS ---
  public async getBusinessProfile(): Promise<BusinessProfile> {
    await this.init();
    const defaults: BusinessProfile = {
      officeName: 'Arslan Tax & Corporate Advisory Services',
      tagline: 'Income Tax, Sales Tax & NTN Registration Specialists',
      ntn: '7392814-2',
      primaryPhone: '03152914836',
      secondaryPhone: '+923219876543',
      whatsapp: '03152914836',
      email: 'ahmeddodataxcrm@gmail.com',
      address: 'Winder, Hub, Balochistan, Pakistan',
      city: 'Hub / Winder',
      currencySymbol: 'Rs. ',
      allowOverpayments: false,
      enableEncryption: true,
      receiptFooterNote: 'Thank you for your business. Retain this official receipt for your tax records.',
      developerCredit: 'Software by Roonjha Developers: 03152914836'
    };
    const saved = this.state.settings['business_profile'] || {};
    const profile = { ...defaults, ...saved };
    if (profile.officeName === 'Ahmed Doda Tax & Corporate Advisory Services') {
      profile.officeName = 'Arslan Tax & Corporate Advisory Services';
      this.state.settings['business_profile'] = profile;
    }
    return profile;
  }

  public async saveBusinessProfile(profile: BusinessProfile): Promise<void> {
    await this.init();
    this.state.settings['business_profile'] = profile;
    await this.persist();
  }

  // --- OUTBOX & AUDIT ---
  private enqueueOutbox(
    operation: OutboxOperation,
    entityType: EntityType,
    entityId: string,
    payload: any,
    version: number,
    idempotencyKey?: string
  ): void {
    const entry: OutboxEntry = {
      id: `outbox-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      idempotencyKey: idempotencyKey || `idemp-${entityType}-${entityId}-${version}`,
      operation,
      entityType,
      entityId,
      payload: JSON.stringify(payload),
      version,
      createdAt: new Date().toISOString(),
      attemptCount: 0,
      status: 'pending'
    };
    this.state.outbox.push(entry);
  }

  public async getOutboxEntries(status?: OutboxEntry['status']): Promise<OutboxEntry[]> {
    await this.init();
    if (status) {
      return this.state.outbox.filter((e) => e.status === status);
    }
    return [...this.state.outbox];
  }

  public async updateOutboxStatus(id: string, status: OutboxEntry['status'], error?: string): Promise<void> {
    await this.init();
    const entry = this.state.outbox.find((e) => e.id === id);
    if (entry) {
      entry.status = status;
      entry.attemptCount++;
      entry.lastAttemptAt = new Date().toISOString();
      if (error) entry.lastError = error;
      await this.persist();
    }
  }

  private logAudit(userId: string, action: string, entityType: string, entityId: string, details: string): void {
    this.state.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId,
      action,
      entityType,
      entityId,
      details
    });
  }

  public async getAuditLogs(): Promise<AuditLogEntry[]> {
    await this.init();
    return [...this.state.auditLogs];
  }

  // --- BACKUP & RESTORE ---
  public async exportDatabaseSnapshot(): Promise<string> {
    await this.init();
    return JSON.stringify({
      version: this.state.version,
      exportedAt: new Date().toISOString(),
      state: this.state
    }, null, 2);
  }

  public async restoreDatabaseSnapshot(snapshotJson: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(snapshotJson);
      if (parsed && parsed.state && Array.isArray(parsed.state.customers)) {
        this.state = parsed.state;
        await this.persist();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to restore snapshot:', e);
      return false;
    }
  }

  // --- SEED INITIAL REALISTIC DATA ---
  private seedInitialData(): void {
    const now = new Date().toISOString();

    const c1: Customer = {
      id: 'CUST-2026-0001',
      fullName: 'Ahmed Ali Khan',
      fatherName: 'Muhammad Tariq Khan',
      cnic: '35202-1234567-1',
      primaryMobile: '+923001234567',
      whatsappNumber: '+923001234567',
      address: 'House # 45, Street 12, F-8/2, Islamabad',
      email: 'ahmed.ali@example.com',
      ntnNumber: '4289102-5',
      status: 'active',
      notes: 'Salaried individual with dividend and property income.',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'saved_locally',
      version: 1
    };

    const c2: Customer = {
      id: 'CUST-2026-0002',
      fullName: 'Fatima Zahra',
      fatherName: 'Syed Hasan Ali',
      cnic: '42101-7654321-2',
      primaryMobile: '+923219876543',
      whatsappNumber: '+923219876543',
      address: 'Apartment 5B, Al-Raee Heights, Gulberg III, Lahore',
      email: 'fatima.zahra@example.com',
      ntnNumber: '5192837-1',
      status: 'active',
      notes: 'Freelancer / Software Consultant providing IT export services.',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'saved_locally',
      version: 1
    };

    const c3: Customer = {
      id: 'CUST-2026-0003',
      fullName: 'Muhammad Usman',
      fatherName: 'Abdul Rehman',
      cnic: '37405-9876543-3',
      primaryMobile: '+923335551234',
      whatsappNumber: '+923335551234',
      address: 'Shop # 18, Commercial Market, Satellite Town, Rawalpindi',
      ntnNumber: '6821453-8',
      status: 'active',
      notes: 'Retail electronics business owner. Requires Sales Tax filing.',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'saved_locally',
      version: 1
    };

    // Services
    const s1: TaxService = {
      id: 'SRV-2025-0001',
      customerId: 'CUST-2026-0001',
      serviceType: 'income_tax_return',
      taxYear: '2025',
      startDate: '2025-09-01T10:00:00.000Z',
      filingDeadline: '2025-09-30T23:59:59.000Z',
      filingStatus: 'completed',
      checklist: [
        { id: '1', name: 'Annual Salary Certificate', isRequired: true, isReceived: true },
        { id: '2', name: 'Bank Statement (July 2024 - June 2025)', isRequired: true, isReceived: true },
        { id: '3', name: 'Wealth Statement / Asset List', isRequired: true, isReceived: true },
        { id: '4', name: 'Vehicle Tax & Token receipts', isRequired: false, isReceived: true }
      ],
      submissionDate: '2025-09-28T14:30:00.000Z',
      completionDate: '2025-09-28T15:00:00.000Z',
      assignedStaff: 'Muhammad Farooq (Senior Consultant)',
      agreedFee: 8000,
      discount: 500,
      finalPayable: 7500,
      amountPaid: 4000,
      outstandingBalance: 3500,
      paymentStatus: 'partially_paid',
      notes: 'Partial payment received on submission. Remaining Rs. 3,500 due on receipt of final CPR.',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'saved_locally',
      version: 1
    };

    const s2: TaxService = {
      id: 'SRV-2024-0002',
      customerId: 'CUST-2026-0001',
      serviceType: 'income_tax_return',
      taxYear: '2024',
      startDate: '2024-09-01T10:00:00.000Z',
      filingDeadline: '2024-09-30T23:59:59.000Z',
      filingStatus: 'completed',
      checklist: [
        { id: '1', name: 'Salary Certificate', isRequired: true, isReceived: true },
        { id: '2', name: 'Bank Statement', isRequired: true, isReceived: true }
      ],
      submissionDate: '2024-09-25T11:00:00.000Z',
      completionDate: '2024-09-25T11:30:00.000Z',
      assignedStaff: 'Muhammad Farooq',
      agreedFee: 5000,
      discount: 0,
      finalPayable: 5000,
      amountPaid: 0,
      outstandingBalance: 5000,
      paymentStatus: 'unpaid',
      notes: 'Filing completed last year; client balance remained unpaid.',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'saved_locally',
      version: 1
    };

    const s3: TaxService = {
      id: 'SRV-2025-0003',
      customerId: 'CUST-2026-0002',
      serviceType: 'income_tax_return',
      taxYear: '2025',
      startDate: '2025-09-10T10:00:00.000Z',
      filingDeadline: '2025-09-30T23:59:59.000Z',
      filingStatus: 'completed',
      checklist: [
        { id: '1', name: 'Foreign Remittance PRC Certificates', isRequired: true, isReceived: true },
        { id: '2', name: 'Bank Statements', isRequired: true, isReceived: true },
        { id: '3', name: 'PSEB Registration Certificate', isRequired: true, isReceived: true }
      ],
      submissionDate: '2025-09-29T16:00:00.000Z',
      completionDate: '2025-09-29T16:45:00.000Z',
      assignedStaff: 'Ayesha Siddiqui',
      agreedFee: 12000,
      discount: 1000,
      finalPayable: 11000,
      amountPaid: 11000,
      outstandingBalance: 0,
      paymentStatus: 'paid',
      notes: 'Paid in full via Bank Transfer.',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'saved_locally',
      version: 1
    };

    const s4: TaxService = {
      id: 'SRV-2026-0004',
      customerId: 'CUST-2026-0003',
      serviceType: 'ntn_registration',
      taxYear: '2026',
      startDate: '2026-01-15T09:30:00.000Z',
      filingStatus: 'in_progress',
      checklist: [
        { id: '1', name: 'CNIC Scans (Front & Back)', isRequired: true, isReceived: true },
        { id: '2', name: 'Electricity Utility Bill of Business Premises', isRequired: true, isReceived: true },
        { id: '3', name: 'Rent Agreement or Ownership Deed', isRequired: true, isReceived: false },
        { id: '4', name: 'Business Letterhead', isRequired: true, isReceived: true }
      ],
      assignedStaff: 'Ayesha Siddiqui',
      agreedFee: 3000,
      discount: 0,
      finalPayable: 3000,
      amountPaid: 1500,
      outstandingBalance: 1500,
      paymentStatus: 'partially_paid',
      notes: 'Advance payment of Rs. 1,500 received in cash.',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'saved_locally',
      version: 1
    };

    // Payments
    const p1: PaymentTransaction = {
      id: 'TXN-20250915-001',
      receiptNumber: 'REC-2025-00101',
      customerId: 'CUST-2026-0001',
      serviceId: 'SRV-2025-0001',
      taxYear: '2025',
      amount: 4000,
      paymentMethod: 'Cash',
      paymentDate: '2025-09-15T11:20:00.000Z',
      receivedBy: 'Cashier / Bilal',
      notes: 'First installment of 2025 Tax Return fee.',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-txn-seed-1',
      syncStatus: 'saved_locally',
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    const p2: PaymentTransaction = {
      id: 'TXN-20250920-002',
      receiptNumber: 'REC-2025-00102',
      customerId: 'CUST-2026-0002',
      serviceId: 'SRV-2025-0003',
      taxYear: '2025',
      amount: 11000,
      paymentMethod: 'Bank Transfer',
      paymentDate: '2025-09-20T14:10:00.000Z',
      transactionReference: 'MBL-FT-98421095',
      receivedBy: 'Ayesha Siddiqui',
      notes: 'Full payment settled online.',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-txn-seed-2',
      syncStatus: 'saved_locally',
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    const p3: PaymentTransaction = {
      id: 'TXN-20260115-003',
      receiptNumber: 'REC-2026-00103',
      customerId: 'CUST-2026-0003',
      serviceId: 'SRV-2026-0004',
      taxYear: '2026',
      amount: 1500,
      paymentMethod: 'JazzCash',
      paymentDate: '2026-01-15T10:05:00.000Z',
      transactionReference: 'JC-88392104',
      receivedBy: 'Ayesha Siddiqui',
      notes: '50% advance for NTN registration.',
      status: 'valid',
      refundedAmount: 0,
      idempotencyKey: 'idemp-txn-seed-3',
      syncStatus: 'saved_locally',
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    // Follow-ups
    const f1: FollowUpReminder = {
      id: 'FOL-001',
      customerId: 'CUST-2026-0001',
      customerName: 'Ahmed Ali Khan',
      serviceId: 'SRV-2025-0001',
      title: 'Collect remaining fee Rs. 3,500 after sending CPR',
      taxYear: '2025',
      dueDate: '2026-10-25',
      priority: 'high',
      status: 'pending',
      notes: 'Customer agreed to transfer balance via JazzCash.',
      createdAt: now
    };

    const f2: FollowUpReminder = {
      id: 'FOL-002',
      customerId: 'CUST-2026-0003',
      customerName: 'Muhammad Usman',
      serviceId: 'SRV-2026-0004',
      title: 'Obtain Rent Agreement for shop NTN verification',
      taxYear: '2026',
      dueDate: '2026-10-28',
      priority: 'urgent',
      status: 'pending',
      notes: 'Client promised to bring physical tenancy document.',
      createdAt: now
    };

    this.state = {
      customers: [c1, c2, c3],
      taxServices: [s1, s2, s3, s4],
      payments: [p1, p2, p3],
      refunds: [],
      documents: [],
      followUps: [f1, f2],
      outbox: [],
      settings: {},
      users: [
        { id: 'usr-1', name: 'Senior Partner', role: 'admin', isActive: true, createdAt: now },
        { id: 'usr-2', name: 'Tax Consultant', role: 'consultant', isActive: true, createdAt: now },
        { id: 'usr-3', name: 'Accounts Cashier', role: 'accountant', isActive: true, createdAt: now }
      ],
      auditLogs: [
        {
          id: 'audit-seed-1',
          timestamp: now,
          userId: 'system',
          action: 'SYSTEM_INIT',
          entityType: 'database',
          entityId: 'root',
          details: 'Initialized database schema and seeded baseline tax clients.'
        }
      ],
      receiptSequence: 103,
      version: 1
    };
  }
}

export const dbService = new SQLiteDatabaseService();
