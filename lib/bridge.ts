import {
  TranslateClient,
  TranslateTextCommand,
} from "@aws-sdk/client-translate";

const client = new TranslateClient({
  region: process.env.KOMMIT_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.KOMMIT_AWS_KEY!,
    secretAccessKey: process.env.KOMMIT_AWS_SECRET!,
  },
});

export function needsTranslation(languageCode: string): boolean {
  if (languageCode === "en" || languageCode.startsWith("en-")) {
    return false;
  }
  return true;
}

export async function translateToEnglish(
  text: string,
  sourceLanguage: string
): Promise<string> {
  try {
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: "en",
    });
    const response = await client.send(command);
    return response.TranslatedText ?? text;
  } catch {
    return text;
  }
}

export async function translateFromEnglish(
  text: string,
  targetLanguage: string
): Promise<string> {
  try {
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: "en",
      TargetLanguageCode: targetLanguage,
    });
    const response = await client.send(command);
    return response.TranslatedText ?? text;
  } catch {
    return text;
  }
}