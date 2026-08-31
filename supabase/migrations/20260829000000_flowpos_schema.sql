-- ==========================================================
-- FlowPOS Relational PostgreSQL Schema & Security Policies
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STORES & LOCATIONS
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  tax_id VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  currency VARCHAR(10) DEFAULT 'USD',
  currency_symbol VARCHAR(10) DEFAULT '$',
  receipt_header TEXT DEFAULT 'Welcome to FlowPOS Retail Store',
  receipt_footer TEXT DEFAULT 'Thank you for shopping with us! Please keep your receipt for 30-day returns.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  address TEXT,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROLES, PERMISSIONS & PROFILES
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
  permission_id VARCHAR(100) REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- Supabase auth.users reference if using Supabase Auth
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role_id VARCHAR(50) REFERENCES roles(id) DEFAULT 'CASHIER',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES & BRANDS
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  color_code VARCHAR(50) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'tag',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  website VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 5. PRODUCTS & VARIANTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) NOT NULL UNIQUE,
  barcode VARCHAR(100) UNIQUE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5, 2) DEFAULT 8.50,
  stock_quantity INT NOT NULL DEFAULT 0,
  reorder_level INT DEFAULT 5,
  image_url TEXT,
  track_inventory BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  barcode VARCHAR(100) UNIQUE,
  cost_price NUMERIC(12, 2),
  selling_price NUMERIC(12, 2) NOT NULL,
  stock_quantity INT DEFAULT 0,
  options JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVENTORY & MOVEMENTS
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  movement_type VARCHAR(50) NOT NULL, -- 'sale', 'refund', 'receiving', 'adjustment', 'transfer'
  quantity INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  reference_id VARCHAR(100), -- order_id, po_id, etc.
  reason TEXT,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number VARCHAR(100) NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled'
  total_cost NUMERIC(12, 2) DEFAULT 0.00,
  expected_delivery DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_cost NUMERIC(12, 2) NOT NULL,
  total_cost NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CUSTOMERS & LOYALTY
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) UNIQUE,
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

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  points_change INT NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'earned', 'redeemed', 'adjusted'
  order_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. REGISTERS & SESSIONS
