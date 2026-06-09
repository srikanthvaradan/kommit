/**
 * This module implements the sensing agent, responsible for detecting sentiment and key phrases in text.
 * It provides functions to analyze text and return sentiment results and key phrases.
 */
import {
  ComprehendClient,
  DetectSentimentCommand,
  DetectKeyPhrasesCommand,
} from "@aws-sdk/client-comprehend";

const client = new ComprehendClient({
  region: process.env.KOMMIT_COMPREHEND_REGION!,
  credentials: {
    accessKeyId: process.env.KOMMIT_AWS_KEY!,
    secretAccessKey: process.env.KOMMIT_AWS_SECRET!,
  },
});

/**
 * Interface representing the sentiment result.
 */
export interface SentimentResult {
  /**
   * The sentiment of the text.
   */
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  /**
   * The scores for each sentiment type.
   */
  scores: { positive: number; negative: number; neutral: number; mixed: number };
}

/**
 * Detects the sentiment of the given text.
 * @param text The text to analyze.
 * @returns The sentiment result.
 */
export async function detectSentiment(text: string): Promise<SentimentResult> {
  const command = new DetectSentimentCommand({
    Text: text,
    LanguageCode: "en",
  });
  const response = await client.send(command);

  const sentiment = (response.Sentiment as "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED") ?? "NEUTRAL";

  const scores = {
    positive: (response.SentimentScore?.Positive as number) ?? 0,
    negative: (response.SentimentScore?.Negative as number) ?? 0,
    neutral: (response.SentimentScore?.Neutral as number) ?? 0,
    mixed: (response.SentimentScore?.Mixed as number) ?? 0,
  };

  return { sentiment, scores };
}

/**
 * Detects the key phrases in the given text.
 * @param text The text to analyze.
 * @returns The key phrases.
 */
export async function detectKeyPhrases(text: string): Promise<string[]> {
  const command = new DetectKeyPhrasesCommand({
    Text: text,
    LanguageCode: "en",
  });
  const response = await client.send(command);

  // We filter phrases with a score above 0.85 to ensure we only get the most relevant phrases.
  // The choice of 0.85 is arbitrary, but it provides a good balance between precision and recall.
  const phrases = (response.KeyPhrases ?? [])
    .filter((item) => item.Score !== undefined && item.Score > 0.85)
    .map((item) => item.Text as string)
    .slice(0, 8);

  return phrases;
}

/**
 * Analyzes the given text and returns the sentiment result and key phrases.
 * @param text The text to analyze.
 * @returns The sentiment result and key phrases.
 */
export async function analyzeText(text: string): Promise<{ sentiment: SentimentResult; keyPhrases: string[] }> {
  // We run both calls in parallel to improve performance, as they are independent and do not rely on each other's results.
  const [sentimentResult, phrasesResult] = await Promise.all([
    detectSentiment(text),
    detectKeyPhrases(text),
  ]);

  return { sentiment: sentimentResult, keyPhrases: phrasesResult };
}