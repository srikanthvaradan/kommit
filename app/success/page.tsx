"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SuccessPage() {
  const searchParams = useSearchParams();

  const truth = searchParams.get("truth") ?? "";
  const commitment = searchParams.get("commitment") ?? "";
  const stakeAmountRaw = searchParams.get("stakeAmount") ?? "0";
  const forfeitDestination = searchParams.get("forfeitDestination") ?? "";
  const dueDate = searchParams.get("dueDate") ?? "";
  const paymentIntentId = searchParams.get("paymentIntentId") ?? "";

  const [id, setId] = useState<string | null>(null);
  const [honoured, setHonoured] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function save() {
      try {
        const res = await fetch("/api/commitments/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId,
            commitmentText: commitment,
            stakeAmount: Number(stakeAmountRaw),
            forfeitDestination,
            avoidedTruth: truth,
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

    save();
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

  const stakeAmount = Number(stakeAmountRaw);
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
    <main
      style={{
        backgroundColor: "#FAFAF8",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "Georgia, serif",
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
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#3D5A36",
            marginBottom: "2rem",
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

        <section style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#3D5A36",
              marginBottom: "0.4rem",
            }}
          >
            The truth you faced
          </h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6 }}>{truth}</p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#3D5A36",
              marginBottom: "0.4rem",
            }}
          >
            Your commitment
          </h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6 }}>{commitment}</p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#3D5A36",
              marginBottom: "0.4rem",
            }}
          >
            Stake
          </h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6 }}>{formattedStake}</p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#3D5A36",
              marginBottom: "0.4rem",
            }}
          >
            If you don&apos;t follow through, your money goes to
          </h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6 }}>{forfeitDestination}</p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#3D5A36",
              marginBottom: "0.4rem",
            }}
          >
            Due date
          </h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6 }}>{formattedDueDate}</p>
        </section>

        {honoured ? (
          <p
            style={{
              fontSize: "1.2rem",
              color: "#3D5A36",
              fontWeight: "bold",
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
                backgroundColor: "#3D5A36",
                color: "#FAFAF8",
                border: "none",
                padding: "0.85rem 2rem",
                fontSize: "1rem",
                cursor: id ? "pointer" : "not-allowed",
                opacity: id ? 1 : 0.6,
                marginBottom: "1rem",
                letterSpacing: "0.03em",
              }}
            >
              I followed through
            </button>
            {checkinError && (
              <p style={{ color: "#c0392b", marginBottom: "1rem" }}>
                {checkinError}
              </p>
            )}
          </>
        )}

        <p
          style={{
            fontSize: "0.9rem",
            color: "#555",
            marginTop: "1rem",
            fontStyle: "italic",
          }}
        >
          Come back by {formattedDueDate}. Your word is on the line.
        </p>
      </div>
    </main>
  );
}