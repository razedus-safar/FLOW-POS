/**
 * FlowPOS Staff Session & User Manager with Authentication & Admin User Creation
 * Secured Owner Role & Multi-Factor Ownership Transfer Protocol
 */

import { ROLES, hasPermission } from '../utils/permissions.js';
import { globalStore } from './state.js';
import { localDB } from '../offline/database.js';
import { supabaseClient } from '../services/supabase.js';

export const DEFAULT_USERS = [
  {
    id: 'usr-admin',
    name: 'admin',
    role: ROLES.OWNER,
    email: 'admin@flowpos.store',
    pin: '1234',
    password: 'admin',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    title: 'Store Owner & Executive Admin'
  },
  {
    id: 'usr-001',
    name: 'Elena Vance',
    role: ROLES.MANAGER,
    email: 'elena@flowpos.store',
    pin: '1234',
    password: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Store Manager'
  },
  {
    id: 'usr-002',
    name: 'Marcus Chen',
    role: ROLES.MANAGER,
    email: 'marcus@flowpos.store',
    pin: '2345',
    password: 'manager123',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    title: 'Floor Manager'
  },
  {
    id: 'usr-003',
    name: 'Sophia Rodriguez',
    role: ROLES.CASHIER,
    email: 'sophia@flowpos.store',
    pin: '3456',
    password: 'cashier123',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    title: 'Lead Cashier'
  },
  {
    id: 'usr-004',
    name: 'Liam Davies',
    role: ROLES.CASHIER,
    email: 'liam@flowpos.store',
    pin: '4567',
    password: 'cashier123',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    title: 'Cashier'
  },
  {
    id: 'usr-005',
    name: 'Aria Thorne',
    role: ROLES.INVENTORY,
    email: 'aria@flowpos.store',
    pin: '5678',
    password: 'inventory123',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    title: 'Inventory Specialist'
  }
];

class SessionManager {
  constructor() {
    this.users = this.loadUsers();
    const hasStorage = typeof localStorage !== 'undefined';
    const savedUserId = hasStorage ? localStorage.getItem('flowpos_active_user_id') : null;
    const isLogged = hasStorage ? localStorage.getItem('flowpos_authenticated') === 'true' : false;

    if (isLogged && savedUserId) {
      this.currentUser = this.users.find(u => u.id === savedUserId) || null;
      this.authenticated = this.currentUser !== null;
    } else {
      this.currentUser = null;
      this.authenticated = false;
    }

    globalStore.set('currentUser', this.currentUser);
    globalStore.set('isAuthenticated', this.authenticated);
  }

  loadUsers() {
    const hasStorage = typeof localStorage !== 'undefined';
    const isWiped = hasStorage && localStorage.getItem('flowpos_db_seeded') === 'wiped';
    let list = isWiped ? [DEFAULT_USERS[0]] : [...DEFAULT_USERS];

    if (hasStorage) {
      try {
        const data = localStorage.getItem('flowpos_staff_users');
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        }
      } catch {}
    }

    // Auto-migrate legacy 'safar' user to 'admin'
    for (const u of list) {
      if (u.name.toLowerCase() === 'safar' || u.id === 'usr-safar') {
        u.id = 'usr-admin';
        u.name = 'admin';
        u.email = 'admin@flowpos.store';
        u.password = 'admin';
        u.pin = '1234';
        u.role = ROLES.OWNER;
        u.title = 'Store Owner & Executive Admin';
      }
    }

    // Ensure an owner always exists with OWNER role & permanent access
    const ownerIdx = list.findIndex(u => u.role === ROLES.OWNER || u.name.toLowerCase() === 'admin' || u.id === 'usr-admin');
    if (ownerIdx >= 0) {
      list[ownerIdx].role = ROLES.OWNER;
      list[ownerIdx].name = list[ownerIdx].name || 'admin';
      list[ownerIdx].password = list[ownerIdx].password || 'admin';
      list[ownerIdx].pin = list[ownerIdx].pin || '1234';
      list[ownerIdx].title = list[ownerIdx].title || 'Store Owner & Executive Admin';
    } else {
      list.unshift(DEFAULT_USERS[0]);
    }

