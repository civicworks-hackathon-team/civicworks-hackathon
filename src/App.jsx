import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from 'react-leaflet';
import { createClient } from '@supabase/supabase-js';
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleAlert, Clock3, Construction, ExternalLink, FileText,
  Filter, LocateFixed, LockKeyhole, LogIn, LogOut, MapPin, Menu, MessageSquareText,
  Navigation, Plus, RadioTower, Search, ShieldCheck, ShieldAlert, SlidersHorizontal,
  Sparkles, X, Wrench, Wallet, RefreshCw, ClipboardList, Eye, Pencil, Send, UserRound,
  MapPinned, Building2, Info, CheckCheck
} from 'lucide-react';
import { demoProjects, demoReports } from './data.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const DEMO_CENTER = [12.8405, 80.1535];
const STATUSES = ['planned', 'ongoing', 'delayed', 'completed'];
const STATUS_LABELS = { planned: 'Planned', ongoing: 'Ongoing', delayed: 'Delayed', completed: 'Completed' };
const STATUS_COLORS = { planned: '#64748b', ongoing: '#0d9488', delayed: '#dc6b35', completed: '#57966d' };
const CATEGORIES = ['Road', 'Drainage', 'Streetlight', 'Water supply', 'Footpath', 'Electricity', 'Sewage', 'Other'];
const freshReportList = () => JSON.parse(localStorage.getItem('civicworks-reports') || 'null') || demoReports;
const freshProjectList = () => JSON.parse(localStorage.getItem('civicworks-projects') || 'null') || demoProjects;
const formatDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded';
const formatMoney = (value) => value === null || value === undefined || value === '' ? 'Not disclosed' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value));
const formatTime = (value) => { if (!value) return 'Not recorded'; const [h, m] = String(value).slice(0, 5).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const shortDateTime = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
const distanceKm = (a, b, c, d) => {
  const rad = (n) => n * Math.PI / 180;
  const dLat = rad(c - a), dLon = rad(d - b);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};
const makeTicket = () => `CW-${Math.random().toString(36).slice(2, 4).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const readFileAsDataUrl = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
const safeArray = (value) => Array.isArray(value) ? value : (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : []);
const normalizeWard = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const slugifyWard = (value) => normalizeWard(value) || 'unassigned';

function fromDbProject(row, updates = []) {
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
function toDbProject(p) {
  return {
    title: p.title, category: p.category, status: p.status, department: p.department, ward: p.ward,
    contractor: p.contractor || null, responsible_officer: p.responsibleOfficer || null, description: p.description || '',
    latitude: Number(p.latitude), longitude: Number(p.longitude), planned_start: p.plannedStart || null,
    actual_start: p.actualStart || null, planned_end: p.plannedEnd || null, actual_end: p.actualEnd || null,
    work_start_time: p.workStartTime || null, work_end_time: p.workEndTime || null, progress: Number(p.progress || 0), estimated_cost: p.estimatedCost === '' ? null : Number(p.estimatedCost),
    spent_to_date: p.spentToDate === '' ? null : Number(p.spentToDate), materials: p.materials || null,
    quality_notes: p.qualityNotes || null, affected_residents: p.affectedResidents || null,
    impacts: safeArray(p.impacts), safety: safeArray(p.safety), traffic_plan: p.trafficPlan || null,
    delay_reason: p.delayReason || null, source_label: p.source || 'Official ward record'
  };
}
function fromDbReport(row) {
  return { id: row.id, ticketCode: row.ticket_code, title: row.title, category: row.category, description: row.description,
    latitude: row.latitude, longitude: row.longitude, ward: row.ward || '', status: row.status, response: row.response || '', createdAt: row.created_at,
    contact: row.contact || '', attachmentPath: row.attachment_path || null };
}
function useRecenter(center) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

function App() {
  const demoMode = !supabase;
  const [projects, setProjects] = useState(() => demoMode ? freshProjectList() : []);
  const [reports, setReports] = useState(() => demoMode ? freshReportList() : []);
  const [center, setCenter] = useState(DEMO_CENTER);
  const [userLocation, setUserLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState('Showing sample works near the demo area.');
  const [radius, setRadius] = useState(5);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [page, setPage] = useState('map');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [demoOfficer, setDemoOfficer] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProjectForm(DEMO_CENTER));
  const [reportForm, setReportForm] = useState({ title: '', category: 'Safety hazard', description: '', contact: '', attachment: null, ward: '' });
  const [reportAttachmentUrl, setReportAttachmentUrl] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(null);
  const [reportLookup, setReportLookup] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [adminTab, setAdminTab] = useState('projects');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportResponse, setReportResponse] = useState('');
  const [dataBusy, setDataBusy] = useState(false);

  const isOfficer = demoMode ? demoOfficer : ['officer', 'admin'].includes(profile?.role);
  const canManageProject = (project) => demoMode ? demoOfficer : (profile?.role === 'admin' || (profile?.role === 'officer' && normalizeWard(profile?.ward) === normalizeWard(project?.ward)));

  useEffect(() => {
    if (demoMode) return;
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session?.user) await fetchProfile(data.session.user.id, alive);
      await loadRemoteData(alive);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) fetchProfile(nextSession.user.id, true);
      else setProfile(null);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  async function fetchProfile(userId, alive = true) {
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, ward').eq('id', userId).maybeSingle();
    if (alive && !error) setProfile(data);
    if (alive && error) setNotice({ type: 'error', text: 'Could not load your officer profile. Ask the project administrator to check the profiles table.' });
  }

  async function loadRemoteData(alive = true) {
    setDataBusy(true);
    const [p, r] = await Promise.all([
      supabase.from('projects').select('*').order('updated_at', { ascending: false }),
      supabase.from('reports').select('*').order('created_at', { ascending: false })
    ]);
    if (alive) {
      if (!p.error) {
        const projectRows = p.data || [];
        const ids = projectRows.map(row => row.id);
        let updates = [];
        if (ids.length) {
          const result = await supabase.from('project_updates').select('*').in('project_id', ids).order('created_at', { ascending: false });
          if (!result.error) updates = result.data || [];
        }
        setProjects(projectRows.map(row => fromDbProject(row, updates.filter(u => u.project_id === row.id).map(u => ({
          date: u.created_at?.slice(0, 10), title: u.title, detail: u.detail || ''
        })))));
      } else {
        setNotice({ type: 'error', text: `Unable to load projects: ${p.error.message}` });
      }
      if (!r.error) setReports((r.data || []).map(fromDbReport));
      else if (r.error.code !== '42501') setNotice({ type: 'error', text: `Unable to load reports: ${r.error.message}` });
      setDataBusy(false);
    }
  }

  useEffect(() => {
    if (!demoMode) return;
    try { localStorage.setItem('civicworks-projects', JSON.stringify(projects)); } catch { setNotice({ type: 'error', text: 'Browser storage is full. Use the connected database for more demo data or photos.' }); }
  }, [projects, demoMode]);
  useEffect(() => {
    if (!demoMode) return;
    try { localStorage.setItem('civicworks-reports', JSON.stringify(reports)); } catch { setNotice({ type: 'error', text: 'Browser storage is full. This report may not persist after refresh; connect Supabase for shared storage.' }); }
  }, [reports, demoMode]);

  useEffect(() => {
    let active = true;
    setReportAttachmentUrl(null);
    if (!selectedReport) return () => { active = false; };
    if (demoMode && selectedReport.attachmentData) setReportAttachmentUrl(selectedReport.attachmentData);
    else if (!demoMode && selectedReport.attachmentPath) {
      supabase.storage.from('report-attachments').createSignedUrl(selectedReport.attachmentPath, 900).then(({ data, error }) => {
        if (active && !error) setReportAttachmentUrl(data?.signedUrl || null);
      });
    }
    return () => { active = false; };
  }, [selectedReport, demoMode]);

  const nearbyProjects = useMemo(() => projects.map(p => ({ ...p, distance: distanceKm(center[0], center[1], Number(p.latitude), Number(p.longitude)) }))
    .filter(p => p.distance <= radius)
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .filter(p => categoryFilter === 'all' || p.category === categoryFilter)
    .filter(p => !search || `${p.title} ${p.category} ${p.department} ${p.ward} ${p.description}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.distance - b.distance), [projects, center, radius, statusFilter, categoryFilter, search]);

  const allNearbyCount = useMemo(() => projects.filter(p => distanceKm(center[0], center[1], Number(p.latitude), Number(p.longitude)) <= radius).length, [projects, center, radius]);
  const coordinationConflicts = useMemo(() => {
    const visible = projects.filter(p => distanceKm(center[0], center[1], Number(p.latitude), Number(p.longitude)) <= radius);
    const found = [];
    for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i], b = visible[j];
      if (!a.department || !b.department || a.department.trim().toLowerCase() === b.department.trim().toLowerCase()) continue;
      if (a.status === 'completed' && b.status === 'completed') continue;
      const d = distanceKm(Number(a.latitude), Number(a.longitude), Number(b.latitude), Number(b.longitude));
      if (d > 0.35) continue;
      const startA = a.actualStart || a.plannedStart, startB = b.actualStart || b.plannedStart;
      const endA = a.actualEnd || a.plannedEnd, endB = b.actualEnd || b.plannedEnd;
      if (!startA || !startB || !endA || !endB) continue;
      const overlaps = startA <= endB && startB <= endA;
      if (overlaps) found.push({ a, b, distance: d, start: startA > startB ? startA : startB, end: endA < endB ? endA : endB });
    }
    return found;
  }, [projects, center, radius]);
  const counts = useMemo(() => ({
    ongoing: projects.filter(p => ['ongoing', 'delayed'].includes(p.status)).length,
    planned: projects.filter(p => p.status === 'planned').length,
    delayed: projects.filter(p => p.status === 'delayed').length,
    completed: projects.filter(p => p.status === 'completed').length,
  }), [projects]);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationMessage('This browser does not support location. The demo area is still shown.');
      return;
    }
    setLocationMessage('Requesting your location…');
    navigator.geolocation.getCurrentPosition((position) => {
      const next = [position.coords.latitude, position.coords.longitude];
      setCenter(next); setUserLocation(next);
      setLocationMessage(`Using your location · accuracy approximately ${Math.round(position.coords.accuracy)} m`);
      setNotice({ type: 'success', text: 'Map centered on your location. Your coordinates stay in this browser and are not saved to the project database.' });
    }, (error) => {
      const reason = error.code === 1 ? 'Location permission was denied.' : error.code === 2 ? 'Your location could not be determined.' : 'Location request timed out.';
      setLocationMessage(`${reason} Showing the demo area. You can still browse projects.`);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  async function handleLogin(event) {
    event.preventDefault(); setLoginBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoginBusy(false);
    if (error) setNotice({ type: 'error', text: `Login failed: ${error.message}` });
    else { setLoginOpen(false); setPassword(''); setPage('officer'); }
  }

  async function handleLogout() {
    if (demoMode) { setDemoOfficer(false); setPage('map'); setNotice({ type: 'success', text: 'Exited demo officer mode.' }); return; }
    await supabase.auth.signOut(); setPage('map'); setNotice({ type: 'success', text: 'Signed out.' });
  }

  function startNewProject() {
    setEditingProject(null); setProjectForm({ ...emptyProjectForm(center), ward: profile?.ward || '' }); setAdminTab('projects');
    document.getElementById('project-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function startEditProject(project) {
    setEditingProject(project.id);
    setProjectForm({ ...emptyProjectForm(center), ...project, impacts: (project.impacts || []).join(', '), safety: (project.safety || []).join(', '), estimatedCost: project.estimatedCost ?? '', spentToDate: project.spentToDate ?? '' });
    setAdminTab('projects');
    setTimeout(() => document.getElementById('project-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  async function saveProject(event) {
    event.preventDefault();
    const payload = { ...projectForm, latitude: Number(projectForm.latitude), longitude: Number(projectForm.longitude), progress: Number(projectForm.progress), impacts: safeArray(projectForm.impacts), safety: safeArray(projectForm.safety), source: demoMode ? 'Demo officer entry — not an official record' : 'Official ward record', lastUpdated: new Date().toISOString() };
    if (demoMode) {
      if (editingProject) {
        const old = projects.find(p => p.id === editingProject);
        const newUpdate = { date: new Date().toISOString().slice(0, 10), title: `Details updated · ${payload.progress}% progress`, detail: payload.delayReason || `Status: ${STATUS_LABELS[payload.status]}. Updated by the demo officer.` };
        setProjects(oldList => oldList.map(p => p.id === editingProject ? { ...payload, id: editingProject, updates: [newUpdate, ...(old?.updates || [])] } : p));
      } else {
        const next = { ...payload, id: `demo-${Date.now()}`, updates: [{ date: new Date().toISOString().slice(0, 10), title: 'Project added', detail: 'Added in local demo officer mode.' }] };
        setProjects(old => [next, ...old]);
      }
      setNotice({ type: 'success', text: 'Saved in this browser only. This demo entry is not an official government record.' });
      setEditingProject(null); setProjectForm(emptyProjectForm(center)); return;
    }
    if (!isOfficer) { setNotice({ type: 'error', text: 'Your account does not have officer permissions.' }); return; }
    const dbPayload = toDbProject(payload);
    let result;
    if (editingProject) result = await supabase.from('projects').update(dbPayload).eq('id', editingProject).select('*').single();
    else result = await supabase.from('projects').insert(dbPayload).select('*').single();
    if (result.error) { setNotice({ type: 'error', text: `Could not save project: ${result.error.message}` }); return; }
    const updateTitle = editingProject ? `Project updated · ${payload.progress}% progress` : 'Project created';
    const update = await supabase.from('project_updates').insert({ project_id: result.data.id, title: updateTitle, detail: payload.delayReason || `Status set to ${STATUS_LABELS[payload.status]}.` });
    if (update.error) setNotice({ type: 'error', text: `Project was saved, but its activity update failed: ${update.error.message}` });
    else setNotice({ type: 'success', text: 'Project saved to the shared database.' });
    setEditingProject(null); setProjectForm({ ...emptyProjectForm(center), ward: profile?.ward || '' }); await loadRemoteData();
  }

  async function submitReport(event) {
    event.preventDefault(); setReportBusy(true);
    const ticket = makeTicket();
    const attachment = reportForm.attachment;
    if (attachment && (!['image/jpeg', 'image/png', 'image/webp'].includes(attachment.type) || attachment.size > 2 * 1024 * 1024)) {
      setReportBusy(false); setNotice({ type: 'error', text: 'Please use a JPG, PNG or WebP image no larger than 2 MB.' }); return;
    }
    let attachmentData = null, attachmentPath = null;
    if (attachment && demoMode) {
      try { attachmentData = await readFileAsDataUrl(attachment); }
      catch { setReportBusy(false); setNotice({ type: 'error', text: 'The selected image could not be read.' }); return; }
    }
    const report = {
      id: demoMode ? `report-${Date.now()}` : crypto.randomUUID(), ticketCode: ticket,
      title: reportForm.title.trim(), category: reportForm.category, description: reportForm.description.trim(),
      latitude: reportTarget?.latitude ?? center[0], longitude: reportTarget?.longitude ?? center[1], ward: reportTarget?.ward || reportForm.ward.trim(),
      status: 'submitted', response: '', createdAt: new Date().toISOString(), contact: reportForm.contact.trim(), attachmentData
    };
    if (demoMode) {
      setReports(old => [report, ...old]);
    } else {
      if (attachment) {
        const ext = attachment.type === 'image/png' ? 'png' : attachment.type === 'image/webp' ? 'webp' : 'jpg';
        attachmentPath = `reports/${slugifyWard(report.ward)}/${ticket}/${crypto.randomUUID()}.${ext}`;
        const uploaded = await supabase.storage.from('report-attachments').upload(attachmentPath, attachment, { contentType: attachment.type, upsert: false });
        if (uploaded.error) { setReportBusy(false); setNotice({ type: 'error', text: `Photo upload failed: ${uploaded.error.message}. Remove the selected photo and submit the report again without it.` }); return; }
      }
      const result = await supabase.from('reports').insert({ id: report.id, ticket_code: ticket, title: report.title, category: report.category, description: report.description,
        latitude: report.latitude, longitude: report.longitude, ward: report.ward, status: 'submitted', contact: report.contact || null, attachment_path: attachmentPath });
      if (result.error) {
        setReportBusy(false); setNotice({ type: 'error', text: `Report could not be submitted: ${result.error.message}` }); return;
      }
    }
    setReportSuccess(ticket); setReportForm({ title: '', category: 'Safety hazard', description: '', contact: '', attachment: null, ward: '' }); setReportBusy(false); setLookupResult(null);
  }

  async function lookupReport(event) {
    event?.preventDefault(); setLookupResult(null);
    const key = reportLookup.trim().toUpperCase();
    if (!key) return;
    if (demoMode) {
      const match = reports.find(r => r.ticketCode.toUpperCase() === key);
      setLookupResult(match ? { found: true, ...match } : { found: false }); return;
    }
    const { data, error } = await supabase.rpc('get_report_status', { lookup_ticket: key });
    if (error) setLookupResult({ found: false, error: error.message });
    else setLookupResult(data?.length ? { found: true, ...data[0] } : { found: false });
  }

  async function updateReportStatus(report, status, response) {
    if (demoMode) setReports(old => old.map(r => r.id === report.id ? { ...r, status, response, updatedAt: new Date().toISOString() } : r));
    else {
      const { error } = await supabase.from('reports').update({ status, response: response || null, updated_at: new Date().toISOString() }).eq('id', report.id);
      if (error) { setNotice({ type: 'error', text: `Could not update report: ${error.message}` }); return; }
      await loadRemoteData();
    }
    setNotice({ type: 'success', text: 'Report status updated.' }); setSelectedReport(null); setReportResponse('');
  }

  function resetDemo() {
    if (!window.confirm('Reset local demo data to the original sample projects and reports? Your own demo edits will be lost.')) return;
    localStorage.removeItem('civicworks-projects'); localStorage.removeItem('civicworks-reports');
    setProjects(demoProjects); setReports(demoReports); setNotice({ type: 'success', text: 'Demo data reset.' });
  }

  const openReport = (project = null) => { setReportTarget(project); setReportSuccess(null); setReportForm({ title: '', category: 'Safety hazard', description: '', contact: '', attachment: null, ward: project?.ward || '' }); setShowReportForm(true); };
  const go = (nextPage) => { setPage(nextPage); setMobileMenu(false); if (nextPage === 'officer' && !isOfficer) setLoginOpen(true); };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => { setPage('map'); setSelectedProject(null); }} aria-label="CivicWorks home">
          <span className="brand-icon"><Construction size={23} strokeWidth={2.2} /></span>
          <span className="brand-text"><strong>CivicWorks</strong><small>PUBLIC WORKS, MADE VISIBLE</small></span>
        </button>
        <nav className={`main-nav ${mobileMenu ? 'nav-open' : ''}`}>
          <button className={page === 'map' ? 'nav-link active' : 'nav-link'} onClick={() => go('map')}><MapPinned size={16} /> Explore map</button>
          <button className={page === 'timeline' ? 'nav-link active' : 'nav-link'} onClick={() => go('timeline')}><CalendarDays size={16} /> Work timeline</button>
          <button className={page === 'track' ? 'nav-link active' : 'nav-link'} onClick={() => go('track')}><ClipboardList size={16} /> Track a report</button>
          <button className={page === 'officer' ? 'nav-link active' : 'nav-link'} onClick={() => go('officer')}><ShieldCheck size={16} /> Officer portal</button>
        </nav>
        <div className="top-actions">
          <span className={`connection-pill ${demoMode ? 'demo-pill' : 'live-pill'}`}><span className="status-dot" />{demoMode ? 'Demo mode' : 'Connected'}</span>
          {(isOfficer || (!demoMode && session)) ? <button className="icon-btn" title="Sign out" onClick={handleLogout}><LogOut size={18} /></button> : <button className="sign-in-btn" onClick={() => demoMode ? (setDemoOfficer(true), setPage('officer')) : setLoginOpen(true)}>{demoMode ? 'Try officer demo' : 'Officer sign in'}</button>}
          <button className="mobile-menu-btn" onClick={() => setMobileMenu(v => !v)} aria-label="Toggle menu">{mobileMenu ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </header>

      {notice && <div className={`notice notice-${notice.type}`} role="status"><span>{notice.type === 'error' ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={16} /></button></div>}

      <main>
        {page === 'map' && <>
          <section className="hero-row">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR LOCALITY, IN THE LOOP</div>
              <h1>Know what’s being built.<br /><span>Know who’s responsible.</span></h1>
              <p>One clear view of public construction, repairs, timelines and safety notices around you.</p>
            </div>
            <button className="location-cta" onClick={requestLocation}><span className="locate-icon"><LocateFixed size={20} /></span><span><strong>Use my live location</strong><small>Find works near where you are</small></span><ChevronRight size={18} /></button>
          </section>
          <div className="location-strip"><MapPin size={14} /><span>{locationMessage}</span><span className="privacy-note"><LockKeyhole size={12} /> Location isn’t stored</span></div>
          <section className="stat-grid">
            <StatCard label="Nearby projects" value={allNearbyCount} sub={`Within ${radius} km`} icon={<MapPin size={18} />} tone="green" />
            <StatCard label="Ongoing work" value={projects.filter(p => ['ongoing', 'delayed'].includes(p.status) && distanceKm(center[0], center[1], Number(p.latitude), Number(p.longitude)) <= radius).length} sub="Work in progress" icon={<Construction size={18} />} tone="blue" />
            <StatCard label="Planned next" value={projects.filter(p => p.status === 'planned' && distanceKm(center[0], center[1], Number(p.latitude), Number(p.longitude)) <= radius).length} sub="Upcoming work" icon={<CalendarDays size={18} />} tone="gold" />
            <StatCard label="Delayed" value={projects.filter(p => p.status === 'delayed' && distanceKm(center[0], center[1], Number(p.latitude), Number(p.longitude)) <= radius).length} sub="Updated deadlines needed" icon={<Clock3 size={18} />} tone="rose" />
          </section>
          {coordinationConflicts.length > 0 && <section className="coordination-panel panel"><div className="coordination-mark"><RadioTower size={19} /></div><div className="coordination-copy"><div className="section-overline">CROSS-DEPARTMENT COORDINATION</div><h2>{coordinationConflicts.length} possible work {coordinationConflicts.length === 1 ? 'overlap' : 'overlaps'} nearby</h2><p>Different departments have projects close together with overlapping dates. This is a warning for officers to verify the road segment before work begins, not proof that the projects conflict.</p><div className="conflict-list">{coordinationConflicts.slice(0, 3).map((conflict, index) => <div className="conflict-item" key={`${conflict.a.id}-${conflict.b.id}`}><span className="conflict-index">0{index + 1}</span><div><strong>{conflict.a.title} <span>↔</span> {conflict.b.title}</strong><small>{conflict.a.department} · {conflict.b.department}</small><small>{formatDate(conflict.start)} – {formatDate(conflict.end)} · {Math.round(conflict.distance * 1000)} m apart</small></div></div>)}</div></div></section>}
          <section className="explore-layout">
            <div className="map-panel panel">
              <div className="panel-heading map-heading">
                <div><div className="section-overline">GEOFENCED VIEW</div><h2>Public works near you</h2><p>Projects inside your selected radius</p></div>
                <button className="light-icon-btn" title="Refresh data" onClick={() => demoMode ? setProjects(freshProjectList()) : loadRemoteData()}><RefreshCw size={16} /></button>
              </div>
              <div className="map-controls">
                <label className="radius-select"><span><RadioTower size={15} /> Radius</span><select value={radius} onChange={e => setRadius(Number(e.target.value))}><option value="1">1 km</option><option value="3">3 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option></select></label>
                <div className="map-legend"><span><i className="legend-dot ongoing" /> Ongoing</span><span><i className="legend-dot planned" /> Planned</span><span><i className="legend-dot delayed" /> Delayed</span></div>
              </div>
              <div className="map-canvas">
                <MapContainer center={center} zoom={13} scrollWheelZoom className="leaflet-map">
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <UseRecenter center={center} />
                  <Circle center={center} radius={radius * 1000} pathOptions={{ color: '#167d6c', fillColor: '#38a58f', fillOpacity: 0.07, weight: 2, dashArray: '5 6' }} />
                  {userLocation && <CircleMarker center={userLocation} radius={7} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#1459bd', fillOpacity: 1 }}><Popup><strong>You are here</strong><br />Your location is only used to center this map.</Popup></CircleMarker>}
                  {nearbyProjects.map(p => <CircleMarker key={p.id} center={[Number(p.latitude), Number(p.longitude)]} radius={selectedProject?.id === p.id ? 10 : 7} pathOptions={{ color: '#ffffff', weight: 2, fillColor: STATUS_COLORS[p.status] || '#64748b', fillOpacity: 1 }} eventHandlers={{ click: () => setSelectedProject(p) }}>
                    <Popup><div className="map-popup"><strong>{p.title}</strong><span>{p.department}</span><span className={`status-chip status-${p.status}`}>{STATUS_LABELS[p.status]}</span><button onClick={() => setSelectedProject(p)}>View project details →</button></div></Popup>
                  </CircleMarker>)}
                </MapContainer>
                <div className="map-floating-note"><span className="map-ping" /> {nearbyProjects.length} shown · {allNearbyCount} nearby</div>
              </div>
              <div className="map-footnote"><Info size={14} /> The dashed circle is your selected search radius, not a legal ward boundary. Project locations shown are sample data unless marked as an official ward record.</div>
            </div>
            <aside className="project-list-panel panel">
              <div className="list-topline"><div><div className="section-overline">LOCAL WORK REGISTER</div><h2>Projects nearby <span className="count-bubble">{nearbyProjects.length}</span></h2></div><button className="filter-toggle" onClick={() => setShowFilters(v => !v)}><SlidersHorizontal size={15} /> Filters</button></div>
              <div className="search-box"><Search size={17} /><input aria-label="Search projects" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search road, drain, department…" />{search && <button onClick={() => setSearch('')}><X size={14} /></button>}</div>
              {showFilters && <div className="filter-row"><label><span>Status</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{STATUSES.map(s => <option value={s} key={s}>{STATUS_LABELS[s]}</option>)}</select></label><label><span>Type</span><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">All work types</option>{[...new Set(projects.map(p => p.category))].sort().map(c => <option key={c}>{c}</option>)}</select></label></div>}
              <div className="project-scroll-list">
                {nearbyProjects.length ? nearbyProjects.map(project => <ProjectListItem key={project.id} project={project} selected={selectedProject?.id === project.id} onClick={() => setSelectedProject(project)} />) : <div className="empty-state"><MapPin size={24} /><strong>No projects match this view</strong><span>Try a wider radius or remove a filter.</span><button className="text-action" onClick={() => { setRadius(10); setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }}>Show more projects</button></div>}
              </div>
              <button className="report-banner" onClick={() => openReport()}><span className="report-banner-icon"><MessageSquareText size={18} /></span><span><strong>See a problem?</strong><small>Report a hazard or public-work issue</small></span><ChevronRight size={18} /></button>
            </aside>
          </section>
          {selectedProject && <ProjectDetails project={projects.find(p => p.id === selectedProject.id) || selectedProject} onClose={() => setSelectedProject(null)} onReport={() => openReport(selectedProject)} onEdit={canManageProject(selectedProject) ? () => { setPage('officer'); startEditProject(projects.find(p => p.id === selectedProject.id) || selectedProject); } : null} />}
          <section className="below-grid">
            <div className="section-title-row"><div><div className="section-overline">DON’T GET CAUGHT OFF GUARD</div><h2>Plan around public works</h2></div><button className="text-action" onClick={() => go('timeline')}>View all schedules <ArrowUpRight size={15} /></button></div>
            <div className="impact-grid"><ImpactCard icon={<ShieldAlert size={19} />} title="Safety first" text="Check site hazards, temporary access, road closures and pedestrian diversions before leaving." /><ImpactCard icon={<Wallet size={19} />} title="Follow the money" text="See the published estimate, reported spend and materials where the ward has disclosed them." /><ImpactCard icon={<MessageSquareText size={19} />} title="Close the loop" text="Submit a report, keep the ticket code and check how the responsible office responds." /></div>
          </section>
        </>}

        {page === 'timeline' && <TimelinePage projects={projects} center={center} radius={radius} onProject={p => { setSelectedProject(p); setPage('map'); }} />}
        {page === 'track' && <TrackPage reportLookup={reportLookup} setReportLookup={setReportLookup} lookupReport={lookupReport} lookupResult={lookupResult} reportSuccess={reportSuccess} setReportSuccess={setReportSuccess} openReport={() => openReport()} />}
        {page === 'officer' && <OfficerPage isOfficer={isOfficer} demoMode={demoMode} session={session} profile={profile} canManageProject={canManageProject} projects={projects} reports={reports} adminTab={adminTab} setAdminTab={setAdminTab} projectForm={projectForm} setProjectForm={setProjectForm} editingProject={editingProject} setEditingProject={setEditingProject} saveProject={saveProject} startNewProject={startNewProject} startEditProject={startEditProject} center={center} selectedReport={selectedReport} setSelectedReport={setSelectedReport} reportResponse={reportResponse} setReportResponse={setReportResponse} updateReportStatus={updateReportStatus} resetDemo={resetDemo} login={() => setLoginOpen(true)} />}
      </main>

      <footer className="footer"><div className="footer-brand"><span className="footer-mark"><Construction size={18} /></span><strong>CivicWorks</strong></div><span>Transparency for the streets we share.</span><span className="footer-right"><LockKeyhole size={13} /> Location stays in your browser · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Map data © OpenStreetMap</a></span></footer>

      {showReportForm && <Modal title={reportSuccess ? 'Report submitted' : 'Report a public-work issue'} onClose={() => { setShowReportForm(false); setReportSuccess(null); }}>
        {reportSuccess ? <div className="success-pane"><div className="success-round"><Check size={27} /></div><h3>Your report is in the register</h3><p>Keep this ticket code to check the status later. In demo mode this report only exists in this browser.</p><div className="ticket-code">{reportSuccess}<button onClick={() => navigator.clipboard?.writeText(reportSuccess)} title="Copy ticket"><FileText size={15} /></button></div><button className="primary-btn full-btn" onClick={() => { setReportLookup(reportSuccess); setReportSuccess(null); setShowReportForm(false); setPage('track'); }}>Track this report <ChevronRight size={16} /></button></div> : <form className="stack-form" onSubmit={submitReport}>
          <div className="form-intro"><span className="form-icon"><MessageSquareText size={19} /></span><p>Reports help the ward officer identify hazards and follow up. Don’t include sensitive personal information.</p></div>
          {reportTarget && <div className="attached-project"><MapPin size={15} /><span>Linked to <strong>{reportTarget.title}</strong></span></div>}
          <Field label="Issue title" required><input required maxLength="100" value={reportForm.title} onChange={e => setReportForm({ ...reportForm, title: e.target.value })} placeholder="e.g. Open drain without barricade" /></Field>
          <Field label="Issue category" required><select value={reportForm.category} onChange={e => setReportForm({ ...reportForm, category: e.target.value })}>{['Safety hazard', 'Work delay', 'Poor quality', 'Traffic disruption', 'Water or electricity interruption', 'Other'].map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Ward / locality" required><input required value={reportTarget?.ward || reportForm.ward} disabled={Boolean(reportTarget?.ward)} onChange={e => setReportForm({ ...reportForm, ward: e.target.value })} placeholder="e.g. Ward 12" />{reportTarget?.ward && <small className="field-help">Taken from the linked public-work record.</small>}</Field>
          <Field label="What happened?" required><textarea required rows="4" maxLength="1500" value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })} placeholder="Describe the issue and a nearby landmark…" /></Field>
          <div className="location-auto-row"><MapPin size={15} /><div><strong>Report location</strong><span>{reportTarget ? `${Number(reportTarget.latitude).toFixed(5)}, ${Number(reportTarget.longitude).toFixed(5)} · linked project` : `${center[0].toFixed(5)}, ${center[1].toFixed(5)} · current map centre`}</span></div><button type="button" className="small-link" onClick={requestLocation}>Use my location</button></div>
          <Field label="Photo evidence (optional)"><input key={reportForm.attachment?.name || 'empty-photo'} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setReportForm({ ...reportForm, attachment: e.target.files?.[0] || null })} />{reportForm.attachment && <div className="file-picked"><small className="field-help">Selected: {reportForm.attachment.name} · {(reportForm.attachment.size / 1024).toFixed(0)} KB</small><button type="button" className="small-link" onClick={() => setReportForm({ ...reportForm, attachment: null })}>Remove photo</button></div>}<small className="field-help">One JPG, PNG or WebP image, up to 2 MB. Avoid photos showing faces or personal documents.</small></Field>
          <Field label="Contact (optional)"><input value={reportForm.contact} onChange={e => setReportForm({ ...reportForm, contact: e.target.value })} placeholder="Email or phone, only if follow-up is needed" /></Field>
          <p className="privacy-small"><LockKeyhole size={13} /> {demoMode ? 'Demo reports stay in local browser storage.' : 'Contact details are visible only to authorized officers.'}</p>
          <button className="primary-btn full-btn" disabled={reportBusy}>{reportBusy ? 'Submitting…' : 'Submit report'} <Send size={16} /></button>
        </form>}
      </Modal>}

      {loginOpen && <Modal title="Officer sign in" onClose={() => setLoginOpen(false)}>
        {demoMode ? <div className="demo-login"><div className="demo-login-icon"><ShieldCheck size={26} /></div><h3>Explore the officer dashboard</h3><p>This preview uses local browser storage so you can test the workflow without a backend. It is not secure authentication and must not be used for real government records.</p><button className="primary-btn full-btn" onClick={() => { setDemoOfficer(true); setLoginOpen(false); setPage('officer'); }}>Enter demo officer mode <ChevronRight size={16} /></button><div className="security-note"><Info size={14} /> Real officer access will be enforced by Supabase authentication and database permissions after setup.</div></div> : <form className="stack-form" onSubmit={handleLogin}>
          <div className="form-intro"><span className="form-icon"><LockKeyhole size={19} /></span><p>Use the account created for your ward. Public visitors cannot create officer accounts.</p></div>
          <Field label="Official email" required><input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="officer@department.gov.in" /></Field>
          <Field label="Password" required><input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" /></Field>
          <button className="primary-btn full-btn" disabled={loginBusy}>{loginBusy ? 'Signing in…' : 'Sign in securely'} <LogIn size={16} /></button>
          <p className="privacy-small">If your account has no officer role assigned, you can sign in but will not be able to edit projects.</p>
        </form>}
      </Modal>}
    </div>
  );
}

function emptyProjectForm(center = DEMO_CENTER) {
  return { title: '', category: 'Road', status: 'planned', department: '', ward: '', contractor: '', responsibleOfficer: '', description: '', latitude: center[0], longitude: center[1], plannedStart: '', actualStart: '', plannedEnd: '', actualEnd: '', workStartTime: '', workEndTime: '', progress: 0, estimatedCost: '', spentToDate: '', materials: '', qualityNotes: '', affectedResidents: '', impacts: '', safety: '', trafficPlan: '', delayReason: '' };
}

function StatCard({ label, value, sub, icon, tone }) {
  return <div className="stat-card"><span className={`stat-icon tone-${tone}`}>{icon}</span><div className="stat-text"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div><span className="stat-trend"><ArrowDownRight size={15} /></span></div>;
}
function ProjectListItem({ project, selected, onClick }) {
  return <button className={`project-list-item ${selected ? 'project-selected' : ''}`} onClick={onClick}>
    <span className={`project-symbol symbol-${project.status}`}><WorkIcon category={project.category} /></span>
    <span className="project-list-content"><span className="project-list-title">{project.title}</span><span className="project-list-meta">{project.department} <i /> {project.distance?.toFixed(1)} km away</span><span className="project-mini-line"><span className={`status-chip status-${project.status}`}>{STATUS_LABELS[project.status]}</span><span>{project.progress ?? 0}% complete</span></span><span className="mini-progress"><i style={{ width: `${Math.max(0, Math.min(100, project.progress || 0))}%`, background: STATUS_COLORS[project.status] }} /></span></span><ChevronRight size={17} className="project-chevron" />
  </button>;
}
function WorkIcon({ category }) {
  if (/streetlight|electricity/i.test(category)) return <Bell size={18} />;
  if (/drain|sewage|water/i.test(category)) return <Activity size={18} />;
  if (/footpath/i.test(category)) return <Navigation size={18} />;
  return <Construction size={18} />;
}
function ProjectDetails({ project, onClose, onReport, onEdit }) {
  const [tab, setTab] = useState('overview');
  const updateList = project.updates || [];
  return <div className="detail-drawer panel">
    <div className="detail-top"><div><div className="section-overline">PROJECT FILE · {project.ward || 'Ward not recorded'}</div><h2>{project.title}</h2><p>{project.department} · {project.category}</p></div><button className="icon-btn" onClick={onClose} aria-label="Close project details"><X size={20} /></button></div>
    <div className="detail-summary"><span className={`status-chip status-${project.status}`}>{STATUS_LABELS[project.status]}</span><div className="progress-label"><span>Reported progress</span><strong>{project.progress ?? 0}%</strong></div><div className="large-progress"><i style={{ width: `${Math.max(0, Math.min(100, project.progress || 0))}%`, background: STATUS_COLORS[project.status] }} /></div><p className="updated-at"><RefreshCw size={12} /> Last updated {shortDateTime(project.lastUpdated)}</p></div>
    <div className="detail-tabs"><button className={tab === 'overview' ? 'selected' : ''} onClick={() => setTab('overview')}>Overview</button><button className={tab === 'impact' ? 'selected' : ''} onClick={() => setTab('impact')}>Resident impact</button><button className={tab === 'updates' ? 'selected' : ''} onClick={() => setTab('updates')}>Updates ({updateList.length})</button></div>
    {tab === 'overview' && <div className="detail-content"><p className="detail-description">{project.description || 'No project description has been added yet.'}</p><div className="date-grid"><DetailInfo icon={<CalendarDays size={16} />} label="Planned start" value={formatDate(project.plannedStart)} /><DetailInfo icon={<CheckCircle2 size={16} />} label="Actual start" value={formatDate(project.actualStart)} /><DetailInfo icon={<CalendarDays size={16} />} label="Planned finish" value={formatDate(project.plannedEnd)} /><DetailInfo icon={<CheckCheck size={16} />} label="Actual finish" value={formatDate(project.actualEnd)} /><DetailInfo icon={<Clock3 size={16} />} label="Daily work starts" value={formatTime(project.workStartTime)} /><DetailInfo icon={<Clock3 size={16} />} label="Daily work ends" value={formatTime(project.workEndTime)} /></div>
      {project.status === 'delayed' && <div className="delay-box"><Clock3 size={17} /><div><strong>Completion is delayed</strong><span>{project.delayReason || 'No reason has been published yet. The responsible officer should add an update.'}</span></div></div>}
      <div className="detail-section"><h3><Building2 size={16} /> Responsibility</h3><div className="two-col-info"><div><small>Department</small><strong>{project.department || 'Not recorded'}</strong></div><div><small>Ward</small><strong>{project.ward || 'Not recorded'}</strong></div><div><small>Contractor</small><strong>{project.contractor || 'Not disclosed'}</strong></div><div><small>Responsible officer</small><strong>{project.responsibleOfficer || 'Not disclosed'}</strong></div></div></div>
      <div className="detail-section"><h3><Wallet size={16} /> Budget transparency</h3><div className="budget-grid"><div><small>Estimated cost</small><strong>{formatMoney(project.estimatedCost)}</strong></div><div><small>Reported expenditure</small><strong>{formatMoney(project.spentToDate)}</strong></div></div><div className="disclosure-note"><Info size={13} /> Figures are provided by the source shown below, not independently audited by this website.</div><div className="materials-note"><small>Materials / specifications</small><p>{project.materials || 'No materials information has been disclosed.'}</p><small>Quality / inspection</small><p>{project.qualityNotes || 'No quality inspection note has been disclosed.'}</p></div></div>
      <div className="detail-section"><h3><MapPin size={16} /> Work location</h3><p className="coordinate-line">{Number(project.latitude).toFixed(5)}, {Number(project.longitude).toFixed(5)} <a href={`https://www.openstreetmap.org/?mlat=${project.latitude}&mlon=${project.longitude}#map=17/${project.latitude}/${project.longitude}`} target="_blank" rel="noreferrer">Open map <ExternalLink size={12} /></a></p></div>
      <div className="source-note"><ShieldCheck size={15} /><span><strong>Record source</strong>{project.source || 'Source not recorded'}<small>Information last updated {shortDateTime(project.lastUpdated)}</small></span></div>
    </div>}
    {tab === 'impact' && <div className="detail-content"><div className="detail-section"><h3><UserRound size={16} /> Who is affected?</h3><p>{project.affectedResidents || 'Affected groups have not been specified.'}</p></div><div className="detail-section"><h3><Wrench size={16} /> Temporary impact</h3>{project.impacts?.length ? <ul className="clean-list">{project.impacts.map((v, i) => <li key={i}><span className="list-bullet" />{v}</li>)}</ul> : <p>No temporary impact has been recorded.</p>}</div><div className="safety-box"><div className="safety-title"><ShieldAlert size={18} /><strong>Safety notices</strong></div>{project.safety?.length ? <ul className="clean-list">{project.safety.map((v, i) => <li key={i}><span className="list-bullet" />{v}</li>)}</ul> : <p>No safety notices have been published.</p>}<div className="traffic-plan"><small>Access / traffic plan</small><p>{project.trafficPlan || 'No traffic or access plan has been published.'}</p></div></div></div>}
    {tab === 'updates' && <div className="detail-content">{updateList.length ? <div className="timeline-feed">{updateList.map((u, i) => <div className="feed-item" key={`${u.date}-${i}`}><span className="feed-dot" /><div><small>{formatDate(u.date)}</small><strong>{u.title}</strong><p>{u.detail}</p></div></div>)}</div> : <div className="empty-state compact"><Clock3 size={22} /><strong>No updates yet</strong><span>The responsible officer has not posted an activity update.</span></div>}</div>}
    <div className="detail-actions"><button className="secondary-btn" onClick={onReport}><MessageSquareText size={16} /> Report an issue</button>{onEdit && <button className="primary-btn" onClick={onEdit}><Pencil size={15} /> Edit project</button>}</div>
  </div>;
}
function DetailInfo({ icon, label, value }) { return <div className="detail-info"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
function ImpactCard({ icon, title, text }) { return <div className="impact-card"><span className="impact-icon">{icon}</span><h3>{title}</h3><p>{text}</p></div>; }
function TimelinePage({ projects, center, radius, onProject }) {
  const groups = [{ title: 'Upcoming work', subtitle: 'Planned start date', items: projects.filter(p => p.status === 'planned').sort((a,b) => (a.plannedStart || '').localeCompare(b.plannedStart || '')) },
    { title: 'Ongoing and delayed', subtitle: 'Latest reported activity', items: projects.filter(p => ['ongoing', 'delayed'].includes(p.status)).sort((a,b) => (a.plannedEnd || '').localeCompare(b.plannedEnd || '')) },
    { title: 'Recently completed', subtitle: 'Actual completion date', items: projects.filter(p => p.status === 'completed').sort((a,b) => (b.actualEnd || '').localeCompare(a.actualEnd || '')) }];
  return <section className="page-wrap"><div className="page-header"><div className="eyebrow"><span className="eyebrow-line" /> PROJECT REGISTER</div><h1>Work timeline</h1><p>See completed, ongoing and upcoming public works, along with the latest reported dates.</p></div><div className="timeline-disclaimer"><Info size={16} /><span>Dates and progress depend on the last update published by the responsible department. A delayed project should include a reason and revised finish date.</span></div>
    {groups.map(g => <section className="timeline-group" key={g.title}><div className="timeline-group-heading"><div><h2>{g.title}</h2><p>{g.subtitle}</p></div><span>{g.items.length} projects</span></div>{g.items.length ? <div className="timeline-card-grid">{g.items.map(p => <button className="timeline-card" key={p.id} onClick={() => onProject(p)}><div className="timeline-card-head"><span className={`status-chip status-${p.status}`}>{STATUS_LABELS[p.status]}</span><span className="timeline-category">{p.category}</span></div><h3>{p.title}</h3><p>{p.department} · {p.ward}</p><div className="timeline-dates"><span><small>Start</small><strong>{formatDate(p.plannedStart)}</strong></span><ChevronRight size={15} /><span><small>Finish</small><strong>{formatDate(p.actualEnd || p.plannedEnd)}</strong></span></div><div className="mini-progress"><i style={{ width: `${p.progress || 0}%`, background: STATUS_COLORS[p.status] }} /></div><div className="timeline-card-foot"><span>{p.progress || 0}% progress</span><span>View record <ArrowUpRight size={14} /></span></div></button>)}</div> : <div className="empty-state"><CalendarDays size={24} /><strong>No projects in this group</strong><span>New ward records will appear here once published.</span></div>}</section>)}
  </section>;
}
function TrackPage({ reportLookup, setReportLookup, lookupReport, lookupResult, reportSuccess, setReportSuccess, openReport }) {
  return <section className="page-wrap track-page"><div className="page-header"><div className="eyebrow"><span className="eyebrow-line" /> RESIDENT VOICE</div><h1>Report it. Track it.</h1><p>Submit a public-works issue and keep your ticket code to follow the response.</p></div><div className="track-layout"><div className="track-card panel"><div className="track-card-icon"><ClipboardList size={23} /></div><h2>Track a report</h2><p>Enter the ticket code you received after submitting the report.</p><form className="track-form" onSubmit={lookupReport}><label htmlFor="ticket-code">Ticket code</label><div className="ticket-input"><input id="ticket-code" value={reportLookup} onChange={e => setReportLookup(e.target.value.toUpperCase())} placeholder="e.g. CW-8K2P4M" required /><button className="primary-btn" type="submit">Check status <ChevronRight size={15} /></button></div></form>
      {lookupResult && (lookupResult.found ? <div className="lookup-result"><div className="lookup-result-head"><span className="result-check"><CheckCircle2 size={17} /></span><div><small>REPORT FOUND</small><strong>{lookupResult.ticketCode || lookupResult.ticket_code}</strong></div><span className={`status-chip status-${lookupResult.status === 'resolved' ? 'completed' : lookupResult.status === 'in_review' ? 'ongoing' : lookupResult.status === 'rejected' ? 'delayed' : 'planned'}`}>{reportStatusLabel(lookupResult.status)}</span></div><h3>{lookupResult.title}</h3><p>{lookupResult.description || lookupResult.response || 'Your report is in the register.'}</p><div className="lookup-meta"><span><small>Submitted</small><strong>{formatDate(lookupResult.createdAt || lookupResult.created_at)}</strong></span><span><small>Category</small><strong>{lookupResult.category}</strong></span></div>{lookupResult.response && <div className="authority-response"><strong>Latest authority response</strong><p>{lookupResult.response}</p></div>}</div> : <div className="lookup-not-found"><CircleAlert size={17} /><span>{lookupResult.error ? `Could not check this report: ${lookupResult.error}` : 'No report found for this code. Check the spelling or try the code again.'}</span></div>)}
      <div className="track-divider"><span />or<span /></div><button className="secondary-btn full-btn" onClick={openReport}><Plus size={16} /> Create a new report</button></div>
      <div className="track-side"><div className="track-side-art"><MessageSquareText size={31} /><span className="art-dot dot-one" /><span className="art-dot dot-two" /><span className="art-line" /></div><h2>Your report should not disappear into a form.</h2><p>Every issue gets a ticket code. Authorized ward officers can review it, assign a status, and publish a response.</p><div className="report-steps"><div><span>1</span><p><strong>Submit the issue</strong><small>Add the location and a clear description.</small></p></div><div><span>2</span><p><strong>Keep your ticket code</strong><small>Use it on this page to see the latest status.</small></p></div><div><span>3</span><p><strong>Read the response</strong><small>The officer’s latest update appears with the ticket.</small></p></div></div></div></div></section>;
}
function reportStatusLabel(status) { return ({ submitted: 'Submitted', in_review: 'In review', resolved: 'Resolved', rejected: 'Closed / rejected' })[status] || status || 'Submitted'; }

function OfficerPage({ isOfficer, demoMode, session, profile, canManageProject, projects, reports, adminTab, setAdminTab, projectForm, setProjectForm, editingProject, setEditingProject, saveProject, startNewProject, startEditProject, center, selectedReport, setSelectedReport, reportResponse, setReportResponse, updateReportStatus, resetDemo, login }) {
  if (!isOfficer) return <section className="page-wrap officer-locked"><div className="lock-art"><LockKeyhole size={30} /></div><div className="eyebrow"><span className="eyebrow-line" /> RESTRICTED AREA</div><h1>Ward officer portal</h1><p>Official project details can only be changed by an authorized government officer. Residents can browse records and submit reports without signing in.</p><div className="locked-points"><span><CheckCircle2 size={16} /> Publish or update projects</span><span><CheckCircle2 size={16} /> Add progress and delay reasons</span><span><CheckCircle2 size={16} /> Respond to resident reports</span></div><button className="primary-btn" onClick={login}><LockKeyhole size={16} /> Officer sign in</button><small className="locked-note">Demo preview uses a local-only officer mode. Real officer permissions are enforced by the database.</small></section>;
  const reviewed = reports.filter(r => ['in_review', 'submitted'].includes(r.status)).length;
  return <section className="page-wrap officer-page"><div className="officer-header"><div><div className="eyebrow"><span className="eyebrow-line" /> WARD OPERATIONS</div><h1>Officer workspace</h1><p>Publish verified project information and close the loop on resident reports.</p></div><div className="officer-user"><span className="officer-avatar"><UserRound size={19} /></span><span><strong>{demoMode ? 'Demo ward officer' : (profile?.full_name || session?.user?.email || 'Ward officer')}</strong><small>{demoMode ? 'Local preview · no official access' : `${profile?.role || 'Resident'}${profile?.ward ? ` · ${profile.ward}` : ''}`}</small></span><span className={`status-chip ${demoMode ? 'status-planned' : 'status-completed'}`}>{demoMode ? 'DEMO' : 'SIGNED IN'}</span></div></div>
    <div className="officer-stats"><StatCard label="Projects in register" value={projects.length} sub="All dates and statuses" icon={<Construction size={18} />} tone="green" /><StatCard label="Need attention" value={reviewed} sub="New or in-review reports" icon={<MessageSquareText size={18} />} tone="gold" /><StatCard label="Delayed projects" value={projects.filter(p => p.status === 'delayed').length} sub="Publish a reason and new date" icon={<Clock3 size={18} />} tone="rose" /></div>
    <div className="admin-tabs"><button className={adminTab === 'projects' ? 'active' : ''} onClick={() => setAdminTab('projects')}><Construction size={16} /> Project register</button><button className={adminTab === 'reports' ? 'active' : ''} onClick={() => setAdminTab('reports')}><MessageSquareText size={16} /> Resident reports <span>{reports.length}</span></button></div>
    {adminTab === 'projects' && <div className="admin-workspace"><div className="admin-list panel"><div className="admin-list-head"><div><h2>Published projects</h2><p>Updates appear on the public map.</p></div><button className="primary-btn small-btn" onClick={startNewProject}><Plus size={15} /> New project</button></div><div className="admin-project-list">{projects.map(p => <div className="admin-project-row" key={p.id}><span className={`project-symbol symbol-${p.status}`}><WorkIcon category={p.category} /></span><span className="admin-project-text"><strong>{p.title}</strong><small>{p.department} · {p.ward}</small><span className={`status-chip status-${p.status}`}>{STATUS_LABELS[p.status]}</span></span>{canManageProject(p) ? <button className="light-icon-btn" title="Edit project" onClick={() => startEditProject(p)}><Pencil size={15} /></button> : <span className="ward-lock-note" title="Outside your assigned ward"><LockKeyhole size={13} /></span>}</div>)}</div>{demoMode && <button className="reset-demo-btn" onClick={resetDemo}>Reset sample data</button>}</div>
      <div id="project-editor" className="admin-editor panel"><div className="admin-editor-head"><div><div className="section-overline">WARD RECORD</div><h2>{editingProject ? 'Edit public work' : 'Add public work'}</h2><p>{editingProject ? 'Keep previous dates and publish a clear update.' : 'Enter details from the approved work order.'}</p></div>{editingProject && <button className="light-icon-btn" onClick={() => { setEditingProject(null); setProjectForm({ ...emptyProjectForm(center), ward: profile?.ward || '' }); }} title="Cancel edit"><X size={16} /></button>}</div><form className="project-editor-form" onSubmit={saveProject}>
        <Field label="Project title" required><input required maxLength="140" value={projectForm.title} onChange={e => setProjectForm({ ...projectForm, title: e.target.value })} placeholder="e.g. 3rd Street drainage repair" /></Field>
        <div className="form-grid two"><Field label="Work category" required><select value={projectForm.category} onChange={e => setProjectForm({ ...projectForm, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field><Field label="Current status" required><select value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value, progress: e.target.value === 'completed' ? 100 : projectForm.progress })}>{STATUSES.map(s => <option value={s} key={s}>{STATUS_LABELS[s]}</option>)}</select></Field></div>
        <div className="form-grid two"><Field label="Department" required><input required value={projectForm.department} onChange={e => setProjectForm({ ...projectForm, department: e.target.value })} placeholder="Department name" /></Field><Field label="Ward" required><input required disabled={profile?.role === 'officer'} value={projectForm.ward} onChange={e => setProjectForm({ ...projectForm, ward: e.target.value })} placeholder="Ward number / name" />{profile?.role === 'officer' && <small className="field-help">Your account is assigned to {profile.ward}. Only an administrator can change this.</small>}</Field></div>
        <Field label="Project description" required><textarea rows="2" required value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Scope of work and location details" /></Field>
        <div className="form-grid two"><Field label="Contractor"><input value={projectForm.contractor} onChange={e => setProjectForm({ ...projectForm, contractor: e.target.value })} placeholder="Contractor / agency" /></Field><Field label="Responsible officer"><input value={projectForm.responsibleOfficer} onChange={e => setProjectForm({ ...projectForm, responsibleOfficer: e.target.value })} placeholder="Designation / office contact" /></Field></div>
        <div className="form-grid two"><Field label="Planned start" required><input type="date" required value={projectForm.plannedStart} onChange={e => setProjectForm({ ...projectForm, plannedStart: e.target.value })} /></Field><Field label="Planned finish" required><input type="date" required value={projectForm.plannedEnd} onChange={e => setProjectForm({ ...projectForm, plannedEnd: e.target.value })} /></Field><Field label="Actual start"><input type="date" value={projectForm.actualStart} onChange={e => setProjectForm({ ...projectForm, actualStart: e.target.value })} /></Field><Field label="Actual finish"><input type="date" value={projectForm.actualEnd} onChange={e => setProjectForm({ ...projectForm, actualEnd: e.target.value, ...(e.target.value ? { progress: 100, status: 'completed' } : {}) })} /></Field></div>
        <div className="form-grid two"><Field label="Usual daily start time"><input type="time" value={projectForm.workStartTime || ''} onChange={e => setProjectForm({ ...projectForm, workStartTime: e.target.value })} /></Field><Field label="Usual daily finish time"><input type="time" value={projectForm.workEndTime || ''} onChange={e => setProjectForm({ ...projectForm, workEndTime: e.target.value })} /></Field></div>
        <Field label={`Progress reported · ${projectForm.progress}%`}><input className="progress-input" type="range" min="0" max="100" step="5" value={projectForm.progress} onChange={e => setProjectForm({ ...projectForm, progress: Number(e.target.value) })} /></Field>
        <div className="form-grid two"><Field label="Estimated cost (₹)"><input type="number" min="0" value={projectForm.estimatedCost} onChange={e => setProjectForm({ ...projectForm, estimatedCost: e.target.value })} placeholder="From approved estimate" /></Field><Field label="Reported spend (₹)"><input type="number" min="0" value={projectForm.spentToDate} onChange={e => setProjectForm({ ...projectForm, spentToDate: e.target.value })} placeholder="If disclosed" /></Field></div>
        <Field label="Materials / approved specifications"><textarea rows="2" value={projectForm.materials} onChange={e => setProjectForm({ ...projectForm, materials: e.target.value })} placeholder="Material type, specification or work-order reference" /></Field>
        <Field label="Quality checks / inspection"><textarea rows="2" value={projectForm.qualityNotes} onChange={e => setProjectForm({ ...projectForm, qualityNotes: e.target.value })} placeholder="Inspection status, tests, handover checks" /></Field>
        <Field label="Who is affected?"><input value={projectForm.affectedResidents} onChange={e => setProjectForm({ ...projectForm, affectedResidents: e.target.value })} placeholder="Residents, shops, commuters…" /></Field>
        <Field label="Temporary impacts (comma-separated)"><textarea rows="2" value={projectForm.impacts} onChange={e => setProjectForm({ ...projectForm, impacts: e.target.value })} placeholder="Noise, road closure, water interruption…" /></Field>
        <Field label="Safety notices (comma-separated)"><textarea rows="2" value={projectForm.safety} onChange={e => setProjectForm({ ...projectForm, safety: e.target.value })} placeholder="Barricades, access route, hazard warning…" /></Field>
        <Field label="Traffic / access plan"><textarea rows="2" value={projectForm.trafficPlan} onChange={e => setProjectForm({ ...projectForm, trafficPlan: e.target.value })} placeholder="Diversions, pedestrian access, timings…" /></Field>
        <Field label="Reason for delay / latest note"><textarea rows="2" value={projectForm.delayReason} onChange={e => setProjectForm({ ...projectForm, delayReason: e.target.value })} placeholder="Required when delayed; include revised date if confirmed" /></Field>
        <div className="field-group"><label>Map coordinates <span className="required-mark">*</span></label><div className="form-grid two"><input type="number" step="any" required value={projectForm.latitude} onChange={e => setProjectForm({ ...projectForm, latitude: e.target.value })} placeholder="Latitude" aria-label="Project latitude" /><input type="number" step="any" required value={projectForm.longitude} onChange={e => setProjectForm({ ...projectForm, longitude: e.target.value })} placeholder="Longitude" aria-label="Project longitude" /></div><small className="field-help">Use decimal coordinates of the work site. Use OpenStreetMap to find the point.</small></div>
        <div className="publish-disclosure"><ShieldCheck size={16} /><span><strong>Information integrity</strong> Only publish figures from approved records. The public page shows who supplied the record and when it was last updated.</span></div>
        {demoMode && <div className="demo-warning"><Info size={15} /> Demo mode saves to this browser only. It is not connected to a government system.</div>}
        <div className="form-submit-row"><button type="button" className="secondary-btn" onClick={() => { setEditingProject(null); setProjectForm(emptyProjectForm(center)); }}>Clear form</button><button className="primary-btn" type="submit"><Check size={16} /> {editingProject ? 'Save project update' : 'Publish project'}</button></div>
      </form></div></div>}
    {adminTab === 'reports' && <div className="reports-admin panel"><div className="admin-list-head"><div><h2>Resident reports</h2><p>Review a hazard, update its status and add a public response.</p></div><span className="count-bubble">{reports.length}</span></div>{reports.length ? <div className="report-admin-list">{reports.map(r => <div className="report-admin-row" key={r.id}><div className="report-admin-main"><div className="report-row-top"><span className={`status-chip status-${r.status === 'resolved' ? 'completed' : r.status === 'in_review' ? 'ongoing' : r.status === 'rejected' ? 'delayed' : 'planned'}`}>{reportStatusLabel(r.status)}</span><span>{r.ticketCode}</span><small>{formatDate(r.createdAt)}</small></div><h3>{r.title}</h3><p>{r.description}</p><div className="report-coordinate"><Building2 size={13} /> {r.ward || 'Ward not provided'} · </div><div className="report-coordinate"><MapPin size={13} /> {Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)} · {r.category}</div></div><button className="secondary-btn" onClick={() => { setSelectedReport(r); setReportResponse(r.response || ''); }}><Eye size={15} /> Review</button></div>)}</div> : <div className="empty-state"><MessageSquareText size={24} /><strong>No resident reports yet</strong><span>New public reports will appear here.</span></div>}</div>}
    {selectedReport && <Modal title="Review resident report" onClose={() => setSelectedReport(null)}><div className="review-report"><span className="ticket-label">{selectedReport.ticketCode} · {selectedReport.category}</span><h3>{selectedReport.title}</h3><p>{selectedReport.description}</p>{reportAttachmentUrl && <img className="report-evidence-image" src={reportAttachmentUrl} alt="Resident-submitted issue evidence" />}<div className="review-location"><MapPin size={15} /> {Number(selectedReport.latitude).toFixed(5)}, {Number(selectedReport.longitude).toFixed(5)}</div>{selectedReport.contact && <div className="contact-private"><LockKeyhole size={14} /> Private contact: {selectedReport.contact}</div>}<Field label="Authority response / update"><textarea rows="4" value={reportResponse} onChange={e => setReportResponse(e.target.value)} placeholder="Share what has been checked or what happens next…" /></Field><div className="review-status-actions"><button className="secondary-btn" onClick={() => updateReportStatus(selectedReport, 'in_review', reportResponse)}>Mark in review</button><button className="secondary-btn" onClick={() => updateReportStatus(selectedReport, 'rejected', reportResponse)}>Close / reject</button><button className="primary-btn" onClick={() => updateReportStatus(selectedReport, 'resolved', reportResponse)}><Check size={15} /> Mark resolved</button></div></div></Modal>}
  </section>;
}
function Field({ label, required, children }) { return <div className="field-group"><label>{label}{required && <span className="required-mark"> *</span>}</label>{children}</div>; }
function Modal({ title, onClose, children }) { return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div><div className="modal-body">{children}</div></section></div>; }
function UseRecenter({ center }) { useRecenter(center); return null; }

export default App;
