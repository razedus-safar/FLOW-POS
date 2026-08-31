/**
 * FlowPOS Barcode & Price Tag Label Studio
 * Generate and print custom sticky labels, 30-up Avery sheets, thermal roll labels, and shelf tags
 */

import JsBarcode from 'jsbarcode';
import { productService } from '../services/products.js';
import { settingsService } from '../services/settings.js';
import { formatCurrency } from '../utils/currency.js';
import { renderIcon } from '../utils/icons.js';
import { toast } from '../components/Toast.js';

export class BarcodeLabelsPage {
  constructor(container) {
    this.container = container;
    this.products = [];
    this.categories = [];
    this.selectedProducts = new Map(); // productId -> quantity of labels
    this.template = '30_up'; // '30_up' | '24_up' | 'thermal_roll' | 'shelf_tag'
    this.barcodeFormat = 'CODE128'; // 'CODE128' | 'EAN13'
    this.showStoreName = true;
    this.showPrice = true;
    this.showSku = true;
    this.init();
  }

  async init() {
    [this.products, this.categories] = await Promise.all([
      productService.getAllProducts(),
      productService.getCategories()
    ]);

    // Pre-select first 6 products with 1 label each as starter
    if (this.products.length > 0) {
      this.products.slice(0, 6).forEach(p => {
        this.selectedProducts.set(p.id, 2);
      });
    }

    this.render();
    this.attachEvents();
  }

