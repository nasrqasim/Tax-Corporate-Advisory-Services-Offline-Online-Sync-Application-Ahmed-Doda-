import React from 'react';
import {
  LayoutDashboard,
  Users,
  Search,
  CreditCard,
  Menu
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenSearch: () => void;
  onOpenMore: () => void;
  onQuickPay: () => void;
  pendingAlertsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSearch,
  onOpenMore,
  onQuickPay,
  pendingAlertsCount = 0
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-lg border-t border-slate-800 shadow-2xl pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid grid-cols-5 h-16 items-center px-1 max-w-lg mx-auto">
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className="w-5 h-5" />
            {activeTab === 'dashboard' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Dashboard</span>
        </button>

        {/* 2. Customers */}
        <button
          type="button"
          onClick={() => onTabChange('customers')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition cursor-pointer ${
            activeTab === 'customers'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            {activeTab === 'customers' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Customers</span>
        </button>

        {/* 3. Receive Payment (Primary Center Action) */}
        <button
          type="button"
          onClick={onQuickPay}
          className="flex flex-col items-center justify-center h-full min-h-[44px] py-1 group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/80 -mt-5 border-2 border-slate-900 group-active:scale-95 transition">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-1 font-semibold text-emerald-400 tracking-tight">
            Receive Pay
          </span>
        </button>

        {/* 4. Search */}
        <button
          type="button"
          onClick={() => {
            onTabChange('search');
            onOpenSearch();
          }}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition cursor-pointer ${
            activeTab === 'search'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Search className="w-5 h-5" />
            {activeTab === 'search' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Search</span>
        </button>

        {/* 5. More Menu Drawer */}
        <button
          type="button"
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center h-full min-h-[44px] py-1 text-slate-400 hover:text-slate-200 transition cursor-pointer relative"
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {pendingAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
