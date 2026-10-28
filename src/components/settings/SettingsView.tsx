import React, { useState, useEffect } from 'react';
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
  FileCheck,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  UserCheck,
  UserPlus,
  Users,
  KeyRound,
  Trash2,
  Power
} from 'lucide-react';
import { BusinessProfile, AppUser, UserRole, CreateAdminInput } from '../../types/settings';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction } from '../../types/payment';
import { createFullDatabaseBackup, restoreDatabaseBackup } from '../../services/backup/backupService';
import { authService } from '../../services/auth/authService';
import { exportDateFilteredExcel, filterCustomersByDate, filterServicesByDate, filterPaymentsByDate } from '../../services/export/excelExport';
import { exportDateFilteredPDF } from '../../services/export/pdfExport';

interface SettingsViewProps {
  businessProfile: BusinessProfile;
  onSaveProfile: (profile: BusinessProfile) => Promise<void>;
  onReloadDatabase: () => Promise<void>;
  currentUser?: AppUser | null;
  customers?: Customer[];
  services?: TaxService[];
  payments?: PaymentTransaction[];
  initialTab?: 'profile' | 'backup' | 'admins';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  businessProfile,
  onSaveProfile,
  onReloadDatabase,
  currentUser,
  customers = [],
  services = [],
  payments = [],
  initialTab = 'profile'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'backup' | 'admins'>(initialTab);
  const [profile, setProfile] = useState<BusinessProfile>(businessProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Date-Filtered Export States
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [dateError, setDateError] = useState<string>('');

  // Backup states
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreMessage, setRestoreMessage] = useState<{ success?: boolean; text: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Admin Management States
  const [usersList, setUsersList] = useState<Omit<AppUser, 'passwordHash'>[]>([]);
  const [newAdmin, setNewAdmin] = useState<CreateAdminInput>({
    name: '',
    email: '',
    password: '',
    role: 'admin'
  });
  const [adminActionMsg, setAdminActionMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Super Admin Credential Change States
  const [currentPassForId, setCurrentPassForId] = useState('');
  const [newLoginId, setNewLoginId] = useState('');
  const [idChangeMsg, setIdChangeMsg] = useState<{ success: boolean; text: string } | null>(null);

  const [currentPassForPass, setCurrentPassForPass] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passChangeMsg, setPassChangeMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Check super admin status
  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const list = authService.getUsersSafe();
    setUsersList(list);
  };

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
      a.download = `arslan_tax_crm_backup_${new Date().toISOString().slice(0, 10)}.taxbackup`;
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

  // Validate date range
  const validateDates = (): boolean => {
    setDateError('');
    if (fromDate && toDate && fromDate > toDate) {
      setDateError('Validation Error: From Date cannot be after To Date.');
      return false;
    }
    return true;
  };

  const handleResetDates = () => {
    setFromDate('');
    setToDate('');
    setDateError('');
  };

  const handleExportPDF = () => {
    if (!validateDates()) return;
    exportDateFilteredPDF({
      businessProfile: profile,
      dateRange: { fromDate, toDate },
      customers,
      services,
      payments
    });
  };

  const handleExportExcel = () => {
    if (!validateDates()) return;
    exportDateFilteredExcel({
      businessProfile: profile,
      dateRange: { fromDate, toDate },
      customers,
      services,
      payments
    });
  };

  // Admin Management Handlers
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmittingAdmin(true);
    setAdminActionMsg(null);

    const res = await authService.createAdministrator(newAdmin, currentUser.id);
    setIsSubmittingAdmin(false);

    if (res.success) {
      setAdminActionMsg({ success: true, text: res.message || 'Administrator created successfully!' });
      setNewAdmin({ name: '', email: '', password: '', role: 'admin' });
      loadUsers();
      setTimeout(() => setAdminActionMsg(null), 4000);
    } else {
      setAdminActionMsg({ success: false, text: res.message || 'Failed to create administrator.' });
    }
  };

