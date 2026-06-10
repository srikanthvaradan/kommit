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
    // Redirect home if user presses back
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', () => { window.location.href = '/'; });
    return () => window.removeEventListener('popstate', () => { window.location.href = '/'; });
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("kommit_card");
    const parsed: KommitCard | null = stored ? JSON.parse(stored) : null;
    sessionStorage.removeItem("kommit_card");
    setCard(parsed);

    const urlParams = new URLSearchParams(window.location.search);
    const cardToSave: KommitCard = parsed || {
      truth: urlParams.get("truth") || "",
      commitment: urlParams.get("commitment") || "",
      stakeAmount: parseInt(urlParams.get("stake") || "500", 10),
      forfeitDestination: urlParams.get("forfeit") || "KOMMIT pool member",
      dueDate: urlParams.get("due") || new Date(Date.now() + 86400000).toISOString(),
    };

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
        if (!res.ok) setSaveError(data.error ?? "Failed to save commitment.");
        else setId(String(data.id));
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    if (cardToSave.commitment) save(cardToSave);

    setTimeout(() => {
      const cleanUrl = window.location.pathname + '?payment_intent=' + (urlParams.get('payment_intent') || '');
      window.history.replaceState({}, '', cleanUrl);
    }, 2000);
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

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const truth = card?.truth || urlParams?.get("truth") || "";
  const commitment = card?.commitment || urlParams?.get("commitment") || "";
  const stakeAmount = card?.stakeAmount || parseInt(urlParams?.get("stake") || "0", 10);
  const forfeitDestination = card?.forfeitDestination || urlParams?.get("forfeit") || "";
  const dueDate = card?.dueDate || urlParams?.get("due") || "";

  const formattedStake = `$${(stakeAmount / 100).toFixed(2)}`;
  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "";

  const label = { fontSize: "11px", fontWeight: 500, letterSpacing: "2px", color: "#9a9a9a", textTransform: "uppercase" as const, marginBottom: "8px" };
  const card_style = { border: "1px solid #e4e4e4", borderRadius: "8px", padding: "20px 24px", marginBottom: "12px", background: "#fff" };

  return (
    <>
      <nav style={{ position:'fixed', top:0, left:0, right:0, height:'64px', background:'#fff', borderBottom:'1px solid #e4e4e4', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', zIndex:100 }}>
        <a href="/" onClick={() => { sessionStorage.clear(); }} style={{ cursor:'pointer' }}>
          <img src="/ko_icon_light.svg" alt="KOMMIT" style={{ height:'44px', width:'44px' }} />
        </a>
        <a href="/dashboard" style={{ fontSize:'13px', color:'#8a8a8a', textDecoration:'none', fontFamily:'Inter,sans-serif' }}>Dashboard</a>
      </nav>

      <main style={{ backgroundColor:"#ffffff", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", padding:"88px 24px 48px", fontFamily:"Inter, sans-serif", fontSize:"14px", color:"#1a1a1a" }}>
        <div style={{ maxWidth:"560px", width:"100%" }}>

          <h1 style={{ fontSize:"32px", fontWeight:700, color:"#1a1a1a", marginBottom:"40px", lineHeight:1.2 }}>Your word is backed.</h1>

          {saveError && <p style={{ color:"#c0392b", marginBottom:"16px", fontSize:"13px" }}>Warning: {saveError}</p>}

          {truth && (
            <div style={{ ...card_style, border:"1px solid #1a1a1a", background:"#fafafa" }}>
              <p style={label}>The truth you faced</p>
              <p style={{ fontSize:"14px", color:"#1a1a1a", lineHeight:1.7, margin:0 }}>{truth}</p>
            </div>
          )}

          {commitment && (
            <div style={card_style}>
              <p style={label}>Your commitment</p>
              <p style={{ fontSize:"14px", color:"#1a1a1a", lineHeight:1.7, margin:0 }}>{commitment}</p>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
            <div style={card_style}>
              <p style={label}>Stake</p>
              <p style={{ fontSize:"18px", fontWeight:700, color:"#1a1a1a", margin:0 }}>{formattedStake}</p>
            </div>
            <div style={card_style}>
              <p style={label}>Due date</p>
              <p style={{ fontSize:"14px", color:"#1a1a1a", lineHeight:1.5, margin:0 }}>{formattedDueDate}</p>
            </div>
          </div>

          <div style={card_style}>
            <p style={label}>If you don&apos;t follow through</p>
            <p style={{ fontSize:"14px", color:"#1a1a1a", lineHeight:1.7, margin:0 }}>{forfeitDestination}</p>
          </div>

          <div style={{ marginTop:"24px" }}>
            {honoured ? (
              <p style={{ fontSize:"14px", color:"#1a1a1a", fontWeight:700, textAlign:"center", padding:"16px" }}>
                Commitment honoured. Your money is coming back.
              </p>
            ) : (
              <>
                <button onClick={handleFollowThrough} disabled={!id} style={{ backgroundColor:"#ffde59", color:"#1a1a1a", border:"none", borderRadius:"6px", padding:"14px 28px", fontSize:"14px", fontWeight:600, width:"100%", cursor:id ? "pointer" : "not-allowed", opacity:id ? 1 : 0.6, fontFamily:"Inter, sans-serif" }}>
                  I followed through
                </button>
                {checkinError && <p style={{ color:"#c0392b", marginTop:"8px", fontSize:"13px" }}>{checkinError}</p>}
              </>
            )}
          </div>

          <div style={{ textAlign:"center", marginTop:"24px", display:"flex", flexDirection:"column", gap:"8px" }}>
            <p style={{ fontSize:"13px", color:"#9a9a9a", margin:0 }}>Come back by {formattedDueDate}. Your word is on the line.</p>
            <a href="/dashboard" style={{ fontSize:"13px", color:"#1a1a1a", textDecoration:"none", fontWeight:500 }}>View all commitments →</a>
            <a href="/" style={{ fontSize:"13px", color:"#9a9a9a", textDecoration:"none" }}>← Start a new session</a>
          </div>

          <div style={{ borderTop:"1px solid #e4e4e4", marginTop:"40px", paddingTop:"20px", textAlign:"center" }}>
            <a href="mailto:hello@kommit.ai" style={{ fontSize:"12px", color:"#c0beb6", textDecoration:"none", fontFamily:"Inter, sans-serif" }}>hello@kommit.ai</a>
          </div>

        </div>
      </main>
    </>
  );
}

export default function SuccessPage() {
  return <Suspense fallback={null}><SuccessPageInner /></Suspense>;
}
