"use client";

import { useState, useRef } from "react";

interface SourceDetail {
  title: string;
  highlight: string;
  url: string;
}

interface SentimentScores {
  positive?: number;
  neutral?: number;
  negative?: number;
}

interface AgentEvent {
  agent?: string;
  type?: string;
  decision?: string;
  sentiment?: string;
  query?: string;
  truth?: string;
  detail?: string;
  category?: string;
  phrases?: string[];
  sources?: number;
  sourceDetails?: SourceDetail[];
  scores?: SentimentScores;
  read?: string;
  avoided?: string;
  weight?: string;
  commitment?: string;
  reframe?: string;
  question?: string;
  language?: string;
  country?: string;
  crisisDetail?: string;
  [key: string]: unknown;
}

interface Card {
  truth: string;
  commitment: string;
  stake: string;
  clarity: string;
  challenge: string;
}

interface CrisisResources {
  primary: {
    name: string;
    number: string;
    url: string;
  };
}

const AGENT_ROLES: Record<string, string> = {
  'Gus Fring': 'Safety Check',
  'Agent Smith': 'Translation',
  'Hannibal': 'Sentiment Analysis',
  'T-1000': 'Evidence Search',
  'Tyler Durden': 'Situation Analysis',
  'Joker': 'Challenge Analysis',
  'Thanos': 'Verdict',
  'Mike Ehrmantraut': 'Audio Processing',
  'Bane': 'Location Detection',
  "Ra's al Ghul": 'Commitment Engine'
};

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "crisis">("idle");
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [card, setCard] = useState<Card | null>(null);
  const [crisisResources, setCrisisResources] = useState<CrisisResources | null>(null);
  const [recording, setRecording] = useState<boolean>(false);
  const [transcribing, setTranscribing] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<number>>(new Set());
  const [showAgents, setShowAgents] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  async function handleRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      setTranscribing(true);
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      console.log("TRANSCRIBE RESPONSE:", data);
      if (!res.ok) {
        setVoiceError(data.error || "Transcription failed");
      } else if (data.transcript) {
        handleSubmit(data.transcript, data.languageCode);
        setVoiceError(null);
      } else {
        setVoiceError("No transcript returned");
      }
      stream.getTracks().forEach((t) => t.stop());
      setTranscribing(false);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  async function handleSubmit(text?: string, languageCode?: string) {
    const textToAnalyze = typeof text === "string" ? text : input;
    setStatus("processing");
    setAgentEvents([]);
    setCard(null);
    setExpandedAgents(new Set());
    setShowAgents(false);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: textToAnalyze, languageCode }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("data: ").filter((line) => line.trim() !== "");

      for (const line of lines) {
        try {
          const event = JSON.parse(line.trim());

          if (event.agent) {
            setAgentEvents((prev) => [...prev, event as AgentEvent]);
          }

          if (event.type === "result") {
            setCard(event.card);
          }

          if (event.type === "crisis") {
            setCrisisResources(event.crisisResources);
            setStatus("crisis");
          }

          if (event.type === "done") {
            setStatus("done");
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
  }

  function toggleAgent(i: number) {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }

  const getAgentSummary = (p: AgentEvent): string => {
    if (p.agent === 'Gus Fring') return `Input classified as ${p.category ?? ''}`;
    if (p.agent === 'Bane') return (p.detail as string) || '';
    if (p.agent === 'Mike Ehrmantraut') return (p.detail as string) || '';
    if (p.agent === 'Hannibal') return `Sentiment: ${p.sentiment ?? ''} — Key phrases: ${(p.phrases ?? []).slice(0, 3).join(', ')}`;
    if (p.agent === 'T-1000') return `Searched: "${p.query ?? ''}" — ${p.sources ?? 0} sources found`;
    if (p.agent === 'Tyler Durden') return p.read ? (p.read as string).slice(0, 80) + '…' : '';
    if (p.agent === 'Joker') return p.avoided ? (p.avoided as string).slice(0, 80) + '…' : '';
    if (p.agent === 'Thanos') return p.truth ? (p.truth as string).slice(0, 80) + '…' : 'Delivering verdict...';
    if (p.agent === 'Agent Smith') return (p.detail as string) || 'Translated to English';
    if (p.agent === "Ra's al Ghul") return (p.detail as string) || 'Commitment contract prepared';
    return (p.decision as string) || (p.detail as string) || '';
  };

  const getAgentDetail = (p: AgentEvent): React.ReactNode => {
    const goldBorder: React.CSSProperties = {
      background: '#f9f9f9',
      borderRadius: '6px',
      padding: '16px',
      marginTop: '8px',
      borderLeft: '3px solid #C4922A',
    };
    const labelStyle: React.CSSProperties = {
      fontSize: '12px',
      color: '#C4922A',
      fontWeight: 500,
      margin: '0 0 8px',
      letterSpacing: '1px',
    };
    const textStyle: React.CSSProperties = {
      fontSize: '13px',
      color: '#555',
      margin: '0',
      lineHeight: 1.6,
    };

    if (p.agent === 'T-1000') {
      return (
        <div style={goldBorder}>
          <p style={labelStyle}>T-1000</p>
          {p.query && (
            <p style={{ ...textStyle, marginBottom: '12px' }}>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>Search query:</span> {p.query}
            </p>
          )}
          {p.sourceDetails && p.sourceDetails.length > 0 ? (
            p.sourceDetails.map((src, idx) => (
              <div key={idx} style={{ marginBottom: idx < p.sourceDetails!.length - 1 ? '12px' : '0', paddingBottom: idx < p.sourceDetails!.length - 1 ? '12px' : '0', borderBottom: idx < p.sourceDetails!.length - 1 ? '1px solid #e8e8e8' : 'none' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>{src.title}</p>
                {src.highlight && <p style={{ fontSize: '13px', color: '#555', margin: '0 0 4px', lineHeight: 1.5 }}>{src.highlight}</p>}
                {src.url && (
                  <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#C4922A', wordBreak: 'break-all' }}>{src.url}</a>
                )}
              </div>
            ))
          ) : (
            <p style={textStyle}>{p.sources ?? 0} sources found</p>
          )}
        </div>
      );
    }

    if (p.agent === 'Hannibal') {
      const sentimentColor = p.sentiment === 'POSITIVE' ? '#27ae60' : p.sentiment === 'NEGATIVE' ? '#c0392b' : '#8a8a8a';
      return (
        <div style={goldBorder}>
          <p style={labelStyle}>HANNIBAL</p>
          {p.sentiment && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ display: 'inline-block', background: sentimentColor, color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '4px', padding: '3px 8px', letterSpacing: '1px' }}>
                {p.sentiment}
              </span>
            </div>
          )}
          {p.phrases && p.phrases.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: '#9a9a9a', margin: '0 0 6px', letterSpacing: '0.5px' }}>KEY PHRASES</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {p.phrases.map((phrase, idx) => (
                  <span key={idx} style={{ background: '#fff', border: '1px solid #e4e4e4', borderRadius: '999px', fontSize: '12px', color: '#1a1a1a', padding: '3px 10px' }}>
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}
          {p.scores && (
            <div>
              <p style={{ fontSize: '12px', color: '#9a9a9a', margin: '0 0 6px', letterSpacing: '0.5px' }}>SENTIMENT SCORES</p>
              {Object.entries(p.scores).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#555', width: '70px', textTransform: 'capitalize' }}>{key}</span>
                  <div style={{ flex: 1, background: '#e8e8e8', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((val as number) * 100)}%`, background: key === 'positive' ? '#27ae60' : key === 'negative' ? '#c0392b' : '#8a8a8a', height: '100%', borderRadius: '999px' }} />
                  </div>
                  <span style={{ fontSize: '12px', color: '#555', width: '36px', textAlign: 'right' }}>{Math.round((val as number) * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (p.agent === 'Tyler Durden') {
      return (
        <div style={goldBorder}>
          <p style={labelStyle}>TYLER DURDEN</p>
          {p.weight && (
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#C4922A', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Weight: {p.weight}
            </p>
          )}
          {p.read && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', color: '#9a9a9a', margin: '0 0 4px', letterSpacing: '0.5px' }}>SITUATION READ</p>
              <p style={textStyle}>{p.read}</p>
            </div>
          )}
          {p.commitment && (
            <div>
              <p style={{ fontSize: '12px', color: '#9a9a9a', margin: '0 0 4px', letterSpacing: '0.5px' }}>COMMITMENT</p>
              <p style={textStyle}>{p.commitment}</p>
            </div>
          )}
        </div>
      );
    }

    if (p.agent === 'Joker') {
      return (
        <div style={goldBorder}>
          <p style={labelStyle}>JOKER</p>
          {p.avoided && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', color: '#9a9a9a', margin: '0 0 4px', letterSpacing: '0.5px' }}>WHAT YOU ARE AVOIDING</p>
              <p style={textStyle}>{p.avoided}</p>
            </div>
          )}
          {p.reframe && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', color: '#9a9a9a', margin: '0 0 4px', letterSpacing: '0.5px' }}>REFRAME</p>
              <p style={{ ...textStyle, fontStyle: 'italic' }}>{p.reframe}</p>
            </div>
          )}
          {p.question && (
            <div>
              <p style={{ fontSize: '12px', color: '#9a9a9a', margin: '0 0 4px', letterSpacing: '0.5px' }}>THE QUESTION</p>
              <p style={{ ...textStyle, fontWeight: 700, color: '#1a1a1a' }}>{p.question}</p>
            </div>
          )}
        </div>
      );
    }

    if (p.agent === 'Thanos') {
      return (
        <div style={goldBorder}>
          <p style={labelStyle}>THANOS</p>
          <p style={textStyle}>{p.truth || 'Delivering verdict...'}</p>
        </div>
      );
    }

    if (p.agent === 'Agent Smith') {
      return (
        <div style={goldBorder}>
          <p style={labelStyle}>AGENT SMITH</p>
          {p.language && (
            <p style={{ ...textStyle, marginBottom: '6px' }}>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>Source language detected:</span> {p.language}
            </p>
          )}
          <p style={textStyle}>{p.detail || 'Translated to English'}</p>
        </div>
      );
    }

    if (p.agent === 'Gus Fring') {
      return (
        <div style={goldBorder}>
          <p style={labelStyle}>GUS FRING</p>
          {p.category && (
            <p style={{ ...textStyle, marginBottom: '6px' }}>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>Category:</span> {p.category}
            </p>
          )}
          {p.decision && (
            <p style={{ ...textStyle, marginBottom: '6px' }}>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>Decision:</span> {p.decision}
            </p>
          )}
          <p style={{ ...textStyle, color: '#27ae60' }}>✓ Safety check complete</p>
        </div>
      );
    }

    if (p.agent === 'Bane') {
      return (
        <div style={goldBorder}>
          <p style={labelStyle}>BANE</p>
          {p.country && (
            <p style={{ ...textStyle, marginBottom: '6px' }}>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>Country detected:</span> {p.country}
            </p>
          )}
          {p.crisisDetail && (
            <p style={{ ...textStyle, marginBottom: '6px' }}>{p.crisisDetail}</p>
          )}
          {p.detail && (
            <p style={textStyle}>{p.detail}</p>
          )}
        </div>
      );
    }

    if (p.agent === 'Mike Ehrmantraut') {
      return (
        <div style={goldBorder}>
          <p style={labelStyle}>MIKE EHRMANTRAUT</p>
          <p style={{ ...textStyle, color: '#27ae60' }}>✓ Audio deleted after transcription</p>
          {p.detail && <p style={{ ...textStyle, marginTop: '6px' }}>{p.detail}</p>}
        </div>
      );
    }

    if (p.agent === "Ra's al Ghul") {
      return (
        <div style={goldBorder}>
          <p style={labelStyle}>RA&apos;S AL GHUL</p>
          <p style={{ ...textStyle, color: '#27ae60' }}>✓ Commitment contract prepared</p>
          {p.detail && <p style={{ ...textStyle, marginTop: '6px' }}>{p.detail}</p>}
        </div>
      );
    }

    // fallback
    return (
      <div style={goldBorder}>
        <p style={labelStyle}>{(p.agent || '').toUpperCase()}</p>
        <p style={textStyle}>{(p.decision as string) || (p.detail as string) || ''}</p>
      </div>
    );
  };

  const processing = status === "processing";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        fontFamily: "Inter, sans-serif",
        fontSize: "14px",
        color: "#1a1a1a",
        margin: "0",
        padding: "0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes ring {
          0% { opacity: 0.25; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.55); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes o-pulse {
          0%, 100% { background: #C4922A; }
          50% { background: #E8B84B; }
        }
        @keyframes dot-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
          padding: "0 40px",
          borderBottom: "1px solid #f0f0f0",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Logo */}
        <img src="/ko_icon_light.svg?v=1781023020" alt="KOMMIT" style={{height:'44px', width:'44px'}} />

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <a
            href="/dashboard"
            style={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#8a8a8a",
              textDecoration: "none",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Dashboard
          </a>
          <a
            href="/login"
            style={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#8a8a8a",
              textDecoration: "none",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Login
          </a>
        </div>
      </nav>

      {/* Centering wrapper */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
        {/* Page content */}
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Logo */}
          <img src="/kommit_logo_light.svg?v=1781022912" alt="KOMMIT" style={{height:'200px', width:'auto', marginBottom:'48px'}} />

          {/* Pill input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: '#1a1a1a', borderRadius: '999px',
            padding: '12px 16px 12px 20px', width: '100%', boxSizing: 'border-box',
            marginBottom: '0',
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              style={{
                flex: 1, border: 'none', background: 'transparent', color: '#fff',
                fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif',
                textAlign: 'center',
              }}
              placeholder="What's weighing on you right now?"
            />
            <button onClick={handleRecord} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={recording ? '#c0392b' : '#888'} strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            {input.trim() && (
              <button onClick={() => handleSubmit()} style={{ background: '#C4922A', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
            )}
          </div>

          {/* Status text */}
          {recording && (
            <p style={{ fontSize: '14px', fontWeight: 400, color: '#c0392b', margin: '12px 0 0 0', textAlign: 'center', alignSelf: 'center' }}>
              Recording… tap to stop
            </p>
          )}
          {transcribing && (
            <p style={{ fontSize: '14px', fontWeight: 400, color: '#8a8a8a', margin: '12px 0 0 0', textAlign: 'center', alignSelf: 'center' }}>
              Transcribing…
            </p>
          )}
          {voiceError && (
            <p style={{ fontSize: '14px', fontWeight: 400, color: '#c0392b', margin: '12px 0 0 0', textAlign: 'center', alignSelf: 'center' }}>
              {voiceError}
            </p>
          )}

          {/* Privacy note */}
          <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', marginTop: '12px', marginBottom: '40px' }}>
            Private. Deleted after analysis.
          </p>

          {/* Processing state */}
          {processing && (
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'32px'}}>
              <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width:'8px', height:'8px', borderRadius:'50%', background:'#C4922A',
                    animation:'dot-pulse 1.4s ease-in-out infinite',
                    animationDelay:`${i * 0.2}s`
                  }}/>
                ))}
              </div>
              <p style={{fontSize:'13px', color:'#9a9a9a', margin:0, letterSpacing:'1px'}}>10 agents working</p>
            </div>
          )}

          {/* Agent timeline — show/hide toggle + collapsible list */}
          {agentEvents.length > 0 && (
            <div style={{width:'100%', marginBottom:'24px'}}>
              {/* Toggle button */}
              <button
                onClick={() => setShowAgents((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 0 12px 0',
                  fontSize: '12px',
                  color: '#9a9a9a',
                  letterSpacing: '1px',
                  fontFamily: 'Inter, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transition:'transform 0.2s', transform: showAgents ? 'rotate(90deg)' : 'rotate(0deg)'}}>
                  <path d="M4 2l4 4-4 4" stroke="#9a9a9a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {showAgents ? 'hide agents' : 'show agents'}
              </button>

              {/* Agent list */}
              {showAgents && agentEvents.map((event, i) => {
                const parsed = typeof event === 'string' ? JSON.parse(event) : event;
                const name = parsed.agent || '';
                if (!name) return null;
                const roleName = AGENT_ROLES[name] || name;
                const summary = getAgentSummary(parsed);
                const isExpanded = expandedAgents.has(i);
                return (
                  <div key={i} style={{display:'flex', gap:'12px', marginBottom:'0', position:'relative'}}>
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'20px', flexShrink:0}}>
                      <div style={{width:'20px', height:'20px', borderRadius:'50%', background:'#C4922A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {i < agentEvents.length - 1 && <div style={{width:'1px', flex:1, background:'#e4e4e4', minHeight:'24px'}}/>}
                    </div>
                    <div style={{paddingBottom:'16px', flex:1}}>
                      <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px'}}>
                        <span style={{fontSize:'13px', fontWeight:600, color:'#1a1a1a'}}>{roleName}</span>
                      </div>
                      {summary && (
                        <p style={{fontSize:'13px', color:'#8a8a8a', margin:'0 0 4px', lineHeight:1.5}}>{summary}</p>
                      )}
                      <button
                        onClick={() => toggleAgent(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '12px',
                          color: '#C4922A',
                          fontFamily: 'Inter, sans-serif',
                          textDecoration: 'underline',
                        }}
                      >
                        {isExpanded ? 'hide work' : 'show work'}
                      </button>
                      {isExpanded && getAgentDetail(parsed)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Crisis resources */}
          {status === "crisis" && crisisResources && (
            <div
              style={{
                width: "100%",
                marginBottom: "32px",
                padding: "20px",
                backgroundColor: "#fff3f3",
                borderRadius: "10px",
                border: "1px solid #e4e4e4",
                boxSizing: "border-box",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#c0392b",
                  margin: "0 0 12px 0",
                }}
              >
                You are not alone.
              </p>
              <p style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 500, color: "#1a1a1a" }}>
                {crisisResources.primary.name}
              </p>
              <p style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 400, color: "#1a1a1a" }}>
                {crisisResources.primary.number}
              </p>
              <a
                href={crisisResources.primary.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#c0392b", fontSize: "14px", fontWeight: 400 }}
              >
                {crisisResources.primary.url}
              </a>
            </div>
          )}

          {/* Result card */}
          {!processing && card && (
            <div style={{ maxWidth: "560px", margin: "0 auto", paddingTop: "40px", width: "100%" }}>
              {/* What is happening */}
              <div
                style={{
                  border: "1px solid #e4e4e4",
                  borderRadius: "8px",
                  padding: "24px 28px",
                  marginBottom: "12px",
                  background: "#fff",
                }}
              >
                <p
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#9a9a9a",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                  }}
                >
                  What is happening
                </p>
                <p style={{ margin: "0", fontSize: "14px", color: "#1a1a1a", lineHeight: "1.7" }}>
                  {card.clarity}
                </p>
              </div>

              {/* What you are avoiding */}
              <div
                style={{
                  border: "1px solid #e4e4e4",
                  borderRadius: "8px",
                  padding: "24px 28px",
                  marginBottom: "12px",
                  background: "#fff",
                }}
              >
                <p
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#9a9a9a",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                  }}
                >
                  What you are avoiding
                </p>
                <p style={{ margin: "0", fontSize: "14px", color: "#1a1a1a", lineHeight: "1.7" }}>
                  {card.challenge}
                </p>
              </div>

              {/* The truth */}
              <div
                style={{
                  border: "1px solid #C4922A",
                  borderRadius: "8px",
                  padding: "24px 28px",
                  marginBottom: "24px",
                  background: "#fffdf7",
                }}
              >
                <p
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#C4922A",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                  }}
                >
                  The truth
                </p>
                <p
                  style={{
                    margin: "0",
                    fontSize: "14px",
                    color: "#1a1a1a",
                    lineHeight: "1.7",
                    fontStyle: "normal",
                  }}
                >
                  {card.truth}
                </p>
              </div>

              {/* Commitment card */}
              <div style={{border:'1px solid #e4e4e4', borderRadius:'8px', padding:'24px 28px', marginBottom:'24px', background:'#fff'}}>
                <p style={{fontSize:'11px', fontWeight:500, color:'#9a9a9a', letterSpacing:'2px', margin:'0 0 12px'}}>YOUR COMMITMENT</p>
                <p style={{fontSize:'14px', color:'#1a1a1a', lineHeight:1.7, margin:0}}>{card.commitment}</p>
              </div>

              {/* Back this with $5 */}
              <a
                href={
                  "/commit?truth=" +
                  encodeURIComponent(card.truth) +
                  "&commitment=" +
                  encodeURIComponent(card.commitment) +
                  "&stakeAmount=500"
                }
                style={{
                  display: "block",
                  backgroundColor: "#C4922A",
                  color: "#fff",
                  textDecoration: "none",
                  border: "none",
                  borderRadius: "6px",
                  padding: "14px 28px",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "Inter, sans-serif",
                  cursor: "pointer",
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: "center",
                }}
              >
                Back this with $5
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}