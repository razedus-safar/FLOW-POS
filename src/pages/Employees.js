/**
 * FlowPOS Staff & Role-Based Access Control View - iOS 26 High Contrast Edition
 * Interactive Role Matrix Permission Manager, Profile Photo Customization, & Secure Ownership Transfer
 */

import { sessionManager } from '../store/session.js';
import { ROLES, PERMISSIONS, loadRolePermissionsMap, togglePermissionForRole } from '../utils/permissions.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { showConfirmDialog } from '../components/ConfirmDialog.js';
import { promptPinAuth } from '../components/PinAuthModal.js';
import { renderIcon } from '../utils/icons.js';
import { sanitizeHtml } from '../utils/security.js';

export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
];

export class EmployeesPage {
  constructor(container) {
    this.container = container;
    this.users = sessionManager.getAllUsers();
    this.selectedRole = ROLES.MANAGER;
    this.init();
  }

  init() {
    this.users = sessionManager.getAllUsers();
    this.render();
    this.attachEvents();
  }

  render() {
    const currentUser = sessionManager.getUser();
    const isOwner = currentUser && (currentUser.role === ROLES.OWNER || currentUser.name.toLowerCase() === 'safar');
    const isOwnerOrManager = currentUser && (currentUser.role === ROLES.OWNER || currentUser.role === ROLES.MANAGER);
    const allPermissions = Object.values(PERMISSIONS);
    const roleMap = loadRolePermissionsMap();
    const activeRolePermissions = roleMap[this.selectedRole] || [];

    const userCardsHtml = this.users.map(u => `
      <div class="flex items-center justify-between p-3.5 rounded-[18px] glass-card border border-[var(--line)] ${u.id === currentUser?.id ? 'ring-2 ring-[var(--accent)]' : ''}">
        <div class="flex items-center space-x-3.5 min-w-0">
          <div class="relative group/avatar cursor-pointer" data-edit-staff="${u.id}">
            <img src="${u.avatar || PRESET_AVATARS[0]}" alt="${u.name}" class="w-11 h-11 rounded-[14px] object-cover ring-1 ring-[var(--line)] flex-shrink-0 shadow-xs group-hover/avatar:opacity-80 transition" onerror="this.src='${PRESET_AVATARS[0]}'" />
            <span class="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-slate-800 border border-[var(--line)] text-[8px] text-[var(--accent)] shadow-xs">📷</span>
          </div>
          <div class="truncate">
            <div class="flex items-center space-x-2">
              <h4 class="text-xs font-black text-[var(--text)] truncate">${u.name}</h4>
              ${u.id === currentUser?.id ? '<span class="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-[var(--accent)]/15 text-[var(--accent)]">You</span>' : ''}
              ${u.role === ROLES.OWNER ? '<span class="text-[9px] text-amber-600 dark:text-amber-400 font-bold">★ Primary Owner</span>' : ''}
            </div>
            <div class="flex items-center space-x-2 mt-0.5 text-[10px] text-[var(--muted)]">
              <span>Security: <strong class="font-mono text-[var(--muted)] font-bold">PIN & Password Encrypted</strong></span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <span class="badge ${u.role === ROLES.OWNER ? 'badge-platinum' : u.role === ROLES.MANAGER ? 'badge-blue' : u.role === ROLES.INVENTORY ? 'badge-amber' : 'badge-emerald'}">
            ${u.role}
          </span>
          
          ${isOwnerOrManager ? `
            <button data-edit-staff="${u.id}" class="p-1.5 rounded-[10px] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition" title="Edit User Profile & Photo">
              ${renderIcon('settings', 'w-4 h-4')}
            </button>
            ${u.role !== ROLES.OWNER && u.id !== currentUser?.id ? `
              <button data-delete-staff="${u.id}" class="p-1.5 rounded-[10px] text-[var(--muted)] hover:text-[var(--red)] hover:bg-red-500/10 transition" title="Delete User">
                ${renderIcon('trash-2', 'w-4 h-4')}
              </button>
            ` : ''}
          ` : ''}

          <button data-switch-to-user="${u.id}" class="px-3 py-1 rounded-[10px] text-xs font-black glass-btn-secondary hover:text-[var(--accent)]">
            ${u.id === currentUser?.id ? 'Active' : 'Switch'}
          </button>
        </div>
      </div>
    `).join('');

    const permissionsMatrixHtml = allPermissions.map(perm => {
      const isGranted = activeRolePermissions.includes(perm);
      const isOwnerRoleSelected = this.selectedRole === ROLES.OWNER;

      return `
        <div class="flex items-center justify-between p-2.5 rounded-[14px] glass-card border border-[var(--line)] text-xs">
          <span class="font-mono font-bold text-[var(--text)]">${perm}</span>
          
          ${isOwnerRoleSelected ? `
            <span class="badge badge-platinum text-[10px]">Permanent Full Access</span>
          ` : isOwner ? `
            <button
              data-toggle-perm="${perm}"
              data-role="${this.selectedRole}"
              class="px-2.5 py-1 rounded-[10px] text-[11px] font-bold transition flex items-center space-x-1.5 active:scale-95 ${isGranted ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'glass-btn-secondary text-[var(--muted)] hover:text-[var(--text)]'}"
              title="Click to ${isGranted ? 'Revoke' : 'Grant'} ${perm} for ${this.selectedRole}"
            >
              <span>${isGranted ? 'Granted' : 'Restricted'}</span>
              <span class="font-black">${isGranted ? '✓' : '＋'}</span>
            </button>
          ` : `
            <span class="badge ${isGranted ? 'badge-emerald' : 'badge-bronze'}">
              ${isGranted ? 'Granted' : 'Restricted'}
            </span>
          `}
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Staff & Permissions</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Manage cashier credentials, profile pictures, PINs, and role access permissions.</p>
          </div>

          <div class="flex items-center space-x-2.5 flex-wrap gap-y-2">
            ${isOwner ? `
              <button id="transfer-ownership-btn" class="px-3.5 py-2.5 rounded-[14px] text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95 transition flex items-center space-x-1.5">
                <span>👑</span>
                <span>Transfer Ownership</span>
              </button>
            ` : ''}

            ${isOwnerOrManager ? `
              <button id="add-staff-btn" class="px-4 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary flex items-center space-x-1.5 shadow-md">
                <span>+ Add Staff User</span>
              </button>
            ` : ''}
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- Left: User Accounts -->
          <div class="lg:col-span-7 space-y-3">
            <div class="flex items-center justify-between px-1">
              <h3 class="font-black text-xs uppercase tracking-wider text-[var(--muted)]">Shop Personnel (${this.users.length})</h3>
              <span class="text-xs text-[var(--accent)] font-extrabold">Logged in: ${currentUser?.name}</span>
            </div>
            <div class="space-y-2.5">
              ${userCardsHtml}
            </div>
          </div>

          <!-- Right: Permissions Matrix Reference & Owner Editor -->
          <div class="lg:col-span-5 space-y-3">
            <div class="flex items-center justify-between px-1">
              <div>
                <h3 class="font-black text-xs uppercase tracking-wider text-[var(--muted)]">Role Permissions Matrix</h3>
                ${isOwner ? `
                  <span class="text-[10px] text-[var(--green)] font-bold">● Owner Mode: Tap any permission below to toggle</span>
                ` : `
                  <span class="text-[10px] text-[var(--muted)] font-bold">🔒 View Only (Only Store Owner can edit)</span>
                `}
              </div>
              <div class="flex rounded-[12px] p-0.5 glass border border-[var(--line)] text-[10px] font-black">
                ${[ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.INVENTORY].map(r => `
                  <button data-select-role-matrix="${r}" class="px-2 py-1 rounded-[8px] transition ${this.selectedRole === r ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--muted)] hover:text-[var(--text)]'}">
                    ${r}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="glass p-3.5 rounded-[22px] border border-[var(--line)] space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-none shadow-sm">
              ${permissionsMatrixHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEvents() {
    const currentUser = sessionManager.getUser();

    this.container.querySelectorAll('[data-select-role-matrix]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedRole = btn.getAttribute('data-select-role-matrix');
        this.render();
        this.attachEvents();
      });
    });

    // Owner Toggle Permission Button Handler
    this.container.querySelectorAll('[data-toggle-perm]').forEach(btn => {
      btn.addEventListener('click', () => {
        const perm = btn.getAttribute('data-toggle-perm');
        const role = btn.getAttribute('data-role');
        try {
          const updated = togglePermissionForRole(currentUser, role, perm);
          const isNowGranted = updated.includes(perm);
          toast.success(`${isNowGranted ? 'Granted' : 'Revoked'} ${perm} for ${role}`);
          this.render();
          this.attachEvents();
        } catch (err) {
          toast.error(err.message);
        }
      });
    });

    this.container.querySelectorAll('[data-switch-to-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-switch-to-user');
        const targetUser = this.users.find(u => u.id === id);
        if (!targetUser) return;

        if (currentUser && currentUser.id === targetUser.id) {
          toast.info('This is already your active account.');
          return;
        }

        promptPinAuth({
          targetUser,
          title: `Switch Account: ${targetUser.name}`,
          description: `Enter 4-digit PIN for ${targetUser.name}`,
          onSuccess: () => {
            window.location.reload();
          }
        });
      });
    });

    this.container.querySelectorAll('[data-delete-staff]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-staff');
        const user = this.users.find(u => u.id === id);
        showConfirmDialog({
          title: 'Delete Staff User',
          message: `Are you sure you want to remove ${user ? user.name : 'this user'}? This cannot be undone.`,
          confirmText: 'Delete User',
          isDanger: true,
          onConfirm: async () => {
            try {
              await sessionManager.deleteUser(id);
              toast.success('Staff user deleted from local database and Supabase cloud.');
              await this.init();
            } catch (err) {
              toast.error(err.message);
            }
          }
        });
      });
    });

    this.container.querySelectorAll('[data-edit-staff]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-staff');
        this.openUserModal(id);
      });
    });

    const addBtn = this.container.querySelector('#add-staff-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.openUserModal();
      });
    }

    const transferBtn = this.container.querySelector('#transfer-ownership-btn');
    if (transferBtn) {
      transferBtn.addEventListener('click', () => {
        this.openTransferOwnershipModal();
      });
    }
  }

  openUserModal(userId = null) {
    const isEdit = Boolean(userId);
    const user = isEdit ? this.users.find(u => u.id === userId) : null;
    const currentUser = sessionManager.getUser();
    const isOwner = currentUser && (currentUser.role === ROLES.OWNER || currentUser.name.toLowerCase() === 'safar');
    const isTargetUserOwner = user && user.role === ROLES.OWNER;
    let currentAvatarUrl = user ? (user.avatar || PRESET_AVATARS[0]) : PRESET_AVATARS[0];

    const contentHtml = `
      <form id="staff-form" class="space-y-4">
        <!-- Avatar Selector Section -->
        <div class="flex flex-col items-center justify-center p-3.5 rounded-[18px] glass-card border border-[var(--line)] space-y-3">
          <label for="avatar-file-input" class="relative group/avatar cursor-pointer" title="Click to upload custom photo">
            <img id="avatar-preview-img" src="${currentAvatarUrl}" alt="Profile Preview" class="w-20 h-20 rounded-[22px] object-cover ring-2 ring-[var(--accent)] shadow-md group-hover:opacity-90 transition" />
            <div class="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[var(--accent)] text-white shadow-md hover:scale-110 active:scale-95 transition text-xs">
              📷
            </div>
          </label>
          <input id="avatar-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" class="hidden" />
          
          <div class="text-center space-y-1">
            <span class="text-xs font-bold text-[var(--text)]">Profile Photo</span>
            <p class="text-[10px] text-[var(--muted)] font-medium">Upload your local image or pick a preset below</p>
            <label for="avatar-file-input" class="inline-flex items-center justify-center cursor-pointer px-3.5 py-1.5 rounded-[10px] text-[11px] font-bold glass-btn-primary shadow-xs hover:scale-105 active:scale-95 transition mt-1">
              📁 Choose Photo from Device
            </label>
          </div>

          <!-- Preset Avatar Swatches -->
          <div class="flex items-center gap-1.5 flex-wrap justify-center pt-1 border-t border-[var(--line)] w-full">
            ${PRESET_AVATARS.map((pUrl, pIdx) => `
              <button
                type="button"
                data-select-preset="${pUrl}"
                class="w-7 h-7 rounded-[8px] overflow-hidden border border-[var(--line)] hover:scale-110 active:scale-95 transition shadow-xs"
                title="Select preset avatar ${pIdx + 1}"
              >
                <img src="${pUrl}" alt="Preset ${pIdx + 1}" class="w-full h-full object-cover" />
              </button>
            `).join('')}
          </div>
          <input type="hidden" name="avatar" id="avatar-hidden-input" value="${currentAvatarUrl}" />
        </div>

        <div>
          <label class="block text-xs font-bold text-[var(--text)] mb-1">Full Name</label>
          <input name="name" type="text" required value="${user ? user.name : ''}" placeholder="e.g. safar" class="w-full h-11 px-3.5 rounded-[12px] glass-input text-xs font-semibold" />
        </div>

        <div>
          <label class="block text-xs font-bold text-[var(--text)] mb-1">Email Address</label>
          <input name="email" type="email" required value="${user ? user.email : ''}" placeholder="safar@flowpos.store" class="w-full h-11 px-3.5 rounded-[12px] glass-input text-xs font-semibold" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[var(--text)] mb-1">Assign Role</label>
            ${isTargetUserOwner ? `
              <input type="text" disabled value="Owner (Permanent Full Access)" class="w-full h-11 px-3.5 rounded-[12px] glass-input text-xs font-bold bg-black/5 dark:bg-white/5 cursor-not-allowed opacity-80" />
              <input type="hidden" name="role" value="${ROLES.OWNER}" />
              <small class="text-[9px] text-[var(--muted)] block mt-1">Role is locked. Use "Transfer Ownership" to change.</small>
            ` : `
              <select name="role" class="w-full h-11 px-3.5 rounded-[12px] glass-input text-xs font-semibold">
                <option value="${ROLES.MANAGER}" ${user && user.role === ROLES.MANAGER ? 'selected' : ''}>Manager</option>
                <option value="${ROLES.CASHIER}" ${!user || user.role === ROLES.CASHIER ? 'selected' : ''}>Cashier</option>
                <option value="${ROLES.INVENTORY}" ${user && user.role === ROLES.INVENTORY ? 'selected' : ''}>Inventory</option>
              </select>
            `}
          </div>

          <div>
            <label class="block text-xs font-bold text-[var(--text)] mb-1">4-Digit PIN</label>
            <div class="relative flex items-center">
              <input id="staff-pin-input" name="pin" type="password" maxlength="4" pattern="[0-9]{4}" required value="${user ? user.pin : '1234'}" placeholder="4-digit PIN" class="w-full h-11 pl-3.5 pr-10 rounded-[12px] glass-input text-xs font-mono font-bold" />
              <button type="button" id="toggle-staff-pin-btn" class="absolute right-2 p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] transition" title="Toggle PIN visibility">
                ${renderIcon('eye', 'w-3.5 h-3.5')}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-[var(--text)] mb-1">Password</label>
          <div class="relative flex items-center">
            <input id="staff-password-input" name="password" type="password" required value="${user ? user.password : '123456'}" placeholder="Account Password" class="w-full h-11 pl-3.5 pr-10 rounded-[12px] glass-input text-xs font-semibold" />
            <button type="button" id="toggle-staff-password-btn" class="absolute right-2 p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] transition" title="Toggle password visibility">
              ${renderIcon('eye', 'w-3.5 h-3.5')}
            </button>
          </div>
        </div>

        <div class="pt-2 flex justify-end space-x-2">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2.5 rounded-[12px] text-xs font-bold glass-btn-secondary">Cancel</button>
          <button type="submit" class="px-5 py-2.5 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">${isEdit ? 'Save Changes' : 'Create Staff User'}</button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: isEdit ? `Edit Staff: ${user.name}` : 'Add New Staff Member',
      content: contentHtml,
      size: 'md',
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#staff-form');
        const cancelBtn = modalEl.querySelector('#modal-cancel-btn');
        const avatarPreviewImg = modalEl.querySelector('#avatar-preview-img');
        const avatarHiddenInput = modalEl.querySelector('#avatar-hidden-input');
        const avatarFileInput = modalEl.querySelector('#avatar-file-input');

        // Preset Avatar Buttons
        modalEl.querySelectorAll('[data-select-preset]').forEach(btn => {
          btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-select-preset');
            avatarPreviewImg.src = url;
            avatarHiddenInput.value = url;
            modalEl.querySelectorAll('[data-select-preset]').forEach(b => {
              b.classList.remove('ring-2', 'ring-[var(--accent)]', 'scale-110');
            });
            btn.classList.add('ring-2', 'ring-[var(--accent)]', 'scale-110');
          });
        });

        // Custom File Upload with HTML5 Canvas Auto-Downscaling & Base64 Encoding
        if (avatarFileInput) {
          avatarFileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const maxDim = 240;
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                    if (width > maxDim) {
                      height = Math.round((height * maxDim) / width);
                      width = maxDim;
                    }
                  } else {
                    if (height > maxDim) {
                      width = Math.round((width * maxDim) / height);
                      height = maxDim;
                    }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, width, height);

                  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                  avatarPreviewImg.src = compressedDataUrl;
                  avatarHiddenInput.value = compressedDataUrl;
                  toast.success(`Photo selected: ${file.name}`);
                };
                img.onerror = () => {
                  avatarPreviewImg.src = event.target.result;
                  avatarHiddenInput.value = event.target.result;
                  toast.success(`Photo loaded: ${file.name}`);
                };
                img.src = event.target.result;
              };
              reader.readAsDataURL(file);
            }
            avatarFileInput.value = '';
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => modal.close());
        }

        const toggleStaffPinBtn = modalEl.querySelector('#toggle-staff-pin-btn');
        const staffPinInput = modalEl.querySelector('#staff-pin-input');
        if (toggleStaffPinBtn && staffPinInput) {
          toggleStaffPinBtn.addEventListener('click', () => {
            const isPwd = staffPinInput.type === 'password';
            staffPinInput.type = isPwd ? 'text' : 'password';
            toggleStaffPinBtn.innerHTML = renderIcon(isPwd ? 'eye-off' : 'eye', 'w-3.5 h-3.5');
          });
        }

        const toggleStaffPwdBtn = modalEl.querySelector('#toggle-staff-password-btn');
        const staffPwdInput = modalEl.querySelector('#staff-password-input');
        if (toggleStaffPwdBtn && staffPwdInput) {
          toggleStaffPwdBtn.addEventListener('click', () => {
            const isPwd = staffPwdInput.type === 'password';
            staffPwdInput.type = isPwd ? 'text' : 'password';
            toggleStaffPwdBtn.innerHTML = renderIcon(isPwd ? 'eye-off' : 'eye', 'w-3.5 h-3.5');
          });
        }

        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const avatarVal = avatarHiddenInput.value || currentAvatarUrl;
            const data = {
              name: form.name.value.trim(),
              email: form.email.value.trim(),
              role: form.role ? form.role.value : (user ? user.role : ROLES.CASHIER),
              pin: form.pin.value.trim(),
              password: form.password.value,
              avatar: avatarVal
            };

            try {
              if (isEdit) {
                await sessionManager.updateUser(userId, data);
                toast.success(`Profile photo & details updated for ${data.name}!`);
              } else {
                await sessionManager.addUser(data);
                toast.success(`Staff member ${data.name} created!`);
              }
              modal.close();
              this.init();
            } catch (err) {
              toast.error(err.message);
            }
          });
        }
      }
    });

    modal.open();
  }

  openTransferOwnershipModal() {
    const eligibleStaff = this.users.filter(u => u.role !== ROLES.OWNER);
    if (eligibleStaff.length === 0) {
      toast.error('No other staff members available to transfer ownership to.');
      return;
    }

    const contentHtml = `
      <form id="transfer-ownership-form" class="space-y-4">
        <div class="p-3.5 rounded-[16px] bg-amber-500/15 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <strong class="block font-bold">⚠️ Critical Administrative Action</strong>
          <p class="leading-relaxed">
            Transferring ownership will grant complete executive permissions and master admin control to the selected staff member. Your account will transition to Store Manager.
          </p>
        </div>

        <div>
          <label class="block text-xs font-bold text-[var(--text)] mb-1">Select New Store Owner</label>
          <select name="newOwnerId" required class="w-full h-11 px-3.5 rounded-[12px] glass-input text-xs font-semibold">
            ${eligibleStaff.map(u => `
              <option value="${u.id}">${u.name} (${u.role} &bull; ${u.email})</option>
            `).join('')}
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-[var(--text)] mb-1">Current Owner Password Verification</label>
          <input
            name="password"
            type="password"
            required
            placeholder="Enter your owner password to confirm"
            class="w-full h-11 px-3.5 rounded-[12px] glass-input text-xs font-semibold"
          />
        </div>

        <div class="pt-2 flex justify-end space-x-2">
          <button type="button" id="transfer-cancel-btn" class="px-4 py-2.5 rounded-[12px] text-xs font-bold glass-btn-secondary">Cancel</button>
          <button type="submit" class="px-5 py-2.5 rounded-[12px] text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md active:scale-95 transition">
            Confirm Ownership Transfer
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: '👑 Transfer Store Ownership Protocol',
      content: contentHtml,
      maxWidth: 'max-w-md'
    });

    modal.open();

    const form = modal.element.querySelector('#transfer-ownership-form');
    const cancelBtn = modal.element.querySelector('#transfer-cancel-btn');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => modal.close());
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newOwnerId = form.newOwnerId.value;
        const password = form.password.value;

        try {
          const res = sessionManager.transferOwnership(newOwnerId, password);
          toast.success(`Store Ownership successfully transferred to ${res.newOwner.name}!`);
          modal.close();
          window.location.reload();
        } catch (err) {
          toast.error(err.message);
        }
      });
    }
  }
}
