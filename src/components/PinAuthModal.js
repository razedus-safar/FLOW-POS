/**
 * FlowPOS Secure PIN Verification Modal Component
 * Ensures multi-user terminal switches and manager overrides are authenticated by PIN
 */

import { Modal } from './Modal.js';
import { sessionManager } from '../store/session.js';
import { toast } from './Toast.js';
import { renderIcon } from '../utils/icons.js';
import { sanitizeHtml, loginRateLimiter } from '../utils/security.js';

export function promptPinAuth({
  targetUser,
  title = 'Operator PIN Authentication',
  description = 'Enter 4-digit PIN to authenticate',
  onSuccess = null,
  onCancel = null
}) {
  let pinBuffer = '';

  const renderContent = (errorMsg = '') => `
    <div class="space-y-4">
      <div class="flex items-center space-x-3.5 p-3 rounded-[20px] glass-card border border-[var(--line)]">
        <div class="w-12 h-12 rounded-[16px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-base grid place-items-center flex-shrink-0 shadow-sm">
          ${sanitizeHtml(targetUser.name.substring(0, 2).toUpperCase())}
        </div>
        <div class="min-w-0 flex-1">
          <h4 class="text-sm font-bold text-[var(--text)] truncate">${sanitizeHtml(targetUser.name)}</h4>
          <p class="text-xs text-[var(--muted)] font-medium mt-0.5">${sanitizeHtml(targetUser.title || targetUser.role)}</p>
        </div>
        <span class="badge ${targetUser.role === 'OWNER' ? 'badge-platinum' : targetUser.role === 'MANAGER' ? 'badge-blue' : targetUser.role === 'INVENTORY' ? 'badge-amber' : 'badge-emerald'}">
          ${sanitizeHtml(targetUser.role)}
        </span>
      </div>

      <div class="text-center space-y-2 pt-1">
        <p class="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">${description}</p>
        
        <div class="flex items-center justify-center space-x-4 py-2">
          ${[0, 1, 2, 3].map(idx => `
            <div class="w-3.5 h-3.5 rounded-full border-2 border-[var(--accent)] flex items-center justify-center transition-all ${pinBuffer.length > idx ? 'bg-[var(--accent)] scale-125' : 'bg-transparent'}"></div>
          `).join('')}
        </div>

        ${errorMsg ? `
          <p class="text-xs text-red-500 font-semibold animate-shake">${sanitizeHtml(errorMsg)}</p>
        ` : ''}
      </div>

      <!-- Touch PIN Pad -->
      <div class="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-1">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
          <button type="button" data-auth-pin="${num}" class="h-12 rounded-[16px] text-lg font-black font-mono glass-btn-secondary text-[var(--text)] flex items-center justify-center shadow-xs hover:border-[var(--accent)] active:scale-90 transition select-none">
            ${num}
          </button>
        `).join('')}
        <button type="button" id="auth-pin-clear" class="h-12 rounded-[16px] text-[11px] font-black glass-btn-secondary text-red-500 flex items-center justify-center active:scale-90 transition select-none">
          C
        </button>
        <button type="button" data-auth-pin="0" class="h-12 rounded-[16px] text-lg font-black font-mono glass-btn-secondary text-[var(--text)] flex items-center justify-center shadow-xs hover:border-[var(--accent)] active:scale-90 transition select-none">
          0
        </button>
        <button type="button" id="auth-pin-backspace" class="h-12 rounded-[16px] text-xs font-bold glass-btn-secondary text-[var(--accent)] flex items-center justify-center active:scale-90 transition select-none">
          ${renderIcon('trash-2', 'w-4 h-4')}
        </button>
      </div>

      <div class="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--line)]">
        <button type="button" data-modal-close class="px-4 py-2 rounded-[12px] text-xs font-semibold glass-btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  `;

  let modal = null;

  const handlePinAction = (modalEl, errorMsg = '') => {
    modalEl.querySelector('.modal-body').innerHTML = renderContent(errorMsg);

    modalEl.querySelectorAll('[data-auth-pin]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (pinBuffer.length < 4) {
          pinBuffer += btn.getAttribute('data-auth-pin');
          handlePinAction(modalEl);

          if (pinBuffer.length === 4) {
            const lock = loginRateLimiter.isLocked();
            if (lock.locked) {
              handlePinAction(modalEl, `Locked for ${lock.remainingSeconds}s.`);
              pinBuffer = '';
              return;
            }

            const res = sessionManager.loginWithPin(pinBuffer, targetUser.id);
            if (res.success) {
              loginRateLimiter.reset();
              toast.success(`Switched active operator: ${res.user.name}`);
              modal.close();
              if (onSuccess) onSuccess(res.user);
            } else {
              loginRateLimiter.recordFailedAttempt();
              pinBuffer = '';
              handlePinAction(modalEl, res.message);
            }
          }
        }
      });
    });

    const clearBtn = modalEl.querySelector('#auth-pin-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        pinBuffer = '';
        handlePinAction(modalEl);
      });
    }

    const backBtn = modalEl.querySelector('#auth-pin-backspace');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (pinBuffer.length > 0) {
          pinBuffer = pinBuffer.slice(0, -1);
          handlePinAction(modalEl);
        }
      });
    }

    const cancelBtn = modalEl.querySelector('[data-modal-close]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.close();
        if (onCancel) onCancel();
      });
    }
  };

  modal = new Modal({
    title,
    size: 'sm',
    content: renderContent(),
    onOpen: (modalEl) => {
      handlePinAction(modalEl);
    },
    onClose: () => {
      if (onCancel) onCancel();
    }
  });

  modal.open();
}
