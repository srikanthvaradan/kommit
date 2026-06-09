"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function sendOtp() {
    setSending(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (res.ok) setOtpSent(true);
      else setAuthError(d.error || "Failed to send code");
    } catch {
      setAuthError("Something went wrong");
    }
    setSending(false);
  }

  async function verifyOtp() {
    setVerifying(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const d = await res.json();
      if (res.ok) window.location.href = "/dashboard";
      else setAuthError(d.error || "Invalid code");
    } catch {
      setAuthError("Something went wrong");
    }
    setVerifying(false);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "Inter, sans-serif", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "400px", width: "100%" }}>
        <a href="/" style={{ cursor: "pointer", display: "block", marginBottom: "32px" }}>
          <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height: "44px", width: "44px" }} />
        </a>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>Sign in</h1>
        <p style={{ fontSize: "14px", color: "#9a9a9a", marginBottom: "32px" }}>{"We'll send a 6-digit code to your email. No password."}</p>
        {!otpSent ? (
          <>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendOtp(); }} placeholder="your@email.com"
              style={{ width: "100%", padding: "12px", fontSize: "14px", fontFamily: "Inter, sans-serif", border: "1px solid #e4e4e4", borderRadius: "6px", color: "#1a1a1a", backgroundColor: "#fff", outline: "none", boxSizing: "border-box" as const, marginBottom: "12px" }} />
            <button onClick={sendOtp} disabled={sending || !email.includes("@")}
              style={{ width: "100%", padding: "14px", backgroundColor: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: sending ? "not-allowed" : "pointer", opacity: sending || !email.includes("@") ? 0.5 : 1 }}>
              {sending ? "Sending…" : "Send code"}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: "13px", color: "#9a9a9a", marginBottom: "16px" }}>Code sent to <strong>{email}</strong>. Check your inbox.</p>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) verifyOtp(); }} placeholder="000000" maxLength={6}
              style={{ width: "100%", padding: "16px", fontSize: "24px", fontFamily: "Inter, sans-serif", border: "1px solid #e4e4e4", borderRadius: "6px", color: "#1a1a1a", backgroundColor: "#fff", outline: "none", boxSizing: "border-box" as const, marginBottom: "12px", letterSpacing: "12px", textAlign: "center" as const }} />
            <button onClick={verifyOtp} disabled={verifying || code.length !== 6}
              style={{ width: "100%", padding: "14px", backgroundColor: "#ffde59", color: "#1a1a1a", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 600, fontFamily: "Inter, sans-serif", cursor: verifying || code.length !== 6 ? "not-allowed" : "pointer", opacity: verifying || code.length !== 6 ? 0.5 : 1 }}>
              {verifying ? "Verifying…" : "Verify"}
            </button>
            <button onClick={() => { setOtpSent(false); setCode(""); setAuthError(null); }}
              style={{ width: "100%", padding: "12px", backgroundColor: "transparent", color: "#9a9a9a", border: "none", fontSize: "13px", fontFamily: "Inter, sans-serif", cursor: "pointer", marginTop: "4px" }}>
              Use a different email
            </button>
          </>
        )}
        {authError && <p style={{ color: "#c0392b", fontSize: "13px", marginTop: "12px" }}>{authError}</p>}
      </div>
    </div>
  );
}
