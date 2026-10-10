import React from 'react';
import { ChevronRight, Info, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import { Field, Modal } from './ui.jsx';

export default function LoginModal({ demoMode, email, setEmail, password, setPassword, loginBusy, onSubmit, onEnterDemo, onClose }) {
  return <Modal title="Officer sign in" onClose={onClose}>
    {demoMode ? <div className="demo-login"><div className="demo-login-icon"><ShieldCheck size={26} /></div><h3>Explore the officer dashboard</h3><p>This preview uses local browser storage so you can test the workflow without a backend. It is not secure authentication and must not be used for real government records.</p><button className="primary-btn full-btn" onClick={onEnterDemo}>Enter demo officer mode <ChevronRight size={16} /></button><div className="security-note"><Info size={14} /> Real officer access will be enforced by Supabase authentication and database permissions after setup.</div></div> : <form className="stack-form" onSubmit={onSubmit}>
      <div className="form-intro"><span className="form-icon"><LockKeyhole size={19} /></span><p>Use the account created for your ward. Public visitors cannot create officer accounts.</p></div>
      <Field label="Official email" required><input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="officer@department.gov.in" /></Field>
      <Field label="Password" required><input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" /></Field>
      <button className="primary-btn full-btn" disabled={loginBusy}>{loginBusy ? 'Signing in…' : 'Sign in securely'} <LogIn size={16} /></button>
      <p className="privacy-small">If your account has no officer role assigned, you can sign in but will not be able to edit projects.</p>
    </form>}
  </Modal>;
}
