import React, { useEffect } from 'react';
import { ArrowDownRight, Activity, Bell, ChevronRight, Construction, Navigation, X } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS } from '../utils.js';

export function StatCard({ label, value, sub, icon, tone }) {
  return <div className="stat-card"><span className={`stat-icon tone-${tone}`}>{icon}</span><div className="stat-text"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div><span className="stat-trend"><ArrowDownRight size={15} /></span></div>;
}
export function ProjectListItem({ project, selected, onClick }) {
  return <button className={`project-list-item ${selected ? 'project-selected' : ''}`} onClick={onClick}>
    <span className={`project-symbol symbol-${project.status}`}><WorkIcon category={project.category} /></span>
    <span className="project-list-content"><span className="project-list-title">{project.title}</span><span className="project-list-meta">{project.department} <i /> {project.distance?.toFixed(1)} km away</span><span className="project-mini-line"><span className={`status-chip status-${project.status}`}>{STATUS_LABELS[project.status]}</span><span>{project.progress ?? 0}% complete</span></span><span className="mini-progress"><i style={{ width: `${Math.max(0, Math.min(100, project.progress || 0))}%`, background: STATUS_COLORS[project.status] }} /></span></span><ChevronRight size={17} className="project-chevron" />
  </button>;
}
export function WorkIcon({ category }) {
  if (/streetlight|electricity/i.test(category)) return <Bell size={18} />;
  if (/drain|sewage|water/i.test(category)) return <Activity size={18} />;
  if (/footpath/i.test(category)) return <Navigation size={18} />;
  return <Construction size={18} />;
}
export function DetailInfo({ icon, label, value }) { return <div className="detail-info"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
export function ImpactCard({ icon, title, text }) { return <div className="impact-card"><span className="impact-icon">{icon}</span><h3>{title}</h3><p>{text}</p></div>; }
export function Field({ label, required, children }) { return <div className="field-group"><label>{label}{required && <span className="required-mark"> *</span>}</label>{children}</div>; }
export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div><div className="modal-body">{children}</div></section></div>;
}
