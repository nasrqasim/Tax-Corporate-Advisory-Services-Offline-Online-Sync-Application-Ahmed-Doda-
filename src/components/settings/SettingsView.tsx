import React, { useState } from 'react';
import {
  Settings,
  Briefcase,
  ShieldCheck,
  Database,
  Download,
  Upload,
  Save,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Lock,
  FileCheck
} from 'lucide-react';
import { BusinessProfile } from '../../types/settings';
import { createFullDatabaseBackup, restoreDatabaseBackup } from '../../services/backup/backupService';

interface SettingsViewProps {
  businessProfile: BusinessProfile;
  onSaveProfile: (profile: BusinessProfile) => Promise<void>;
  onReloadDatabase: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  businessProfile,
  onSaveProfile,
  onReloadDatabase
}) => {
  const [profile, setProfile] = useState<BusinessProfile>(businessProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Backup states
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreMessage, setRestoreMessage] = useState<{ success?: boolean; text: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveProfile(profile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      alert(`Error saving settings: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const backupJson = await createFullDatabaseBackup(backupPassphrase);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax_crm_backup_${new Date().toISOString().slice(0, 10)}.taxbackup`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Backup failed: ${e.message}`);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Warning: Restoring a database snapshot will merge/restore records from the backup file. A pre-restore safety snapshot will be taken automatically. Proceed?')) {
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await restoreDatabaseBackup(text, restorePassphrase);
        if (res.success) {
          setRestoreMessage({ success: true, text: res.message });
          await onReloadDatabase();
        } else {
          setRestoreMessage({ success: false, text: res.message });
        }
      } catch (err: any) {
        setRestoreMessage({ success: false, text: err.message });
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>System Settings & Business Profile</span>
        </h2>
        <p className="text-xs text-slate-400">
          Configure office identity, NTN credentials, receipt templates, overpayment policies, and backups.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Business Profile & Office Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Office Profile & Branding</h3>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tax Office / Firm Name</label>
              <input
                type="text"
                value={profile.officeName}
                onChange={(e) => setProfile({ ...profile, officeName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tagline / Services Subtitle</label>
              <input
                type="text"
                value={profile.tagline || ''}
                onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Firm NTN Number</label>
                <input
                  type="text"
                  value={profile.ntn || ''}
                  onChange={(e) => setProfile({ ...profile, ntn: e.target.value })}
                  placeholder="e.g. 7392814-2"
                  className="w-full bg-slate-800 border border-slate-700 font-mono rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Primary Phone</label>
                <input
                  type="text"
                  inputMode="tel"
                  value={profile.primaryPhone}
                  onChange={(e) => setProfile({ ...profile, primaryPhone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 font-mono rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">WhatsApp Hotline</label>
                <input
                  type="text"
                  inputMode="tel"
                  value={profile.whatsapp || ''}
                  onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 font-mono rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Office Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Receipt Footer Note</label>
              <textarea
                value={profile.receiptFooterNote}
                onChange={(e) => setProfile({ ...profile, receiptFooterNote: e.target.value })}
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Overpayment Policy Toggle */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.allowOverpayments}
                  onChange={(e) => setProfile({ ...profile, allowOverpayments: e.target.checked })}
                  className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold text-slate-200">
                  Allow Overpayments (Allow payment amount to exceed outstanding balance)
                </span>
              </label>
              <p className="text-[11px] text-slate-500 ml-5 mt-0.5">
                If disabled, payments greater than current service balance are rejected for safety.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {saveSuccess && (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Settings saved successfully!</span>
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto ml-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold cursor-pointer shadow-sm disabled:opacity-50 min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Office Settings'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Backup, Recovery & Encryption Security */}
        <div className="space-y-6">
          {/* Security & Encryption Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Local Security & Encryption</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Local Database Encryption</div>
                  <div className="text-[11px] text-slate-400">AES-256-GCM + PBKDF2 Web Crypto</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                  ACTIVE
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Sensitive Document Vault</div>
                  <div className="text-[11px] text-slate-400">CNIC scans & tax documents encrypted at rest</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                  SECURE
                </span>
              </div>
            </div>
          </div>

          {/* Backup & Recovery Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Database className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">Backup & Disaster Recovery</h3>
            </div>

            {/* Export Backup */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-200 block">Export Full Database Backup</span>
              <p className="text-[11px] text-slate-400">
                Exports all customer records, tax services, payment history, receipts, and audit logs with SHA-256 checksum integrity verification.
              </p>

              <div className="flex gap-2 pt-1">
                <input
                  type="password"
                  value={backupPassphrase}
                  onChange={(e) => setBackupPassphrase(e.target.value)}
                  placeholder="Optional passphrase to encrypt backup file..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup</span>
                </button>
              </div>
            </div>

            {/* Restore Backup */}
            <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
              <span className="font-semibold text-slate-200 block">Restore Database from File</span>
              <p className="text-[11px] text-slate-400">
                Select a verified <code className="text-emerald-400">.taxbackup</code> file. The system will verify checksum integrity and rollback safely if invalid.
              </p>

              <div className="space-y-2 pt-1">
                <input
                  type="password"
                  value={restorePassphrase}
                  onChange={(e) => setRestorePassphrase(e.target.value)}
                  placeholder="Passphrase (if backup was encrypted)..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                />

                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-700 rounded-lg hover:border-emerald-500 cursor-pointer bg-slate-950/60 transition">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium text-slate-300">
                    {isRestoring ? 'Verifying & Restoring...' : 'Select .taxbackup File to Restore'}
                  </span>
                  <input
                    type="file"
                    accept=".taxbackup,.json"
                    onChange={handleRestoreFile}
                    disabled={isRestoring}
                    className="hidden"
                  />
                </label>
              </div>

              {restoreMessage && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                    restoreMessage.success
                      ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-800 text-rose-200'
                  }`}
                >
                  {restoreMessage.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span>{restoreMessage.text}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
