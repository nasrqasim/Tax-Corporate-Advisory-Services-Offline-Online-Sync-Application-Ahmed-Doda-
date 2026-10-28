/**
 * PDF Export Service
 * Generates professional, multi-page, date-filtered printable PDF reports
 * with official Arslan Tax & Corporate Advisory Services branding,
 * record counts, itemized tables, totals, and developer attribution footer.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer } from '../../types/customer';
import { TaxService } from '../../types/service';
import { PaymentTransaction } from '../../types/payment';
import { BusinessProfile } from '../../types/settings';
import { DateFilterRange, filterCustomersByDate, filterServicesByDate, filterPaymentsByDate } from './excelExport';

export function exportDateFilteredPDF(options: {
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

  const totalAgreed = filteredServices.reduce((sum, s) => sum + (s.finalPayable || 0), 0);
  const totalPayments = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalOutstanding = filteredServices.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const primaryColor: [number, number, number] = [6, 78, 59]; // Emerald 900
  const accentColor: [number, number, number] = [16, 185, 129]; // Emerald 500

  const orgName = businessProfile.officeName || 'Arslan Tax & Corporate Advisory Services';
  const ntn = businessProfile.ntn || '7392814-2';
  const address = businessProfile.address || 'Winder, Hub, Balochistan, Pakistan';
  const phone = businessProfile.primaryPhone || '03152914836';
  const devCredit = businessProfile.developerCredit || 'Software by Roonjha Developers: 03152914836';

  const dateRangeStr = `${dateRange.fromDate || 'Earliest'} to ${dateRange.toDate || 'Present'}`;
  const generatedAt = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });

  // 1. Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, doc.internal.pageSize.width, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(orgName, 40, 32);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`NTN: ${ntn}  |  Address: ${address}`, 40, 50);
  doc.text(`Official Date-Filtered Business & Financial Audit Report`, 40, 66);

  // 2. Metadata Box
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Period: ${dateRangeStr}`, 40, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated on: ${generatedAt}`, 40, 120);

  // Summary Metrics Banner
  doc.setFillColor(241, 245, 249);
  doc.rect(40, 130, doc.internal.pageSize.width - 80, 50, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(40, 130, doc.internal.pageSize.width - 80, 50, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  const col1 = 55;
  const col2 = 210;
  const col3 = 380;

  doc.text(`Customers Registered: ${filteredCustomers.length}`, col1, 150);
  doc.text(`Tax Services Handled: ${filteredServices.length}`, col1, 168);

  doc.text(`Payments Recorded: ${filteredPayments.length}`, col2, 150);
  doc.text(`Total Payments Received: Rs. ${totalPayments.toLocaleString()}`, col2, 168);

  doc.text(`Total Agreed Fees: Rs. ${totalAgreed.toLocaleString()}`, col3, 150);
  doc.text(`Total Outstanding: Rs. ${totalOutstanding.toLocaleString()}`, col3, 168);

  let currentY = 195;

  // 3. Section: Recent Payments in Period
  doc.setTextColor(6, 78, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`1. Payment Transactions (${filteredPayments.length})`, 40, currentY);
  currentY += 10;

  const paymentTableRows = filteredPayments.map((p) => [
    p.receiptNumber || 'N/A',
    p.paymentDate ? p.paymentDate.slice(0, 10) : 'N/A',
    customerMap.get(p.customerId) || p.customerId,
    p.taxYear || '-',
    `Rs. ${(p.amount || 0).toLocaleString()}`,
    p.paymentMethod || 'cash',
    p.notes || '-'
  ]);

  if (paymentTableRows.length === 0) {
    paymentTableRows.push(['No payments found within the selected date range.', '', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Receipt #', 'Date', 'Customer Name', 'Year', 'Amount', 'Method', 'Notes']],
    body: paymentTableRows,
    theme: 'striped',
    headStyles: { fillColor: [6, 78, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      // Footer on every page
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${orgName}  |  Page ${data.pageNumber} of ${pageCount}`,
        40,
        doc.internal.pageSize.height - 20
      );
      doc.text(
        devCredit,
        doc.internal.pageSize.width - 240,
        doc.internal.pageSize.height - 20
      );
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 25;

  // Check if we need a new page for Tax Services
  if (currentY > doc.internal.pageSize.height - 120) {
    doc.addPage();
    currentY = 40;
  }

  // 4. Section: Tax Services
  doc.setTextColor(6, 78, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`2. Tax Filings & Corporate Services (${filteredServices.length})`, 40, currentY);
  currentY += 10;

  const serviceTableRows = filteredServices.map((s) => [
    s.id,
    customerMap.get(s.customerId) || s.customerId,
    s.serviceType.replace(/_/g, ' '),
    s.taxYear,
    s.filingStatus.replace(/_/g, ' '),
    `Rs. ${(s.finalPayable || 0).toLocaleString()}`,
    `Rs. ${(s.amountPaid || 0).toLocaleString()}`,
    `Rs. ${(s.outstandingBalance || 0).toLocaleString()}`
  ]);

  if (serviceTableRows.length === 0) {
    serviceTableRows.push(['No tax services found within the selected date range.', '', '', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Service ID', 'Customer Name', 'Service Type', 'Year', 'Status', 'Payable', 'Paid', 'Balance']],
    body: serviceTableRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${orgName}  |  Page ${data.pageNumber} of ${pageCount}`,
        40,
        doc.internal.pageSize.height - 20
      );
      doc.text(
        devCredit,
        doc.internal.pageSize.width - 240,
        doc.internal.pageSize.height - 20
      );
    }
  });

  const fromStr = dateRange.fromDate || 'AllStart';
  const toStr = dateRange.toDate || 'AllEnd';
  const fileName = `Arslan_Tax_Report_${fromStr}_to_${toStr}.pdf`;

  doc.save(fileName);
}
