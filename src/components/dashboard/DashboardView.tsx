import React, { useMemo } from 'react';
import {
  Users,
  FileCheck2,
  Clock,
  TrendingUp,
  AlertCircle,
  Receipt,
  DollarSign,
  Calendar,
  Cloud,
  ArrowUpRight,
  ShieldAlert,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { FollowUpReminder } from '../../types/settings';
import { SyncStats } from '../../types/sync';
import { formatPKR } from '../../services/financial/ledger';

interface DashboardViewProps {
  customers: Customer[];
  services: TaxService[];
  payments: PaymentTransaction[];
  refunds: RefundRecord[];
  followUps: FollowUpReminder[];
  syncStats: SyncStats;
  onNavigate: (tab: any, params?: any) => void;
  onReceivePayment: (customer?: Customer, service?: TaxService) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  services,
  payments,
  refunds,
  followUps,
  syncStats,
  onNavigate,
  onReceivePayment
}) => {
  // Compute authoritative financial KPIs strictly from database records
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = new Date().toISOString().slice(0, 7);

    // 1. Customers
    const totalCustomers = customers.length;
    const newCustomersThisMonth = customers.filter(
      (c) => c.createdAt && c.createdAt.slice(0, 7) === thisMonthStr
    ).length;

    // 2. Services
    const servicesInProgress = services.filter(
      (s) => s.filingStatus === 'in_progress' || s.filingStatus === 'documents_pending' || s.filingStatus === 'review_required'
    ).length;
    const completedServices = services.filter((s) => s.filingStatus === 'completed' || s.filingStatus === 'filed').length;

    // 3. Financial calculations
    let totalFees = 0;
    let totalDiscounts = 0;
    let totalPayable = 0;
    let totalPaidFromServices = 0;
    let totalOutstanding = 0;
    let fullyPaidServicesCount = 0;
    let partiallyPaidServicesCount = 0;
    let unpaidServicesCount = 0;

    for (const s of services) {
      if (s.filingStatus !== 'cancelled') {
        totalFees += s.agreedFee || 0;
        totalDiscounts += s.discount || 0;
        totalPayable += s.finalPayable || 0;
        totalPaidFromServices += s.amountPaid || 0;
        totalOutstanding += s.outstandingBalance || 0;

        if (s.paymentStatus === 'paid' || s.paymentStatus === 'overpaid') {
          fullyPaidServicesCount++;
        } else if (s.paymentStatus === 'partially_paid' || s.paymentStatus === 'partially_refunded') {
          partiallyPaidServicesCount++;
        } else if (s.paymentStatus === 'unpaid') {
          unpaidServicesCount++;
        }
      }
    }

    // 4. Payment ledger actual receipts
    let paymentsReceivedToday = 0;
    let paymentsReceivedThisMonth = 0;
    let totalPaymentsCollected = 0;

    for (const p of payments) {
      if (p.status === 'valid') {
        totalPaymentsCollected += p.amount;
        if (p.paymentDate.slice(0, 10) === todayStr) {
          paymentsReceivedToday += p.amount;
        }
        if (p.paymentDate.slice(0, 7) === thisMonthStr) {
          paymentsReceivedThisMonth += p.amount;
        }
      } else if (p.status === 'partially_refunded') {
        const net = Math.max(0, p.amount - (p.refundedAmount || 0));
        totalPaymentsCollected += net;
        if (p.paymentDate.slice(0, 10) === todayStr) paymentsReceivedToday += net;
        if (p.paymentDate.slice(0, 7) === thisMonthStr) paymentsReceivedThisMonth += net;
      }
    }

    // 5. Total Refunds
    const totalRefundedAmount = refunds.reduce((sum, r) => sum + r.amount, 0);

    // 6. Customers with unpaid balance
    const customersWithBalance = new Set(
      services.filter((s) => s.outstandingBalance > 0).map((s) => s.customerId)
    ).size;

    return {
      totalCustomers,
      newCustomersThisMonth,
      servicesInProgress,
      completedServices,
      totalFees,
      totalDiscounts,
      totalPayable,
      totalPaymentsCollected,
      totalOutstanding,
      fullyPaidServicesCount,
      partiallyPaidServicesCount,
      unpaidServicesCount,
      paymentsReceivedToday,
      paymentsReceivedThisMonth,
      totalRefundedAmount,
      customersWithBalance
    };
  }, [customers, services, payments, refunds]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Tax Practice Overview & Ledger</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              Live SQLite Data
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time accounts receivable, cash collections, and tax filing workflow.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onReceivePayment()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Receive Payment</span>
          </button>
          <button
            onClick={() => onNavigate('add_customer')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition cursor-pointer"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Add Customer</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span>View Reports</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding Receivables */}
        <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
            <span>Outstanding Receivables</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-300 font-mono">
            {formatPKR(stats.totalOutstanding)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Customers with balance:</span>
            <span className="font-semibold text-slate-200">{stats.customersWithBalance} clients</span>
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Net Collected Revenue</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-300 font-mono">
            {formatPKR(stats.totalPaymentsCollected)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Total agreed fees:</span>
            <span className="font-semibold text-slate-200">{formatPKR(stats.totalFees)}</span>
          </div>
        </div>

        {/* Collections Today & This Month */}
        <div className="bg-slate-900 border border-blue-900/40 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-blue-400 font-medium">
            <span>Collections (This Month)</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-300 font-mono">
            {formatPKR(stats.paymentsReceivedThisMonth)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Today's Receipts:</span>
            <span className="font-semibold text-emerald-400">{formatPKR(stats.paymentsReceivedToday)}</span>
          </div>
        </div>

        {/* Active Customers & Services */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Client Portfolio</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {stats.totalCustomers}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>New this month:</span>
            <span className="font-semibold text-emerald-400">+{stats.newCustomersThisMonth}</span>
          </div>
        </div>
      </div>

      {/* Secondary Operational Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tax Filing Operations Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>Tax Filing Status</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">{services.length} Total</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Services In Progress</span>
              <span className="font-bold text-blue-400">{stats.servicesInProgress}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Completed / Filed</span>
              <span className="font-bold text-emerald-400">{stats.completedServices}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Total Discounts Granted</span>
              <span className="font-bold text-slate-400">{formatPKR(stats.totalDiscounts)}</span>
            </div>
          </div>
        </div>

        {/* Accounts & Payment Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>Payment Breakdown</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">By Service</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Unpaid Services</span>
              <span className="font-bold text-rose-400">{stats.unpaidServicesCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Partially Paid Services</span>
              <span className="font-bold text-amber-400">{stats.partiallyPaidServicesCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Fully Paid Services</span>
              <span className="font-bold text-emerald-400">{stats.fullyPaidServicesCount}</span>
            </div>
          </div>
        </div>

        {/* Offline Engine & Sync Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span>Offline Sync Status</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono">Encrypted SQLite</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Network State</span>
              <span className={`font-bold ${syncStats.isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                {syncStats.isOnline ? 'Online' : 'Offline Mode'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Pending Cloud Outbox</span>
              <span className="font-bold text-blue-400">{syncStats.pendingCount} ops</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Refunds & Reversals Audit</span>
              <span className="font-bold text-rose-400">{formatPKR(stats.totalRefundedAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Payments & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payment Transactions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Recent Payments</span>
            </h3>
            <button
              onClick={() => onNavigate('payment_history')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {payments.slice(0, 5).map((txn) => {
              const cust = customers.find((c) => c.id === txn.customerId);
              return (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-800 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">
                        {cust ? cust.fullName : txn.customerId}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 font-mono">
                        {txn.receiptNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {txn.paymentMethod} • {txn.paymentDate.slice(0, 10)} • Ref: {txn.transactionReference || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs text-emerald-400 font-mono">
                      {formatPKR(txn.amount)}
                    </div>
                    <span className="text-[10px] text-slate-400">by {txn.receivedBy}</span>
                  </div>
                </div>
              );
            })}
            {payments.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">
                No payment transactions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Due Dates & Follow-ups */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Upcoming Tax Deadlines & Follow-ups</span>
            </h3>
            <button
              onClick={() => onNavigate('followups')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {followUps.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-800 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-slate-200">
                      {item.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        item.priority === 'urgent'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : item.priority === 'high'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Client: {item.customerName} {item.taxYear ? `(${item.taxYear})` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded">
                    Due: {item.dueDate}
                  </span>
                </div>
              </div>
            ))}
            {followUps.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">
                No active follow-ups due.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
