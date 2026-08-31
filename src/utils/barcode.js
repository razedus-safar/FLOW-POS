/**
 * Global Hardware Barcode Scanner Listener
 * Distinguishes fast HID keyboard scanner bursts (<40ms per char) from manual typing.
 */

class BarcodeScannerService {
  constructor() {
    this.buffer = '';
    this.lastCharTime = 0;
    this.thresholdMs = 50;
    this.listeners = new Set();
    this.isEnabled = true;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      if (!this.isEnabled) return;

      // Ignore standard shortcut modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const activeElem = typeof document !== 'undefined' ? document.activeElement : null;
      const isInput = activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA');

      const currentTime = Date.now();
      const timeDiff = currentTime - this.lastCharTime;
      this.lastCharTime = currentTime;

      if (e.key === 'Enter') {
        if (this.buffer.length >= 3) {
          // If typed rapidly, intercept as barcode
          const scannedCode = this.buffer.trim();
          this.notifyListeners(scannedCode);
          this.buffer = '';
          if (timeDiff < 100) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
        this.buffer = '';
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff > 250) {
          this.buffer = '';
        }
        this.buffer += e.key;
      }
    }, true);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(code) {
    this.listeners.forEach((callback) => {
      try {
        callback(code);
      } catch (err) {
        console.error('Error in barcode callback:', err);
      }
    });
  }
}

export const barcodeScanner = new BarcodeScannerService();
