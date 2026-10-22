import React, { useState } from 'react';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  CreditCard,
  History,
  Receipt,
  FileText,
  Plus,
  Edit,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  User,
  MapPin,
  Mail,
  Calendar,
  Eye,
  RotateCcw
} from 'lucide-react';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { calculateCustomerFinancials, calculateServiceFinancials, formatPKR } from '../../services/financial/ledger';
import { initiatePhoneCall, initiateWhatsAppMessage } from '../../services/native/contact';
import { formatLocalPhone } from '../../services/validation/phone';

interface CustomerProfileViewProps {
  customer: Customer;
  services: TaxService[];
  payments: PaymentTransaction[];
  refunds: RefundRecord[];
  onBack: () => void;
  onEditCustomer: (customer: Customer) => void;
  onAddService: (customer: Customer) => void;
  onReceivePayment: (customer: Customer, service?: TaxService) => void;
  onViewPaymentHistory: (customer: Customer, service?: TaxService) => void;
  onPrintStatement: (customer: Customer) => void;
  onPrintReceipt: (payment: PaymentTransaction, service: TaxService) => void;
  onRefundReversal: (payment: PaymentTransaction, service: TaxService) => void;
}

export const CustomerProfileView: React.FC<CustomerProfileViewProps> = ({
  customer,
  services,
  payments,
  refunds,
  onBack,
  onEditCustomer,
  onAddService,
  onReceivePayment,
  onViewPaymentHistory,
  onPrintStatement,
  onPrintReceipt,
  onRefundReversal
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'payments' | 'documents' | 'details'>('services');
  const [selectedCnicView, setSelectedCnicView] = useState<'front' | 'back' | null>(null);

  // Authoritative financial recalculation
  const financials = calculateCustomerFinancials(customer.id, services, payments, refunds);
  const customerServices = services.filter((s) => s.customerId === customer.id);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);
  const customerRefunds = refunds.filter((r) => r.customerId === customer.id);

  return (
    <div className="space-y-6">
      {/* Back Button & Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditCustomer(customer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={() => onAddService(customer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Add Tax Service</span>
          </button>
          <button
            onClick={() => onReceivePayment(customer)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Receive Payment</span>
          </button>
        </div>
      </div>

      {/* Customer Info Card & Contact Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {customer.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {customer.fullName}
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                  {customer.id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    customer.status === 'active'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {customer.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                {customer.fatherName && <span>S/O {customer.fatherName}</span>}
                <span className="font-mono text-slate-300">CNIC: {customer.cnic}</span>
                {customer.ntnNumber && (
                  <span className="font-mono text-emerald-400">NTN: {customer.ntnNumber}</span>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3 h-3" />
                    <span>{customer.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Contact Links */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => initiatePhoneCall(customer.primaryMobile)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition cursor-pointer"
              title="Call primary phone"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono">{formatLocalPhone(customer.primaryMobile)}</span>
            </button>
            <button
              onClick={() =>
                initiateWhatsAppMessage(
                  customer.whatsappNumber || customer.primaryMobile,
                  `Assalam-o-Alaikum ${customer.fullName}, contacting from Al-Haq Tax Advisory.`
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs transition cursor-pointer"
              title="Open WhatsApp Chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: CUSTOMER ACCOUNT FINANCIAL SUMMARY */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Customer Financial Account Summary</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintStatement(customer)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-blue-400" />
              <span>Print Account Statement</span>
            </button>
            <button
              onClick={() => onViewPaymentHistory(customer)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Payment History</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Total Agreed Fees</span>
            <div className="text-base font-bold text-white font-mono mt-1">
              {formatPKR(financials.totalServiceFees)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Total Discounts</span>
            <div className="text-base font-bold text-slate-400 font-mono mt-1">
              {formatPKR(financials.totalDiscounts)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Total Net Payable</span>
            <div className="text-base font-bold text-slate-200 font-mono mt-1">
              {formatPKR(financials.totalPayable)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/60">
            <span className="text-emerald-400 text-[11px]">Total Payments Received</span>
            <div className="text-base font-bold text-emerald-300 font-mono mt-1">
              {formatPKR(financials.totalPaid)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-900/60">
            <span className="text-amber-400 text-[11px]">Outstanding Balance</span>
            <div className="text-base font-bold text-amber-300 font-mono mt-1">
              {formatPKR(financials.totalOutstanding)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Service Statuses</span>
            <div className="text-[11px] font-semibold text-slate-300 mt-1 flex flex-col gap-0.5">
              <span className="text-emerald-400">{financials.fullyPaidServicesCount} Fully Paid</span>
              <span className="text-amber-400">{financials.partiallyPaidServicesCount} Partially Paid</span>
              <span className="text-rose-400">{financials.unpaidServicesCount} Unpaid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Tax Services & Multi-Year Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4">
          <button
            onClick={() => setActiveTab('services')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'services'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tax Services & Filing Ledger ({customerServices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Payment Transactions ({customerPayments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'documents'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CNIC & Tax Documents</span>
          </button>
        </div>

        {/* Tab 1: Tax Services List */}
        {activeTab === 'services' && (
          <div className="p-4 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Tax Year</th>
                    <th className="py-2.5 px-3 text-right">Agreed Fee</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3 text-center">Filing Status</th>
                    <th className="py-2.5 px-3 text-center">Payment Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {customerServices.map((service) => {
                    const fin = calculateServiceFinancials(service, payments, refunds);
                    const isFullyPaid = fin.paymentStatus === 'paid' || fin.paymentStatus === 'overpaid';

                    return (
                      <tr key={service.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">
                            {service.serviceType === 'income_tax_return'
                              ? 'Income Tax Return'
                              : service.serviceType === 'ntn_registration'
                              ? 'NTN Registration'
                              : service.serviceType === 'ntn_modification'
                              ? 'NTN Modification'
                              : service.customServiceName || service.serviceType}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{service.id}</div>
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-300 font-semibold">
                          {service.taxYear}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {formatPKR(fin.agreedFee)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-400">
                          {fin.discount > 0 ? formatPKR(fin.discount) : '-'}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                          {formatPKR(fin.netPaymentsApplied)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold">
                          <span className={fin.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-400'}>
                            {formatPKR(fin.outstandingBalance)}
                          </span>
                        </td>

                        {/* Separate Filing Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              service.filingStatus === 'completed' || service.filingStatus === 'filed'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : service.filingStatus === 'in_progress'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {service.filingStatus.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Separate Payment Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              isFullyPaid
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : fin.paymentStatus === 'partially_paid'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {fin.paymentStatus.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {fin.outstandingBalance > 0 && (
                              <button
                                onClick={() => onReceivePayment(customer, service)}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                                title="Receive Payment for this service"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            )}
                            <button
                              onClick={() => onViewPaymentHistory(customer, service)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition"
                              title="View Service Payments"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {customerServices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400 text-xs">
                        No tax services recorded for this client. Click "Add Tax Service" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Payment History */}
        {activeTab === 'payments' && (
          <div className="p-4 space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Service & Tax Year</th>
                    <th className="py-2.5 px-3 text-right">Amount Received</th>
                    <th className="py-2.5 px-3">Method & Ref</th>
                    <th className="py-2.5 px-3">Received By</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {customerPayments.map((p) => {
                    const srv = customerServices.find((s) => s.id === p.serviceId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {p.paymentDate.slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">
                          {p.receiptNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-200">
                            {srv ? srv.serviceType.replace(/_/g, ' ') : p.serviceId}
                          </span>
                          <span className="text-slate-400 ml-1">({p.taxYear})</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          {formatPKR(p.amount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-300">{p.paymentMethod}</span>
                          {p.transactionReference && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Ref: {p.transactionReference}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{p.receivedBy}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              p.status === 'valid'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : p.status === 'partially_refunded'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => srv && onPrintReceipt(p, srv)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1 cursor-pointer transition"
                              title="Print / Export Receipt"
                            >
                              <Receipt className="w-3 h-3 text-emerald-400" />
                              <span>Receipt</span>
                            </button>
                            {p.status === 'valid' && (
                              <button
                                onClick={() => srv && onRefundReversal(p, srv)}
                                className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer transition"
                                title="Issue Controlled Refund / Reversal"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {customerPayments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                        No payments recorded yet for this client.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: CNIC and Tax Documents */}
        {activeTab === 'documents' && (
          <div className="p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Identity Verification & CNIC Documents</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CNIC Front */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] text-center">
                <span className="text-xs font-semibold text-slate-300 mb-2">CNIC Front Image</span>
                {customer.cnicFrontImage ? (
                  <div className="relative group max-w-xs">
                    <img
                      src={customer.cnicFrontImage}
                      alt="CNIC Front"
                      className="max-h-36 rounded border border-slate-700 object-contain shadow-sm"
                    />
                    <button
                      onClick={() => setSelectedCnicView('front')}
                      className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs gap-1 rounded transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Expand View</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-6">
                    No CNIC front scan uploaded. Edit customer to attach.
                  </div>
                )}
              </div>

              {/* CNIC Back */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] text-center">
                <span className="text-xs font-semibold text-slate-300 mb-2">CNIC Back Image</span>
                {customer.cnicBackImage ? (
                  <div className="relative group max-w-xs">
                    <img
                      src={customer.cnicBackImage}
                      alt="CNIC Back"
                      className="max-h-36 rounded border border-slate-700 object-contain shadow-sm"
                    />
                    <button
                      onClick={() => setSelectedCnicView('back')}
                      className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs gap-1 rounded transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Expand View</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-6">
                    No CNIC back scan uploaded. Edit customer to attach.
                  </div>
                )}
              </div>
            </div>

            {/* Modal for viewing CNIC larger */}
            {selectedCnicView && (
              <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setSelectedCnicView(null)}
              >
                <div
                  className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-4 space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-semibold text-sm text-white">
                      {customer.fullName} — CNIC {selectedCnicView === 'front' ? 'Front' : 'Back'}
                    </span>
                    <button
                      onClick={() => setSelectedCnicView(null)}
                      className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex items-center justify-center p-2 bg-slate-950 rounded">
                    <img
                      src={
                        selectedCnicView === 'front'
                          ? customer.cnicFrontImage
                          : customer.cnicBackImage
                      }
                      alt="CNIC Detailed"
                      className="max-h-[70vh] object-contain rounded"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
