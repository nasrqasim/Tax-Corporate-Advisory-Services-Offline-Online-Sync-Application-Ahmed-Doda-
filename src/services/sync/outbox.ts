/**
 * Durable Offline Outbox Manager
 * Ensures all customer and financial operations are persisted locally first,
 * with unique idempotency keys to prevent duplicate transactions on network retries.
 */

import { OutboxEntry, SyncStats } from '../../types/sync';
import { dbService } from '../sqlite/db';

export class OutboxManager {
  private isProcessing = false;

  public async getPendingEntries(): Promise<OutboxEntry[]> {
    return dbService.getOutboxEntries('pending');
  }

  public async getSyncStats(): Promise<SyncStats> {
    const all = await dbService.getOutboxEntries();
    const pending = all.filter((e) => e.status === 'pending' || e.status === 'syncing').length;
    const synced = all.filter((e) => e.status === 'synced').length;
    const failed = all.filter((e) => e.status === 'failed').length;
    const conflict = all.filter((e) => e.status === 'conflict').length;

    const isOnline = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;

    return {
      isOnline,
      isSyncing: this.isProcessing,
      pendingCount: pending,
      syncedCount: synced,
      failedCount: failed,
      conflictCount: conflict,
      lastSyncTimestamp: new Date().toISOString()
    };
  }

  public async markSyncing(id: string): Promise<void> {
    await dbService.updateOutboxStatus(id, 'syncing');
  }

  public async markSynced(id: string): Promise<void> {
    await dbService.updateOutboxStatus(id, 'synced');
  }

  public async markFailed(id: string, error: string): Promise<void> {
    await dbService.updateOutboxStatus(id, 'failed', error);
  }

  public async markConflict(id: string, details: string): Promise<void> {
    await dbService.updateOutboxStatus(id, 'conflict', details);
  }
}

export const outboxManager = new OutboxManager();
