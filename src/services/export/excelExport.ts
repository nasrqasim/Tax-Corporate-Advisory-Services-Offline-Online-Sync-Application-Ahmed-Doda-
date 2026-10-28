/**
 * Excel Export Service
 * Generates multi-sheet .xlsx workbooks with formula injection protection,
 * string formatting preservation for CNIC/phone/NTN, and auto-adjusted column widths.
 */

import * as XLSX from 'xlsx';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction } from '../../types/payment';
import { BusinessProfile } from '../../types/settings';

export interface DateFilterRange {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
}

/**
 * Defense against CSV / Excel Formula Injection (DDE exploits).
 * If a string starts with =, +, -, @, prefix it with an apostrophe.
 */
export function sanitizeExcelCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Filter customers by creation date
 */
export function filterCustomersByDate(customers: Customer[], range: DateFilterRange): Customer[] {
  return customers.filter((c) => {
    const created = c.createdAt ? c.createdAt.slice(0, 10) : '';
    if (range.fromDate && created < range.fromDate) return false;
    if (range.toDate && created > range.toDate) return false;
    return true;
  });
}

/**
 * Filter services by start date or creation date
 */
export function filterServicesByDate(services: TaxService[], range: DateFilterRange): TaxService[] {
  return services.filter((s) => {
    const d = s.startDate ? s.startDate.slice(0, 10) : (s.createdAt ? s.createdAt.slice(0, 10) : '');
    if (range.fromDate && d < range.fromDate) return false;
    if (range.toDate && d > range.toDate) return false;
    return true;
  });
}

/**
 * Filter payments by payment date
 */
export function filterPaymentsByDate(payments: PaymentTransaction[], range: DateFilterRange): PaymentTransaction[] {
  return payments.filter((p) => {
    const d = p.paymentDate ? p.paymentDate.slice(0, 10) : (p.createdAt ? p.createdAt.slice(0, 10) : '');
    if (range.fromDate && d < range.fromDate) return false;
    if (range.toDate && d > range.toDate) return false;
    return true;
  });
}

