// Shared constants and pure helpers for CivicWorks (no React in here, so they are easy to test).

export const DEMO_CENTER = [12.8405, 80.1535];
export const STATUSES = ['planned', 'ongoing', 'delayed', 'completed'];
export const STATUS_LABELS = { planned: 'Planned', ongoing: 'Ongoing', delayed: 'Delayed', completed: 'Completed' };
export const STATUS_COLORS = { planned: '#64748b', ongoing: '#0d9488', delayed: '#dc6b35', completed: '#57966d' };
export const CATEGORIES = ['Road', 'Drainage', 'Streetlight', 'Water supply', 'Footpath', 'Electricity', 'Sewage', 'Other'];
export const REPORT_CATEGORIES = ['Safety hazard', 'Work delay', 'Poor quality', 'Traffic disruption', 'Water or electricity interruption', 'Other'];

/* ---------- safe browser storage (private windows / corrupted values must never blank the app) ---------- */
export function readStoredList(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(parsed) && parsed.every(item => item && typeof item === 'object' && item.id) ? parsed : fallback;
  } catch { return fallback; }
}
export function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function removeStored(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }

/* ---------- formatting ---------- */
export const formatDate = (value) => {
  if (!value) return 'Not recorded';
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const formatMoney = (value) => value === null || value === undefined || value === '' || Number.isNaN(Number(value))
  ? 'Not disclosed'
  : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value));
export const formatTime = (value) => {
  if (!value) return 'Not recorded';
  const [h, m] = String(value).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 'Not recorded';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
export const shortDateTime = (value) => {
  if (!value) return 'Not recorded';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Not recorded' : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};
export function reportStatusLabel(status) {
  return ({ submitted: 'Submitted', in_review: 'In review', resolved: 'Resolved', rejected: 'Closed / rejected' })[status] || status || 'Submitted';
}
export const reportStatusTone = (status) => status === 'resolved' ? 'completed' : status === 'in_review' ? 'ongoing' : status === 'rejected' ? 'delayed' : 'planned';

/* ---------- geometry ---------- */
export const distanceKm = (lat1, lon1, lat2, lon2) => {
  const rad = (n) => n * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};
export const withinRadius = (project, center, radiusKm) => distanceKm(center[0], center[1], Number(project.latitude), Number(project.longitude)) <= radiusKm;

/* ---------- tickets ---------- */
const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, so `byte % 32` is unbiased
export const makeTicket = () => `CW-${Array.from(crypto.getRandomValues(new Uint8Array(8)), n => TICKET_ALPHABET[n % TICKET_ALPHABET.length]).join('')}`;

/* ---------- misc ---------- */
/** crypto.randomUUID only exists on secure origins (https / localhost); this works on plain http too. */
export function makeUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export const readFileAsDataUrl = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
export const safeArray = (value) => Array.isArray(value) ? value : (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : []);
export const normalizeWard = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const slugifyWard = (value) => normalizeWard(value) || 'unassigned';
/** Same rule the database uses to match officers to wards: lower(trim(ward)). */
export const wardKey = (value) => String(value || '').trim().toLowerCase();

/** Distinct ward names used by published projects, in natural order (Ward 2 before Ward 10). */
export function knownWards(projects) {
  const seen = new Map();
  for (const p of projects) {
    const name = String(p.ward || '').trim();
    const key = wardKey(name);
    if (key && !seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }));
}
/** The ward of the project closest to a point (within maxKm), or '' when nothing is close enough. */
export function nearestWard(projects, point, maxKm = 3) {
  let best = '', bestKm = maxKm;
  for (const p of projects) {
    if (!p.ward) continue;
    const km = distanceKm(point[0], point[1], Number(p.latitude), Number(p.longitude));
    if (km <= bestKm) { bestKm = km; best = String(p.ward).trim(); }
  }
  return best;
}

/* ---------- automatic "delayed" status ---------- */
export const todayIso = (now = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
/**
 * A project that is still planned/ongoing after its planned finish date, with no actual finish recorded,
 * is shown as delayed. The officer's recorded status is kept in `recordedStatus` so it is never overwritten by this rule.
 */
export function deriveStatus(project, today = todayIso()) {
  const recordedStatus = project.status;
  const plannedEnd = String(project.plannedEnd || '').slice(0, 10);
  const finished = recordedStatus === 'completed' || Boolean(project.actualEnd);
  const autoDelayed = !finished && Boolean(plannedEnd) && plannedEnd < today && (recordedStatus === 'planned' || recordedStatus === 'ongoing');
  return {
    ...project,
    status: autoDelayed ? 'delayed' : recordedStatus,
    recordedStatus,
    autoDelayed,
    delayReason: project.delayReason || (autoDelayed ? `The planned finish date (${formatDate(plannedEnd)}) has passed and no completion has been recorded. The responsible office should publish a revised date.` : '')
  };
}

/* ---------- ticket lookup throttle (client side) ---------- */
export const LOOKUP_LIMIT = 5;
export const LOOKUP_WINDOW_MS = 60_000;
/** Returns { allowed, retryInMs, attempts } and records the attempt when allowed. `attempts` is the list of past timestamps. */
export function checkLookupThrottle(attempts, now = Date.now()) {
  const recent = attempts.filter(t => now - t < LOOKUP_WINDOW_MS);
  if (recent.length >= LOOKUP_LIMIT) return { allowed: false, retryInMs: LOOKUP_WINDOW_MS - (now - recent[0]), attempts: recent };
  return { allowed: true, retryInMs: 0, attempts: [...recent, now] };
}

export function emptyProjectForm(center = DEMO_CENTER) {
  return { title: '', category: 'Road', status: 'planned', department: '', ward: '', contractor: '', responsibleOfficer: '', description: '', latitude: center[0], longitude: center[1], plannedStart: '', actualStart: '', plannedEnd: '', actualEnd: '', workStartTime: '', workEndTime: '', progress: 0, estimatedCost: '', spentToDate: '', materials: '', qualityNotes: '', affectedResidents: '', impacts: '', safety: '', trafficPlan: '', delayReason: '' };
}

/** Returns an error message for an invalid project form, or null when it is fine. */
export function validateProjectForm(form) {
  const lat = Number(form.latitude), lon = Number(form.longitude);
  if (form.latitude === '' || form.longitude === '' || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return 'Enter valid map coordinates (latitude -90 to 90, longitude -180 to 180).';
  if (form.plannedStart && form.plannedEnd && form.plannedEnd < form.plannedStart) return 'The planned finish date cannot be before the planned start date.';
  if (form.actualStart && form.actualEnd && form.actualEnd < form.actualStart) return 'The actual finish date cannot be before the actual start date.';
  if (form.estimatedCost !== '' && Number(form.estimatedCost) < 0) return 'Estimated cost cannot be negative.';
  if (form.spentToDate !== '' && Number(form.spentToDate) < 0) return 'Reported spend cannot be negative.';
  if (form.status === 'delayed' && !String(form.delayReason || '').trim()) return 'Add a reason for the delay before saving a delayed project.';
  return null;
}
