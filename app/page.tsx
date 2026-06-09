"use client";

import { useState, useRef } from "react";

interface AgentEvent {
  agent: string;
  detail: string;
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

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "crisis">("idle");
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [card, setCard] = useState<Card | null>(null);
  const [crisisResources, setCrisisResources] = useState<CrisisResources | null>(null);
  const [recording, setRecording] = useState<boolean>(false);
  const [transcribing, setTranscribing] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
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
            setAgentEvents((prev) => [
              ...prev,
              { agent: event.agent, detail: JSON.stringify(event).slice(0, 80) },
            ]);
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
      `}</style>

      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 40px",
          borderBottom: "1px solid #f0f0f0",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Logo */}
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <img src="/logo_icon.png" alt="KOMMIT" style={{height:'48px', width:'48px', borderRadius:'8px', objectFit:'cover', background:'#1a1a1a', padding:'4px'}} />
          <span style={{fontSize:'18px', fontWeight:'500', letterSpacing:'4px', color:'#1a1a1a'}}>KOMMIT</span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <a
            href="/dashboard"
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#8a8a8a",
              textDecoration: "none",
            }}
          >
            Dashboard
          </a>
          <a
            href="/login"
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#8a8a8a",
              textDecoration: "none",
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
            alignItems: "flex-start",
          }}
        >
          {/* Logo */}
          <div style={{textAlign:'center', marginBottom:'48px'}}>
            <span style={{fontSize:'48px', fontWeight:'300', letterSpacing:'12px', color:'#1a1a1a', fontFamily:'Inter,sans-serif'}}>KOMMIT</span>
          </div>

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
                fontSize: '14px', outline: 'none', fontFamily: 'Inter,sans-serif',
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
          <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '12px', marginBottom: '40px' }}>
            Private. Deleted after analysis.
          </p>

          {/* Processing state */}
          {processing && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
                marginBottom: "32px",
              }}
            >
              <img
                src="/logo_icon.png"
                alt="Processing"
                style={{
                  animation: "spin 4s linear infinite",
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  marginBottom: "16px",
                }}
              />
              <button
                onClick={() => setShowAgents((prev) => !prev)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#C4922A",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "Inter, sans-serif",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "0",
                  marginBottom: "12px",
                }}
              >
                {showAgents ? "hide agents" : "show agents"}
              </button>

              {showAgents && agentEvents.length > 0 && (
                <ul
                  style={{
                    margin: "0",
                    padding: "0",
                    listStyle: "none",
                    width: "100%",
                  }}
                >
                  {agentEvents.map((ev, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: "14px",
                        fontWeight: 400,
                        color: "#444",
                        marginBottom: "8px",
                        fontFamily: "Inter, sans-serif",
                        animation: "fadeInUp 0.4s ease both",
                        animationDelay: `${i * 0.08}s`,
                        opacity: 0,
                      }}
                    >
                      <span style={{ color: "#C4922A", fontWeight: 500 }}>{ev.agent}</span>
                      {" — "}
                      {ev.detail}
                    </li>
                  ))}
                </ul>
              )}

              {showAgents && agentEvents.length === 0 && (
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#8a8a8a",
                    margin: "0",
                  }}
                >
                  Waiting for agents…
                </p>
              )}
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
            <div style={{ width: "100%", marginBottom: "32px" }}>
              {/* What is happening */}
              <div
                style={{
                  marginBottom: "12px",
                  padding: "16px 20px",
                  backgroundColor: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e4e4e4",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#8a8a8a",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  What is happening
                </p>
                <p style={{ margin: "0", fontSize: "14px", fontWeight: 400, color: "#1a1a1a", lineHeight: "1.6" }}>
                  {card.clarity}
                </p>
              </div>

              {/* What you are avoiding */}
              <div
                style={{
                  marginBottom: "12px",
                  padding: "16px 20px",
                  backgroundColor: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e4e4e4",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#8a8a8a",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  What you are avoiding
                </p>
                <p style={{ margin: "0", fontSize: "14px", fontWeight: 400, color: "#1a1a1a", lineHeight: "1.6" }}>
                  {card.challenge}
                </p>
              </div>

              {/* The truth */}
              <div
                style={{
                  marginBottom: "20px",
                  padding: "16px 20px",
                  backgroundColor: "#fffbf4",
                  borderRadius: "10px",
                  border: "1px solid #C4922A",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#C4922A",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  The truth
                </p>
                <p
                  style={{
                    margin: "0",
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#1a1a1a",
                    lineHeight: "1.6",
                    fontStyle: "italic",
                  }}
                >
                  {card.truth}
                </p>
              </div>

              {/* Commitment */}
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "#1a1a1a",
                  lineHeight: "1.7",
                  marginBottom: "20px",
                }}
              >
                {card.commitment}
              </p>

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
                  display: "inline-block",
                  backgroundColor: "#C4922A",
                  color: "#ffffff",
                  textDecoration: "none",
                  borderRadius: "8px",
                  padding: "10px 24px",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: "0.02em",
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