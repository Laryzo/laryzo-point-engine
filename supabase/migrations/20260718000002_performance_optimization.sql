-- Performance Optimization Indexes

-- 1. Customers Table Indexes
CREATE INDEX IF NOT EXISTS idx_customers_parent_id ON public.customers(parent_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- 2. Transactions Table Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 3. Point History Table Indexes
CREATE INDEX IF NOT EXISTS idx_point_history_to_customer ON public.point_history(to_customer);
CREATE INDEX IF NOT EXISTS idx_point_history_transaction_id ON public.point_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_point_history_created_at ON public.point_history(created_at DESC);
