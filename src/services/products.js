/**
 * FlowPOS Product Catalog & Category Service - Premium HD Catalog
 */

import { localDB } from '../offline/database.js';
import { supabaseClient } from './supabase.js';
import { auditService } from './audit.js';

export const INITIAL_CATEGORIES = [
  { id: 'cat-01', name: 'Specialty Coffee & Beans', slug: 'coffee', color_code: '#6366f1', icon: 'coffee' },
  { id: 'cat-02', name: 'Artisanal Bakery & Food', slug: 'bakery', color_code: '#f59e0b', icon: 'cake' },
  { id: 'cat-03', name: 'Organic Teas & Infusions', slug: 'teas', color_code: '#10b981', icon: 'leaf' },
  { id: 'cat-04', name: 'Gourmet Pantry', slug: 'pantry', color_code: '#8b5cf6', icon: 'package' },
  { id: 'cat-05', name: 'Handcrafted Drinkware', slug: 'drinkware', color_code: '#0ea5e9', icon: 'cup-soda' },
  { id: 'cat-06', name: 'Cold Pressed Juices & Tonics', slug: 'juices', color_code: '#ec4899', icon: 'apple' },
  { id: 'cat-07', name: 'Syrups & Botanicals', slug: 'syrups', color_code: '#14b8a6', icon: 'droplet' },
  { id: 'cat-08', name: 'Merchandise & Barista Gear', slug: 'merchandise', color_code: '#64748b', icon: 'shopping-bag' }
];

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'Ethiopian Yirgacheffe Single Origin 340g',
    description: 'Floral jasmine notes with bergamot and honey finish. Light roast.',
    sku: 'COF-ETH-001',
    barcode: '890123450001',
    category_id: 'cat-01',
    supplier_id: 'sup-01',
    cost_price: 1800,
    selling_price: 3800,
    tax_rate: 8.5,
    stock_quantity: 24,
    reorder_level: 6,
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80',
    is_active: true,
    variants: [
      { id: 'v-eth-250', name: '250g Whole Bean', price: 3200 },
      { id: 'v-eth-500', name: '500g Whole Bean', price: 5800 },
      { id: 'v-eth-1kg', name: '1kg Bulk Bag', price: 10500 }
    ],
    modifiers: [
      {
        name: 'Grind Preference',
        options: [
          { name: 'Whole Bean (Uncrushed)', price: 0 },
          { name: 'Espresso Fine Grind', price: 0 },
          { name: 'Filter / Chemex Medium', price: 0 },
          { name: 'French Press Coarse', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'prod-002',
    name: 'Guatemala Antigua Dark Roast 340g',
    description: 'Full-bodied with dark chocolate, spice, and smoky caramel.',
    sku: 'COF-GUA-002',
    barcode: '890123450002',
    category_id: 'cat-01',
    supplier_id: 'sup-01',
    cost_price: 1600,
    selling_price: 3500,
    tax_rate: 8.5,
    stock_quantity: 32,
    reorder_level: 8,
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-003',
    name: 'Flow Signature Espresso Blend 1kg',
    description: 'Balanced crema, hazelnut, candied orange, dark cocoa notes.',
    sku: 'COF-ESP-003',
    barcode: '890123450003',
    category_id: 'cat-01',
    supplier_id: 'sup-01',
    cost_price: 3800,
    selling_price: 7200,
    tax_rate: 8.5,
    stock_quantity: 15,
    reorder_level: 5,
    image_url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-004',
    name: 'Nitro Draft Cold Brew Can 330ml',
    description: 'Silky smooth micro-foam cascade with zero sugar and rich crema.',
    sku: 'COF-NIT-004',
    barcode: '890123450004',
    category_id: 'cat-01',
    supplier_id: 'sup-01',
    cost_price: 350,
    selling_price: 750,
    tax_rate: 8.5,
    stock_quantity: 40,
    reorder_level: 10,
    image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-005',
    name: 'Iced Vanilla Oat Milk Latte',
    description: 'Double espresso over ice with house-made vanilla bean and organic oat milk.',
    sku: 'COF-LAT-005',
    barcode: '890123450005',
    category_id: 'cat-01',
    supplier_id: 'sup-01',
    cost_price: 450,
    selling_price: 950,
    tax_rate: 8.5,
    stock_quantity: 50,
    reorder_level: 12,
    image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
    is_active: true,
    variants: [
      { id: 'v-lat-reg', name: 'Regular (12oz)', price: 950 },
      { id: 'v-lat-lrg', name: 'Large (16oz)', price: 1250 }
    ],
    modifiers: [
      {
        name: 'Milk Choice',
        options: [
          { name: 'Organic Oat Milk', price: 0 },
          { name: 'Almond Milk', price: 100 },
          { name: 'Dairy Whole Milk', price: 0 }
        ]
      },
      {
        name: 'Extra Boosts',
        options: [
          { name: 'Extra Espresso Shot', price: 200 },
          { name: 'Sugar-Free Caramel Syrup', price: 150 },
          { name: 'Sweet Cold Foam Top', price: 250 }
        ]
      }
    ]
  },
  {
    id: 'prod-006',
    name: 'French Pure Butter Croissant',
    description: 'Flaky 72-layer laminated European butter pastry, freshly baked.',
    sku: 'BAK-CRO-001',
    barcode: '890123450006',
    category_id: 'cat-02',
    supplier_id: 'sup-02',
    cost_price: 250,
    selling_price: 550,
    tax_rate: 8.5,
    stock_quantity: 45,
    reorder_level: 10,
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-007',
    name: 'Valrhona Pain au Chocolat',
    description: 'Handmade pastry filled with dual bars of 66% dark French chocolate.',
    sku: 'BAK-PAC-002',
    barcode: '890123450007',
    category_id: 'cat-02',
    supplier_id: 'sup-02',
    cost_price: 320,
    selling_price: 700,
    tax_rate: 8.5,
    stock_quantity: 28,
    reorder_level: 8,
    image_url: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-008',
    name: 'San Francisco Wild Sourdough Loaf',
    description: '36-hour slow fermented country bread with golden blistered crust.',
    sku: 'BAK-SOU-003',
    barcode: '890123450008',
    category_id: 'cat-02',
    supplier_id: 'sup-02',
    cost_price: 550,
    selling_price: 1300,
    tax_rate: 8.5,
    stock_quantity: 14,
    reorder_level: 4,
    image_url: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-009',
    name: 'Prosciutto & Truffle Panini',
    description: 'Aged prosciutto di Parma, melted buffalo mozzarella, and black truffle aioli.',
    sku: 'BAK-PAN-004',
    barcode: '890123450009',
    category_id: 'cat-02',
    supplier_id: 'sup-02',
    cost_price: 850,
    selling_price: 1950,
    tax_rate: 8.5,
    stock_quantity: 20,
    reorder_level: 5,
    image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-010',
    name: 'Smoked Salmon Everything Bagel',
    description: 'Wild Alaskan smoked salmon, dill whipped cream cheese, and capers.',
    sku: 'BAK-BAG-005',
    barcode: '890123450010',
    category_id: 'cat-02',
    supplier_id: 'sup-02',
    cost_price: 900,
    selling_price: 2100,
    tax_rate: 8.5,
    stock_quantity: 18,
    reorder_level: 4,
    image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-011',
    name: 'Blueberry Lemon Ricotta Scone',
    description: 'Tender crumb scone packed with wild Maine blueberries and lemon zest glaze.',
    sku: 'BAK-SCO-006',
    barcode: '890123450011',
    category_id: 'cat-02',
    supplier_id: 'sup-02',
    cost_price: 200,
    selling_price: 550,
    tax_rate: 8.5,
    stock_quantity: 22,
    reorder_level: 6,
    image_url: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-012',
    name: 'Kyoto Ceremonial Grade Matcha 50g',
    description: 'First harvest spring tencha stone ground in Uji, Japan.',
    sku: 'TEA-MAT-001',
    barcode: '890123450012',
    category_id: 'cat-03',
    supplier_id: 'sup-03',
    cost_price: 2600,
    selling_price: 5200,
    tax_rate: 8.5,
    stock_quantity: 22,
    reorder_level: 6,
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-013',
    name: 'High Mountain Jasmine Pearl Tea 100g',
    description: 'Hand-rolled silver tea pearls scented with fresh night-blooming jasmine.',
    sku: 'TEA-JAS-002',
    barcode: '890123450013',
    category_id: 'cat-03',
    supplier_id: 'sup-03',
    cost_price: 2100,
    selling_price: 4300,
    tax_rate: 8.5,
    stock_quantity: 16,
    reorder_level: 5,
    image_url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-014',
    name: 'Sparkling Hibiscus Berry Refresher',
    description: 'Egyptian organic hibiscus steeped with wild blackberries and crushed mint.',
    sku: 'TEA-HIB-003',
    barcode: '890123450014',
    category_id: 'cat-03',
    supplier_id: 'sup-03',
    cost_price: 220,
    selling_price: 650,
    tax_rate: 8.5,
    stock_quantity: 34,
    reorder_level: 8,
    image_url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-015',
    name: 'Iced Dragonfruit Lychee Spritz',
    description: 'Vibrant pink pitaya with sweet lychee nectar and sparkling mineral water.',
    sku: 'TEA-DRA-004',
    barcode: '890123450015',
    category_id: 'cat-03',
    supplier_id: 'sup-03',
    cost_price: 250,
    selling_price: 750,
    tax_rate: 8.5,
    stock_quantity: 26,
    reorder_level: 6,
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-016',
    name: 'Raw Wildflower Honeycomb Jar 350g',
    description: 'Harvested from sustainable apiaries in the Pacific Northwest.',
    sku: 'PAN-HON-001',
    barcode: '890123450016',
    category_id: 'cat-04',
    supplier_id: 'sup-03',
    cost_price: 1100,
    selling_price: 2450,
    tax_rate: 8.5,
    stock_quantity: 19,
    reorder_level: 5,
    image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-017',
    name: 'Organic Maple Pecan Granola 400g',
    description: 'Slow-baked rolled oats with pure Vermont maple syrup and sea salt.',
    sku: 'PAN-GRA-002',
    barcode: '890123450017',
    category_id: 'cat-04',
    supplier_id: 'sup-02',
    cost_price: 900,
    selling_price: 2100,
    tax_rate: 8.5,
    stock_quantity: 30,
    reorder_level: 8,
    image_url: 'https://images.unsplash.com/photo-1517093707767-f748eb03a563?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-018',
    name: 'Single Estate Fleur de Sel Dark Chocolate 80g',
    description: '70% Ecuadorian heirloom cacao with hand-harvested sea salt crystals.',
    sku: 'PAN-CHO-003',
    barcode: '890123450018',
    category_id: 'cat-04',
    supplier_id: 'sup-02',
    cost_price: 600,
    selling_price: 1350,
    tax_rate: 8.5,
    stock_quantity: 42,
    reorder_level: 10,
    image_url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-019',
    name: 'Matte Ceramic Latte Mug 350ml',
    description: 'Hand-thrown stoneware with speckle glaze and ergonomic comfort handle.',
    sku: 'DRI-MUG-001',
    barcode: '890123450019',
    category_id: 'cat-05',
    supplier_id: 'sup-01',
    cost_price: 1600,
    selling_price: 3600,
    tax_rate: 8.5,
    stock_quantity: 20,
    reorder_level: 4,
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-020',
    name: 'Double Wall Borosilicate Pour-Over Dripper',
    description: 'Heat-resistant spiral ribbed glass for optimal temperature control.',
    sku: 'DRI-POU-002',
    barcode: '890123450020',
    category_id: 'cat-05',
    supplier_id: 'sup-01',
    cost_price: 2400,
    selling_price: 5200,
    tax_rate: 8.5,
    stock_quantity: 12,
    reorder_level: 3,
    image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-021',
    name: 'Vacuum Insulated Stainless Tumbler 500ml',
    description: 'Triple-layer copper insulation; keeps drinks piping hot 12h or icy cold 24h.',
    sku: 'DRI-TUM-003',
    barcode: '890123450021',
    category_id: 'cat-05',
    supplier_id: 'sup-01',
    cost_price: 2200,
    selling_price: 4800,
    tax_rate: 8.5,
    stock_quantity: 16,
    reorder_level: 4,
    image_url: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-022',
    name: 'Green Radiance Cold Pressed Juice 350ml',
    description: 'Organic kale, English cucumber, green apple, fresh celery, and ginger root.',
    sku: 'JUI-GRE-001',
    barcode: '890123450022',
    category_id: 'cat-06',
    supplier_id: 'sup-03',
    cost_price: 450,
    selling_price: 950,
    tax_rate: 8.5,
    stock_quantity: 25,
    reorder_level: 6,
    image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-023',
    name: 'Citrus Turmeric Ginger Elixir 350ml',
    description: 'Fresh Valencia orange, cold-pressed turmeric, ginger root, and cayenne.',
    sku: 'JUI-TUR-002',
    barcode: '890123450023',
    category_id: 'cat-06',
    supplier_id: 'sup-03',
    cost_price: 480,
    selling_price: 980,
    tax_rate: 8.5,
    stock_quantity: 19,
    reorder_level: 5,
    image_url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-024',
    name: 'Madagascar Bourbon Vanilla Syrup 250ml',
    description: 'Slow-simmered with whole Madagascar vanilla beans and pure cane sugar.',
    sku: 'SYR-VAN-001',
    barcode: '890123450024',
    category_id: 'cat-07',
    supplier_id: 'sup-03',
    cost_price: 850,
    selling_price: 1950,
    tax_rate: 8.5,
    stock_quantity: 28,
    reorder_level: 6,
    image_url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-025',
    name: 'Heavyweight Organic Canvas Tote',
    description: '16oz raw organic cotton tote with reinforced dual handles and laptop sleeve.',
    sku: 'MER-TOT-001',
    barcode: '890123450025',
    category_id: 'cat-08',
    supplier_id: 'sup-01',
    cost_price: 1600,
    selling_price: 3600,
    tax_rate: 8.5,
    stock_quantity: 35,
    reorder_level: 8,
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
    is_active: true
  },
  {
    id: 'prod-026',
    name: 'Minimalist Heavyweight Barista Apron',
    description: 'Waterproof waxed canvas with brass rivets and cross-back leather straps.',
    sku: 'MER-APR-002',
    barcode: '890123450026',
    category_id: 'cat-08',
    supplier_id: 'sup-01',
    cost_price: 2400,
    selling_price: 5500,
    tax_rate: 8.5,
    stock_quantity: 18,
    reorder_level: 4,
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80',
    is_active: true
  }
];

class ProductService {
  async loadDemoCatalog() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('flowpos_db_seeded', 'true');
    }
    await localDB.putMany('categories', INITIAL_CATEGORIES);
    await localDB.putMany('products', INITIAL_PRODUCTS);
    
    if (supabaseClient.isConfigured()) {
      try {
        await supabaseClient.syncAllToCloud();
      } catch (err) {
        console.warn('Sync demo products to cloud warning:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:products-updated'));
    }
    return true;
  }

  async ensureSeeded() {
    const isWiped = typeof localStorage !== 'undefined' && localStorage.getItem('flowpos_db_seeded') === 'wiped';
    if (isWiped) {
      // User explicitly wiped demo data for real shop use - do not auto-reseed demo items
      return;
    }

    // When connected to Supabase cloud in real browser, rely on Cloud pull as source of truth and do not auto-inject demo data
    if (typeof window !== 'undefined' && supabaseClient.isConfigured()) {
      return;
    }

    const existingCats = await localDB.getAll('categories');
    if (existingCats.length === 0) {
      await localDB.putMany('categories', INITIAL_CATEGORIES);
    }
    const existingProds = await localDB.getAll('products');
    if (existingProds.length === 0) {
      await localDB.putMany('products', INITIAL_PRODUCTS);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('flowpos_db_seeded', 'true');
      }
    }
  }

  async getAllProducts() {
    await this.ensureSeeded();
    const prods = await localDB.getAll('products');
    const cats = await this.getCategories();
    const catMap = new Map(cats.map(c => [c.id, c]));
    return prods.map(p => {
      const cat = catMap.get(p.category_id);
      return {
        ...p,
        category_name: p.category_name || cat?.name || 'General',
        category_color: cat?.color_code || '#0071e3'
      };
    });
  }

  async getProductById(id) {
    return await localDB.getById('products', id);
  }

  async getProductByBarcode(code) {
    const prods = await this.getAllProducts();
    const clean = String(code).trim().toLowerCase();
    return prods.find(p => String(p.barcode).toLowerCase() === clean || String(p.sku).toLowerCase() === clean);
  }

  async getCategories() {
    await this.ensureSeeded();
    return await localDB.getAll('categories');
  }

  async saveCategory(category) {
    if (!category.id) {
      category.id = `cat-${Date.now()}`;
    }
    if (!category.slug) {
      category.slug = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    category.color_code = category.color_code || '#6366f1';
    category.icon = category.icon || 'layers';

    await localDB.put('categories', category);

    auditService.log({
      action: 'CATEGORY_SAVED',
      entity_type: 'categories',
      entity_id: category.id,
      details: { name: category.name, slug: category.slug }
    });

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    if (isOnline && supabaseClient.isConfigured()) {
      try {
        await supabaseClient.client.from('categories').upsert(category);
      } catch (err) {
        console.warn('Online category sync failed:', err);
      }
    }

    return category;
  }

  async deleteCategory(id) {
    await localDB.delete('categories', id);

    auditService.log({
      action: 'CATEGORY_DELETED',
      entity_type: 'categories',
      entity_id: id,
      details: { id }
    });

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    if (isOnline && supabaseClient.isConfigured()) {
      try {
        await supabaseClient.client.from('categories').delete().eq('id', id);
      } catch (err) {
        console.warn('Online category delete failed:', err);
      }
    }
  }

  async saveProduct(product) {
    if (!product.id) {
      product.id = `prod-${Date.now()}`;
      product.created_at = new Date().toISOString();
    }
    product.updated_at = new Date().toISOString();
    product.stock_quantity = Number(product.stock_quantity) || 0;
    product.cost_price = Number(product.cost_price) || 0;
    product.selling_price = Number(product.selling_price) || 0;
    if (product.is_active === undefined) product.is_active = true;

    await localDB.put('products', product);

    auditService.log({
      action: 'PRODUCT_SAVED',
      entity_type: 'products',
      entity_id: product.id,
      details: { name: product.name, sku: product.sku, price: product.selling_price }
    });

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    if (isOnline && supabaseClient.isConfigured()) {
      try {
        await supabaseClient.client.from('products').upsert(product);
      } catch (err) {
        console.warn('Online sync failed, stored locally in IndexedDB:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:products-updated', { detail: product }));
      window.dispatchEvent(new CustomEvent('flowpos:inventory-updated', { detail: product }));
    }
    return product;
  }

  async deleteProduct(id) {
    const prod = await this.getProductById(id);
    await localDB.delete('products', id);

    auditService.log({
      action: 'PRODUCT_DELETED',
      entity_type: 'products',
      entity_id: id,
      details: { name: prod?.name, sku: prod?.sku }
    });

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    if (isOnline && supabaseClient.isConfigured()) {
      try {
        await supabaseClient.client.from('products').delete().eq('id', id);
      } catch (err) {
        console.warn('Online delete sync failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:products-updated', { detail: { id, deleted: true } }));
      window.dispatchEvent(new CustomEvent('flowpos:inventory-updated'));
    }
  }

  async updateStock(id, delta) {
    const prod = await this.getProductById(id);
    if (!prod) return;
    prod.stock_quantity = Math.max(0, (prod.stock_quantity || 0) + delta);
    prod.updated_at = new Date().toISOString();
    await localDB.put('products', prod);

    auditService.log({
      action: 'STOCK_ADJUSTED',
      entity_type: 'products',
      entity_id: id,
      details: { delta, new_stock: prod.stock_quantity }
    });
    return prod;
  }
}

export const productService = new ProductService();
