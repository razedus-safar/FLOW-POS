-- ==========================================================
-- FlowPOS Production-Quality Retail Seed Data
-- ==========================================================

-- 1. STORE & LOCATION
INSERT INTO stores (id, name, legal_name, tax_id, phone, email, address, city, state, zip_code, currency, currency_symbol, receipt_header, receipt_footer)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'FlowPOS Artisan Market & Café',
  'Flow Retail Ventures LLC',
  'US-TAX-88492019',
  '+1 (555) 234-5678',
  'contact@flowpos.store',
  '742 Evergreen Promenade, Suite 100',
  'San Francisco',
  'CA',
  '94107',
  'USD',
  '$',
  'FlowPOS Artisan Market & Café\nSpecialty Roasts & Gourmet Provisions',
  'Thank you for shopping local! Returns accepted within 30 days with receipt.'
) ON CONFLICT DO NOTHING;

INSERT INTO locations (id, store_id, name, code, address, phone)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Main Street Flagship Store',
  'LOC-SFO-01',
  '742 Evergreen Promenade, Suite 100',
  '+1 (555) 234-5678'
) ON CONFLICT DO NOTHING;

-- 2. ROLES
INSERT INTO roles (id, name, description) VALUES
  ('OWNER', 'Store Owner', 'Full unrestricted administrative access to all stores, financial records, and settings.'),
  ('MANAGER', 'Store Manager', 'Manages daily inventory, purchase orders, customer refunds, and cashier registers.'),
  ('CASHIER', 'Cashier', 'Operates POS terminal, processes sales, customer discounts, and receipt printing.'),
  ('INVENTORY', 'Inventory Specialist', 'Receives vendor shipments, adjusts stock counts, and handles supplier orders.')
ON CONFLICT DO NOTHING;

-- 3. PROFILES
INSERT INTO profiles (id, store_id, name, email, role_id, avatar_url) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Elena Vance', 'elena@flowpos.store', 'OWNER', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Marcus Chen', 'marcus@flowpos.store', 'MANAGER', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Sophia Rodriguez', 'sophia@flowpos.store', 'CASHIER', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Liam Davies', 'liam@flowpos.store', 'CASHIER', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Aria Thorne', 'aria@flowpos.store', 'INVENTORY', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80')
ON CONFLICT DO NOTHING;

-- 4. CATEGORIES
INSERT INTO categories (id, name, slug, color_code, icon, sort_order) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Specialty Coffee & Beans', 'coffee-beans', '#6366f1', 'coffee', 1),
  ('d0000000-0000-0000-0000-000000000002', 'Artisanal Bakery', 'bakery', '#f59e0b', 'cake', 2),
  ('d0000000-0000-0000-0000-000000000003', 'Organic Teas', 'teas', '#10b981', 'leaf', 3),
  ('d0000000-0000-0000-0000-000000000004', 'Gourmet Pantry', 'pantry', '#8b5cf6', 'package', 4),
  ('d0000000-0000-0000-0000-000000000005', 'Handcrafted Drinkware', 'drinkware', '#0ea5e9', 'cup-soda', 5),
  ('d0000000-0000-0000-0000-000000000006', 'Cold Pressed Juices', 'juices', '#ec4899', 'apple', 6),
  ('d0000000-0000-0000-0000-000000000007', 'Syrups & Botanicals', 'syrups', '#14b8a6', 'droplet', 7),
  ('d0000000-0000-0000-0000-000000000008', 'Merchandise & Goods', 'merchandise', '#64748b', 'shopping-bag', 8)
ON CONFLICT DO NOTHING;

-- 5. SUPPLIERS
INSERT INTO suppliers (id, name, contact_person, email, phone, address, lead_time_days, payment_terms) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Pacific Coast Roasters Inc.', 'David Miller', 'david@pacificroasters.com', '+1 (555) 301-4499', '88 Pier Blvd, Seattle, WA', 3, 'Net 30'),
  ('e0000000-0000-0000-0000-000000000002', 'Golden Grain Mill & Bakery Supply', 'Sarah Jenkins', 'orders@goldengrain.com', '+1 (555) 782-1200', '410 Harvest Way, Portland, OR', 2, 'Net 15'),
  ('e0000000-0000-0000-0000-000000000003', 'Mountain Crest Botanical Extracts', 'Julian Fox', 'supplies@mountaincrest.org', '+1 (555) 902-8833', '12 Alpine Road, Boulder, CO', 5, 'Net 30')
