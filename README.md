# Offline-First Tax Customer Management System

**Android & Windows Desktop | Customer CRM | Tax Services | Accounts & Payments | Offline Sync | Secure Documents**

A complete, production-ready Offline-First Customer and Financial Accounts Management System built specifically for Pakistani tax-advisory firms, tax consultants, and advocates handling Income Tax Return Filing, NTN Registration, Sales Tax, and Corporate Advisory services.

---

## 1. Key Capabilities & Business Features

### 1.1 Customer CRM & Dedicated Multi-Mode Search
- **Comprehensive Profile**: Full Name, Father's Name, CNIC (13-digit format `XXXXX-XXXXXXX-X`), Primary Mobile, Secondary Mobile, WhatsApp Number, Address, Email, NTN, Notes, Status.
- **Dedicated 3-Tab Search Box (Offline SQLite Index)**:
  1. *Customer Name* (full and partial case-insensitive search).
  2. *Mobile Number* (normalized Pakistani formats: `03001234567`, `0300-1234567`, `+923001234567`).
  3. *CNIC Number* (13-digit normalized or dashed string).
- **Non-Destructive Duplicate Detection**: Flags matching CNICs or phone numbers with a warning alert while allowing authorized creation of distinct records without silent overwrites.
- **Direct Calling & WhatsApp Links**: One-click native calling via `tel:` and direct WhatsApp chat links with pre-filled greeting.

### 1.2 Tax Service & Multi-Year Filing Management
- **Multi-Year Support**: Record multiple services and tax years (e.g. Tax Year 2026, 2025, 2024, 2023, N/A) for a single customer without overwriting earlier historical returns.
- **Service Types**:
  - Income Tax Return Filing
  - NTN Registration (Individual / Business)
  - NTN Modification / Address Change
  - Sales Tax Registration & Monthly Filing
  - Withholding Tax Statements
  - Tax Consultation & FBR Notice Replies
- **Checklist Engine**: Pre-populated document requirement checklists tailored to each service type (Salary certificates, Bank statements, Wealth statements, Utility bills, Tenancy agreements).
- **Strict Workflow Separation**: Tax filing status (`inquiry`, `documents_pending`, `in_progress`, `review_required`, `filed`, `completed`) is kept strictly separate from financial payment status.

### 1.3 Critical Customer Payment & Accounts Module
- **Authoritative Ledger**: Financial calculations computed with decimal-safe integer precision in Pakistani Rupees (PKR).
- **Financial Formulas**:
  $$\text{Final Payable} = \text{Agreed Service Fee} - \text{Discount}$$
  $$\text{Net Payments Applied} = \sum(\text{Valid Payments}) - \sum(\text{Refunds/Reversals})$$
  $$\text{Outstanding Balance} = \text{Final Payable} - \text{Net Payments Applied}$$
- **Multi-Installment Support**: Customers can settle fees in multiple installments across different dates and payment methods (Cash, Bank Transfer, JazzCash, Easypaisa, Cheque).
- **Payment Statuses**: `Unpaid`, `Partially Paid`, `Paid`, `Overpaid`, `Refunded`, `Partially Refunded`, `Cancelled`.
- **Overpayment Policy**: Configurable in settings; warns if an amount exceeds the outstanding balance.
- **Controlled Refunds & Reversals**:
  - Original payments are never deleted from the ledger.
  - Mandatory audit reason and authorized supervisor username recorded.
  - Balances recalculate automatically.
- **Sequential Unique Receipt Numbers**: `REC-YYYY-XXXXX`.
- **Printable Receipts & Customer Statements**:
  - Official payment receipts with firm details, balance history, and client signature area.
  - Itemized Customer Account Statements across date ranges.

