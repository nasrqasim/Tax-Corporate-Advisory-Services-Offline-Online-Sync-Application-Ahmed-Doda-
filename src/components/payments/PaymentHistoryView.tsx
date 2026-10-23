import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Receipt,
  MessageSquare,
  Edit,
  Trash2,
  RotateCcw,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  ArrowDownCircle
} from 'lucide-react';
import { PaymentTransaction, RefundRecord, PaymentMethod, TransactionStatus } from '../../types/payment';
import { TaxService } from '../../types/service';
import { Customer } from '../../types/customer';
import { formatPKR } from '../../services/financial/ledger';
import { BusinessProfile } from '../../types/settings';
import { sharePaymentOnWhatsApp } from '../../services/native/whatsappShare';

interface PaymentHistoryViewProps {
  payments: PaymentTransaction[];
  refunds: RefundRecord[];
  services: TaxService[];
  customers: Customer[];
  businessProfile: BusinessProfile;
  onPrintReceipt: (payment: PaymentTransaction, service: TaxService) => void;
  onRefundReversal: (payment: PaymentTransaction, service: TaxService) => void;
  onEditPayment?: (payment: PaymentTransaction) => void;
  onSelectCustomer: (customer: Customer) => void;
  filterCustomerId?: string;
  filterServiceId?: string;
}

