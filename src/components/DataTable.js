/**
 * FlowPOS High-Performance Glass Data Table Component
 * iOS 26 Liquid Glass Edition with Deep High-Contrast Typography
 */

import { renderIcon } from '../utils/icons.js';

export class DataTable {
  constructor(optionsOrContainer, maybeOptions = {}) {
    let options = {};
    let container = null;
    if (optionsOrContainer instanceof HTMLElement || (optionsOrContainer && optionsOrContainer.nodeType === 1)) {
      container = optionsOrContainer;
      options = maybeOptions;
    } else {
      options = optionsOrContainer || {};
    }

    this.columns = options.columns || [];
    this.data = options.data || [];
    this.pageSize = options.pageSize || 10;
    this.currentPage = 1;
    this.searchQuery = '';
    this.searchPlaceholder = options.searchPlaceholder || 'Search table…';
    this.sortKey = this.columns[0]?.key || null;
    this.sortDirection = 'asc';
    this.onRowClick = options.onRowClick || null;

    if (container) {
      this.render(container);
    }
  }

  setData(data) {
    this.data = data;
    this.currentPage = 1;
  }

  getFilteredData() {
    let result = [...this.data];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(row => {
        return this.columns.some(col => {
          const val = row[col.key];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        });
      });
    }

    if (this.sortKey) {
      result.sort((a, b) => {
        let valA = a[this.sortKey];
        let valB = b[this.sortKey];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }

  render(container) {
    const filtered = this.getFilteredData();
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const paginatedData = filtered.slice(startIdx, startIdx + this.pageSize);

    const headersHtml = this.columns.map(col => `
      <th scope="col" class="px-4 py-3.5 text-left text-xs font-black text-[var(--text)] uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer select-none hover:text-[var(--accent)]' : ''}" data-sort-key="${col.key}">
        <div class="flex items-center space-x-1">
          <span>${col.label}</span>
          ${col.sortable !== false && this.sortKey === col.key ? `
            <span class="text-[var(--accent)]">${renderIcon(this.sortDirection === 'asc' ? 'chevron-down' : 'chevron-right', 'w-3.5 h-3.5')}</span>
          ` : ''}
        </div>
      </th>
    `).join('');

    let rowsHtml = '';
    if (paginatedData.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="${this.columns.length}" class="px-4 py-12 text-center text-[var(--muted)] text-xs font-bold">
            No matching records found
          </td>
        </tr>
      `;
    } else {
      rowsHtml = paginatedData.map(row => {
        const cellsHtml = this.columns.map(col => {
          const content = col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—');
          return `<td class="px-4 py-3.5 whitespace-nowrap text-xs text-[var(--text)] font-semibold">${content}</td>`;
        }).join('');

        return `
          <tr class="hover:bg-white/60 dark:hover:bg-white/[0.06] border-b border-[var(--line)] transition-colors ${this.onRowClick ? 'cursor-pointer' : ''}" data-row-id="${row.id}">
            ${cellsHtml}
          </tr>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="flex flex-col space-y-3">
        <!-- Search bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div class="relative w-full sm:w-72">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--accent)]">
              ${renderIcon('search', 'w-4 h-4')}
            </span>
            <input
              type="text"
              class="glass-input w-full pl-9 pr-4 py-2 rounded-[14px] text-xs font-semibold"
              placeholder="${this.searchPlaceholder}"
              value="${this.searchQuery}"
              data-table-search
            />
          </div>
          <div class="text-xs text-[var(--muted)] font-bold text-right sm:text-left">
            Showing <span class="font-black text-[var(--text)]">${filtered.length === 0 ? 0 : startIdx + 1}</span> - <span class="font-black text-[var(--text)]">${Math.min(startIdx + this.pageSize, filtered.length)}</span> of <span class="font-black text-[var(--text)]">${filtered.length}</span>
          </div>
        </div>

        <!-- Table Container -->
        <div class="overflow-x-auto rounded-[22px] border border-[var(--line)] glass shadow-xs">
          <table class="min-w-full divide-y divide-[var(--line)]">
            <thead class="bg-white/60 dark:bg-slate-900/60 border-b border-[var(--line)]">
              <tr>${headersHtml}</tr>
            </thead>
            <tbody class="divide-y divide-[var(--line)]">
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        ${totalPages > 1 ? `
          <div class="flex items-center justify-between pt-1">
            <button data-page-prev ${this.currentPage <= 1 ? 'disabled' : ''} class="px-3.5 py-1.5 rounded-[12px] text-xs font-black ${this.currentPage <= 1 ? 'opacity-40 cursor-not-allowed glass-btn-secondary' : 'glass-btn-secondary'}">
              Previous
            </button>
            <span class="text-xs text-[var(--muted)] font-bold">
              Page <span class="font-black text-[var(--text)]">${this.currentPage}</span> of <span class="font-black text-[var(--text)]">${totalPages}</span>
            </span>
            <button data-page-next ${this.currentPage >= totalPages ? 'disabled' : ''} class="px-3.5 py-1.5 rounded-[12px] text-xs font-black ${this.currentPage >= totalPages ? 'opacity-40 cursor-not-allowed glass-btn-secondary' : 'glass-btn-secondary'}">
              Next
            </button>
          </div>
        ` : ''}
      </div>
    `;

    this.attachEvents(container);
  }

  attachEvents(container) {
    const searchInput = container.querySelector('[data-table-search]');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.render(container);
        const input = container.querySelector('[data-table-search]');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      });
    }

    container.querySelectorAll('th[data-sort-key]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort-key');
        if (this.sortKey === key) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortKey = key;
          this.sortDirection = 'asc';
        }
        this.render(container);
      });
    });

    const prevBtn = container.querySelector('[data-page-prev]');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.render(container);
        }
      });
    }

    const nextBtn = container.querySelector('[data-page-next]');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.getFilteredData().length / this.pageSize);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.render(container);
        }
      });
    }

    if (this.onRowClick) {
      container.querySelectorAll('tbody tr[data-row-id]').forEach(tr => {
        tr.addEventListener('click', () => {
          const id = tr.getAttribute('data-row-id');
          const row = this.data.find(r => r.id === id);
          if (row) this.onRowClick(row);
        });
      });
    }
  }
}
