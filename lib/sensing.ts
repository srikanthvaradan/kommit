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

export interface SentimentResult {
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  scores: { positive: number; negative: number; neutral: number; mixed: number };
}

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

export async function detectKeyPhrases(text: string): Promise<string[]> {
  const command = new DetectKeyPhrasesCommand({
    Text: text,
    LanguageCode: "en",
  });
  const response = await client.send(command);

  const phrases = (response.KeyPhrases ?? [])
    .filter((item) => item.Score !== undefined && item.Score > 0.85)
    .map((item) => item.Text as string)
    .slice(0, 8);

  return phrases;
}

export async function analyzeText(text: string): Promise<{ sentiment: SentimentResult; keyPhrases: string[] }> {
  const [sentimentResult, phrasesResult] = await Promise.all([
    detectSentiment(text),
    detectKeyPhrases(text),
  ]);

  return { sentiment: sentimentResult, keyPhrases: phrasesResult };
}