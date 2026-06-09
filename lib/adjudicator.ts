/**
 * adjudicator.ts
 * The Adjudicator Agent — resolves ClarityCard and ChallengeCard into a
 * FinalCard that names the avoided truth the person most needs to hear.
 */

import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

import type { ClarityCard } from "./clarity";
import type { ChallengeCard } from "./challenge";

/**
 * The resolved output of adjudication: the avoided truth, a concrete
 * commitment, and the stake of continued avoidance.
 */
export interface FinalCard {
  truth: string;
  commitment: string;
  stake: string;
}

/**
 * Adjudicates between a Clarity read and a Challenge push-back, resolving
 * them into a single FinalCard that names the truth the person is avoiding.
 *
 * @param transcript - The raw conversation transcript
 * @param clarity    - The ClarityCard produced by the Clarity agent
 * @param challenge  - The ChallengeCard produced by the Challenge agent
 * @returns A FinalCard containing truth, commitment, and stake
 */
export async function adjudicate(
  transcript: string,
  clarity: ClarityCard,
  challenge: ChallengeCard
): Promise<FinalCard> {
  const fallback: FinalCard = {
    truth: "Something important needs your attention.",
    commitment: "Name the thing you are avoiding out loud.",
    stake: "Continued avoidance.",
  };

  try {
    const userMessage = [
      `TRANSCRIPT:\n${transcript}`,
      `CLARITY READ:\n${clarity.read}`,
      `AVOIDED TRUTH:\n${challenge.avoided}`,
      `CHALLENGE QUESTION:\n${challenge.question}`,
      `\nRespond with JSON only: { "truth": string, "commitment": string, "stake": string }`,
    ].join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system:
        "You are the final voice. You have heard two reads of this situation. Resolve them into one truth the person needs to hear. Be honest. Be specific. Do not soften. Keep each field to 2-3 sentences maximum. Be direct. Do not over-explain.",
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      return fallback;
    }

    const raw = block.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallback;
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<FinalCard>;

    return {
      truth:
        typeof parsed.truth === "string" && parsed.truth.length > 0
          ? parsed.truth
          : fallback.truth,
      commitment:
        typeof parsed.commitment === "string" && parsed.commitment.length > 0
          ? parsed.commitment
          : fallback.commitment,
      stake:
        typeof parsed.stake === "string" && parsed.stake.length > 0
          ? parsed.stake
          : fallback.stake,
    };
  } catch {
    return fallback;
  }
}