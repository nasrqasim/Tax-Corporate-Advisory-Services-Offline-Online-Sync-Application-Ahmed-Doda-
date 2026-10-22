import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Users,
  AlertTriangle,
  Upload,
  CheckCircle,
  Phone,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { Customer } from '../../types/customer';
import { validateCnic, formatCnic } from '../../services/validation/cnic';
import { validatePakistaniPhone, formatLocalPhone } from '../../services/validation/phone';
import { checkForDuplicateCustomer, DuplicateMatch } from '../../services/validation/duplicate';

interface AddEditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => Promise<void>;
  existingCustomers: Customer[];
  customerToEdit?: Customer | null;
}

export const AddEditCustomerModal: React.FC<AddEditCustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingCustomers,
  customerToEdit
}) => {
  const isEditing = Boolean(customerToEdit);

  const [formData, setFormData] = useState<Partial<Customer>>({
    fullName: '',
    fatherName: '',
    cnic: '',
    primaryMobile: '',
    secondaryMobile: '',
    whatsappNumber: '',
    address: '',
    email: '',
    ntnNumber: '',
    status: 'active',
    notes: '',
    cnicFrontImage: '',
    cnicBackImage: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({ ...customerToEdit });
    } else {
      setFormData({
        fullName: '',
        fatherName: '',
        cnic: '',
        primaryMobile: '',
        secondaryMobile: '',
        whatsappNumber: '',
        address: '',
        email: '',
        ntnNumber: '',
        status: 'active',
        notes: '',
        cnicFrontImage: '',
        cnicBackImage: ''
      });
    }
    setErrors({});
    setDuplicateMatches([]);
    setShowDuplicateWarning(false);
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  // Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.fullName?.trim()) {
      errs.fullName = 'Full Name is required.';
    }

    // CNIC Validation
    const cnicVal = validateCnic(formData.cnic || '');
    if (!cnicVal.isValid) {
      errs.cnic = cnicVal.errorMessage || 'Valid 13-digit Pakistani CNIC is required.';
    }

    // Primary Mobile Validation
    const phoneVal = validatePakistaniPhone(formData.primaryMobile || '');
    if (!phoneVal.isValid) {
      errs.primaryMobile = phoneVal.errorMessage || 'Valid Pakistani mobile number (03XX...) is required.';
    }

    // Secondary mobile (if provided)
    if (formData.secondaryMobile && formData.secondaryMobile.trim()) {
      const secVal = validatePakistaniPhone(formData.secondaryMobile);
      if (!secVal.isValid) {
        errs.secondaryMobile = secVal.errorMessage || 'Invalid secondary mobile number.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCnicChange = (val: string) => {
    const formatted = formatCnic(val);
    setFormData((prev) => ({ ...prev, cnic: formatted }));
  };

  const handlePrimaryMobileChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      primaryMobile: val,
      // Default WhatsApp to primary mobile if not already customized
      whatsappNumber: prev.whatsappNumber ? prev.whatsappNumber : val
    }));
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'cnicFrontImage' | 'cnicBackImage'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData((prev) => ({ ...prev, [side]: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (bypassDuplicateCheck = false) => {
    if (!validateForm()) return;

    // Check for duplicates
    if (!bypassDuplicateCheck) {
      const dupCheck = checkForDuplicateCustomer(existingCustomers, {
        id: customerToEdit?.id,
        fullName: formData.fullName || '',
        fatherName: formData.fatherName,
        cnic: formData.cnic || '',
        primaryMobile: formData.primaryMobile || '',
        secondaryMobile: formData.secondaryMobile,
        whatsappNumber: formData.whatsappNumber
      });

      if (dupCheck.hasDuplicate) {
        setDuplicateMatches(dupCheck.matches);
        setShowDuplicateWarning(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const customerRecord: Customer = {
        id: customerToEdit?.id || '',
        fullName: formData.fullName!.trim(),
        fatherName: formData.fatherName?.trim() || '',
        cnic: formData.cnic!.trim(),
        primaryMobile: formData.primaryMobile!.trim(),
        secondaryMobile: formData.secondaryMobile?.trim() || undefined,
        whatsappNumber: (formData.whatsappNumber || formData.primaryMobile)!.trim(),
        address: formData.address?.trim() || '',
        email: formData.email?.trim() || undefined,
        ntnNumber: formData.ntnNumber?.trim() || undefined,
        status: (formData.status as any) || 'active',
        notes: formData.notes?.trim() || undefined,
        cnicFrontImage: formData.cnicFrontImage,
        cnicBackImage: formData.cnicBackImage,
        createdAt: customerToEdit?.createdAt || now,
        updatedAt: now,
        syncStatus: 'saved_locally',
        version: customerToEdit ? (customerToEdit.version || 1) + 1 : 1
      };

      await onSave(customerRecord);
      onClose();
    } catch (e: any) {
      alert(`Error saving customer: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">
              {isEditing ? `Edit Customer: ${customerToEdit?.fullName}` : 'Add New Tax Customer'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Duplicate Warning Alert Modal View */}
        {showDuplicateWarning && (
          <div className="bg-amber-950/70 border-b border-amber-800 p-4 text-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Duplicate Record Warning</span>
            </div>
            <p className="text-amber-200">
              One or more matching customers were found in your local database:
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-2">
              {duplicateMatches.map((m, idx) => (
                <div key={idx} className="p-2 rounded bg-amber-900/40 border border-amber-800/80 text-amber-100">
                  <div className="font-semibold">{m.matchedCustomer.fullName} ({m.matchedCustomer.id})</div>
                  <div className="text-[11px] text-amber-300">{m.description}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDuplicateWarning(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Go Back & Review
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateWarning(false);
                  handleSubmit(true);
                }}
                className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs cursor-pointer shadow-sm"
              >
                Proceed Anyway (Separate Record)
              </button>
            </div>
          </div>
        )}

        {/* Modal Body Form */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Ahmed Ali Khan"
                className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-white focus:outline-none ${
                  errors.fullName ? 'border-rose-500' : 'border-slate-700 focus:border-emerald-500'
                }`}
              />
              {errors.fullName && <p className="text-rose-400 text-[11px] mt-1">{errors.fullName}</p>}
            </div>

            {/* Father's Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Father's Name</label>
              <input
                type="text"
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                placeholder="e.g. Muhammad Tariq Khan"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* CNIC Number */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                CNIC Number (13 Digits) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.cnic}
                onChange={(e) => handleCnicChange(e.target.value)}
                maxLength={15}
                placeholder="35202-1234567-1"
                className={`w-full bg-slate-800 border font-mono rounded-lg px-3 py-2 text-white focus:outline-none ${
                  errors.cnic ? 'border-rose-500' : 'border-slate-700 focus:border-emerald-500'
                }`}
              />
              {errors.cnic && <p className="text-rose-400 text-[11px] mt-1">{errors.cnic}</p>}
            </div>

            {/* NTN Number */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                National Tax Number (NTN)
              </label>
              <input
                type="text"
                value={formData.ntnNumber}
                onChange={(e) => setFormData({ ...formData, ntnNumber: e.target.value })}
                placeholder="e.g. 7392814-2"
                className="w-full bg-slate-800 border border-slate-700 font-mono rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Primary Mobile */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Primary Mobile Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.primaryMobile}
                onChange={(e) => handlePrimaryMobileChange(e.target.value)}
                placeholder="03001234567"
                className={`w-full bg-slate-800 border font-mono rounded-lg px-3 py-2 text-white focus:outline-none ${
                  errors.primaryMobile ? 'border-rose-500' : 'border-slate-700 focus:border-emerald-500'
                }`}
              />
              {errors.primaryMobile && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.primaryMobile}</p>
              )}
            </div>

            {/* Secondary Mobile */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Secondary Mobile (Optional)
              </label>
              <input
                type="text"
                value={formData.secondaryMobile}
                onChange={(e) => setFormData({ ...formData, secondaryMobile: e.target.value })}
                placeholder="03219876543"
                className="w-full bg-slate-800 border border-slate-700 font-mono rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="03001234567"
                className="w-full bg-slate-800 border border-slate-700 font-mono rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Optional Email */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="customer@example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Full Address */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Full Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="House/Plot #, Street, Sector/Area, City"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Status & Customer Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Customer Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="active">Active Client</option>
                <option value="inactive">Inactive Client</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Customer Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="FBR Iris password info, business details, etc."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* CNIC Front & Back Image Upload */}
          <div className="border-t border-slate-800 pt-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>CNIC Document Scans (Stored Offline / Encrypted)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Front Scan */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-center">
                <span className="block text-[11px] font-semibold text-slate-300 mb-2">
                  CNIC Front Scan
                </span>
                {formData.cnicFrontImage ? (
                  <div className="relative group inline-block">
                    <img
                      src={formData.cnicFrontImage}
                      alt="CNIC Front"
                      className="h-24 rounded border border-slate-700 object-contain mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, cnicFrontImage: '' }))}
                      className="mt-1 text-[10px] text-rose-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 rounded hover:border-emerald-500 transition">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[11px] text-slate-400">Upload Front Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'cnicFrontImage')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Back Scan */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-center">
                <span className="block text-[11px] font-semibold text-slate-300 mb-2">
                  CNIC Back Scan
                </span>
                {formData.cnicBackImage ? (
                  <div className="relative group inline-block">
                    <img
                      src={formData.cnicBackImage}
                      alt="CNIC Back"
                      className="h-24 rounded border border-slate-700 object-contain mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, cnicBackImage: '' }))}
                      className="mt-1 text-[10px] text-rose-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 rounded hover:border-emerald-500 transition">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[11px] text-slate-400">Upload Back Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'cnicBackImage')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Customer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
