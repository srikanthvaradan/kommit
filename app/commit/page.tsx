"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ── CheckoutForm ──────────────────────────────────────────────────────────────

interface CheckoutFormProps {
  stakeAmount: number;
}

function CheckoutForm({ stakeAmount }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formattedAmount = (stakeAmount / 100).toFixed(2);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/success",
      },
    });

    if (error) {
      setErrorMessage(error.message ?? "An unexpected error occurred.");
    }

    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <PaymentElement />
      {errorMessage && (
        <p
          style={{
            color: "#c0392b",
            marginTop: "12px",
            fontSize: "14px",
          }}
        >
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || isLoading}
        style={{
          marginTop: "24px",
          width: "100%",
          padding: "14px 24px",
          backgroundColor: "#3D5A36",
          color: "#FAFAF8",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: 600,
          cursor: isLoading || !stripe ? "not-allowed" : "pointer",
          opacity: isLoading || !stripe ? 0.7 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {isLoading ? "Processing…" : `Back this with $${formattedAmount}`}
      </button>
    </form>
  );
}

// ── CommitPage ────────────────────────────────────────────────────────────────

export default function CommitPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(500);
  const [forfeitDestination, setForfeitDestination] = useState<string>(
    "A cause I oppose"
  );
  const [truth, setTruth] = useState<string>("");
  const [commitment, setCommitment] = useState<string>("");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Read search params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const truthParam = params.get("truth") ?? "";
    const commitmentParam = params.get("commitment") ?? "";
    const stakeParam = params.get("stake");

    setTruth(truthParam);
    setCommitment(commitmentParam);

    if (stakeParam) {
      const parsed = parseInt(stakeParam, 10);
      if (!isNaN(parsed) && parsed >= 500 && parsed <= 20000) {
        setStakeAmount(parsed);
      }
    }
  }, []);

  // Create PaymentIntent whenever stakeAmount or forfeitDestination changes
  useEffect(() => {
    if (!commitment) return;

    setClientSecret(null);
    setFetchError(null);

    fetch("/api/commitments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stakeAmount,
        forfeitDestination,
        commitmentText: commitment,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to create commitment.");
        return res.json();
      })
      .then((data: { clientSecret: string }) => {
        setClientSecret(data.clientSecret);
      })
      .catch((err: Error) => {
        setFetchError(err.message);
      });
  }, [stakeAmount, forfeitDestination, commitment]);

  const formattedAmount = (stakeAmount / 100).toFixed(2);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FAFAF8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          maxWidth: "560px",
          width: "100%",
        }}
      >
        {/* Truth */}
        {truth && (
          <div
            style={{
              marginBottom: "32px",
              padding: "24px",
              backgroundColor: "#3D5A36",
              borderRadius: "12px",
              color: "#FAFAF8",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                opacity: 0.7,
                marginBottom: "8px",
              }}
            >
              Your truth
            </p>
            <p
              style={{
                fontSize: "22px",
                lineHeight: 1.4,
                fontStyle: "italic",
                margin: 0,
              }}
            >
              {truth}
            </p>
          </div>
        )}

        {/* Commitment */}
        {commitment && (
          <div style={{ marginBottom: "32px" }}>
            <p
              style={{
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#3D5A36",
                marginBottom: "8px",
              }}
            >
              Your commitment
            </p>
            <p
              style={{
                fontSize: "18px",
                lineHeight: 1.5,
                color: "#1a1a1a",
                margin: 0,
              }}
            >
              {commitment}
            </p>
          </div>
        )}

        {/* Stake Amount */}
        <div style={{ marginBottom: "28px" }}>
          <label
            htmlFor="stake-slider"
            style={{
              display: "block",
              fontSize: "14px",
              color: "#555",
              marginBottom: "8px",
            }}
          >
            Stake amount
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <input
              id="stake-slider"
              type="range"
              min={500}
              max={20000}
              step={500}
              value={stakeAmount}
              onChange={(e) => setStakeAmount(Number(e.target.value))}
              style={{ flex: 1, accentColor: "#3D5A36" }}
            />
            <span
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#3D5A36",
                minWidth: "72px",
                textAlign: "right",
              }}
            >
              ${formattedAmount}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
            Min $5.00 · Max $200.00
          </p>
        </div>

        {/* Forfeit Destination */}
        <div style={{ marginBottom: "36px" }}>
          <label
            htmlFor="forfeit-input"
            style={{
              display: "block",
              fontSize: "14px",
              color: "#555",
              marginBottom: "8px",
            }}
          >
            If I don&apos;t follow through, my money goes to:
          </label>
          <input
            id="forfeit-input"
            type="text"
            value={forfeitDestination}
            onChange={(e) => setForfeitDestination(e.target.value)}
            placeholder="A cause I oppose"
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: "15px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>

        {/* Stripe Elements */}
        {fetchError && (
          <p style={{ color: "#c0392b", marginBottom: "16px", fontSize: "14px" }}>
            {fetchError}
          </p>
        )}

        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm stakeAmount={stakeAmount} />
          </Elements>
        ) : (
          !fetchError && (
            <p style={{ color: "#999", fontSize: "14px", textAlign: "center" }}>
              Preparing payment…
            </p>
          )
        )}
      </div>
    </div>
  );
}