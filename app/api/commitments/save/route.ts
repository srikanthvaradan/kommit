/**
 * @file app/api/commitments/save/route.ts
 * API route to save a confirmed commitment to Neon DB after Stripe payment.
 */

import { NextRequest, NextResponse } from "next/server";
import { saveCommitment, initSchema } from "@/lib/db";
import { neon } from '@neondatabase/serverless';

/**
 * POST /api/commitments/save
 * Saves a commitment record to the database after payment confirmation.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    const token = req.cookies.get('kommit_session')?.value;
    let userId: number | null = null;
    if (token) {
      const sql = neon(process.env.DATABASE_URL!);
      const sessions = await sql`
        SELECT u.id FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ${token} AND s.expires_at > NOW()
      `;
      if (sessions.length) userId = sessions[0].id;
    }

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

    if (userId && id) {
      const sql = neon(process.env.DATABASE_URL!);
      await sql`UPDATE commitments SET user_id = ${userId} WHERE id = ${id}`;
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}