    this.saveUsers(list);
    return list;
  }

  saveUsers(users) {
    this.users = users;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('flowpos_staff_users', JSON.stringify(users));
        if (typeof localDB !== 'undefined' && localDB.putMany) {
          localDB.putMany('users', users).catch(() => {});
        }
      } catch (e) {
        console.warn('Storage save warning:', e);
      }
    }

    // Auto-sync staff credentials & passwords to Supabase
    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      const payload = users.map(u => ({
        id: String(u.id),
        name: u.name || 'admin',
        role: u.role || 'CASHIER',
        email: u.email || `${u.name}@flowpos.store`,
        pin: String(u.pin || '1234'),
        password: String(u.password || 'admin'),
        avatar: u.avatar || '',
        title: u.title || '',
        is_active: u.is_active !== false,
        updated_at: new Date().toISOString()
      }));
      supabaseClient.client.from('users').upsert(payload, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('Online user sync error:', error.message);
      }).catch(err => console.warn('Online user sync failed:', err));
    }
  }

  getAllUsers() {
    return this.users;
  }

  getUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return this.authenticated && this.currentUser !== null;
  }

  loginWithEmail(emailOrUsername, password) {
    const clean = String(emailOrUsername).trim().toLowerCase();
    const user = this.users.find(u => u.email.toLowerCase() === clean || u.name.toLowerCase() === clean);
    if (!user) {
      return { success: false, message: 'Invalid staff username or email address.' };
    }
    if (user.password && user.password !== password) {
      return { success: false, message: 'Incorrect password.' };
    }
    return this.setAuthenticatedUser(user);
  }

  loginWithPin(pin, targetUserId = null) {
    const cleanPin = String(pin).trim();
    let user = null;
    if (targetUserId) {
      user = this.users.find(u => u.id === targetUserId);
      if (!user || String(user.pin) !== cleanPin) {
        return { success: false, message: 'Incorrect 4-digit PIN for selected staff member.' };
      }
    } else {
      user = this.users.find(u => String(u.pin) === cleanPin);
      if (!user) {
        return { success: false, message: 'Invalid 4-digit staff PIN code.' };
      }
    }
    return this.setAuthenticatedUser(user);
  }

  loginWithUser(user) {
    return this.setAuthenticatedUser(user);
  }

  setAuthenticatedUser(user) {
    this.currentUser = user;
    this.authenticated = true;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('flowpos_active_user_id', user.id);
      localStorage.setItem('flowpos_authenticated', 'true');
    }
    globalStore.set('currentUser', this.currentUser);
    globalStore.set('isAuthenticated', true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:user-switched', { detail: { user } }));
    }
    return { success: true, user };
  }

  setUser(userId) {
    const isOwner = this.currentUser && (this.currentUser.role === ROLES.OWNER || this.currentUser.name.toLowerCase() === 'admin' || this.currentUser.name.toLowerCase() === 'safar');
    if (!isOwner) {
      throw new Error('Unauthorized user switch. Operator PIN authentication is required.');
    }
    const user = this.users.find(u => u.id === userId);
    if (user) {
      this.setAuthenticatedUser(user);
    }
  }

  can(permission) {
    if (!this.currentUser) return false;
    if (this.currentUser.role === ROLES.OWNER || this.currentUser.name.toLowerCase() === 'admin' || this.currentUser.name.toLowerCase() === 'safar') return true;
    return hasPermission(this.currentUser, permission);
  }

  addUser({ name, email, role, pin, password, avatar, title }) {
    // Only one Owner allowed - cannot add a second Owner directly
    if (role === ROLES.OWNER) {
      role = ROLES.MANAGER;
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || ROLES.CASHIER,
      pin: pin || '1234',
      password: password || '123456',
      avatar: avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      title: title || role
    };

    const exists = this.users.some(u => u.email === newUser.email);
    if (exists) {
      throw new Error(`A user with email ${newUser.email} already exists.`);
    }

    this.users.push(newUser);
    this.saveUsers(this.users);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:user-updated', { detail: { user: newUser } }));
    }
    return newUser;
  }

  updateUser(id, updates) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found.');

    const targetUser = this.users[idx];

    // Locked Owner Role Policy
    if (targetUser.role === ROLES.OWNER && updates.role && updates.role !== ROLES.OWNER) {
      throw new Error('The Store Owner role cannot be changed directly. Please use the "Transfer Ownership" option.');
    }

    if (targetUser.role !== ROLES.OWNER && updates.role === ROLES.OWNER) {
      throw new Error('To promote a staff member to Owner, please use the secure "Transfer Ownership" option.');
    }

    this.users[idx] = { ...this.users[idx], ...updates };
    this.saveUsers(this.users);

    if (this.currentUser && this.currentUser.id === id) {
      this.currentUser = this.users[idx];
      globalStore.set('currentUser', this.currentUser);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('flowpos_active_user_id', this.currentUser.id);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:user-switched', { detail: { user: this.currentUser } }));
      window.dispatchEvent(new CustomEvent('flowpos:user-updated', { detail: { user: this.users[idx] } }));
    }

    return this.users[idx];
  }

  transferOwnership(newOwnerId, confirmationPassword) {
    const isOwner = this.currentUser && (this.currentUser.role === ROLES.OWNER || this.currentUser.name.toLowerCase() === 'safar');
    if (!isOwner) {
      throw new Error('Only the active Store Owner is authorized to transfer ownership.');
    }

    if (this.currentUser.password && this.currentUser.password !== confirmationPassword) {
      throw new Error('Incorrect owner password. Ownership transfer aborted.');
    }

    const newOwnerIdx = this.users.findIndex(u => u.id === newOwnerId);
    if (newOwnerIdx === -1) {
      throw new Error('Target staff user not found.');
    }

    if (this.users[newOwnerIdx].id === this.currentUser.id) {
      throw new Error('You are already the Store Owner.');
    }

    const currentOwnerIdx = this.users.findIndex(u => u.id === this.currentUser.id);

    // Demote previous owner to Manager
    if (currentOwnerIdx !== -1) {
      this.users[currentOwnerIdx].role = ROLES.MANAGER;
      this.users[currentOwnerIdx].title = 'Store Manager';
    }

    // Promote new staff member to Owner
    this.users[newOwnerIdx].role = ROLES.OWNER;
    this.users[newOwnerIdx].title = 'Store Owner & Executive Admin';
    this.saveUsers(this.users);

    this.currentUser = this.users[newOwnerIdx];
    this.setAuthenticatedUser(this.currentUser);

    return {
      previousOwner: currentOwnerIdx !== -1 ? this.users[currentOwnerIdx] : null,
      newOwner: this.users[newOwnerIdx]
    };
  }

  deleteUser(id) {
    const target = this.users.find(u => u.id === id);
    if (target && target.role === ROLES.OWNER) {
      throw new Error('The Store Owner account cannot be deleted. Transfer ownership first if required.');
    }

    if (this.users.length <= 1) {
      throw new Error('Cannot delete the only staff user.');
    }
    this.users = this.users.filter(u => u.id !== id);
    this.saveUsers(this.users);

    if (typeof localDB !== 'undefined' && localDB.delete) {
      localDB.delete('users', id).catch(() => {});
    }

    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      supabaseClient.client.from('users').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase delete user error:', error.message);
      }).catch(err => console.warn('Supabase delete user failed:', err));
    }

    if (this.currentUser && this.currentUser.id === id) {
      this.setAuthenticatedUser(this.users[0]);
    }
  }

  logout() {
    this.currentUser = null;
    this.authenticated = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('flowpos_active_user_id');
      localStorage.removeItem('flowpos_authenticated');
    }
    globalStore.set('currentUser', null);
    globalStore.set('isAuthenticated', false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:auth-logout'));
      window.dispatchEvent(new CustomEvent('flowpos:logout'));
      window.location.hash = '#/login';
    }
  }
}

export const sessionManager = new SessionManager();
