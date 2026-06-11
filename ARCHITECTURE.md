# LabourFlow Backend Architecture

## Phase A: Database Design & Core Strategy

The PostgreSQL database uses Prisma ORM and is designed to act as a strict financial ledger. The `schema.prisma` file establishes referential integrity between Site, Labour, Payroll, and Ledger Transactions.

### Key Architectural Decisions
1. **The Ledger is the Source of Truth:** `currentDue` on the `Labour` table is a cached snapshot of the running balance. It is exclusively updated via strict database transactions when a `LedgerTransaction` is created.
2. **Double-Entry Logic (Contractor's Perspective):** 
   - **Credit (Cr):** Increases Contractor's liability to Labour (e.g., Gross Salary generation).
   - **Debit (Dr):** Decreases Contractor's liability (e.g., Payments made, Advances given, Canteen/Rashan deductions).
   - **Closing Due** = Sum of Credits - Sum of Debits. This naturally supports infinite carry-forward across months.
3. **No Duplicate Calculations:** `Payroll` table stores monthly snapshots (Gross Salary, worked days) for reporting. The actual financial impact is passed to the `LedgerTransaction` table as a Credit.

## Phase B: API Specification

The REST API exposes the core engines. All responses follow a standard `{ success: true, data: {}, error?: string }` wrapper.

### 1. Labour & Site API
- `GET /api/sites` - List all active sites with aggregated active labour count.
- `GET /api/labour?siteId={id}` - List labour, optionally filtered by site.
- `POST /api/labour` - Onboard new labourer (Max 100 limit validated at controller).

### 2. Transaction & Deduction API
- `POST /api/ledger/deduction` - Record mid-month deduction (Advance/Tools/Rashan). Creates a `Dr` ledger entry immediately.
- `POST /api/ledger/payment` - Record payout to labour (Cash/Bank/UPI). Creates a `Dr` ledger entry immediately.

### 3. Payroll API
- `POST /api/payroll/generate` - Close the month. Accepts `labourId`, `month`, `year`, `presentDays`. Computes Gross Salary and posts a `Cr` ledger entry.
- `GET /api/payroll/summary?month={m}&year={y}` - Fetch aggregated site-wide gross, deductions, and net payable.

### 4. Reporting API
- `GET /api/reports/ledger/:labourId/pdf` - Generates PDF passbook.
- `GET /api/reports/payroll/excel` - Generates Excel sheet for bank bulk transfers.

## Phase C: Service Layer Design

The backend logic is decoupled from Express controllers via dedicated Service Classes. 

### 1. `LedgerEngine` Service
Handles all ACID-compliant financial movements using Prisma `$transaction`. 
Ensures that a `LedgerTransaction` insertion and the `Labour.currentDue` update succeed or fail together.

### 2. `PayrollEngine` Service
Aggegates attendance data.
**Formula Applied:** `Gross Salary = presentDays * dailyRate`.
Instead of calculating a separate "Net" that gets messy with mid-month advances, the engine posts the exact `Gross Salary` as a Credit to the Ledger. The Ledger's natural balance calculation (`Previous Due + Gross Salary - Previous Advances`) inherently represents the accurate Net Payable.

### 3. `ExportService`
Uses `pdfkit` and `exceljs` to transform Ledger queries into standard streamable buffers.

## Phase D: Implementation Roadmap

### Step 1: Database Provisioning & Seed
- [x] Prisma Schema definition (`/prisma/schema.prisma`).
- [ ] Run `npx prisma db push` to synchronize PostgreSQL.
- [ ] Create seed scripts for initial Site and standard DeductionTypes (Advance, Canteen).

### Step 2: Core Engine Development
- [x] Implement `LedgerEngine` (ACID transactions, Debits/Credits).
- [x] Implement `PayrollEngine` (Rule enforcement, delegation to Ledger).

### Step 3: REST Controllers & Routing
- [ ] Mount `/api/*` routes in Express.
- [ ] Implement Zod validation middleware for all incoming payloads.

### Step 4: Export Modules
- [ ] Build Excel builder template for monthly gross/net dumps.
- [ ] Build PDF builder template for Labour Passbooks.

### Step 5: Frontend Integration Strategy
- [ ] Expose global Axios instance in React.
- [ ] Wire up dashboard metrics to `GET /api/payroll/summary`.
- [ ] Wire up Payment modal to `POST /api/ledger/payment`.
