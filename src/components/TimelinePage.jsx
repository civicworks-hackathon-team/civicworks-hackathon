import React from 'react';
import { ArrowUpRight, CalendarDays, ChevronRight, Info } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, formatDate } from '../utils.js';

export function TimelinePage({ projects, center, radius, onProject }) {
  const groups = [{ title: 'Upcoming work', subtitle: 'Planned start date', items: projects.filter(p => p.status === 'planned').sort((a,b) => (a.plannedStart || '').localeCompare(b.plannedStart || '')) },
    { title: 'Ongoing and delayed', subtitle: 'Latest reported activity', items: projects.filter(p => ['ongoing', 'delayed'].includes(p.status)).sort((a,b) => (a.plannedEnd || '').localeCompare(b.plannedEnd || '')) },
    { title: 'Recently completed', subtitle: 'Actual completion date', items: projects.filter(p => p.status === 'completed').sort((a,b) => (b.actualEnd || '').localeCompare(a.actualEnd || '')) }];
  return <section className="page-wrap"><div className="page-header"><div className="eyebrow"><span className="eyebrow-line" /> PROJECT REGISTER</div><h1>Work timeline</h1><p>See completed, ongoing and upcoming public works, along with the latest reported dates.</p></div><div className="timeline-disclaimer"><Info size={16} /><span>Dates and progress depend on the last update published by the responsible department. A delayed project should include a reason and revised finish date.</span></div>
    {groups.map(g => <section className="timeline-group" key={g.title}><div className="timeline-group-heading"><div><h2>{g.title}</h2><p>{g.subtitle}</p></div><span>{g.items.length} projects</span></div>{g.items.length ? <div className="timeline-card-grid">{g.items.map(p => <button className="timeline-card" key={p.id} onClick={() => onProject(p)}><div className="timeline-card-head"><span className={`status-chip status-${p.status}`}>{STATUS_LABELS[p.status]}</span><span className="timeline-category">{p.category}</span></div><h3>{p.title}</h3><p>{p.department} · {p.ward}</p><div className="timeline-dates"><span><small>Start</small><strong>{formatDate(p.plannedStart)}</strong></span><ChevronRight size={15} /><span><small>Finish</small><strong>{formatDate(p.actualEnd || p.plannedEnd)}</strong></span></div><div className="mini-progress"><i style={{ width: `${p.progress || 0}%`, background: STATUS_COLORS[p.status] }} /></div><div className="timeline-card-foot"><span>{p.progress || 0}% progress</span><span>View record <ArrowUpRight size={14} /></span></div></button>)}</div> : <div className="empty-state"><CalendarDays size={24} /><strong>No projects in this group</strong><span>New ward records will appear here once published.</span></div>}</section>)}
  </section>;
}

export default TimelinePage;
