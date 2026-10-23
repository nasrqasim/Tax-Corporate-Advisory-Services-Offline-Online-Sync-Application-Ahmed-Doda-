import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Search,
  FileText,
  CreditCard,
  History,
  Receipt,
  Clock,
  BarChart3,
  Cloud,
  Database,
  Settings
} from 'lucide-react';
import { UserRole } from '../../types/settings';

export type NavTab =
  | 'dashboard'
  | 'customers'
  | 'add_customer'
  | 'search'
  | 'services'
  | 'receive_payment'
  | 'payment_history'
  | 'receipts_statements'
  | 'followups'
  | 'reports'
  | 'sync'
  | 'backup'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingSyncCount: number;
  pendingFollowupCount: number;
  currentRole: UserRole;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  badge?: number;
  badgeColor?: string;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingSyncCount,
  pendingFollowupCount,
  currentRole
}) => {
  const navSections: NavSection[] = [
    {
      heading: 'CORE MODULES',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'customers', label: 'Customers CRM', icon: Users },
        { id: 'add_customer', label: 'Add Customer', icon: UserPlus },
        { id: 'search', label: 'Customer Search', icon: Search },
        { id: 'services', label: 'Tax Services', icon: FileText }
      ]
    },
    {
      heading: 'FINANCIALS & ACCOUNTS',
      items: [
        { id: 'receive_payment', label: 'Receive Payment', icon: CreditCard, highlight: true },
        { id: 'payment_history', label: 'Payment History', icon: History },
        { id: 'receipts_statements', label: 'Receipts & Statements', icon: Receipt },
        { id: 'reports', label: 'Financial Reports', icon: BarChart3 }
      ]
    },
    {
      heading: 'WORKFLOW & OPS',
      items: [
        {
          id: 'followups',
          label: 'Follow-ups & Due Dates',
          icon: Clock,
          badge: pendingFollowupCount > 0 ? pendingFollowupCount : undefined
        },
        {
          id: 'sync',
          label: 'Offline Outbox Sync',
          icon: Cloud,
          badge: pendingSyncCount > 0 ? pendingSyncCount : undefined,
          badgeColor: 'bg-blue-600'
        },
        { id: 'backup', label: 'Backup & Restore', icon: Database },
        { id: 'settings', label: 'Settings & Security', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col flex-shrink-0 text-slate-300">
      <div className="flex-1 py-4 overflow-y-auto px-3 space-y-6">
        {navSections.map((sec, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {sec.heading}
            </div>
            <div className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : item.highlight
                        ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-800/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                          item.badgeColor || 'bg-amber-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Role Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Active Role:</span>
          <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">
            {currentRole}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          Encrypted SQLite | Offline-First
        </div>
      </div>
    </aside>
  );
};
