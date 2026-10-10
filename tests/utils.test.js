import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveStatus, checkLookupThrottle, LOOKUP_LIMIT, LOOKUP_WINDOW_MS, knownWards, nearestWard, wardKey,
  validateProjectForm, emptyProjectForm, makeTicket, makeUuid, todayIso, safeArray, formatDate, formatTime, formatMoney
} from '../src/utils.js';
import { fromDbProject, toDbProject } from '../src/db.js';

const proj = (over = {}) => ({ id: 'x', status: 'ongoing', plannedEnd: '2026-10-08', actualEnd: '', delayReason: '', ...over });

test('deriveStatus: overdue planned/ongoing work becomes delayed, with a reason and the recorded status kept', () => {
  const r = deriveStatus(proj(), '2026-10-10');
  assert.equal(r.status, 'delayed');
  assert.equal(r.recordedStatus, 'ongoing');
  assert.equal(r.autoDelayed, true);
  assert.match(r.delayReason, /planned finish date/);
  assert.equal(deriveStatus(proj({ status: 'planned' }), '2026-10-10').status, 'delayed');
});

test('deriveStatus: finish day itself is not late, completed or finished work is never delayed', () => {
  assert.equal(deriveStatus(proj(), '2026-10-08').status, 'ongoing');
  assert.equal(deriveStatus(proj({ status: 'completed' }), '2026-10-10').status, 'completed');
  assert.equal(deriveStatus(proj({ actualEnd: '2026-10-09' }), '2026-10-10').autoDelayed, false);
  assert.equal(deriveStatus(proj({ plannedEnd: '' }), '2026-10-10').status, 'ongoing');
});

test('deriveStatus: keeps an officer-written delay reason and an explicit delayed status', () => {
  const r = deriveStatus(proj({ status: 'delayed', delayReason: 'Rain' }), '2026-10-10');
  assert.equal(r.status, 'delayed'); assert.equal(r.autoDelayed, false); assert.equal(r.delayReason, 'Rain');
});

test('todayIso uses the local calendar date', () => {
  assert.equal(todayIso(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('lookup throttle allows LOOKUP_LIMIT tries per window, then blocks, then recovers', () => {
  let attempts = [];
  for (let i = 0; i < LOOKUP_LIMIT; i++) { const g = checkLookupThrottle(attempts, 1000 + i); assert.equal(g.allowed, true); attempts = g.attempts; }
  const blocked = checkLookupThrottle(attempts, 2000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryInMs > 0 && blocked.retryInMs <= LOOKUP_WINDOW_MS);
  assert.equal(blocked.attempts.length, LOOKUP_LIMIT); // a blocked attempt is not recorded
  assert.equal(checkLookupThrottle(attempts, 1000 + LOOKUP_WINDOW_MS + LOOKUP_LIMIT).allowed, true);
});

test('knownWards dedupes the way the database does (lower/trim) and sorts naturally', () => {
  const w = knownWards([{ ward: 'Ward 10' }, { ward: 'ward 2' }, { ward: ' Ward 2 ' }, { ward: 'Ward 1' }, { ward: '' }, {}]);
  assert.deepEqual(w, ['Ward 1', 'ward 2', 'Ward 10']);
  assert.equal(wardKey('  Ward 12 '), 'ward 12');
});

test('nearestWard returns the closest ward within range, otherwise empty', () => {
  const ps = [{ ward: 'Ward 1', latitude: 12.84, longitude: 80.15 }, { ward: 'Ward 2', latitude: 12.90, longitude: 80.15 }];
  assert.equal(nearestWard(ps, [12.8401, 80.15]), 'Ward 1');
  assert.equal(nearestWard(ps, [13.5, 80.15]), '');
  assert.equal(nearestWard([], [12.84, 80.15]), '');
});

test('validateProjectForm catches bad dates, coordinates, negatives and a delayed project with no reason', () => {
  const ok = { ...emptyProjectForm(), plannedStart: '2026-10-01', plannedEnd: '2026-10-05' };
  assert.equal(validateProjectForm(ok), null);
  assert.match(validateProjectForm({ ...ok, plannedEnd: '2026-09-01' }), /planned finish/);
  assert.match(validateProjectForm({ ...ok, actualStart: '2026-10-05', actualEnd: '2026-10-01' }), /actual finish/);
  assert.match(validateProjectForm({ ...ok, latitude: 123 }), /coordinates/);
  assert.match(validateProjectForm({ ...ok, longitude: '' }), /coordinates/);
  assert.match(validateProjectForm({ ...ok, estimatedCost: -1 }), /negative/);
  assert.match(validateProjectForm({ ...ok, status: 'delayed', delayReason: '  ' }), /reason/);
  assert.equal(validateProjectForm({ ...ok, status: 'delayed', delayReason: 'Rain' }), null);
});

test('tickets and ids are well formed and unique', () => {
  const tickets = new Set(Array.from({ length: 500 }, makeTicket));
  assert.equal(tickets.size, 500);
  for (const t of tickets) assert.match(t, /^CW-[A-HJ-NP-Z2-9]{8}$/);
  assert.match(makeUuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('formatters never throw on bad input', () => {
  assert.equal(formatDate('not a date'), 'Not recorded');
  assert.equal(formatDate(''), 'Not recorded');
  assert.equal(formatTime('xx:yy'), 'Not recorded');
  assert.equal(formatTime('13:05'), '1:05 PM');
  assert.equal(formatMoney('abc'), 'Not disclosed');
  assert.equal(formatMoney(0), '₹0');
  assert.deepEqual(safeArray('a, b ,,c'), ['a', 'b', 'c']);
});

test('database mapping round-trips a project and keeps 0 as a real cost', () => {
  const row = { id: 'u1', title: 'T', category: 'Road', status: 'planned', department: 'D', ward: 'Ward 1', latitude: '12.5', longitude: '80.1', estimated_cost: 0, spent_to_date: null, impacts: ['a'], safety: [] };
  const p = fromDbProject(row);
  assert.equal(p.latitude, 12.5);
  const db = toDbProject({ ...p, estimatedCost: 0, spentToDate: '' });
  assert.equal(db.estimated_cost, 0);
  assert.equal(db.spent_to_date, null);
});
