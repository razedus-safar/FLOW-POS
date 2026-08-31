/**
 * FlowPOS Real-Time Customer-Facing Display Channel
 * Syncs cart, total, store promotions, and payment QR code to secondary screens
 * Supports BroadcastChannel (same-tab/window), localStorage (cross-window),
 * and Supabase Realtime (cross-device iPad/mobile secondary screens).
 */

import { supabaseClient } from './supabase.js';

class CustomerDisplayService {
  constructor() {
    this.channel = null;
    this.supabaseChannel = null;
    this.initChannels();
  }

  initChannels() {
    // 1. Local Browser Broadcast Channel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel('flowpos_customer_display_channel');
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment');
    }

    // 2. Cross-Device Cloud Realtime Channel via Supabase
    this.initSupabaseRealtime();
  }

  initSupabaseRealtime() {
    if (typeof window === 'undefined') return;
    if (supabaseClient.isConfigured() && !this.supabaseChannel) {
      try {
        this.supabaseChannel = supabaseClient.client.channel('flowpos_customer_display_feed', {
          config: { broadcast: { self: false } }
        });
        this.supabaseChannel.subscribe();
      } catch (err) {
        console.warn('Supabase Realtime Channel init failed:', err);
      }
    }
  }

  broadcast(type, payload = {}) {
    // 1. BroadcastChannel message (0ms latency, same device)
    if (this.channel) {
      try {
        this.channel.postMessage({ type, payload, timestamp: Date.now() });
      } catch (err) {
        console.error('Customer display broadcast error:', err);
      }
    }

    // 2. Cross-tab localStorage fallback
    if (typeof localStorage !== 'undefined') {
      try {
        if (type === 'CART_UPDATED') {
          localStorage.setItem('flowpos_customer_display_cart', JSON.stringify(payload));
        } else if (type === 'CHECKOUT_COMPLETED') {
          localStorage.setItem('flowpos_customer_display_completed', JSON.stringify({ payload, timestamp: Date.now() }));
        }
      } catch {}
    }

    // 3. Local DOM custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:customer-display', { detail: { type, payload } }));
    }

    // 4. Cross-Device Supabase Realtime Broadcast (Multi-device POS <-> Customer Screen)
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: type,
          payload
        });
      } catch (err) {
        console.warn('Supabase realtime broadcast send warning:', err);
      }
    } else if (supabaseClient.isConfigured()) {
      this.initSupabaseRealtime();
      if (this.supabaseChannel) {
        try {
          this.supabaseChannel.send({
            type: 'broadcast',
            event: type,
            payload
          });
        } catch {}
      }
    }
  }

  subscribe(callback) {
    const unsubscribers = [];

    // 1. BroadcastChannel Listener
    if (this.channel) {
      const channelHandler = (event) => {
        if (event.data) {
          callback(event.data.type, event.data.payload);
        }
      };
      this.channel.addEventListener('message', channelHandler);
      unsubscribers.push(() => this.channel.removeEventListener('message', channelHandler));
    }

    // 2. LocalStorage & DOM Events
    if (typeof window !== 'undefined') {
      const storageHandler = (e) => {
        if (e.key === 'flowpos_customer_display_cart' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            callback('CART_UPDATED', data);
          } catch {}
        } else if (e.key === 'flowpos_customer_display_completed' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            callback('CHECKOUT_COMPLETED', data.payload || data);
          } catch {}
        }
      };
      window.addEventListener('storage', storageHandler);
      unsubscribers.push(() => window.removeEventListener('storage', storageHandler));

      const localHandler = (e) => {
        if (e.detail) {
          callback(e.detail.type, e.detail.payload);
        }
      };
      window.addEventListener('flowpos:customer-display', localHandler);
      unsubscribers.push(() => window.removeEventListener('flowpos:customer-display', localHandler));
    }

    // 3. Supabase Cloud Realtime Channel (Cross-device iPad / Tablet)
    this.initSupabaseRealtime();
    if (this.supabaseChannel) {
      const cartHandler = ({ payload }) => {
        if (payload) callback('CART_UPDATED', payload);
      };
      const checkoutHandler = ({ payload }) => {
        if (payload) callback('CHECKOUT_COMPLETED', payload);
      };

      this.supabaseChannel.on('broadcast', { event: 'CART_UPDATED' }, cartHandler);
      this.supabaseChannel.on('broadcast', { event: 'CHECKOUT_COMPLETED' }, checkoutHandler);

      unsubscribers.push(() => {
        if (this.supabaseChannel) {
          this.supabaseChannel.unsubscribe();
          this.supabaseChannel = null;
        }
      });
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  getLatestCart() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('flowpos_customer_display_cart');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
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
