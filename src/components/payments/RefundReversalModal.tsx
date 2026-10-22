import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  Save,
  CheckCircle,
  FileText
} from 'lucide-react';
import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { TaxService } from '../../types/service';
import { Customer } from '../../types/customer';
import { formatPKR } from '../../services/financial/ledger';
import { processRefundTransaction } from '../../services/financial/refund';

interface RefundReversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PaymentTransaction | null;
  service: TaxService | null;
  customer?: Customer | null;
  allTransactions: PaymentTransaction[];
  existingRefunds: RefundRecord[];
  onRefundSuccess: (refundRecord: RefundRecord, updatedTxn: PaymentTransaction, updatedService: TaxService) => Promise<void>;
}

export const RefundReversalModal: React.FC<RefundReversalModalProps> = ({
  isOpen,
  onClose,
  transaction,
  service,
  customer,
  allTransactions,
  existingRefunds,
  onRefundSuccess
}) => {
  if (!isOpen || !transaction || !service) return null;

  const currentNetPaid = transaction.amount - (transaction.refundedAmount || 0);

  const [refundType, setRefundType] = useState<'full_refund' | 'partial_refund' | 'reversal'>('reversal');
  const [amount, setAmount] = useState<number>(currentNetPaid);
  const [reason, setReason] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('Senior Partner (Admin)');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTypeChange = (type: 'full_refund' | 'partial_refund' | 'reversal') => {
    setRefundType(type);
    if (type === 'full_refund' || type === 'reversal') {
      setAmount(currentNetPaid);
    } else {
      setAmount(Math.round(currentNetPaid / 2));
    }
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!reason || reason.trim().length < 5) {
      setErrorMessage('Please provide a specific reason for this financial reversal (minimum 5 characters).');
      return;
    }

    if (!authorizedBy.trim()) {
      setErrorMessage('Authorized supervisor / manager name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = processRefundTransaction(
        {
          transaction,
          service,
          refundType,
          amount,
          reason,
          authorizedBy,
          notes
        },
        allTransactions,
        existingRefunds
      );

      if (!result.success || !result.refundRecord || !result.updatedTransaction || !result.updatedService) {
        setErrorMessage(result.errorMessage || 'Failed to process refund.');
        setIsSubmitting(false);
        return;
      }

      await onRefundSuccess(result.refundRecord, result.updatedTransaction, result.updatedService);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving reversal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-rose-900/60 flex items-center justify-between bg-rose-950/40">
          <div className="flex items-center gap-2 text-rose-300">
            <RotateCcw className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-base text-white">Controlled Refund & Reversal</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Target Transaction Summary Card */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-white">Receipt: {transaction.receiptNumber}</span>
              <span className="font-mono text-emerald-400 font-bold">
                Original Paid: {formatPKR(transaction.amount)}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Customer: {customer ? customer.fullName : transaction.customerId} • Service: {service.serviceType.replace(/_/g, ' ')} ({transaction.taxYear})
            </div>
            <div className="text-[11px] text-slate-400">
              Payment Method: {transaction.paymentMethod} • Date: {transaction.paymentDate.slice(0, 10)}
            </div>
            <div className="text-[11px] text-amber-400 font-semibold pt-1 border-t border-slate-800 flex justify-between">
              <span>Remaining Net Paid on Transaction:</span>
              <span className="font-mono">{formatPKR(currentNetPaid)}</span>
            </div>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Select Operation Type <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('reversal')}
                className={`py-2 px-2 rounded-lg border text-center transition cursor-pointer ${
                  refundType === 'reversal'
                    ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                Full Reversal (Error)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('full_refund')}
                className={`py-2 px-2 rounded-lg border text-center transition cursor-pointer ${
                  refundType === 'full_refund'
                    ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                Full Refund
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('partial_refund')}
                className={`py-2 px-2 rounded-lg border text-center transition cursor-pointer ${
                  refundType === 'partial_refund'
                    ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                Partial Refund
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Amount to Refund / Reverse (PKR) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={currentNetPaid}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              disabled={refundType === 'full_refund' || refundType === 'reversal'}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-rose-500 disabled:opacity-75"
              required
            />
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Mandatory Reason for Audit Trail <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Service cancelled per client request / Payment entered under incorrect client profile..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          {/* Authorized By */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Authorized User / Approver <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              placeholder="Staff Name or ID"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          {/* Error alert */}
          {errorMessage && (
            <div className="p-2.5 rounded bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Immutability Audit Warning */}
          <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              Financial Compliance: The original payment will NOT be deleted. An immutable audit record will be logged and the client's outstanding balance recalculated immediately.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-800 pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs shadow-sm cursor-pointer disabled:opacity-50 transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isSubmitting ? 'Processing...' : 'Confirm Reversal & Recalculate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