  const handleToggleUserStatus = async (targetUserId: string) => {
    if (!currentUser) return;
    const res = await authService.toggleUserActive(targetUserId, currentUser.id);
    if (res.success) {
      loadUsers();
    } else {
      alert(res.message);
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to permanently delete this administrator account?')) return;

    const res = await authService.deleteAdministrator(targetUserId, currentUser.id);
    if (res.success) {
      loadUsers();
    } else {
      alert(res.message);
    }
  };

  const handleChangeLoginId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIdChangeMsg(null);

    const res = await authService.changeSuperAdminLoginId(
      currentUser.id,
      currentPassForId,
      newLoginId
    );

    setIdChangeMsg({ success: res.success, text: res.message });
    if (res.success) {
      setCurrentPassForId('');
      setNewLoginId('');
      loadUsers();
      setTimeout(() => setIdChangeMsg(null), 4000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setPassChangeMsg(null);

    if (newPassword !== confirmPassword) {
      setPassChangeMsg({ success: false, text: 'New password and confirmation password do not match.' });
      return;
    }

    const res = await authService.changeSuperAdminPassword(
      currentUser.id,
      currentPassForPass,
      newPassword
    );

    setPassChangeMsg({ success: res.success, text: res.message });
    if (res.success) {
      setCurrentPassForPass('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassChangeMsg(null), 4000);
    }
  };

  // Filter preview counts
  const range = { fromDate, toDate };
  const filteredCustCount = filterCustomersByDate(customers, range).length;
  const filteredServCount = filterServicesByDate(services, range).length;
  const filteredPayCount = filterPaymentsByDate(payments, range).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              <span>Arslan Tax & Corporate Advisory Services - Settings</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure office identity, exports, date-filtered reports, backups, and administrator security.
            </p>
          </div>
          {isSuperAdmin && (
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Super Admin Mode
            </span>
          )}
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'profile'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Office Profile & Identity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('backup')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'backup'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup & Export Center</span>
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveSubTab('admins')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'admins'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Administrator Management & Security</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: OFFICE PROFILE & IDENTITY */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-medium"
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
                <label className="block text-slate-300 font-semibold mb-1">Official Email Address</label>
                <input
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                  If disabled, payments greater than current service balance are rejected for accounting safety.
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

          {/* System Security & Developer Attribution */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Local Security & Vault Integrity</h3>
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
                    <div className="font-semibold text-slate-200">Customer CNIC & Document Vault</div>
                    <div className="text-[11px] text-slate-400">Document attachments encrypted at rest</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                    PROTECTED
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Author & Developer Attribution</h3>
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-white">
                  {profile.developerCredit || 'Software by Roonjha Developers: 03152914836'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Custom engineered for Arslan Tax & Corporate Advisory Services, Winder, Hub, Balochistan.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BACKUP & EXPORT CENTER */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6">
          {/* Section A: Date-Filtered Report Export */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm text-white">Date-Filtered Report Export (PDF & Excel)</h3>
                <p className="text-[11px] text-slate-400">
                  Export human-readable PDF reports and multi-sheet Excel (.xlsx) workbooks filtered by date range.
                </p>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleResetDates}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition text-xs font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Dates (All History)</span>
                </button>
              </div>
            </div>

            {dateError && (
              <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{dateError}</span>
              </div>
            )}

            {/* Filter Metrics Indicator */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">
                Selected Period: <strong className="text-white">{fromDate || 'Earliest'}</strong> to <strong className="text-white">{toDate || 'Present'}</strong>
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Customers: <strong className="text-white">{filteredCustCount}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Services: <strong className="text-white">{filteredServCount}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Payments: <strong className="text-white">{filteredPayCount}</strong>
                </span>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportPDF}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs cursor-pointer shadow-sm transition"
              >
                <FileText className="w-4 h-4" />
                <span>Download PDF Report</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-sm transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Excel (.xlsx) Workbook</span>
              </button>
            </div>
          </div>

          {/* Section B: Full Restorable Database Backup & Disaster Recovery */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Database className="w-4 h-4 text-blue-400" />
              <div>
                <h3 className="font-bold text-sm text-white">Full System Backup & Disaster Recovery</h3>
                <p className="text-[11px] text-slate-400">
                  A restorable database backup containing all customers, tax services, payment transactions, documents, and settings with SHA-256 checksums.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Full Backup */}
              <div className="space-y-2 text-xs">
                <span className="font-semibold text-slate-200 block">Export Restorable Backup (.taxbackup)</span>
                <p className="text-[11px] text-slate-400">
                  Creates an ACID-consistent snapshot of the entire offline system with relations preserved.
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
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer shadow-sm transition whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Full Backup</span>
                  </button>
                </div>
              </div>

              {/* Restore Full Backup */}
              <div className="space-y-2 text-xs">
                <span className="font-semibold text-slate-200 block">Restore Database from Backup</span>
                <p className="text-[11px] text-slate-400">
                  Select a verified <code className="text-emerald-400">.taxbackup</code> file. Pre-restore safety snapshot taken automatically.
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
      )}

      {/* SUB-TAB 3: ADMINISTRATOR MANAGEMENT & SECURITY (SUPER ADMIN ONLY) */}
      {activeSubTab === 'admins' && isSuperAdmin && (
        <div className="space-y-6">
          {/* Section 1: Super Admin Self Credentials Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm text-white">Super Admin Security Credentials</h3>
                <p className="text-[11px] text-slate-400">
                  Update your active Super Admin Login ID / Email and master password securely.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Change Login ID */}
              <form onSubmit={handleChangeLoginId} className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Change Super Admin Login ID / Email</span>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Current Active Login ID: <strong className="text-white">{currentUser?.email}</strong></label>
                  <input
                    type="email"
                    value={newLoginId}
                    onChange={(e) => setNewLoginId(e.target.value)}
                    placeholder="New Login ID / Email..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Verify Current Password</label>
                  <input
                    type="password"
                    value={currentPassForId}
                    onChange={(e) => setCurrentPassForId(e.target.value)}
                    placeholder="Enter current password..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                {idChangeMsg && (
                  <div className={`p-2 rounded text-xs ${idChangeMsg.success ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'}`}>
                    {idChangeMsg.text}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg cursor-pointer transition shadow-sm"
                >
                  Update Super Admin Login ID
                </button>
              </form>

              {/* Change Password */}
              <form onSubmit={handleChangePassword} className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Change Super Admin Password</span>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassForPass}
                    onChange={(e) => setCurrentPassForPass(e.target.value)}
                    placeholder="Enter current password..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">New Password (min 6 characters)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                {passChangeMsg && (
                  <div className={`p-2 rounded text-xs ${passChangeMsg.success ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'}`}>
                    {passChangeMsg.text}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg cursor-pointer transition shadow-sm"
                >
                  Change Super Admin Password
                </button>
              </form>
            </div>
          </div>

          {/* Section 2: Create New Administrator Account */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm text-white">Create Additional Administrator</h3>
                <p className="text-[11px] text-slate-400">
                  Grant system access to new administrators, tax consultants, accountants, or office staff.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Login ID / Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="e.g. tariq@arslantax.pk"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Password</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role / Privilege</label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as UserRole })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="admin">Administrator</option>
                  <option value="consultant">Tax Consultant</option>
                  <option value="accountant">Accountant / Cashier</option>
                  <option value="staff">Staff / Assistant</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2">
                {adminActionMsg && (
                  <span className={`text-xs font-semibold ${adminActionMsg.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {adminActionMsg.text}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="ml-auto flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-sm transition disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmittingAdmin ? 'Creating...' : 'Create Administrator'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Registered Administrators & Staff List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Registered Administrators & Staff ({usersList.length})</h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Login ID / Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {usersList.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isTargetSuper = u.role === 'super_admin';

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{u.email || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.role === 'super_admin'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : u.role === 'admin'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.isActive
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-rose-950 text-rose-400'
                          }`}>
                            {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {u.createdAt ? u.createdAt.slice(0, 10) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          {!isSelf && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u.id)}
                                title={u.isActive ? 'Deactivate user' : 'Activate user'}
                                className={`p-1.5 rounded cursor-pointer transition ${
                                  u.isActive
                                    ? 'text-amber-400 hover:bg-amber-950/50'
                                    : 'text-emerald-400 hover:bg-emerald-950/50'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              {!isTargetSuper && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id)}
                                  title="Delete administrator"
                                  className="p-1.5 rounded text-rose-400 hover:bg-rose-950/50 cursor-pointer transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
