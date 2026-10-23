import React from 'react';
import { Search, UserCheck, Briefcase, Menu, LogOut, Globe } from 'lucide-react';
import { SyncBadge } from './SyncBadge';
import { UserRole } from '../../types/settings';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenSearch: () => void;
  onOpenDrawer?: () => void;
  officeName: string;
  ntn?: string;
  currentUserEmail?: string;
  onLogout?: () => void;
  onViewLandingPage?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onOpenSearch,
  onOpenDrawer,
  officeName,
  ntn,
  currentUserEmail,
  onLogout,
  onViewLandingPage
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 px-3 sm:px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] flex items-center justify-between shadow-md">
      {/* Left: Office Branding & Mobile Menu Toggle */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="lg:hidden p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 cursor-pointer shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-inner font-bold text-sm shrink-0">
          <Briefcase className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-bold text-xs sm:text-sm md:text-base text-white tracking-tight truncate max-w-[170px] sm:max-w-xs md:max-w-md">
              {officeName}
            </h1>
            {ntn && (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-400 border border-slate-700 font-mono shrink-0">
                NTN: {ntn}
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block truncate">
            Offline-First Tax Customer & Financial Accounts System
          </p>
        </div>
      </div>

      {/* Center: Search button trigger (Desktop) */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <button
          type="button"
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
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="lg:hidden p-2 rounded-lg bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
          title="Search Customers"
          aria-label="Search Customers"
        >
          <Search className="w-4 h-4 text-emerald-400" />
        </button>

        <SyncBadge />

        {/* Role Switcher (Hidden on small mobile to avoid crowding; accessible in Drawer) */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg p-1 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-emerald-400 ml-1.5" />
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-transparent text-slate-200 text-xs py-0.5 pr-2 pl-1 rounded focus:outline-none cursor-pointer font-medium"
          >
            <option value="super_admin" className="bg-slate-900 text-slate-200">
              Super Admin (Owner)
            </option>
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

        {onViewLandingPage && (
          <button
            type="button"
            onClick={onViewLandingPage}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition cursor-pointer"
            title="View Public Website / Landing Page"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Website</span>
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 active:bg-rose-800 text-rose-300 border border-rose-800/70 text-xs transition cursor-pointer min-h-[38px]"
            title="Sign Out of Tax CRM"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
};
