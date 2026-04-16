-- NinsiimaWallet — Neon Postgres Schema
-- Run this in the Neon SQL Editor to set up your database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Admins (email-based auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Categories (income & expense, with 50/30/20 bucket)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',  -- 'income' or 'expense'
  budget_bucket TEXT DEFAULT 'wants',    -- 'needs', 'wants', 'savings_debt' (for 50/30/20)
  color TEXT DEFAULT '#6b7280',
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Transactions (income & expenses)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'expense',  -- 'income' or 'expense'
  amount NUMERIC NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence TEXT,  -- 'monthly', 'weekly', or NULL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Budgets (per category per month)
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL,  -- 'YYYY-MM'
  budgeted_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, month)
);

-- ============================================================
-- Debts
-- ============================================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creditor TEXT,
  original_amount NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  interest_rate_monthly NUMERIC NOT NULL DEFAULT 0,  -- e.g. 2.5 for 2.5%/month
  minimum_payment NUMERIC NOT NULL DEFAULT 0,
  start_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' or 'paid_off'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Debt Payments
-- ============================================================
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Savings Accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'fixed',  -- 'fixed', 'emergency', 'shared_investment'
  current_balance NUMERIC NOT NULL DEFAULT 0,
  target_amount NUMERIC,
  annual_rate NUMERIC,   -- e.g. 8.0 for 8%/year (for daily accrual)
  goal_label TEXT,
  partners TEXT,          -- e.g. "With John & Peter"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Savings Transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_account_id UUID REFERENCES savings_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'deposit',  -- 'deposit' or 'withdrawal'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Assets (equity / valuables)
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',  -- 'property', 'vehicle', 'investment', 'other'
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Receivables (money others owe you - loans you've given)
-- ============================================================
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- e.g. "Loan to John"
  person TEXT,                             -- who owes you
  original_amount NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,  -- remaining to be paid back
  interest_rate_monthly NUMERIC DEFAULT 0,
  start_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active',   -- 'active', 'paid_off', 'overdue'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Receivable Payments (payments received back from borrowers)
-- ============================================================
CREATE TABLE IF NOT EXISTS receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID REFERENCES receivables(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Net Worth Snapshots (monthly)
-- ============================================================
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL UNIQUE,  -- 'YYYY-MM'
  total_assets NUMERIC NOT NULL DEFAULT 0,
  total_savings NUMERIC NOT NULL DEFAULT 0,
  total_debts NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_savings_tx_account ON savings_transactions(savings_account_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivable_payments ON receivable_payments(receivable_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_month ON net_worth_snapshots(month);

-- ============================================================
-- Seed: default categories
-- ============================================================
INSERT INTO categories (name, type, budget_bucket, color) VALUES
  -- Income categories
  ('Salary',           'income',  NULL,           '#16a34a'),
  ('Business Income',  'income',  NULL,           '#059669'),
  ('Freelance',        'income',  NULL,           '#0d9488'),
  ('Other Income',     'income',  NULL,           '#6b7280'),
  -- Expense categories: Needs
  ('Rent',             'expense', 'needs',        '#dc2626'),
  ('Utilities',        'expense', 'needs',        '#ea580c'),
  ('Transport',        'expense', 'needs',        '#d97706'),
  ('Food',             'expense', 'needs',        '#ca8a04'),
  ('Healthcare',       'expense', 'needs',        '#e11d48'),
  ('Education',        'expense', 'needs',        '#7c3aed'),
  -- Expense categories: Wants
  ('Personal Expense', 'expense', 'wants',        '#8b5cf6'),
  ('Entertainment',    'expense', 'wants',        '#ec4899'),
  ('Clothing',         'expense', 'wants',        '#f472b6'),
  ('Subscriptions',    'expense', 'wants',        '#6366f1'),
  -- Expense categories: Business (tagged as wants for 50/30/20)
  ('Business Expense', 'expense', 'wants',        '#0ea5e9'),
  -- Other
  ('Family Expense',   'expense', 'needs',        '#ef4444'),
  ('Other Expense',    'expense', 'wants',        '#9ca3af')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: admin account
-- password: Vision2040
-- Hash: node -e "require('bcryptjs').hash('Vision2040', 10).then(h => console.log(h))"
-- ============================================================
INSERT INTO admins (email, name, password_hash) VALUES
  ('ninsiima@wallet.com', 'Ninsiima', '$2b$10$NDmKQyVJes9nq5duXVvwOeR/a6ERuK6G4fTkdgLme3ifNvyefoVUW')
ON CONFLICT (email) DO NOTHING;