### 1.4 Offline-First Persistence & Synchronization Engine
- **Encrypted Local Database**: SQLite database schema with ACID transactions, foreign keys, and indexes.
- **Durable Local Outbox**: Every mutation (`INSERT`, `UPDATE`, `REFUND`, `REVERSAL`) is persisted locally first with a UUID-based `idempotencyKey`.
- **Network Retry Safety**: Retrying interrupted synchronization attempts will never produce duplicate payments or distorted account balances.
- **Cross-Platform Sync**: Full support for transactions entered on Android phones and Windows desktop computers.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Tailwind CSS, Lucide React |
| **Local Database** | Encrypted SQLite storage engine with transactional outbox |
| **Desktop Wrapper (Windows)** | Electron 34 (`electron/main.cjs`) + Tauri 2 Scaffolding (`src-tauri/`) |
| **Mobile Wrapper (Android)** | Capacitor 6 (`@capacitor/android`) with native Gradle build |
| **Cloud Database** | Firebase Cloud Firestore (`firestore.rules`) |
| **Cloud Storage** | Firebase Cloud Storage (`storage.rules`) |
| **Security & Crypto** | Web Crypto API (AES-256-GCM + PBKDF2), SHA-256 Checksums |
| **Testing Suite** | Vitest (32 automated unit and integration tests) |

---

## 3. Getting Started & Setup

### 3.1 Prerequisites
- Node.js (v20+ or v22+)
- npm (v10+)
- For Android builds: Android Studio / Android SDK (optional for desktop/web preview)

### 3.2 Installation
```bash
# Clone the repository
git clone <repo-url>
cd "Ahmed's Project"

# Install project dependencies
npm install
```

### 3.3 Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 4. Running on Windows Desktop

You can run the application on Windows in two ways:

### Option A: Direct Batch Launcher
Double-click `start-windows.bat` in the project root directory. It builds the production assets and launches the application in desktop window mode.

### Option B: Electron Desktop App
```bash
npm run build
npx electron .
```

---

## 5. Building for Android

The native Android platform has been added and configured via Capacitor 6:

```bash
# 1. Build the production React web bundle
npm run build

# 2. Sync web assets and plugins to Android project
npx cap sync android

# 3. Open in Android Studio or compile APK via Gradle:
cd android
./gradlew assembleDebug
```
The compiled Android APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 6. Running Automated Tests

A comprehensive suite of 32 automated unit and integration tests verifies all financial calculations, CNIC validators, duplicate detection, and offline persistence:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Coverage Highlights:
- **`src/tests/validation.test.ts`**:
  - CNIC 13-digit format, province detection (1-7), gender determination.
  - Pakistani mobile number normalization (`+92300...`) and telecom operator detection.
  - Duplicate customer detection by CNIC, phone, or name.
- **`src/tests/financial.test.ts`**:
  - Decimal-safe integer PKR calculations.
  - Multi-installment payment ledger and balance derivations.
  - Controlled refunds, partial refunds, and transaction reversals.
  - Multi-service aggregation for individual customers.
  - Sequential receipt number generator.
- **`src/tests/cross_device_sync.test.ts`**:
  - Offline payment simulation across Android and Windows.
  - Idempotent outbox replication without duplicate payment generation on retries.
- **`src/tests/offline_persistence.test.ts`**:
  - SQLite database operations, transactions, and search indexing.
  - AES-256-GCM encryption/decryption of sensitive documents.
  - Backup package generation with SHA-256 integrity verification and safe rollback restore.

---

## 7. Database Schema & Architecture

