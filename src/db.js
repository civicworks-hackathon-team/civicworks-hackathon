// Conversions between Supabase rows and the shapes the UI uses.
import { safeArray } from './utils.js';

export function fromDbProject(row, updates = []) {
  return {
    id: row.id, title: row.title, category: row.category, status: row.status, department: row.department,
    ward: row.ward, contractor: row.contractor || '', responsibleOfficer: row.responsible_officer || '',
    description: row.description || '', latitude: Number(row.latitude), longitude: Number(row.longitude),
    plannedStart: row.planned_start || '', actualStart: row.actual_start || '', plannedEnd: row.planned_end || '', actualEnd: row.actual_end || '', workStartTime: row.work_start_time?.slice(0, 5) || '', workEndTime: row.work_end_time?.slice(0, 5) || '',
    progress: Number(row.progress || 0), estimatedCost: row.estimated_cost, spentToDate: row.spent_to_date,
    materials: row.materials || '', qualityNotes: row.quality_notes || '', affectedResidents: row.affected_residents || '',
    impacts: row.impacts || [], safety: row.safety || [], trafficPlan: row.traffic_plan || '', lastUpdated: row.updated_at,
    delayReason: row.delay_reason || '', source: row.source_label || 'Official ward record', updates
  };
}

export function toDbProject(p) {
  return {
    title: p.title, category: p.category, status: p.status, department: p.department, ward: p.ward,
    contractor: p.contractor || null, responsible_officer: p.responsibleOfficer || null, description: p.description || '',
    latitude: Number(p.latitude), longitude: Number(p.longitude), planned_start: p.plannedStart || null,
    actual_start: p.actualStart || null, planned_end: p.plannedEnd || null, actual_end: p.actualEnd || null,
    work_start_time: p.workStartTime || null, work_end_time: p.workEndTime || null, progress: Number(p.progress || 0),
    estimated_cost: p.estimatedCost === '' || p.estimatedCost == null ? null : Number(p.estimatedCost),
    spent_to_date: p.spentToDate === '' || p.spentToDate == null ? null : Number(p.spentToDate), materials: p.materials || null,
    quality_notes: p.qualityNotes || null, affected_residents: p.affectedResidents || null,
    impacts: safeArray(p.impacts), safety: safeArray(p.safety), traffic_plan: p.trafficPlan || null,
    delay_reason: p.delayReason || null, source_label: p.source || 'Official ward record'
  };
}

export function fromDbReport(row) {
  return { id: row.id, ticketCode: row.ticket_code, title: row.title, category: row.category, description: row.description,
    latitude: row.latitude, longitude: row.longitude, ward: row.ward || '', status: row.status, response: row.response || '', createdAt: row.created_at,
    contact: row.contact || '', attachmentPath: row.attachment_path || null };
}
