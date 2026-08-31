/**
 * FlowPOS Staff Time Clock & Timesheet Service
 * Shift punch in / punch out, break tracking, and wage calculation
 */

const STORAGE_KEY = 'flowpos_time_punches';

export const INITIAL_PUNCHES = [
  {
    id: 'punch-01',
    employee_id: 'emp-01',
    employee_name: 'Admin Owner',
    role: 'OWNER',
    punch_in: new Date(Date.now() - 3600000 * 5).toISOString(),
    punch_out: null, // currently on shift
    hourly_rate: 2500,
    status: 'ACTIVE' // 'ACTIVE' | 'BREAK' | 'COMPLETED'
  },
  {
    id: 'punch-02',
    employee_id: 'emp-02',
    employee_name: 'Nimali Senanayake',
    role: 'CASHIER',
    punch_in: new Date(Date.now() - 3600000 * 8).toISOString(),
    punch_out: new Date(Date.now() - 3600000 * 1).toISOString(),
    hourly_rate: 1200,
    total_hours: 7.0,
    status: 'COMPLETED'
  }
];

class TimeClockService {
  constructor() {
    this.punches = this.load();
  }

  load() {
    if (typeof localStorage !== 'undefined') {
      const isWiped = localStorage.getItem('flowpos_db_seeded') === 'wiped';
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data !== null) return JSON.parse(data);
      } catch {}
      if (isWiped) return [];
      this.save(INITIAL_PUNCHES);
    }
    return [];
  }

  save(punches) {
    this.punches = punches;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(punches));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:timeclock-updated', { detail: punches }));
    }
  }

  getAll() {
    return this.punches;
  }

  getActivePunch(employeeId) {
    return this.punches.find(p => p.employee_id === employeeId && p.status !== 'COMPLETED');
  }

  punchIn(employee) {
    const active = this.getActivePunch(employee.id);
    if (active) throw new Error(`${employee.name} is already clocked in!`);

    const newPunch = {
      id: `punch-${Date.now().toString().slice(-6)}`,
      employee_id: employee.id,
      employee_name: employee.name,
      role: employee.role || 'CASHIER',
      hourly_rate: Number(employee.hourly_rate) || 1200,
      punch_in: new Date().toISOString(),
      punch_out: null,
      status: 'ACTIVE'
    };

    this.punches.unshift(newPunch);
    this.save(this.punches);
    return newPunch;
  }

  clockIn(employeeId, employeeName = 'Staff') {
    return this.punchIn({ id: employeeId, name: employeeName });
  }

  punchOut(employeeId) {
    const punch = this.getActivePunch(employeeId);
    if (!punch) throw new Error('No active shift found to clock out');

    const inTime = new Date(punch.punch_in).getTime();
    const outTime = Date.now();
    const hours = Math.round(((outTime - inTime) / 3600000) * 100) / 100;

    punch.punch_out = new Date().toISOString();
    punch.total_hours = Math.max(0.01, hours);
    punch.status = 'COMPLETED';

    this.save(this.punches);
    return punch;
  }

  clockOut(employeeId) {
    return this.punchOut(employeeId);
  }

  clearAll() {
    this.punches = [];
    this.save([]);
  }

  resetToInitial() {
    this.punches = INITIAL_PUNCHES;
    this.save(INITIAL_PUNCHES);
  }
}

export const timeClockService = new TimeClockService();