  render() {
    const settings = settingsService.getSettings();
    const store = settings?.store || {};
    const storeName = store.name || 'FlowPOS Store';

    // Generate product selector list
    const productRowsHtml = this.products.map(p => {
      const isSelected = this.selectedProducts.has(p.id);
      const qty = this.selectedProducts.get(p.id) || 1;
      return `
        <div class="flex items-center justify-between p-2.5 rounded-[14px] glass-card border border-[var(--line)] hover:border-[var(--accent)] transition select-none">
          <label class="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer">
            <input type="checkbox" data-prod-check="${p.id}" ${isSelected ? 'checked' : ''} class="rounded text-[var(--accent)]" />
            <div class="truncate">
              <h4 class="text-xs font-bold text-[var(--text)] truncate">${p.name}</h4>
              <p class="text-[10px] text-[var(--muted)] font-mono truncate">${p.barcode || p.sku} &bull; ${formatCurrency(p.selling_price || p.price || 0)}</p>
            </div>
          </label>
          <div class="flex items-center space-x-1.5 flex-shrink-0 pl-2">
            <span class="text-[10px] text-[var(--muted)] font-bold">Qty:</span>
            <input
              type="number"
              min="1"
              max="200"
              value="${qty}"
              data-prod-qty="${p.id}"
              class="w-14 h-7 text-center rounded-[8px] glass-input text-xs font-mono font-bold"
              ${!isSelected ? 'disabled' : ''}
            />
          </div>
        </div>
      `;
    }).join('');

    // Generate Label Items List for Preview
    const labelItems = [];
    this.selectedProducts.forEach((qty, prodId) => {
      const prod = this.products.find(p => p.id === prodId);
      if (prod) {
        for (let i = 0; i < qty; i++) {
          labelItems.push(prod);
        }
      }
    });

    const labelsPreviewHtml = labelItems.map((prod, index) => {
      const barcodeVal = (prod.barcode || prod.sku || `ITEM-${prod.id}`).replace(/[^a-zA-Z0-9]/g, '');
      const svgId = `barcode-svg-${index}`;
      const itemPrice = prod.selling_price || prod.price || 0;

      if (this.template === 'shelf_tag') {
        return `
          <div class="label-item shelf-tag-item p-3.5 rounded-[16px] bg-white text-slate-900 border-2 border-slate-800 shadow-sm flex flex-col justify-between" style="width: 220px; height: 140px; box-sizing: border-box;">
            <div class="flex items-center justify-between border-b border-slate-300 pb-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-slate-500">${this.showStoreName ? storeName : 'RETAIL'}</span>
              <span class="text-[9px] font-bold text-slate-600 font-mono">${this.showSku ? prod.sku : ''}</span>
            </div>
            <div class="my-1 truncate">
              <h5 class="text-xs font-black text-slate-900 truncate leading-tight">${prod.name}</h5>
              <div class="text-2xl font-black font-mono text-[#0066CC] mt-0.5 tracking-tight">${this.showPrice ? formatCurrency(itemPrice) : ''}</div>
            </div>
            <div class="flex items-center justify-between pt-1 border-t border-slate-200">
              <svg id="${svgId}" class="h-7 max-w-[140px]"></svg>
              <span class="text-[8px] font-bold font-mono text-slate-400">IN-STOCK</span>
            </div>
          </div>
        `;
      } else if (this.template === 'thermal_roll') {
        return `
          <div class="label-item thermal-roll-item p-2 rounded-[10px] bg-white text-slate-900 border border-slate-400 shadow-xs flex flex-col justify-between text-center" style="width: 170px; height: 105px; box-sizing: border-box;">
            ${this.showStoreName ? `<div class="text-[8.5px] font-black uppercase tracking-wider text-slate-600 truncate">${storeName}</div>` : ''}
            <div class="text-[10px] font-bold text-slate-900 truncate">${prod.name}</div>
            <div class="flex justify-center my-0.5">
              <svg id="${svgId}" class="h-7 max-w-[150px]"></svg>
            </div>
            <div class="flex items-center justify-between text-[9px] font-black font-mono pt-0.5 border-t border-slate-200">
              <span>${this.showSku ? prod.sku : ''}</span>
              <span class="text-[#0066CC] font-bold">${this.showPrice ? formatCurrency(itemPrice) : ''}</span>
            </div>
          </div>
        `;
      } else {
        // 30-Up or 24-Up Sheet
        return `
          <div class="label-item sheet-label-item p-2 rounded-[8px] bg-white text-slate-900 border border-slate-300 shadow-xs flex flex-col justify-between text-center" style="width: 175px; height: 75px; box-sizing: border-box;">
            <div class="flex items-center justify-between text-[8px] leading-none">
              <span class="font-bold text-slate-700 truncate max-w-[110px]">${prod.name}</span>
              <span class="font-black text-[#0066CC]">${this.showPrice ? formatCurrency(itemPrice) : ''}</span>
            </div>
            <div class="flex justify-center my-0.5">
              <svg id="${svgId}" class="h-6 max-w-[155px]"></svg>
            </div>
            <div class="text-[7.5px] font-mono text-slate-500 flex justify-between leading-none">
              <span>${this.showStoreName ? storeName.substring(0, 12) : ''}</span>
              <span>${this.showSku ? prod.sku : ''}</span>
            </div>
          </div>
        `;
      }
    }).join('');

    this.container.innerHTML = `
      <div class="h-full flex flex-col overflow-hidden p-4 sm:p-6 space-y-4">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--line)] flex-shrink-0">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Barcode & Price Label Studio</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Design and print professional price tags, barcode stickers, and Avery sheets.</p>
          </div>

          <div class="flex items-center space-x-2.5 flex-shrink-0">
            <button
              type="button"
              id="select-all-labels-btn"
              class="px-3 py-2 rounded-[12px] glass-btn-secondary text-xs font-bold active:scale-95 transition"
            >
              Select All (${this.products.length})
            </button>
            <button
              type="button"
              id="clear-all-labels-btn"
              class="px-3 py-2 rounded-[12px] glass-btn-secondary text-xs font-bold text-[var(--red)] active:scale-95 transition"
            >
              Clear
            </button>
            <button
              type="button"
              id="print-labels-btn"
              class="px-5 py-2.5 rounded-[14px] glass-btn-primary text-xs font-black shadow-lg flex items-center space-x-1.5 active:scale-95 transition"
            >
              ${renderIcon('printer', 'w-4 h-4')}
              <span>Print ${labelItems.length} Labels</span>
            </button>
          </div>
        </div>

        <!-- Main Studio Workspace -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
          
          <!-- Left Column: Product Selector & Options (4 Cols) -->
          <div class="lg:col-span-4 flex flex-col glass-panel p-4.5 rounded-[24px] border border-[var(--line)] space-y-4 overflow-hidden">
            
            <!-- Template Format Selector -->
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Label Sheet Template</label>
              <select id="label-template-select" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
                <option value="30_up" ${this.template === '30_up' ? 'selected' : ''}>30-Up A4 Sheet (Avery 5160 - 1" x 2.62")</option>
                <option value="24_up" ${this.template === '24_up' ? 'selected' : ''}>24-Up A4 Sheet (Avery L7159 - 63.5 x 33.9mm)</option>
                <option value="thermal_roll" ${this.template === 'thermal_roll' ? 'selected' : ''}>Thermal Sticky Roll (50mm x 30mm / 2" x 1")</option>
                <option value="shelf_tag" ${this.template === 'shelf_tag' ? 'selected' : ''}>Large Shelf Talker Price Tag (80mm x 50mm)</option>
              </select>
            </div>

            <!-- Elements Toggles -->
            <div class="p-3 rounded-[16px] bg-[var(--glass-bg-clear)] border border-[var(--line)] space-y-2">
              <span class="text-[10px] uppercase font-black tracking-wider text-[var(--muted)] block">Label Content</span>
              <div class="grid grid-cols-3 gap-2 text-xs font-bold text-[var(--text)]">
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="checkbox" id="toggle-label-store" ${this.showStoreName ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                  <span class="text-[11px]">Brand</span>
                </label>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="checkbox" id="toggle-label-price" ${this.showPrice ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                  <span class="text-[11px]">Price</span>
                </label>
                <label class="flex items-center space-x-1.5 cursor-pointer">
                  <input type="checkbox" id="toggle-label-sku" ${this.showSku ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                  <span class="text-[11px]">SKU</span>
                </label>
              </div>
            </div>

            <!-- Product Search & Checklist -->
            <div class="flex-1 flex flex-col min-h-0 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-[var(--text)]">Select Catalog Items</span>
                <span class="text-[10px] text-[var(--accent)] font-bold">${this.selectedProducts.size} Products Chosen</span>
              </div>

              <div class="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
                ${productRowsHtml}
              </div>
            </div>

          </div>

          <!-- Right Column: Live Printable Sheet Preview (8 Cols) -->
          <div class="lg:col-span-8 flex flex-col glass2 p-4 sm:p-6 rounded-[24px] border border-[var(--line)] shadow-xl overflow-hidden">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--line)] flex-shrink-0">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                <h3 class="text-xs font-black text-[var(--text)]">Print Preview Canvas (${labelItems.length} Stickers)</h3>
              </div>
              <span class="text-[10px] text-[var(--muted)] font-mono">High-DPI Vector Barcodes</span>
            </div>

            <div id="labels-canvas-container" class="flex-1 overflow-y-auto p-4 flex flex-wrap gap-3 justify-center items-start bg-slate-200/50 dark:bg-slate-950/60 rounded-[18px] mt-3 border border-[var(--line)]">
              ${labelItems.length === 0 ? `
                <div class="py-20 text-center space-y-2 text-[var(--muted)]">
                  <div class="text-4xl">🏷️</div>
                  <strong class="text-sm font-black text-[var(--text)]">No items selected</strong>
                  <p class="text-xs max-w-xs">Check items on the left to preview printable sticker labels.</p>
                </div>
              ` : labelsPreviewHtml}
            </div>
          </div>

        </div>

      </div>
    `;

    // Render Crisp SVG Barcodes
    setTimeout(() => {
      labelItems.forEach((prod, index) => {
        const svgId = `#barcode-svg-${index}`;
        const barcodeVal = (prod.barcode || prod.sku || `ITEM-${prod.id}`).replace(/[^a-zA-Z0-9]/g, '');
        try {
          JsBarcode(svgId, barcodeVal, {
            format: this.barcodeFormat,
            lineColor: '#000000',
            width: 1.5,
            height: this.template === 'shelf_tag' ? 26 : (this.template === 'sheet_label_item' ? 20 : 24),
            displayValue: true,
            fontSize: 9,
            margin: 0
          });
        } catch (e) {
          // Fallback to Code 128 if EAN invalid
          try {
            JsBarcode(svgId, barcodeVal, { format: 'CODE128', width: 1.5, height: 22, displayValue: true, fontSize: 8, margin: 0 });
          } catch {}
        }
      });
    }, 50);
  }