export function exportDateFilteredExcel(options: {
  businessProfile: BusinessProfile;
  dateRange: DateFilterRange;
  customers: Customer[];
  services: TaxService[];
  payments: PaymentTransaction[];
}): void {
  const { businessProfile, dateRange, customers, services, payments } = options;

  const filteredCustomers = filterCustomersByDate(customers, dateRange);
  const filteredServices = filterServicesByDate(services, dateRange);
  const filteredPayments = filterPaymentsByDate(payments, dateRange);

  const customerMap = new Map<string, string>();
  customers.forEach((c) => customerMap.set(c.id, c.fullName));

  // Compute aggregates
  const totalAgreed = filteredServices.reduce((sum, s) => sum + (s.finalPayable || 0), 0);
  const totalPayments = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalOutstanding = filteredServices.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);

  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryData = [
    ['ORGANIZATION', sanitizeExcelCell(businessProfile.officeName || 'Arslan Tax & Corporate Advisory Services')],
    ['NTN', sanitizeExcelCell(businessProfile.ntn || '7392814-2')],
    ['OFFICE ADDRESS', sanitizeExcelCell(businessProfile.address || 'Winder, Hub, Balochistan, Pakistan')],
    ['PHONE', sanitizeExcelCell(businessProfile.primaryPhone || '03152914836')],
    ['DEVELOPER CREDIT', sanitizeExcelCell(businessProfile.developerCredit || 'Software by Roonjha Developers: 03152914836')],
    [''],
    ['REPORT TITLE', 'Date-Filtered Tax Business & Financial Accounts Export'],
    ['FROM DATE', dateRange.fromDate || 'All History (Earliest)'],
    ['TO DATE', dateRange.toDate || 'Present (Latest)'],
    ['GENERATED ON', new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })],
    [''],
    ['RECORD COUNTS', ''],
    ['Total Filtered Customers', filteredCustomers.length],
    ['Total Filtered Tax Services', filteredServices.length],
    ['Total Filtered Payment Transactions', filteredPayments.length],
    [''],
    ['FINANCIAL SUMMARY (PERIOD)', ''],
    ['Total Net Agreed Fees (Rs.)', totalAgreed],
    ['Total Payments Received (Rs.)', totalPayments],
    ['Total Outstanding Balances (Rs.)', totalOutstanding]
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 32 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Executive Summary');

  // 2. Customers Sheet
  const customerRows = [
    ['Customer ID', 'Full Name', 'Father/Husband Name', 'CNIC', 'Primary Mobile', 'WhatsApp', 'NTN', 'City', 'Status', 'Registered Date']
  ];
  filteredCustomers.forEach((c) => {
    customerRows.push([
      sanitizeExcelCell(c.id),
      sanitizeExcelCell(c.fullName),
      sanitizeExcelCell(c.fatherName || ''),
      sanitizeExcelCell(c.cnic || ''),
      sanitizeExcelCell(c.primaryMobile || ''),
      sanitizeExcelCell(c.whatsappNumber || ''),
      sanitizeExcelCell(c.ntnNumber || ''),
      sanitizeExcelCell(c.address || ''),
      sanitizeExcelCell(c.status || 'active'),
      sanitizeExcelCell(c.createdAt ? c.createdAt.slice(0, 10) : '')
    ]);
  });
  const customerSheet = XLSX.utils.aoa_to_sheet(customerRows);
  // Auto column widths
  customerSheet['!cols'] = [
    { wch: 16 }, { wch: 26 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, customerSheet, 'Customers');

  // 3. Tax Services Sheet
  const serviceRows = [
    ['Service ID', 'Customer ID', 'Customer Name', 'Service Type', 'Tax Year', 'Filing Status', 'Agreed Fee (Rs.)', 'Discount (Rs.)', 'Final Payable (Rs.)', 'Amount Paid (Rs.)', 'Remaining Balance (Rs.)', 'Payment Status', 'Start Date', 'Filing Deadline']
  ];
  filteredServices.forEach((s) => {
    serviceRows.push([
      sanitizeExcelCell(s.id),
      sanitizeExcelCell(s.customerId),
      sanitizeExcelCell(customerMap.get(s.customerId) || 'Unknown Customer'),
      sanitizeExcelCell(s.serviceType),
      sanitizeExcelCell(s.taxYear),
      sanitizeExcelCell(s.filingStatus),
      String(s.agreedFee || 0),
      String(s.discount || 0),
      String(s.finalPayable || 0),
      String(s.amountPaid || 0),
      String(s.outstandingBalance || 0),
      sanitizeExcelCell(s.paymentStatus),
      sanitizeExcelCell(s.startDate ? s.startDate.slice(0, 10) : ''),
      sanitizeExcelCell(s.filingDeadline ? s.filingDeadline.slice(0, 10) : '')
    ]);
  });
  const serviceSheet = XLSX.utils.aoa_to_sheet(serviceRows);
  serviceSheet['!cols'] = [
    { wch: 16 }, { wch: 16 }, { wch: 26 }, { wch: 22 }, { wch: 10 }, { wch: 16 },
    { wch: 15 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, serviceSheet, 'Tax Services');

  // 4. Payments Sheet
  const paymentRows = [
    ['Receipt No', 'Payment Date', 'Customer ID', 'Customer Name', 'Tax Year', 'Amount Received (Rs.)', 'Payment Method', 'Reference / Cheque No', 'Notes / Remarks']
  ];
  filteredPayments.forEach((p) => {
    paymentRows.push([
      sanitizeExcelCell(p.receiptNumber || ''),
      sanitizeExcelCell(p.paymentDate ? p.paymentDate.slice(0, 10) : ''),
      sanitizeExcelCell(p.customerId),
      sanitizeExcelCell(customerMap.get(p.customerId) || 'Unknown Customer'),
      sanitizeExcelCell(p.taxYear || ''),
      String(p.amount || 0),
      sanitizeExcelCell(p.paymentMethod || 'cash'),
      sanitizeExcelCell(p.transactionReference || ''),
      sanitizeExcelCell(p.notes || '')
    ]);
  });
  const paymentSheet = XLSX.utils.aoa_to_sheet(paymentRows);
  paymentSheet['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 26 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 22 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, paymentSheet, 'Payments');

  // Build filename
  const fromStr = dateRange.fromDate || 'AllStart';
  const toStr = dateRange.toDate || 'AllEnd';
  const fileName = `Arslan_Tax_Export_${fromStr}_to_${toStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
