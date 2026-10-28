# Arslan Tax & Corporate Advisory Services

### Offline-First Tax Customer & Financial Accounts Management System
**Android & Windows Desktop | Offline-First Sync | Accounts & Payments Ledger | Multi-Year Tax Filings**

---

## 🏛️ Business & Developer Credentials

- **Business Name**: Arslan Tax & Corporate Advisory Services
- **NTN**: `7392814-2`
- **Office Address**: Winder, Hub, Balochistan, Pakistan
- **Official Email**: [arsalantaxcrm@gmail.com](mailto:arsalantaxcrm@gmail.com)
- **Software Developer Credit**: **Software by Roonjha Developers: 03152914836**
- **Live Production URL**: [https://arslan-tax-and-advisory-service-winder.vercel.app](https://arslan-tax-and-advisory-service-winder.vercel.app)
- **GitHub Repository**: [https://github.com/nasrqasim/Tax-Corporate-Advisory-Services-Offline-Online-Sync-Application-Ahmed-Doda-](https://github.com/nasrqasim/Tax-Corporate-Advisory-Services-Offline-Online-Sync-Application-Ahmed-Doda-)

---

## 🚀 Overview

A production-ready, offline-first Tax Customer and Financial Accounts Management System engineered specifically for Pakistani tax advisory firms, corporate consultants, and advocates handling:
- **Income Tax Return Filing** (Salaried, Business, AOP, Corporate)
- **NTN Registration & Modification** (Individual & Business)
- **Sales Tax Registration & Monthly Filings**
- **Withholding Tax Statements & FBR Notice Replies**
- **Customer Accounts, Payments, Ledger & Printable Receipts**

Built mobile-first for Android smartphones and tablets while delivering a rich desktop experience for Windows computers. The application operates 100% offline using an encrypted local storage engine with a durable, idempotent Outbox synchronization engine for cloud sync.

---

## ✨ Key Features & Capabilities

### 1. 📱 Mobile-First & Cross-Platform UI
- **Mobile Optimized**: Designed for Android with thumb-friendly touch targets (min 44px–48px), responsive bottom navigation, slide-over navigation drawer, and collapsible data cards.
- **Desktop Enhanced**: Full keyboard shortcuts (e.g. `Ctrl+K` customer search), multi-column desktop tables, and dual-pane layout.

### 2. 👥 Complete Customer Management (CRUD)
- **Add, View, Edit, Update**: Full customer profile management with immediate state synchronization.
- **Pakistani CNIC Validation**: 13-digit format `XXXXX-XXXXXXX-X` with province code detection and gender analysis.
- **Smart Phone & WhatsApp Handling**: Pakistani mobile number normalization (`03XX-XXXXXXX` / `+923XXXXXXXXX`). WhatsApp number automatically syncs with primary mobile number while allowing custom numbers if needed.
- **Safe Customer Deletion & Archival**: Protects accounting and tax audit integrity:
  - If a customer has linked tax services or payment history, records are safely archived/deactivated (`inactive`) rather than destructively deleted.
  - Zero-transaction records can be permanently deleted with confirmation.

### 3. 💰 Comprehensive Payment & Accounting Ledger
- **Authoritative Decimal-Safe Calculations**:
  $$\text{Final Payable} = \text{Agreed Service Fee} - \text{Discount}$$
  $$\text{Net Payments Applied} = \sum(\text{Valid Payments}) - \sum(\text{Refunds/Reversals})$$
  $$\text{Outstanding Balance} = \text{Final Payable} - \text{Net Payments Applied}$$
- **Multi-Installment Support**: Partial payments, full settlement, and advance tracking.
- **Payment Operations**: Add payment, view payment details, edit payments with automatic ledger recalculation, controlled reversals/refunds with audit logging.
- **Receipt Numbering**: Sequential unique receipt format `REC-YYYY-XXXXX`.
- **Payment Methods**: Cash, Bank Transfer, JazzCash, Easypaisa, Cheque.

### 4. 💬 WhatsApp Integration & Payment Sharing
- **1-Click WhatsApp Chat**: Directly opens `https://wa.me/92XXXXXXXXXX` using the customer's actual entered mobile number.
- **WhatsApp Tax Payment Confirmation**: Generates a professional, itemized receipt message including customer details, receipt number, tax year, amounts paid, outstanding/advance balance, and developer credit:
  ```text
  ARSLAN TAX & CORPORATE ADVISORY SERVICES
  Tax Payment Confirmation / Receipt
  Business Name: Arslan Tax & Corporate Advisory Services
  NTN: 7392814-2
  Address: Winder, Hub, Balochistan, Pakistan

  Dear [Customer Name],
  Your tax payment has been recorded successfully.
  ...
  Software by Roonjha Developers: 03152914836
  ```

### 5. 📑 Tax Services & Multi-Year Filings
- **Multi-Year Support**: Defaults to current tax year (`2026`) with freeform custom input, datalist suggestions, and 1-tap preset pills (`2026`, `2025`, `2024`, `2023`).
- **Checklist Engine**: Pre-populated required documents tailored to each service type.
- **Workflow Statuses**: `inquiry`, `documents_pending`, `in_progress`, `review_required`, `filed`, `completed`.

### 6. 🖨️ Receipts, Statements & Print Layouts
- **Printable Receipts**: Formal A4 and thermal-friendly receipt templates with signature areas.
- **Customer Account Statements**: Itemized statement across date ranges.
- **Developer Credit Guarantee**: `Software by Roonjha Developers: 03152914836` appears on every printed receipt, statement, and PDF report without being cut off by print margins.

### 7. 🔒 Security, Local Auth & Offline Outbox Sync
- **Encrypted Local Storage Engine**: ACID-compliant local transactions with durable backups.
- **Idempotent Outbox Synchronization**: Every create/update/refund operation generates a unique UUID `idempotencyKey`. Network retries will never produce duplicate records or distorted balances.
- **Staff Authentication & RBAC**:
  - Secure role-based access control (`super_admin`, `admin`, `consultant`, `accountant`, `staff`).
  - Passwords hashed with cryptographic salt using SHA-256.
  - Complete local audit trail with timestamps and user IDs.
  - Super Admin management panel in Settings to create administrators and manage security.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Tailwind CSS, Lucide React, Vite |
| **Cloud Database & Storage** | Supabase PostgreSQL & Supabase Storage (`@supabase/supabase-js`) |
| **Mobile Runtime (Android)** | Capacitor 6 (`@capacitor/android`, `@capacitor/core`, `@capacitor/cli`) |
| **Desktop Runtime (Windows)** | Electron 34 (`electron/main.cjs`) + Tauri 2 (`src-tauri/`) |
| **Cloud Deployment** | Vercel (`vercel.json`) |
| **Data Persistence** | Offline Encrypted Storage Engine with Durability Outbox |
| **Cryptographic Security** | Web Crypto API (AES-256-GCM, PBKDF2), SHA-256 Integrity Checksums |
| **Testing Suite** | Vitest (38 passing unit, integration, validation & Supabase tests) |

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ or v22+)
- [npm](https://www.npmjs.com/) (v10+)
- [Android Studio](https://developer.android.com/studio) (for building the native Android `.apk`)

### 1. Clone the Repository
```bash
git clone https://github.com/nasrqasim/Tax-Corporate-Advisory-Services-Offline-Online-Sync-Application-Ahmed-Doda-.git
cd Tax-Corporate-Advisory-Services-Offline-Online-Sync-Application-Ahmed-Doda-
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Run Automated Test Suite
```bash
npm test
```
Executes all 35 unit, validation, financial ledger, sync idempotency, and mobile-first tests.

### 5. Build for Production
```bash
npm run build
```
Generates the optimized production build in `dist/`.

---

## 📱 Android Native App Build

### 1. Sync Web Assets with Capacitor
```bash
npx cap sync android
```

### 2. Open in Android Studio
```bash
npx cap open android
```

### 3. Build Signed APK
In Android Studio:
1. Select **Build** > **Generate Signed Bundle / APK...**
2. Choose **APK** and select your keystore.
3. Select build variant `release` and click **Finish**.
4. The output `.apk` is ready for installation on any Android phone or tablet.

---

## 🖥️ Windows Desktop Build

### Run via Electron
```bash
npm run electron:dev
```

### Build Windows Installer
```bash
npm run electron:build
```

---

## 🌐 Live Cloud Deployment

The application is deployed on Vercel at:
**[https://arslan-tax-and-advisory-service-winder.vercel.app](https://arslan-tax-and-advisory-service-winder.vercel.app)**

To deploy your own instance to Vercel:
```bash
npx vercel --prod
```

---

## 📜 Official Developer Credit

```text
Software by Roonjha Developers: 03152914836
```
For technical support, custom tax software development, or cloud integrations, contact Roonjha Developers at `03152914836`.
