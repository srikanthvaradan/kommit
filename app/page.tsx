"use client";

import { useState, useRef } from "react";

const ACCENT = "#3D5A36";
const BG = "#FAFAF8";

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
      if (data.transcript) setInput(data.transcript);
      stream.getTracks().forEach((t) => t.stop());
      setTranscribing(false);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  async function handleSubmit() {
    setStatus("processing");
    setAgentEvents([]);
    setCard(null);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
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

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: BG,
        fontFamily: "Georgia, serif",
        color: "#1a1a1a",
        padding: "0",
        margin: "0",
      }}
    >
      <div
        style={{
          maxWidth: "640px",
          margin: "0 auto",
          padding: "48px 24px",
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "2.8rem",
              fontWeight: "bold",
              color: ACCENT,
              margin: "0 0 8px 0",
              letterSpacing: "0.04em",
            }}
          >
            KOMMIT
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "#555",
              margin: "0",
              fontStyle: "italic",
            }}
          >
            Your word, backed.
          </p>
        </header>

        {/* Input area */}
        <div style={{ marginBottom: "24px" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What is weighing on you?"
            rows={4}
            style={{
              width: "100%",
              padding: "16px",
              fontSize: "1rem",
              fontFamily: "Georgia, serif",
              border: `1.5px solid ${ACCENT}`,
              borderRadius: "6px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              resize: "vertical",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
          <button
            onClick={handleSubmit}
            disabled={status === "processing"}
            style={{
              backgroundColor: status === "processing" ? "#aaa" : ACCENT,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "14px 32px",
              fontSize: "1rem",
              fontFamily: "Georgia, serif",
              cursor: status === "processing" ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Find the truth
          </button>
          <button
            onClick={handleRecord}
            style={{
              backgroundColor: recording ? "#7a3a3a" : "#fff",
              color: recording ? "#fff" : ACCENT,
              border: `1.5px solid ${recording ? "#7a3a3a" : ACCENT}`,
              borderRadius: "6px",
              padding: "14px 32px",
              fontSize: "1rem",
              fontFamily: "Georgia, serif",
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {recording ? "Stop recording" : "🎤 Speak"}
          </button>
        </div>
        {transcribing && (
          <p style={{ fontSize: "0.9rem", color: "#555", fontStyle: "italic", marginBottom: "16px" }}>
            Transcribing...
          </p>
        )}

        {/* Processing: agent events */}
        {status === "processing" && agentEvents.length > 0 && (
          <div
            style={{
              marginBottom: "32px",
              padding: "16px",
              backgroundColor: "#f0f4ef",
              borderRadius: "6px",
              border: `1px solid ${ACCENT}`,
            }}
          >
            <p
              style={{
                margin: "0 0 12px 0",
                fontWeight: "bold",
                color: ACCENT,
                fontSize: "0.9rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Analyzing…
            </p>
            <ul style={{ margin: "0", padding: "0 0 0 16px" }}>
              {agentEvents.map((ev, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "0.85rem",
                    color: "#444",
                    marginBottom: "6px",
                    fontFamily: "monospace",
                  }}
                >
                  <strong style={{ color: ACCENT }}>{ev.agent}</strong>:{" "}
                  {ev.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Crisis resources */}
        {status === "crisis" && crisisResources && (
          <div
            style={{
              marginBottom: "32px",
              padding: "24px",
              backgroundColor: "#fff3f3",
              borderRadius: "6px",
              border: "1.5px solid #c0392b",
            }}
          >
            <p
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: "#c0392b",
                margin: "0 0 16px 0",
              }}
            >
              You are not alone.
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#1a1a1a" }}>
              <strong>{crisisResources.primary.name}</strong>
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#1a1a1a" }}>
              {crisisResources.primary.number}
            </p>
            <a
              href={crisisResources.primary.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#c0392b", fontSize: "1rem" }}
            >
              {crisisResources.primary.url}
            </a>
          </div>
        )}

        {/* Card */}
        {card && (
          <div style={{ marginBottom: "32px" }}>
            {/* What is happening */}
            <div
              style={{
                marginBottom: "16px",
                padding: "20px",
                backgroundColor: "#fff",
                borderRadius: "6px",
                border: `1px solid #d0d8cf`,
              }}
            >
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#888",
                  fontFamily: "sans-serif",
                }}
              >
                What is happening
              </p>
              <p style={{ margin: "0", fontSize: "1rem", color: "#1a1a1a", lineHeight: "1.6" }}>
                {card.clarity}
              </p>
            </div>

            {/* What you are avoiding */}
            <div
              style={{
                marginBottom: "16px",
                padding: "20px",
                backgroundColor: "#fff",
                borderRadius: "6px",
                border: `1px solid #d0d8cf`,
              }}
            >
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#888",
                  fontFamily: "sans-serif",
                }}
              >
                What you are avoiding
              </p>
              <p style={{ margin: "0", fontSize: "1rem", color: "#1a1a1a", lineHeight: "1.6" }}>
                {card.challenge}
              </p>
            </div>

            {/* The truth */}
            <div
              style={{
                marginBottom: "24px",
                padding: "20px",
                backgroundColor: "#f0f4ef",
                borderRadius: "6px",
                border: `1.5px solid ${ACCENT}`,
              }}
            >
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: ACCENT,
                  fontFamily: "sans-serif",
                  fontWeight: "bold",
                }}
              >
                The truth
              </p>
              <p
                style={{
                  margin: "0",
                  fontSize: "1.05rem",
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
                fontSize: "1.1rem",
                color: "#1a1a1a",
                lineHeight: "1.7",
                marginBottom: "24px",
                padding: "0 4px",
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
                backgroundColor: ACCENT,
                color: "#fff",
                textDecoration: "none",
                borderRadius: "6px",
                padding: "14px 32px",
                fontSize: "1rem",
                fontFamily: "Georgia, serif",
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