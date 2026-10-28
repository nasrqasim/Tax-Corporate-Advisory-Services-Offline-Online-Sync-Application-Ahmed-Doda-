import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  CreditCard,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  FileText,
  Users,
  Search
} from 'lucide-react';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { BusinessProfile } from '../../types/settings';
import { calculateCustomerFinancials, calculateServiceFinancials, formatPKR } from '../../services/financial/ledger';
import { resolveTaxYear, getLocalDateString } from '../../services/utils/dateUtils';

interface FinancialReportsViewProps {
  customers: Customer[];
  services: TaxService[];
  payments: PaymentTransaction[];
  refunds: RefundRecord[];
  businessProfile: BusinessProfile;
  onSelectCustomer: (customer: Customer) => void;
}

type ReportType =
  | 'outstanding_balances'
  | 'unpaid_services'
  | 'partially_paid_services'
  | 'fully_paid_services'
  | 'payments_by_date'
  | 'payments_by_method'
  | 'fees_by_tax_year'
  | 'daily_monthly_collections'
  | 'refunds_reversals';

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  customers,
  services,
  payments,
  refunds,
  businessProfile,
  onSelectCustomer
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>('outstanding_balances');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTaxYear, setSelectedTaxYear] = useState('all');

  // 1. Customer Outstanding Balances
  const outstandingReport = useMemo(() => {
    return customers
      .map((c) => ({
        customer: c,
        financials: calculateCustomerFinancials(c.id, services, payments, refunds)
      }))
      .filter((item) => item.financials.totalOutstanding > 0)
      .sort((a, b) => b.financials.totalOutstanding - a.financials.totalOutstanding);
  }, [customers, services, payments, refunds]);

  // 2, 3, 4. Services by Payment Status
  const servicesReport = useMemo(() => {
    return services.map((s) => {
      const cust = customers.find((c) => c.id === s.customerId);
      const fin = calculateServiceFinancials(s, payments, refunds);
      return { service: s, customer: cust, fin };
    });
  }, [services, customers, payments, refunds]);

  const unpaidServices = servicesReport.filter((r) => r.fin.paymentStatus === 'unpaid');
  const partiallyPaidServices = servicesReport.filter(
    (r) => r.fin.paymentStatus === 'partially_paid' || r.fin.paymentStatus === 'partially_refunded'
  );
  const fullyPaidServices = servicesReport.filter(
    (r) => r.fin.paymentStatus === 'paid' || r.fin.paymentStatus === 'overpaid'
  );

  // 5. Payments by Date Range
  const paymentsByDate = useMemo(() => {
    return payments
      .filter((p) => {
        if (startDate && p.paymentDate.slice(0, 10) < startDate) return false;
        if (endDate && p.paymentDate.slice(0, 10) > endDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [payments, startDate, endDate]);

  // 6. Payments by Payment Method
  const paymentsByMethod = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const p of payments) {
      if (!map[p.paymentMethod]) {
        map[p.paymentMethod] = { count: 0, total: 0 };
      }
      if (p.status === 'valid') {
        map[p.paymentMethod].count++;
        map[p.paymentMethod].total += p.amount;
      } else if (p.status === 'partially_refunded') {
        map[p.paymentMethod].count++;
        map[p.paymentMethod].total += Math.max(0, p.amount - (p.refundedAmount || 0));
      }
    }
    return Object.entries(map).map(([method, data]) => ({ method, ...data }));
  }, [payments]);

  // 7. Fees by Tax Year
  const feesByTaxYear = useMemo(() => {
    const map: Record<string, { servicesCount: number; fees: number; discounts: number; payable: number; paid: number; outstanding: number }> = {};
    for (const s of services) {
      if (s.filingStatus === 'cancelled') continue;
      const yr = resolveTaxYear(s.taxYear, s.startDate || s.createdAt, s.id);
      if (!map[yr]) {
        map[yr] = { servicesCount: 0, fees: 0, discounts: 0, payable: 0, paid: 0, outstanding: 0 };
      }
      const fin = calculateServiceFinancials(s, payments, refunds);
      map[yr].servicesCount++;
      map[yr].fees += fin.agreedFee;
      map[yr].discounts += fin.discount;
      map[yr].payable += fin.finalPayable;
      map[yr].paid += fin.netPaymentsApplied;
      map[yr].outstanding += fin.outstandingBalance;
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [services, payments, refunds]);

  // 8. Daily & Monthly Collections
  const collectionsSummary = useMemo(() => {
    const todayStr = getLocalDateString();
    const thisMonthStr = todayStr.slice(0, 7);

    let todayTotal = 0;
    let thisMonthTotal = 0;
    let grandTotal = 0;

    for (const p of payments) {
      const net = p.status === 'valid'
        ? p.amount
        : p.status === 'partially_refunded'
        ? Math.max(0, p.amount - (p.refundedAmount || 0))
        : 0;

      grandTotal += net;
      if (p.paymentDate.slice(0, 10) === todayStr) todayTotal += net;
      if (p.paymentDate.slice(0, 7) === thisMonthStr) thisMonthTotal += net;
    }

    return { todayTotal, thisMonthTotal, grandTotal };
  }, [payments]);

  return (
    <div className="space-y-4">
      {/* Print Only Business Header */}
      <div className="hidden print-only mb-6 border-b-2 border-slate-900 pb-4 text-black">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">{businessProfile.officeName}</h1>
            <p className="text-xs text-slate-700">{businessProfile.address}, {businessProfile.city}</p>
            <div className="text-[11px] text-slate-700 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span>Phone: {businessProfile.primaryPhone}</span>
              <span>Email: {businessProfile.email || 'ahmeddodataxcrm@gmail.com'}</span>
              {businessProfile.ntn && <span className="font-mono font-bold">NTN: {businessProfile.ntn}</span>}
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold uppercase tracking-wider block">Official Financial Report</span>
            <span className="text-slate-600 block">Generated: {new Date().toLocaleDateString('en-PK')}</span>
          </div>
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 no-print">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Financial & Accounting Reports</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              Authoritative SQL Ledger
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time receivables, collection logs, tax-year summaries, and audit records.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* Report Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs no-print">
        <button
          onClick={() => setActiveReport('outstanding_balances')}
          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
            activeReport === 'outstanding_balances'
              ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-bold shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>1. Outstanding Balances</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{outstandingReport.length} Clients</div>
        </button>

        <button
          onClick={() => setActiveReport('unpaid_services')}
          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
            activeReport === 'unpaid_services'
              ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-bold shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>2. Unpaid Services</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{unpaidServices.length} Services</div>
        </button>

        <button
          onClick={() => setActiveReport('partially_paid_services')}
          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
            activeReport === 'partially_paid_services'
              ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-bold shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span>3. Partially Paid</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{partiallyPaidServices.length} Services</div>
        </button>

        <button
          onClick={() => setActiveReport('fully_paid_services')}
          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
            activeReport === 'fully_paid_services'
              ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-bold shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>4. Fully Paid Services</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{fullyPaidServices.length} Services</div>
        </button>

        <button
          onClick={() => setActiveReport('payments_by_date')}
          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
            activeReport === 'payments_by_date'
              ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-bold shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>5. Collections by Date</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{paymentsByDate.length} Transactions</div>
        </button>

        <button
          onClick={() => setActiveReport('payments_by_method')}
          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
            activeReport === 'payments_by_method'
              ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-bold shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span>6. By Payment Method</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cash / Bank / JazzCash</div>
        </button>

        <button
          onClick={() => setActiveReport('fees_by_tax_year')}
          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
            activeReport === 'fees_by_tax_year'
              ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-bold shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>7. Fees by Tax Year</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{feesByTaxYear.length} Years</div>
        </button>

        <button
          onClick={() => setActiveReport('daily_monthly_collections')}
          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
            activeReport === 'daily_monthly_collections'
              ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-bold shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>8. Daily/Monthly Summary</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Revenue Trends</div>
        </button>

        <button
          onClick={() => setActiveReport('refunds_reversals')}
          className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
            activeReport === 'refunds_reversals'
              ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-bold shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>9. Refunds & Reversals</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{refunds.length} Records</div>
        </button>
      </div>

      {/* Date Filter Bar for Date-based Reports */}
      {activeReport === 'payments_by_date' && (
        <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">Date Range Filter:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
          />
        </div>
      )}

      {/* REPORT CONTENT CANVAS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm overflow-hidden printable-area">
        {/* REPORT 1: Customer Outstanding Balances */}
        {activeReport === 'outstanding_balances' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">Customer Outstanding Receivables Report</h3>
                <p className="text-xs text-slate-400">
                  Total Clients with Outstanding Balances: {outstandingReport.length}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Total Outstanding:</span>
                <div className="text-base font-bold text-amber-400 font-mono">
                  {formatPKR(
                    outstandingReport.reduce((sum, item) => sum + item.financials.totalOutstanding, 0)
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">CNIC & Phone</th>
                    <th className="py-2.5 px-3 text-right">Total Payable</th>
                    <th className="py-2.5 px-3 text-right">Total Paid</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                    <th className="py-2.5 px-3 text-center">Unpaid Services</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {outstandingReport.map(({ customer, financials }) => (
                    <tr key={customer.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => onSelectCustomer(customer)}
                          className="font-semibold text-white hover:text-emerald-400 text-left cursor-pointer"
                        >
                          {customer.fullName}
                        </button>
                        <div className="text-[10px] text-slate-500 font-mono">{customer.id}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {customer.cnic}
                        <div className="text-[10px] text-slate-500">{customer.primaryMobile}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatPKR(financials.totalPayable)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                        {formatPKR(financials.totalPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        {formatPKR(financials.totalOutstanding)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
                          {financials.unpaidServicesCount + financials.partiallyPaidServicesCount} Services
                        </span>
                      </td>
                    </tr>
                  ))}
                  {outstandingReport.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Great news! There are zero outstanding receivables across all customer accounts.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 2, 3, 4: Services Status Reports */}
        {(activeReport === 'unpaid_services' ||
          activeReport === 'partially_paid_services' ||
          activeReport === 'fully_paid_services') && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white capitalize border-b border-slate-800 pb-3">
              {activeReport.replace(/_/g, ' ')} Breakdown
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Service & Year</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Final Payable</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3 text-center">Filing Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(activeReport === 'unpaid_services'
                    ? unpaidServices
                    : activeReport === 'partially_paid_services'
                    ? partiallyPaidServices
                    : fullyPaidServices
                  ).map(({ service, customer, fin }) => (
                    <tr key={service.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">
                          {service.serviceType.replace(/_/g, ' ')}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Year: {service.taxYear}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {customer ? (
                          <button
                            onClick={() => onSelectCustomer(customer)}
                            className="font-semibold text-white hover:text-emerald-400 text-left cursor-pointer"
                          >
                            {customer.fullName}
                          </button>
                        ) : (
                          <span className="font-mono text-slate-400">{service.customerId}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatPKR(fin.finalPayable)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                        {formatPKR(fin.netPaymentsApplied)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        {formatPKR(fin.outstandingBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 uppercase">
                          {service.filingStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 5: Collections by Date */}
        {activeReport === 'payments_by_date' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Collections Log by Date Range</h3>
              <div className="text-right">
                <span className="text-xs text-slate-400">Period Total:</span>
                <span className="font-mono font-bold text-emerald-400 text-base ml-2">
                  {formatPKR(paymentsByDate.reduce((sum, p) => sum + p.amount, 0))}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Received By</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paymentsByDate.map((p) => {
                    const cust = customers.find((c) => c.id === p.customerId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {p.paymentDate.slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                          {p.receiptNumber}
                        </td>
                        <td className="py-2.5 px-3 text-white font-medium">
                          {cust ? cust.fullName : p.customerId}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                          {formatPKR(p.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{p.paymentMethod}</td>
                        <td className="py-2.5 px-3 text-slate-400">{p.receivedBy}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-slate-800 text-slate-300">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 6: Payments by Payment Method */}
        {activeReport === 'payments_by_method' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-3">
              Collections by Payment Method
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentsByMethod.map((item) => (
                <div key={item.method} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase">{item.method}</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-2">
                    {formatPKR(item.total)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{item.count} Transactions</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORT 7: Fees by Tax Year */}
        {activeReport === 'fees_by_tax_year' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-3">
              Service Fees & Receivables by Tax Year
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Tax Year</th>
                    <th className="py-2.5 px-3 text-center">Services</th>
                    <th className="py-2.5 px-3 text-right">Total Fees</th>
                    <th className="py-2.5 px-3 text-right">Discounts</th>
                    <th className="py-2.5 px-3 text-right">Net Payable</th>
                    <th className="py-2.5 px-3 text-right">Total Paid</th>
                    <th className="py-2.5 px-3 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {feesByTaxYear.map(([year, data]) => (
                    <tr key={year} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{year}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {data.servicesCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatPKR(data.fees)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {formatPKR(data.discounts)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                        {formatPKR(data.payable)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                        {formatPKR(data.paid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        {formatPKR(data.outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 8: Daily/Monthly Summary */}
        {activeReport === 'daily_monthly_collections' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-3">
              Daily & Monthly Collections Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Collections Today</span>
                <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">
                  {formatPKR(collectionsSummary.todayTotal)}
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Collections This Month</span>
                <div className="text-2xl font-bold text-blue-400 font-mono mt-2">
                  {formatPKR(collectionsSummary.thisMonthTotal)}
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">All-Time Net Collections</span>
                <div className="text-2xl font-bold text-white font-mono mt-2">
                  {formatPKR(collectionsSummary.grandTotal)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT 9: Refunds and Reversals Audit */}
        {activeReport === 'refunds_reversals' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Refunds and Reversals Audit Trail</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {refunds.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{r.processedAt.slice(0, 16)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{r.receiptNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-rose-950 text-rose-400 border border-rose-800">
                          {r.refundType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                        -{formatPKR(r.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 italic">"{r.reason}"</td>
                      <td className="py-2.5 px-3 text-slate-400">{r.authorizedBy}</td>
                    </tr>
                  ))}
                  {refunds.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Zero refunds or payment reversals recorded. Ledger integrity is clean.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Footer & Developer Credit */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-slate-400 print:text-slate-800 print:border-slate-300 space-y-1">
          <div className="font-semibold text-slate-300 print:text-black">
            {businessProfile.developerCredit || 'Software by Roonjha Developers: 03152914836'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {businessProfile.officeName} • NTN: {businessProfile.ntn} • {businessProfile.address}, {businessProfile.city}
          </div>
        </div>
      </div>
    </div>
  );
};
