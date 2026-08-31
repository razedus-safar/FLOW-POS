/**
 * FlowPOS Custom 404 Route Not Found View - Apple iOS 26 Liquid Glass Edition
 */

import { renderIcon } from '../utils/icons.js';

export class NotFoundPage {
  constructor(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="h-full w-full flex items-center justify-center p-6 select-none animate-scale-in">
        <div class="glass-card max-w-md w-full p-8 rounded-[32px] border border-[var(--line)] shadow-2xl text-center space-y-5">
          <div class="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#007AFF] to-[#AF52DE] text-white flex items-center justify-center text-3xl mx-auto shadow-lg shadow-[#007AFF]/30">
            🧭
          </div>

          <div class="space-y-1.5">
            <span class="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Error 404</span>
            <h1 class="text-2xl font-black font-heading text-[var(--text)] tracking-tight">View Not Found</h1>
            <p class="text-xs text-[var(--muted)] font-medium max-w-xs mx-auto">
              The requested screen or URL route does not exist in this POS terminal.
            </p>
          </div>

          <div class="pt-2">
            <a
              href="#/pos"
              class="inline-flex items-center justify-center space-x-2 w-full py-3.5 px-5 rounded-[16px] text-xs font-black glass-btn-primary shadow-xl active:scale-97 transition"
            >
              <span>Return to POS Counter</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </div>
    `;
  }
}