export const PaymentHistoryView: React.FC<PaymentHistoryViewProps> = ({
  payments,
  refunds,
  services,
  customers,
  onPrintReceipt,
  businessProfile,
  onRefundReversal,
  onEditPayment,
  onSelectCustomer,
  filterCustomerId,
  filterServiceId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter payments
  const filteredPayments = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return payments.filter((p) => {
      // 1. Customer scope
      if (filterCustomerId && p.customerId !== filterCustomerId) return false;

      // 2. Service scope
      if (filterServiceId && p.serviceId !== filterServiceId) return false;

      // 3. Payment Method
      if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false;

      // 4. Status
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // 5. Tax Year
      if (yearFilter !== 'all' && p.taxYear !== yearFilter) return false;

      // 6. Date Range
      if (startDate && p.paymentDate.slice(0, 10) < startDate) return false;
      if (endDate && p.paymentDate.slice(0, 10) > endDate) return false;

      // 7. Search text: receipt number or transaction reference or customer name
      if (!cleanSearch) return true;

      const cust = customers.find((c) => c.id === p.customerId);
      const custName = cust ? cust.fullName.toLowerCase() : '';

      return (
        p.receiptNumber.toLowerCase().includes(cleanSearch) ||
        (p.transactionReference || '').toLowerCase().includes(cleanSearch) ||
        p.id.toLowerCase().includes(cleanSearch) ||
        custName.includes(cleanSearch)
      );
    });
  }, [payments, customers, filterCustomerId, filterServiceId, methodFilter, statusFilter, yearFilter, startDate, endDate, searchTerm]);

  // Aggregate totals for the filtered set
  const totals = useMemo(() => {
    let totalValid = 0;
    let totalRefunded = 0;
    for (const p of filteredPayments) {
      if (p.status === 'valid') totalValid += p.amount;
      else if (p.status === 'partially_refunded') {
        const net = Math.max(0, p.amount - (p.refundedAmount || 0));
        totalValid += net;
        totalRefunded += p.refundedAmount || 0;
      } else {
        totalRefunded += p.amount;
      }
    }
    return { totalValid, totalRefunded };
  }, [filteredPayments]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <span>Customer Payment Ledger & Receipts</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {filteredPayments.length} Transactions
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Immutable financial history, receipt numbers, payment allocations, and audit trail.
          </p>
        </div>

        {/* Aggregated Quick Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-900/60">
            <span className="text-emerald-400 text-[10px] block">Net Collections</span>
            <span className="font-bold text-emerald-300 font-mono text-sm">
              {formatPKR(totals.totalValid)}
            </span>
          </div>
          {totals.totalRefunded > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-900/60">
              <span className="text-rose-400 text-[10px] block">Refunded / Reversed</span>
              <span className="font-bold text-rose-300 font-mono text-sm">
                {formatPKR(totals.totalRefunded)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search receipt, ref, customer..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none cursor-pointer text-xs"
          >
            <option value="all">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="JazzCash">JazzCash</option>
            <option value="Easypaisa">Easypaisa</option>
            <option value="Cheque">Cheque</option>
            <option value="PayOrder">Pay Order</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none cursor-pointer text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="valid">Valid Confirmed</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="refunded">Fully Refunded</option>
            <option value="reversed">Reversed</option>
          </select>

          {/* Tax Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none cursor-pointer text-xs"
          >
            <option value="all">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="N/A">N/A</option>
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none text-[11px]"
            title="Start Date"
          />

          {/* End Date */}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none text-[11px]"
            title="End Date"
          />
        </div>
      </div>

      {/* Mobile Card List (< lg screens) */}
      <div className="lg:hidden space-y-3">
        {filteredPayments.map((p) => {
          const cust = customers.find((c) => c.id === p.customerId);
          const srv = services.find((s) => s.id === p.serviceId);

          return (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white font-mono">Receipt:</span>
                    <span className="text-xs font-bold font-mono text-emerald-400">{p.receiptNumber}</span>
                  </div>
                  {cust && (
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(cust)}
                      className="text-xs font-semibold text-slate-200 hover:text-emerald-400 text-left mt-0.5 truncate block"
                    >
                      {cust.fullName}
                    </button>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono">
                    {p.paymentDate.slice(0, 10)} {p.paymentDate.slice(11, 16)}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono text-emerald-300">
                    {formatPKR(p.amount)}
                  </div>
                  <span
                    className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                      p.status === 'valid'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : p.status === 'partially_refunded'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>

              {/* Service & Method Details */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Allocated Service</span>
                  <span className="text-slate-200 truncate block">
                    {srv ? srv.serviceType.replace(/_/g, ' ') : p.serviceId} ({p.taxYear})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Method / By</span>
                  <span className="text-slate-200 truncate block">
                    {p.paymentMethod} • {p.receivedBy}
                  </span>
                </div>
              </div>

              {/* Touch Actions */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                {srv && cust && (
                  <button
                    type="button"
                    onClick={() => sharePaymentOnWhatsApp({
                      payment: p,
                      service: srv,
                      customer: cust,
                      businessProfile
                    })}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 active:bg-emerald-800 text-emerald-300 border border-emerald-800 text-xs flex items-center justify-center gap-1 cursor-pointer transition"
                    title="Share Receipt on WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>
                )}
                {onEditPayment && (
                  <button
                    type="button"
                    onClick={() => onEditPayment(p)}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 text-xs flex items-center justify-center gap-1 cursor-pointer transition"
                    title="Edit Payment"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-400" />
                    <span>Edit</span>
                  </button>
                )}
                {srv && (
                  <button
                    type="button"
                    onClick={() => onPrintReceipt(p, srv)}
                    className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Receipt</span>
                  </button>
                )}
                {p.status === 'valid' && srv && (
                  <button
                    type="button"
                    onClick={() => onRefundReversal(p, srv)}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 text-xs flex items-center justify-center gap-1 cursor-pointer transition"
                    title="Refund / Reversal"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                    <span>Refund</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredPayments.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            No payment transactions matching your criteria.
          </div>
        )}
      </div>

      {/* Desktop Transactions Table (hidden on mobile, visible on lg screens) */}
      <div className="hidden lg:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Receipt Number</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Service & Year</th>
                <th className="py-3 px-3 text-right">Amount Received</th>
                <th className="py-3 px-3">Method & Ref</th>
                <th className="py-3 px-3">Received By</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.map((p) => {
                const cust = customers.find((c) => c.id === p.customerId);
                const srv = services.find((s) => s.id === p.serviceId);

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {p.paymentDate.slice(0, 10)}
                      <div className="text-[10px] text-slate-500">{p.paymentDate.slice(11, 16)}</div>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {p.receiptNumber}
                      <div className="text-[10px] text-slate-500 font-mono">{p.id}</div>
                    </td>

                    <td className="py-3 px-3">
                      {cust ? (
                        <div>
                          <button
                            onClick={() => onSelectCustomer(cust)}
                            className="font-semibold text-white hover:text-emerald-400 text-left cursor-pointer transition"
                          >
                            {cust.fullName}
                          </button>
                          <div className="text-[10px] text-slate-400 font-mono">{cust.cnic}</div>
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400">{p.customerId}</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-slate-200">
                        {srv ? srv.serviceType.replace(/_/g, ' ') : p.serviceId}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Tax Year: {p.taxYear}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-300">
                      {formatPKR(p.amount)}
                      {p.status === 'partially_refunded' && (
                        <div className="text-[10px] text-rose-400">
                          Ref: -{formatPKR(p.refundedAmount || 0)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-slate-200">{p.paymentMethod}</span>
                      {p.transactionReference && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Ref: {p.transactionReference}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-300">{p.receivedBy}</td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          p.status === 'valid'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : p.status === 'partially_refunded'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    {/* Actions: WhatsApp, Edit, Receipt & Reversal */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {srv && cust && (
                          <button
                            onClick={() => sharePaymentOnWhatsApp({
                              payment: p,
                              service: srv,
                              customer: cust,
                              businessProfile
                            })}
                            className="p-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 cursor-pointer transition"
                            title="Share Receipt on WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-400" />
                          </button>
                        )}
                        {onEditPayment && (
                          <button
                            onClick={() => onEditPayment(p)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition"
                            title="Edit Payment Details"
                          >
                            <Edit className="w-3 h-3 text-blue-400" />
                          </button>
                        )}
                        {srv && (
                          <button
                            onClick={() => onPrintReceipt(p, srv)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                            title="Print / View Receipt"
                          >
                            <Receipt className="w-3 h-3 text-emerald-400" />
                            <span>Receipt</span>
                          </button>
                        )}
                        {p.status === 'valid' && srv && (
                          <button
                            onClick={() => onRefundReversal(p, srv)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer transition"
                            title="Controlled Refund / Reversal"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No payment transactions matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
