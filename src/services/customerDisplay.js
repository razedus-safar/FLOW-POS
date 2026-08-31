/**
 * FlowPOS Real-Time Customer-Facing Display Channel
 * Syncs cart, total, store promotions, and payment QR code to secondary screens
 */

class CustomerDisplayService {
  constructor() {
    this.channel = null;
    try {
      this.channel = new BroadcastChannel('flowpos_customer_display_channel');
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment');
    }
  }

  broadcast(type, payload = {}) {
    if (!this.channel) return;
    try {
      this.channel.postMessage({ type, payload, timestamp: Date.now() });
    } catch (err) {
      console.error('Customer display broadcast error:', err);
    }
  }

  subscribe(callback) {
    if (!this.channel) return () => {};
    const handler = (event) => {
      if (event.data) {
        callback(event.data.type, event.data.payload);
      }
    };
    this.channel.addEventListener('message', handler);
    return () => this.channel.removeEventListener('message', handler);
  }

  openCustomerWindow() {
    const width = 1024;
    const height = 768;
    const left = window.screen.width ? window.screen.width : 0;
    const top = 0;
    window.open(
      `${window.location.origin}${window.location.pathname}#/customer-display`,
      'FlowPOS_Customer_Display',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
  }
}

export const customerDisplayService = new CustomerDisplayService();
