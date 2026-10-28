# Mobile-First Application Audit: Offline-First Tax System

**Application**: Arslan Tax & Corporate Advisory Services  
**System**: Offline-First Tax Customer & Financial Accounts System  
**NTN**: 7392814-2  
**Business Location**: Winder, Hub, Balochistan, Pakistan  
**Audit Date**: 2026-10-23  

---

## 1. Project & Architecture Inspection

- **Frontend Core**: React 18, TypeScript 5.7, Tailwind CSS 3.4, Lucide React icons.
- **Packaging Layers**:
  - **Windows Desktop**: Electron 34 (`electron/main.cjs`, `electron/preload.js`), plus standalone browser PWA (`start-windows.bat`).
  - **Android Native Platform**: Capacitor 6 (`capacitor.config.ts`, `android/` directory with full native Gradle wrapper, AndroidManifest.xml).
  - **Cross-Platform Scaffolding**: Tauri 2 (`src-tauri/tauri.conf.json`, `Cargo.toml`).
- **Database & Storage Layer**:
  - **Local Persistence**: SQLite database engine abstraction (`src/services/sqlite/db.ts`) with `SafeStorage` wrapper (compatible with Web, Android WebView, Electron, and Node.js).
  - **Security & Encryption**: Web Crypto API implementing AES-256-GCM encryption with PBKDF2 key derivation and SHA-256 integrity checksums (`src/services/security/crypto.ts`).
  - **Offline Outbox & Idempotency**: Durable transactional queue (`sync_outbox`) with UUID `idempotencyKey` preventing duplicate payments during network retries.
  - **Cloud Synchronization**: Bidirectional Firestore sync engine (`src/services/sync/firestoreSync.ts`) and private Cloud Storage (`storage.rules`, `firestore.rules`).
- **Current Baseline Test Status**:
  - 4 test files, 32 unit and integration tests passing at 100% (`npm test`).
  - TypeScript strict type check passes with 0 errors (`npx tsc --noEmit`).
  - Vite production bundle compiles cleanly (`dist/` 380 kB JS, 30 kB CSS).

---

## 2. Desktop vs. Mobile Breakdown & Audit Findings

| Component / Screen | Current Desktop Implementation | Mobile Limitations (Screen Width 320–430px) | Planned Mobile-First Solution |
|---|---|---|---|
| **App Shell & Layout** | Fixed left sidebar (`w-64`), top desktop navbar. | Fixed sidebar occupies ~80% of phone screen; top navbar crowded with role dropdown and desktop search input. | Responsive App Shell: Bottom Navigation Bar on mobile for core sections (Dashboard, Customers, Search, Payments, More Drawer). Desktop sidebar remains visible only on `lg:` monitors. |
| **Top Navbar** | Full title, NTN pill, search button with Ctrl+K shortcut, sync badge, role selector. | Overflows on screens < 400px; role selector and sync badge truncate or cause line wraps. | Compact mobile header: Firm initials avatar, truncated branding with NTN indicator, compact sync pill, slide-out drawer trigger. Role selector moved to More menu on mobile. |
| **Customer List** | Wide `table` (7 columns: Name, CNIC, Contact, Payable, Paid, Balance, Actions). | Requires horizontal scrolling; buttons tiny; hard to tap on touchscreens. | Adaptive Layout: Desktop retains full 7-column table. Mobile renders rich touch-friendly Customer Cards with status badges, quick Call/WhatsApp pills, balance breakdown, and large tap targets (min 44px). |
| **Customer Profile** | 6-card financial grid, desktop tabs, wide services table, desktop receipt actions. | 6-column grid crushes numbers; tabs take multiple rows; table scrolls horizontally. | Mobile: 2-column or 3-column financial metric cards; horizontally scrollable tab pills; service cards with collapsible details; sticky bottom quick-action bar (Call, WhatsApp, Pay). |
| **Customer Add/Edit Form** | 2-column modal (`max-w-2xl`), desktop file upload areas. | Keyboard covers inputs; multi-column layout is cramped; small tap targets. | Single-column form on mobile; sections grouped logically; `inputMode="numeric"` for CNIC & Mobile; touch-friendly Camera/Gallery picker for CNIC front/back. |
| **Dedicated Customer Search** | 3 desktop tabs, side-by-side search results and customer preview on large screens. | Multi-column layout forces results to shrink into tiny left pane; input overflows. | Stacked mobile view: prominent 3-mode selector buttons; full-width search input with clear button; instant result cards with direct Call/WhatsApp and Profile links. |
| **Tax Services View** | 4-filter dropdown bar + 9-column desktop table. | Dropdowns stack awkwardly; 9 columns cannot fit on 360px portrait screen. | Compact filter drawer / collapsible bar; service cards showing tax year, filing status, fee, and balance pill on mobile; full table on desktop. |
| **Receive Payment Dialog** | Modal with 2-column grids and small action buttons. | Can extend beyond mobile viewport height; overpayment warnings cramped. | Fullscreen or scrollable bottom-sheet modal on mobile; large numeric input with Rs. prefix; clear summary cards; instant receipt generation. |
| **Payment History View** | Desktop filter bar + 9-column transaction table. | Filters take 4 rows; table unreadable without scrolling. | Transaction card stream on mobile (Receipt #, Date, Method, Customer, Amount in green/amber); full table on desktop. |
| **Receipts & Statements** | Fixed desktop print preview modal with 800px width. | Truncated horizontally on phone screens; action buttons pushed off-screen. | Responsive preview container fitting viewport width (100%), with zoomable receipt card; `@media print` remains 100% desktop-ready and pixel-perfect for printers and PDF exports. |
| **Financial Reports** | 9-button grid + complex tables for 10 reports. | 9 buttons crowd screen; tables require heavy horizontal scroll. | Categorized dropdown/accordion report selector on mobile; mobile cards summarizing top debtors, daily collections, and tax year breakdowns. |
| **Backup & Settings** | 2-column desktop grid for Office Profile and Security/Backup. | Crushed side by side on mobile. | Responsive single-column stack on mobile, clean file upload triggers, passkey inputs, and status badges. |

---

## 3. Business Branding Update Requirements

- **Firm Name**: `Arslan Tax & Corporate Advisory Services` (strictly everywhere).
- **Firm NTN**: `7392814-2` (must be preserved verbatim).
- **System Name**: `Offline-First Tax Customer & Financial Accounts System`.
- **Address**: `Winder, Hub, Balochistan, Pakistan`.
- **Hotline / Contact**: `+923001234567` / `+923219876543`.
- **Email**: `contact@ahmeddodatax.pk`.

---

## 4. Non-Functional & Device Requirements

1. **Android Safe Areas**: Respect system top status bar (`padding-top: env(safe-area-inset-top)`) and bottom navigation pill (`padding-bottom: env(safe-area-inset-bottom)`).
2. **Virtual Keyboard Resilience**: Modals must be scrollable (`max-h-[90dvh]` or `max-h-[92vh]`) to prevent primary buttons (Save, Cancel, Pay) from being buried beneath the soft keyboard.
3. **Numeric Keyboards**: Fields such as CNIC, Mobile, Agreed Fee, and Amount Paid must specify `inputMode="numeric"` or `type="tel"` / `type="number"`.
4. **Desktop Integrity**: All desktop features (sidebar, Ctrl+K shortcut, 7-9 column data tables, detailed reports, multi-column forms, print styling) MUST remain completely intact on screens `>= 1024px` (`lg:`).
