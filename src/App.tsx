import React, { useState, useEffect, useCallback } from 'react';
import { dbService } from './services/sqlite/db';
import { Customer } from './types/customer';
import { TaxService } from './types/service';
import { PaymentTransaction, RefundRecord } from './types/payment';
import { BusinessProfile, FollowUpReminder, UserRole } from './types/settings';
import { SyncStats } from './types/sync';
import { outboxManager } from './services/sync/outbox';

// UI Layout Components
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';

// View Modules
import { DashboardView } from './components/dashboard/DashboardView';
import { CustomerListView } from './components/customers/CustomerListView';
import { CustomerProfileView } from './components/customers/CustomerProfileView';
import { AddEditCustomerModal } from './components/customers/AddEditCustomerModal';
import { DedicatedCustomerSearch } from './components/search/DedicatedCustomerSearch';
import { TaxServicesListView } from './components/services/TaxServicesListView';
import { AddServiceModal } from './components/services/AddServiceModal';
import { ReceivePaymentModal } from './components/payments/ReceivePaymentModal';
import { PaymentHistoryView } from './components/payments/PaymentHistoryView';
import { RefundReversalModal } from './components/payments/RefundReversalModal';
import { PrintableReceiptModal } from './components/receipts/PrintableReceiptModal';
import { CustomerStatementModal } from './components/receipts/CustomerStatementModal';
import { FollowupsView } from './components/followups/FollowupsView';
import { FinancialReportsView } from './components/reports/FinancialReportsView';
import { SyncOutboxView } from './components/sync/SyncOutboxView';
import { SettingsView } from './components/settings/SettingsView';

