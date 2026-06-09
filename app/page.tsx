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
          padding: "0 32px",
          height: "56px",
          borderBottom: "1px solid #f0f0f0",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: "#545454",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#C4922A",
                fontSize: "14px",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              K
            </span>
          </div>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#1a1a1a",
              letterSpacing: "0.08em",
            }}
          >
            OMMIT
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <a
            href="/dashboard"
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#1a1a1a",
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
              color: "#1a1a1a",
              textDecoration: "none",
            }}
          >
            Login
          </a>
        </div>
      </nav>

      {/* Page content */}
      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          padding: "72px 24px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Heading */}
        <h1
          style={{
            fontSize: "14px",
            fontWeight: 300,
            color: "#1a1a1a",
            letterSpacing: "-0.8px",
            margin: "0 0 10px 0",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          What&apos;s weighing on you right now?
        </h1>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 400,
            color: "#8a8a8a",
            margin: "0 0 48px 0",
            textAlign: "center",
          }}
        >
          Speak or type. 10 agents. Zero judgment.
        </p>

        {/* Speak button */}
        <div style={{ position: "relative", marginBottom: "32px" }}>
          {/* Pulse ring */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              border: "1.5px solid #C4922A",
              transform: "translate(-50%, -50%)",
              animation: "ring 2.5s ease-out infinite",
              pointerEvents: "none",
            }}
          />
          {/* Button */}
          <button
            onClick={handleRecord}
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              border: recording ? "2px solid #c0392b" : "1.5px solid #C4922A",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "breathe 3s ease-in-out infinite",
              position: "relative",
              zIndex: 1,
              padding: 0,
            }}
          >
            <img
              src="/logo-icon.png"
              alt="Speak"
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          </button>
        </div>

        {/* Status text under button */}
        {recording && (
          <p
            style={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#c0392b",
              margin: "0 0 16px 0",
              textAlign: "center",
            }}
          >
            Recording… tap to stop
          </p>
        )}
        {transcribing && (
          <p
            style={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#8a8a8a",
              margin: "0 0 16px 0",
              textAlign: "center",
            }}
          >
            Transcribing…
          </p>
        )}
        {voiceError && (
          <p
            style={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#c0392b",
              margin: "0 0 16px 0",
              textAlign: "center",
            }}
          >
            {voiceError}
          </p>
        )}

        {/* OR divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            marginBottom: "24px",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e4e4e4" }} />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#8a8a8a",
            }}
          >
            or
          </span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e4e4e4" }} />
        </div>

        {/* Input box */}
        <div
          style={{
            width: "100%",
            border: "1px solid #e4e4e4",
            borderRadius: "10px",
            padding: "4px 4px 4px 18px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#ffffff",
            boxSizing: "border-box",
            marginBottom: "12px",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !processing) handleSubmit();
            }}
            placeholder="Type what's on your mind…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "14px",
              fontWeight: 400,
              fontFamily: "Inter, sans-serif",
              color: "#1a1a1a",
              backgroundColor: "transparent",
              padding: "8px 0",
            }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={processing}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              backgroundColor: processing ? "#d4a85a" : "#C4922A",
              border: "none",
              cursor: processing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* Arrow-up icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 13V3M8 3L4 7M8 3L12 7"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Privacy note */}
        <p
          style={{
            fontSize: "14px",
            fontWeight: 400,
            color: "#b0aaa0",
            margin: "0 0 40px 0",
            textAlign: "center",
          }}
        >
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
              src="/logo-icon.png"
              alt="Processing"
              style={{
                animation: "spin 4s linear infinite",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
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
  );
}