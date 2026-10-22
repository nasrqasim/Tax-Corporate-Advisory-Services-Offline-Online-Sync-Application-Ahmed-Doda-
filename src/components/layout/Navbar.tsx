import React from 'react';
import { ShieldCheck, Search, Bell, UserCheck, Briefcase } from 'lucide-react';
import { SyncBadge } from './SyncBadge';
import { UserRole } from '../../types/settings';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenSearch: () => void;
  officeName: string;
  ntn?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onOpenSearch,
  officeName,
  ntn
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 py-2.5 flex items-center justify-between shadow-md">
      {/* Left: Office Branding */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-inner font-bold text-lg">
          <Briefcase className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm sm:text-base text-white tracking-tight line-clamp-1">
              {officeName}
            </h1>
            {ntn && (
              <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                NTN: {ntn}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Offline-First Tax Customer & Financial Accounts System
          </p>
        </div>
      </div>

      {/* Center: Search button trigger */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-400 text-xs transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-500" />
            <span>Search Customer by Name, Mobile, or CNIC...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-[10px] text-slate-300 font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Sync Status & Role Selector */}
      <div className="flex items-center gap-3">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenSearch}
          className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          title="Search Customers"
        >
          <Search className="w-4 h-4" />
        </button>

        <SyncBadge />

        {/* Role Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg p-1 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-emerald-400 ml-1.5" />
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-transparent text-slate-200 text-xs py-0.5 pr-2 pl-1 rounded focus:outline-none cursor-pointer font-medium"
          >
            <option value="admin" className="bg-slate-900 text-slate-200">
              Admin (Full Control)
            </option>
            <option value="consultant" className="bg-slate-900 text-slate-200">
              Tax Consultant
            </option>
            <option value="accountant" className="bg-slate-900 text-slate-200">
              Accountant / Cashier
            </option>
          </select>
        </div>
      </div>
    </header>
  );
};
