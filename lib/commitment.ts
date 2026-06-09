/**
 * @file commitment.ts
 * @description The Commitment Agent. Creates a Stripe PaymentIntent for the
 * user's stake and structures the commitment record.
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" as any });

/**
 * Represents a structured commitment record returned after creating a commitment.
 */
export interface CommitmentRecord {
  commitmentText: string;
  stakeAmount: number;
  forfeitDestination: string;
  dueDate: string;
  clientSecret: string;
}

/**
 * Creates a new commitment by validating the stake amount, creating a Stripe
 * PaymentIntent, and returning a structured CommitmentRecord.
 *
 * @param commitmentText - The text describing the commitment the user is making.
 * @param stakeAmount - The stake amount in cents (must be >= 500, i.e. $5.00 SGD).
 * @param forfeitDestination - Where the funds go if the commitment is forfeited.
 * @returns A Promise resolving to a CommitmentRecord containing all commitment details.
 * @throws {Error} If stakeAmount is below the Stripe minimum of 500 cents.
 * @throws {Error} If the Stripe PaymentIntent creation fails.
 */
export async function createCommitment(
  commitmentText: string,
  stakeAmount: number,
  forfeitDestination: string
): Promise<CommitmentRecord> {
  if (stakeAmount < 500) {
    throw new Error(
      `stakeAmount must be at least 500 cents ($5.00 SGD). Received: ${stakeAmount}`
    );
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: stakeAmount,
    currency: "sgd",
    metadata: { commitmentText, forfeitDestination },
  });

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(23, 59, 59, 0);
  const dueDate = tomorrow.toISOString();

  return {
    commitmentText,
    stakeAmount,
    forfeitDestination,
    dueDate,
    clientSecret: paymentIntent.client_secret!,
  };
}