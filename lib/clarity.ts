/**
 * @file clarity.ts
 * @description The Clarity Agent. Produces the reasonable, surface-level read of the situation.
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

/**
 * Represents a clarity card with a grounded read of the situation.
 */
export interface ClarityCard {
  /** One sentence naming what is actually happening. */
  read: string;
  /** One concrete action to take. */
  commitment: string;
  /** One word naming the emotional weight. */
  weight: string;
}

/**
 * Calls the Clarity Agent to produce a grounded, honest read of the situation.
 *
 * @param transcript - The raw transcript of the situation.
 * @param keyPhrases - Key phrases extracted from the transcript.
 * @param sentiment - The overall sentiment of the transcript.
 * @param sources - Relevant sources with title, url, and highlight.
 * @returns A ClarityCard with read, commitment, and weight fields.
 */
export async function getClarity(
  transcript: string,
  keyPhrases: string[],
  sentiment: string,
  sources: Array<{ title: string; url: string; highlight: string }>
): Promise<ClarityCard> {
  const fallback: ClarityCard = {
    read: "Something significant is happening.",
    commitment: "Sit with this for one hour before deciding anything.",
    weight: "Uncertain",
  };

  try {
    const topHighlight =
      sources.length > 0
        ? `Top source: "${sources[0].title}" — ${sources[0].highlight} (${sources[0].url})`
        : "No sources provided.";

    const userMessage = [
      `Transcript: ${transcript}`,
      `Key phrases: ${keyPhrases.join(", ")}`,
      `Sentiment: ${sentiment}`,
      topHighlight,
      "",
      'Respond with a JSON object with exactly these fields: "read" (one sentence naming what is actually happening), "commitment" (one concrete action), "weight" (one word naming the emotional weight).',
    ].join("\n");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system:
        "You are a clarity agent. Read the situation and produce a grounded, honest response. Be direct, not comforting. Be specific to this exact situation.",
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return fallback;
    }

    const rawText = textBlock.text.trim();

    // Extract JSON from the response, handling potential markdown code fences
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallback;
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ClarityCard>;

    if (
      typeof parsed.read === "string" &&
      typeof parsed.commitment === "string" &&
      typeof parsed.weight === "string"
    ) {
      return {
        read: parsed.read,
        commitment: parsed.commitment,
        weight: parsed.weight,
      };
    }

    return fallback;
  } catch {
    return fallback;
  }
}