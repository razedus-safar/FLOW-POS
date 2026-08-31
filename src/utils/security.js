/**
 * FlowPOS Security, Cryptography & Sanitization Utility
 * Provides cryptographic hashing, XSS sanitization, and station auto-lock security.
 */

/**
 * SHA-256 cryptographic hash with salt using browser Web Crypto API
 */
export async function hashSecret(secret, salt = 'flowpos_salt_v2') {
  if (!secret) return '';
  const msgBuffer = new TextEncoder().encode(`${salt}:${secret}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * XSS & HTML entity sanitization to prevent injection in user inputs
 */
export function sanitizeHtml(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;');
}

/**
 * Generate cryptographically secure UUID v4 / Idempotency key
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * High-precision monetary math avoiding IEEE-754 floating point drift
 */
export function roundMoney(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

/**
 * Login Attempt Rate Limiter & Brute-Force Defense
 * Protects against automated PIN/password brute forcing
 */
class LoginRateLimiter {
  constructor(maxAttempts = 5, lockoutSeconds = 30) {
    this.maxAttempts = maxAttempts;
    this.lockoutSeconds = lockoutSeconds;
    this.storageKey = 'flowpos_login_attempts';
  }

  getState() {
    if (typeof localStorage === 'undefined') {
      return { attempts: 0, lockedUntil: 0 };
    }
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const state = JSON.parse(raw);
        if (state.lockedUntil && Date.now() > state.lockedUntil) {
          this.reset();
          return { attempts: 0, lockedUntil: 0 };
        }
        return state;
      }
    } catch {}
    return { attempts: 0, lockedUntil: 0 };
  }

  recordFailedAttempt() {
    const state = this.getState();
    const newAttempts = state.attempts + 1;
    let lockedUntil = 0;

    if (newAttempts >= this.maxAttempts) {
      lockedUntil = Date.now() + (this.lockoutSeconds * 1000);
    }

    const newState = { attempts: newAttempts, lockedUntil };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(newState));
    }
    return newState;
  }

  isLocked() {
    const state = this.getState();
    if (state.lockedUntil && Date.now() < state.lockedUntil) {
      const remainingSecs = Math.ceil((state.lockedUntil - Date.now()) / 1000);
      return { locked: true, remainingSeconds: remainingSecs };
    }
    return { locked: false, remainingSeconds: 0 };
  }

  reset() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}

export const loginRateLimiter = new LoginRateLimiter(5, 30);

/**
 * Idle Inactivity Station Auto-Lock Security
 */
class StationAutoLockService {
  constructor() {
    this.timeoutMinutes = 15;
    this.timer = null;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    const resetTimer = () => {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.lockStation();
      }, this.timeoutMinutes * 60 * 1000);
    };

    ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
      window.addEventListener(evt, resetTimer, { passive: true });
    });

    resetTimer();
  }

  lockStation() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const isAuth = localStorage.getItem('flowpos_authenticated') === 'true';
    if (isAuth) {
      console.warn('FlowPOS Station locked due to inactivity.');
      localStorage.removeItem('flowpos_authenticated');
      localStorage.removeItem('flowpos_active_user_id');
      window.dispatchEvent(new CustomEvent('flowpos:auth-logout', { detail: { reason: 'inactivity_lock' } }));
      window.dispatchEvent(new CustomEvent('flowpos:logout'));
    }
  }
}

export const stationAutoLock = new StationAutoLockService();
