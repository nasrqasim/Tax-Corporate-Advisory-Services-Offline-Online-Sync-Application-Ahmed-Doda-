import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Calendar,
  Receipt,
  Briefcase,
  User,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { BusinessProfile } from '../../types/settings';
import { generateCustomerStatement } from '../../services/financial/receipt';
import { formatPKR } from '../../services/financial/ledger';

interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  services: TaxService[];
  payments: PaymentTransaction[];
  refunds: RefundRecord[];
  businessProfile: BusinessProfile;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  onClose,
  customer,
  services,
  payments,
  refunds,
  businessProfile
}) => {
  if (!isOpen || !customer) return null;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const statement = useMemo(() => {
    return generateCustomerStatement(
      customer,
      services,
      payments,
      refunds,
      startDate && endDate ? { startDate, endDate } : undefined
    );
  }, [customer, services, payments, refunds, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[95vh]">
        {/* Controls Header (Hidden on Print) */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between bg-slate-950/70 no-print gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-white">Account Statement</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-400 font-mono">
              {customer.id}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                title="Filter From Date"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                title="Filter To Date"
              />
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-sm min-h-[38px]"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CANVAS */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-white text-slate-900 printable-area selection:bg-emerald-200">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-base">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {businessProfile.officeName}
                </h1>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-md">
                {businessProfile.address}, {businessProfile.city}
              </p>
              <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span>Phone: {businessProfile.primaryPhone}</span>
                <span>Email: {businessProfile.email || 'arsalantaxcrm@gmail.com'}</span>
                {businessProfile.ntn && (
                  <span className="font-semibold text-slate-900 font-mono">
                    NTN: {businessProfile.ntn}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right sm:self-center bg-slate-100 p-3 rounded-lg border border-slate-200">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Customer Account Statement
              </span>
              <span className="block text-xs font-semibold text-slate-700 mt-0.5">
                Period: {statement.startDate.slice(0, 10)} to {statement.endDate.slice(0, 10)}
              </span>
              <span className="block text-[10px] text-slate-500">
                Generated: {new Date().toLocaleDateString('en-PK')}
              </span>
            </div>
          </div>

          {/* Customer Metadata */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Statement Issued To
              </span>
              <div className="font-bold text-sm text-slate-900">{customer.fullName}</div>
              {customer.fatherName && <div className="text-slate-700">S/O {customer.fatherName}</div>}
              <div className="font-mono text-slate-700 mt-0.5">CNIC: {customer.cnic}</div>
              <div className="text-slate-600">ID: {customer.id}</div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Account Summary
              </span>
              <div className="text-slate-700">Total Billed Charges: <span className="font-bold text-slate-900 font-mono">{formatPKR(statement.totalDebits)}</span></div>
              <div className="text-slate-700">Total Payments Applied: <span className="font-bold text-emerald-800 font-mono">{formatPKR(statement.totalCredits)}</span></div>
              <div className="text-base font-bold text-amber-800 font-mono mt-1 pt-1 border-t border-slate-200">
                Net Outstanding: {formatPKR(statement.closingBalance)}
              </div>
            </div>
          </div>

          {/* Itemized Transactions Table */}
          <div className="py-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3 text-left">Date</th>
                  <th className="py-2.5 px-3 text-left">Ref / Receipt #</th>
                  <th className="py-2.5 px-3 text-left">Transaction Details</th>
                  <th className="py-2.5 px-3 text-center">Year</th>
                  <th className="py-2.5 px-3 text-right">Debit (Fee)</th>
                  <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {statement.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-600">{item.date.slice(0, 10)}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{item.referenceId}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-900">{item.description}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">{item.taxYear}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {item.debit > 0 ? formatPKR(item.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-800">
                      {item.credit > 0 ? formatPKR(item.credit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatPKR(item.runningBalance)}
                    </td>
                  </tr>
                ))}
                {statement.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No financial transactions recorded for this customer account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Statement Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-1">
            <div>
              This customer account statement is an authoritative financial record generated by {businessProfile.officeName}.
            </div>
            <div className="font-semibold text-slate-700 tracking-wide pt-1">
              {businessProfile.developerCredit || 'Software by Roonjha Developers: 03152914836'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
