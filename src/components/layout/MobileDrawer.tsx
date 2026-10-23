import React from 'react';
import {
  X,
  Briefcase,
  FileText,
  History,
  Receipt,
  Clock,
  BarChart3,
  Cloud,
  Database,
  Settings,
  UserCheck,
  ShieldCheck,
  MapPin,
  ChevronRight,
  LogOut,
  Globe
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { UserRole } from '../../types/settings';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  pendingSyncCount: number;
  pendingFollowupCount: number;
  officeName: string;
  ntn?: string;
  address?: string;
  onLogout?: () => void;
  onViewLandingPage?: () => void;
}

interface DrawerMenuItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  badge?: number;
  badgeColor?: string;
}

interface DrawerSection {
  title: string;
  items: DrawerMenuItem[];
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  currentRole,
  onRoleChange,
  pendingSyncCount,
  pendingFollowupCount,
  officeName,
  ntn,
  address,
  onLogout,
  onViewLandingPage
}) => {
  if (!isOpen) return null;

  const menuSections: DrawerSection[] = [
    {
      title: 'TAX WORKFLOW & FILING',
      items: [
        { id: 'services' as NavTab, label: 'Tax Services & Filing', icon: FileText, desc: 'Income tax, NTN, sales tax records' },
        {
          id: 'followups' as NavTab,
          label: 'Follow-ups & Due Dates',
          icon: Clock,
          desc: 'CPR collection & FBR deadlines',
          badge: pendingFollowupCount > 0 ? pendingFollowupCount : undefined
        }
      ]
    },
    {
      title: 'ACCOUNTS & REPORTS',
      items: [
        { id: 'payment_history' as NavTab, label: 'Payment Ledger & History', icon: History, desc: 'All payment transactions & refunds' },
        { id: 'receipts_statements' as NavTab, label: 'Receipts & Statements', icon: Receipt, desc: 'Printable receipts & client statements' },
        { id: 'reports' as NavTab, label: 'Financial Reports', icon: BarChart3, desc: 'Receivables, collections & tax years' }
      ]
    },
    {
      title: 'OFFLINE & SYSTEM',
      items: [
        {
          id: 'sync' as NavTab,
          label: 'Offline Outbox Sync',
          icon: Cloud,
          desc: 'Cloud replication & conflict audit',
          badge: pendingSyncCount > 0 ? pendingSyncCount : undefined,
          badgeColor: 'bg-blue-600'
        },
        { id: 'backup' as NavTab, label: 'Backup & Recovery', icon: Database, desc: 'Export & verified snapshot restore' },
        { id: 'settings' as NavTab, label: 'Settings & Security', icon: Settings, desc: 'Office profile, NTN & policies' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col h-full z-10 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white leading-tight">
                {officeName}
              </h2>
              {ntn && (
                <div className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-emerald-400 font-mono border border-slate-700">
                  NTN: {ntn}
                </div>
              )}
              {address && (
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 line-clamp-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{address}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 cursor-pointer shrink-0"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Role Switcher in Drawer */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Active Staff Role
          </label>
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1.5">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-slate-200 text-xs w-full focus:outline-none cursor-pointer font-medium"
            >
              <option value="admin" className="bg-slate-900 text-slate-200">
                Admin (Full Access & Reversals)
              </option>
              <option value="consultant" className="bg-slate-900 text-slate-200">
                Tax Consultant (Filing & Clients)
              </option>
              <option value="accountant" className="bg-slate-900 text-slate-200">
                Accountant / Cashier (Payments & Receipts)
              </option>
            </select>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {section.title}
              </div>
              <div className="space-y-1 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer min-h-[48px] ${
                        isCurrent
                          ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-950/40 hover:bg-slate-800/80 text-slate-300 border border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-medium leading-snug">
                            {item.label}
                          </div>
                          <div
                            className={`text-[10px] line-clamp-1 ${
                              isCurrent ? 'text-emerald-100' : 'text-slate-500'
                            }`}
                          >
                            {item.desc}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                              item.badgeColor || 'bg-amber-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight
                          className={`w-4 h-4 ${
                            isCurrent ? 'text-white' : 'text-slate-600'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Portal & Logout buttons for mobile */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 space-y-2">
          {onViewLandingPage && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewLandingPage();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition min-h-[40px]"
            >
              <Globe className="w-4 h-4 text-blue-400" />
              <span>View Public Website</span>
            </button>
          )}
          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 text-xs font-semibold cursor-pointer transition min-h-[40px]"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Logout / Sign Out</span>
            </button>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 text-[10px] text-slate-500 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Encrypted SQLite Active</span>
            </div>
            <span className="font-mono text-slate-400">v1.0.0 Mobile-First</span>
          </div>
          <div className="text-center text-slate-400 pt-1 font-semibold border-t border-slate-800/60">
            Software by Roonjha Developers: 03152914836
          </div>
        </div>
      </div>
    </div>
  );
};
