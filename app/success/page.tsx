"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from "next/navigation";

interface KommitCard {
  truth: string;
  commitment: string;
  stakeAmount: number;
  forfeitDestination: string;
  dueDate: string;
}

function SuccessPageInner() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent") ?? "";

  const [card, setCard] = useState<KommitCard | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [honoured, setHonoured] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("kommit_card");
    const parsed: KommitCard | null = stored ? JSON.parse(stored) : null;
    sessionStorage.removeItem("kommit_card");
    setCard(parsed);

    async function save(c: KommitCard) {
      try {
        const res = await fetch("/api/commitments/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId,
            commitmentText: c.commitment,
            stakeAmount: Number(c.stakeAmount),
            forfeitDestination: c.forfeitDestination,
            avoidedTruth: c.truth,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSaveError(data.error ?? "Failed to save commitment.");
        } else {
          setId(String(data.id));
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    if (parsed) {
      save(parsed);
    }

    // Remove sensitive data from URL immediately
    const cleanUrl = window.location.pathname + '?payment_intent=' + (new URLSearchParams(window.location.search).get('payment_intent') || '');
    window.history.replaceState({}, '', cleanUrl);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFollowThrough() {
    if (!id) return;
    try {
      const res = await fetch("/api/commitments/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCheckinError(data.error ?? "Check-in failed.");
        return;
      }
      setHonoured(true);
    } catch (err) {
      setCheckinError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const truth = card?.truth || searchParams.get("truth") || "";
  const commitment = card?.commitment || searchParams.get("commitment") || "";
  const stakeAmount = card?.stakeAmount || parseInt(searchParams.get("stake") || "0", 10);
  const forfeitDestination = card?.forfeitDestination || searchParams.get("forfeit") || "";
  const dueDate = card?.dueDate || searchParams.get("due") || "";

  const formattedStake = new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
  }).format(stakeAmount / 100);

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-SG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <>
      <nav style={{position:'fixed', top:0, left:0, right:0, height:'64px', background:'#fff', borderBottom:'1px solid #e4e4e4', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', zIndex:100}}>
        <a href="/" onClick={() => { sessionStorage.clear(); document.cookie.split(";").forEach(c => { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); }); }} style={{cursor:'pointer'}}>
          <img src="/ko_icon_light.svg" alt="KOMMIT" style={{height:'44px', width:'44px'}} />
        </a>
        <a href="/dashboard" style={{fontSize:'13px', color:'#8a8a8a', textDecoration:'none', fontFamily:'Inter,sans-serif'}}>Dashboard</a>
      </nav>
      <main
        style={{
          backgroundColor: "#ffffff",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          paddingTop: "88px",
          fontFamily: "Inter, sans-serif",
          fontSize: "14px",
          color: "#1a1a1a",
        }}
      >
        <div
          style={{
            maxWidth: "640px",
            width: "100%",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "40px",
              lineHeight: 1.2,
            }}
          >
            Your word is backed.
          </h1>

          {saveError && (
            <p style={{ color: "#c0392b", marginBottom: "1rem" }}>
              Warning: {saveError}
            </p>
          )}

          <section
            style={{
              border: "1px solid #1a1a1a",
              borderRadius: "8px",
              padding: "20px 24px",
              marginBottom: "12px",
              background: "#fafafa",
            }}
          >
            <h2
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "2px",
                color: "#9a9a9a",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              The truth you faced
            </h2>
            <p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.7, margin: 0 }}>{truth}</p>
          </section>

          <section
            style={{
              border: "1px solid #e4e4e4",
              borderRadius: "8px",
              padding: "20px 24px",
              marginBottom: "12px",
              background: "#fff",
            }}
          >
            <h2
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "2px",
                color: "#9a9a9a",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Your commitment
            </h2>
            <p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.7, margin: 0 }}>{commitment}</p>
          </section>

          <section
            style={{
              border: "1px solid #e4e4e4",
              borderRadius: "8px",
              padding: "20px 24px",
              marginBottom: "12px",
              background: "#fff",
            }}
          >
            <h2
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "2px",
                color: "#9a9a9a",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Stake
            </h2>
            <p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.7, margin: 0 }}>{formattedStake}</p>
          </section>

          <section
            style={{
              border: "1px solid #e4e4e4",
              borderRadius: "8px",
              padding: "20px 24px",
              marginBottom: "12px",
              background: "#fff",
            }}
          >
            <h2
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "2px",
                color: "#9a9a9a",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              If you don&apos;t follow through, your money goes to
            </h2>
            <p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.7, margin: 0 }}>{forfeitDestination}</p>
          </section>

          <section
            style={{
              border: "1px solid #e4e4e4",
              borderRadius: "8px",
              padding: "20px 24px",
              marginBottom: "12px",
              background: "#fff",
            }}
          >
            <h2
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "2px",
                color: "#9a9a9a",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Due date
            </h2>
            <p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.7, margin: 0 }}>{formattedDueDate}</p>
          </section>

          {honoured ? (
            <p
              style={{
                fontSize: "14px",
                color: "#1a1a1a",
                fontWeight: 700,
                marginBottom: "1.5rem",
              }}
            >
              Commitment honoured. Your money is coming back.
            </p>
          ) : (
            <>
              <button
                onClick={handleFollowThrough}
                disabled={!id}
                style={{
                  backgroundColor: "#ffde59",
                  color: "#1a1a1a",
                  border: "none",
                  borderRadius: "6px",
                  padding: "14px 28px",
                  fontSize: "14px",
                  fontWeight: 500,
                  width: "100%",
                  marginBottom: "12px",
                  cursor: id ? "pointer" : "not-allowed",
                  opacity: id ? 1 : 0.6,
                }}
              >
                I followed through
              </button>
              <a href="/dashboard" style={{display:'block', textAlign:'center', fontSize:'13px', color:'#9a9a9a', marginTop:'12px', textDecoration:'none'}}>View all commitments →</a>
              {checkinError && (
                <p style={{ color: "#c0392b", marginBottom: "1rem" }}>
                  {checkinError}
                </p>
              )}
            </>
          )}

          <p
            style={{
              fontSize: "13px",
              color: "#9a9a9a",
              fontStyle: "normal",
              marginTop: "16px",
            }}
          >
            Come back by {formattedDueDate}. Your word is on the line.
          </p>
        </div>
      </main>
    </>
  );
}

export default function SuccessPage() {
  return <Suspense fallback={null}><SuccessPageInner /></Suspense>;
}
