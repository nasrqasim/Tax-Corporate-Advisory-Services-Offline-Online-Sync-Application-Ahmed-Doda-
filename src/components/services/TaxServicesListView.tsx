import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  Filter,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { TaxService, ServiceType, FilingStatus } from '../../types/service';
import { Customer } from '../../types/customer';
import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { calculateServiceFinancials, formatPKR } from '../../services/financial/ledger';

interface TaxServicesListViewProps {
  services: TaxService[];
  customers: Customer[];
  payments: PaymentTransaction[];
  refunds: RefundRecord[];
  onSelectCustomer: (customer: Customer) => void;
  onAddService: (customer?: Customer) => void;
  onReceivePayment: (customer: Customer, service: TaxService) => void;
}

export const TaxServicesListView: React.FC<TaxServicesListViewProps> = ({
  services,
  customers,
  payments,
  refunds,
  onSelectCustomer,
  onAddService,
  onReceivePayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [filingStatusFilter, setFilingStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');

  // Filtered services
  const filteredServices = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return services.filter((srv) => {
      const cust = customers.find((c) => c.id === srv.customerId);
      const custName = cust ? cust.fullName.toLowerCase() : '';
      const cnic = cust ? cust.cnic.replace(/\D/g, '') : '';

      // 1. Year filter
      if (yearFilter !== 'all' && srv.taxYear !== yearFilter) return false;

      // 2. Type filter
      if (typeFilter !== 'all' && srv.serviceType !== typeFilter) return false;

      // 3. Filing status
      if (filingStatusFilter !== 'all' && srv.filingStatus !== filingStatusFilter) return false;

      // 4. Payment status
      const fin = calculateServiceFinancials(srv, payments, refunds);
      if (paymentStatusFilter !== 'all' && fin.paymentStatus !== paymentStatusFilter) return false;

      // 5. Search query
      if (!cleanSearch) return true;

      return (
        srv.id.toLowerCase().includes(cleanSearch) ||
        srv.serviceType.toLowerCase().includes(cleanSearch) ||
        (srv.customServiceName || '').toLowerCase().includes(cleanSearch) ||
        custName.includes(cleanSearch) ||
        cnic.includes(cleanSearch.replace(/\D/g, ''))
      );
    });
  }, [services, customers, payments, refunds, yearFilter, typeFilter, filingStatusFilter, paymentStatusFilter, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Tax Services & Filing Ledger</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {filteredServices.length} Records
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Multi-year tax returns, NTN registrations, and filing workflows.
          </p>
        </div>

        <button
          onClick={() => onAddService()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Tax Service</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search service, customer name, CNIC, ID..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none cursor-pointer text-xs"
          >
            <option value="all">All Tax Years</option>
            <option value="2026">Tax Year 2026</option>
            <option value="2025">Tax Year 2025</option>
            <option value="2024">Tax Year 2024</option>
            <option value="2023">Tax Year 2023</option>
            <option value="N/A">N/A (NTN / Other)</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none cursor-pointer text-xs"
          >
            <option value="all">All Types</option>
            <option value="income_tax_return">Income Tax Return</option>
            <option value="ntn_registration">NTN Registration</option>
            <option value="ntn_modification">NTN Modification</option>
            <option value="sales_tax_filing">Sales Tax Filing</option>
            <option value="tax_consultation">Tax Consultation</option>
          </select>

          {/* Filing Status */}
          <select
            value={filingStatusFilter}
            onChange={(e) => setFilingStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none cursor-pointer text-xs"
          >
            <option value="all">All Filing Statuses</option>
            <option value="inquiry">Inquiry</option>
            <option value="documents_pending">Docs Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="review_required">Review</option>
            <option value="filed">Filed</option>
            <option value="completed">Completed</option>
          </select>

          {/* Payment Status */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none cursor-pointer text-xs"
          >
            <option value="all">All Payment Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overpaid">Overpaid</option>
          </select>
        </div>
      </div>

      {/* Mobile Services Card List (< lg screens) */}
      <div className="lg:hidden space-y-3">
        {filteredServices.map((srv) => {
          const cust = customers.find((c) => c.id === srv.customerId);
          const fin = calculateServiceFinancials(srv, payments, refunds);
          const isSettled = fin.outstandingBalance <= 0;

          return (
            <div
              key={srv.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-xs sm:text-sm truncate">
                    {srv.serviceType === 'income_tax_return'
                      ? 'Income Tax Return'
                      : srv.serviceType === 'ntn_registration'
                      ? 'NTN Registration'
                      : srv.customServiceName || srv.serviceType.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Tax Year: <span className="text-emerald-400 font-bold">{srv.taxYear}</span> • ID: {srv.id}
                  </div>
                  {cust && (
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(cust)}
                      className="text-xs font-semibold text-slate-200 hover:text-emerald-400 text-left mt-1 truncate block"
                    >
                      {cust.fullName} <span className="text-[10px] text-slate-400 font-mono font-normal">({cust.cnic})</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                      srv.filingStatus === 'completed' || srv.filingStatus === 'filed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : srv.filingStatus === 'in_progress'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {srv.filingStatus.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                      isSettled
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : fin.paymentStatus === 'partially_paid'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {fin.paymentStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Financial Figures */}
              <div className="grid grid-cols-3 gap-1.5 text-center text-xs bg-slate-950/80 p-2 rounded-lg border border-slate-800 font-mono">
                <div>
                  <div className="text-[9px] text-slate-400 font-sans">Payable Fee</div>
                  <div className="text-slate-200 mt-0.5">{formatPKR(fin.finalPayable)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-sans">Paid</div>
                  <div className="text-emerald-400 font-semibold mt-0.5">{formatPKR(fin.netPaymentsApplied)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-sans">Balance</div>
                  <div className={`font-bold mt-0.5 ${fin.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {formatPKR(fin.outstandingBalance)}
                  </div>
                </div>
              </div>

              {/* Touch Actions */}
              <div className="flex items-center gap-2 pt-1">
                {fin.outstandingBalance > 0 && cust && (
                  <button
                    type="button"
                    onClick={() => onReceivePayment(cust, srv)}
                    className="flex-1 min-h-[40px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Receive Payment</span>
                  </button>
                )}
                {cust && (
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(cust)}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    <span>View Customer</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            No tax services matching your criteria.
          </div>
        )}
      </div>

      {/* Desktop Services Table (hidden on mobile, visible on lg screens) */}
      <div className="hidden lg:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                <th className="py-3 px-3">Service & Year</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Assigned Staff</th>
                <th className="py-3 px-3 text-right">Payable Fee</th>
                <th className="py-3 px-3 text-right">Amount Paid</th>
                <th className="py-3 px-3 text-right">Outstanding</th>
                <th className="py-3 px-3 text-center">Filing Status</th>
                <th className="py-3 px-3 text-center">Payment Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredServices.map((srv) => {
                const cust = customers.find((c) => c.id === srv.customerId);
                const fin = calculateServiceFinancials(srv, payments, refunds);
                const isSettled = fin.outstandingBalance <= 0;

                return (
                  <tr key={srv.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">
                        {srv.serviceType === 'income_tax_return'
                          ? 'Income Tax Return'
                          : srv.serviceType === 'ntn_registration'
                          ? 'NTN Registration'
                          : srv.customServiceName || srv.serviceType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono">
                        Tax Year: {srv.taxYear} • <span className="text-slate-400">{srv.id}</span>
                      </div>
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
                        <span className="font-mono text-slate-400">{srv.customerId}</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-300">
                      {srv.assignedStaff || 'Unassigned'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-200">
                      {formatPKR(fin.finalPayable)}
                      {fin.discount > 0 && (
                        <div className="text-[10px] text-slate-400">Disc: {formatPKR(fin.discount)}</div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                      {formatPKR(fin.netPaymentsApplied)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span className={fin.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-400'}>
                        {formatPKR(fin.outstandingBalance)}
                      </span>
                    </td>

                    {/* Filing Status */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          srv.filingStatus === 'completed' || srv.filingStatus === 'filed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : srv.filingStatus === 'in_progress'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {srv.filingStatus.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          isSettled
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : fin.paymentStatus === 'partially_paid'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {fin.paymentStatus.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {fin.outstandingBalance > 0 && cust && (
                          <button
                            onClick={() => onReceivePayment(cust, srv)}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                            title="Receive Payment"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        )}
                        {cust && (
                          <button
                            onClick={() => onSelectCustomer(cust)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition"
                            title="View Customer Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No tax services matching the filter parameters.
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
