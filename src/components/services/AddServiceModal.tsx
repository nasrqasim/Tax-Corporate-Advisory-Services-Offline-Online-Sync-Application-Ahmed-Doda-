import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { TaxService, ServiceType, FilingStatus, RequiredDocumentItem } from '../../types/service';
import { Customer } from '../../types/customer';
import { calculateFinalPayable, formatPKR } from '../../services/financial/ledger';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: TaxService) => Promise<void>;
  customers: Customer[];
  preSelectedCustomer?: Customer | null;
}

const DEFAULT_CHECKLISTS: Record<ServiceType, string[]> = {
  income_tax_return: [
    'Annual Salary Certificate / Payslips',
    'Bank Account Statements (July to June)',
    'Wealth Statement / Asset & Liability Details',
    'Vehicle Token Tax Receipts / Challans',
    'Property Purchase / Sale Deeds',
    'Withholding Tax Certificates (Mobile, Electricity)'
  ],
  ntn_registration: [
    'CNIC Front & Back Scans',
    'Electricity Utility Bill of Business Premises',
    'Tenancy Agreement / Ownership Proof',
    'Business Letterhead'
  ],
  ntn_modification: [
    'CNIC Scans',
    'Supporting Document for Modification (Address/Name change)'
  ],
  sales_tax_registration: [
    'Biometric Verification Slip',
    'Bank Maintenance Certificate with IBAN',
    'Business Premises Lease / Utility Bill',
    'GPS Tagged Photos of Business Premises'
  ],
  sales_tax_filing: [
    'Monthly Sales Invoices & Credit Notes',
    'Monthly Purchase Invoices with CPRs'
  ],
  tax_consultation: [
    'Inquiry Brief / Notice Copy'
  ],
  withholding_statement: [
    'Quarterly / Monthly Withholding Challans'
  ],
  custom: [
    'Supporting Tax Documents'
  ]
};

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  preSelectedCustomer
}) => {
  const [customerId, setCustomerId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('income_tax_return');
  const [customServiceName, setCustomServiceName] = useState('');
  const [taxYear, setTaxYear] = useState(() => new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filingDeadline, setFilingDeadline] = useState(() => new Date().toISOString().slice(0, 10));
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('in_progress');
  const [assignedStaff, setAssignedStaff] = useState('Senior Consultant');
  const [agreedFee, setAgreedFee] = useState<number>(5000);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<RequiredDocumentItem[]>([]);
  const [newChecklistDoc, setNewChecklistDoc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preSelectedCustomer) {
      setCustomerId(preSelectedCustomer.id);
    } else if (customers.length > 0) {
      setCustomerId(customers[0].id);
    }
  }, [preSelectedCustomer, customers, isOpen]);

  // Update checklist template on service type change
  useEffect(() => {
    const defaultItems = DEFAULT_CHECKLISTS[serviceType] || DEFAULT_CHECKLISTS.custom;
    setChecklist(
      defaultItems.map((name, idx) => ({
        id: `chk-${Date.now()}-${idx}`,
        name,
        isRequired: true,
        isReceived: false
      }))
    );

    // Adjust default tax year for NTN
    if (serviceType === 'ntn_registration' || serviceType === 'ntn_modification') {
      setTaxYear('N/A');
    } else if (taxYear === 'N/A') {
      setTaxYear(new Date().getFullYear().toString());
    }
  }, [serviceType]);

  if (!isOpen) return null;

  const finalPayable = calculateFinalPayable(agreedFee, discount);

  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isReceived: !item.isReceived } : item
      )
    );
  };

  const handleAddChecklistDoc = () => {
    if (!newChecklistDoc.trim()) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `chk-${Date.now()}-${prev.length}`,
        name: newChecklistDoc.trim(),
        isRequired: true,
        isReceived: false
      }
    ]);
    setNewChecklistDoc('');
  };

  const handleRemoveChecklistDoc = (id: string) => {
    setChecklist((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      alert('Please select a customer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const generatedId = `SRV-${taxYear === 'N/A' ? '2026' : taxYear}-${Date.now().toString().slice(-4)}`;

      const newService: TaxService = {
        id: generatedId,
        customerId,
        serviceType,
        customServiceName: serviceType === 'custom' ? customServiceName : undefined,
        taxYear,
        startDate: startDate ? `${startDate}T${now.slice(11)}` : now,
        filingDeadline: filingDeadline || undefined,
        filingStatus,
        checklist,
        assignedStaff,
        agreedFee: Math.max(0, agreedFee),
        discount: Math.max(0, discount),
        finalPayable,
        amountPaid: 0,
        outstandingBalance: finalPayable,
        paymentStatus: finalPayable === 0 ? 'paid' : 'unpaid',
        notes: notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'saved_locally',
        version: 1
      };

      await onSave(newService);
      onClose();
    } catch (err: any) {
      alert(`Error saving tax service: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">Create New Tax Service</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Customer Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Select Customer <span className="text-rose-400">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={Boolean(preSelectedCustomer)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-75"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.cnic}) — ID: {c.id}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Service Type */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Service Type</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="income_tax_return">Income Tax Return Filing</option>
                <option value="ntn_registration">NTN Registration</option>
                <option value="ntn_modification">NTN Modification</option>
                <option value="sales_tax_registration">Sales Tax Registration</option>
                <option value="sales_tax_filing">Sales Tax Monthly Filing</option>
                <option value="tax_consultation">Tax Consultation / Advisory</option>
                <option value="withholding_statement">Withholding Tax Statement</option>
                <option value="custom">Other Configurable Service</option>
              </select>
            </div>

            {/* Custom name if custom */}
            {serviceType === 'custom' && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Custom Service Name</label>
                <input
                  type="text"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  placeholder="e.g. FBR Audit Notice Reply"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            )}

            {/* Service Start Date */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Service Start Date (Default: Today)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Tax Year (User input with presets, defaults to today's year) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Tax Year (Default: Today's Year, or Type Any Year) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                list="tax-year-suggestions"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                placeholder="e.g. 2026, 2025, 2024..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
              <datalist id="tax-year-suggestions">
                <option value={new Date().getFullYear().toString()}>Current Year ({new Date().getFullYear()})</option>
                <option value={(new Date().getFullYear() - 1).toString()}>Previous Year ({new Date().getFullYear() - 1})</option>
                <option value={(new Date().getFullYear() + 1).toString()}>Next Year ({new Date().getFullYear() + 1})</option>
                <option value="2026">Tax Year 2026</option>
                <option value="2025">Tax Year 2025</option>
                <option value="2024">Tax Year 2024</option>
                <option value="2023">Tax Year 2023</option>
                <option value="N/A">N/A (Non-Annual / Registration)</option>
              </datalist>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {[
                  new Date().getFullYear().toString(),
                  (new Date().getFullYear() - 1).toString(),
                  '2026',
                  '2025',
                  '2024',
                  'N/A'
                ].filter((v, i, a) => a.indexOf(v) === i).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setTaxYear(yr)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition border ${
                      taxYear === yr
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-700 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Filing Status */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Initial Filing Status</label>
              <select
                value={filingStatus}
                onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="inquiry">Inquiry / Consultation</option>
                <option value="documents_pending">Documents Pending</option>
                <option value="in_progress">In Progress / Preparing</option>
                <option value="review_required">Review Required</option>
                <option value="filed">Filed / Submitted</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Filing Deadline */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Filing Deadline (Optional)</label>
              <input
                type="date"
                value={filingDeadline}
                onChange={(e) => setFilingDeadline(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* FINANCIAL SECTION: Agreed Fee & Discount */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Agreed Fees & Pricing (Pakistani Rupees)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Agreed Service Fee (Rs.)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="100"
                  value={agreedFee}
                  onChange={(e) => setAgreedFee(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Discount Amount (Rs.)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="100"
                  value={discount}
                  onChange={(e) => setDiscount(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Final Payable Fee</label>
                <div className="w-full bg-slate-900 border border-emerald-900/60 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold text-sm">
                  {formatPKR(finalPayable)}
                </div>
              </div>
            </div>
          </div>

          {/* DOCUMENT CHECKLIST */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <label className="block text-slate-300 font-semibold">Required Documents Checklist</label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded bg-slate-800/60 border border-slate-800"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.isReceived}
                      onChange={() => handleToggleChecklist(item.id)}
                      className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span className={item.isReceived ? 'text-emerald-400 line-through' : 'text-slate-200'}>
                      {item.name}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistDoc(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add custom checklist item */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newChecklistDoc}
                onChange={(e) => setNewChecklistDoc(e.target.value)}
                placeholder="Add other required document..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddChecklistDoc}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer"
              >
                Add Item
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Service Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="FBR CPR details, specific instructions, or filing observations..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
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
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm cursor-pointer disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Tax Service'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
