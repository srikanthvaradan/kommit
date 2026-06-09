// lib/challenge.ts
// Challenge Agent - pushes back on framing and names what is being avoided.

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

/**
 * The structured output of the Challenge Agent.
 */
export interface ChallengeCard {
  avoided: string;
  reframe: string;
  question: string;
}

/** Fallback returned when JSON parsing fails. */
const FALLBACK: ChallengeCard = {
  avoided: "Something is being left unsaid.",
  reframe: "The real issue may be different from what is described.",
  question: "What are you not saying?",
};

/**
 * Calls the adversarial clarity agent to surface what the person is avoiding.
 *
 * @param transcript - Raw transcript of what the person said.
 * @param clarityRead - The clarity agent's prior read on the transcript.
 * @returns A {@link ChallengeCard} naming the avoidance, a harder reframe, and a direct question.
 */
export async function getChallenge(
  transcript: string,
  clarityRead: string
): Promise<ChallengeCard> {
  try {
    const userContent = `TRANSCRIPT:\n${transcript}\n\nCLARITY READ:\n${clarityRead}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:
        "You are an adversarial clarity agent. Your job is to name what this person is avoiding. Do not soften. Do not comfort. Find the thing they are not saying.",
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      return FALLBACK;
    }

    const raw = block.text.trim();

    // Strip markdown code fences if present
    const jsonString = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(jsonString) as Partial<ChallengeCard>;

    return {
      avoided:
        typeof parsed.avoided === "string" ? parsed.avoided : FALLBACK.avoided,
      reframe:
        typeof parsed.reframe === "string" ? parsed.reframe : FALLBACK.reframe,
      question:
        typeof parsed.question === "string"
          ? parsed.question
          : FALLBACK.question,
    };
  } catch {
    return FALLBACK;
  }
}