# 📖 FlowPOS — Complete Enterprise User Manual & Architecture Diagrams (A to Z)

**FlowPOS (Liquid Glass Edition)** is a modern, offline-first Point of Sale, Inventory, Kitchen Display, and Retail ERP platform built with native JavaScript, Tailwind CSS, IndexedDB, and Supabase Cloud Sync.

---

# 📑 Table of Contents

1. [System Architecture & Data Flow](#1-system-architecture--data-flow)
2. [Security, Authentication & Role Matrix (RBAC)](#2-security-authentication--role-matrix-rbac)
3. [Hardware & Peripheral Integration Guide](#3-hardware--peripheral-integration-guide)
4. [POS Counter & Checkout Workflow (A to Z)](#4-pos-counter--checkout-workflow-a-to-z)
5. [Kitchen Display System (KDS) & Order Prep](#5-kitchen-display-system-kds--order-prep)
6. [Catalog, Barcode Label Studio & Inventory Audit](#6-catalog-barcode-label-studio--inventory-audit)
7. [Supply Chain, Purchasing & Multi-Outlet Stores](#7-supply-chain-purchasing--multi-outlet-stores)
8. [Marketing, Smart Promotions & Gift Cards](#8-marketing-smart-promotions--gift-cards)
9. [Staff Time Clock & Timesheets](#9-staff-time-clock--timesheets)
10. [Offline-First Sync Engine & Cloud Database](#10-offline-first-sync-engine--cloud-database)
11. [Admin Settings & Customization Guide](#11-admin-settings--customization-guide)

---

# 1. System Architecture & Data Flow

FlowPOS uses an **Offline-First Reactive Architecture**. All reads and writes hit the high-speed local browser database (`IndexedDB`) first, giving sub-millisecond response times with 100% offline capability. Background synchronization engines stream changes to **Supabase (PostgreSQL)** in real time.

```mermaid
graph TB
    subgraph ClientLayer ["🖥️ FlowPOS Single-Page Application (Client Layer)"]
        UI["Modern Glassmorphism UI\n(HTML5 / TailwindCSS / Vanilla JS)"]
        State["Reactive State Stores\n(Cart, Theme, Session, Currency)"]
        Scanner["Hardware Scanner & Camera Engine\n(HID USB / WebRTC Video)"]
        Printer["Thermal Printer ESC/POS Engine\n(Bluetooth / WebUSB / Network IP)"]
    end

    subgraph StorageLayer ["💾 Local Offline Persistence Layer"]
        IDB[("IndexedDB Local DB\n(Products, Orders, Customers, Inventory)")]
        Queue["Offline Action Queue\n(Mutations pending cloud push)"]
    end

    subgraph CloudLayer ["☁️ Cloud Multi-Store Backend (Supabase)"]
        Postgres[("Cloud PostgreSQL Database")]
        Realtime["Real-time WebSocket Sync"]
        Auth["Admin RBAC Authentication"]
    end

    UI --> State
    State --> IDB
    IDB --> Queue
    Queue -->|Auto-Push on Reconnect| Postgres
    Realtime -->|Live Stream Changes| IDB
    Scanner --> UI
    UI --> Printer
```

---

# 2. Security, Authentication & Role Matrix (RBAC)

FlowPOS protects store financials using role-based access permissions, cashier PIN locks, and manager approval guardrails.

```mermaid
sequenceDiagram
    autonumber
    actor Staff as 👤 Cashier / Staff
    participant Lock as 🔒 Screen / PIN Pad
    participant Session as 🛡️ Session Manager
    participant App as 🖥️ POS Workspace

    Staff->>Lock: Enter 4-Digit Staff PIN or Password
    Lock->>Session: verifyCredentials(id, pin)
    alt Credentials Valid
        Session->>Session: Set Current Active User
        Session->>App: Unlock Workspace & Load Permission Mask
        App-->>Staff: Display Authorized Navigation Tabs
    else Invalid PIN
        Session-->>Lock: Reject with Haptic/Audio Shake
        Lock-->>Staff: "Invalid PIN code. Try again."
    end
```

### 👥 Staff Roles & Access Matrix

| Role | Process Sales | Manage Products | View Reports | Manage Inventory | Admin Settings | Override Discounts |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Owner / Executive Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Store Manager** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Cashier / Floor Staff** | ✅ | ❌ | ❌ | ❌ | ❌ | 🔒 *(Requires PIN)* |
| **Kitchen / Barista** | ✅ (KDS) | ❌ | ❌ | ❌ | ❌ | ❌ |

---

# 3. Hardware & Peripheral Integration Guide

FlowPOS connects natively to retail peripherals without requiring external proprietary drivers:

```mermaid
flowchart LR
    subgraph Inputs ["📥 Input Devices"]
        Cam["📱 Phone Camera\n(Rear / Front WebRTC)"]
        HID["🔫 USB / Bluetooth Barcode Gun\n(HID Keystroke Stream)"]
    end

    subgraph Core ["⚡ FlowPOS Engine"]
        Router["Debounce & Barcode Decoder\n(UPC-A, EAN-13, Code 128, QR)"]
        Cart["Cart Store & Pricing Engine"]
    end

    subgraph Outputs ["📤 Output Peripherals"]
        Receipt["🖨️ ESC/POS Thermal Printer\n(80mm / 58mm Roll)"]
        Drawer["💵 Cash Drawer\n(ESC/POS Pulse 24V)"]
        Pole["🖥️ Dual Customer Display\n(Live Cart & QR Pay)"]
    end

    Cam --> Router
    HID --> Router
    Router --> Cart
    Cart --> Receipt
    Cart --> Drawer
    Cart --> Pole
```

### ⚙️ Peripheral Configuration Steps:
1. **Phone Camera Barcode Scanner**:
   - Open **Store Settings ➔ Hardware & Devices**.
   - Set *Default Camera Facing Mode* to **Environment / Back Camera**.
   - Tap **Test Camera** to grant browser camera permissions.
2. **Thermal Receipt Printer (ESC/POS)**:
   - Select connection interface: **Browser Native Print**, **Web Bluetooth**, **WebUSB**, or **Network IP (Port 9100)**.
   - Toggle **Auto-Print on Checkout** and **Kick Cash Drawer**.
3. **Dual-Screen Customer Display**:
   - Click **Launch Screen** to open `#/customer-display` on a second monitor or iPad facing the customer. Live cart totals mirror in real time via `BroadcastChannel`.

---

# 4. POS Counter & Checkout Workflow (A to Z)

```mermaid
flowchart TD
    Start(["🛒 Customer Arrives with Items"]) --> Scan["Scan Barcode / Tap Product Card"]
    
    Scan --> CheckVariant{"Has Variants\nor Modifiers?"}
    CheckVariant -- Yes --> ModModal["Select Variant (Size/Weight)\n& Add-on Modifiers"] --> AddToCart
    CheckVariant -- No --> AddToCart["Add Item to Cart Store"]
    
    AddToCart --> ApplyPromos["⚡ Smart Promo Engine Evaluates:\n• Volume Discounts (5+ items)\n• Happy Hour Flash Deals\n• Cart Rule Reductions"]
    
    ApplyPromos --> AttachCust{"Attach Customer\n(Optional)?"}
    AttachCust -- Yes --> CustPoints["Apply Loyalty Points / Member Tier"] --> PayBtn["Click Checkout / Pay"]
    AttachCust -- No --> PayBtn
    
    PayBtn --> TenderChoice{"Choose Tender Method"}
    
    TenderChoice -- Cash --> TenderCash["Enter Cash Tendered\n(Use Quick Note Bills: 500, 1000, 5000)"]
    TenderChoice -- Card --> TenderCard["Process Card / Terminal"]
    TenderChoice -- Gift Card --> TenderGC["Scan / Enter Gift Card Code & Deduct"]
    TenderChoice -- Split --> TenderSplit["Split Bill across Multiple Tenders"]
    
    TenderCash --> ProcessSale["⚡ Execute Atomic Sale Transaction"]
    TenderCard --> ProcessSale
    TenderGC --> ProcessSale
    TenderSplit --> ProcessSale
    
    ProcessSale --> DeductStock["1. Deduct Stock Atoms\n2. Write Inventory Movement\n3. Save Order Record in LocalDB\n4. Accumulate Customer Loyalty\n5. Kick Cash Drawer Pulse"]
    
    DeductStock --> ReceiptModal["📄 Display Printable Thermal Receipt\n• 1-Click WhatsApp Receipt\n• Copy Digital Receipt Text"]
    ReceiptModal --> Complete(["✅ Transaction Complete"])
```

---

# 5. Kitchen Display System (KDS) & Order Prep

Designed for fast-casual restaurants, specialty coffee bars, and commercial kitchens:

```mermaid
stateDiagram-v2
    [*] --> OrderCreated: Sale Completed at POS Counter
    OrderCreated --> InPrep: Automatically Placed in Kitchen Queue
    
    state InPrep {
        [*] --> GreenTimer: < 5 Minutes Elapsed (🟢 Normal)
        GreenTimer --> AmberTimer: 5–10 Minutes Elapsed (🟡 Warning)
        AmberTimer --> RedTimer: > 10 Minutes Elapsed (🔴 Overdue Pulse)
    }

    InPrep --> ItemStruck: Barista taps item (Strikethrough individual item)
    ItemStruck --> InPrep: All items checked off
    
    InPrep --> Bumped: Kitchen staff taps "BUMP / READY"
    Bumped --> Completed: Order marked ready for pickup
    Completed --> InPrep: "Recall Last" tapped (Accidental bump recovery)
```

---

# 6. Catalog, Barcode Label Studio & Inventory Audit

```mermaid
graph TD
    subgraph ProductsManagement ["📦 Catalog & Variants Studio"]
        Product["Standard Product (SKU, Cost, Selling Price)"]
        Variant["Product Matrix (e.g. 250g, 500g, 1kg)"]
        Modifier["Custom Add-ons (e.g. Oat Milk, Extra Shot)"]
        Product --> Variant
        Product --> Modifier
    end

    subgraph LabelStudio ["🏷️ Barcode & Price Tag Studio"]
        SelectProds["Select Items & Quantities"]
        ChooseTemplate{"Choose Format"}
        ChooseTemplate --> Sheet30["30-Up A4 Sheet (Avery 5160)"]
        ChooseTemplate --> Sheet24["24-Up A4 Sheet (Avery L7159)"]
        ChooseTemplate --> Roll["Thermal Sticky Roll (50x30mm)"]
        ChooseTemplate --> Shelf["Shelf Talker Price Card"]
        Sheet30 --> PrintVector["🖨️ 1-Click Vector SVG Print"]
        Sheet24 --> PrintVector
        Roll --> PrintVector
        Shelf --> PrintVector
    end

    subgraph PhysicalAudit ["📦 Camera Stocktake Audit"]
        ShelfScan["Scan shelf with Smartphone Camera"]
        Compare["Compare Counted vs Database Expected"]
        Variance["Calculate Discrepancy & Net Financial Impact"]
        Reconcile["⚡ 1-Click Auto-Reconcile Database Stock"]
        ShelfScan --> Compare --> Variance --> Reconcile
    end
```

---

# 7. Supply Chain, Purchasing & Multi-Outlet Stores

```mermaid
sequenceDiagram
    autonumber
    actor Manager as 🏢 Store Manager
    participant PO as 📋 Purchase Orders Engine
    participant Supplier as 🚚 Supplier / Vendor
    participant WH as 📦 Central Warehouse
    participant Retail as 🏪 Branch Retail Store

    Manager->>PO: Create Purchase Order (Select Supplier & Items)
    PO->>PO: Status: DRAFT
    Manager->>PO: Submit Order (Status: ORDERED)
    Supplier-->>WH: Ship Physical Goods
    Manager->>PO: Receive Delivery & Enter Received Quantities
    PO->>WH: Atomically Increment Warehouse Inventory
    PO->>PO: Status: RECEIVED

    Note over WH,Retail: Inter-Branch Stock Transfer
    Manager->>WH: Initiate Transfer to Downtown Branch (50 units)
    WH->>WH: Deduct 50 from Warehouse
    WH->>Retail: Transfer in Transit
    Retail->>Retail: Acknowledge & Add 50 to Downtown Store
```

---

# 8. Marketing, Smart Promotions & Gift Cards

```mermaid
flowchart TD
    CartData["Current Cart Items & Subtotal"] --> PromoCheck{"Evaluate Active Promo Rules"}
    
    PromoCheck --> Rule1["Volume Discount\n(e.g., Buy 5+ items, Get 10% Off)"]
    PromoCheck --> Rule2["Happy Hour Flash Sale\n(e.g., 2:00 PM – 5:00 PM, 15% Off)"]
    PromoCheck --> Rule3["Spend Tier Reduction\n(e.g., Spend > Rs. 5000, Get Rs. 500 Off)"]
    
    Rule1 --> BestDiscount["Calculate Maximum Savings for Customer"]
    Rule2 --> BestDiscount
    Rule3 --> BestDiscount
    
    BestDiscount --> ApplyDiscount["Apply Discount Line to Basket Total"]
    
    subgraph GiftCardEngine ["🎟️ Gift Cards & Stored Value"]
        Issue["Issue New Gift Card (Code, Balance, Expiry)"]
        CheckBal["Look Up Real-Time Balance"]
        Redeem["Redeem at Checkout tender (Auto-deduct balance)"]
        Issue --> CheckBal --> Redeem
    end
```

---

# 9. Staff Time Clock & Timesheets

```mermaid
flowchart LR
    Staff["👤 Employee Arrives"] --> SelectEmp["Select Name from Staff List"]
    SelectEmp --> PinPad["Enter 4-Digit Secret PIN"]
    PinPad --> CheckShift{"Currently Clocked In?"}
    
    CheckShift -- No --> ClockIn["🟢 CLOCK IN\n• Record Start Timestamp\n• Update 'Who is on shift'"]
    CheckShift -- Yes --> ClockOut["🔴 CLOCK OUT\n• Calculate Total Duration\n• Calculate Shift Wages (Hours × Hourly Rate)\n• Append to Manager Timesheet"]
```

---

# 10. Offline-First Sync Engine & Cloud Database

FlowPOS guarantees zero downtime even if internet access drops during peak rush hours:

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as 🛒 Cashier
    participant LocalDB as 💾 Local IndexedDB
    participant Queue as 📥 Offline Queue
    participant Sync as 🔄 Sync Engine
    participant Supabase as ☁️ Supabase Cloud (PostgreSQL)

    Cashier->>LocalDB: Complete Sale (Zero Latency)
    LocalDB->>LocalDB: Deduct Stock & Write Order
    LocalDB->>Queue: Push 'INSERT_ORDER' Mutation

    alt Online Connected
        Queue->>Sync: Trigger Cloud Stream
        Sync->>Supabase: POST /rest/v1/orders (Idempotent UUID)
        Supabase-->>Sync: 201 Created
        Sync->>Queue: Clear Mutation from Queue
    else Internet Offline
        Note over Queue,Sync: Internet Dropped
        Queue->>Queue: Retain Mutations Safely in IndexedDB
        Note over Queue,Sync: Internet Restored
        Sync->>Sync: 'online' Event Triggered
        Sync->>Supabase: Batch Push Queued Transactions
        Supabase-->>Sync: Batch Sync Acknowledged
    end
```

---

# 11. Admin Settings & Customization Guide

Admin can configure every facet of FlowPOS under **Store Settings (`#/settings`)**:

### 🎨 1. Appearance & Themes
- **Theme Modes**: *Light Mode*, *Dark Mode (OLED Obsidian)*, or *System Default*.
- **Brand Accent Color Palette**: Choose from 6 curated neon presets (*Electric Blue `#0066CC`*, *Emerald Mint `#059669`*, *Royal Violet `#7c3aed`*, *Rose Pink `#e11d48`*, *Sunset Amber `#d97706`*, *Cyber Teal `#0891b2`*).
- **Typography Font**: *Outfit* (Modern POS), *Inter* (Clean UI), or *Monospace* (Terminal).

### 🏪 2. Store & White-Label Branding
- **Logo Upload**: Upload PNG/JPG brand logo that updates across lock screen, receipts, and dual screens.
- **Store Legal Profile**: Business name, tax registration number, phone, email, and address.
- **Thermal Receipt Customization**: Custom header branding and footer return policies.

### 💰 3. Currency, Tax & Pricing Engine
- **Multi-Currency**: Select base currency (*LKR, USD, EUR, GBP, AUD, CAD, INR, AED, SGD, JPY*).
- **Symbol & Formatting**: Set prefix/suffix position (e.g. `Rs. 500` vs `500 LKR`) and decimal places.
- **Tax Rules**: Configure default tax percentage, Tax Label (*VAT, GST, Sales Tax*), and tax-inclusive pricing.

### ⚡ 4. POS Register & Checkout Rules
- **Quick Cash Bill Presets**: Configure tender buttons (e.g. `500, 1000, 2000, 5000` or `5, 10, 20, 50, 100`).
- **Loyalty Program**: Set spend per 1 point (default `100`) and point cash redemption value (`Rs. 1.00`).
- **Manager Security Guardrails**: Require Manager PIN for order discounts > 20% and customer refunds.
- **Tipping**: Toggle customer tip prompt on checkout.

### 🖨️ 5. Hardware & Diagnostics
- **Live Test Bar**: 1-click tests to test camera scanner, test thermal print, kick cash drawer, and test customer screen.
- **Scanner HID latency**: Configure millisecond debounce threshold (30ms–100ms) for high-speed laser scanners.

### ☁️ 6. Cloud Multi-Store & Backup
- **Supabase Cloud Sync**: Input project URL and public Anon key for multi-terminal sync.
- **1-Click Full Backup**: Download JSON backup of all catalog items, customers, orders, and registers.
- **Demo Data Generator**: 1-click starter catalog population.

---

*FlowPOS — Built for Speed, Reliability, and Elegance.*
