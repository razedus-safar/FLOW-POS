/**
 * FlowPOS Confirm Dialog Component
 */

import { Modal } from './Modal.js';
import { renderIcon } from '../utils/icons.js';

export function showConfirmDialog({
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  onConfirm = null
}) {
  const content = `
    <div class="space-y-4">
      <div class="flex items-start space-x-3">
        <div class="p-2 rounded-xl ${isDanger ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'} flex-shrink-0">
          ${renderIcon(isDanger ? 'alert-triangle' : 'info', 'w-5 h-5')}
        </div>
        <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${message}</p>
      </div>

      <div class="flex items-center justify-end space-x-2.5 pt-2">
        <button data-modal-close class="px-4 py-2 rounded-xl text-xs font-semibold glass-btn-secondary">
          ${cancelText}
        </button>
        <button id="dialog-confirm-btn" class="px-4 py-2 rounded-xl text-xs font-semibold ${isDanger ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30' : 'glass-btn-primary'} transition">
          ${confirmText}
        </button>
      </div>
    </div>
  `;

  const modal = new Modal({
    title,
    size: 'sm',
    content,
    onOpen: (modalEl) => {
      const confirmBtn = modalEl.querySelector('#dialog-confirm-btn');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          modal.close();
          if (onConfirm) onConfirm();
        });
      }
    }
  });

  modal.open();
}
