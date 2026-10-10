import React from 'react';
import { Check, ChevronRight, FileText, LockKeyhole, MapPin, MessageSquareText, Send } from 'lucide-react';
import { REPORT_CATEGORIES } from '../utils.js';
import { Field, Modal } from './ui.jsx';

export default function ReportModal({ reportSuccess, reportTarget, reportForm, setReportForm, wards, center, demoMode, reportBusy, onSubmit, onClose, onTrack, onUseLocation }) {
  const patch = (changes) => setReportForm({ ...reportForm, ...changes });
  const linkedWard = reportTarget?.ward || '';
  return <Modal title={reportSuccess ? 'Report submitted' : 'Report a public-work issue'} onClose={onClose}>
    {reportSuccess ? <div className="success-pane"><div className="success-round"><Check size={27} /></div><h3>Your report is in the register</h3><p>Keep this ticket code to check the status later. {demoMode ? 'In demo mode this report only exists in this browser.' : 'Officers for the ward you chose can now see it.'}</p><div className="ticket-code">{reportSuccess}<button onClick={() => { try { navigator.clipboard?.writeText(reportSuccess)?.catch?.(() => {}); } catch { /* clipboard unavailable */ } }} title="Copy ticket" aria-label="Copy ticket code"><FileText size={15} /></button></div><button className="primary-btn full-btn" onClick={onTrack}>Track this report <ChevronRight size={16} /></button></div> : <form className="stack-form" onSubmit={onSubmit}>
      <div className="form-intro"><span className="form-icon"><MessageSquareText size={19} /></span><p>Reports help the ward officer identify hazards and follow up. Don’t include sensitive personal information.</p></div>
      {reportTarget && <div className="attached-project"><MapPin size={15} /><span>Linked to <strong>{reportTarget.title}</strong></span></div>}
      <Field label="Issue title" required><input required maxLength="100" value={reportForm.title} onChange={e => patch({ title: e.target.value })} placeholder="e.g. Open drain without barricade" /></Field>
      <Field label="Issue category" required><select value={reportForm.category} onChange={e => patch({ category: e.target.value })}>{REPORT_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Ward / locality" required>
        {linkedWard
          ? <><input value={linkedWard} disabled readOnly /><small className="field-help">Taken from the linked public-work record.</small></>
          : <><select required value={reportForm.ward} onChange={e => patch({ ward: e.target.value })}><option value="" disabled>{wards.length ? 'Select the ward' : 'No wards available yet'}</option>{wards.map(w => <option key={w} value={w}>{w}</option>)}</select><small className="field-help">{wards.length ? 'Choose from the wards that have published works so your report reaches the right officer.' : 'No ward has published works yet, so reports cannot be routed. Please try again later.'}</small></>}
      </Field>
      <Field label="What happened?" required><textarea required rows="4" maxLength="1500" value={reportForm.description} onChange={e => patch({ description: e.target.value })} placeholder="Describe the issue and a nearby landmark…" /></Field>
      <div className="location-auto-row"><MapPin size={15} /><div><strong>Report location</strong><span>{reportTarget ? `${Number(reportTarget.latitude).toFixed(5)}, ${Number(reportTarget.longitude).toFixed(5)} · linked project` : `${center[0].toFixed(5)}, ${center[1].toFixed(5)} · current map centre`}</span></div><button type="button" className="small-link" onClick={onUseLocation}>Use my location</button></div>
      <Field label="Photo evidence (optional)"><input key={reportForm.attachment ? `${reportForm.attachment.name}-${reportForm.attachment.size}` : 'empty-photo'} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => patch({ attachment: e.target.files?.[0] || null })} />{reportForm.attachment && <div className="file-picked"><small className="field-help">Selected: {reportForm.attachment.name} · {(reportForm.attachment.size / 1024).toFixed(0)} KB</small><button type="button" className="small-link" onClick={() => patch({ attachment: null })}>Remove photo</button></div>}<small className="field-help">One JPG, PNG or WebP image, up to 2 MB. Avoid photos showing faces or personal documents.</small></Field>
      <Field label="Contact (optional)"><input value={reportForm.contact} onChange={e => patch({ contact: e.target.value })} placeholder="Email or phone, only if follow-up is needed" /></Field>
      <p className="privacy-small"><LockKeyhole size={13} /> {demoMode ? 'Demo reports stay in local browser storage.' : 'Contact details are visible only to authorized officers.'}</p>
      <button className="primary-btn full-btn" disabled={reportBusy || (!linkedWard && wards.length === 0)}>{reportBusy ? 'Submitting…' : 'Submit report'} <Send size={16} /></button>
    </form>}
  </Modal>;
}
