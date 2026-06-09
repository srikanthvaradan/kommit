/**
 * lib/grounding.ts
 *
 * The Grounding Agent. Builds a semantic Exa search query from Comprehend
 * key phrases using Claude Haiku, evaluates results, and retries once if weak.
 */

import Exa from "exa-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const exa = new Exa(process.env.EXA_API_KEY!);

/**
 * The result returned by the grounding agent.
 */
export interface GroundingResult {
  query: string;
  sources: Array<{ title: string; url: string; highlight: string }>;
  reformulated: boolean;
}

/**
 * Builds a semantic Exa search query from key phrases using Claude Haiku,
 * evaluates the results, and retries once if the results are weak.
 *
 * @param keyPhrases - Key phrases extracted from Comprehend
 * @param transcript - The original transcript text
 * @returns A GroundingResult with query, sources, and reformulated flag
 */
export async function groundSituation(
  keyPhrases: string[],
  transcript: string
): Promise<GroundingResult> {
  try {
    // Step 1: Build query via Anthropic Claude Haiku
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `Key phrases: ${keyPhrases.join(", ")}. Situation: ${transcript.slice(0, 300)}. Generate a 4-8 word semantic search query. Return only the query.`,
        },
      ],
    });

    const firstBlock = response.content[0];
    let query = (
      firstBlock.type === "text" ? firstBlock.text : keyPhrases.slice(0, 3).join(" ")
    ).trim();

    // Step 2: Search Exa with highlights inside contents
    let result = await exa.search(query, {
      numResults: 3,
      contents: {
        highlights: {
          numSentences: 1,
          highlightsPerUrl: 1,
        },
      },
    });

    // Step 3: Evaluate — weak if no results or every item has empty highlights
    const isWeak = (res: typeof result): boolean => {
      if (res.results.length === 0) return true;
      return res.results.every(
        (r) => !r.highlights || r.highlights.length === 0
      );
    };

    let reformulated = false;

    // Step 4: If weak, reformulate and retry once
    if (isWeak(result)) {
      const retryResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        messages: [
          {
            role: "user",
            content: `Key phrases: ${keyPhrases.join(", ")}. Situation: ${transcript.slice(0, 300)}. Previous query returned no results. Generate a different query. Generate a 4-8 word semantic search query. Return only the query.`,
          },
        ],
      });

      const retryFirstBlock = retryResponse.content[0];
      query = (
        retryFirstBlock.type === "text"
          ? retryFirstBlock.text
          : keyPhrases.slice(0, 3).join(" ")
      ).trim();

      result = await exa.search(query, {
        numResults: 3,
        contents: {
          highlights: {
            numSentences: 1,
            highlightsPerUrl: 1,
          },
        },
      });

      reformulated = true;
    }

    // Step 5: Map to sources
    const sources = result.results.slice(0, 3).map((r) => ({
      title: r.title ?? "",
      url: r.url,
      highlight: (r.highlights ?? [])[0] ?? "",
    }));

    // Step 6: Return result
    return { query, sources, reformulated };
  } catch {
    // On any error, return a safe fallback
    return {
      query: keyPhrases.slice(0, 3).join(" "),
      sources: [],
      reformulated: false,
    };
  }
}