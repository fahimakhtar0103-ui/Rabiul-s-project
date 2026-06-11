# Supabase Backend Architecture: LabourFlow

## 1. Integration Architecture Overview

LabourFlow uses a standard 3-tier architecture with **Supabase** acting as the Managed Database, Auth, and Storage provider. 
Because this is a **Single Contractor Application**, complexity is kept minimal. We don't need multi-tenant SaaS domains, just a secure, reliable backend for one business entity.

### Flow
1. **Frontend (React):** Authenticates the contractor via `@supabase/supabase-js`. Sends Bearer tokens (JWT) to the Express Backend.
2. **Backend (Express + Node.js):** Validates the Supabase JWT. Uses **Prisma ORM** to perform complex transaction logic (like the Double-Entry Ledger System).
3. **Supabase (Platform):**
   - **Postgres DB:** Stores all relational data via Prisma.
   - **Auth:** Handles secure login for the contractor.
   - **Storage:** Stores Worker identity documents (Aadhar, PAN card) securely.

---

## 2. Environment Variables Integration

The following variables manage the split connection strategy required by Supabase and Prisma:

```env
# 1. DATABASE CONNECTION (Prisma ORM)
# Uses Supabase PgBouncer (Port 6543) for connection pooling during app runtime
DATABASE_URL="postgres://postgres.[REF]:[PASS]@[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Uses direct connection (Port 5432) for running `npx prisma migrate deploy`
DIRECT_URL="postgres://postgres.[REF]:[PASS]@[REGION].pooler.supabase.com:5432/postgres"

# 2. SUPABASE SDK (Auth & Storage)
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="..."
```

---

## 3. Database Schema & Prisma Models

The database schema manages Sites, Labourers, Payroll snapshots, and Ledger Transactions. 
*(See `/prisma/schema.prisma` for the exact code generated in the previous phase).*

### Core Tables
1. **`Site`**: Physical project locations.
2. **`Labour`**: Worker profiles. Maintains a cached `currentDue`. 
3. **`Payroll`**: Monthly tracking snapshots.
4. **`LedgerTransaction`**: The source of truth for all financial movements (Debits/Credits).
5. **`DeductionType`**: Categorical lookup (Advance, Tools, PF).

---

## 4. Row Level Security (RLS) Strategy

Because this is a Single Contractor application, our RLS strategy is robust but simple: **Only Authenticated Users Get In.**

We do not need to check `user_id` on every row because the entire database belongs to the single contractor logged in via Supabase Auth.

### Standard RLS Policy applied to ALL tables:

```sql
-- Enable RLS on all tables
ALTER TABLE "Site" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Labour" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerTransaction" ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Create a blanket policy that allows FULL access, but ONLY to logged-in users
CREATE POLICY "Full access for contractor" 
ON "Site" 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
```

*Note: Since the Express Backend is using Prisma with the pooled connection string, it bypasses RLS if using a highly privileged role, or adheres to it if configured securely. To enforce RLS at the API layer, the Express app can pass the JWT to Postgres, or simply validate the JWT in Express middleware before allowing Prisma to query.*

---

## 5. Supabase Storage Structure

We utilize Supabase Storage buckets to manage uploaded documents securely.

### Bucket: `labour-documents`
- **Privacy:** `Private` (Files can only be accessed via signed URLs).
- **Structure:** `/{labourId}/{documentType}.{ext}`
  - Example: `/f47ac10b.../aadhar_front.jpg`
  - Example: `/f47ac10b.../pan_card.pdf`

### Storage Policies
```sql
-- Give the authenticated contractor full access to the bucket
CREATE POLICY "Contractor access to documents"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'labour-documents');
```

---

## 6. Implementation Plan: Prisma + Supabase

1. **Initialization:**
   - Create a Supabase project.
   - Get the pooled `DATABASE_URL` and `DIRECT_URL`.
   - Add them to `.env`.

2. **Schema Migration:**
   - Run `npx prisma migrate dev --name init`. This connects directly via `DIRECT_URL` to scaffold the tables in Supabase Postgres.

3. **Backend Middleware Generation:**
   - Implement `verifySupabaseToken(req, res, next)` in Express. This will block any API requests (`/api/ledger`, `/api/payroll`) that don't include an `Authorization: Bearer <SupabaseToken>` header.
   
4. **Storage Integration:**
   - When the contractor uploads an Aadhar card from the `/profile` UI, use the Supabase JS client to upload directly to the `labour-documents` bucket.
   - Save the returned Supabase path (e.g., `labour-documents/w1/aadhar.png`) into a new `documentUrl` field on the Prisma `Labour` model (Schema update required if this is needed).
