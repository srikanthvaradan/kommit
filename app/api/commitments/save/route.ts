/**
 * @file app/api/commitments/save/route.ts
 * API route to save a confirmed commitment to Neon DB after Stripe payment.
 */

import { NextRequest, NextResponse } from "next/server";
import { saveCommitment, initSchema } from "@/lib/db";

/**
 * POST /api/commitments/save
 * Saves a commitment record to the database after payment confirmation.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    const {
      paymentIntentId,
      commitmentText,
      stakeAmount,
      forfeitDestination,
      avoidedTruth,
    } = body;

    if (
      !paymentIntentId ||
      !commitmentText ||
      stakeAmount === undefined ||
      stakeAmount === null ||
      stakeAmount === "" ||
      !forfeitDestination ||
      !avoidedTruth
    ) {
      return NextResponse.json(
        { error: "All fields are required and must be non-empty." },
        { status: 400 }
      );
    }

    await initSchema();

    const id = await saveCommitment({
      commitment_text: commitmentText,
      stake_amount: stakeAmount,
      forfeit_destination: forfeitDestination,
      avoided_truth: avoidedTruth,
      due_date: new Date(Date.now() + 86400000).toISOString(),
      status: "pending",
      stripe_payment_intent_id: paymentIntentId,
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}