```
customers
├── id (TEXT PRIMARY KEY) - e.g. CUST-2026-0001
├── full_name (TEXT)
├── father_name (TEXT)
├── cnic (TEXT INDEXED) - 13-digit normalized
├── primary_mobile (TEXT INDEXED)
├── secondary_mobile (TEXT)
├── whatsapp_number (TEXT)
├── address (TEXT)
├── email (TEXT)
├── ntn_number (TEXT)
├── status (TEXT: 'active' | 'inactive')
├── notes (TEXT)
├── created_at (TEXT ISO)
├── updated_at (TEXT ISO)
└── version (INTEGER)

tax_services
├── id (TEXT PRIMARY KEY) - e.g. SRV-2025-0001
├── customer_id (TEXT FOREIGN KEY)
├── service_type (TEXT)
├── tax_year (TEXT) - e.g. "2025", "2026", "N/A"
├── start_date (TEXT ISO)
├── filing_deadline (TEXT ISO)
├── filing_status (TEXT: 'inquiry' | 'documents_pending' | 'in_progress' | 'review_required' | 'filed' | 'completed')
├── checklist (JSON ARRAY)
├── agreed_fee (INTEGER PKR)
├── discount (INTEGER PKR)
├── final_payable (INTEGER PKR)
├── amount_paid (INTEGER PKR - Derived)
├── outstanding_balance (INTEGER PKR - Derived)
├── payment_status (TEXT: 'unpaid' | 'partially_paid' | 'paid' | 'overpaid' | 'refunded' | 'partially_refunded')
└── version (INTEGER)

payment_transactions
├── id (TEXT PRIMARY KEY) - e.g. TXN-20261023-XXXXX
├── receipt_number (TEXT UNIQUE) - e.g. REC-2026-00101
├── customer_id (TEXT FOREIGN KEY)
├── service_id (TEXT FOREIGN KEY)
├── tax_year (TEXT)
├── amount (INTEGER PKR)
├── payment_method (TEXT: 'Cash' | 'Bank Transfer' | 'JazzCash' | 'Easypaisa' | 'Cheque')
├── payment_date (TEXT ISO)
├── transaction_reference (TEXT)
├── received_by (TEXT)
├── notes (TEXT)
├── status (TEXT: 'valid' | 'refunded' | 'partially_refunded' | 'reversed')
├── refunded_amount (INTEGER PKR)
├── reversal_reason (TEXT)
├── idempotency_key (TEXT UNIQUE)
└── version (INTEGER)

refund_records
├── id (TEXT PRIMARY KEY) - e.g. REF-20261023-XXXXX
├── original_transaction_id (TEXT FOREIGN KEY)
├── receipt_number (TEXT)
├── amount (INTEGER PKR)
├── refund_type (TEXT: 'full_refund' | 'partial_refund' | 'reversal')
├── reason (TEXT - Mandatory)
├── authorized_by (TEXT)
└── processed_at (TEXT ISO)

sync_outbox
├── id (TEXT PRIMARY KEY)
├── idempotency_key (TEXT UNIQUE)
├── operation (TEXT: 'INSERT' | 'UPDATE' | 'REFUND' | 'REVERSAL')
├── entity_type (TEXT)
├── entity_id (TEXT)
├── payload (JSON TEXT)
├── version (INTEGER)
├── attempt_count (INTEGER)
└── status (TEXT: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict')
```

---

## 8. Backup and Disaster Recovery

1. **Creating a Backup**:
   - Go to **Settings & Security** > **Backup & Disaster Recovery**.
   - Enter an optional master encryption password.
   - Click **Download Backup** to export a `.taxbackup` package containing encrypted database records and a SHA-256 verification hash.
2. **Restoring a Backup**:
   - Select the `.taxbackup` file.
   - Enter the encryption passphrase if encrypted.
   - The system verifies the SHA-256 checksum to prevent corruption or tampering.
   - An automatic pre-restore safety snapshot is created before applying records.

---

## 9. Security & Access Control

- **Client-Side AES-256-GCM Encryption**: Protects local sensitive data and document scans.
- **Role-Based Permissions**:
  - `Admin`: Full control over settings, users, backups, and financial reversals.
  - `Tax Consultant`: Manage customers, tax filings, and document checklists.
  - `Accountant / Cashier`: Record payments, issue receipts, and generate financial reports.
- **Sanitized Logging**: Plaintext passwords, tokens, and unmasked credentials are excluded from system logs.
- **Cloud Security Rules**: Provided in `firestore.rules` and `storage.rules`.

---

## 10. License

Proprietary — Developed for Al-Haq Tax & Corporate Advisory Services. All rights reserved.