ON CONFLICT DO NOTHING;

-- 6. PRODUCTS (30+ Retail Products)
INSERT INTO products (id, name, description, sku, barcode, category_id, supplier_id, cost_price, selling_price, tax_rate, stock_quantity, reorder_level, image_url) VALUES
  -- Category 1: Coffee & Beans
  ('f0000000-0000-0000-0000-000000000001', 'Ethiopian Yirgacheffe Single Origin 340g', 'Floral notes with bergamot and honey finish. Light roast.', 'COF-ETH-001', '890123450001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 9.50, 19.50, 8.50, 24, 6, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000002', 'Guatemala Antigua Dark Roast 340g', 'Full-bodied with dark chocolate, spice, and smoky caramel.', 'COF-GUA-002', '890123450002', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 8.75, 18.00, 8.50, 32, 8, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000003', 'Flow Signature Espresso Blend 1kg', 'Balanced crema, hazelnut, candied orange, dark cocoa notes.', 'COF-ESP-003', '890123450003', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 16.00, 34.00, 8.50, 15, 5, 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000004', 'Colombian Supremo Decaf 340g', 'Swiss water processed decaf with brown sugar and walnut notes.', 'COF-COL-004', '890123450004', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 9.00, 18.50, 8.50, 18, 5, 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=500&auto=format&fit=crop&q=80'),

  -- Category 2: Artisanal Bakery
  ('f0000000-0000-0000-0000-000000000005', 'French Butter Croissant', 'Flaky 72-layer laminated European butter pastry, freshly baked.', 'BAK-CRO-001', '890123450005', 'd0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 1.60, 4.75, 8.50, 45, 10, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000006', 'Valrhona Pain au Chocolat', 'Handmade pastry filled with dual bars of 66% dark chocolate.', 'BAK-PAC-002', '890123450006', 'd0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 1.90, 5.50, 8.50, 28, 8, 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000007', 'San Francisco Wild Sourdough Loaf', '36-hour slow fermented country bread with golden blistered crust.', 'BAK-SOU-003', '890123450007', 'd0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 2.80, 8.50, 8.50, 14, 4, 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000008', 'Almond Frangipane Brioche', 'Toasted sliced almonds with vanilla bourbon frangipane cream.', 'BAK-ALM-004', '890123450008', 'd0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 2.20, 6.25, 8.50, 3, 5, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80'),

  -- Category 3: Organic Teas
  ('f0000000-0000-0000-0000-000000000009', 'Kyoto Ceremonial Grade Matcha 50g', 'First harvest spring tencha stone ground in Uji, Japan.', 'TEA-MAT-001', '890123450009', 'd0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 14.50, 29.00, 8.50, 22, 6, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000010', 'High Mountain Jasmine Pearl Tea 100g', 'Hand-rolled silver tea pearls scented with fresh jasmine blossoms.', 'TEA-JAS-002', '890123450010', 'd0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 11.00, 24.00, 8.50, 16, 5, 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000011', 'Earl Grey Lavender Reserve 100g', 'Organic Assam black tea with cold-pressed Italian bergamot oil.', 'TEA-EGL-003', '890123450011', 'd0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 7.50, 16.50, 8.50, 26, 6, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80'),

  -- Category 4: Gourmet Pantry
  ('f0000000-0000-0000-0000-000000000012', 'Raw Wildflower Honeycomb Jar 350g', 'Harvested from sustainable apiaries in the Pacific Northwest.', 'PAN-HON-001', '890123450012', 'd0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', 6.00, 14.50, 8.50, 19, 5, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000013', 'Organic Maple Pecan Granola 400g', 'Slow-baked rolled oats with pure Vermont maple syrup and sea salt.', 'PAN-GRA-002', '890123450013', 'd0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 4.50, 11.00, 8.50, 30, 8, 'https://images.unsplash.com/photo-1517093707767-f748eb03a563?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000014', 'Single Estate Sea Salt Dark Chocolate 80g', '70% Ecuadorian heirloom cacao with hand-harvested fleur de sel.', 'PAN-CHO-003', '890123450014', 'd0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 3.00, 7.50, 8.50, 42, 10, 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80'),

  -- Category 5: Handcrafted Drinkware
  ('f0000000-0000-0000-0000-000000000015', 'Matte Ceramic Latte Mug 350ml', 'Hand-thrown stoneware with speckle glaze and ergonomic handle.', 'DRI-MUG-001', '890123450015', 'd0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 9.00, 24.00, 8.50, 20, 4, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000016', 'Double Wall Glass Pour-Over Dripper', 'Borosilicate heat-resistant glass for optimal thermal brewing.', 'DRI-POU-002', '890123450016', 'd0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 14.00, 32.00, 8.50, 12, 3, 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000017', 'Vacuum Insulated Tumbler 500ml', 'Triple-layer stainless steel, keeps drinks hot 12h or icy 24h.', 'DRI-TUM-003', '890123450017', 'd0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 12.50, 28.50, 8.50, 17, 4, 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=500&auto=format&fit=crop&q=80'),

  -- Category 6: Cold-Pressed Juices
  ('f0000000-0000-0000-0000-000000000018', 'Green Radiance Cold Pressed 350ml', 'Kale, cucumber, crisp green apple, lemon, and ginger root.', 'JUI-GRE-001', '890123450018', 'd0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000003', 3.20, 8.50, 8.50, 25, 6, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000019', 'Citrus Turmeric Elixir 350ml', 'Valencia orange, grapefruit, fresh turmeric, and cayenne.', 'JUI-TUR-002', '890123450019', 'd0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000003', 3.40, 8.75, 8.50, 19, 5, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&auto=format&fit=crop&q=80'),

  -- Category 7: Syrups & Botanicals
  ('f0000000-0000-0000-0000-000000000020', 'Madagascar Vanilla Bean Syrup 250ml', 'Infused with real Bourbon vanilla beans and organic cane sugar.', 'SYR-VAN-001', '890123450020', 'd0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000003', 4.80, 12.50, 8.50, 28, 6, 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=500&auto=format&fit=crop&q=80'),
  ('f0000000-0000-0000-0000-000000000021', 'Lavender Rose Floral Infusion 250ml', 'Distilled floral botanical elixir for artisanal beverages.', 'SYR-LAV-002', '890123450021', 'd0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000003', 5.20, 13.50, 8.50, 14, 4, 'https://images.unsplash.com/photo-1546853020-ca4909aef454?w=500&auto=format&fit=crop&q=80'),

  -- Category 8: Merchandise
  ('f0000000-0000-0000-0000-000000000022', 'Heavyweight Organic Canvas Tote', '16oz raw cotton tote with reinforced handles and interior pocket.', 'MER-TOT-001', '890123450022', 'd0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000001', 7.00, 22.00, 8.50, 35, 8, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=80')
ON CONFLICT DO NOTHING;

-- 7. CUSTOMERS (Loyalty Profiles)
INSERT INTO customers (id, name, phone, email, address, loyalty_points, tier, total_spend, order_count) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Claire Beaumont', '+1 (555) 412-8801', 'claire.b@example.com', '450 Marina Blvd, San Francisco, CA', 340, 'Gold', 485.50, 18),
  ('10000000-0000-0000-0000-000000000002', 'Ethan Walker', '+1 (555) 623-1194', 'ewalker@example.com', '128 Mission St, San Francisco, CA', 180, 'Silver', 220.00, 9),
  ('10000000-0000-0000-0000-000000000003', 'Dr. Hiroshi Tanaka', '+1 (555) 890-4412', 'hiroshi.t@meduniv.org', '77 Parnassus Ave, San Francisco, CA', 620, 'Platinum', 890.25, 34),
  ('10000000-0000-0000-0000-000000000004', 'Olivia Sterling', '+1 (555) 309-7751', 'olivia.s@designer.io', '320 Hayes St, San Francisco, CA', 95, 'Bronze', 115.00, 4),
  ('10000000-0000-0000-0000-000000000005', 'Mateo Rossi', '+1 (555) 745-9920', 'mateo.rossi@coffeeclub.net', '19 Columbus Ave, San Francisco, CA', 410, 'Gold', 560.75, 21)
ON CONFLICT DO NOTHING;

-- 8. REGISTERS & INITIAL SESSION
INSERT INTO registers (id, name, code, is_active) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Main Checkout Terminal #1', 'REG-MAIN-01', TRUE),
  ('20000000-0000-0000-0000-000000000002', 'Express Barista Terminal #2', 'REG-BAR-02', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO register_sessions (id, register_id, user_id, opening_cash, total_cash_sales, total_card_sales, total_mobile_sales, status, notes)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000003',
  250.00,
  148.50,
  382.75,
  89.00,
  'open',
  'Morning shift register opening float'
) ON CONFLICT DO NOTHING;
