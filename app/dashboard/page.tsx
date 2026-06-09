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

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setLoading(false);
        if (d.user) loadCommitments();
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
    if (res.ok) {
      setOtpSent(true);
    } else {
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
    if (res.ok) {
      window.location.reload();
    } else {
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

  const cardStyle = {
    border: "1px solid #e4e4e4",
    borderRadius: "8px",
    padding: "20px 24px",
    marginBottom: "12px",
    background: "#fff",
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "2px",
    color: "#9a9a9a",
    textTransform: "uppercase" as const,
    margin: "0 0 8px 0",
  };

  const valueStyle = {
    fontSize: "14px",
    color: "#1a1a1a",
    lineHeight: 1.7,
    margin: 0,
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        <p style={{ color: "#9a9a9a", fontSize: "14px" }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "Inter, sans-serif", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "400px", width: "100%" }}>
          <div style={{ marginBottom: "32px" }}>
            <a href="/" onClick={() => { sessionStorage.clear(); }} style={{ cursor: "pointer" }}>
              <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height: "44px", width: "44px" }} />
            </a>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>Your commitments</h1>
          <p style={{ fontSize: "14px", color: "#9a9a9a", marginBottom: "32px" }}>Sign in to see your commitments and reckonings.</p>

          {!otpSent ? (
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendOtp(); }}
                placeholder="Your email address"
                style={{ width: "100%", padding: "12px", fontSize: "14px", fontFamily: "Inter, sans-serif", border: "1px solid #e4e4e4", borderRadius: "6px", backgroundColor: "#fff", color: "#1a1a1a", outline: "none", boxSizing: "border-box" as const, marginBottom: "12px" }}
              />
              <button
                onClick={sendOtp}
                disabled={sending || !email}
                style={{ width: "100%", padding: "14px", backgroundColor: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}
              >
                {sending ? "Sending…" : "Send code"}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "13px", color: "#9a9a9a", marginBottom: "16px" }}>Code sent to {email}. Check your inbox.</p>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") verifyOtp(); }}
                placeholder="6-digit code"
                maxLength={6}
                style={{ width: "100%", padding: "12px", fontSize: "14px", fontFamily: "Inter, sans-serif", border: "1px solid #e4e4e4", borderRadius: "6px", backgroundColor: "#fff", color: "#1a1a1a", outline: "none", boxSizing: "border-box" as const, marginBottom: "12px", letterSpacing: "4px" }}
              />
              <button
                onClick={verifyOtp}
                disabled={verifying || code.length !== 6}
                style={{ width: "100%", padding: "14px", backgroundColor: "#ffde59", color: "#1a1a1a", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: verifying ? "not-allowed" : "pointer", opacity: verifying ? 0.7 : 1 }}
              >
                {verifying ? "Verifying…" : "Verify"}
              </button>
              <button
                onClick={() => { setOtpSent(false); setCode(""); }}
                style={{ width: "100%", padding: "14px", backgroundColor: "transparent", color: "#9a9a9a", border: "none", fontSize: "13px", fontFamily: "Inter, sans-serif", cursor: "pointer", marginTop: "8px" }}
              >
                Use a different email
              </button>
            </div>
          )}
          {authError && <p style={{ color: "#c0392b", fontSize: "13px", marginTop: "12px" }}>{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#1a1a1a" }}>
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, height: "64px", background: "#fff", borderBottom: "1px solid #e4e4e4", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", zIndex: 100 }}>
        <a href="/" onClick={() => { sessionStorage.clear(); document.cookie.split(";").forEach(c => { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); }); }} style={{ cursor: "pointer" }}>
          <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height: "44px", width: "44px" }} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "#9a9a9a" }}>{user.email}</span>
          <button onClick={handleLogout} style={{ fontSize: "13px", color: "#9a9a9a", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "88px 24px 48px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1a1a1a", marginBottom: "32px" }}>Your commitments</h1>

        {commitments.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontSize: "14px", color: "#9a9a9a", marginBottom: "16px" }}>No commitments yet.</p>
            <a href="/" style={{ fontSize: "14px", color: "#1a1a1a", fontWeight: 500 }}>Start with what&apos;s weighing on you →</a>
          </div>
        ) : (
          commitments.map((c) => {
            const isOverdue = !c.followed_through && new Date(c.checkin_due) < new Date();
            const isActive = !c.followed_through && !isOverdue;
            const stake = (c.stake_amount / 100).toFixed(2);
            const due = c.checkin_due ? new Date(c.checkin_due).toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "";

            return (
              <div key={c.id} style={{ ...cardStyle, borderColor: isOverdue ? "#e4e4e4" : isActive ? "#1a1a1a" : "#e4e4e4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <p style={labelStyle}>Commitment</p>
                  {c.followed_through && (
                    <span style={{ fontSize: "11px", fontWeight: 500, background: "#1a1a1a", color: "#fff", padding: "3px 10px", borderRadius: "999px", letterSpacing: "1px" }}>FOLLOWED THROUGH</span>
                  )}
                  {isActive && (
                    <span style={{ fontSize: "11px", fontWeight: 500, background: "#ffde59", color: "#1a1a1a", padding: "3px 10px", borderRadius: "999px", letterSpacing: "1px" }}>ACTIVE</span>
                  )}
                  {isOverdue && (
                    <span style={{ fontSize: "11px", fontWeight: 500, background: "#fff", color: "#c0392b", border: "1px solid #c0392b", padding: "3px 10px", borderRadius: "999px", letterSpacing: "1px" }}>OVERDUE</span>
                  )}
                </div>

                {c.avoided_truth && (
                  <div style={{ marginBottom: "12px" }}>
                    <p style={labelStyle}>The truth you faced</p>
                    <p style={valueStyle}>{c.avoided_truth}</p>
                  </div>
                )}

                <div style={{ marginBottom: "12px" }}>
                  <p style={labelStyle}>Your commitment</p>
                  <p style={valueStyle}>{c.commitment_text}</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: isActive ? "16px" : "0" }}>
                  <div>
                    <p style={labelStyle}>Stake</p>
                    <p style={valueStyle}>${stake}</p>
                  </div>
                  <div>
                    <p style={labelStyle}>Due</p>
                    <p style={valueStyle}>{due}</p>
                  </div>
                </div>

                {isActive && (
                  <button
                    onClick={() => handleCheckin(c.id)}
                    style={{ width: "100%", padding: "12px", backgroundColor: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: "pointer", marginTop: "4px" }}
                  >
                    I followed through
                  </button>
                )}

                {isOverdue && (
                  <div style={{ marginTop: "12px", padding: "12px", background: "#fafafa", borderRadius: "6px" }}>
                    <p style={{ fontSize: "13px", color: "#9a9a9a", margin: 0 }}>Your stake went to a random KOMMIT member. Failed to KOMMIT.</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
