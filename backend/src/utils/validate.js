// Small validation helpers (no external deps).

export const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME = /^[a-zA-Z0-9_.-]{3,50}$/;
export const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM (24h)
export const FREQUENCIES = ['daily', 'weekly', 'monthly'];

// Usual password policy: at least 8 chars, one letter and one number.
export function passwordIssue(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

export function isValidDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}
