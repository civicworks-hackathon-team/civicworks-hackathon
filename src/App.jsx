import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, CircleAlert, Clock3, Construction,
  LocateFixed, LockKeyhole, LogOut, MapPin, Menu, MessageSquareText, RadioTower, RefreshCw, Search,
  ShieldAlert, ShieldCheck, SlidersHorizontal, Wallet, X, ClipboardList, MapPinned, Info
} from 'lucide-react';
import { demoProjects, demoReports } from './data.js';
import { findCoordinationConflicts } from './conflictEngine.js';
import { fromDbProject, fromDbReport, toDbProject } from './db.js';
import {
  DEMO_CENTER, STATUSES, STATUS_LABELS, REPORT_CATEGORIES,
  readStoredList, writeStored, removeStored, formatDate, distanceKm, withinRadius, makeTicket, makeUuid,
  readFileAsDataUrl, safeArray, slugifyWard, wardKey, knownWards, nearestWard, deriveStatus, todayIso,
  checkLookupThrottle, emptyProjectForm, validateProjectForm
} from './utils.js';
import { StatCard, ProjectListItem, ImpactCard } from './components/ui.jsx';
import MapView from './components/MapView.jsx';
import ProjectDetails from './components/ProjectDetails.jsx';
import TimelinePage from './components/TimelinePage.jsx';
import TrackPage from './components/TrackPage.jsx';
import OfficerPage from './components/OfficerPage.jsx';
import ReportModal from './components/ReportModal.jsx';
import LoginModal from './components/LoginModal.jsx';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const BLANK_REPORT = { title: '', category: REPORT_CATEGORIES[0], description: '', contact: '', attachment: null, ward: '' };

