/**
 * FlowPOS Real-Time Global Multi-Currency & Live Online Exchange Engine
 * Base Currency: LKR (Sri Lankan Rupee)
 * Features live online rate syncing from open exchange API, caching, and instant conversion
 */

import { settingsService } from '../services/settings.js';

export const BASE_CURRENCY_CODE = 'LKR';

export const SUPPORTED_CURRENCIES = [
  { code: 'LKR', name: 'Sri Lankan Rupee (LKR)', symbol: 'Rs. ', position: 'prefix', decimals: 2 },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$', position: 'prefix', decimals: 2 },
  { code: 'EUR', name: 'Euro (€)', symbol: '€', position: 'prefix', decimals: 2 },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£', position: 'prefix', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹', position: 'prefix', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham (AED)', symbol: 'AED ', position: 'prefix', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar (A$)', symbol: 'A$', position: 'prefix', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar (C$)', symbol: 'C$', position: 'prefix', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$', position: 'prefix', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥', position: 'prefix', decimals: 0 }
];

const RATES_STORAGE_KEY = 'flowpos_live_exchange_rates_lkr';

// Fallback rates if offline
const DEFAULT_FALLBACK_RATES = {
  LKR: 1,
  USD: 0.00304,    // ~328.5 LKR / USD
  EUR: 0.00261,    // ~383.0 LKR / EUR
  GBP: 0.00224,    // ~446.0 LKR / GBP
  INR: 0.29060,    // ~3.44 LKR / INR
  AED: 0.01118,    // ~89.4 LKR / AED
  AUD: 0.00423,    // ~236.4 LKR / AUD
  CAD: 0.00422,    // ~236.9 LKR / CAD
  SGD: 0.00387,    // ~258.0 LKR / SGD
  JPY: 0.48570     // ~2.06 LKR / JPY
};

class CurrencyExchangeManager {
  constructor() {
    this.rates = this.loadCachedRates();
    this.lastFetched = typeof localStorage !== 'undefined' ? (localStorage.getItem(`${RATES_STORAGE_KEY}_timestamp`) || null) : null;
    this.isFetching = false;
    this.init();
  }

  loadCachedRates() {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_FALLBACK_RATES };
    try {
      const stored = localStorage.getItem(RATES_STORAGE_KEY);
      return stored ? { ...DEFAULT_FALLBACK_RATES, ...JSON.parse(stored) } : { ...DEFAULT_FALLBACK_RATES };
    } catch {
      return { ...DEFAULT_FALLBACK_RATES };
    }
  }

  async init() {
    if (typeof window === 'undefined') return;
    await this.fetchLiveRates();
  }

  async fetchLiveRates() {
    if (this.isFetching) return this.rates;
    this.isFetching = true;

    try {
      // Primary Open Exchange Rate API (LKR Base, No API key, CORS supported)
      const res = await fetch('https://open.er-api.com/v6/latest/LKR', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Exchange rate API HTTP ${res.status}`);
      const data = await res.json();

      if (data && data.rates) {
        this.rates = {
          ...DEFAULT_FALLBACK_RATES,
          ...data.rates,
          LKR: 1
        };
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(this.rates));
          this.lastFetched = new Date().toISOString();
          localStorage.setItem(`${RATES_STORAGE_KEY}_timestamp`, this.lastFetched);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('flowpos:rates-updated', { detail: this.rates }));
        }
      }
    } catch (err) {
      console.warn('Could not fetch live online exchange rates, using cached/fallback rates:', err);
    } finally {
      this.isFetching = false;
    }

    return this.rates;
  }

  getRate(currencyCode) {
    if (!currencyCode || currencyCode === BASE_CURRENCY_CODE) return 1;
    return this.rates[currencyCode] || DEFAULT_FALLBACK_RATES[currencyCode] || 1;
  }

  convert(amountInLKR, targetCurrencyCode = null) {
    const num = Number(amountInLKR) || 0;
    const target = targetCurrencyCode || this.getActiveCurrency().code;
    if (target === BASE_CURRENCY_CODE) return num;
    const rate = this.getRate(target);
    return num * rate;
  }

  convertBackToLKR(amountInTargetCurrency, sourceCurrencyCode = null) {
    const num = Number(amountInTargetCurrency) || 0;
    const source = sourceCurrencyCode || this.getActiveCurrency().code;
    if (source === BASE_CURRENCY_CODE) return num;
    const rate = this.getRate(source);
    if (!rate || rate === 0) return num;
    return num / rate;
  }

  getActiveCurrency() {
    const current = settingsService?.get()?.currency;
    const code = current?.code || 'LKR';
    const matched = SUPPORTED_CURRENCIES.find(c => c.code === code) || SUPPORTED_CURRENCIES[0];

    return {
      symbol: current?.symbol ?? matched.symbol,
      code: matched.code,
      position: current?.position ?? matched.position,
      decimals: current?.decimals ?? matched.decimals,
      name: matched.name
    };
  }

  getRateInfo(targetCurrencyCode = null) {
    const target = targetCurrencyCode || this.getActiveCurrency().code;
    const rate = this.getRate(target);
    const inverse = rate > 0 ? (1 / rate) : 1;

    return {
      target,
      base: BASE_CURRENCY_CODE,
      rate,
      inverseRate: inverse,
      isBase: target === BASE_CURRENCY_CODE,
      lastUpdated: this.lastFetched
    };
  }
}

export const currencyExchange = new CurrencyExchangeManager();

export function getCurrencyConfig() {
  return currencyExchange.getActiveCurrency();
}

/**
 * Formats a monetary amount.
 * The input `amount` is assumed to be in the base catalog currency (LKR).
 * If the active store currency is USD or EUR, it converts using live online rates.
 */
export function formatCurrency(amountInLKR, customConfig = null) {
  const config = customConfig || getCurrencyConfig();
  const targetCode = config.code || 'LKR';

  let convertedValue;
  if (customConfig && customConfig.isAlreadyConverted) {
    convertedValue = Number(amountInLKR) || 0;
  } else {
    convertedValue = currencyExchange.convert(amountInLKR, targetCode);
  }

  const symbol = config.symbol ?? (targetCode === 'LKR' ? 'Rs. ' : '$');
  const decimals = Number.isInteger(config.decimals) ? config.decimals : (targetCode === 'JPY' ? 0 : 2);
  const position = config.position ?? 'prefix';

  const formattedNum = convertedValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (position === 'suffix') {
    return `${formattedNum} ${symbol.trim()}`;
  }
  return `${symbol}${formattedNum}`;
}

export function parseCurrency(str) {
  if (typeof str === 'number') return str;
  const cleaned = String(str).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
