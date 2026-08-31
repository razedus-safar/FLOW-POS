/**
 * FlowPOS Staff Time Clock & Timesheets View
 * PIN-based punch in/out terminal and shift hours manager
 */

import { timeClockService } from '../services/timeClock.js';
import { sessionManager } from '../store/session.js';
import { renderIcon } from '../utils/icons.js';
import { formatCurrency } from '../utils/currency.js';
import { toast } from '../components/Toast.js';
import { soundManager } from '../utils/audio.js';
import { showConfirmDialog } from '../components/ConfirmDialog.js';

export class TimeClockPage {
  constructor(container) {
    this.container = container;
    this.employees = [];
    this.punches = [];
    this.selectedEmpId = null;
    this.pinBuffer = '';
    this.init();
  }

  async init() {
    this.employees = sessionManager.getAllUsers();
    this.punches = timeClockService.getAll();
    if (this.employees.length > 0 && !this.selectedEmpId) {
      this.selectedEmpId = this.employees[0].id;
    }
    this.render();
    this.attachEvents();
  }

  render() {
    const activePunches = this.punches.filter(p => p.status !== 'COMPLETED');
    const selectedEmp = this.employees.find(e => e.id === this.selectedEmpId);
    const activeShift = selectedEmp ? timeClockService.getActivePunch(selectedEmp.id) : null;

    // Staff selector buttons
    const staffGridHtml = this.employees.map(emp => {
      const isSelected = emp.id === this.selectedEmpId;
      const isClockedIn = activePunches.some(p => p.employee_id === emp.id);
      return `
        <button
          type="button"
          data-select-staff="${emp.id}"
          class="p-3.5 rounded-[18px] text-left border transition-all ${isSelected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-[var(--accent)]/10 shadow-md' : 'border-[var(--line)] glass-card hover:border-[var(--accent)]'}"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-[var(--text)] truncate">${emp.name}</span>
            <span class="w-2.5 h-2.5 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
          </div>
          <div class="flex items-center justify-between mt-1 text-[10px] text-[var(--muted)]">
            <span>${emp.role}</span>
            <span class="${isClockedIn ? 'text-emerald-500 font-bold' : ''}">${isClockedIn ? 'On Shift' : 'Clocked Out'}</span>
          </div>
        </button>
      `;
    }).join('');

    // Timesheet log table
    const timesheetRowsHtml = this.punches.slice(0, 15).map(p => {
      const inDate = new Date(p.punch_in);
      const outDate = p.punch_out ? new Date(p.punch_out) : null;
      const hours = p.total_hours || (outDate ? Math.round(((outDate - inDate) / 3600000) * 10) / 10 : 'In Progress');
      const earnings = typeof hours === 'number' ? formatCurrency(hours * (p.hourly_rate || 1200)) : '—';

      return `
        <tr class="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition border-b border-[var(--line)]">
          <td class="p-3 font-bold text-xs text-[var(--text)]">${p.employee_name}</td>
          <td class="p-3 text-[11px] text-[var(--muted)]">${inDate.toLocaleDateString()} ${inDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td class="p-3 text-[11px] text-[var(--muted)]">${outDate ? `${outDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '<span class="badge badge-emerald">Active Now</span>'}</td>
          <td class="p-3 font-mono font-bold text-xs text-center">${typeof hours === 'number' ? `${hours} hrs` : hours}</td>
          <td class="p-3 font-mono font-bold text-xs text-right text-[var(--accent)]">${earnings}</td>
        </tr>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="h-full flex flex-col overflow-hidden p-4 sm:p-6 space-y-5">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--line)] flex-shrink-0">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Staff Time Clock & Timesheets</h1>
            <p class="text-xs text-[var(--muted)] font-medium">PIN punch in/out station, shift duration tracking, and payroll timesheets.</p>
          </div>

          <div class="flex items-center space-x-2.5 flex-shrink-0">
            <span class="badge badge-emerald px-3 py-1.5 text-xs font-black">
              ${activePunches.length} Staff on Shift
            </span>
          </div>
        </div>

        <!-- Main Workspace -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
          
          <!-- Left Column: Touch Punch Pad (5 Cols) -->
          <div class="lg:col-span-5 flex flex-col glass-panel p-5 rounded-[24px] border border-[var(--line)] space-y-4 overflow-hidden">
            <div class="flex items-center space-x-2">
              <span class="p-2 rounded-[10px] bg-[var(--accent)]/15 text-[var(--accent)]">
                ${renderIcon('clock', 'w-4 h-4')}
              </span>
              <h3 class="text-xs font-black text-[var(--text)] uppercase tracking-wider">Punch In / Out Station</h3>
            </div>

            <!-- Staff Grid -->
            <div class="space-y-1.5">
              <span class="text-[10px] font-bold text-[var(--muted)] uppercase">1. Select Staff Member</span>
              <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto scrollbar-none">
                ${staffGridHtml}
              </div>
            </div>

            <!-- PIN Display -->
            <div class="space-y-1.5 pt-2 border-t border-[var(--line)]">
              <span class="text-[10px] font-bold text-[var(--muted)] uppercase">2. Enter 4-Digit Staff PIN</span>
              <div class="h-11 rounded-[14px] glass-input flex items-center justify-center space-x-2">
                ${[0, 1, 2, 3].map(idx => `
                  <div class="w-3 h-3 rounded-full border border-[var(--accent)] ${this.pinBuffer.length > idx ? 'bg-[var(--accent)]' : ''}"></div>
                `).join('')}
              </div>
            </div>

            <!-- Numeric Pad -->
            <div class="grid grid-cols-3 gap-2 pt-1 flex-1">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'].map(btn => `
                <button
                  type="button"
                  data-pin-key="${btn}"
                  class="h-10 rounded-[12px] glass-btn-secondary text-sm font-black font-mono flex items-center justify-center hover:border-[var(--accent)] active:scale-95 transition"
                >
                  ${btn}
                </button>
              `).join('')}
            </div>

            <!-- Action Button -->
            <div class="pt-2">
              <button
                type="button"
                id="submit-punch-btn"
                class="w-full py-3 rounded-[16px] text-xs font-black text-white shadow-lg transition active:scale-96 ${activeShift ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'}"
              >
                ${activeShift ? '⏹ PUNCH OUT (End Shift)' : '▶ PUNCH IN (Start Shift)'}
              </button>
            </div>
          </div>

          <!-- Right Column: Live Timesheet Log (7 Cols) -->
          <div class="lg:col-span-7 flex flex-col glass2 p-5 rounded-[24px] border border-[var(--line)] shadow-xl overflow-hidden">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--line)] flex-shrink-0">
              <div>
                <h3 class="text-xs font-black text-[var(--text)]">Recent Timesheets & Shift History</h3>
                <span class="text-[10px] text-[var(--muted)] font-mono">Auto Hours & Payroll Estimator</span>
              </div>
              ${this.punches.length > 0 ? `
                <button
                  type="button"
                  id="clear-timesheets-btn"
                  class="px-3 py-1.5 rounded-[10px] glass-btn-secondary text-[11px] font-bold text-[var(--red)] hover:bg-red-500/10 active:scale-95 transition flex items-center space-x-1"
                  title="Clear all recorded shift logs"
                >
                  ${renderIcon('trash-2', 'w-3 h-3')}
                  <span>Reset / Clear History</span>
                </button>
              ` : ''}
            </div>

            <div class="flex-1 overflow-y-auto mt-3 rounded-[16px] border border-[var(--line)]">
              <table class="w-full text-left border-collapse">
                <thead class="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--line)] text-[10px] font-black uppercase text-[var(--muted)] tracking-wider">
                  <tr>
                    <th class="p-3">Staff Name</th>
                    <th class="p-3">Punch In</th>
                    <th class="p-3">Punch Out</th>
                    <th class="p-3 text-center">Total Hours</th>
                    <th class="p-3 text-right">Est. Pay</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--line)] text-xs">
                  ${this.punches.length === 0 ? `
                    <tr>
                      <td colspan="5" class="p-8 text-center text-xs text-[var(--muted)]">
                        No shift timesheets recorded yet. Staff punch ins and outs will appear here.
                      </td>
                    </tr>
                  ` : timesheetRowsHtml}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    `;
  }

