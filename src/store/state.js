/**
 * Global Pub/Sub Reactive State Management
 */

class Store {
  constructor() {
    this.state = {};
    this.listeners = new Map();
  }

  set(key, value) {
    this.state[key] = value;
    this.notify(key, value);
  }

  get(key, defaultValue = null) {
    return this.state[key] !== undefined ? this.state[key] : defaultValue;
  }

  update(key, updaterFn) {
    const current = this.get(key);
    const updated = updaterFn(current);
    this.set(key, updated);
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    // Initial call
    if (this.state[key] !== undefined) {
      callback(this.state[key]);
    }
    return () => this.listeners.get(key).delete(callback);
  }

  notify(key, value) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach((cb) => {
        try {
          cb(value);
        } catch (e) {
          console.error(`Error notifying listener for ${key}:`, e);
        }
      });
    }
  }
}

export const globalStore = new Store();
