-- ==========================================================
-- FlowPOS Relational PostgreSQL Schema & Security Policies
-- Full Cloud Persistence for Staff Users, Passwords, PINs,
-- Settings, Catalog, Sales, and Realtime Multi-Device Sync
-- ==========================================================

-- Drop existing tables to refresh clean
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS time_punches CASCADE;
DROP TABLE IF EXISTS gift_cards CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS outlets CASCADE;
DROP TABLE IF EXISTS register_sessions CASCADE;
DROP TABLE IF EXISTS registers CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS stores CASCADE;

-- 1. USERS & STAFF CREDENTIALS (Admin, Cashiers, Passwords, 4-digit PINs)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'CASHIER',
  email VARCHAR(255),
  pin VARCHAR(20) DEFAULT '1234',
  password VARCHAR(255) DEFAULT 'admin',
  avatar TEXT,
  title VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STORE SETTINGS & BRANDING CONFIGURATION
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  color_code VARCHAR(50) DEFAULT '#0071e3',
  icon VARCHAR(50) DEFAULT 'tag',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  lead_time_days INT DEFAULT 3,
  payment_terms VARCHAR(100) DEFAULT 'Net 30',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCTS & CATALOG
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  category_id VARCHAR(255) REFERENCES categories(id) ON DELETE SET NULL,
  category_name VARCHAR(255),
  category_color VARCHAR(50),
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5, 2) DEFAULT 0.00,
  stock_quantity INT NOT NULL DEFAULT 0,
  reorder_level INT DEFAULT 5,
  image_url TEXT,
  track_inventory BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CUSTOMERS & LOYALTY
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  loyalty_points INT DEFAULT 0,
  tier VARCHAR(50) DEFAULT 'Bronze',
  total_spend NUMERIC(12, 2) DEFAULT 0.00,
  order_count INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDERS & SALES RECEIPTS
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(255) PRIMARY KEY,
  order_number VARCHAR(100),
  customer_id VARCHAR(255) REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) DEFAULT 'Walk-in Guest',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(50) DEFAULT 'cash',
  status VARCHAR(50) DEFAULT 'completed',
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. INVENTORY MOVEMENTS
CREATE TABLE IF NOT EXISTS inventory_movements (
  id VARCHAR(255) PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  sku VARCHAR(100),
  movement_type VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  reference_id VARCHAR(100),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PROMOTIONS & MARKETING
CREATE TABLE IF NOT EXISTS promotions (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'percentage',
  value NUMERIC(12, 2) DEFAULT 0,
  category_id VARCHAR(255),
  min_order_amount NUMERIC(12, 2) DEFAULT 0,
  min_items INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  badge VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. GIFT CARDS & STORE CREDITS
CREATE TABLE IF NOT EXISTS gift_cards (
  id VARCHAR(255) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  initial_balance NUMERIC(12, 2) NOT NULL,
  current_balance NUMERIC(12, 2) NOT NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 11. TIME CLOCK & SHIFT TIMESHEETS
CREATE TABLE IF NOT EXISTS time_punches (
  id VARCHAR(255) PRIMARY KEY,
  employee_id VARCHAR(255),
  employee_name VARCHAR(255),
  role VARCHAR(50),
  hourly_rate NUMERIC(12, 2) DEFAULT 0,
  punch_in TIMESTAMPTZ NOT NULL,
  punch_out TIMESTAMPTZ,
  total_hours NUMERIC(8, 2),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. STORE OUTLETS
CREATE TABLE IF NOT EXISTS outlets (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  phone VARCHAR(50),
  is_warehouse BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Full client read & write access for anon & authenticated
-- ==========================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all settings" ON settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all categories" ON categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all suppliers" ON suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all products" ON products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all customers" ON customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all orders" ON orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all inventory_movements" ON inventory_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all promotions" ON promotions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all gift_cards" ON gift_cards FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all time_punches" ON time_punches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all outlets" ON outlets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable Supabase Realtime across all relevant POS tables
ALTER PUBLICATION supabase_realtime ADD TABLE users, settings, products, categories, orders, customers;
