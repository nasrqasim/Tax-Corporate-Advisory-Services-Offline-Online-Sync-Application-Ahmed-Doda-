import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, FileText, AlertCircle, Edit3 } from 'lucide-react';
import { TaxService, FilingStatus } from '../../types/service';
import { Customer } from '../../types/customer';
import { calculateFinalPayable } from '../../services/financial/ledger';
import { getSelectableTaxYears, getLocalDateString } from '../../services/utils/dateUtils';

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: TaxService | null;
  customer?: Customer | null;
  onSave: (service: TaxService) => Promise<void>;
}

export const EditServiceModal: React.FC<EditServiceModalProps> = ({
  isOpen,
  onClose,
  service,
  customer,
  onSave
}) => {
  const [taxYear, setTaxYear] = useState('');
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('in_progress');
  const [startDate, setStartDate] = useState('');
  const [filingDeadline, setFilingDeadline] = useState('');
  const [agreedFee, setAgreedFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [assignedStaff, setAssignedStaff] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectableYears = getSelectableTaxYears();

  useEffect(() => {
    if (service) {
      setTaxYear(service.taxYear || '');
      setFilingStatus(service.filingStatus);
      setStartDate(service.startDate ? service.startDate.slice(0, 10) : getLocalDateString());
      setFilingDeadline(service.filingDeadline ? service.filingDeadline.slice(0, 10) : '');
      setAgreedFee(service.agreedFee);
      setDiscount(service.discount || 0);
      setAssignedStaff(service.assignedStaff || '');
      setNotes(service.notes || '');
    }
  }, [service, isOpen]);

  if (!isOpen || !service) return null;

  const finalPayable = calculateFinalPayable(agreedFee, discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxYear.trim()) {
      alert('Please specify a valid Tax Year.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedService: TaxService = {
        ...service,
        taxYear: taxYear.trim(),
        filingStatus,
        startDate: startDate ? new Date(startDate).toISOString() : service.startDate,
        filingDeadline: filingDeadline ? new Date(filingDeadline).toISOString() : service.filingDeadline,
        agreedFee,
        discount,
        finalPayable,
        outstandingBalance: Math.max(0, finalPayable - service.amountPaid),
        assignedStaff: assignedStaff.trim() || undefined,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString()
      };

      await onSave(updatedService);
      onClose();
    } catch (err: any) {
      alert(`Error updating tax service: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Edit Tax Service</h3>
              <p className="text-[11px] text-slate-400">
                {service.id} • {customer?.fullName || service.customerId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tax Year */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Tax Year <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                list="edit-tax-year-suggestions"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                placeholder="e.g. 2026, 2025"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
              <datalist id="edit-tax-year-suggestions">
                {selectableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tax Year {yr}
                  </option>
                ))}
              </datalist>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {selectableYears.slice(0, 4).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setTaxYear(yr)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition border ${
                      taxYear === yr
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Filing Status */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Filing Status</label>
              <select
                value={filingStatus}
                onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="inquiry">Inquiry</option>
                <option value="documents_pending">Documents Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="review_required">Review Required</option>
                <option value="filed">Filed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filing Deadline */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Filing Deadline</label>
              <input
                type="date"
                value={filingDeadline}
                onChange={(e) => setFilingDeadline(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Agreed Fee */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Agreed Fee (Rs.)</label>
              <input
                type="number"
                min="0"
                value={agreedFee}
                onChange={(e) => setAgreedFee(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Discount */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Discount (Rs.)</label>
              <input
                type="number"
                min="0"
                max={agreedFee}
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Final Payable */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Net Payable</label>
              <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold">
                Rs. {finalPayable.toLocaleString()}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Assigned Consultant / Staff</label>
            <input
              type="text"
              value={assignedStaff}
              onChange={(e) => setAssignedStaff(e.target.value)}
              placeholder="e.g. Senior Consultant"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Notes & Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Case history, client instructions, CPR references..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Update Service'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
