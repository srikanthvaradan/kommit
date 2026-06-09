/**
 * This module is a bridge for translation services, implementing the AWS Translate agent.
 * It provides functions for determining if a language code needs translation and for translating text to and from English.
 */

import {
  TranslateClient,
  TranslateTextCommand,
} from "@aws-sdk/client-translate";

const translateClient = new TranslateClient({
  region: process.env.KOMMIT_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.KOMMIT_AWS_KEY!,
    secretAccessKey: process.env.KOMMIT_AWS_SECRET!,
  },
});

/**
 * Checks if a language code needs translation.
 * @param languageCode The language code to check.
 * @returns True if the language code needs translation, false otherwise.
 */
export function needsTranslation(languageCode: string): boolean {
  // Check for "en" prefix variants to ensure that English dialects are not translated
  if (languageCode === "en" || languageCode.startsWith("en-")) {
    return false;
  }
  return true;
}

/**
 * Translates text from a source language to English.
 * @param text The text to translate.
 * @param sourceLanguage The source language code.
 * @returns The translated text, or the original text if translation fails.
 */
export async function translateToEnglish(
  text: string,
  sourceLanguage: string
): Promise<string> {
  try {
    // Attempt to translate the text, silently falling back to the original text if an error occurs
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: "en",
    });
    const response = await translateClient.send(command);
    return response.TranslatedText ?? text;
  } catch {
    // Silent fallback: return the original text if an error occurs during translation
    return text;
  }
}

/**
 * Translates text from English to a target language.
 * @param text The text to translate.
 * @param targetLanguage The target language code.
 * @returns The translated text, or the original text if translation fails.
 */
export async function translateFromEnglish(
  text: string,
  targetLanguage: string
): Promise<string> {
  try {
    // Attempt to translate the text, silently falling back to the original text if an error occurs
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: "en",
      TargetLanguageCode: targetLanguage,
    });
    const response = await translateClient.send(command);
    return response.TranslatedText ?? text;
  } catch {
    // Silent fallback: return the original text if an error occurs during translation
    return text;
  }
}

