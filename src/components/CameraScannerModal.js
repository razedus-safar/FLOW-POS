/**
 * FlowPOS Camera Barcode & QR Scanner Modal
 * Works across Mobile Phones (iOS Safari, Android Chrome), Tablets, and Desktop Webcams
 * Supports 1D barcodes (EAN-13, EAN-8, UPC, Code 128, Code 39) & 2D QR Codes
 */

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { renderIcon } from '../utils/icons.js';
import { settingsService } from '../services/settings.js';
import { productService } from '../services/products.js';
import { cartStore } from '../store/cart.js';
import { soundManager } from '../utils/audio.js';
import { toast } from './Toast.js';

export class CameraScannerModal {
  constructor(options = {}) {
    this.onScan = options.onScan || null; // Custom callback (code, product) => void
    this.title = options.title || 'Live Camera Barcode & QR Scanner';
    this.autoAddToCart = options.autoAddToCart ?? true;
    this.html5QrCode = null;
    this.isScanning = false;
    this.isTorchOn = false;
    this.availableCameras = [];
    this.currentCameraId = null;
    this.lastScannedCode = null;
    this.lastScanTime = 0;
    this.cooldownMs = 1500;
    this.modalEl = null;

    const hw = settingsService.getSettings()?.hardware || {};
    this.facingMode = hw.cameraFacingMode || 'environment'; // 'environment' (back) | 'user' (front)
    this.isContinuous = hw.cameraContinuous ?? true;
    this.beepSound = hw.cameraBeepSound ?? true;
    this.vibrate = hw.cameraVibrate ?? true;
  }

  open() {
    this.render();
    this.initScanner();
  }

