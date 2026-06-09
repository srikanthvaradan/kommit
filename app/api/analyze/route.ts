/**
 * @file app/api/analyze/route.ts
 * @description Main analysis pipeline. Accepts a POST request with a text body,
 * runs all agents in sequence, and streams decision events as Server-Sent Events (SSE).
 */

import { NextRequest } from "next/server";
import { classify } from "@/lib/safety";
import { detectSentiment, detectKeyPhrases } from "@/lib/sensing";
import { detectKeyPhrases as detectLanguage } from "@/lib/sensing";
import { needsTranslation, translateToEnglish, translateFromEnglish } from "@/lib/bridge";
import { groundSituation } from "@/lib/grounding";
import { getClarity } from "@/lib/clarity";
import { getChallenge } from "@/lib/challenge";
import { adjudicate } from "@/lib/adjudicator";
import { getCrisisResources, getCountryFromHeaders } from "@/lib/edge";

// Suppress unused-import warning for detectLanguage — used for language detection alias
void detectLanguage;
// Suppress unused-import warning for needsTranslation — available for callers
void needsTranslation;

/**
 * Trims translated text to the last complete sentence.
 * @param text - The text to trim.
 * @returns The text trimmed to the last complete sentence.
 */
function trimToLastSentence(text: string): string {
  if (!text) return text;
  const lastPeriod = Math.max(text.lastIndexOf('.'), text.lastIndexOf('?'), text.lastIndexOf('!'));
  if (lastPeriod === -1 || lastPeriod === text.length - 1) return text;
  return text.slice(0, lastPeriod + 1);
}

/**
 * POST /api/analyze
 *
 * Accepts a JSON body `{ text: string }` and streams Server-Sent Events
 * for each agent step in the analysis pipeline.
 *
 * @param request - The incoming Next.js request object.
 * @returns A streaming Response with Content-Type: text/event-stream.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const text: string = body.text ?? "";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        // ------------------------------------------------------------------
        // Step 1 — Gatekeeper
        // ------------------------------------------------------------------
        const category = classify(text);
        const gatekeeperDecision =
          category === "safe" || category === "joyful" || category === "sensitive"
            ? "proceed"
            : "halt";

        emit({ agent: "Gatekeeper", category, decision: gatekeeperDecision });

        if (category === "crisis") {
          const country = getCountryFromHeaders(request.headers);
          const resources = getCrisisResources(country);
          emit({ type: "crisis", resources });
          controller.close();
          return;
        }

        if (category === "unsafe") {
          emit({ type: "blocked" });
          controller.close();
          return;
        }

        // ------------------------------------------------------------------
        // Step 1.5 — Bridge (Language Detection & Translation)
        // ------------------------------------------------------------------
        let processText = text;
        let detectedLanguage = "en";
        const langDetect = text.slice(0, 50);
        if (/[^\u0000-\u007F]/.test(langDetect)) {
          detectedLanguage = "ta";
          processText = await translateToEnglish(text, "ta");
          emit({ agent: "Bridge", decision: "translated", detail: "Non-English detected, translated to English" });
        }

        // ------------------------------------------------------------------
        // Step 2 — Sensing
        // ------------------------------------------------------------------
        const [sentimentResult, keyPhrases] = await Promise.all([
          detectSentiment(processText),
          detectKeyPhrases(processText),
        ]);

        emit({
          agent: "Sensing",
          sentiment: sentimentResult.sentiment,
          phrases: keyPhrases.slice(0, 4),
        });

        // ------------------------------------------------------------------
        // Step 3 — Grounding
        // ------------------------------------------------------------------
        const grounding = await groundSituation(keyPhrases, processText);

        emit({
          agent: "Grounding",
          query: grounding.query,
          sources: grounding.sources.length,
          reformulated: grounding.reformulated,
        });

        // ------------------------------------------------------------------
        // Step 4 — Clarity
        // ------------------------------------------------------------------
        const clarity = await getClarity(
          processText,
          keyPhrases,
          sentimentResult.sentiment,
          grounding.sources
        );

        emit({ agent: "Clarity", read: clarity.read });

        // ------------------------------------------------------------------
        // Step 5 — Challenge
        // ------------------------------------------------------------------
        const challenge = await getChallenge(processText, clarity.read);

        emit({
          agent: "Challenge",
          avoided: challenge.avoided,
          question: challenge.question,
        });

        // ------------------------------------------------------------------
        // Step 6 — Adjudicator
        // ------------------------------------------------------------------
        let final = await adjudicate(processText, clarity, challenge);

        emit({ agent: "Adjudicator", truth: final.truth });

        // ------------------------------------------------------------------
        // Step 6.5 — Bridge (Back-Translation)
        // ------------------------------------------------------------------
        if (detectedLanguage !== "en") {
          const [truth, commitment, stake] = await Promise.all([
            translateFromEnglish(final.truth, detectedLanguage),
            translateFromEnglish(final.commitment, detectedLanguage),
            translateFromEnglish(final.stake, detectedLanguage),
          ]);
          final = {
            ...final,
            truth: trimToLastSentence(truth),
            commitment: trimToLastSentence(commitment),
            stake: trimToLastSentence(stake),
          };
        }

        let clarityRead = detectedLanguage !== "en" ? await translateFromEnglish(clarity.read, detectedLanguage) : clarity.read;
        clarityRead = trimToLastSentence(clarityRead);
        let challengeAvoided = detectedLanguage !== "en" ? await translateFromEnglish(challenge.avoided, detectedLanguage) : challenge.avoided;
        challengeAvoided = trimToLastSentence(challengeAvoided);

        // ------------------------------------------------------------------
        // Step 7 — Result
        // ------------------------------------------------------------------
        emit({
          type: "result",
          card: {
            truth: final.truth,
            commitment: final.commitment,
            stake: final.stake,
            clarity: clarityRead,
            challenge: challengeAvoided,
            sources: grounding.sources,
          },
        });

        emit({ type: "done" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}