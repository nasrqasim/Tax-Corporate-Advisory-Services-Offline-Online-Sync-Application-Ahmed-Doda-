import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageSquare,
  FileText,
  CreditCard,
  ChevronRight,
  Filter,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction, RefundRecord } from '../../types/payment';
import { calculateCustomerFinancials, formatPKR } from '../../services/financial/ledger';
import { initiatePhoneCall, initiateWhatsAppMessage } from '../../services/native/contact';
import { formatLocalPhone } from '../../services/validation/phone';

interface CustomerListViewProps {
  customers: Customer[];
  services: TaxService[];
  payments: PaymentTransaction[];
  refunds: RefundRecord[];
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: () => void;
  onReceivePayment: (customer: Customer) => void;
  onAddService: (customer: Customer) => void;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  customers,
  services,
  payments,
  refunds,
  onSelectCustomer,
  onAddCustomer,
  onReceivePayment,
  onAddService
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'has_balance' | 'settled'>('all');

  // Compute customer financial metrics for each customer
  const customerListWithFinancials = useMemo(() => {
    return customers.map((c) => {
      const fin = calculateCustomerFinancials(c.id, services, payments, refunds);
      return {
        customer: c,
        financials: fin
      };
    });
  }, [customers, services, payments, refunds]);

  // Apply filters
  const filteredList = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const cleanDigits = searchTerm.replace(/\D/g, '');

    return customerListWithFinancials.filter(({ customer, financials }) => {
      // 1. Status filter
      if (statusFilter !== 'all' && customer.status !== statusFilter) return false;

      // 2. Balance filter
      if (balanceFilter === 'has_balance' && financials.totalOutstanding <= 0) return false;
      if (balanceFilter === 'settled' && financials.totalOutstanding > 0) return false;

      // 3. Search query
      if (!cleanSearch) return true;

      const nameMatch = customer.fullName.toLowerCase().includes(cleanSearch);
      const fatherMatch = (customer.fatherName || '').toLowerCase().includes(cleanSearch);
      const cnicMatch = customer.cnic.replace(/\D/g, '').includes(cleanDigits);
      const phoneMatch = customer.primaryMobile.replace(/\D/g, '').includes(cleanDigits);
      const ntnMatch = (customer.ntnNumber || '').toLowerCase().includes(cleanSearch);

      return nameMatch || fatherMatch || cnicMatch || phoneMatch || ntnMatch;
    });
  }, [customerListWithFinancials, searchTerm, statusFilter, balanceFilter]);

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Customers CRM & Accounts</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {filteredList.length} of {customers.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            View customer tax profiles, balances, CNIC records, and service history.
          </p>
        </div>

        <button
          onClick={onAddCustomer}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, father's name, CNIC, phone, or NTN..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Balances</option>
            <option value="has_balance">Has Outstanding Balance</option>
            <option value="settled">Fully Settled / Zero Balance</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Clients</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Customer List Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">CNIC & NTN</th>
                <th className="py-3 px-4">Contact & Quick Actions</th>
                <th className="py-3 px-4 text-right">Total Payable</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredList.map(({ customer, financials }) => {
                const hasBalance = financials.totalOutstanding > 0;
                return (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Customer Name & ID */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
                          {customer.fullName.charAt(0)}
                        </div>
                        <div>
                          <button
                            onClick={() => onSelectCustomer(customer)}
                            className="font-semibold text-white hover:text-emerald-400 text-left cursor-pointer transition line-clamp-1"
                          >
                            {customer.fullName}
                          </button>
                          <div className="text-[11px] text-slate-400">
                            ID: <span className="font-mono text-slate-300">{customer.id}</span>
                            {customer.fatherName && ` • S/O ${customer.fatherName}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* CNIC & NTN */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-200">{customer.cnic}</div>
                      {customer.ntnNumber ? (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          NTN: {customer.ntnNumber}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">No NTN</span>
                      )}
                    </td>

                    {/* Contact & Calling/WhatsApp */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-300">
                        {formatLocalPhone(customer.primaryMobile)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            initiatePhoneCall(customer.primaryMobile);
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 cursor-pointer transition"
                          title="Call via Phone"
                        >
                          <Phone className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            initiateWhatsAppMessage(
                              customer.whatsappNumber || customer.primaryMobile,
                              `Assalam-o-Alaikum ${customer.fullName}, contacting from Al-Haq Tax Advisory regarding your tax filing.`
                            );
                          }}
                          className="p-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 cursor-pointer transition"
                          title="Open WhatsApp Chat"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Financials: Payable */}
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {formatPKR(financials.totalPayable)}
                    </td>

                    {/* Financials: Paid */}
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      {formatPKR(financials.totalPaid)}
                    </td>

                    {/* Financials: Balance */}
                    <td className="py-3 px-4 text-right">
                      <div
                        className={`font-mono font-bold ${
                          hasBalance ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {formatPKR(financials.totalOutstanding)}
                      </div>
                      {hasBalance ? (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-950 text-amber-300 border border-amber-800">
                          {financials.unpaidServicesCount + financials.partiallyPaidServicesCount} Pending
                        </span>
                      ) : (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Settled
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onReceivePayment(customer)}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                          title="Receive Payment"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Pay</span>
                        </button>
                        <button
                          onClick={() => onAddService(customer)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="Add Tax Service"
                        >
                          <FileText className="w-3 h-3 text-blue-400" />
                          <span>+Service</span>
                        </button>
                        <button
                          onClick={() => onSelectCustomer(customer)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition"
                          title="View Full Profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
