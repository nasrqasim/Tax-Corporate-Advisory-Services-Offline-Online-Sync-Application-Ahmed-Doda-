/**
 * WhatsApp Tax Payment Sharing & Chat Generator
 * Implements authoritative payment receipt confirmation formatting
 * with exact business branding and developer credits.
 */

import { Customer } from '../../types/customer';
import { PaymentTransaction } from '../../types/payment';
import { TaxService } from '../../types/service';
import { BusinessProfile } from '../../types/settings';
import { formatLocalPhone, getWhatsAppUrl, validatePakistaniPhone } from '../validation/phone';
import { formatPKR } from '../financial/ledger';

export interface WhatsAppShareOptions {
  customer: Customer;
  payment: PaymentTransaction;
  service?: TaxService | null;
  businessProfile: BusinessProfile;
  previousBalance?: number;
  remainingBalance?: number;
}

export const DEVELOPER_CREDIT = 'Software by Roonjha Developers: 03152914836';

/**
 * Builds the official tax payment confirmation text message
 */
export function buildTaxPaymentWhatsAppMessage(options: WhatsAppShareOptions): string {
  const { customer, payment, service, businessProfile } = options;

  const paymentDate = payment.paymentDate ? payment.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const taxYear = service?.taxYear || payment.taxYear || '2025';
  
  // Calculate previous and remaining balances accurately
  const prevOutstanding = options.previousBalance !== undefined
    ? options.previousBalance
    : (service ? service.outstandingBalance + payment.amount : payment.amount);

  const remainingOutstanding = options.remainingBalance !== undefined
    ? options.remainingBalance
    : Math.max(0, prevOutstanding - payment.amount);

  const prevAdvance = 0;
  const remainingAdvance = remainingOutstanding < 0 ? Math.abs(remainingOutstanding) : 0;

  // Determine appropriate payment status label
  let paymentStatusLabel = 'Paid';
  if (remainingOutstanding > 0) {
    paymentStatusLabel = 'Partially Paid';
  } else if (remainingAdvance > 0) {
    paymentStatusLabel = 'Advance Available';
  } else {
    paymentStatusLabel = 'Fully Settled / Paid';
  }

  // Tax amount vs service charges breakdown
  const taxAmountPaid = payment.amount;
  const serviceCharges = service ? service.agreedFee : payment.amount;

  return [
    `ARSLAN TAX & CORPORATE ADVISORY SERVICES`,
    `Tax Payment Confirmation / Receipt`,
    `Business Name: ${businessProfile.officeName || 'Arslan Tax & Corporate Advisory Services'}`,
    `NTN: ${businessProfile.ntn || '7392814-2'}`,
    `Address: ${businessProfile.address || 'Winder, Hub, Balochistan, Pakistan'}`,
    ``,
    `Dear ${customer.fullName},`,
    `Your tax payment has been recorded successfully.`,
    ``,
    `Customer Details:`,
    `Customer Name: ${customer.fullName}`,
    `CNIC: ${customer.cnic || 'N/A'}`,
    `Mobile: ${formatLocalPhone(customer.primaryMobile)}`,
    `Tax Year / Period: Tax Year ${taxYear}`,
    `Receipt No.: ${payment.receiptNumber}`,
    `Payment Date: ${paymentDate}`,
    ``,
    `Current Payment:`,
    `Tax Amount Paid: ${formatPKR(taxAmountPaid)}`,
    `Service Charges: ${formatPKR(serviceCharges)}`,
    `Other Charges: Rs. 0`,
    `Total Amount Received: ${formatPKR(payment.amount)} (${payment.paymentMethod})`,
    ``,
    `Previous Balance:`,
    `Previous Advance/Credit: Rs. ${prevAdvance}`,
    `Previous Outstanding Amount: ${formatPKR(prevOutstanding)}`,
    ``,
    `Current Balance After Payment:`,
    `Remaining Advance/Credit: Rs. ${remainingAdvance}`,
    `Remaining Outstanding Amount: ${formatPKR(remainingOutstanding)}`,
    ``,
    `Payment Status: ${paymentStatusLabel}`,
    ``,
    `Thank you for choosing Arslan Tax & Corporate Advisory Services.`,
    `For assistance, please contact our office.`,
    ``,
    DEVELOPER_CREDIT
  ].join('\n');
}

/**
 * Opens WhatsApp sharing link for a payment confirmation
 */
export function sharePaymentOnWhatsApp(options: WhatsAppShareOptions): { success: boolean; message?: string } {
  const targetPhone = (options.customer.whatsappNumber && !options.customer.whatsappNumber.includes('3001234567')) ? options.customer.whatsappNumber : options.customer.primaryMobile;
  const validation = validatePakistaniPhone(targetPhone);
  
  if (!validation.isValid) {
    return {
      success: false,
      message: `Customer ${options.customer.fullName} does not have a valid Pakistani mobile number (${targetPhone}). Please edit customer and add a valid mobile number.`
    };
  }

  const messageText = buildTaxPaymentWhatsAppMessage(options);
  const waUrl = getWhatsAppUrl(targetPhone, messageText);

  if (typeof window !== 'undefined') {
    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return { success: true };
    } catch (e: any) {
      return { success: false, message: `Could not launch WhatsApp: ${e.message}` };
    }
  }

  return { success: false, message: 'Window environment not available.' };
}
