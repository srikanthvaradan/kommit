'use client';
import { useState, useEffect, Suspense } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useSearchParams } from 'next/navigation';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ stakeAmount, forfeitDestination, searchParams, joinPool }: {
  stakeAmount: number;
  forfeitDestination: string;
  searchParams: ReturnType<typeof useSearchParams>;
  joinPool: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsLoading(true);
    setErrorMessage(null);

    sessionStorage.setItem('kommit_card', JSON.stringify({
      truth: searchParams.get('truth') || '',
      commitment: searchParams.get('commitment') || '',
      stakeAmount,
      forfeitDestination,
      joinPool,
      dueDate: new Date(Date.now() + 86400000).toISOString()
    }));

    const params = new URLSearchParams({
      truth: searchParams.get('truth') || '',
      commitment: searchParams.get('commitment') || '',
      stake: String(stakeAmount),
      forfeit: forfeitDestination,
      due: new Date(Date.now() + 86400000).toISOString(),
    });

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success?${params.toString()}`,
      },
    });

    if (error) setErrorMessage(error.message ?? 'An unexpected error occurred.');
    setIsLoading(false);
  };

  const formattedAmount = (stakeAmount / 100).toFixed(2);

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
      <PaymentElement />
      {errorMessage && <p style={{ color: 'red', marginTop: '12px' }}>{errorMessage}</p>}
      <button type="submit" disabled={!stripe || isLoading} style={{
        marginTop: '20px', width: '100%', padding: '14px',
        backgroundColor: '#ffde59', color: '#1a1a1a', border: 'none',
        borderRadius: '6px', fontSize: '14px', fontWeight: 600,
        fontFamily: 'Inter, sans-serif', cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.7 : 1,
      }}>
        {isLoading ? 'Processing…' : `Back this with $${formattedAmount}`}
      </button>
    </form>
  );
}

function CommitPageInner() {
  const searchParams = useSearchParams();
  const stakeParam = searchParams.get('stake');
  // Read truth/commitment from sessionStorage (not URL — keeps data off back button)
  const [truth, setTruth] = useState('');
  const [commitment, setCommitment] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSending, setLoginSending] = useState(false);
  const [loginVerifying, setLoginVerifying] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check for data
    const pending = sessionStorage.getItem('kommit_pending');
    if (!pending) {
      window.location.href = '/';
      return;
    }
    const { truth: t, commitment: c } = JSON.parse(pending);
    setTruth(t || '');
    setCommitment(c || '');
    sessionStorage.removeItem('kommit_pending');
    setDataLoaded(true);

    // Check auth
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setIsLoggedIn(true);
      else setShowLoginModal(true);
    });
  }, []);

  async function sendLoginOtp() {
    setLoginSending(true); setLoginError(null);
    try {
      const res = await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail }) });
      const d = await res.json();
      if (res.ok) setLoginOtpSent(true); else setLoginError(d.error || 'Failed to send code');
    } catch { setLoginError('Something went wrong'); }
    setLoginSending(false);
  }

  async function verifyLoginOtp() {
    setLoginVerifying(true); setLoginError(null);
    try {
      const res = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail, code: loginCode }) });
      const d = await res.json();
      if (res.ok) { setIsLoggedIn(true); setShowLoginModal(false); }
      else setLoginError(d.error || 'Invalid code');
    } catch { setLoginError('Something went wrong'); }
    setLoginVerifying(false);
  }
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(stakeParam ? parseInt(stakeParam, 10) : 500);
  const [joinPool, setJoinPool] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const forfeitDestination = 'KOMMIT pool member';

  useEffect(() => {
    if (!dataLoaded) return;
    const createCommitment = async () => {
      setApiError(null);
      try {
        const res = await fetch('/api/commitments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stakeAmount, forfeitDestination, commitmentText: commitment || 'Pending commitment' }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Failed to create commitment.');
        }
        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (err: unknown) {
        setApiError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    };
    createCommitment();
  }, [dataLoaded]);

  const formattedStake = (stakeAmount / 100).toFixed(2);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'Inter, sans-serif', fontSize: '14px', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '64px', background: '#fff', borderBottom: '1px solid #e4e4e4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', zIndex: 100 }}>
        <a href="/" onClick={() => { sessionStorage.clear(); document.cookie.split(';').forEach(c => { document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/'); }); }} style={{ cursor: 'pointer' }}>
          <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height: '44px', width: '44px' }} />
        </a>
        <a href="/dashboard" style={{ fontSize: '13px', color: '#8a8a8a', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>Dashboard</a>
      </nav>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '88px 16px 48px' }}>
        <div style={{ maxWidth: '560px', width: '100%' }}>
          {truth && (
            <div style={{ border: '1px solid #1a1a1a', borderRadius: '8px', padding: '20px 24px', marginBottom: '12px', backgroundColor: '#fafafa' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#9a9a9a', margin: '0 0 8px 0' }}>YOUR TRUTH</p>
              <p style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: 1.7, margin: 0 }}>{truth}</p>
            </div>
          )}
          {commitment && (
            <div style={{ border: '1px solid #e4e4e4', borderRadius: '8px', padding: '20px 24px', marginBottom: '12px', backgroundColor: '#ffffff' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#9a9a9a', margin: '0 0 8px 0' }}>YOUR COMMITMENT</p>
              <p style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: 1.7, margin: 0 }}>{commitment}</p>
            </div>
          )}

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
              Stake Amount: <span style={{ color: '#1a1a1a' }}>${formattedStake}</span>
            </label>
            <input type="range" min={500} max={20000} step={500} value={stakeAmount}
              onChange={(e) => setStakeAmount(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#ffde59', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9a9a9a', marginTop: '4px' }}>
              <span>$5</span><span>$200</span>
            </div>
          </div>

          <div style={{ border: '1px solid #e4e4e4', borderRadius: '8px', padding: '20px 24px', marginBottom: '24px', background: '#fff' }}>
            <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '2px', color: '#9a9a9a', margin: '0 0 8px' }}>IF YOU FAIL</p>
            <p style={{ fontSize: '14px', color: '#1a1a1a', lineHeight: 1.7, margin: '0 0 16px' }}>
              Your stake goes to a random KOMMIT member — with a note that just says &quot;Failed to KOMMIT.&quot;
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={joinPool} onChange={(e) => setJoinPool(e.target.checked)} />
              <span style={{ fontSize: '13px', color: '#1a1a1a' }}>Add me to the pool — I might receive a stranger&apos;s stake too</span>
            </label>
          </div>

          {apiError && <p style={{ color: 'red', marginBottom: '16px' }}>{apiError}</p>}
          {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm stakeAmount={stakeAmount} forfeitDestination={forfeitDestination} searchParams={searchParams} joinPool={joinPool} />
            </Elements>
          ) : (!apiError && <p style={{ color: '#9a9a9a', fontSize: '14px' }}>Preparing payment…</p>)}

          <div style={{ borderTop: '1px solid #e4e4e4', marginTop: '40px', paddingTop: '20px', textAlign: 'center' as const }}>
            <a href="mailto:hello@kommit.ai" style={{ fontSize: '12px', color: '#c0beb6', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>hello@kommit.ai</a>
          </div>
        </div>
      </div>

      {showLoginModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', maxWidth: '400px', width: '100%', position: 'relative' as const }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>Sign in to commit</h2>
            <p style={{ fontSize: '14px', color: '#9a9a9a', marginBottom: '28px' }}>Your commitment needs a home. Sign in so you can track it.</p>
            {!loginOtpSent ? (
              <>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendLoginOtp(); }} placeholder="your@email.com"
                  style={{ width: '100%', padding: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif', border: '1px solid #e4e4e4', borderRadius: '6px', color: '#1a1a1a', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }} />
                <button onClick={sendLoginOtp} disabled={loginSending || !loginEmail.includes('@')}
                  style={{ width: '100%', padding: '14px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', cursor: loginSending ? 'not-allowed' : 'pointer', opacity: loginSending || !loginEmail.includes('@') ? 0.5 : 1 }}>
                  {loginSending ? 'Sending…' : 'Send code'}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#9a9a9a', marginBottom: '16px' }}>Code sent to <strong>{loginEmail}</strong></p>
                <input type="text" value={loginCode} onChange={e => setLoginCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => { if (e.key === 'Enter' && loginCode.length === 6) verifyLoginOtp(); }} placeholder="000000" maxLength={6}
                  style={{ width: '100%', padding: '16px', fontSize: '24px', fontFamily: 'Inter, sans-serif', border: '1px solid #e4e4e4', borderRadius: '6px', color: '#1a1a1a', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px', letterSpacing: '12px', textAlign: 'center' as const }} />
                <button onClick={verifyLoginOtp} disabled={loginVerifying || loginCode.length !== 6}
                  style={{ width: '100%', padding: '14px', backgroundColor: '#ffde59', color: '#1a1a1a', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: loginVerifying || loginCode.length !== 6 ? 'not-allowed' : 'pointer', opacity: loginVerifying || loginCode.length !== 6 ? 0.5 : 1 }}>
                  {loginVerifying ? 'Verifying…' : 'Verify'}
                </button>
              </>
            )}
            {loginError && <p style={{ color: '#c0392b', fontSize: '13px', marginTop: '12px' }}>{loginError}</p>}
            <p style={{ fontSize: '12px', color: '#9a9a9a', textAlign: 'center' as const, marginTop: '16px' }}>No password. No account setup.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommitPage() {
  return <Suspense fallback={null}><CommitPageInner /></Suspense>;
}
