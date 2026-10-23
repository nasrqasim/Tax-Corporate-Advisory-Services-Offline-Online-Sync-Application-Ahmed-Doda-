import React, { useState, useMemo } from 'react';
import {
  Search,
  User,
  Phone,
  CreditCard,
  FileText,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Calendar,
  X
} from 'lucide-react';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { calculateCustomerFinancials, calculateServiceFinancials, formatPKR } from '../../services/financial/ledger';
import { normalizeCnic, formatCnic } from '../../services/validation/cnic';
import { normalizePhone, formatLocalPhone } from '../../services/validation/phone';
import { initiatePhoneCall, initiateWhatsAppMessage } from '../../services/native/contact';

type SearchMethod = 'name' | 'phone' | 'cnic';

interface DedicatedCustomerSearchProps {
  customers: Customer[];
  services: TaxService[];
  payments: PaymentTransaction[];
  refunds: RefundRecord[];
  onSelectCustomer: (customer: Customer) => void;
  onReceivePayment: (customer: Customer, service?: TaxService) => void;
  onClose?: () => void;
}

export const DedicatedCustomerSearch: React.FC<DedicatedCustomerSearchProps> = ({
  customers,
  services,
  payments,
  refunds,
  onSelectCustomer,
  onReceivePayment,
  onClose
}) => {
  const [searchMethod, setSearchMethod] = useState<SearchMethod>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResultCustomer, setSelectedResultCustomer] = useState<Customer | null>(null);

  // Perform indexed multi-mode search
  const searchResults = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) return [];

    const lower = raw.toLowerCase();
    const digitsOnly = raw.replace(/\D/g, '');

    return customers.filter((cust) => {
      if (searchMethod === 'name') {
        const nameMatch = cust.fullName.toLowerCase().includes(lower);
        const fatherMatch = (cust.fatherName || '').toLowerCase().includes(lower);
        return nameMatch || fatherMatch;
      }

      if (searchMethod === 'phone') {
        if (!digitsOnly) return false;
        const p1 = normalizePhone(cust.primaryMobile).replace(/\D/g, '');
        const p2 = cust.secondaryMobile ? normalizePhone(cust.secondaryMobile).replace(/\D/g, '') : '';
        const wa = normalizePhone(cust.whatsappNumber).replace(/\D/g, '');
        return p1.includes(digitsOnly) || p2.includes(digitsOnly) || wa.includes(digitsOnly);
      }

      if (searchMethod === 'cnic') {
        if (!digitsOnly) return false;
        const cleanCnic = normalizeCnic(cust.cnic);
        return cleanCnic.includes(digitsOnly) || cust.cnic.includes(raw);
      }

      return false;
    });
  }, [customers, searchMethod, searchQuery]);

  // Selected customer details
  const activeCustomer = selectedResultCustomer || (searchResults.length === 1 ? searchResults[0] : null);

  const activeFinancials = activeCustomer
    ? calculateCustomerFinancials(activeCustomer.id, services, payments, refunds)
    : null;

  const activeServices = activeCustomer
    ? services.filter((s) => s.customerId === activeCustomer.id)
    : [];

  const activePayments = activeCustomer
    ? payments.filter((p) => p.customerId === activeCustomer.id)
    : [];

  return (
    <div className="space-y-5">
      {/* Search Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-400" />
              <span>Dedicated Customer Search</span>
            </h2>
            <p className="text-xs text-slate-400">
              Offline indexed lookups by Full Name, Mobile Number, or CNIC.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 3 Prominent Selectable Methods */}
        <div className="grid grid-cols-3 gap-1 sm:gap-2 border-b border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => {
              setSearchMethod('name');
              setSearchQuery('');
            }}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-t-lg transition cursor-pointer ${
              searchMethod === 'name'
                ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Name</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchMethod('phone');
              setSearchQuery('');
            }}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-t-lg transition cursor-pointer ${
              searchMethod === 'phone'
                ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Mobile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchMethod('cnic');
              setSearchQuery('');
            }}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-t-lg transition cursor-pointer ${
              searchMethod === 'cnic'
                ? 'bg-slate-800 text-emerald-400 border-t-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">CNIC</span>
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-emerald-500 pointer-events-none" />
          <input
            type="text"
            inputMode={searchMethod === 'cnic' ? 'numeric' : searchMethod === 'phone' ? 'tel' : 'text'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedResultCustomer(null);
            }}
            placeholder={
              searchMethod === 'name'
                ? 'Type full or partial name / father name...'
                : searchMethod === 'phone'
                ? 'Type mobile digits (0300...)...'
                : 'Type CNIC digits (35202...)...'
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedResultCustomer(null);
              }}
              className="absolute right-3 top-3 text-slate-400 hover:text-white p-1 rounded-md"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results and Detail Layout */}
      {searchQuery.trim() && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column: Result List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm lg:col-span-1 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
              <span>Matching Customers</span>
              <span className="font-mono text-emerald-400">{searchResults.length} found</span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {searchResults.map((cust) => {
                const isSelected = activeCustomer?.id === cust.id;
                const fin = calculateCustomerFinancials(cust.id, services, payments, refunds);
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedResultCustomer(cust)}
                    className={`p-3 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-xs text-white">{cust.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{cust.cnic}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {formatLocalPhone(cust.primaryMobile)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xs font-mono font-bold ${
                            fin.totalOutstanding > 0 ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          {formatPKR(fin.totalOutstanding)}
                        </div>
                        <span className="text-[10px] text-slate-500">Balance</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {searchResults.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                  <AlertCircle className="w-6 h-6 text-slate-500 mx-auto" />
                  <div>No matching customer records found for "{searchQuery}".</div>
                  <div className="text-[11px] text-slate-500">
                    Check spelling or switch search criteria.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Full Profile Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-2">
            {activeCustomer && activeFinancials ? (
              <div className="space-y-5 text-xs">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{activeCustomer.fullName}</h3>
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-emerald-400 font-mono">
                        {activeCustomer.id}
                      </span>
                    </div>
                    <div className="text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                      {activeCustomer.fatherName && <span>S/O {activeCustomer.fatherName}</span>}
                      <span className="font-mono text-slate-300">CNIC: {activeCustomer.cnic}</span>
                      {activeCustomer.ntnNumber && (
                        <span className="font-mono text-emerald-400">NTN: {activeCustomer.ntnNumber}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectCustomer(activeCustomer)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition cursor-pointer"
                    >
                      <span>Open Full Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Total Payable</span>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">
                      {formatPKR(activeFinancials.totalPayable)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-900/60">
                    <span className="text-emerald-400 text-[10px]">Total Paid</span>
                    <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">
                      {formatPKR(activeFinancials.totalPaid)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-amber-950/40 border border-amber-900/60">
                    <span className="text-amber-400 text-[10px]">Outstanding Balance</span>
                    <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                      {formatPKR(activeFinancials.totalOutstanding)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Active Services</span>
                    <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
                      {activeServices.length} Records
                    </div>
                  </div>
                </div>

                {/* Contact Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => initiatePhoneCall(activeCustomer.primaryMobile)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono">{formatLocalPhone(activeCustomer.primaryMobile)}</span>
                  </button>
                  <button
                    onClick={() =>
                      initiateWhatsAppMessage(
                        (activeCustomer.whatsappNumber && !activeCustomer.whatsappNumber.includes('3001234567') ? activeCustomer.whatsappNumber : activeCustomer.primaryMobile),
                        `Assalam-o-Alaikum ${activeCustomer.fullName}, contacting from Ahmed Doda Tax & Corporate Advisory Services.`
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  {activeFinancials.totalOutstanding > 0 && (
                    <button
                      onClick={() => onReceivePayment(activeCustomer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer shadow-sm ml-auto"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Receive Payment</span>
                    </button>
                  )}
                </div>

                {/* Tax Services Table */}
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <div className="bg-slate-950/80 px-3 py-2 font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                    Tax Services & Multi-Year Filing
                  </div>
                  <div className="divide-y divide-slate-800/60">
                    {activeServices.map((s) => {
                      const fin = calculateServiceFinancials(s, payments, refunds);
                      return (
                        <div key={s.id} className="p-3 flex items-center justify-between hover:bg-slate-800/30">
                          <div>
                            <div className="font-semibold text-white">
                              {s.serviceType.replace(/_/g, ' ').toUpperCase()}{' '}
                              <span className="text-emerald-400">({s.taxYear})</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Filing: <span className="text-slate-300 font-semibold">{s.filingStatus}</span> • Fee: {formatPKR(fin.finalPayable)} • Paid: {formatPKR(fin.netPaymentsApplied)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                fin.paymentStatus === 'paid'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : fin.paymentStatus === 'partially_paid'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {fin.paymentStatus.replace(/_/g, ' ')}
                            </span>
                            <div className="font-mono text-xs font-bold text-slate-300 mt-1">
                              Bal: {formatPKR(fin.outstandingBalance)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {activeServices.length === 0 && (
                      <div className="p-4 text-center text-slate-500">No services on record.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500 text-xs">
                Select a customer from the results to view complete profile and service details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
