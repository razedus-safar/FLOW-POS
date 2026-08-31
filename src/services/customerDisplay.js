/**
 * FlowPOS Real-Time Customer-Facing Display Channel
 * Syncs cart, total, store promotions, and payment QR code to secondary screens
 * Supports BroadcastChannel (same-tab/window), localStorage (cross-window),
 * Supabase Postgres Changes & Realtime Broadcast (cross-device internet sync).
 */

import { supabaseClient } from './supabase.js';

class CustomerDisplayService {
  constructor() {
    this.channel = null;
    this.supabaseChannel = null;
    this.postgresChannel = null;
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

    // 2. Cross-Device Cloud Realtime Channels via Supabase
    this.initSupabaseRealtime();
  }

  initSupabaseRealtime() {
    if (typeof window === 'undefined') return;
    if (supabaseClient.isConfigured() && !this.supabaseChannel) {
      try {
        this.supabaseChannel = supabaseClient.client.channel('flowpos_customer_display_feed', {
          config: { broadcast: { self: true } }
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

    // 4. Cross-Device Supabase Realtime Broadcast (Instant WebSocket)
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

    // 5. Cloud Database Table Persistence (Internet multi-device sync guarantee)
    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured() && typeof window !== 'undefined') {
      const timestamp = new Date().toISOString();
      if (type === 'CART_UPDATED') {
        Promise.resolve(
          supabaseClient.client.from('settings').upsert({
            key: 'active_customer_cart',
            value: { payload, timestamp },
            updated_at: timestamp
          }, { onConflict: 'key' })
        ).catch(err => console.warn('Cloud active cart upsert warning:', err));
      } else if (type === 'CHECKOUT_COMPLETED') {
        Promise.resolve(
          supabaseClient.client.from('settings').upsert({
            key: 'active_customer_completed',
            value: { payload, timestamp },
            updated_at: timestamp
          }, { onConflict: 'key' })
        ).catch(err => console.warn('Cloud checkout completed upsert warning:', err));
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
    }

    // 4. Supabase Postgres Changes Channel on settings table
    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      try {
        const pgChannel = supabaseClient.client.channel('public:settings:customer_display')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'settings',
            filter: 'key=in.(active_customer_cart,active_customer_completed)'
          }, (event) => {
            const row = event.new;
            if (!row || !row.value) return;
            if (row.key === 'active_customer_cart') {
              const cart = row.value.payload || row.value;
              callback('CART_UPDATED', cart);
            } else if (row.key === 'active_customer_completed') {
              const comp = row.value.payload || row.value;
              callback('CHECKOUT_COMPLETED', comp);
            }
          })
          .subscribe();

        unsubscribers.push(() => {
          if (pgChannel) pgChannel.unsubscribe();
        });
      } catch (err) {
        console.warn('Postgres changes channel warning:', err);
      }

      // 5. Active Heartbeat Polling Fallback (every 2.5s) for zero-drop internet sync
      let lastFetchedCartStr = '';
      const pollTimer = setInterval(async () => {
        if (!supabaseClient.isConfigured()) return;
        try {
          const { data } = await supabaseClient.client
            .from('settings')
            .select('key, value, updated_at')
            .eq('key', 'active_customer_cart')
            .maybeSingle();

          if (data && data.value) {
            const cartPayload = data.value.payload || data.value;
            const currentStr = JSON.stringify(cartPayload);
            if (currentStr !== lastFetchedCartStr) {
              lastFetchedCartStr = currentStr;
              callback('CART_UPDATED', cartPayload);
            }
          }
        } catch (e) {
          // ignore transient poll error
        }
      }, 2500);

      unsubscribers.push(() => clearInterval(pollTimer));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  async getLatestCart() {
    // 1. Check local storage
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('flowpos_customer_display_cart');
        if (stored) return JSON.parse(stored);
      } catch {}
    }

    // 2. Check cloud database
    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      try {
        const { data } = await supabaseClient.client
          .from('settings')
          .select('value')
          .eq('key', 'active_customer_cart')
          .maybeSingle();

        if (data && data.value) {
          return data.value.payload || data.value;
        }
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
