"use client";

import { useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
}

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
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setLoading(false);
        if (d.user) loadCommitments();
        else setShowLogin(true);
      });
  }, []);

  async function loadCommitments() {
    const res = await fetch("/api/commitments/list");
    if (res.ok) {
      const data = await res.json();
      setCommitments(data.commitments || []);
    }
  }

  async function sendOtp() {
    setSending(true);
    setAuthError(null);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) setOtpSent(true);
    else {
      const d = await res.json();
      setAuthError(d.error || "Failed to send code");
    }
    setSending(false);
  }

  async function verifyOtp() {
    setVerifying(true);
    setAuthError(null);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (res.ok) window.location.reload();
    else {
      const d = await res.json();
      setAuthError(d.error || "Invalid code");
    }
    setVerifying(false);
  }

  async function handleCheckin(id: number) {
    const res = await fetch("/api/commitments/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) loadCommitments();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  // Stats
  const totalStaked = commitments.reduce((s, c) => s + c.stake_amount, 0);
  const returned = commitments.filter(c => c.followed_through).reduce((s, c) => s + c.stake_amount, 0);
  const sentToStranger = commitments.filter(c => !c.followed_through && new Date(c.checkin_due) < new Date()).reduce((s, c) => s + c.stake_amount, 0);
  const totalMade = commitments.length;
  const followedThrough = commitments.filter(c => c.followed_through).length;
  const followThroughRate = totalMade > 0 ? Math.round((followedThrough / totalMade) * 100) : 0;

  // Streak
  const sorted = [...commitments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  let streak = 0;
  for (const c of sorted) {
    if (c.followed_through) streak++;
    else break;
  }

  const active = commitments.filter(c => !c.followed_through && new Date(c.checkin_due) >= new Date());
  const overdue = commitments.filter(c => !c.followed_through && new Date(c.checkin_due) < new Date());
  const history = commitments.filter(c => c.followed_through);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "";

  const labelStyle = { fontSize: "11px", fontWeight: 500, letterSpacing: "2px", color: "#9a9a9a", textTransform: "uppercase" as const, margin: "0 0 6px 0" };
  const cardStyle = { border: "1px solid #e4e4e4", borderRadius: "8px", padding: "20px 24px", marginBottom: "12px", background: "#fff" };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <p style={{ color: "#9a9a9a", fontSize: "14px" }}>Loading…</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#1a1a1a" }}>

      {/* Login Modal */}
      {showLogin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "24px" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "40px", maxWidth: "400px", width: "100%" }}>
            <a href="/" style={{ cursor: "pointer", display: "block", marginBottom: "24px" }}>
              <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height: "40px", width: "40px" }} />
            </a>
            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>Sign in</h2>
            <p style={{ fontSize: "14px", color: "#9a9a9a", marginBottom: "28px" }}>{"We'll send a 6-digit code to your email."}</p>

            {!otpSent ? (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendOtp(); }}
                  placeholder="your@email.com"
                  style={{ width: "100%", padding: "12px", fontSize: "14px", fontFamily: "Inter, sans-serif", border: "1px solid #e4e4e4", borderRadius: "6px", color: "#1a1a1a", backgroundColor: "#fff", outline: "none", boxSizing: "border-box" as const, marginBottom: "12px" }}
                />
                <button onClick={sendOtp} disabled={sending || !email} style={{ width: "100%", padding: "14px", backgroundColor: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
                  {sending ? "Sending…" : "Send code"}
                </button>
                <p style={{ fontSize: "12px", color: "#9a9a9a", textAlign: "center", marginTop: "12px" }}>No password. No account setup.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: "13px", color: "#9a9a9a", marginBottom: "16px" }}>Code sent to {email}.</p>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") verifyOtp(); }}
                  placeholder="000000"
                  maxLength={6}
                  style={{ width: "100%", padding: "12px", fontSize: "20px", fontFamily: "Inter, sans-serif", border: "1px solid #e4e4e4", borderRadius: "6px", color: "#1a1a1a", backgroundColor: "#fff", outline: "none", boxSizing: "border-box" as const, marginBottom: "12px", letterSpacing: "8px", textAlign: "center" }}
                />
                <button onClick={verifyOtp} disabled={verifying || code.length !== 6} style={{ width: "100%", padding: "14px", backgroundColor: "#ffde59", color: "#1a1a1a", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: verifying ? "not-allowed" : "pointer", opacity: verifying ? 0.7 : 1 }}>
                  {verifying ? "Verifying…" : "Verify"}
                </button>
                <button onClick={() => { setOtpSent(false); setCode(""); }} style={{ width: "100%", padding: "12px", backgroundColor: "transparent", color: "#9a9a9a", border: "none", fontSize: "13px", fontFamily: "Inter, sans-serif", cursor: "pointer", marginTop: "4px" }}>
                  Use a different email
                </button>
              </>
            )}
            {authError && <p style={{ color: "#c0392b", fontSize: "13px", marginTop: "12px" }}>{authError}</p>}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, height: "64px", background: "#fff", borderBottom: "1px solid #e4e4e4", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", zIndex: 100 }}>
        <a href="/" onClick={() => { sessionStorage.clear(); }} style={{ cursor: "pointer" }}>
          <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height: "44px", width: "44px" }} />
        </a>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "13px", color: "#9a9a9a" }}>{user.email}</span>
            <button onClick={handleLogout} style={{ fontSize: "13px", color: "#9a9a9a", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Logout</button>
          </div>
        )}
      </nav>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "88px 24px 48px", filter: showLogin ? "blur(4px)" : "none", pointerEvents: showLogin ? "none" : "auto" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Your commitments</h1>
          <a href="/" style={{ padding: '10px 20px', backgroundColor: '#ffde59', color: '#1a1a1a', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', textDecoration: 'none', cursor: 'pointer' }}>+ New session</a>
        </div>

        {/* Stats Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "12px" }}>
          {[
            { label: "TOTAL STAKED", value: fmt(totalStaked) },
            { label: "RETURNED", value: fmt(returned) },
            { label: "SENT TO STRANGER", value: fmt(sentToStranger) },
            { label: "RECEIVED FROM STRANGER", value: "$0.00" },
          ].map((s) => (
            <div key={s.label} style={{ border: "1px solid #e4e4e4", borderRadius: "8px", padding: "16px 20px", background: "#fff" }}>
              <p style={labelStyle}>{s.label}</p>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Stats Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "40px" }}>
          {[
            { label: "COMMITMENTS MADE", value: String(totalMade) },
            { label: "FOLLOW-THROUGH RATE", value: `${followThroughRate}%` },
            { label: "CURRENT STREAK", value: `${streak}` },
          ].map((s) => (
            <div key={s.label} style={{ border: "1px solid #e4e4e4", borderRadius: "8px", padding: "16px 20px", background: "#fff" }}>
              <p style={labelStyle}>{s.label}</p>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Active */}
        {active.length > 0 && (
          <>
            <p style={{ ...labelStyle, marginBottom: "12px" }}>ACTIVE</p>
            {active.map((c) => (
              <div key={c.id} style={{ ...cardStyle, borderColor: "#1a1a1a" }}>
                {c.avoided_truth && <div style={{ marginBottom: "12px" }}><p style={labelStyle}>The truth you faced</p><p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.7, margin: 0 }}>{c.avoided_truth}</p></div>}
                <div style={{ marginBottom: "16px" }}><p style={labelStyle}>Your commitment</p><p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.7, margin: 0 }}>{c.commitment_text}</p></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "24px" }}>
                    <div><p style={labelStyle}>Stake</p><p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>{fmt(c.stake_amount)}</p></div>
                    <div><p style={labelStyle}>Due</p><p style={{ fontSize: "14px", color: "#1a1a1a", margin: 0 }}>{fmtDate(c.checkin_due)}</p></div>
                  </div>
                  <button onClick={() => handleCheckin(c.id)} style={{ padding: "10px 20px", backgroundColor: "#ffde59", color: "#1a1a1a", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: "pointer" }}>
                    I followed through
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Overdue */}
        {overdue.length > 0 && (
          <>
            <p style={{ ...labelStyle, marginBottom: "12px", marginTop: "32px", color: "#c0392b" }}>OVERDUE</p>
            {overdue.map((c) => (
              <div key={c.id} style={{ ...cardStyle, borderColor: "#c0392b" }}>
                <div style={{ marginBottom: "12px" }}><p style={labelStyle}>Your commitment</p><p style={{ fontSize: "14px", color: "#9a9a9a", lineHeight: 1.7, margin: 0 }}>{c.commitment_text}</p></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "24px" }}>
                    <div><p style={labelStyle}>Stake</p><p style={{ fontSize: "14px", fontWeight: 600, color: "#c0392b", margin: 0 }}>{fmt(c.stake_amount)}</p></div>
                    <div><p style={labelStyle}>Was due</p><p style={{ fontSize: "14px", color: "#9a9a9a", margin: 0 }}>{fmtDate(c.checkin_due)}</p></div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 500, color: "#c0392b", border: "1px solid #c0392b", padding: "4px 10px", borderRadius: "999px" }}>FAILED TO KOMMIT</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* History */}
        {history.length > 0 && (
          <>
            <p style={{ ...labelStyle, marginBottom: "12px", marginTop: "32px" }}>HISTORY</p>
            {history.map((c) => (
              <div key={c.id} style={{ ...cardStyle }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.7, margin: 0, flex: 1, paddingRight: "16px" }}>{c.commitment_text}</p>
                  <span style={{ fontSize: "11px", fontWeight: 500, background: "#1a1a1a", color: "#fff", padding: "4px 10px", borderRadius: "999px", whiteSpace: "nowrap" as const }}>FOLLOWED THROUGH</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Empty state */}
        {commitments.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            {user ? (
              <a href="/" style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: 500 }}>Start with what&apos;s weighing on you →</a>
            ) : (
              <p style={{ fontSize: "14px", color: "#e4e4e4" }}>Your commitments will appear here.</p>
            )}
          </div>
        )}
      </div>
      <div style={{ borderTop: '1px solid #e4e4e4', marginTop: '48px', padding: '24px 0', textAlign: 'center' }}>
          <a href="mailto:hello@kommit.ai" style={{ fontSize: '12px', color: '#9a9a9a', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>hello@kommit.ai</a>
        </div>
    </div>
  );
}
