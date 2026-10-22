/**
 * Synchronization and Outbox Types
 */

export type OutboxOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'REFUND' | 'REVERSAL';

export type EntityType =
  | 'customer'
  | 'tax_service'
  | 'payment_transaction'
  | 'refund_record'
  | 'customer_document'
  | 'app_setting'
  | 'follow_up';

export interface OutboxEntry {
  id: string;
  idempotencyKey: string;
  operation: OutboxOperation;
  entityType: EntityType;
  entityId: string;
  payload: string; // JSON serialized
  version: number;
  createdAt: string;
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
}

export interface SyncStats {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  lastSyncTimestamp?: string;
  lastError?: string;
}

export interface SyncConflict {
  id: string;
  entityType: EntityType;
  entityId: string;
  localVersion: number;
  remoteVersion: number;
  localData: any;
  remoteData: any;
  detectedAt: string;
  resolved: boolean;
  resolutionChoice?: 'keep_local' | 'accept_remote' | 'manual_merged';
}
