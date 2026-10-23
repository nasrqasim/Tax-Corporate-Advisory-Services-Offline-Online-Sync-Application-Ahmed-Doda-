import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Save,
  AlertTriangle,
  Receipt,
  RotateCcw,
  User,
  Calendar
} from 'lucide-react';
import { PaymentTransaction, PaymentMethod } from '../../types/payment';
import { TaxService } from '../../types/service';
import { Customer } from '../../types/customer';
import { formatPKR } from '../../services/financial/ledger';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PaymentTransaction | null;
  service: TaxService | null;
  customer: Customer | null;
  onSaveUpdate: (
    paymentId: string,
    updates: Partial<PaymentTransaction>,
    reason: string
  ) => Promise<void>;
  onDeleteOrReverse?: (paymentId: string, reason: string) => Promise<void>;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  transaction,
  service,
  customer,
  onSaveUpdate,
  onDeleteOrReverse
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taxYear, setTaxYear] = useState(() => new Date().getFullYear().toString());
  const [transactionReference, setTransactionReference] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [editReason, setEditReason] = useState('Amount / Reference correction');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount);
      setPaymentMethod(transaction.paymentMethod);
      setPaymentDate(transaction.paymentDate ? transaction.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setTaxYear(transaction.taxYear || new Date().getFullYear().toString());
      setTransactionReference(transaction.transactionReference || '');
      setReceivedBy(transaction.receivedBy || '');
      setNotes(transaction.notes || '');
      setEditReason('Amount / Reference correction');
      setShowReverseConfirm(false);
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }
    if (!editReason.trim()) {
      alert('Please state a reason for updating this payment transaction.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveUpdate(
        transaction.id,
        {
          amount,
          paymentMethod,
          paymentDate: new Date(paymentDate).toISOString(),
          taxYear: taxYear.trim() || transaction.taxYear,
          transactionReference: transactionReference.trim() || undefined,
          receivedBy: receivedBy.trim(),
          notes: notes.trim() || undefined
        },
        editReason
      );
      onClose();
    } catch (e: any) {
      alert(`Failed to update payment: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverse = async () => {
    if (!onDeleteOrReverse) return;
    setIsSubmitting(true);
    try {
      await onDeleteOrReverse(transaction.id, editReason || 'Reversed by authorized user');
      onClose();
    } catch (e: any) {
      alert(`Failed to reverse payment: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">
              Edit Payment Record — {transaction.receiptNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Linked Customer & Service Info */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block font-sans">Customer</span>
              <span className="font-bold text-white text-xs truncate block">
                {customer?.fullName || transaction.customerId}
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                {customer?.cnic || 'CNIC: N/A'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block font-sans">Service Allocated</span>
              <span className="font-semibold text-emerald-400 truncate block">
                {service ? service.serviceType.replace(/_/g, ' ') : transaction.serviceId}
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                Tax Year: {transaction.taxYear || '2025'}
              </span>
            </div>
          </div>

          {/* Amount Received */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Payment Amount (PKR) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-semibold">Rs.</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="50"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Cash">Cash in Hand</option>
                <option value="Bank Transfer">Bank Transfer (Online/IBFT)</option>
                <option value="JazzCash">JazzCash</option>
                <option value="Easypaisa">Easypaisa</option>
                <option value="Cheque">Crossed Cheque</option>
                <option value="PayOrder">Pay Order / Demand Draft</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tax Year (Input / Preset)</label>
              <input
                type="text"
                list="edit-pay-year-list"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
              <datalist id="edit-pay-year-list">
                <option value={new Date().getFullYear().toString()} />
                <option value={(new Date().getFullYear() - 1).toString()} />
                <option value="2026" />
                <option value="2025" />
                <option value="2024" />
                <option value="N/A" />
              </datalist>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Transaction Ref / TID</label>
              <input
                type="text"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="Bank TID, Cheque #, etc."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Received By */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Received By (Staff Member)</label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="e.g. Accounts Cashier"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Reason for Edit */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Audit Reason for Modification <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="e.g. Corrected typed amount error from cash receipt"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Payment Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Reverse confirmation view */}
          {showReverseConfirm && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Confirm Safe Transaction Reversal</span>
              </div>
              <p className="text-[11px]">
                Reversing this transaction will restore the client's outstanding balance by {formatPKR(transaction.amount)}. The receipt will be marked as REVERSED in the audit trail.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReverseConfirm(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReverse}
                  className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  Confirm Reversal
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-2">
            {onDeleteOrReverse && transaction.status === 'valid' && !showReverseConfirm ? (
              <button
                type="button"
                onClick={() => setShowReverseConfirm(true)}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reverse Transaction</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm cursor-pointer disabled:opacity-50 transition"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Update & Recalculate'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
