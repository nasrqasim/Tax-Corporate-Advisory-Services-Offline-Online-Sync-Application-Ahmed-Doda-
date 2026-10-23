import React, { useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  Archive,
  X,
  CheckCircle,
  FileText,
  CreditCard,
  UserX
} from 'lucide-react';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction } from '../../types/payment';
import { formatPKR } from '../../services/financial/ledger';

interface DeleteCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  services: TaxService[];
  payments: PaymentTransaction[];
  onConfirmDelete: (customerId: string, reason: string) => Promise<void>;
  onConfirmArchive: (customerId: string, reason: string) => Promise<void>;
}

export const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  services,
  payments,
  onConfirmDelete,
  onConfirmArchive
}) => {
  const [reason, setReason] = useState('Client requested account closure');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !customer) return null;

  const linkedServices = services.filter((s) => s.customerId === customer.id);
  const linkedPayments = payments.filter((p) => p.customerId === customer.id);
  const totalPaid = linkedPayments.reduce((sum, p) => sum + (p.status === 'valid' ? p.amount : 0), 0);
  const hasFinancialRecords = linkedServices.length > 0 || linkedPayments.length > 0;

  const handleAction = async (isArchiveOnly: boolean) => {
    setIsProcessing(true);
    try {
      if (isArchiveOnly) {
        await onConfirmArchive(customer.id, reason);
      } else {
        await onConfirmDelete(customer.id, reason);
      }
      onClose();
    } catch (e: any) {
      alert(`Operation failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2 text-rose-400">
            <UserX className="w-5 h-5" />
            <h3 className="font-bold text-sm sm:text-base text-white">
              {hasFinancialRecords ? 'Archive / Deactivate Customer' : 'Delete Customer Record'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* Target Customer Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{customer.fullName}</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">
                {customer.id}
              </span>
            </div>
            <div className="text-slate-400 font-mono">CNIC: {customer.cnic}</div>
            <div className="text-slate-400 font-mono">Mobile: {customer.primaryMobile}</div>
          </div>

          {hasFinancialRecords ? (
            /* Warning: Accounting Record Protection */
            <div className="p-3.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>FBR Accounting Integrity Protection</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                This customer has <strong>{linkedServices.length} tax service(s)</strong> and <strong>{linkedPayments.length} payment transaction(s)</strong> ({formatPKR(totalPaid)} recorded).
              </p>
              <p className="text-[11px] leading-relaxed text-amber-300">
                To comply with Pakistani financial records regulations and audit standards, records with active financial transactions cannot be permanently erased.
              </p>
              <p className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800">
                <strong>Recommended Action:</strong> Safely <strong>Archive / Deactivate</strong> this customer. Their profile will be marked as inactive, but all receipts, payments, and audit ledgers will remain safely intact.
              </p>
            </div>
          ) : (
            /* Permitted Permanent Deletion */
            <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Confirm Permanent Deletion</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                This customer has no associated tax services or payment history. Permanent deletion will completely remove this profile from your local encrypted database.
              </p>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Reason for Deletion / Archival <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Client requested account closure, duplicate test entry..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer flex items-center justify-center"
          >
            Cancel
          </button>

          {hasFinancialRecords ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction(true)}
              className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-sm cursor-pointer transition disabled:opacity-50"
            >
              <Archive className="w-4 h-4" />
              <span>{isProcessing ? 'Archiving...' : 'Archive / Deactivate Customer'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction(false)}
              className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm cursor-pointer transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isProcessing ? 'Deleting...' : 'Permanently Delete'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