  render() {
    // Remove any existing scanner modal
    const existing = document.getElementById('camera-scanner-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'camera-scanner-modal-backdrop';
    backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md transition-opacity duration-200';

    backdrop.innerHTML = `
      <div class="relative w-full max-w-lg glass2 rounded-[28px] border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--line)] flex-shrink-0">
          <div class="flex items-center space-x-2.5 min-w-0">
            <div class="w-9 h-9 rounded-[12px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white flex items-center justify-center shadow-md flex-shrink-0">
              ${renderIcon('camera', 'w-5 h-5')}
            </div>
            <div class="truncate">
              <h3 class="font-heading font-black text-sm sm:text-base text-[var(--text)] truncate">${this.title}</h3>
              <p class="text-[10px] text-[var(--muted)] font-semibold truncate">Point camera at 1D Barcode or QR Code</p>
            </div>
          </div>

          <div class="flex items-center space-x-1.5 flex-shrink-0">
            <!-- Torch Flashlight Toggle -->
            <button
              type="button"
              id="camera-torch-btn"
              class="p-2 rounded-[12px] glass-btn-secondary text-[var(--muted)] hover:text-[var(--text)] transition active:scale-90"
              title="Toggle Torch / Flashlight"
            >
              ${renderIcon('zap', 'w-4 h-4')}
            </button>

            <!-- Switch Camera Button -->
            <button
              type="button"
              id="camera-switch-btn"
              class="p-2 rounded-[12px] glass-btn-secondary text-[var(--muted)] hover:text-[var(--text)] transition active:scale-90"
              title="Switch Camera (Front/Back)"
            >
              ${renderIcon('refresh-cw', 'w-4 h-4')}
            </button>

            <!-- Close Button -->
            <button
              type="button"
              id="camera-modal-close-btn"
              class="p-2 rounded-[12px] glass-btn-secondary text-[var(--muted)] hover:text-[var(--red)] transition active:scale-90 ml-1"
              title="Close Scanner"
            >
              ${renderIcon('x', 'w-4 h-4')}
            </button>
          </div>
        </div>

        <!-- Viewfinder Area -->
        <div class="relative bg-black flex-1 min-h-[260px] sm:min-h-[320px] flex items-center justify-center overflow-hidden">
          <div id="html5-camera-viewport" class="w-full h-full min-h-[260px] sm:min-h-[320px] object-cover"></div>

          <!-- Aiming Guide Overlays -->
          <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6 z-10">
            <!-- Bounding Target Frame -->
            <div class="relative w-64 h-44 sm:w-72 sm:h-48 border-2 border-dashed border-white/60 rounded-[20px] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
              
              <!-- Neon Animated Laser Line -->
              <div class="absolute inset-x-2 h-0.5 bg-gradient-to-r from-cyan-400 via-rose-500 to-amber-400 shadow-[0_0_12px_#38bdf8] animate-pulse rounded-full top-1/2 -translate-y-1/2"></div>
              
              <!-- Corner Brackets -->
              <div class="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-cyan-400 rounded-tl-[8px]"></div>
              <div class="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-cyan-400 rounded-tr-[8px]"></div>
              <div class="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-cyan-400 rounded-bl-[8px]"></div>
              <div class="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-cyan-400 rounded-br-[8px]"></div>
            </div>

            <p class="text-[11px] font-bold text-white/90 bg-black/60 px-3 py-1 rounded-full mt-4 backdrop-blur-sm border border-white/10 tracking-wide">
              Center barcode or QR in frame
            </p>
          </div>

          <!-- Camera Loading / Permission Placeholder -->
          <div id="camera-loading-overlay" class="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20 transition-opacity">
            <div class="w-12 h-12 rounded-full border-3 border-cyan-400 border-t-transparent animate-spin"></div>
            <p class="text-xs font-bold text-white tracking-wide">Starting Camera Stream…</p>
            <p class="text-[10px] text-slate-400 max-w-xs">Please allow browser camera permissions when prompted.</p>
          </div>

          <!-- Scanned Item Floating Pill Overlay -->
          <div id="scanner-result-overlay" class="hidden absolute bottom-3 inset-x-3 p-3 rounded-[16px] bg-slate-900/95 border border-white/20 backdrop-blur-md shadow-2xl flex items-center justify-between z-30 transition-all">
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-10 h-10 rounded-[10px] bg-white/10 flex items-center justify-center text-lg flex-shrink-0" id="scanner-result-thumb">📦</div>
              <div class="truncate">
                <h4 id="scanner-result-name" class="text-xs font-black text-white truncate">Product Name</h4>
                <p id="scanner-result-meta" class="text-[10px] text-cyan-400 font-mono truncate">123456789</p>
              </div>
            </div>
            <span id="scanner-result-badge" class="badge badge-emerald flex-shrink-0 text-[10px] font-bold">
              ✓ Added (+1)
            </span>
          </div>
        </div>

        <!-- Footer Bar & Manual Fallback -->
        <div class="p-3 sm:p-4 bg-[var(--card-bg)] border-t border-[var(--line)] space-y-2.5 flex-shrink-0">
          
          <!-- Mode Toggles & Camera Selector -->
          <div class="flex items-center justify-between text-xs gap-2">
            <label class="inline-flex items-center space-x-2 cursor-pointer select-none">
              <input type="checkbox" id="scanner-continuous-toggle" ${this.isContinuous ? 'checked' : ''} class="rounded text-[var(--accent)] focus:ring-0" />
              <span class="text-[11px] font-bold text-[var(--text)]">Continuous scan mode</span>
            </label>

            <select id="camera-select-dropdown" class="hidden sm:block text-[11px] font-semibold glass-input py-1 px-2.5 rounded-[10px] max-w-[170px] truncate">
              <option value="">Detecting cameras…</option>
            </select>
          </div>

          <!-- Manual Barcode Input Fallback -->
          <form id="manual-barcode-form" class="flex items-center space-x-2">
            <div class="relative flex-1">
              <input
                id="manual-barcode-input"
                type="text"
                placeholder="Or type/paste barcode manually…"
                class="glass-input w-full h-10 pl-3 pr-8 rounded-[12px] text-xs font-mono font-medium"
              />
            </div>
            <button
              type="submit"
              class="h-10 px-4 rounded-[12px] glass-btn-primary text-xs font-bold shadow-xs active:scale-95 transition flex items-center space-x-1"
            >
              <span>Scan</span>
              <span>↵</span>
            </button>
          </form>
        </div>

      </div>
    `;

    document.body.appendChild(backdrop);
    this.modalEl = backdrop;

    this.attachEvents();
  }

  attachEvents() {
    if (!this.modalEl) return;

    // Close button
    const closeBtn = this.modalEl.querySelector('#camera-modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    // Backdrop click close
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        window.removeEventListener('keydown', escHandler);
      }
    };
    window.addEventListener('keydown', escHandler);

    // Continuous Toggle
    const continuousToggle = this.modalEl.querySelector('#scanner-continuous-toggle');
    if (continuousToggle) {
      continuousToggle.addEventListener('change', (e) => {
        this.isContinuous = e.target.checked;
      });
    }

    // Torch Toggle
    const torchBtn = this.modalEl.querySelector('#camera-torch-btn');
    if (torchBtn) {
      torchBtn.addEventListener('click', () => this.toggleTorch());
    }

    // Switch Camera Button
    const switchBtn = this.modalEl.querySelector('#camera-switch-btn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => this.switchCamera());
    }

    // Camera Dropdown
    const camSelect = this.modalEl.querySelector('#camera-select-dropdown');
    if (camSelect) {
      camSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          this.startCamera(e.target.value);
        }
      });
    }

    // Manual Barcode Submit
    const form = this.modalEl.querySelector('#manual-barcode-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('#manual-barcode-input');
        const val = input.value.trim();
        if (val) {
          this.handleDecodedText(val, 'Manual');
          input.value = '';
        }
      });
    }
  }

  async initScanner() {
    try {
      const formats = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX
      ];

      this.html5QrCode = new Html5Qrcode('html5-camera-viewport', {
        formatsToSupport: formats,
        verbose: false
      });

      // Get Cameras
      const devices = await Html5Qrcode.getCameras();
      this.availableCameras = devices || [];

      const select = this.modalEl.querySelector('#camera-select-dropdown');
      if (select && this.availableCameras.length > 0) {
        select.innerHTML = this.availableCameras.map((cam, idx) => `
          <option value="${cam.id}">${cam.label || `Camera ${idx + 1}`}</option>
        `).join('');
      }

      // Prioritize environment/back camera on phones
      let targetCamera = null;
      if (this.availableCameras.length > 0) {
        const backCam = this.availableCameras.find(c =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        );
        targetCamera = backCam ? backCam.id : this.availableCameras[0].id;
      }

      await this.startCamera(targetCamera);
    } catch (err) {
      console.error('Camera Init Error:', err);
      const loading = this.modalEl?.querySelector('#camera-loading-overlay');
      if (loading) {
        loading.innerHTML = `
          <div class="p-3 rounded-full bg-red-500/20 text-red-400">
            ${renderIcon('alert-triangle', 'w-8 h-8')}
          </div>
          <p class="text-xs font-bold text-red-400">Camera Access Blocked or Not Available</p>
          <p class="text-[11px] text-slate-400 max-w-xs">Please allow camera permissions in your browser or use manual barcode input below.</p>
        `;
      }
    }
  }

  async startCamera(cameraId) {
    if (!this.html5QrCode) return;

    try {
      if (this.isScanning) {
        await this.html5QrCode.stop();
        this.isScanning = false;
      }

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 180 },
        aspectRatio: window.innerWidth < 640 ? 1.0 : 1.333333
      };

      const cameraConfig = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: this.facingMode };
      this.currentCameraId = cameraId;

      await this.html5QrCode.start(
        cameraConfig,
        config,
        (decodedText, decodedResult) => this.handleDecodedText(decodedText, decodedResult),
        (errorMessage) => {
          // Frame scan error (normal when no barcode is in frame)
        }
      );

      this.isScanning = true;

      // Hide loading overlay
      const loading = this.modalEl?.querySelector('#camera-loading-overlay');
      if (loading) loading.style.display = 'none';

      // Check Torch capability
      this.checkTorchCapability();
    } catch (err) {
      console.error('Start Camera Error:', err);
      // Fallback to facingMode if deviceId fails
      if (cameraId) {
        this.startCamera(null);
      }
    }
  }

  async switchCamera() {
    if (this.availableCameras.length < 2) {
      // Toggle facing mode if explicit IDs not enumerated
      this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
      await this.startCamera(null);
      return;
    }

    const currentIndex = this.availableCameras.findIndex(c => c.id === this.currentCameraId);
    const nextIndex = (currentIndex + 1) % this.availableCameras.length;
    const nextCamera = this.availableCameras[nextIndex];

    const select = this.modalEl?.querySelector('#camera-select-dropdown');
    if (select) select.value = nextCamera.id;

    await this.startCamera(nextCamera.id);
  }

  async toggleTorch() {
    if (!this.html5QrCode || !this.isScanning) return;
    try {
      this.isTorchOn = !this.isTorchOn;
      await this.html5QrCode.applyVideoConstraints({
        advanced: [{ torch: this.isTorchOn }]
      });

      const btn = this.modalEl?.querySelector('#camera-torch-btn');
      if (btn) {
        btn.className = `p-2 rounded-[12px] ${this.isTorchOn ? 'bg-amber-500 text-white shadow-md' : 'glass-btn-secondary text-[var(--muted)]'} transition active:scale-90`;
      }
      toast.info(this.isTorchOn ? 'Flashlight turned ON' : 'Flashlight turned OFF');
    } catch (err) {
      toast.warning('Flashlight not supported on this camera device');
    }
  }

  checkTorchCapability() {
    try {
      const track = this.html5QrCode.getRunningTrackCameraCapabilities();
      const hasTorch = track && track.torchFeature && track.torchFeature().isSupported();
      const btn = this.modalEl?.querySelector('#camera-torch-btn');
      if (btn && !hasTorch) {
        btn.classList.add('opacity-40');
      }
    } catch {}
  }

  async handleDecodedText(code, result) {
    const now = Date.now();
    if (code === this.lastScannedCode && (now - this.lastScanTime) < this.cooldownMs) {
      return; // Ignore duplicate immediate burst
    }

    this.lastScannedCode = code;
    this.lastScanTime = now;

    // 1. Acoustic Beep
    if (this.beepSound) {
      soundManager.playBeep();
    }

    // 2. Haptic Vibration
    if (this.vibrate && navigator.vibrate) {
      navigator.vibrate([70]);
    }

    // 3. Look up product
    const product = await productService.getProductByBarcode(code);

    // 4. Show feedback overlay
    this.showScanFeedback(code, product);

    // 5. Auto Add to Cart if in POS Mode
    if (this.autoAddToCart && product) {
      const settings = settingsService.get();
      const allowNegative = Boolean(settings?.workspace?.allowNegativeInventory || settings?.checkout?.allowNegativeInventory);
      if (Number(product.stock_quantity) <= 0 && !allowNegative) {
        toast.warning(`"${product.name}" is out of stock!`);
      } else {
        cartStore.addItem(product, 1);
        toast.success(`Scanned: ${product.name} (+1 added)`);
      }
    } else if (this.autoAddToCart && !product) {
      toast.error(`Barcode "${code}" not found in catalog`);
    }

    // 6. Custom callback
    if (typeof this.onScan === 'function') {
      this.onScan(code, product);
    }

    // 7. If not continuous, close modal after short delay
    if (!this.isContinuous) {
      setTimeout(() => this.close(), 600);
    }
  }

  showScanFeedback(code, product) {
    const overlay = this.modalEl?.querySelector('#scanner-result-overlay');
    const nameEl = this.modalEl?.querySelector('#scanner-result-name');
    const metaEl = this.modalEl?.querySelector('#scanner-result-meta');
    const thumbEl = this.modalEl?.querySelector('#scanner-result-thumb');
    const badgeEl = this.modalEl?.querySelector('#scanner-result-badge');

    if (!overlay || !nameEl || !metaEl) return;

    if (product) {
      nameEl.textContent = product.name;
      metaEl.textContent = `Barcode: ${code} • Stock: ${product.stock_quantity}`;
      if (thumbEl) {
        thumbEl.innerHTML = product.image_url
          ? `<img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover rounded-[8px]" />`
          : '📦';
      }
      if (badgeEl) {
        badgeEl.className = 'badge badge-emerald flex-shrink-0 text-[10px] font-bold';
        badgeEl.textContent = '✓ Scanned';
      }
    } else {
      nameEl.textContent = 'Unregistered Code';
      metaEl.textContent = `Code: ${code}`;
      if (thumbEl) thumbEl.innerHTML = '❓';
      if (badgeEl) {
        badgeEl.className = 'badge badge-danger flex-shrink-0 text-[10px] font-bold';
        badgeEl.textContent = 'Not Found';
      }
    }

    overlay.classList.remove('hidden');
    clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      overlay.classList.add('hidden');
    }, 2500);
  }

  async close() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
      this.isScanning = false;
    }

    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
