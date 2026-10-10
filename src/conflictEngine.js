/**
 * CivicWorks coordination engine
 * ------------------------------
 * Finds pairs of public-works projects that might clash: they belong to DIFFERENT
 * departments, their work windows overlap in time, and the sites are close together.
 *
 * Approach: sweep-line over date intervals, then a spatial filter on the survivors.
 *
 *   1. Convert each project's window (actual dates if known, otherwise planned) to
 *      [start, end] timestamps and sort by start.                       O(n log n)
 *   2. Sweep left to right keeping an "active" list of intervals that have not
 *      ended yet. Before handling interval i, drop active intervals that ended
 *      before i starts. Everything still active started earlier AND ends on/after
 *      i's start, so it overlaps i in time by construction.
 *   3. For each (active, i) pair, apply the cheap checks: different department,
 *      not both completed, and Haversine distance <= ADJACENT_METRES.
 *
 * Complexity (n projects, k_t = number of pairs that overlap in time):
 *   Time  O(n log n + k_t)  - every step of the sweep either removes an interval
 *                             for good (amortised O(n) total) or visits a pair
 *                             that really overlaps in time (k_t total).
 *   Space O(n)
 *   A naive all-pairs loop is O(n^2) regardless of how few pairs actually overlap.
 *
 * Output is a WARNING for officers, not proof of a clash: projects only carry a
 * point location, so we cannot tell whether two works share the same road segment.
 */

export const DIRECT_COLLISION_METRES = 150; // very close: likely the same stretch of road
export const ADJACENT_METRES = 350;         // nearby corridor: worth verifying

const EARTH_RADIUS_M = 6371000;

export function haversineMetres(lat1, lon1, lat2, lon2) {
  const rad = (n) => (n * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const toTime = (isoDate) => {
  const t = Date.parse(`${String(isoDate).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
};

const sameDepartment = (a, b) => a.department.trim().toLowerCase() === b.department.trim().toLowerCase();

/** Work window of a project: the real dates if recorded, otherwise the planned ones. */
export function workWindow(project) {
  const startIso = project.actualStart || project.plannedStart;
  const endIso = project.actualEnd || project.plannedEnd;
  const start = startIso ? toTime(startIso) : null;
  const end = endIso ? toTime(endIso) : null;
  if (start === null || end === null || end < start) return null; // missing or invalid dates: skip, never guess
  return { start, end, startIso: String(startIso).slice(0, 10), endIso: String(endIso).slice(0, 10) };
}

/**
 * @param {Array} projects  project objects (see data.js for the shape)
 * @returns {Array<{a, b, distance, distanceMetres, type, start, end}>}
 *          distance is in km (kept for the existing UI); start/end are the overlapping dates (YYYY-MM-DD)
 */
export function findCoordinationConflicts(projects) {
  const intervals = [];
  for (const project of projects) {
    if (!project.department || !String(project.department).trim()) continue;
    if (!Number.isFinite(Number(project.latitude)) || !Number.isFinite(Number(project.longitude))) continue;
    const window = workWindow(project);
    if (window) intervals.push({ project, ...window });
  }
  intervals.sort((x, y) => x.start - y.start);

  const found = [];
  let active = [];
  for (const current of intervals) {
    active = active.filter((other) => other.end >= current.start); // drop intervals that already finished
    for (const other of active) {
      const a = other.project, b = current.project;
      if (sameDepartment(a, b)) continue;
      if (a.status === 'completed' && b.status === 'completed') continue;
      const metres = haversineMetres(Number(a.latitude), Number(a.longitude), Number(b.latitude), Number(b.longitude));
      if (metres > ADJACENT_METRES) continue;
      found.push({
        a, b,
        distance: metres / 1000,
        distanceMetres: metres,
        type: metres <= DIRECT_COLLISION_METRES ? 'direct' : 'adjacent',
        start: other.start > current.start ? other.startIso : current.startIso,
        end: other.end < current.end ? other.endIso : current.endIso
      });
    }
    active.push(current);
  }
  // closest pairs first so the most urgent warnings are shown at the top
  return found.sort((x, y) => x.distanceMetres - y.distanceMetres);
}