CREATE TABLE IF NOT EXISTS registers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS register_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  register_id UUID REFERENCES registers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  closing_cash_expected NUMERIC(12, 2),
  closing_cash_actual NUMERIC(12, 2),
  cash_difference NUMERIC(12, 2),
  total_cash_sales NUMERIC(12, 2) DEFAULT 0.00,
  total_card_sales NUMERIC(12, 2) DEFAULT 0.00,
  total_mobile_sales NUMERIC(12, 2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed'
  notes TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES register_sessions(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL, -- 'in', 'out'
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ORDERS, PAYMENTS & REFUNDS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(100) NOT NULL UNIQUE,
  session_id UUID REFERENCES register_sessions(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_type VARCHAR(50) DEFAULT 'percentage',
  discount_value NUMERIC(12, 2) DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5, 2) DEFAULT 8.50,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(50) DEFAULT 'paid', -- 'paid', 'partially_refunded', 'refunded'
  fulfillment_status VARCHAR(50) DEFAULT 'completed',
  notes TEXT,
  idempotency_key VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  line_total NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL, -- 'cash', 'card', 'mobile'
  amount NUMERIC(12, 2) NOT NULL,
  amount_tendered NUMERIC(12, 2),
  change_due NUMERIC(12, 2) DEFAULT 0.00,
  reference_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refund_number VARCHAR(100) NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
  refund_amount NUMERIC(12, 2) NOT NULL,
  refund_method VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refund_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refund_id UUID REFERENCES refunds(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL,
  refund_amount NUMERIC(12, 2) NOT NULL,
  restocked BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. INDEXES
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 13. ATOMIC STORED PROCEDURES (ACID)
CREATE OR REPLACE FUNCTION process_pos_sale(order_payload JSONB)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID := uuid_generate_v4();
  v_order_number VARCHAR(100);
  v_item RECORD;
  v_payment RECORD;
  v_current_stock INT;
  v_new_stock INT;
  v_customer_id UUID;
  v_total_amount NUMERIC;
BEGIN
  -- Extract or generate order number
  v_order_number := COALESCE(order_payload->>'order_number', 'ORD-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random() * 9000 + 1000)::text);
  v_total_amount := (order_payload->>'total_amount')::NUMERIC;
  v_customer_id := (order_payload->>'customer_id')::UUID;

  -- 1. Insert into orders table
  INSERT INTO orders (
    id, order_number, cashier_id, customer_id, subtotal, discount_amount,
    discount_type, discount_value, tax_amount, tax_rate, total_amount,
    notes, idempotency_key, created_at
  ) VALUES (
    v_order_id,
    v_order_number,
    (order_payload->>'cashier_id')::UUID,
    v_customer_id,
    (order_payload->>'subtotal')::NUMERIC,
    (order_payload->>'discount_amount')::NUMERIC,
    COALESCE(order_payload->>'discount_type', 'percentage'),
    (order_payload->>'discount_value')::NUMERIC,
    (order_payload->>'tax_amount')::NUMERIC,
    (order_payload->>'tax_rate')::NUMERIC,
    v_total_amount,
    order_payload->>'notes',
    order_payload->>'idempotency_key',
    NOW()
  );

  -- 2. Process line items and inventory deduction
  FOR v_item IN SELECT * FROM jsonb_to_recordset(order_payload->'items') AS x(
    product_id UUID, product_name TEXT, quantity INT, unit_price NUMERIC, line_total NUMERIC
  )
  LOOP
    -- Insert order item
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
    VALUES (v_order_id, v_item.product_id, v_item.product_name, v_item.quantity, v_item.unit_price, v_item.line_total);

    -- Get current stock and lock row
    SELECT stock_quantity INTO v_current_stock FROM products WHERE id = v_item.product_id FOR UPDATE;
    v_new_stock := GREATEST(0, COALESCE(v_current_stock, 0) - v_item.quantity);

    -- Deduct stock
    UPDATE products SET stock_quantity = v_new_stock, updated_at = NOW() WHERE id = v_item.product_id;

    -- Record movement
    INSERT INTO inventory_movements (
      product_id, movement_type, quantity, previous_stock, new_stock, reference_id, reason, performed_by
    ) VALUES (
      v_item.product_id, 'sale', -v_item.quantity, v_current_stock, v_new_stock, v_order_number, 'POS Cashier Sale', (order_payload->>'cashier_id')::UUID
    );
  END LOOP;

  -- 3. Record payments
  FOR v_payment IN SELECT * FROM jsonb_to_recordset(order_payload->'payments') AS p(
    payment_method VARCHAR, amount NUMERIC, amount_tendered NUMERIC, change_due NUMERIC, reference_number VARCHAR
  )
  LOOP
    INSERT INTO payments (order_id, payment_method, amount, amount_tendered, change_due, reference_number)
    VALUES (v_order_id, v_payment.payment_method, v_payment.amount, v_payment.amount_tendered, v_payment.change_due, v_payment.reference_number);
  END LOOP;

  -- 4. Loyalty points accrual (1 point per dollar spent)
  IF v_customer_id IS NOT NULL THEN
    UPDATE customers
    SET loyalty_points = loyalty_points + floor(v_total_amount)::INT,
        total_spend = total_spend + v_total_amount,
        order_count = order_count + 1,
        updated_at = NOW()
    WHERE id = v_customer_id;

    INSERT INTO loyalty_transactions (customer_id, points_change, transaction_type, order_id, description)
    VALUES (v_customer_id, floor(v_total_amount)::INT, 'earned', v_order_id, 'Points earned for Order ' || v_order_number);
  END IF;

  -- 5. Audit log
  INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
  VALUES (
    (order_payload->>'cashier_id')::UUID,
    'COMPLETED_SALE',
    'orders',
    v_order_id::text,
    jsonb_build_object('order_number', v_order_number, 'total', v_total_amount)
  );

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number);
END;
$$ LANGUAGE plpgsql;

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated staff
CREATE POLICY "Allow read stores to authenticated" ON stores FOR SELECT USING (true);
CREATE POLICY "Allow read locations to authenticated" ON locations FOR SELECT USING (true);
CREATE POLICY "Allow read profiles to authenticated" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow read products to authenticated" ON products FOR SELECT USING (true);
CREATE POLICY "Allow read categories to authenticated" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow read suppliers to authenticated" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Allow read customers to authenticated" ON customers FOR SELECT USING (true);
CREATE POLICY "Allow read orders to authenticated" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow read order_items to authenticated" ON order_items FOR SELECT USING (true);
CREATE POLICY "Allow read payments to authenticated" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow read registers to authenticated" ON registers FOR SELECT USING (true);
CREATE POLICY "Allow read register_sessions to authenticated" ON register_sessions FOR SELECT USING (true);
