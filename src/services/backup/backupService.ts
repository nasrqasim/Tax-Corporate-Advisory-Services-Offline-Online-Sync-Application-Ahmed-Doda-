/**
 * Backup and Disaster Recovery Service
 * Creates transactionally consistent, encrypted database snapshots with SHA-256 integrity verification.
 */

import { dbService } from '../sqlite/db';
import { safeStorage } from '../sqlite/storage';
import { encryptData, decryptData, computeSha256 } from '../security/crypto';

export interface BackupPackage {
  app: 'TaxCustomerManagement';
  version: number;
  createdAt: string;
  checksum: string;
  isEncrypted: boolean;
  payload: string; // Plaintext JSON or Encrypted base64
}

export async function createFullDatabaseBackup(passphrase?: string): Promise<string> {
  const snapshotJson = await dbService.exportDatabaseSnapshot();
  const checksum = await computeSha256(snapshotJson);

  let isEncrypted = false;
  let payload = snapshotJson;

  if (passphrase && passphrase.trim()) {
    const encrypted = await encryptData(snapshotJson, passphrase.trim());
    payload = JSON.stringify(encrypted);
    isEncrypted = true;
  }

  const pkg: BackupPackage = {
    app: 'TaxCustomerManagement',
    version: 1,
    createdAt: new Date().toISOString(),
    checksum,
    isEncrypted,
    payload
  };

  return JSON.stringify(pkg, null, 2);
}

export async function restoreDatabaseBackup(
  backupFileContent: string,
  passphrase?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const pkg: BackupPackage = JSON.parse(backupFileContent);

    if (pkg.app !== 'TaxCustomerManagement') {
      return { success: false, message: 'Invalid backup file format. Header mismatch.' };
    }

    let snapshotJson = pkg.payload;

    if (pkg.isEncrypted) {
      if (!passphrase) {
        return { success: false, message: 'This backup is encrypted. Please provide the decryption password.' };
      }
      try {
        const encryptedPayload = JSON.parse(pkg.payload);
        snapshotJson = await decryptData(encryptedPayload, passphrase);
      } catch (err) {
        return { success: false, message: 'Incorrect decryption password or corrupted backup file.' };
      }
    }

    // Verify SHA-256 Checksum
    const calculatedChecksum = await computeSha256(snapshotJson);
    if (calculatedChecksum !== pkg.checksum) {
      return { success: false, message: 'Integrity check failed! Backup file may have been modified or corrupted.' };
    }

    // Create automatic pre-restore safety snapshot
    const preRestoreSnapshot = await dbService.exportDatabaseSnapshot();
    safeStorage.setItem('tax_crm_pre_restore_safety_snapshot', preRestoreSnapshot);

    // Apply restore
    const restored = await dbService.restoreDatabaseSnapshot(snapshotJson);
    if (!restored) {
      return { success: false, message: 'Failed to apply database snapshot. Schema error.' };
    }

    return { success: true, message: 'Database successfully restored and verified!' };
  } catch (e: any) {
    return { success: false, message: `Restore error: ${e.message}` };
  }
}