  attachEvents() {
    // Select All
    const selectAllBtn = this.container.querySelector('#select-all-labels-btn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        this.products.forEach(p => this.selectedProducts.set(p.id, 1));
        this.render();
        this.attachEvents();
        toast.info(`Selected all ${this.products.length} products`);
      });
    }

    // Clear All
    const clearAllBtn = this.container.querySelector('#clear-all-labels-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.selectedProducts.clear();
        this.render();
        this.attachEvents();
        toast.info('Cleared label selection');
      });
    }

    // Checkboxes
    this.container.querySelectorAll('[data-prod-check]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = cb.getAttribute('data-prod-check');
        const qtyInput = this.container.querySelector(`[data-prod-qty="${id}"]`);
        if (e.target.checked) {
          const qty = Number(qtyInput?.value) || 1;
          this.selectedProducts.set(id, qty);
        } else {
          this.selectedProducts.delete(id);
        }
        this.render();
        this.attachEvents();
      });
    });

    // Quantities
    this.container.querySelectorAll('[data-prod-qty]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const id = inp.getAttribute('data-prod-qty');
        const val = Math.max(1, Number(e.target.value) || 1);
        if (this.selectedProducts.has(id)) {
          this.selectedProducts.set(id, val);
          this.render();
          this.attachEvents();
        }
      });
    });

    // Template Selector
    const templateSelect = this.container.querySelector('#label-template-select');
    if (templateSelect) {
      templateSelect.addEventListener('change', (e) => {
        this.template = e.target.value;
        this.render();
        this.attachEvents();
      });
    }

    // Content Toggles
    const toggleStore = this.container.querySelector('#toggle-label-store');
    if (toggleStore) {
      toggleStore.addEventListener('change', (e) => {
        this.showStoreName = e.target.checked;
        this.render();
        this.attachEvents();
      });
    }

    const togglePrice = this.container.querySelector('#toggle-label-price');
    if (togglePrice) {
      togglePrice.addEventListener('change', (e) => {
        this.showPrice = e.target.checked;
        this.render();
        this.attachEvents();
      });
    }

    const toggleSku = this.container.querySelector('#toggle-label-sku');
    if (toggleSku) {
      toggleSku.addEventListener('change', (e) => {
        this.showSku = e.target.checked;
        this.render();
        this.attachEvents();
      });
    }

    // Print Button
    const printBtn = this.container.querySelector('#print-labels-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        this.printLabels();
      });
    }
  }

  printLabels() {
    const canvas = this.container.querySelector('#labels-canvas-container');
    if (!canvas || this.selectedProducts.size === 0) {
      toast.warning('Please select products to print labels');
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Print Labels</title>
          <style>
            @page {
              size: ${this.template === 'thermal_roll' ? '50mm 30mm' : 'A4 portrait'};
              margin: ${this.template === 'thermal_roll' ? '0' : '8mm'};
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              justify-content: flex-start;
            }
            .label-item {
              page-break-inside: avoid;
              background: #fff !important;
              color: #000 !important;
            }
            svg {
              display: block;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          ${canvas.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    printFrame.contentWindow.focus();
    setTimeout(() => {
      printFrame.contentWindow.print();
      setTimeout(() => printFrame.remove(), 2500);
    }, 350);

    toast.success('Label printing job dispatched!');
  }
}
