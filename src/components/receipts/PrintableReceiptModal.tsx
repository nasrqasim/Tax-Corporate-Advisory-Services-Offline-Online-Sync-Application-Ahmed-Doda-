import React from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  CheckCircle,
  Briefcase,
  MessageSquare
} from 'lucide-react';
import { PaymentTransaction } from '../../types/payment';
import { TaxService } from '../../types/service';
import { Customer } from '../../types/customer';
import { BusinessProfile } from '../../types/settings';
import { formatPKR } from '../../services/financial/ledger';
import { DEVELOPER_CREDIT, sharePaymentOnWhatsApp } from '../../services/native/whatsappShare';

interface PrintableReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PaymentTransaction | null;
  service: TaxService | null;
  customer: Customer | null;
  businessProfile: BusinessProfile;
  previousBalance?: number;
  remainingBalance?: number;
}

export const PrintableReceiptModal: React.FC<PrintableReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  service,
  customer,
  businessProfile,
  previousBalance,
  remainingBalance
}) => {
  if (!isOpen || !transaction || !service || !customer) return null;

  const handlePrint = () => {
    window.print();
  };

  const prevBal = previousBalance !== undefined
    ? previousBalance
    : (service.outstandingBalance + transaction.amount);
  const remBal = remainingBalance !== undefined
    ? remainingBalance
    : Math.max(0, prevBal - transaction.amount);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[95vh]">
        {/* Header Controls (Hidden on Print) */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 no-print gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-bold text-xs sm:text-sm text-white truncate">Official Receipt</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-400 font-mono shrink-0">
              {transaction.receiptNumber}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => sharePaymentOnWhatsApp({
                payment: transaction,
                service,
                customer,
                businessProfile,
                previousBalance: prevBal,
                remainingBalance: remBal
              })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-sm min-h-[38px]"
              title="Share receipt via WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shadow-sm min-h-[38px]"
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

        {/* PRINTABLE RECEIPT CANVAS */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-white text-slate-900 printable-area selection:bg-emerald-200">
          {/* Business Header */}
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
                <span>Email: {businessProfile.email || 'ahmeddodataxcrm@gmail.com'}</span>
                {businessProfile.ntn && (
                  <span className="font-semibold text-slate-900 font-mono">
                    NTN: {businessProfile.ntn}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right sm:self-center bg-slate-100 p-3 rounded-lg border border-slate-200">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Official Payment Receipt
              </span>
              <span className="block text-base font-bold text-emerald-800 font-mono">
                {transaction.receiptNumber}
              </span>
              <span className="block text-xs text-slate-600 mt-0.5">
                Date: {transaction.paymentDate.slice(0, 10)}
              </span>
            </div>
          </div>

          {/* Customer & Service Information */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Customer Details
              </span>
              <div className="font-bold text-sm text-slate-900">{customer.fullName}</div>
              {customer.fatherName && (
                <div className="text-slate-700">S/O {customer.fatherName}</div>
              )}
              <div className="font-mono text-slate-700 mt-0.5">CNIC: {customer.cnic}</div>
              <div className="font-mono text-slate-700">Mobile: {customer.primaryMobile}</div>
              <div className="text-slate-600 mt-0.5">Cust ID: {customer.id}</div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Tax Service Allocated
              </span>
              <div className="font-bold text-sm text-slate-900">
                {service.serviceType === 'income_tax_return'
                  ? 'Income Tax Return Filing'
                  : service.serviceType === 'ntn_registration'
                  ? 'NTN Registration'
                  : service.customServiceName || service.serviceType.replace(/_/g, ' ').toUpperCase()}
              </div>
              <div className="font-mono text-emerald-800 font-semibold mt-0.5">
                Tax Year: {service.taxYear}
              </div>
              <div className="text-slate-600 text-[11px] mt-0.5">Service ID: {service.id}</div>
              <div className="text-slate-600 text-[11px]">
                Filing Status: <span className="font-semibold uppercase">{service.filingStatus}</span>
              </div>
            </div>
          </div>

          {/* Payment Breakdown Table */}
          <div className="py-4">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="py-2 px-3 text-left">Description</th>
                  <th className="py-2 px-3 text-left">Payment Mode & Ref</th>
                  <th className="py-2 px-3 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">
                      Payment for {service.serviceType.replace(/_/g, ' ')} ({service.taxYear})
                    </div>
                    {transaction.notes && (
                      <div className="text-[11px] text-slate-500 mt-0.5 italic">
                        "{transaction.notes}"
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800">{transaction.paymentMethod}</span>
                    {transaction.transactionReference && (
                      <div className="text-[11px] text-slate-600 font-mono">
                        Ref: {transaction.transactionReference}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800 text-sm">
                    {formatPKR(transaction.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Account Balance Ledger Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 my-2 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Previous Outstanding Balance:</span>
              <span className="font-mono font-semibold">{formatPKR(prevBal)}</span>
            </div>
            <div className="flex justify-between text-emerald-800 font-bold">
              <span>Amount Received (This Receipt):</span>
              <span className="font-mono">-{formatPKR(transaction.amount)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
              <span>Remaining Outstanding Balance:</span>
              <span className="font-mono text-amber-700">{formatPKR(remBal)}</span>
            </div>
          </div>

          {/* Received By and Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-slate-600">
            <div>
              <span className="block text-[11px]">Received By:</span>
              <span className="block font-bold text-slate-900 mt-0.5">{transaction.receivedBy}</span>
              <div className="w-40 border-b border-slate-300 mt-8"></div>
              <span className="block text-[10px] text-slate-400 mt-1">Authorized Cashier / Consultant</span>
            </div>

            <div className="text-right">
              <span className="block text-[11px]">Client Signature / Stamp:</span>
              <div className="w-40 border-b border-slate-300 mt-10 ml-auto"></div>
              <span className="block text-[10px] text-slate-400 mt-1">Acknowledged by Client</span>
            </div>
          </div>

          {/* Footer Note & Developer Credit */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-1">
            <div>
              {businessProfile.receiptFooterNote} • System Generated Receipt • Stored Locally & Synced
            </div>
            <div className="font-semibold text-slate-700 tracking-wide pt-1">
              {businessProfile.developerCredit || DEVELOPER_CREDIT}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
