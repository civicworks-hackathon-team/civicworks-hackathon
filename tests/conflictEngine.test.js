import test from 'node:test';
import assert from 'node:assert/strict';
import { findCoordinationConflicts, haversineMetres, ADJACENT_METRES } from '../src/conflictEngine.js';
import { demoProjects } from '../src/data.js';

const make = (id, department, start, end, lat = 12.84, lon = 80.15, extra = {}) => ({
  id, department, plannedStart: start, plannedEnd: end, latitude: lat, longitude: lon, status: 'planned', ...extra
});

test('flags different departments that overlap in time and place', () => {
  const r = findCoordinationConflicts([make('a', 'Roads', '2026-10-01', '2026-10-10'), make('b', 'Water', '2026-10-08', '2026-10-12')]);
  assert.equal(r.length, 1);
  assert.equal(r[0].start, '2026-10-08');
  assert.equal(r[0].end, '2026-10-10');
  assert.equal(r[0].type, 'direct');
});

test('touching on the same day counts as an overlap, a gap does not', () => {
  assert.equal(findCoordinationConflicts([make('a', 'Roads', '2026-10-01', '2026-10-05'), make('b', 'Water', '2026-10-05', '2026-10-09')]).length, 1);
  assert.equal(findCoordinationConflicts([make('a', 'Roads', '2026-10-01', '2026-10-04'), make('b', 'Water', '2026-10-05', '2026-10-09')]).length, 0);
});

test('ignores the same department (case and spacing insensitive)', () => {
  assert.equal(findCoordinationConflicts([make('a', 'Roads', '2026-10-01', '2026-10-10'), make('b', ' roads ', '2026-10-02', '2026-10-03')]).length, 0);
});

test('ignores projects that are far apart', () => {
  assert.equal(findCoordinationConflicts([make('a', 'Roads', '2026-10-01', '2026-10-10'), make('b', 'Water', '2026-10-02', '2026-10-03', 12.86, 80.15)]).length, 0);
});

test('classifies a nearby (not adjacent-site) pair as adjacent', () => {
  // about 220 m apart
  const r = findCoordinationConflicts([make('a', 'Roads', '2026-10-01', '2026-10-10'), make('b', 'Water', '2026-10-02', '2026-10-03', 12.842, 80.15)]);
  assert.equal(r.length, 1);
  assert.equal(r[0].type, 'adjacent');
});

test('skips pairs that are both completed', () => {
  const done = { status: 'completed' };
  assert.equal(findCoordinationConflicts([make('a', 'Roads', '2026-10-01', '2026-10-10', 12.84, 80.15, done), make('b', 'Water', '2026-10-02', '2026-10-03', 12.84, 80.15, done)]).length, 0);
});

test('skips projects with missing or invalid dates instead of guessing', () => {
  assert.equal(findCoordinationConflicts([make('a', 'Roads', '', ''), make('b', 'Water', '2026-10-02', '2026-10-03')]).length, 0);
  assert.equal(findCoordinationConflicts([make('a', 'Roads', '2026-10-09', '2026-10-01'), make('b', 'Water', '2026-10-02', '2026-10-03')]).length, 0);
});

test('actual dates take priority over planned dates', () => {
  const late = make('a', 'Roads', '2026-10-01', '2026-10-03', 12.84, 80.15, { actualEnd: '2026-10-12' });
  assert.equal(findCoordinationConflicts([late, make('b', 'Water', '2026-10-10', '2026-10-11')]).length, 1);
});

test('matches a brute-force all-pairs check on random data (nothing missed, nothing extra)', () => {
  for (const startSeed of [7, 99, 2024]) {
    let seed = startSeed; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const depts = ['Roads', 'Water', 'Power', 'Telecom'];
    const day = (n) => new Date(Date.UTC(2026, 9, 1 + n)).toISOString().slice(0, 10);
    const projects = Array.from({ length: 150 }, (_, i) => {
      const s = Math.floor(rnd() * 30);
      return make(`p${i}`, depts[Math.floor(rnd() * 4)], day(s), day(s + Math.floor(rnd() * 8)), 12.84 + rnd() * 0.01, 80.15 + rnd() * 0.01);
    });
    const pair = (a, b) => [a.id, b.id].sort().join('|');
    const sweep = new Set(findCoordinationConflicts(projects).map(c => pair(c.a, c.b)));
    const brute = new Set();
    for (let i = 0; i < projects.length; i++) for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i], b = projects[j];
      if (a.department === b.department) continue;
      if (!(a.plannedStart <= b.plannedEnd && b.plannedStart <= a.plannedEnd)) continue;
      if (haversineMetres(a.latitude, a.longitude, b.latitude, b.longitude) > ADJACENT_METRES) continue;
      brute.add(pair(a, b));
    }
    assert.ok(brute.size > 0, 'test data should contain some conflicts');
    assert.deepEqual([...sweep].sort(), [...brute].sort());
  }
});

test('each pair is reported once and the closest pairs come first', () => {
  const r = findCoordinationConflicts([
    make('a', 'Roads', '2026-10-01', '2026-10-10', 12.84, 80.15),
    make('b', 'Water', '2026-10-01', '2026-10-10', 12.8415, 80.15),
    make('c', 'Power', '2026-10-01', '2026-10-10', 12.8401, 80.15)
  ]);
  assert.equal(r.length, 3);
  assert.equal(new Set(r.map(c => [c.a.id, c.b.id].sort().join())).size, 3);
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].distanceMetres <= r[i].distanceMetres);
});

test('demo data still produces the drainage / cable-duct warning', () => {
  const r = findCoordinationConflicts(demoProjects);
  assert.ok(r.some(c => [c.a.id, c.b.id].sort().join() === 'demo-001,demo-006'));
});
