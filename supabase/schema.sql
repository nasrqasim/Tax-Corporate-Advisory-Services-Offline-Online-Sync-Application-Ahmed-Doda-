-- Ahmed Doda Tax & Corporate Advisory Services
-- Supabase PostgreSQL Schema for Cloud Synchronization
-- Generated for project: https://zoqtihnzebrxqarnvfap.supabase.co

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    father_name TEXT DEFAULT '',
    cnic TEXT NOT NULL,
    primary_mobile TEXT NOT NULL,
    secondary_mobile TEXT,
    whatsapp_number TEXT NOT NULL,
    address TEXT DEFAULT '',
    email TEXT,
    ntn_number TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    cnic_front_image TEXT,
    cnic_back_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_customers_cnic ON public.customers (cnic);
CREATE INDEX IF NOT EXISTS idx_customers_primary_mobile ON public.customers (primary_mobile);

-- 3. Tax Services Table
CREATE TABLE IF NOT EXISTS public.tax_services (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    tax_year TEXT NOT NULL,
    filing_status TEXT DEFAULT 'inquiry',
    agreed_fee NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    amount_paid NUMERIC(12,2) DEFAULT 0,
    outstanding_balance NUMERIC(12,2) DEFAULT 0,
    start_date TEXT,
    completion_date TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_tax_services_customer_id ON public.tax_services (customer_id);
CREATE INDEX IF NOT EXISTS idx_tax_services_tax_year ON public.tax_services (tax_year);

-- 4. Payment Transactions Table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES public.tax_services(id) ON DELETE SET NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT DEFAULT 'Cash',
    payment_date TEXT NOT NULL,
    tax_year TEXT,
    transaction_reference TEXT,
    received_by TEXT DEFAULT 'Staff Member',
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    status TEXT DEFAULT 'valid',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    sync_status TEXT DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payment_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payment_transactions (receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON public.payment_transactions (idempotency_key);

-- 5. Refund Records Table
CREATE TABLE IF NOT EXISTS public.refund_records (
    id TEXT PRIMARY KEY,
    original_transaction_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    service_id TEXT,
    receipt_number TEXT,
    amount NUMERIC(12,2) NOT NULL,
    refund_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    authorized_by TEXT DEFAULT 'Supervisor',
    idempotency_key TEXT UNIQUE,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Outbox Replication Journal Table
CREATE TABLE IF NOT EXISTS public.outbox_entries (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    operation TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    replicated_at TIMESTAMPTZ DEFAULT NOW(),
    client_timestamp TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_idempotency ON public.outbox_entries (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_outbox_entity ON public.outbox_entries (entity_type, entity_id);

-- 7. App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Row Level Security (RLS) Configuration
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read/write policies for authenticated staff and anon API access
DROP POLICY IF EXISTS "Allow anon all on customers" ON public.customers;
CREATE POLICY "Allow anon all on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on tax_services" ON public.tax_services;
CREATE POLICY "Allow anon all on tax_services" ON public.tax_services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on payment_transactions" ON public.payment_transactions;
CREATE POLICY "Allow anon all on payment_transactions" ON public.payment_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on refund_records" ON public.refund_records;
CREATE POLICY "Allow anon all on refund_records" ON public.refund_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on outbox_entries" ON public.outbox_entries;
CREATE POLICY "Allow anon all on outbox_entries" ON public.outbox_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on app_settings" ON public.app_settings;
CREATE POLICY "Allow anon all on app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon all on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 10. Storage Bucket & Policies for 'documents'
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow anon storage select on documents" ON storage.objects;
CREATE POLICY "Allow anon storage select on documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow anon storage insert on documents" ON storage.objects;
CREATE POLICY "Allow anon storage insert on documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow anon storage update on documents" ON storage.objects;
CREATE POLICY "Allow anon storage update on documents" ON storage.objects FOR UPDATE USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow anon storage delete on documents" ON storage.objects;
CREATE POLICY "Allow anon storage delete on documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents');

