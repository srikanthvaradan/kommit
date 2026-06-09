/**
 * @file app/api/commitments/create/route.ts
 * @description API route for creating a Stripe PaymentIntent for a commitment stake.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia" as any,
});

/**
 * POST /api/commitments/create
 *
 * Creates a Stripe PaymentIntent for the given commitment stake amount.
 *
 * @param request - Incoming Next.js request containing JSON body:
 *   - stakeAmount {number} - Amount in cents (must be >= 500, i.e. minimum $5 SGD)
 *   - forfeitDestination {string} - Where funds go if commitment is forfeited
 *   - commitmentText {string} - Description of the commitment (must be non-empty)
 *
 * @returns {NextResponse} JSON response with `clientSecret` on success,
 *   or an error message with appropriate HTTP status code on failure.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { stakeAmount, forfeitDestination, commitmentText } = body as {
      stakeAmount: number;
      forfeitDestination: string;
      commitmentText: string;
    };

    // Validate stakeAmount
    if (typeof stakeAmount !== "number" || stakeAmount < 500) {
      return NextResponse.json(
        { error: "stakeAmount must be a number >= 500 (minimum $5 in cents)." },
        { status: 400 }
      );
    }

    // Validate commitmentText
    if (
      typeof commitmentText !== "string" ||
      commitmentText.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "commitmentText must be a non-empty string." },
        { status: 400 }
      );
    }

    // Create the PaymentIntent via Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stakeAmount,
      currency: "sgd",
      metadata: {
        commitmentText: commitmentText.slice(0, 500),
        forfeitDestination: forfeitDestination ?? "",
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}