/**
 * FlowPOS Product Catalog Management View - iOS 26 Liquid Glass Edition
 * High-contrast typography, translucent category badges, and local product photo upload
 */

import { productService } from '../services/products.js';
import { DataTable } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';
import { CameraScannerModal } from '../components/CameraScannerModal.js';
import { toast } from '../components/Toast.js';
import { showConfirmDialog } from '../components/ConfirmDialog.js';
import { formatCurrency } from '../utils/currency.js';
import { renderIcon } from '../utils/icons.js';
import { validateProduct } from '../utils/validation.js';
import { sanitizeHtml } from '../utils/security.js';

export const PRESET_PRODUCT_PHOTOS = [
  { label: 'Coffee Beans', url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Dark Roast', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80' },
  { label: 'Espresso', url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=600&auto=format&fit=crop&q=80' },
  { label: 'Cold Brew Can', url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80' },
  { label: 'Iced Latte', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80' },
  { label: 'Butter Croissant', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80' },
  { label: 'Pain au Chocolat', url: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&auto=format&fit=crop&q=80' },
  { label: 'Sourdough Loaf', url: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=600&auto=format&fit=crop&q=80' },
  { label: 'Truffle Panini', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80' },
  { label: 'Smoked Salmon Bagel', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80' },
  { label: 'Berry Scone', url: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Matcha Tea', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80' },
  { label: 'Hibiscus Spritz', url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80' },
  { label: 'Organic Honey', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80' },
  { label: 'Ceramic Mug', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80' },
  { label: 'Cold Pressed Juice', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80' }
];

export class ProductsPage {
  constructor(container) {
    this.container = container;
    this.products = [];
    this.categories = [];
    this.dataTable = null;
    this.init();
  }

  async init() {
    [this.products, this.categories] = await Promise.all([
      productService.getAllProducts(),
      productService.getCategories()
    ]);
    this.render();
    this.attachEvents();
  }

  render() {
    const categoryMap = new Map(this.categories.map(c => [c.id, c.name]));

    const columns = [
      {
        key: 'image_url',
        label: 'Product',
        sortable: false,
        render: (val, row) => `
          <div class="flex items-center space-x-3">
            <img src="${sanitizeHtml(row.image_url || PRESET_PRODUCT_PHOTOS[0].url)}" alt="${sanitizeHtml(row.name)}" class="w-10 h-10 rounded-[12px] object-cover bg-slate-200/60 dark:bg-slate-800 border border-white/60 dark:border-white/10 flex-shrink-0 shadow-xs" onerror="this.src='${PRESET_PRODUCT_PHOTOS[0].url}'" />
            <div class="min-w-0">
              <p class="font-extrabold text-[var(--text)] truncate text-xs">${sanitizeHtml(row.name)}</p>
              <p class="text-[10px] text-[var(--muted)] font-mono font-bold">${sanitizeHtml(row.sku)} &bull; ${sanitizeHtml(row.barcode || 'No barcode')}</p>
            </div>
          </div>
        `
      },
      {
        key: 'category_id',
        label: 'Category',
        render: (val) => `<span class="badge badge-blue">${sanitizeHtml(categoryMap.get(val) || 'General')}</span>`
      },
      {
        key: 'cost_price',
        label: 'Cost',
        render: (val) => `<span class="font-mono font-bold text-[var(--muted)]">${formatCurrency(val)}</span>`
      },
      {
        key: 'selling_price',
        label: 'Price',
        render: (val) => `<span class="font-mono font-black text-[var(--text)] text-sm">${formatCurrency(val)}</span>`
      },
      {
        key: 'stock_quantity',
        label: 'Stock',
        render: (val, row) => {
          const reorder = Number(row.reorder_level) || 5;
          if (val <= 0) return `<span class="badge badge-danger">0 (Out)</span>`;
          if (val <= reorder) return `<span class="badge badge-amber">${val} in stock</span>`;
          return `<span class="badge badge-emerald">${val} in stock</span>`;
        }
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_, row) => `
          <div class="flex items-center space-x-1.5">
            <button data-edit-prod="${row.id}" class="p-1.5 rounded-[10px] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition" title="Edit Product & Photo">
              ${renderIcon('settings', 'w-4 h-4')}
            </button>
            <button data-delete-prod="${row.id}" class="p-1.5 rounded-[10px] text-[var(--muted)] hover:text-[var(--red)] hover:bg-red-500/10 transition" title="Delete">
              ${renderIcon('trash-2', 'w-4 h-4')}
            </button>
          </div>
        `
      }
    ];

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Product Catalog</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Manage SKUs, barcodes, HD product photography, pricing, and stock levels.</p>
          </div>

          <div class="flex items-center space-x-2.5 flex-wrap gap-y-2">
            <a href="#/labels" class="px-3.5 py-2.5 rounded-[14px] text-xs font-black glass-btn-secondary flex items-center space-x-1.5 shadow-xs hover:border-[var(--accent)] transition">
              ${renderIcon('scan', 'w-4 h-4 text-[var(--accent)]')}
              <span>Print Labels</span>
            </a>

            <button id="export-csv-btn" class="px-3.5 py-2.5 rounded-[14px] text-xs font-black glass-btn-secondary flex items-center space-x-1.5 shadow-xs">
              ${renderIcon('download', 'w-4 h-4 text-[var(--muted)]')}
              <span>Export</span>
            </button>

            <button id="import-csv-btn" class="px-3.5 py-2.5 rounded-[14px] text-xs font-black glass-btn-secondary flex items-center space-x-1.5 shadow-xs">
              ${renderIcon('upload', 'w-4 h-4 text-[var(--muted)]')}
              <span>Import</span>
            </button>

            <button id="create-prod-btn" class="px-4 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary flex items-center space-x-1.5 shadow-md">
              <span>+ Add New Product</span>
            </button>
          </div>
        </div>

        <!-- Filter Row & KPIs -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-3 rounded-[18px] glass-card border border-[var(--line)] space-y-1">
            <span class="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Total SKUs</span>
            <p class="text-xl font-black font-mono text-[var(--text)]">${this.products.length}</p>
          </div>
          <div class="p-3 rounded-[18px] glass-card border border-[var(--line)] space-y-1">
            <span class="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Active Categories</span>
            <p class="text-xl font-black font-mono text-[var(--accent)]">${this.categories.length}</p>
          </div>
          <div class="p-3 rounded-[18px] glass-card border border-[var(--line)] space-y-1">
            <span class="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Low Stock Items</span>
            <p class="text-xl font-black font-mono text-[var(--amber)]">${this.products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.reorder_level || 5)).length}</p>
          </div>
          <div class="p-3 rounded-[18px] glass-card border border-[var(--line)] space-y-1">
            <span class="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Out of Stock</span>
            <p class="text-xl font-black font-mono text-[var(--red)]">${this.products.filter(p => p.stock_quantity <= 0).length}</p>
          </div>
        </div>

        <!-- Main Catalog Data Table -->
        <div id="product-datatable-container" class="glass rounded-[24px] border border-[var(--line)] overflow-hidden shadow-sm"></div>
      </div>
    `;

    const tableContainer = this.container.querySelector('#product-datatable-container');
    if (tableContainer) {
      this.dataTable = new DataTable({
        columns,
        data: this.products,
        searchPlaceholder: 'Search products by name, SKU, or barcode…',
        pageSize: 10,
        onRowClick: (row) => this.openProductModal(row.id)
      });
      this.dataTable.render(tableContainer);
    }
  }

  attachEvents() {
    this.container.querySelectorAll('[data-edit-prod]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-edit-prod');
        this.openProductModal(id);
      });
    });

    this.container.querySelectorAll('[data-delete-prod]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-prod');
        this.confirmDeleteProduct(id);
      });
    });

    const createBtn = this.container.querySelector('#create-prod-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.openProductModal());
    }

    const exportBtn = this.container.querySelector('#export-csv-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const csvContent = 'data:text/csv;charset=utf-8,' +
          ['ID,Name,SKU,Barcode,Cost,Price,Stock', ...this.products.map(p => `"${p.id}","${p.name}","${p.sku}","${p.barcode || ''}",${p.cost_price},${p.selling_price},${p.stock_quantity}`)].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `flowpos_catalog_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Catalog exported successfully.');
      });
    }

    const importBtn = this.container.querySelector('#import-csv-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const text = event.target.result;
              const lines = text.split('\n').filter(l => l.trim().length > 0);
              toast.success(`Parsed ${lines.length - 1} records from CSV.`);
            };
            reader.readAsText(file);
          }
        };
        input.click();
      });
    }
  }

  openProductModal(productId = null) {
    const isEdit = !!productId;
    const prod = isEdit ? this.products.find(p => p.id === productId) : {
      name: '',
      description: '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      barcode: '',
      category_id: this.categories[0]?.id || '',
      cost_price: '',
      selling_price: '',
      tax_rate: 8.5,
      stock_quantity: 10,
      reorder_level: 5,
      image_url: PRESET_PRODUCT_PHOTOS[0].url
    };

    if (!prod) return;
    let currentPhotoUrl = prod.image_url || PRESET_PRODUCT_PHOTOS[0].url;

    const catOptions = this.categories.map(c => `
      <option value="${c.id}" ${prod.category_id === c.id ? 'selected' : ''}>${c.name}</option>
    `).join('');

    const modalContent = `
      <form id="product-form" class="space-y-4 max-h-[80vh] overflow-y-auto pr-1 scrollbar-none">
        <!-- Photo Selector & Device Upload Box -->
        <div class="p-3.5 rounded-[18px] glass-card border border-[var(--line)] space-y-3">
          <div class="flex items-center space-x-3.5">
            <label for="prod-file-input" class="relative group/prod cursor-pointer flex-shrink-0" title="Click to upload local photo">
              <img id="prod-preview-img" src="${currentPhotoUrl}" alt="Product Preview" class="w-20 h-20 rounded-[18px] object-cover ring-2 ring-[var(--accent)] shadow-md group-hover:opacity-90 transition" onerror="this.src='${PRESET_PRODUCT_PHOTOS[0].url}'" />
              <div class="absolute -bottom-1 -right-1 p-1 rounded-full bg-[var(--accent)] text-white text-[10px] shadow-md hover:scale-110 active:scale-95 transition">
                📷
              </div>
            </label>
            <input id="prod-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" class="hidden" />

            <div class="space-y-1 min-w-0 flex-1">
              <span class="text-xs font-bold text-[var(--text)] block">Product Photography</span>
              <p class="text-[10px] text-[var(--muted)] leading-tight">Upload high-res image from device or choose a preset.</p>
              <label for="prod-file-input" class="inline-flex items-center justify-center cursor-pointer px-3.5 py-1.5 rounded-[10px] text-[11px] font-bold glass-btn-primary shadow-xs hover:scale-105 active:scale-95 transition mt-1">
                📁 Choose Photo from Device
              </label>
            </div>
          </div>

          <!-- Preset Product Photo Swatches -->
          <div class="pt-2 border-t border-[var(--line)]">
            <span class="text-[9.5px] uppercase font-bold text-[var(--muted)] tracking-wider block mb-1.5">Preset Studio Photos</span>
            <div class="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              ${PRESET_PRODUCT_PHOTOS.map((p, idx) => `
                <button
                  type="button"
                  data-select-prod-preset="${p.url}"
                  class="h-8 rounded-[8px] overflow-hidden border border-[var(--line)] hover:scale-110 active:scale-95 transition shadow-xs group/item relative"
                  title="${p.label}"
                >
                  <img src="${p.url}" alt="${p.label}" class="w-full h-full object-cover" />
                </button>
              `).join('')}
            </div>
          </div>
          <input type="hidden" name="image_url" id="prod-hidden-img-input" value="${currentPhotoUrl}" />
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Product Title *</label>
          <input
            name="name"
            type="text"
            required
            value="${prod.name}"
            placeholder="e.g. Nitro Draft Cold Brew Can 330ml"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-semibold"
          />
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Short Description</label>
          <input
            name="description"
            type="text"
            value="${prod.description || ''}"
            placeholder="e.g. Silky smooth micro-foam cascade with zero sugar"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">SKU / Code *</label>
            <input
              name="sku"
              type="text"
              required
              value="${prod.sku}"
              placeholder="COF-001"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Barcode (UPC/EAN/QR)</label>
            <div class="relative flex items-center">
              <input
                id="modal-product-barcode-input"
                name="barcode"
                type="text"
                value="${prod.barcode || ''}"
                placeholder="Scan or enter code…"
                class="glass-input w-full p-2.5 pr-10 rounded-[12px] text-xs font-mono font-bold"
              />
              <button
                type="button"
                id="scan-barcode-modal-btn"
                class="absolute right-1.5 p-1.5 rounded-[8px] bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition active:scale-90"
                title="Scan with Phone Camera"
              >
                ${renderIcon('camera', 'w-3.5 h-3.5')}
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Category *</label>
            <select name="category_id" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
              ${catOptions}
            </select>
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Tax Rate (%)</label>
            <input
              name="tax_rate"
              type="number"
              step="0.1"
              value="${prod.tax_rate ?? 8.5}"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Cost Price</label>
            <input
              name="cost_price"
              type="number"
              step="any"
              value="${prod.cost_price}"
              placeholder="0.00"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Selling Price *</label>
            <input
              name="selling_price"
              type="number"
              step="any"
              required
              value="${prod.selling_price}"
              placeholder="0.00"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-black"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Opening Stock</label>
            <input
              name="stock_quantity"
              type="number"
              value="${prod.stock_quantity ?? 0}"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Reorder Level Alert</label>
            <input
              name="reorder_level"
              type="number"
              value="${prod.reorder_level ?? 5}"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-[var(--line)]">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            ${isEdit ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: isEdit ? `Edit Product: ${prod.name}` : 'Create New Product',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#product-form');
        const cancelBtn = modalEl.querySelector('#modal-cancel-btn');
        const prodPreviewImg = modalEl.querySelector('#prod-preview-img');
        const prodHiddenImgInput = modalEl.querySelector('#prod-hidden-img-input');
        const prodFileInput = modalEl.querySelector('#prod-file-input');
        const prodDropzone = modalEl.querySelector('#prod-dropzone');
        const triggerProdUploadBtn = modalEl.querySelector('#trigger-prod-upload-btn');

        // Preset Swatches
        modalEl.querySelectorAll('[data-select-prod-preset]').forEach(btn => {
          btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-select-prod-preset');
            prodPreviewImg.src = url;
            prodHiddenImgInput.value = url;
          });
        });

        // Canvas Photo Compression for Product Images (Max 360x360px JPEG)
        if (prodFileInput) {
          prodFileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const maxDim = 360;
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                    if (width > maxDim) {
                      height = Math.round((height * maxDim) / width);
                      width = maxDim;
                    }
                  } else {
                    if (height > maxDim) {
                      width = Math.round((width * maxDim) / height);
                      height = maxDim;
                    }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, width, height);

                  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
                  prodPreviewImg.src = compressedDataUrl;
                  prodHiddenImgInput.value = compressedDataUrl;
                  toast.success(`Product photo selected: ${file.name}`);
                };
                img.onerror = () => {
                  prodPreviewImg.src = event.target.result;
                  prodHiddenImgInput.value = event.target.result;
                  toast.success(`Photo loaded: ${file.name}`);
                };
                img.src = event.target.result;
              };
              reader.readAsDataURL(file);
            }
            prodFileInput.value = '';
          });
        }

        cancelBtn.addEventListener('click', () => modal.close());

        const scanBarcodeBtn = modalEl.querySelector('#scan-barcode-modal-btn');
        const barcodeInput = modalEl.querySelector('#modal-product-barcode-input');
        if (scanBarcodeBtn && barcodeInput) {
          scanBarcodeBtn.addEventListener('click', () => {
            new CameraScannerModal({
              title: 'Scan Product Barcode',
              autoAddToCart: false,
              onScan: (code) => {
                barcodeInput.value = code;
                toast.success(`Captured barcode: ${code}`);
              }
            }).open();
          });
        }

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const data = {
            id: isEdit ? prod.id : undefined,
            name: fd.get('name').trim(),
            description: fd.get('description') ? fd.get('description').trim() : '',
            sku: fd.get('sku').trim(),
            barcode: fd.get('barcode').trim(),
            category_id: fd.get('category_id'),
            tax_rate: Number(fd.get('tax_rate')) || 0,
            cost_price: Number(fd.get('cost_price')) || 0,
            selling_price: Number(fd.get('selling_price')) || 0,
            stock_quantity: Number(fd.get('stock_quantity')) || 0,
            reorder_level: Number(fd.get('reorder_level')) || 5,
            image_url: prodHiddenImgInput.value || PRESET_PRODUCT_PHOTOS[0].url,
            is_active: true
          };

          const validation = validateProduct(data);
          if (!validation.isValid) {
            toast.error(validation.errors[0]);
            return;
          }

          await productService.saveProduct(data);
          toast.success(isEdit ? 'Product updated with image!' : 'Product added successfully!');
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }

  confirmDeleteProduct(id) {
    const prod = this.products.find(p => p.id === id);
    if (!prod) return;

    showConfirmDialog({
      title: 'Delete Product',
      message: `Are you sure you want to permanently remove "${prod.name}" from your catalog?`,
      confirmText: 'Delete Product',
      isDanger: true,
      onConfirm: async () => {
        await productService.deleteProduct(id);
        toast.info(`Deleted "${prod.name}"`);
        this.init();
      }
    });
  }
}
