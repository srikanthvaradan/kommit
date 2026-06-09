/**
 * @file app/api/analyze/route.ts
 * @description Main analysis pipeline. Accepts a POST request with a text body,
 * runs all agents in sequence, and streams decision events as Server-Sent Events (SSE).
 */

import { NextRequest } from "next/server";
import { ComprehendClient, DetectDominantLanguageCommand } from "@aws-sdk/client-comprehend";
import { classify } from "@/lib/safety";
import { detectSentiment, detectKeyPhrases } from "@/lib/sensing";
import { needsTranslation, translateToEnglish, translateFromEnglish } from "@/lib/bridge";
import { groundSituation } from "@/lib/grounding";
import { getClarity } from "@/lib/clarity";
import { getChallenge } from "@/lib/challenge";
import { adjudicate } from "@/lib/adjudicator";
import { getCrisisResources, getCountryFromHeaders } from "@/lib/edge";

const comprehendClient = new ComprehendClient({
  region: process.env.KOMMIT_COMPREHEND_REGION!,
  credentials: {
    accessKeyId: process.env.KOMMIT_AWS_KEY!,
    secretAccessKey: process.env.KOMMIT_AWS_SECRET!,
  },
});

/**
 * Converts a BCP-47 language code to an ISO 639-1 code.
 * @param code - The BCP-47 language code (e.g. "hi-IN", "ta-IN", "fr-FR").
 * @returns The ISO 639-1 code (e.g. "hi", "ta", "fr").
 */
function toISO639(code: string): string {
  return code.split("-")[0];
}

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

        emit({ agent: "Gus Fring", category, decision: gatekeeperDecision });

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

        emit({ agent: "Bane", decision: "Location identified", detail: "Crisis resources mapped to your territory" });

        // ------------------------------------------------------------------
        // Step 1.5 — Bridge (Language Detection & Translation)
        // ------------------------------------------------------------------
        let processText = text;
        let detectedLanguage = toISO639(body.languageCode || "en");

        if (detectedLanguage === "en") {
          try {
            const langResult = await comprehendClient.send(
              new DetectDominantLanguageCommand({ Text: text.slice(0, 300) })
            );
            const topLang = langResult.Languages?.[0];
            if (topLang && topLang.Score && topLang.Score > 0.7 && topLang.LanguageCode !== "en") {
              detectedLanguage = topLang.LanguageCode!;
            }
          } catch {
            // keep detectedLanguage as "en"
          }
        }

        if (detectedLanguage !== "en") {
          processText = await translateToEnglish(text, detectedLanguage);
          emit({ agent: "Agent Smith", decision: "translated", detail: `Detected ${detectedLanguage}, translated to English` });
        }

        emit({ agent: "Mike Ehrmantraut", decision: "Audio processed", detail: "No trace left. Voice deleted." });

        // ------------------------------------------------------------------
        // Step 2 — Sensing
        // ------------------------------------------------------------------
        const [sentimentResult, keyPhrases] = await Promise.all([
          detectSentiment(processText),
          detectKeyPhrases(processText),
        ]);

        emit({
          agent: "Hannibal",
          sentiment: sentimentResult.sentiment,
          phrases: keyPhrases.slice(0, 4),
        });

        // ------------------------------------------------------------------
        // Step 3 — Grounding
        // ------------------------------------------------------------------
        const grounding = await groundSituation(keyPhrases, processText);

        emit({
          agent: "T-1000",
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

        emit({ agent: "Tyler Durden", read: clarity.read });

        // ------------------------------------------------------------------
        // Step 5 — Challenge
        // ------------------------------------------------------------------
        const challenge = await getChallenge(processText, clarity.read);

        emit({
          agent: "Joker",
          avoided: challenge.avoided,
          question: challenge.question,
        });

        // ------------------------------------------------------------------
        // Step 6 — Adjudicator
        // ------------------------------------------------------------------
        let final = await adjudicate(processText, clarity, challenge);

        emit({ agent: "Thanos", truth: final.truth });

        emit({ agent: "Ra's al Ghul", decision: "Commitment contract prepared", detail: "Your word will be binding." });

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