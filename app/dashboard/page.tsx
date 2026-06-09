'use client';

import { useState, useEffect } from 'react';

interface User {
  email: string;
}

interface Commitment {
  id: string;
  truth: string;
  commitment_text: string;
  stake_amount: number;
  due_date: string;
  status: 'active' | 'followed_through' | 'overdue';
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Login modal state
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard state
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loadingCommitments, setLoadingCommitments] = useState(false);
  const [followingThrough, setFollowingThrough] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        }
        setAuthChecked(true);
      })
      .catch(() => {
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    if (user) {
      setLoadingCommitments(true);
      fetch('/api/commitments/list')
        .then((res) => res.json())
        .then((data) => {
          setCommitments(Array.isArray(data) ? data : (data.commitments ?? []));
        })
        .catch(() => {
          setCommitments([]);
        })
        .finally(() => {
          setLoadingCommitments(false);
        });
    }
  }, [user]);

  async function handleSendCode() {
    if (!email.trim()) return;
    setSendingCode(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to send code.');
      }
      setCodeSent(true);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Failed to send code.');
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerify() {
    if (!code.trim()) return;
    setVerifying(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Invalid code.');
      }
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        // Reload to re-check auth
        window.location.reload();
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  async function handleFollowThrough(id: string) {
    setFollowingThrough(id);
    try {
      await fetch(`/api/commitments/${id}/follow-through`, { method: 'POST' });
      setCommitments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'followed_through' } : c))
      );
    } catch {
      // silently fail
    } finally {
      setFollowingThrough(null);
    }
  }

  function formatStake(amount: number): string {
    return '$' + (amount / 100).toFixed(2);
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          color: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            border: '1px solid #e4e4e4',
            borderRadius: '8px',
            padding: '32px',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height: '44px', width: '44px', marginBottom: '16px' }} />
            <p style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px', color: '#1a1a1a' }}>
              Sign in to Kommit
            </p>
            <p style={{ fontSize: '14px', color: '#8a8a8a', margin: 0 }}>
              Enter your email to continue
            </p>
          </div>

          {!codeSent ? (
            <>
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendCode(); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid #e4e4e4',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                    color: '#1a1a1a',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleSendCode}
                disabled={sendingCode || !email.trim()}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  cursor: sendingCode || !email.trim() ? 'not-allowed' : 'pointer',
                  opacity: sendingCode || !email.trim() ? 0.6 : 1,
                }}
              >
                {sendingCode ? 'Sending…' : 'Send code'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: '#8a8a8a', margin: '0 0 12px' }}>
                Code sent to <strong style={{ color: '#1a1a1a' }}>{email}</strong>
              </p>
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
                  placeholder="6-digit code"
                  maxLength={6}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid #e4e4e4',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                    color: '#1a1a1a',
                    outline: 'none',
                    letterSpacing: '4px',
                    textAlign: 'center',
                  }}
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={verifying || code.length < 6}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  cursor: verifying || code.length < 6 ? 'not-allowed' : 'pointer',
                  opacity: verifying || code.length < 6 ? 0.6 : 1,
                }}
              >
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
              <button
                onClick={() => { setCodeSent(false); setCode(''); setLoginError(null); }}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'transparent',
                  color: '#8a8a8a',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Use a different email
              </button>
            </>
          )}

          {loginError && (
            <p style={{ fontSize: '13px', color: '#c0392b', margin: '12px 0 0', textAlign: 'center' }}>
              {loginError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Dashboard view
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        color: '#1a1a1a',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          padding: '0 40px',
          borderBottom: '1px solid #e4e4e4',
          backgroundColor: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <a
          href="/"
          onClick={() => {
            sessionStorage.clear();
          }}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height: '44px', width: '44px' }} />
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#8a8a8a' }}>{user.email}</span>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: '1px solid #e4e4e4',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              color: '#1a1a1a',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Page content */}
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '48px 16px',
        }}
      >
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 32px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Your commitments
        </h1>

        {loadingCommitments ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '40px 0' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#e4e4e4',
                  animation: 'dot-pulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
            <style>{`
              @keyframes dot-pulse {
                0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                40% { transform: scale(1); opacity: 1; }
              }
            `}</style>
          </div>
        ) : commitments.length === 0 ? (
          <div
            style={{
              border: '1px solid #e4e4e4',
              borderRadius: '8px',
              padding: '40px 24px',
              textAlign: 'center',
              color: '#8a8a8a',
            }}
          >
            <p style={{ margin: '0 0 12px', fontSize: '14px' }}>
              No commitments yet. Start with what&apos;s weighing on you.
            </p>
            <a
              href="/"
              style={{
                fontSize: '14px',
                color: '#1a1a1a',
                fontWeight: 500,
                textDecoration: 'underline',
              }}
            >
              Go to home
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {commitments.map((c) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                onFollowThrough={handleFollowThrough}
                followingThrough={followingThrough}
                formatStake={formatStake}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommitmentCard({
  commitment,
  onFollowThrough,
  followingThrough,
  formatStake,
  formatDate,
}: {
  commitment: Commitment;
  onFollowThrough: (id: string) => void;
  followingThrough: string | null;
  formatStake: (amount: number) => string;
  formatDate: (dateStr: string) => string;
}) {
  const { id, truth, commitment_text, stake_amount, due_date, status } = commitment;

  const isActive = status === 'active';
  const isFollowedThrough = status === 'followed_through';
  const isOverdue = status === 'overdue';

  const cardBorderStyle: React.CSSProperties = isOverdue
    ? { border: '1px solid #c0392b' }
    : { border: '1px solid #e4e4e4' };

  return (
    <div
      style={{
        ...cardBorderStyle,
        borderRadius: '8px',
        padding: '20px 24px',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Status badge */}
      <div style={{ marginBottom: '16px' }}>
        {isActive && (
          <span
            style={{
              display: 'inline-block',
              backgroundColor: '#ffde59',
              color: '#1a1a1a',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '1px',
              borderRadius: '4px',
              padding: '3px 8px',
              textTransform: 'uppercase',
            }}
          >
            Active
          </span>
        )}
        {isFollowedThrough && (
          <span
            style={{
              display: 'inline-block',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '1px',
              borderRadius: '4px',
              padding: '3px 8px',
              textTransform: 'uppercase',
            }}
          >
            Followed Through
          </span>
        )}
        {isOverdue && (
          <span
            style={{
              display: 'inline-block',
              backgroundColor: '#ffffff',
              color: '#c0392b',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '1px',
              borderRadius: '4px',
              padding: '3px 8px',
              textTransform: 'uppercase',
              border: '1px solid #c0392b',
            }}
          >
            Overdue
          </span>
        )}
      </div>

      {/* THE TRUTH */}
      <div style={{ marginBottom: '12px' }}>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#9a9a9a',
            margin: '0 0 4px',
          }}
        >
          The Truth
        </p>
        <p style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: 1.6, margin: 0 }}>
          {truth}
        </p>
      </div>

      {/* YOUR COMMITMENT */}
      <div style={{ marginBottom: '12px' }}>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#9a9a9a',
            margin: '0 0 4px',
          }}
        >
          Your Commitment
        </p>
        <p style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: 1.6, margin: 0 }}>
          {commitment_text}
        </p>
      </div>

      {/* STAKE + DUE DATE row */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: isActive ? '16px' : '0' }}>
        <div>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: '#9a9a9a',
              margin: '0 0 4px',
            }}
          >
            Stake
          </p>
          <p style={{ fontSize: '14px', color: '#1a1a1a', margin: 0, fontWeight: 500 }}>
            {formatStake(stake_amount)}
          </p>
        </div>
        <div>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: '#9a9a9a',
              margin: '0 0 4px',
            }}
          >
            Due Date
          </p>
          <p style={{ fontSize: '14px', color: '#1a1a1a', margin: 0 }}>
            {formatDate(due_date)}
          </p>
        </div>
      </div>

      {/* Follow through button */}
      {isActive && (
        <button
          onClick={() => onFollowThrough(id)}
          disabled={followingThrough === id}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            cursor: followingThrough === id ? 'not-allowed' : 'pointer',
            opacity: followingThrough === id ? 0.6 : 1,
          }}
        >
          {followingThrough === id ? 'Updating…' : 'I followed through'}
        </button>
      )}
    </div>
  );
}