function App() {
  const demoMode = !supabase;
  const [storedProjects, setProjects] = useState(() => demoMode ? readStoredList('civicworks-projects', demoProjects) : []);
  const [reports, setReports] = useState(() => demoMode ? readStoredList('civicworks-reports', demoReports) : []);
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
  const [reportForm, setReportForm] = useState(BLANK_REPORT);
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
  const lookupAttempts = useRef([]);
  const loadSeq = useRef(0);

  // "Delayed" is worked out from the dates: planned/ongoing work past its planned finish is shown as delayed.
  const today = todayIso();
  const projects = useMemo(() => storedProjects.map(p => deriveStatus(p, today)), [storedProjects, today]);
  const wards = useMemo(() => knownWards(projects), [projects]);

  useEffect(() => {
    if (profile?.ward) setProjectForm(f => f.ward ? f : { ...f, ward: profile.ward });
  }, [profile]);

  const isOfficer = demoMode ? demoOfficer : ['officer', 'admin'].includes(profile?.role);
  const canManageProject = (project) => demoMode ? demoOfficer : (profile?.role === 'admin' || (profile?.role === 'officer' && Boolean(wardKey(profile?.ward)) && wardKey(profile?.ward) === wardKey(project?.ward)));

  useEffect(() => {
    if (demoMode) return;
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session?.user) await fetchProfile(data.session.user.id, () => alive);
      await loadRemoteData(() => alive);
    }).catch(() => { if (alive) setNotice({ type: 'error', text: 'Could not reach the database. Check your connection and refresh.' }); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      // Run Supabase calls outside the auth callback (calling them inside it can deadlock the client).
      setTimeout(async () => {
        if (!alive) return;
        if (nextSession?.user) await fetchProfile(nextSession.user.id, () => alive);
        else { setProfile(null); setReports([]); }
        // Reports are only readable once signed in, so reload everything whenever the session changes.
        await loadRemoteData(() => alive);
      }, 0);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  async function fetchProfile(userId, isAlive = () => true) {
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, ward').eq('id', userId).maybeSingle();
    if (!isAlive()) return;
    if (error) setNotice({ type: 'error', text: 'Could not load your officer profile. Ask the project administrator to check the profiles table.' });
    else setProfile(data);
  }

  async function loadRemoteData(isAlive = () => true) {
    const seq = ++loadSeq.current; // only the newest load may write state, so slow older loads cannot overwrite fresh data
    setDataBusy(true);
    try {
      const [p, r, u] = await Promise.all([
        supabase.from('projects').select('*').order('updated_at', { ascending: false }),
        supabase.from('reports').select('*').order('created_at', { ascending: false }),
        supabase.from('project_updates').select('*').order('created_at', { ascending: false }).limit(1000)
      ]);
      if (!isAlive() || seq !== loadSeq.current) return;
      if (!p.error) {
        const updates = u.error ? [] : (u.data || []);
        setProjects((p.data || []).map(row => fromDbProject(row, updates.filter(x => x.project_id === row.id).map(x => ({
          date: x.created_at?.slice(0, 10), title: x.title, detail: x.detail || ''
        })))));
      } else setNotice({ type: 'error', text: `Unable to load projects: ${p.error.message}` });
      if (!r.error) setReports((r.data || []).map(fromDbReport));
      else if (r.error.code !== '42501') setNotice({ type: 'error', text: `Unable to load reports: ${r.error.message}` });
      else setReports([]);
    } catch (err) {
      if (isAlive() && seq === loadSeq.current) setNotice({ type: 'error', text: `Unable to load data: ${err?.message || 'network error'}` });
    } finally {
      if (isAlive() && seq === loadSeq.current) setDataBusy(false);
    }
  }

  useEffect(() => {
    if (!demoMode) return;
    if (!writeStored('civicworks-projects', storedProjects)) setNotice({ type: 'error', text: 'Browser storage is full. Use the connected database for more demo data or photos.' });
  }, [storedProjects, demoMode]);
  useEffect(() => {
    if (!demoMode) return;
    if (!writeStored('civicworks-reports', reports)) setNotice({ type: 'error', text: 'Browser storage is full. This report may not persist after refresh; connect Supabase for shared storage.' });
  }, [reports, demoMode]);

  useEffect(() => {
    let active = true;
    setReportAttachmentUrl(null);
    if (!selectedReport) return () => { active = false; };
    if (demoMode && selectedReport.attachmentData) setReportAttachmentUrl(selectedReport.attachmentData);
    else if (!demoMode && selectedReport.attachmentPath) {
      supabase.storage.from('report-attachments').createSignedUrl(selectedReport.attachmentPath, 900)
        .then(({ data, error }) => { if (active && !error) setReportAttachmentUrl(data?.signedUrl || null); })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [selectedReport, demoMode]);

  const nearbyProjects = useMemo(() => projects.map(p => ({ ...p, distance: distanceKm(center[0], center[1], Number(p.latitude), Number(p.longitude)) }))
    .filter(p => p.distance <= radius)
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .filter(p => categoryFilter === 'all' || p.category === categoryFilter)
    .filter(p => !search || `${p.title} ${p.category} ${p.department} ${p.ward} ${p.description}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.distance - b.distance), [projects, center, radius, statusFilter, categoryFilter, search]);

  const allNearbyCount = useMemo(() => projects.filter(p => withinRadius(p, center, radius)).length, [projects, center, radius]);
  const coordinationConflicts = useMemo(() => findCoordinationConflicts(projects.filter(p => withinRadius(p, center, radius))), [projects, center, radius]);
  const currentProject = selectedProject ? (projects.find(p => p.id === selectedProject.id) || null) : null;

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
      setLocationMessage(`${reason} Showing the current map area. You can still browse projects.`);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }
  function resetToDemoArea() {
    setCenter(DEMO_CENTER); setUserLocation(null); setLocationMessage('Showing sample works near the demo area.');
  }

  async function handleLogin(event) {
    event.preventDefault(); setLoginBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setNotice({ type: 'error', text: `Login failed: ${error.message}` });
      else { setLoginOpen(false); setPassword(''); setPage('officer'); }
    } catch (err) {
      setNotice({ type: 'error', text: `Login failed: ${err?.message || 'network error'}` });
    } finally { setLoginBusy(false); }
  }

  async function handleLogout() {
    if (demoMode) { setDemoOfficer(false); setPage('map'); setNotice({ type: 'success', text: 'Exited demo officer mode.' }); return; }
    await supabase.auth.signOut(); setPage('map'); setNotice({ type: 'success', text: 'Signed out.' });
  }

  // An officer's ward is fixed by their account, so a blank form always starts with it filled in.
  function resetProjectForm() {
    setEditingProject(null);
    setProjectForm({ ...emptyProjectForm(center), ward: demoMode ? '' : (profile?.ward || '') });
  }
  function startNewProject() {
    resetProjectForm(); setAdminTab('projects');
    setTimeout(() => document.getElementById('project-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
  function startEditProject(project) {
    // Always edit the stored record, not the display copy (which may carry an automatic "delayed" status).
    const stored = storedProjects.find(p => p.id === project.id) || project;
    const clean = { ...stored };
    delete clean.distance; delete clean.recordedStatus; delete clean.autoDelayed;
    setEditingProject(stored.id);
    setProjectForm({ ...emptyProjectForm(center), ...clean, impacts: safeArray(stored.impacts).join(', '), safety: safeArray(stored.safety).join(', '), estimatedCost: stored.estimatedCost ?? '', spentToDate: stored.spentToDate ?? '' });
    setAdminTab('projects');
    setTimeout(() => document.getElementById('project-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  async function saveProject(event) {
    event.preventDefault();
    const problem = validateProjectForm(projectForm);
    if (problem) { setNotice({ type: 'error', text: problem }); return; }
    const wardForSave = !demoMode && profile?.role === 'officer' ? (profile.ward || '') : projectForm.ward;
    const payload = { ...projectForm, ward: wardForSave, latitude: Number(projectForm.latitude), longitude: Number(projectForm.longitude), progress: Number(projectForm.progress), impacts: safeArray(projectForm.impacts), safety: safeArray(projectForm.safety), source: demoMode ? 'Demo officer entry — not an official record' : 'Official ward record', lastUpdated: new Date().toISOString() };
    if (demoMode) {
      const stamp = new Date().toISOString().slice(0, 10);
      if (editingProject) {
        const newUpdate = { date: stamp, title: `Details updated · ${payload.progress}% progress`, detail: payload.delayReason || `Status: ${STATUS_LABELS[payload.status]}. Updated by the demo officer.` };
        setProjects(list => list.map(p => p.id === editingProject ? { ...payload, id: editingProject, updates: [newUpdate, ...(p.updates || [])] } : p));
      } else {
        const next = { ...payload, id: `demo-${makeUuid()}`, updates: [{ date: stamp, title: 'Project added', detail: 'Added in local demo officer mode.' }] };
        setProjects(list => [next, ...list]);
      }
      setNotice({ type: 'success', text: 'Saved in this browser only. This demo entry is not an official government record.' });
      resetProjectForm(); return;
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
    resetProjectForm(); await loadRemoteData();
  }

  async function submitReport(event) {
    event.preventDefault();
    if (reportBusy) return;
    const ward = (reportTarget?.ward || reportForm.ward || '').trim();
    if (!ward || (!reportTarget?.ward && !wards.includes(ward))) { setNotice({ type: 'error', text: 'Please choose your ward from the list so the report reaches the right officer.' }); return; }
    const attachment = reportForm.attachment;
    if (attachment && (!['image/jpeg', 'image/png', 'image/webp'].includes(attachment.type) || attachment.size > 2 * 1024 * 1024)) {
      setNotice({ type: 'error', text: 'Please use a JPG, PNG or WebP image no larger than 2 MB.' }); return;
    }
    setReportBusy(true);
    try {
      const ticket = makeTicket();
      let attachmentData = null, attachmentPath = null;
      if (attachment && demoMode) {
        try { attachmentData = await readFileAsDataUrl(attachment); }
        catch { setNotice({ type: 'error', text: 'The selected image could not be read.' }); return; }
      }
      const report = {
        id: demoMode ? `report-${makeUuid()}` : makeUuid(), ticketCode: ticket,
        title: reportForm.title.trim(), category: reportForm.category, description: reportForm.description.trim(),
        latitude: reportTarget?.latitude ?? center[0], longitude: reportTarget?.longitude ?? center[1], ward,
        status: 'submitted', response: '', createdAt: new Date().toISOString(), contact: reportForm.contact.trim(), attachmentData
      };
      if (demoMode) {
        setReports(old => [report, ...old]);
      } else {
        if (attachment) {
          const ext = attachment.type === 'image/png' ? 'png' : attachment.type === 'image/webp' ? 'webp' : 'jpg';
          attachmentPath = `reports/${slugifyWard(ward)}/${ticket}/${makeUuid()}.${ext}`;
          const uploaded = await supabase.storage.from('report-attachments').upload(attachmentPath, attachment, { contentType: attachment.type, upsert: false });
          if (uploaded.error) { setNotice({ type: 'error', text: `Photo upload failed: ${uploaded.error.message}. Remove the selected photo and submit the report again without it.` }); return; }
        }
        const result = await supabase.from('reports').insert({ id: report.id, ticket_code: ticket, title: report.title, category: report.category, description: report.description,
          latitude: report.latitude, longitude: report.longitude, ward, status: 'submitted', contact: report.contact || null, attachment_path: attachmentPath });
        if (result.error) { setNotice({ type: 'error', text: `Report could not be submitted: ${result.error.message}` }); return; }
      }
      setReportSuccess(ticket); setReportForm(BLANK_REPORT); setLookupResult(null);
    } catch (err) {
      setNotice({ type: 'error', text: `Report could not be submitted: ${err?.message || 'network error'}` });
    } finally { setReportBusy(false); }
  }

  async function lookupReport(event) {
    event?.preventDefault(); setLookupResult(null);
    const key = reportLookup.trim().toUpperCase();
    if (!key) return;
    const gate = checkLookupThrottle(lookupAttempts.current);
    lookupAttempts.current = gate.attempts;
    if (!gate.allowed) { setLookupResult({ found: false, throttled: true, error: `Too many lookups. Please wait ${Math.ceil(gate.retryInMs / 1000)} seconds and try again.` }); return; }
    if (demoMode) {
      const match = reports.find(r => String(r.ticketCode).toUpperCase() === key);
      setLookupResult(match ? { found: true, ...match } : { found: false }); return;
    }
    try {
      const { data, error } = await supabase.rpc('get_report_status', { lookup_ticket: key });
      if (error) setLookupResult({ found: false, error: error.message });
      else setLookupResult(data?.length ? { found: true, ...data[0] } : { found: false });
    } catch (err) { setLookupResult({ found: false, error: err?.message || 'network error' }); }
  }

  async function updateReportStatus(report, status, response) {
    if (demoMode) setReports(old => old.map(r => r.id === report.id ? { ...r, status, response, updatedAt: new Date().toISOString() } : r));
    else {
      const { error } = await supabase.from('reports').update({ status, response: response || null, reviewed_by: session?.user?.id ?? null }).eq('id', report.id);
      if (error) { setNotice({ type: 'error', text: `Could not update report: ${error.message}` }); return; }
      await loadRemoteData();
    }
    setNotice({ type: 'success', text: 'Report status updated.' }); setSelectedReport(null); setReportResponse('');
  }

  function resetDemo() {
    if (!window.confirm('Reset local demo data to the original sample projects and reports? Your own demo edits will be lost.')) return;
    removeStored('civicworks-projects'); removeStored('civicworks-reports');
    setProjects(demoProjects); setReports(demoReports); resetProjectForm(); setSelectedProject(null);
    setNotice({ type: 'success', text: 'Demo data reset.' });
  }

  const openReport = (project = null) => {
    setReportTarget(project); setReportSuccess(null);
    setReportForm({ ...BLANK_REPORT, ward: project?.ward || nearestWard(projects, center) });
    setShowReportForm(true);
  };
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
          <div className="location-strip"><MapPin size={14} /><span>{locationMessage}</span>{userLocation && <button className="small-link" onClick={resetToDemoArea}>Back to demo area</button>}<span className="privacy-note"><LockKeyhole size={12} /> Location isn’t stored</span></div>
          <section className="stat-grid">
            <StatCard label="Nearby projects" value={allNearbyCount} sub={`Within ${radius} km`} icon={<MapPin size={18} />} tone="green" />
            <StatCard label="Ongoing work" value={projects.filter(p => ['ongoing', 'delayed'].includes(p.status) && withinRadius(p, center, radius)).length} sub="Work in progress" icon={<Construction size={18} />} tone="blue" />
            <StatCard label="Planned next" value={projects.filter(p => p.status === 'planned' && withinRadius(p, center, radius)).length} sub="Upcoming work" icon={<CalendarDays size={18} />} tone="gold" />
            <StatCard label="Delayed" value={projects.filter(p => p.status === 'delayed' && withinRadius(p, center, radius)).length} sub="Updated deadlines needed" icon={<Clock3 size={18} />} tone="rose" />
          </section>
          {coordinationConflicts.length > 0 && <section className="coordination-panel panel"><div className="coordination-mark"><RadioTower size={19} /></div><div className="coordination-copy"><div className="section-overline">CROSS-DEPARTMENT COORDINATION</div><h2>{coordinationConflicts.length} possible work {coordinationConflicts.length === 1 ? 'overlap' : 'overlaps'} nearby</h2><p>Different departments have projects close together with overlapping dates. This is a warning for officers to verify the road segment before work begins, not proof that the projects conflict.</p><div className="conflict-list">{coordinationConflicts.slice(0, 3).map((conflict, index) => <div className="conflict-item" key={`${conflict.a.id}-${conflict.b.id}`}><span className="conflict-index">0{index + 1}</span><div><strong>{conflict.a.title} <span>↔</span> {conflict.b.title}</strong><small>{conflict.a.department} · {conflict.b.department}</small><small>{formatDate(conflict.start)} – {formatDate(conflict.end)} · {Math.round(conflict.distance * 1000)} m apart · {conflict.type === 'direct' ? 'likely same stretch' : 'adjacent corridor'}</small></div></div>)}</div></div></section>}
          <section className="explore-layout">
            <div className="map-panel panel">
              <div className="panel-heading map-heading">
                <div><div className="section-overline">GEOFENCED VIEW</div><h2>Public works near you</h2><p>Projects inside your selected radius</p></div>
                <button className="light-icon-btn" title="Refresh data" disabled={dataBusy} onClick={() => demoMode ? setProjects(readStoredList('civicworks-projects', demoProjects)) : loadRemoteData()}><RefreshCw size={16} /></button>
              </div>
              <div className="map-controls">
                <label className="radius-select"><span><RadioTower size={15} /> Radius</span><select value={radius} onChange={e => setRadius(Number(e.target.value))}><option value="1">1 km</option><option value="3">3 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option></select></label>
                <div className="map-legend"><span><i className="legend-dot ongoing" /> Ongoing</span><span><i className="legend-dot planned" /> Planned</span><span><i className="legend-dot delayed" /> Delayed</span></div>
              </div>
              <div className="map-canvas">
                <MapView center={center} radius={radius} userLocation={userLocation} projects={nearbyProjects} selectedId={selectedProject?.id} onSelect={setSelectedProject} />
                <div className="map-floating-note"><span className="map-ping" /> {nearbyProjects.length} shown · {allNearbyCount} nearby</div>
              </div>
              <div className="map-footnote"><Info size={14} /> The dashed circle is your selected search radius, not a legal ward boundary. Project locations shown are sample data unless marked as an official ward record.</div>
            </div>
            <aside className="project-list-panel panel">
              <div className="list-topline"><div><div className="section-overline">LOCAL WORK REGISTER</div><h2>Projects nearby <span className="count-bubble">{nearbyProjects.length}</span></h2></div><button className="filter-toggle" onClick={() => setShowFilters(v => !v)}><SlidersHorizontal size={15} /> Filters</button></div>
              <div className="search-box"><Search size={17} /><input aria-label="Search projects" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search road, drain, department…" />{search && <button onClick={() => setSearch('')}><X size={14} /></button>}</div>
              {showFilters && <div className="filter-row"><label><span>Status</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{STATUSES.map(s => <option value={s} key={s}>{STATUS_LABELS[s]}</option>)}</select></label><label><span>Type</span><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">All work types</option>{[...new Set(projects.map(p => p.category))].sort().map(c => <option key={c}>{c}</option>)}</select></label></div>}
              <div className="project-scroll-list">
                {nearbyProjects.length ? nearbyProjects.map(project => <ProjectListItem key={project.id} project={project} selected={selectedProject?.id === project.id} onClick={() => setSelectedProject(project)} />) : <div className="empty-state"><MapPin size={24} /><strong>No projects match this view</strong><span>Try a wider radius or remove a filter.</span><button className="text-action" onClick={() => { setRadius(50); setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }}>Show more projects</button></div>}
              </div>
              <button className="report-banner" onClick={() => openReport()}><span className="report-banner-icon"><MessageSquareText size={18} /></span><span><strong>See a problem?</strong><small>Report a hazard or public-work issue</small></span><ChevronRight size={18} /></button>
            </aside>
          </section>
          {currentProject && <ProjectDetails key={currentProject.id} project={currentProject} onClose={() => setSelectedProject(null)} onReport={() => openReport(currentProject)} onEdit={canManageProject(currentProject) ? () => { setPage('officer'); startEditProject(currentProject); } : null} />}
          <section className="below-grid">
            <div className="section-title-row"><div><div className="section-overline">DON’T GET CAUGHT OFF GUARD</div><h2>Plan around public works</h2></div><button className="text-action" onClick={() => go('timeline')}>View all schedules <ArrowUpRight size={15} /></button></div>
            <div className="impact-grid"><ImpactCard icon={<ShieldAlert size={19} />} title="Safety first" text="Check site hazards, temporary access, road closures and pedestrian diversions before leaving." /><ImpactCard icon={<Wallet size={19} />} title="Follow the money" text="See the published estimate, reported spend and materials where the ward has disclosed them." /><ImpactCard icon={<MessageSquareText size={19} />} title="Close the loop" text="Submit a report, keep the ticket code and check how the responsible office responds." /></div>
          </section>
        </>}

        {page === 'timeline' && <TimelinePage projects={projects} center={center} radius={radius} onProject={p => { setSelectedProject(p); setPage('map'); }} />}
        {page === 'track' && <TrackPage reportLookup={reportLookup} setReportLookup={setReportLookup} lookupReport={lookupReport} lookupResult={lookupResult} reportSuccess={reportSuccess} setReportSuccess={setReportSuccess} openReport={() => openReport()} />}
        {page === 'officer' && <OfficerPage isOfficer={isOfficer} demoMode={demoMode} session={session} profile={profile} canManageProject={canManageProject} projects={projects} reports={reports} adminTab={adminTab} setAdminTab={setAdminTab} projectForm={projectForm} setProjectForm={setProjectForm} editingProject={editingProject} setEditingProject={setEditingProject} saveProject={saveProject} startNewProject={startNewProject} startEditProject={startEditProject} center={center} selectedReport={selectedReport} setSelectedReport={setSelectedReport} reportResponse={reportResponse} setReportResponse={setReportResponse} reportAttachmentUrl={reportAttachmentUrl} updateReportStatus={updateReportStatus} resetDemo={resetDemo} resetProjectForm={resetProjectForm} login={() => setLoginOpen(true)} />}
      </main>

      <footer className="footer"><div className="footer-brand"><span className="footer-mark"><Construction size={18} /></span><strong>CivicWorks</strong></div><span>Transparency for the streets we share.</span><span className="footer-right"><LockKeyhole size={13} /> Location stays in your browser · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Map data © OpenStreetMap</a></span></footer>

      {showReportForm && <ReportModal reportSuccess={reportSuccess} reportTarget={reportTarget} reportForm={reportForm} setReportForm={setReportForm} wards={wards} center={center} demoMode={demoMode} reportBusy={reportBusy} onSubmit={submitReport} onClose={() => { setShowReportForm(false); setReportSuccess(null); }} onTrack={() => { setReportLookup(reportSuccess); setReportSuccess(null); setShowReportForm(false); setPage('track'); }} onUseLocation={requestLocation} />}

      {loginOpen && <LoginModal demoMode={demoMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} loginBusy={loginBusy} onSubmit={handleLogin} onEnterDemo={() => { setDemoOfficer(true); setLoginOpen(false); setPage('officer'); }} onClose={() => setLoginOpen(false)} />}

    </div>
  );
}

export default App;