export function App() {
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');

  // Database Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<TaxService[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpReminder[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    officeName: 'Al-Haq Tax & Corporate Advisory Services',
    ntn: '7392814-2',
    primaryPhone: '+923001234567',
    address: 'Suite #402, 4th Floor, Executive Heights, Blue Area',
    city: 'Islamabad',
    currencySymbol: 'Rs. ',
    allowOverpayments: false,
    enableEncryption: true,
    receiptFooterNote: 'Thank you for your business. Retain this official receipt for your tax records.'
  });
  const [syncStats, setSyncStats] = useState<SyncStats>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    conflictCount: 0
  });

  // Modal & Selection States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [isAddEditCustomerOpen, setIsAddEditCustomerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [addServiceCustomer, setAddServiceCustomer] = useState<Customer | null>(null);

  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentService, setPaymentService] = useState<TaxService | null>(null);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundTxn, setRefundTxn] = useState<PaymentTransaction | null>(null);
  const [refundService, setRefundService] = useState<TaxService | null>(null);

  const [isPrintReceiptOpen, setIsPrintReceiptOpen] = useState(false);
  const [receiptTxn, setReceiptTxn] = useState<PaymentTransaction | null>(null);
  const [receiptService, setReceiptService] = useState<TaxService | null>(null);

  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  // Load Database Data
  const reloadData = useCallback(async () => {
    await dbService.init();
    const [cList, sList, pList, rList, fList, bProfile, sStats] = await Promise.all([
      dbService.getCustomers(),
      dbService.getTaxServices(),
      dbService.getPayments(),
      dbService.getRefunds(),
      dbService.getFollowUps(),
      dbService.getBusinessProfile(),
      outboxManager.getSyncStats()
    ]);

    setCustomers(cList);
    setServices(sList);
    setPayments(pList);
    setRefunds(rList);
    setFollowUps(fList);
    setBusinessProfile(bProfile);
    setSyncStats(sStats);
    setIsDbLoaded(true);

    // Keep selected customer synchronized if view is open
    if (selectedCustomer) {
      const refreshed = cList.find((c) => c.id === selectedCustomer.id);
      if (refreshed) setSelectedCustomer(refreshed);
    }
  }, [selectedCustomer?.id]);

  useEffect(() => {
    reloadData();
  }, []);

  // Keyboard shortcut Ctrl+K to open Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Customer Actions
  const handleSaveCustomer = async (cust: Customer) => {
    await dbService.saveCustomer(cust, currentRole);
    await reloadData();
  };

  // Tax Service Actions
  const handleSaveTaxService = async (srv: TaxService) => {
    await dbService.saveTaxService(srv, currentRole);
    await reloadData();
  };

  // Payment Actions
  const handleRecordPayment = async (
    paymentData: Omit<PaymentTransaction, 'id' | 'receiptNumber' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus'>
  ): Promise<PaymentTransaction> => {
    const txn = await dbService.recordPayment(paymentData, currentRole);
    await reloadData();
    return txn;
  };

  // Refund Actions
  const handleRefundSuccess = async (
    refundRecord: RefundRecord,
    updatedTxn: PaymentTransaction,
    updatedService: TaxService
  ) => {
    await dbService.recordRefund(refundRecord, updatedTxn, updatedService, currentRole);
    await reloadData();
  };

  // Follow-up Actions
  const handleSaveFollowUp = async (item: FollowUpReminder) => {
    await dbService.saveFollowUp(item);
    await reloadData();
  };

  // Settings Actions
  const handleSaveProfile = async (p: BusinessProfile) => {
    await dbService.saveBusinessProfile(p);
    setBusinessProfile(p);
  };

  if (!isDbLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="text-base font-semibold">Initializing Encrypted Local Database...</h2>
          <p className="text-xs text-slate-400">Loading SQLite records and offline outbox ledger</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenSearch={() => setIsSearchOpen(true)}
        officeName={businessProfile.officeName}
        ntn={businessProfile.ntn}
      />

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={selectedCustomer ? 'customers' : activeTab}
          onTabChange={(tab) => {
            setSelectedCustomer(null);
            if (tab === 'add_customer') {
              setCustomerToEdit(null);
              setIsAddEditCustomerOpen(true);
            } else if (tab === 'receive_payment') {
              setPaymentCustomer(null);
              setPaymentService(null);
              setIsReceivePaymentOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          pendingSyncCount={syncStats.pendingCount}
          pendingFollowupCount={followUps.filter((f) => f.status === 'pending').length}
          currentRole={currentRole}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
          {selectedCustomer ? (
            <CustomerProfileView
              customer={selectedCustomer}
              services={services}
              payments={payments}
              refunds={refunds}
              onBack={() => setSelectedCustomer(null)}
              onEditCustomer={(c) => {
                setCustomerToEdit(c);
                setIsAddEditCustomerOpen(true);
              }}
              onAddService={(c) => {
                setAddServiceCustomer(c);
                setIsAddServiceOpen(true);
              }}
              onReceivePayment={(c, s) => {
                setPaymentCustomer(c);
                setPaymentService(s || null);
                setIsReceivePaymentOpen(true);
              }}
              onViewPaymentHistory={(c, s) => {
                setActiveTab('payment_history');
                setSelectedCustomer(null);
              }}
              onPrintStatement={(c) => {
                setStatementCustomer(c);
                setIsStatementOpen(true);
              }}
              onPrintReceipt={(txn, srv) => {
                setReceiptTxn(txn);
                setReceiptService(srv);
                setIsPrintReceiptOpen(true);
              }}
              onRefundReversal={(txn, srv) => {
                setRefundTxn(txn);
                setRefundService(srv);
                setIsRefundModalOpen(true);
              }}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  customers={customers}
                  services={services}
                  payments={payments}
                  refunds={refunds}
                  followUps={followUps}
                  syncStats={syncStats}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onReceivePayment={(c, s) => {
                    setPaymentCustomer(c || null);
                    setPaymentService(s || null);
                    setIsReceivePaymentOpen(true);
                  }}
                />
              )}

              {activeTab === 'customers' && (
                <CustomerListView
                  customers={customers}
                  services={services}
                  payments={payments}
                  refunds={refunds}
                  onSelectCustomer={(c) => setSelectedCustomer(c)}
                  onAddCustomer={() => {
                    setCustomerToEdit(null);
                    setIsAddEditCustomerOpen(true);
                  }}
                  onReceivePayment={(c) => {
                    setPaymentCustomer(c);
                    setPaymentService(null);
                    setIsReceivePaymentOpen(true);
                  }}
                  onAddService={(c) => {
                    setAddServiceCustomer(c);
                    setIsAddServiceOpen(true);
                  }}
                />
              )}

              {activeTab === 'search' && (
                <DedicatedCustomerSearch
                  customers={customers}
                  services={services}
                  payments={payments}
                  refunds={refunds}
                  onSelectCustomer={(c) => setSelectedCustomer(c)}
                  onReceivePayment={(c, s) => {
                    setPaymentCustomer(c);
                    setPaymentService(s || null);
                    setIsReceivePaymentOpen(true);
                  }}
                />
              )}

              {activeTab === 'services' && (
                <TaxServicesListView
                  services={services}
                  customers={customers}
                  payments={payments}
                  refunds={refunds}
                  onSelectCustomer={(c) => setSelectedCustomer(c)}
                  onAddService={(c) => {
                    setAddServiceCustomer(c || null);
                    setIsAddServiceOpen(true);
                  }}
                  onReceivePayment={(c, s) => {
                    setPaymentCustomer(c);
                    setPaymentService(s);
                    setIsReceivePaymentOpen(true);
                  }}
                />
              )}

              {activeTab === 'payment_history' && (
                <PaymentHistoryView
                  payments={payments}
                  refunds={refunds}
                  services={services}
                  customers={customers}
                  onSelectCustomer={(c) => setSelectedCustomer(c)}
                  onPrintReceipt={(txn, srv) => {
                    setReceiptTxn(txn);
                    setReceiptService(srv);
                    setIsPrintReceiptOpen(true);
                  }}
                  onRefundReversal={(txn, srv) => {
                    setRefundTxn(txn);
                    setRefundService(srv);
                    setIsRefundModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'receipts_statements' && (
                <div className="space-y-4">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <h2 className="text-lg font-bold text-white">Receipts & Customer Account Statements</h2>
                    <p className="text-xs text-slate-400">
                      Select a customer to generate their comprehensive financial statement or reprint receipts.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {customers.map((c) => (
                      <div
                        key={c.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="font-bold text-white text-sm">{c.fullName}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{c.cnic}</div>
                          <div className="text-xs text-emerald-400 font-mono">ID: {c.id}</div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
                          <button
                            onClick={() => {
                              setStatementCustomer(c);
                              setIsStatementOpen(true);
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer text-center"
                          >
                            Statement
                          </button>
                          <button
                            onClick={() => setSelectedCustomer(c)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
                          >
                            Profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'followups' && (
                <FollowupsView
                  followUps={followUps}
                  customers={customers}
                  onSaveFollowUp={handleSaveFollowUp}
                  onSelectCustomer={(c) => setSelectedCustomer(c)}
                />
              )}

              {activeTab === 'reports' && (
                <FinancialReportsView
                  customers={customers}
                  services={services}
                  payments={payments}
                  refunds={refunds}
                  businessProfile={businessProfile}
                  onSelectCustomer={(c) => setSelectedCustomer(c)}
                />
              )}

              {activeTab === 'sync' && <SyncOutboxView />}

              {activeTab === 'backup' && (
                <SettingsView
                  businessProfile={businessProfile}
                  onSaveProfile={handleSaveProfile}
                  onReloadDatabase={reloadData}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  businessProfile={businessProfile}
                  onSaveProfile={handleSaveProfile}
                  onReloadDatabase={reloadData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* --- GLOBAL MODALS --- */}

      {/* Add / Edit Customer Modal */}
      <AddEditCustomerModal
        isOpen={isAddEditCustomerOpen}
        onClose={() => setIsAddEditCustomerOpen(false)}
        onSave={handleSaveCustomer}
        existingCustomers={customers}
        customerToEdit={customerToEdit}
      />

      {/* Add Tax Service Modal */}
      <AddServiceModal
        isOpen={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
        onSave={handleSaveTaxService}
        customers={customers}
        preSelectedCustomer={addServiceCustomer}
      />

      {/* Receive Payment Modal */}
      <ReceivePaymentModal
        isOpen={isReceivePaymentOpen}
        onClose={() => setIsReceivePaymentOpen(false)}
        onRecordPayment={handleRecordPayment}
        customers={customers}
        services={services}
        businessProfile={businessProfile}
        initialCustomer={paymentCustomer}
        initialService={paymentService}
        onPaymentSuccess={(txn, srv, cust) => {
          setReceiptTxn(txn);
          setReceiptService(srv);
          setIsPrintReceiptOpen(true);
        }}
      />

      {/* Printable Receipt Modal */}
      <PrintableReceiptModal
        isOpen={isPrintReceiptOpen}
        onClose={() => setIsPrintReceiptOpen(false)}
        transaction={receiptTxn}
        service={receiptService}
        customer={customers.find((c) => c.id === receiptTxn?.customerId) || null}
        businessProfile={businessProfile}
      />

      {/* Customer Account Statement Modal */}
      <CustomerStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        customer={statementCustomer}
        services={services}
        payments={payments}
        refunds={refunds}
        businessProfile={businessProfile}
      />

      {/* Controlled Refund & Reversal Modal */}
      <RefundReversalModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        transaction={refundTxn}
        service={refundService}
        customer={customers.find((c) => c.id === refundTxn?.customerId) || null}
        allTransactions={payments}
        existingRefunds={refunds}
        onRefundSuccess={handleRefundSuccess}
      />

      {/* Dedicated Search Overlay Modal (Ctrl+K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="w-full max-w-4xl my-auto">
            <DedicatedCustomerSearch
              customers={customers}
              services={services}
              payments={payments}
              refunds={refunds}
              onSelectCustomer={(c) => {
                setSelectedCustomer(c);
                setIsSearchOpen(false);
              }}
              onReceivePayment={(c, s) => {
                setPaymentCustomer(c);
                setPaymentService(s || null);
                setIsReceivePaymentOpen(true);
                setIsSearchOpen(false);
              }}
              onClose={() => setIsSearchOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