  attachEvents() {
    // Select Staff
    this.container.querySelectorAll('[data-select-staff]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedEmpId = btn.getAttribute('data-select-staff');
        this.pinBuffer = '';
        this.render();
        this.attachEvents();
      });
    });

    // PIN Keypad
    this.container.querySelectorAll('[data-pin-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-pin-key');
        if (key === 'C') {
          this.pinBuffer = '';
        } else if (key === '✓') {
          this.handlePunchAction();
        } else {
          if (this.pinBuffer.length < 4) {
            this.pinBuffer += key;
          }
        }
        this.render();
        this.attachEvents();
      });
    });

    // Punch Submit Button
    const submitBtn = this.container.querySelector('#submit-punch-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.handlePunchAction();
      });
    }

    // Clear / Reset Timesheets Button
    const clearBtn = this.container.querySelector('#clear-timesheets-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        showConfirmDialog({
          title: 'Reset Shift History & Timesheets?',
          message: 'Are you sure you want to clear all shift punches? Active shifts and past timesheets will be cleared.',
          confirmText: 'Yes, Clear Timesheets',
          danger: true,
          onConfirm: () => {
            timeClockService.clearAll();
            toast.success('Shift timesheets and active punches reset successfully');
            this.init();
          }
        });
      });
    }
  }

  handlePunchAction() {
    const selectedEmp = this.employees.find(e => e.id === this.selectedEmpId);
    if (!selectedEmp) {
      toast.warning('Please select a staff member first');
      return;
    }

    if (this.pinBuffer !== (selectedEmp.pin || '1234')) {
      soundManager.playError();
      toast.error('Incorrect 4-digit PIN');
      this.pinBuffer = '';
      this.render();
      this.attachEvents();
      return;
    }

    try {
      const active = timeClockService.getActivePunch(selectedEmp.id);
      if (active) {
        timeClockService.punchOut(selectedEmp.id);
        soundManager.playSuccess();
        toast.success(`Clocked out ${selectedEmp.name}. Shift recorded!`);
      } else {
        timeClockService.punchIn(selectedEmp);
        soundManager.playSuccess();
        toast.success(`Clocked in ${selectedEmp.name}. Have a great shift!`);
      }
      this.pinBuffer = '';
      this.init();
    } catch (e) {
      toast.error(e.message);
    }
  }
}
