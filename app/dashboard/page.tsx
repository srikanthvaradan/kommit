"use client";
import { useEffect, useState } from "react";

interface User { id: number; email: string; }
interface Commitment {
  id: number;
  commitment_text: string;
  avoided_truth: string;
  stake_amount: number;
  forfeit_destination: string;
  checkin_due: string;
  followed_through: boolean;
  created_at: string;
}

const CARD: React.CSSProperties = { border: '1px solid #e4e4e4', borderRadius: '8px', padding: '20px 24px', marginBottom: '12px', background: '#fff' };
const LABEL: React.CSSProperties = { fontSize: '11px', fontWeight: 500, letterSpacing: '2px', color: '#9a9a9a', textTransform: 'uppercase', margin: '0 0 6px 0' };

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      setUser(d.user); setLoading(false);
      if (d.user) loadCommitments(); else setShowLogin(true);
    });
  }, []);

  async function loadCommitments() {
    const res = await fetch("/api/commitments/list");
    if (res.ok) { const data = await res.json(); setCommitments(data.commitments || []); }
  }

  async function sendOtp() {
    setSending(true); setAuthError(null);
    try {
      const res = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await res.json();
      if (res.ok) setOtpSent(true); else setAuthError(d.error || "Failed to send code");
    } catch { setAuthError("Something went wrong"); }
    setSending(false);
  }

  async function verifyOtp() {
    setVerifying(true); setAuthError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const d = await res.json();
      if (res.ok) window.location.reload(); else setAuthError(d.error || "Invalid code");
    } catch { setAuthError("Something went wrong"); }
    setVerifying(false);
  }

  async function handleCheckin(id: number) {
    const res = await fetch("/api/commitments/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) loadCommitments();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const now = new Date();
  const totalStaked = commitments.reduce((s, c) => s + c.stake_amount, 0);
  const returned = commitments.filter(c => c.followed_through).reduce((s, c) => s + c.stake_amount, 0);
  const sentToStranger = commitments.filter(c => !c.followed_through && c.checkin_due && new Date(c.checkin_due) < now).reduce((s, c) => s + c.stake_amount, 0);
  const totalMade = commitments.length;
  const followedCount = commitments.filter(c => c.followed_through).length;
  const followRate = totalMade > 0 ? Math.round((followedCount / totalMade) * 100) : 0;
  const sorted = [...commitments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  let streak = 0;
  for (const c of sorted) { if (c.followed_through) streak++; else break; }

  const active = commitments.filter(c => !c.followed_through && (!c.checkin_due || new Date(c.checkin_due) >= now));
  const overdue = commitments.filter(c => !c.followed_through && c.checkin_due && new Date(c.checkin_due) < now);
  const history = commitments.filter(c => c.followed_through);
  const thisWeek = history.filter(c => (now.getTime() - new Date(c.created_at).getTime()) < 7 * 86400000);
  const thisMonth = history.filter(c => { const d = now.getTime() - new Date(c.created_at).getTime(); return d >= 7 * 86400000 && d < 30 * 86400000; });
  const older = history.filter(c => (now.getTime() - new Date(c.created_at).getTime()) >= 30 * 86400000);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const renderHistoryGroup = (label: string, items: Commitment[]) => items.length === 0 ? null : (
    <div key={label} style={{ marginBottom: '24px' }}>
      <p style={{ fontSize: '11px', color: '#c0beb6', letterSpacing: '1px', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>{label}</p>
      {items.map(c => (
        <div key={c.id} style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: 1.7, margin: 0, flex: 1, paddingRight: '16px' }}>{c.commitment_text}</p>
            <span style={{ fontSize: '11px', fontWeight: 500, background: '#1a1a1a', color: '#fff', padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap' as const }}>FOLLOWED THROUGH</span>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <p style={{ color: '#9a9a9a', fontSize: '14px' }}>Loading…</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#1a1a1a' }}>

      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', maxWidth: '400px', width: '100%' }}>
            <a href="/" style={{ display: 'block', marginBottom: '24px' }}>
              <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height: '40px', width: '40px' }} />
            </a>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>Sign in</h2>
            <p style={{ fontSize: '14px', color: '#9a9a9a', marginBottom: '28px' }}>{"We'll send a 6-digit code to your email."}</p>
            {!otpSent ? (
              <>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendOtp(); }} placeholder="your@email.com"
                  style={{ width: '100%', padding: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1px solid #e4e4e4', borderRadius: '6px', color: '#1a1a1a', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }} />
                <button onClick={sendOtp} disabled={sending || !email.includes('@')}
                  style={{ width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending || !email.includes('@') ? 0.5 : 1 }}>
                  {sending ? 'Sending…' : 'Send code'}
                </button>
                <p style={{ fontSize: '12px', color: '#9a9a9a', textAlign: 'center', marginTop: '12px' }}>No password. No account setup.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#9a9a9a', marginBottom: '16px' }}>Code sent to <strong>{email}</strong></p>
                <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => { if (e.key === 'Enter' && code.length === 6) verifyOtp(); }} placeholder="000000" maxLength={6}
                  style={{ width: '100%', padding: '16px', fontSize: '24px', fontFamily: 'Inter, sans-serif', border: '1px solid #e4e4e4', borderRadius: '6px', color: '#1a1a1a', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px', letterSpacing: '12px', textAlign: 'center' as const }} />
                <button onClick={verifyOtp} disabled={verifying || code.length !== 6}
                  style={{ width: '100%', padding: '14px', backgroundColor: '#ffde59', color: '#1a1a1a', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: verifying || code.length !== 6 ? 'not-allowed' : 'pointer', opacity: verifying || code.length !== 6 ? 0.5 : 1 }}>
                  {verifying ? 'Verifying…' : 'Verify'}
                </button>
                <button onClick={() => { setOtpSent(false); setCode(''); setAuthError(null); }}
                  style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#9a9a9a', border: 'none', fontSize: '13px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', marginTop: '4px' }}>
                  Use a different email
                </button>
              </>
            )}
            {authError && <p style={{ color: '#c0392b', fontSize: '13px', marginTop: '12px' }}>{authError}</p>}
          </div>
        </div>
      )}

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '64px', background: '#fff', borderBottom: '1px solid #e4e4e4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', zIndex: 100 }}>
        <a href="/" onClick={() => sessionStorage.clear()} style={{ cursor: 'pointer' }}>
          <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height: '44px', width: '44px' }} />
        </a>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <a href="/" style={{ fontSize: '13px', color: '#9a9a9a', textDecoration: 'none' }}>+ New session</a>
            <button onClick={handleLogout} style={{ fontSize: '13px', color: '#9a9a9a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Logout</button>
          </div>
        )}
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '88px 24px 48px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', marginBottom: '32px' }}>Your commitments</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
          {[
            { label: 'TOTAL STAKED', value: fmt(totalStaked) },
            { label: 'RETURNED', value: fmt(returned) },
            { label: 'SENT TO STRANGER', value: fmt(sentToStranger) },
            { label: 'RECEIVED FROM STRANGER', value: '$0.00' },
          ].map(s => (
            <div key={s.label} style={{ border: '1px solid #e4e4e4', borderRadius: '8px', padding: '16px 20px', background: '#fff' }}>
              <p style={LABEL}>{s.label}</p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '40px' }}>
          {[
            { label: 'COMMITMENTS MADE', value: String(totalMade) },
            { label: 'FOLLOW-THROUGH RATE', value: `${followRate}%` },
            { label: 'CURRENT STREAK', value: String(streak) },
          ].map(s => (
            <div key={s.label} style={{ border: '1px solid #e4e4e4', borderRadius: '8px', padding: '16px 20px', background: '#fff' }}>
              <p style={LABEL}>{s.label}</p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {active.length > 0 && (
          <>
            <p style={{ ...LABEL, marginBottom: '12px' }}>ACTIVE</p>
            {active.map(c => (
              <div key={c.id} style={{ ...CARD, borderColor: '#1a1a1a' }}>
                {c.avoided_truth && <div style={{ marginBottom: '12px' }}><p style={LABEL}>The truth you faced</p><p style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: 1.7, margin: 0 }}>{c.avoided_truth}</p></div>}
                <div style={{ marginBottom: '16px' }}><p style={LABEL}>Your commitment</p><p style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: 1.7, margin: 0 }}>{c.commitment_text}</p></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div><p style={LABEL}>Stake</p><p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{fmt(c.stake_amount)}</p></div>
                    <div><p style={LABEL}>Due</p><p style={{ fontSize: '14px', color: '#1a1a1a', margin: 0 }}>{fmtDate(c.checkin_due)}</p></div>
                  </div>
                  <button onClick={() => handleCheckin(c.id)} style={{ padding: '10px 20px', backgroundColor: '#ffde59', color: '#1a1a1a', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                    I followed through
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {overdue.length > 0 && (
          <>
            <p style={{ ...LABEL, marginBottom: '12px', marginTop: '32px', color: '#c0392b' }}>OVERDUE</p>
            {overdue.map(c => (
              <div key={c.id} style={{ ...CARD, borderColor: '#e8c0b0' }}>
                <div style={{ marginBottom: '12px' }}><p style={LABEL}>Your commitment</p><p style={{ fontSize: '14px', color: '#9a9a9a', lineHeight: 1.7, margin: 0 }}>{c.commitment_text}</p></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div><p style={LABEL}>Stake</p><p style={{ fontSize: '14px', fontWeight: 600, color: '#c0392b', margin: 0 }}>{fmt(c.stake_amount)}</p></div>
                    <div><p style={LABEL}>Was due</p><p style={{ fontSize: '14px', color: '#9a9a9a', margin: 0 }}>{fmtDate(c.checkin_due)}</p></div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#c0392b', border: '1px solid #c0392b', padding: '4px 10px', borderRadius: '999px' }}>FAILED TO KOMMIT</span>
                </div>
              </div>
            ))}
          </>
        )}

        {history.length > 0 && (
          <>
            <p style={{ ...LABEL, marginBottom: '16px', marginTop: '32px' }}>HISTORY</p>
            {renderHistoryGroup('This week', thisWeek)}
            {renderHistoryGroup('This month', thisMonth)}
            {renderHistoryGroup('Older', older)}
          </>
        )}

        {commitments.length === 0 && user && (
          <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px solid #e4e4e4', borderRadius: '8px' }}>
            <p style={{ fontSize: '14px', color: '#9a9a9a', marginBottom: '16px' }}>No commitments yet.</p>
            <a href="/" style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 500, textDecoration: 'none' }}>Start with what&apos;s weighing on you →</a>
          </div>
        )}

        <div style={{ borderTop: '1px solid #e4e4e4', marginTop: '48px', paddingTop: '20px', textAlign: 'center' as const }}>
          <a href="mailto:hello@kommit.ai" style={{ fontSize: '12px', color: '#c0beb6', textDecoration: 'none' }}>hello@kommit.ai</a>
        </div>
      </div>
    </div>
  );
}
