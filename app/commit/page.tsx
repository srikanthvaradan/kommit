"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useSearchParams } from "next/navigation";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({
  stakeAmount,
  forfeitDestination,
  searchParams,
}: {
  stakeAmount: number;
  forfeitDestination: string;
  searchParams: ReturnType<typeof useSearchParams>;
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

    const params = new URLSearchParams({
      truth: searchParams.get("truth") || "",
      commitment: searchParams.get("commitment") || "",
      stakeAmount: String(stakeAmount),
      forfeitDestination: forfeitDestination,
      dueDate: new Date(Date.now() + 86400000).toISOString()
    });
    const returnUrl = `${window.location.origin}/success?${params.toString()}`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (error) {
      setErrorMessage(error.message ?? "An unexpected error occurred.");
    }

    setIsLoading(false);
  };

  const formattedAmount = (stakeAmount / 100).toFixed(2);

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "24px" }}>
      <PaymentElement />
      {errorMessage && (
        <p style={{ color: "red", marginTop: "12px" }}>{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || isLoading}
        style={{
          marginTop: "20px",
          width: "100%",
          padding: "14px 24px",
          backgroundColor: "#3D5A36",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: "600",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? "Processing…" : `Back this with $${formattedAmount}`}
      </button>
    </form>
  );
}

export default function CommitPage() {
  const searchParams = useSearchParams();

  const truth = searchParams.get("truth") ?? "";
  const commitment = searchParams.get("commitment") ?? "";
  const stakeParam = searchParams.get("stake");

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(
    stakeParam ? parseInt(stakeParam, 10) : 500
  );
  const [forfeitDestination, setForfeitDestination] = useState<string>(
    "A cause I oppose"
  );
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const createCommitment = async () => {
      setApiError(null);
      try {
        const res = await fetch("/api/commitments/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stakeAmount,
            forfeitDestination,
            commitmentText: commitment,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to create commitment.");
        }
        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setApiError(err.message);
        } else {
          setApiError("An unexpected error occurred.");
        }
      }
    };

    createCommitment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formattedStake = (stakeAmount / 100).toFixed(2);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FAFAF8",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "48px 16px",
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
              backgroundColor: "#fff",
              borderLeft: "4px solid #3D5A36",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#3D5A36",
                marginBottom: "8px",
              }}
            >
              Your Truth
            </p>
            <p
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#1a1a1a",
                lineHeight: "1.4",
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
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#888",
                marginBottom: "8px",
              }}
            >
              Your Commitment
            </p>
            <p
              style={{
                fontSize: "17px",
                color: "#333",
                lineHeight: "1.6",
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
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#333",
              marginBottom: "12px",
            }}
          >
            Stake Amount:{" "}
            <span style={{ color: "#3D5A36", fontSize: "18px" }}>
              ${formattedStake}
            </span>
          </label>
          <input
            type="range"
            min={500}
            max={20000}
            step={500}
            value={stakeAmount}
            onChange={(e) => setStakeAmount(parseInt(e.target.value, 10))}
            style={{
              width: "100%",
              accentColor: "#3D5A36",
              cursor: "pointer",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#888",
              marginTop: "4px",
            }}
          >
            <span>$5</span>
            <span>$200</span>
          </div>
        </div>

        {/* Forfeit Destination */}
        <div style={{ marginBottom: "32px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#333",
              marginBottom: "8px",
            }}
          >
            If I don&apos;t follow through, my money goes to:
          </label>
          <input
            type="text"
            value={forfeitDestination}
            onChange={(e) => setForfeitDestination(e.target.value)}
            placeholder="A cause I oppose"
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: "15px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Stripe Elements */}
        {apiError && (
          <p style={{ color: "red", marginBottom: "16px" }}>{apiError}</p>
        )}

        {clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <CheckoutForm stakeAmount={stakeAmount} forfeitDestination={forfeitDestination} searchParams={searchParams} />
          </Elements>
        ) : (
          !apiError && (
            <p style={{ color: "#888", fontSize: "14px" }}>
              Preparing payment…
            </p>
          )
        )}
      </div>
    </div>
  );
}