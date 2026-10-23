import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Save,
  AlertTriangle,
  Receipt,
  CheckCircle,
  HelpCircle,
  DollarSign
} from 'lucide-react';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction, PaymentMethod } from '../../types/payment';
import { BusinessProfile } from '../../types/settings';
import { calculateServiceFinancials, formatPKR } from '../../services/financial/ledger';

interface ReceivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment: (
    paymentData: Omit<PaymentTransaction, 'id' | 'receiptNumber' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus'>
  ) => Promise<PaymentTransaction>;
  customers: Customer[];
  services: TaxService[];
  businessProfile: BusinessProfile;
  initialCustomer?: Customer | null;
  initialService?: TaxService | null;
  onPaymentSuccess?: (txn: PaymentTransaction, service: TaxService, customer: Customer) => void;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  isOpen,
  onClose,
  onRecordPayment,
  customers,
  services,
  businessProfile,
  initialCustomer,
  initialService,
  onPaymentSuccess
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taxYear, setTaxYear] = useState(() => new Date().getFullYear().toString());
  const [transactionReference, setTransactionReference] = useState('');
  const [receivedBy, setReceivedBy] = useState('Senior Partner');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overpaymentWarning, setOverpaymentWarning] = useState('');

  // Set initial customer & service
  useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomerId(initialCustomer.id);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [initialCustomer, customers, isOpen]);

  // Filter services belonging to the selected customer
  const availableServices = services.filter((s) => s.customerId === selectedCustomerId && s.filingStatus !== 'cancelled');

  useEffect(() => {
    if (initialService && initialService.customerId === selectedCustomerId) {
      setSelectedServiceId(initialService.id);
    } else if (availableServices.length > 0) {
      // Find first service with outstanding balance, or first service
      const withBal = availableServices.find((s) => s.outstandingBalance > 0);
      setSelectedServiceId(withBal ? withBal.id : availableServices[0].id);
    } else {
      setSelectedServiceId('');
    }
  }, [selectedCustomerId, initialService, availableServices.length]);

  // Current selected service financial summary
  const currentService = availableServices.find((s) => s.id === selectedServiceId);
  const currentOutstanding = currentService ? currentService.outstandingBalance : 0;

  // Auto-fill amount with outstanding balance when service changes
  useEffect(() => {
    if (currentService) {
      setAmount(currentService.outstandingBalance);
      if (currentService.taxYear) setTaxYear(currentService.taxYear);
    }
  }, [currentService?.id, currentService?.outstandingBalance]);

  // Validate overpayment
  useEffect(() => {
    if (currentService && amount > currentService.outstandingBalance) {
      if (!businessProfile.allowOverpayments) {
        setOverpaymentWarning(
          `Amount (Rs. ${amount}) exceeds outstanding balance (Rs. ${currentService.outstandingBalance}). Overpayments are disabled in business settings.`
        );
      } else {
        setOverpaymentWarning(
          `Note: Amount exceeds outstanding balance. Customer account will be credited with surplus Rs. ${amount - currentService.outstandingBalance}.`
        );
      }
    } else {
      setOverpaymentWarning('');
    }
  }, [amount, currentService, businessProfile.allowOverpayments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer.');
      return;
    }
    if (!selectedServiceId || !currentService) {
      alert('Please select the tax service to allocate this payment to.');
      return;
    }
    if (amount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    if (!businessProfile.allowOverpayments && amount > currentService.outstandingBalance) {
      alert(`Overpayment not allowed. Outstanding balance is Rs. ${currentService.outstandingBalance}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `idemp-pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const paymentData = {
        customerId: selectedCustomerId,
        serviceId: currentService.id,
        taxYear: taxYear.trim() || currentService.taxYear || new Date().getFullYear().toString(),
        amount: Math.round(amount),
        paymentMethod,
        paymentDate: `${paymentDate}T${new Date().toTimeString().slice(0, 8)}.000Z`,
        transactionReference: transactionReference.trim() || undefined,
        receivedBy: receivedBy.trim(),
        notes: notes.trim() || undefined,
        status: 'valid' as const,
        refundedAmount: 0,
        idempotencyKey
      };

      const recordedTxn = await onRecordPayment(paymentData);

      const customerObj = customers.find((c) => c.id === selectedCustomerId);
      if (customerObj && onPaymentSuccess) {
        onPaymentSuccess(recordedTxn, currentService, customerObj);
      }

      onClose();
    } catch (err: any) {
      alert(`Failed to record payment: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">Receive Customer Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Customer Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Select Customer <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.cnic}) — ID: {c.id}
                </option>
              ))}
            </select>
          </div>

          {/* Service Allocation */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Allocated Tax Service & Year <span className="text-rose-400">*</span>
            </label>
            {availableServices.length > 0 ? (
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {availableServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.serviceType.replace(/_/g, ' ').toUpperCase()} ({s.taxYear}) — Balance:{' '}
                    {formatPKR(s.outstandingBalance)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 rounded bg-slate-800/80 text-amber-400 border border-amber-900/40">
                This customer has no active tax services. Please add a service first.
              </div>
            )}
          </div>

          {/* Current Outstanding Balance Display */}
          {currentService && (
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">Current Service Outstanding</span>
                <span className="font-bold text-base text-amber-400 font-mono">
                  {formatPKR(currentOutstanding)}
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <div>Agreed: {formatPKR(currentService.agreedFee)}</div>
                <div>Paid so far: {formatPKR(currentService.amountPaid)}</div>
              </div>
            </div>
          )}

          {/* Amount Received & Overpayment Warning */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Amount Received (PKR) <span className="text-rose-400">*</span>
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

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {currentOutstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(currentOutstanding)}
                    className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[10px] font-mono cursor-pointer transition"
                  >
                    Full: {formatPKR(currentOutstanding)}
                  </button>
                )}
                {[1000, 2000, 3000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-mono cursor-pointer transition"
                  >
                    Rs. {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer text-xs sm:text-sm"
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

          {/* Overpayment Alert */}
          {overpaymentWarning && (
            <div className="p-2.5 rounded bg-amber-950/70 border border-amber-800 text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{overpaymentWarning}</span>
            </div>
          )}

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tax Year (Input / Preset)</label>
              <input
                type="text"
                list="receive-pay-year-list"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                placeholder="e.g. 2026, 2025"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                required
              />
              <datalist id="receive-pay-year-list">
                <option value={new Date().getFullYear().toString()} />
                <option value={(new Date().getFullYear() - 1).toString()} />
                <option value="2026" />
                <option value="2025" />
                <option value="2024" />
                <option value="N/A" />
              </datalist>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Transaction Reference / TID (Optional)
              </label>
              <input
                type="text"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="e.g. Bank Ref, Cheque #, JazzCash TID"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Received By Staff */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Received By (Staff Member) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="e.g. Accounts Cashier / Partner Name"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Payment Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Payment Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. First installment, advance against NTN filing..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Durability Notice */}
          <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Durable Local Persistence: Encrypted SQLite & Outbox Queue</span>
            </span>
            <span className="text-slate-500 font-mono">REC-AUTO</span>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-800 pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer transition flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (amount > currentOutstanding && !businessProfile.allowOverpayments)}
              className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm cursor-pointer disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Save & Receipt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
